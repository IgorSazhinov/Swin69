import { PrismaClient } from "@prisma/client";

const globalForPrisma = global;
export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const getFullGameState = async (gameId) => {
  let game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!game) return null;

  if (game.players.length >= 2 && game.status === "LOBBY") {
    game = await prisma.game.update({
      where: { id: gameId },
      data: { status: "PLAYING", turnIndex: 0 },
      include: { players: { orderBy: { order: "asc" } } },
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
    isTurn:
      p.order === game.turnIndex &&
      (game.status === "PLAYING" || game.status === "CHLOPKOPIT"),
  }));

  const currentPlayer = game.players.find((p) => p.order === game.turnIndex);

  return {
    game: {
      ...game,
      chloppedPlayerIds,
    },
    playersInfo,
    currentPlayerId: currentPlayer ? String(currentPlayer.id) : null,
  };
};

export const executeTakePenalty = async (gameId, playerId) => {
  console.log('[EXECUTE_TAKE_PENALTY] Начало. GameId:', gameId, 'PlayerId:', playerId);
  
  try {
    const game = await prisma.game.findUnique({ 
      where: { id: gameId }, 
      include: { players: true } 
    });
    
    if (!game) {
      console.log('[EXECUTE_TAKE_PENALTY] Игра не найдена');
      return null;
    }
    
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    
    if (!player) {
      console.log('[EXECUTE_TAKE_PENALTY] Игрок не найден');
      return null;
    }
    
    if (game.pendingPenalty <= 0) {
      console.log('[EXECUTE_TAKE_PENALTY] Нет активного штрафа');
      return null;
    }
    
    // Проверяем, очередь ли игрока брать штраф
    const playerOrder = game.players.find(p => p.id === playerId)?.order;
    if (playerOrder !== game.turnIndex) {
      console.log('[EXECUTE_TAKE_PENALTY] Не очередь игрока:', {
        playerOrder,
        turnIndex: game.turnIndex
      });
      return null;
    }

    let deck = JSON.parse(game.deck || "[]");
    const penaltyCount = game.pendingPenalty;
    
    // Если колода пуста, перемешиваем сброс
    if (deck.length < penaltyCount) {
      console.log('[EXECUTE_TAKE_PENALTY] Колода почти пуста:', deck.length);
      
      const discardPile = JSON.parse(game.discardPile || "[]");
      if (discardPile.length > 1) {
        const topCard = discardPile.pop(); // Сохраняем верхнюю карту
        const newDeck = [...discardPile].sort(() => Math.random() - 0.5);
        deck = [...newDeck, ...deck];
        
        console.log('[EXECUTE_TAKE_PENALTY] Перемешали сброс:', {
          was: discardPile.length + 1,
          newDeckSize: deck.length
        });
        
        // Обновляем сброс (только верхняя карта остается)
        await prisma.game.update({
          where: { id: gameId },
          data: {
            discardPile: JSON.stringify([topCard])
          }
        });
      }
    }
    
    const penaltyCards = deck.splice(0, penaltyCount);
    const currentHand = JSON.parse(player.hand || "[]");
    const updatedHand = [...currentHand, ...penaltyCards];
    
    const pCount = game.players.length;
    let nextIdx = (game.turnIndex + game.direction) % pCount;
    if (nextIdx < 0) nextIdx += pCount;

    console.log('[EXECUTE_TAKE_PENALTY] Расчет следующего хода:', {
      currentTurnIndex: game.turnIndex,
      direction: game.direction,
      playerCount: pCount,
      calculatedNextIdx: nextIdx,
      formula: `(${game.turnIndex} + ${game.direction}) % ${pCount} = ${nextIdx}`,
      penaltyTaken: penaltyCount
    });

    const result = await prisma.$transaction([
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
    
    console.log('[EXECUTE_TAKE_PENALTY] Штраф взят. Новый turnIndex:', nextIdx);
    
    return result;
    
  } catch (error) {
    console.error('[EXECUTE_TAKE_PENALTY] Ошибка:', error);
    return null;
  }
};

export const deleteGame = async (gameId) => {
  return await prisma.$transaction([
    prisma.player.deleteMany({ where: { gameId } }),
    prisma.game.delete({ where: { id: gameId } }),
  ]);
};
