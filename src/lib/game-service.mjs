import { PrismaClient } from "@prisma/client";

const globalForPrisma = global;
export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Получение полного состояния игры для отправки клиентам через сокеты.
 * Если игроков двое и более, а статус LOBBY — автоматически переводит в PLAYING.
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

  // Формируем информацию об игроках (скрываем содержимое рук, даем только количество)
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

/**
 * Применение штрафа (Хапеж). 
 * actingIndex — индекс игрока, который совершил действие (текущий или перехвативший).
 * direction — текущее направление игры (1 или -1).
 */
export const applyPenalty = async (game, direction, deck, actingIndex) => {
  const pCount = game.players.length;
  
  // Жертва — это следующий игрок от того, кто положил карту
  const victimIdx = (actingIndex + direction + pCount) % pCount;
  const victim = game.players[victimIdx];
  
  // Если в колоде меньше 3 карт, нужно было бы сделать решаффл, 
  // но пока берем столько, сколько есть (максимум 3)
  const penaltyCards = deck.splice(0, 3);
  
  const currentHand = JSON.parse(victim.hand || "[]");
  const updatedHand = [...currentHand, ...penaltyCards];
  
  await prisma.player.update({
    where: { id: victim.id },
    data: { hand: JSON.stringify(updatedHand) }
  });
  
  // Возвращаем похудевшую колоду обратно в логику сервера
  return deck;
};

/**
 * Удаление игры и игроков (опционально для очистки БД)
 */
export const deleteGame = async (gameId) => {
  return await prisma.$transaction([
    prisma.player.deleteMany({ where: { gameId } }),
    prisma.game.delete({ where: { id: gameId } })
  ]);
};