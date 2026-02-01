import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getFullGameState = async (gameId) => {
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

/** Штрафные карты. actingIndex - индекс того, кто кинул Хапеж */
export const applyPenalty = async (game, direction, deck, actingIndex) => {
  const pCount = game.players.length;
  // Жертва - это следующий игрок после того, кто совершил ход (даже если это был перехват)
  const victimIdx = (actingIndex + direction + pCount) % pCount;
  const victim = game.players[victimIdx];
  
  const penalty = deck.splice(0, 3);
  const victimHand = [...JSON.parse(victim.hand || "[]"), ...penalty];
  
  await prisma.player.update({
    where: { id: victim.id },
    data: { hand: JSON.stringify(victimHand) }
  });
  
  return deck;
};

export { prisma };