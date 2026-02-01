import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { canPlayCard, canIntercept, calculateNextTurn, generateInstanceId, reshuffleDeck } from "./src/lib/game-engine.mjs";
import { getFullGameState, applyPenalty, prisma } from "./src/lib/game-service.mjs";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handle);
  const io = new Server(httpServer, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    
    socket.on("join_game", async ({ gameId, playerId }) => {
      socket.join(gameId);
      const state = await getFullGameState(gameId);
      if (state) {
        io.to(gameId).emit("card_played", {
          card: JSON.parse(state.game.currentCard || "{}"),
          nextPlayerId: state.currentPlayerId,
          allPlayers: state.playersInfo,
          status: state.game.status,
          winnerId: state.game.winnerId
        });
      }
    });

    socket.on("play_card", async ({ gameId, card, playerId, chosenColor }) => {
      try {
        const state = await getFullGameState(gameId);
        if (!state || state.game.status !== 'PLAYING') return;

        const topCard = JSON.parse(state.game.currentCard || "{}");
        const isMyTurn = String(state.currentPlayerId) === String(playerId);
        const isIntercept = canIntercept(card, topCard);

        // Правило перехвата: если не твой ход и это не перехват - отмена
        if (!isMyTurn && !isIntercept) return;

        const cardToPlace = { 
          ...card, 
          color: chosenColor || card.color, 
          instanceId: generateInstanceId(isIntercept ? 'intercept' : 'p') 
        };

        const pCount = state.game.players.length;
        let newDir = state.game.direction;
        if (card.type === 'perekhryuk') newDir *= -1;

        // Находим игрока, который совершил действие (для перехвата это важно)
        const actingPlayer = state.game.players.find(p => String(p.id) === String(playerId));
        const actingIndex = actingPlayer.order;

        // Считаем следующий ход ОТ ТОГО, кто положил карту
        const nextIdx = calculateNextTurn(actingIndex, newDir, pCount, card.type);
        
        const newHand = JSON.parse(actingPlayer.hand || "[]").filter(c => c.id !== card.id);
        const isWin = newHand.length === 0;

        let deck = JSON.parse(state.game.deck || "[]");
        
        // Хапеж при перехвате тоже работает!
        if (card.type === 'khapezh' && deck.length >= 3) {
          deck = await applyPenalty(state.game, newDir, deck, actingIndex);
        }

        await prisma.$transaction([
          prisma.player.update({ where: { id: playerId }, data: { hand: JSON.stringify(newHand) } }),
          prisma.game.update({ 
            where: { id: gameId }, 
            data: { 
              currentCard: JSON.stringify(cardToPlace), 
              turnIndex: nextIdx, 
              direction: newDir,
              status: isWin ? 'FINISHED' : 'PLAYING',
              winnerId: isWin ? playerId : null,
              deck: JSON.stringify(deck)
            } 
          })
        ]);

        const final = await getFullGameState(gameId);
        io.to(gameId).emit("card_played", { 
          card: cardToPlace, 
          nextPlayerId: final.currentPlayerId, 
          allPlayers: final.playersInfo, 
          status: final.game.status,
          winnerId: final.game.winnerId,
          isIntercept // Фронтенд может по этому флагу включить звук/анимацию
        });
      } catch (e) { console.error("PLAY_CARD_ERROR:", e); }
    });

    socket.on("draw_card", async ({ gameId, playerId }) => {
      try {
        const state = await getFullGameState(gameId);
        if (!state || String(state.currentPlayerId) !== String(playerId)) return;
        
        let deck = JSON.parse(state.game.deck || "[]");
        
        // ПЕРЕМЕШИВАНИЕ (RESHUFFLE), если колода пуста
        if (deck.length === 0) {
          const discardPile = JSON.parse(state.game.discardPile || "[]");
          const reshuffled = reshuffleDeck(discardPile);
          if (!reshuffled) return; // Совсем нет карт
          deck = reshuffled.newDeck;
          await prisma.game.update({
            where: { id: gameId },
            data: { deck: JSON.stringify(deck), discardPile: JSON.stringify(reshuffled.newDiscardPile) }
          });
        }

        const topCardOnTable = JSON.parse(state.game.currentCard || "{}");
        const rawCard = deck[0]; 
        const drawnCard = { ...rawCard, instanceId: generateInstanceId('draw') };

        if (!canPlayCard(drawnCard, topCardOnTable)) {
          deck.shift();
          const player = state.game.players.find(p => String(p.id) === String(playerId));
          const newHand = [...JSON.parse(player.hand || "[]"), drawnCard];
          const nextIdx = (state.game.turnIndex + state.game.direction + state.game.players.length) % state.game.players.length;

          await prisma.$transaction([
            prisma.player.update({ where: { id: playerId }, data: { hand: JSON.stringify(newHand) } }),
            prisma.game.update({ where: { id: gameId }, data: { deck: JSON.stringify(deck), turnIndex: nextIdx } })
          ]);

          socket.emit("card_drawn", { newCard: drawnCard });
          const final = await getFullGameState(gameId);
          io.to(gameId).emit("card_played", { card: topCardOnTable, nextPlayerId: final.currentPlayerId, allPlayers: final.playersInfo, status: final.game.status });
        } else {
          socket.emit("drawn_card_preview", { card: drawnCard });
        }
      } catch (e) { console.error("DRAW_CARD_ERROR:", e); }
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
          const nextIdx = (state.game.turnIndex + state.game.direction + state.game.players.length) % state.game.players.length;
          
          await prisma.game.update({
            where: { id: gameId },
            data: { currentCard: JSON.stringify(cardToPlace), turnIndex: nextIdx, deck: JSON.stringify(deck) }
          });
          
          const final = await getFullGameState(gameId);
          io.to(gameId).emit("card_played", { card: cardToPlace, nextPlayerId: final.currentPlayerId, allPlayers: final.playersInfo, status: final.game.status });
        } else {
          const player = state.game.players.find(p => String(p.id) === String(playerId));
          const newHand = [...JSON.parse(player.hand || "[]"), { ...drawnCardRaw, instanceId }];
          const nextIdx = (state.game.turnIndex + state.game.direction + state.game.players.length) % state.game.players.length;

          await prisma.$transaction([
            prisma.player.update({ where: { id: playerId }, data: { hand: JSON.stringify(newHand) } }),
            prisma.game.update({ where: { id: gameId }, data: { deck: JSON.stringify(deck), turnIndex: nextIdx } })
          ]);
          socket.emit("card_drawn", { newCard: { ...drawnCardRaw, instanceId } });
          const final = await getFullGameState(gameId);
          io.to(gameId).emit("card_played", { card: JSON.parse(final.game.currentCard || "{}"), nextPlayerId: final.currentPlayerId, allPlayers: final.playersInfo, status: final.game.status });
        }
      } catch (e) { console.error("CONFIRM_DRAW_ERROR:", e); }
    });
  });

  httpServer.listen(3000, () => console.log("Server ready on port 3000"));
});