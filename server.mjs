import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { canPlayCard, canIntercept, calculateNextTurn, generateInstanceId, reshuffleDeck } from "./src/lib/game-logic.js";
import { getFullGameState, applyPenalty, prisma } from "./src/lib/game-service.mjs";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handle);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    socket.on("join_game", async ({ gameId, playerId }) => {
      try {
        socket.join(gameId);
        const state = await getFullGameState(gameId);
        
        if (state) {
          io.to(gameId).emit("card_played", {
            card: JSON.parse(state.game.currentCard || "{}"),
            nextPlayerId: state.currentPlayerId,
            allPlayers: state.playersInfo,
            status: state.game.status,
            winnerId: state.game.winnerId,
            direction: state.game.direction
          });
        }
      } catch (e) {
        console.error("JOIN_GAME_ERROR:", e);
      }
    });

    socket.on("play_card", async ({ gameId, card, playerId, chosenColor }) => {
      try {
        const state = await getFullGameState(gameId);
        if (!state || state.game.status !== 'PLAYING') return;

        const topCard = JSON.parse(state.game.currentCard || "{}");
        const isMyTurn = String(state.currentPlayerId) === String(playerId);
        const isIntercept = canIntercept(card, topCard);

        // Если не твой ход и это не перехват — игнорируем
        if (!isMyTurn && !isIntercept) return;

        // Если это спецкарта "Полисвин" (polyhryun), фиксируем выбранный цвет
        const cardToPlace = { 
          ...card, 
          color: chosenColor || card.color, 
          instanceId: generateInstanceId(isIntercept ? 'intercept' : 'p') 
        };

        const pCount = state.game.players.length;
        
        // Расчет направления и следующего индекса через логику движка
        const { nextIndex, nextDirection } = calculateNextTurn(
          state.game.players.find(p => String(p.id) === String(playerId)).order,
          state.game.direction,
          pCount,
          card.type
        );

        const actingPlayer = state.game.players.find(p => String(p.id) === String(playerId));
        const newHand = JSON.parse(actingPlayer.hand || "[]").filter(c => c.id !== card.id);
        const isWin = newHand.length === 0;

        let deck = JSON.parse(state.game.deck || "[]");
        const discardPile = JSON.parse(state.game.discardPile || "[]");
        
        // Добавляем старую карту в сброс
        discardPile.push(topCard);

        // Обработка Хапежа (наказание следующему)
        if (card.type === 'khapezh' && deck.length >= 3) {
          deck = await applyPenalty(state.game, nextDirection, deck, actingPlayer.order);
        }

        // Если карта — Хлопкопыт, уведомляем всех о начале мини-игры на скорость
        if (card.type === 'khlopokopyt') {
          io.to(gameId).emit("start_khlopokopyt", { message: "БЕЙ ПО СТОЛУ!" });
        }

        await prisma.$transaction([
          prisma.player.update({ 
            where: { id: playerId }, 
            data: { hand: JSON.stringify(newHand) } 
          }),
          prisma.game.update({ 
            where: { id: gameId }, 
            data: { 
              currentCard: JSON.stringify(cardToPlace), 
              turnIndex: nextIndex, 
              direction: nextDirection,
              status: isWin ? 'FINISHED' : 'PLAYING',
              winnerId: isWin ? playerId : null,
              deck: JSON.stringify(deck),
              discardPile: JSON.stringify(discardPile)
            } 
          })
        ]);

        const finalState = await getFullGameState(gameId);
        io.to(gameId).emit("card_played", { 
          card: cardToPlace, 
          nextPlayerId: finalState.currentPlayerId, 
          allPlayers: finalState.playersInfo, 
          status: finalState.game.status,
          winnerId: finalState.game.winnerId,
          direction: nextDirection,
          isIntercept
        });
      } catch (e) { 
        console.error("PLAY_CARD_ERROR:", e); 
      }
    });

    socket.on("draw_card", async ({ gameId, playerId }) => {
      try {
        const state = await getFullGameState(gameId);
        if (!state || String(state.currentPlayerId) !== String(playerId)) return;
        
        let deck = JSON.parse(state.game.deck || "[]");
        
        // Перемешивание, если колода пуста
        if (deck.length === 0) {
          const discardPile = JSON.parse(state.game.discardPile || "[]");
          const reshuffled = reshuffleDeck(discardPile);
          if (!reshuffled) return;
          deck = reshuffled.newDeck;
          await prisma.game.update({
            where: { id: gameId },
            data: { 
              deck: JSON.stringify(deck), 
              discardPile: JSON.stringify(reshuffled.newDiscardPile) 
            }
          });
        }

        const topCardOnTable = JSON.parse(state.game.currentCard || "{}");
        const drawnCard = { ...deck[0], instanceId: generateInstanceId('draw') };

        if (!canPlayCard(drawnCard, topCardOnTable)) {
          // Если карту нельзя сыграть, она просто идет в руку, ход переходит
          deck.shift();
          const player = state.game.players.find(p => String(p.id) === String(playerId));
          const newHand = [...JSON.parse(player.hand || "[]"), drawnCard];
          const nextIdx = (state.game.turnIndex + state.game.direction + state.game.players.length) % state.game.players.length;

          await prisma.$transaction([
            prisma.player.update({ where: { id: playerId }, data: { hand: JSON.stringify(newHand) } }),
            prisma.game.update({ where: { id: gameId }, data: { deck: JSON.stringify(deck), turnIndex: nextIdx } })
          ]);

          socket.emit("card_drawn", { newCard: drawnCard });
          const finalState = await getFullGameState(gameId);
          io.to(gameId).emit("card_played", { 
            card: topCardOnTable, 
            nextPlayerId: finalState.currentPlayerId, 
            allPlayers: finalState.playersInfo, 
            status: finalState.game.status,
            direction: finalState.game.direction
          });
        } else {
          // Если карту МОЖНО сыграть, даем игроку выбор (превью)
          socket.emit("drawn_card_preview", { card: drawnCard });
        }
      } catch (e) { 
        console.error("DRAW_CARD_ERROR:", e); 
      }
    });

    socket.on("confirm_draw", async ({ gameId, playerId, action, chosenColor }) => {
      try {
        const state = await getFullGameState(gameId);
        if (!state || String(state.currentPlayerId) !== String(playerId)) return;

        let deck = JSON.parse(state.game.deck || "[]");
        const drawnCardRaw = deck.shift();
        if (!drawnCardRaw) return;

        const instanceId = generateInstanceId('confirm');

        if (action === 'play') {
          const cardToPlace = { ...drawnCardRaw, color: chosenColor || drawnCardRaw.color, instanceId };
          const { nextIndex, nextDirection } = calculateNextTurn(
            state.game.turnIndex, 
            state.game.direction, 
            state.game.players.length, 
            drawnCardRaw.type
          );
          
          await prisma.game.update({
            where: { id: gameId },
            data: { 
              currentCard: JSON.stringify(cardToPlace), 
              turnIndex: nextIndex, 
              direction: nextDirection,
              deck: JSON.stringify(deck) 
            }
          });
          
          const finalState = await getFullGameState(gameId);
          io.to(gameId).emit("card_played", { 
            card: cardToPlace, 
            nextPlayerId: finalState.currentPlayerId, 
            allPlayers: finalState.playersInfo, 
            status: finalState.game.status,
            direction: finalState.game.direction
          });
        } else {
          const player = state.game.players.find(p => String(p.id) === String(playerId));
          const newHand = [...JSON.parse(player.hand || "[]"), { ...drawnCardRaw, instanceId }];
          const nextIdx = (state.game.turnIndex + state.game.direction + state.game.players.length) % state.game.players.length;

          await prisma.$transaction([
            prisma.player.update({ where: { id: playerId }, data: { hand: JSON.stringify(newHand) } }),
            prisma.game.update({ where: { id: gameId }, data: { deck: JSON.stringify(deck), turnIndex: nextIdx } })
          ]);

          socket.emit("card_drawn", { newCard: { ...drawnCardRaw, instanceId } });
          const finalState = await getFullGameState(gameId);
          io.to(gameId).emit("card_played", { 
            card: JSON.parse(finalState.game.currentCard || "{}"), 
            nextPlayerId: finalState.currentPlayerId, 
            allPlayers: finalState.playersInfo, 
            status: finalState.game.status,
            direction: finalState.game.direction
          });
        }
      } catch (e) { 
        console.error("CONFIRM_DRAW_ERROR:", e); 
      }
    });

    socket.on("tap_khlopokopyt", async ({ gameId }) => {
      // Здесь будет логика сбора нажатий для определения самого медленного игрока
      console.log(`Player tapped table in game ${gameId}`);
    });

    socket.on("disconnect", () => {
      console.log("Player disconnected");
    });
  });

  httpServer.listen(3000, () => {
    console.log(">>> СВИНТУС СЕРВЕР ЗАПУЩЕН НА ПОРТУ 3000 <<<");
  });
});