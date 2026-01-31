import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();

const canPlayCard = (cardToPlay, topCard) => {
  if (!topCard || !topCard.type) return true;
  if (cardToPlay.type === 'polyhryun') return true;
  if (cardToPlay.color === topCard.color) return true;
  if (cardToPlay.type === 'number' && topCard.type === 'number') {
    return String(cardToPlay.value) === String(topCard.value);
  }
  return cardToPlay.type !== 'number' && cardToPlay.type === topCard.type;
};

const getGameState = async (gameId) => {
  let game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: { orderBy: { order: 'asc' } } }
  });
  
  if (!game) return null;

  if (game.players.length >= 2 && game.status === 'LOBBY') {
    game = await prisma.game.update({
      where: { id: gameId },
      data: { status: 'PLAYING', turnIndex: 0 },
      include: { players: { orderBy: { order: 'asc' } } }
    });
  }

  const playersInfo = game.players.map((p, i) => ({
    id: String(p.id),
    name: p.name,
    cardCount: JSON.parse(p.hand || "[]").length,
    isTurn: i === game.turnIndex && game.status === "PLAYING"
  }));

  return {
    game,
    playersInfo,
    currentPlayerId: game.players[game.turnIndex] ? String(game.players[game.turnIndex].id) : null
  };
};

app.prepare().then(() => {
  const httpServer = createServer(handle);
  const io = new Server(httpServer, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    socket.on("join_game", async ({ gameId, playerId }) => {
      socket.join(gameId);
      const state = await getGameState(gameId);
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
        const state = await getGameState(gameId);
        if (!state || String(state.currentPlayerId) !== String(playerId) || state.game.status !== 'PLAYING') return;

        const cardToPlace = { 
          ...card, 
          color: chosenColor || card.color, 
          instanceId: `p_${Date.now()}_${Math.random()}` 
        };

        const pCount = state.game.players.length;
        let newDir = state.game.direction;
        if (card.type === 'perekhryuk') newDir *= -1;

        let jump = (card.type === 'zahalomon' || (card.type === 'perekhryuk' && pCount === 2)) ? 2 : 1;
        let nextIdx = (state.game.turnIndex + (newDir * jump)) % pCount;
        if (nextIdx < 0) nextIdx += pCount;

        const currentPlayer = state.game.players[state.game.turnIndex];
        const newHand = JSON.parse(currentPlayer.hand || "[]").filter(c => c.id !== card.id);
        const isWin = newHand.length === 0;

        await prisma.$transaction([
          prisma.player.update({ where: { id: playerId }, data: { hand: JSON.stringify(newHand) } }),
          prisma.game.update({ 
            where: { id: gameId }, 
            data: { 
              currentCard: JSON.stringify(cardToPlace), 
              turnIndex: nextIdx, 
              direction: newDir,
              status: isWin ? 'FINISHED' : 'PLAYING',
              winnerId: isWin ? playerId : null
            } 
          })
        ]);

        const final = await getGameState(gameId);
        io.to(gameId).emit("card_played", { 
          card: cardToPlace, 
          nextPlayerId: final.currentPlayerId, 
          allPlayers: final.playersInfo, 
          status: final.game.status,
          winnerId: final.game.winnerId
        });
      } catch (e) { console.error("PLAY_CARD_ERROR:", e); }
    });

    socket.on("draw_card", async ({ gameId, playerId }) => {
      try {
        const state = await getGameState(gameId);
        if (!state || String(state.currentPlayerId) !== String(playerId)) return;
        
        let deck = JSON.parse(state.game.deck || "[]");
        if (deck.length === 0) return;

        const topCardOnTable = JSON.parse(state.game.currentCard || "{}");
        const drawnCard = deck[0]; 

        if (!canPlayCard(drawnCard, topCardOnTable)) {
          const actualCard = deck.shift();
          const player = state.game.players.find(p => String(p.id) === String(playerId));
          const newHand = [...JSON.parse(player.hand || "[]"), actualCard];
          const nextIdx = (state.game.turnIndex + state.game.direction + state.game.players.length) % state.game.players.length;

          await prisma.$transaction([
            prisma.player.update({ where: { id: playerId }, data: { hand: JSON.stringify(newHand) } }),
            prisma.game.update({ where: { id: gameId }, data: { deck: JSON.stringify(deck), turnIndex: nextIdx } })
          ]);

          socket.emit("card_drawn", { newCard: actualCard });
          const final = await getGameState(gameId);
          io.to(gameId).emit("card_played", { card: topCardOnTable, nextPlayerId: final.currentPlayerId, allPlayers: final.playersInfo, status: final.game.status });
        } else {
          socket.emit("drawn_card_preview", { card: drawnCard });
        }
      } catch (e) { console.error("DRAW_CARD_ERROR:", e); }
    });

    socket.on("confirm_draw", async ({ gameId, playerId, action, chosenColor }) => {
      try {
        const state = await getGameState(gameId);
        if (!state || String(state.currentPlayerId) !== String(playerId)) return;

        let deck = JSON.parse(state.game.deck || "[]");
        const drawnCard = deck.shift();

        if (action === 'play') {
          const cardToPlace = { ...drawnCard, color: chosenColor || drawnCard.color, instanceId: `d_${Date.now()}` };
          const nextIdx = (state.game.turnIndex + state.game.direction + state.game.players.length) % state.game.players.length;
          
          await prisma.game.update({
            where: { id: gameId },
            data: { currentCard: JSON.stringify(cardToPlace), turnIndex: nextIdx, deck: JSON.stringify(deck) }
          });
          
          const final = await getGameState(gameId);
          io.to(gameId).emit("card_played", { card: cardToPlace, nextPlayerId: final.currentPlayerId, allPlayers: final.playersInfo, status: final.game.status });
        } else {
          const player = state.game.players.find(p => String(p.id) === String(playerId));
          const newHand = [...JSON.parse(player.hand || "[]"), drawnCard];
          const nextIdx = (state.game.turnIndex + state.game.direction + state.game.players.length) % state.game.players.length;

          await prisma.$transaction([
            prisma.player.update({ where: { id: playerId }, data: { hand: JSON.stringify(newHand) } }),
            prisma.game.update({ where: { id: gameId }, data: { deck: JSON.stringify(deck), turnIndex: nextIdx } })
          ]);
          socket.emit("card_drawn", { newCard: drawnCard });
          const final = await getGameState(gameId);
          io.to(gameId).emit("card_played", { card: JSON.parse(final.game.currentCard || "{}"), nextPlayerId: final.currentPlayerId, allPlayers: final.playersInfo, status: final.game.status });
        }
      } catch (e) { console.error("CONFIRM_DRAW_ERROR:", e); }
    });
  });

  httpServer.listen(3000, () => console.log("Server ready on port 3000"));
});