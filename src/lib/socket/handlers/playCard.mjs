import { canIntercept, calculateNextTurn, generateInstanceId } from "../../game-engine.mjs";
import { getFullGameState, prisma } from "../../game-service.mjs";
import { broadcastFullState } from "../broadcaster.mjs";

export const handlePlayCard = async (io, socket, data) => {
  const { gameId, card, playerId, chosenColor } = data;

  console.log('[PLAY_CARD] Начало. Карта:', card.type, 'Игрок:', playerId);

  try {
    const state = await getFullGameState(gameId);
    if (!state || state.game.status !== 'PLAYING') return;

    console.log('[PLAY_CARD] Текущий turnIndex:', state.game.turnIndex);
    console.log('[PLAY_CARD] Игроки:', state.playersInfo.map(p => ({id: p.id, order: p.order, name: p.name})));

    const actingPlayer = state.game.players.find(p => String(p.id) === String(playerId));
    if (!actingPlayer) return;

    console.log('[PLAY_CARD] Играющий игрок:', {
      id: actingPlayer.id,
      order: actingPlayer.order,
      name: actingPlayer.name
    });

    // (хапеж), если есть pendingPenalty > 0
    if (state.game.pendingPenalty > 0 && card.type !== 'khapezh') return;

    const topCard = JSON.parse(state.game.currentCard || "{}");
    const isMyTurn = actingPlayer.order === state.game.turnIndex;
    const isIntercept = canIntercept(card, topCard);

    console.log('[PLAY_CARD] isMyTurn:', isMyTurn, 'isIntercept:', isIntercept);

    if (!isMyTurn && !isIntercept) return;

    // рассчитать следующий ход
    const { nextIndex, nextDirection, isStall } = calculateNextTurn(
      actingPlayer.order,
      state.game.direction,
      state.game.players.length,
      card.type
    );

    console.log('[PLAY_CARD] Результат calculateNextTurn:', {
      actingPlayerOrder: actingPlayer.order,
      playerCount: state.game.players.length,
      cardType: card.type,
      nextIndex,
      nextDirection,
      isStall
    });

    // ОСОБАЯ ЛОГИКА ДЛЯ ХЛОПКОПЫТА
    // При хлопкопыте turnIndex должен остаться у текущего игрока (для хлопков)
    // Но в chlop.mjs мы его потом изменим на следующего игрока
    const finalNextIndex = isStall ? actingPlayer.order : nextIndex;

    let newPenalty = state.game.pendingPenalty + (card.type === 'khapezh' ? 3 : 0);

    const currentHand = JSON.parse(actingPlayer.hand || "[]");
    const newHand = currentHand.filter(c => c.id !== card.id);
    const isWin = newHand.length === 0;

    const discardPile = JSON.parse(state.game.discardPile || "[]");
    if (state.game.currentCard) {
      discardPile.push(JSON.parse(state.game.currentCard));
    }

    // определить следующий статус
    let nextStatus = 'PLAYING';
    if (isWin) {
      nextStatus = 'FINISHED';
    } else if (isStall) {
      nextStatus = 'CHLOPKOPIT';
    }

    await prisma.$transaction([
      prisma.player.update({
        where: { id: playerId },
        data: { hand: JSON.stringify(newHand) }
      }),
      prisma.game.update({
        where: { id: gameId },
        data: {
          currentCard: JSON.stringify({
            ...card,
            color: chosenColor || card.color,
            instanceId: generateInstanceId(isIntercept ? 'int' : 'p')
          }),
          turnIndex: finalNextIndex, // Используем finalNextIndex
          direction: nextDirection,
          pendingPenalty: newPenalty,
          status: nextStatus,
          winnerId: isWin ? playerId : null,
          discardPile: JSON.stringify(discardPile),
          chloppedPlayerIds: isStall ? JSON.stringify([]) : undefined
        }
      })
    ]);

    console.log('[PLAY_CARD] Обновление БД завершено. Новый turnIndex:', finalNextIndex);
    console.log('[PLAY_CARD] Новый статус:', nextStatus);

    await broadcastFullState(io, gameId);
  } catch (e) {
    console.error("[SERVER] PLAY_CARD_ERROR:", e);
  }
};