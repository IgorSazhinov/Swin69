import { PrismaClient } from "@prisma/client";

const globalForPrisma = global;
export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Получение полного состояния игры для отправки клиентам через сокеты.
 */
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

  // Автоматический старт игры, если набралось 2+ игрока
  if (game.players.length >= 2 && game.status === 'LOBBY') {
    game = await prisma.game.update({
      where: { id: gameId },
      data: { status: 'PLAYING', turnIndex: 0 },
      include: { players: { orderBy: { order: 'asc' } } }
    });
  }

  // Формируем информацию об игроках
  const playersInfo = game.players.map((p) => ({
    id: String(p.id),
    name: p.name,
    order: p.order,
    cardCount: JSON.parse(p.hand || "[]").length,
    isTurn: p.order === game.turnIndex && game.status === "PLAYING"
  }));

  const currentPlayer = game.players.find(p => p.order === game.turnIndex);

  return {
    game,
    playersInfo,
    currentPlayerId: currentPlayer ? String(currentPlayer.id) : null
  };
};

/**
 * Применение штрафа (Хапеж). 
 */
export const applyPenalty = async (game, direction, deck, actingOrder) => {
  const pCount = game.players.length;
  
  // Рассчитываем жертву на основе игрового порядка (order)
  const victimOrder = (actingOrder + direction + pCount) % pCount;
  
  // Находим игрока, чей order совпадает с victimOrder
  const victim = game.players.find(p => p.order === victimOrder);
  
  if (!victim) {
    console.error("APPLY_PENALTY_ERROR: Player not found for order", victimOrder);
    return deck;
  }
  
  const penaltyCards = deck.splice(0, 3);
  const currentHand = JSON.parse(victim.hand || "[]");
  const updatedHand = [...currentHand, ...penaltyCards];
  
  await prisma.player.update({
    where: { id: victim.id },
    data: { hand: JSON.stringify(updatedHand) }
  });
  
  return deck;
};

/**
 * Удаление игры и игроков
 */
export const deleteGame = async (gameId) => {
  return await prisma.$transaction([
    prisma.player.deleteMany({ where: { gameId } }),
    prisma.game.delete({ where: { id: gameId } })
  ]);
};