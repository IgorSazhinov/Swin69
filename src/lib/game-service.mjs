import { PrismaClient } from "@prisma/client";

const globalForPrisma = global;
export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const getFullGameState = async (gameId) => {
  let game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { 
      players: { 
        orderBy: { order: 'asc' } 
      } 
    }
  });
  
  if (!game) return null;

  if (game.players.length >= 2 && game.status === 'LOBBY') {
    game = await prisma.game.update({
      where: { id: gameId },
      data: { status: 'PLAYING', turnIndex: 0 },
      include: { players: { orderBy: { order: 'asc' } } }
    });
  }

  // ПАРСИНГ ХЛОПКОВ
  const chloppedPlayerIds = JSON.parse(game.chloppedPlayerIds || "[]");

  const playersInfo = game.players.map((p) => ({
    id: String(p.id),
    name: p.name,
    order: p.order,
    cardCount: JSON.parse(p.hand || "[]").length,
    // Чтобы индикатор хода не пропадал во время хлопка
    isTurn: p.order === game.turnIndex && (game.status === "PLAYING" || game.status === "CHLOPKOPIT")
  }));

  const currentPlayer = game.players.find(p => p.order === game.turnIndex);

  return {
    game: {
      ...game,
      chloppedPlayerIds
    },
    playersInfo,
    currentPlayerId: currentPlayer ? String(currentPlayer.id) : null
  };
};

export const executeTakePenalty = async (gameId, playerId) => {
  const game = await prisma.game.findUnique({ where: { id: gameId }, include: { players: true } });
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  
  if (!game || !player || game.pendingPenalty <= 0) return null;

  let deck = JSON.parse(game.deck || "[]");
  const penaltyCount = game.pendingPenalty;
  
  const penaltyCards = deck.splice(0, penaltyCount);
  const currentHand = JSON.parse(player.hand || "[]");
  const updatedHand = [...currentHand, ...penaltyCards];
  
  const pCount = game.players.length;
  const nextIdx = (game.turnIndex + game.direction + pCount) % pCount;

  return await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId },
      data: { hand: JSON.stringify(updatedHand) }
    }),
    prisma.game.update({
      where: { id: gameId },
      data: { 
        deck: JSON.stringify(deck), 
        pendingPenalty: 0, 
        turnIndex: nextIdx 
      }
    })
  ]);
};

export const deleteGame = async (gameId) => {
  return await prisma.$transaction([
    prisma.player.deleteMany({ where: { gameId } }),
    prisma.game.delete({ where: { id: gameId } })
  ]);
};