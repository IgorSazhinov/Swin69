import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { canPlayCard, calculateNextTurn, generateInstanceId } from "./src/lib/game-engine.mjs";
import { getFullGameState, applyPenalty, prisma } from "./src/lib/game-service.mjs";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handle);
  const io = new Server(httpServer, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    
    // ВХОД В ИГРУ
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

    // ХОД КАРТОЙ
    socket.on("play_card", async ({ gameId, card, playerId, chosenColor }) => {
      try {
        const state = await getFullGameState(gameId);
        if (!state || String(state.currentPlayerId) !== String(playerId) || state.game.status !== 'PLAYING') return;

        const cardToPlace = { 
          ...card, 
          color: chosenColor || card.color, 
          instanceId: generateInstanceId('p') 
        };

        const pCount = state.game.players.length;
        let newDir = state.game.direction;
        if (card.type === 'perekhryuk') newDir *= -1;

        const nextIdx = calculateNextTurn(state.game.turnIndex, newDir, pCount, card.type);
        
        const currentPlayer = state.game.players[state.game.turnIndex];
        const newHand = JSON.parse(currentPlayer.hand || "[]").filter(c => c.id !== card.id);
        const isWin = newHand.length === 0;

        let deck = JSON.parse(state.game.deck || "[]");
        
        // ЭФФЕКТ ХАПЕЖА
        if (card.type === 'khapezh' && deck.length >= 3) {
          deck = await applyPenalty(state.game, newDir, deck);
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
          winnerId: final.game.winnerId
        });
      } catch (e) { console.error("PLAY_CARD_ERROR:", e); }
    });

    // ДОБОР КАРТЫ
    socket.on("draw_card", async ({ gameId, playerId }) => {
      try {
        const state = await getFullGameState(gameId);
        if (!state || String(state.currentPlayerId) !== String(playerId)) return;
        
        let deck = JSON.parse(state.game.deck || "[]");
        if (deck.length === 0) return;

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

    // ПОДТВЕРЖДЕНИЕ ХОДА ПОСЛЕ ДОБОРА
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