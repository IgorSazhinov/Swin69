import { canIntercept, calculateNextTurn, generateInstanceId } from "../../game-engine.mjs";
import { getFullGameState, prisma } from "../../game-service.mjs";
import { broadcastFullState } from "../broadcaster.mjs";

export const handlePlayCard = async (io, socket, data) => {
  const { gameId, card, playerId, chosenColor } = data;
  try {
    const state = await getFullGameState(gameId);
    if (!state || state.game.status !== 'PLAYING') return;

    const actingPlayer = state.game.players.find(p => String(p.id) === String(playerId));
    if (!actingPlayer) return;

    // Если висит штраф, можно кинуть только Хапеж
    if (state.game.pendingPenalty > 0 && card.type !== 'khapezh') return;

    const topCard = JSON.parse(state.game.currentCard || "{}");
    const isMyTurn = actingPlayer.order === state.game.turnIndex;
    const isIntercept = canIntercept(card, topCard);

    if (!isMyTurn && !isIntercept) return;

    const { nextIndex, nextDirection } = calculateNextTurn(
      actingPlayer.order,
      state.game.direction,
      state.game.players.length,
      card.type
    );

    let newPenalty = state.game.pendingPenalty + (card.type === 'khapezh' ? 3 : 0);
    const currentHand = JSON.parse(actingPlayer.hand || "[]");
    const newHand = currentHand.filter(c => c.id !== card.id);
    const isWin = newHand.length === 0;

    const discardPile = JSON.parse(state.game.discardPile || "[]");
    if (state.game.currentCard) discardPile.push(JSON.parse(state.game.currentCard));

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
          turnIndex: nextIndex, 
          direction: nextDirection,
          pendingPenalty: newPenalty,
          status: isWin ? 'FINISHED' : 'PLAYING',
          winnerId: isWin ? playerId : null,
          discardPile: JSON.stringify(discardPile)
        } 
      })
    ]);

    await broadcastFullState(io, gameId);
    if (card.type === 'khlopokopyt') io.to(gameId).emit("start_khlopokopyt");
  } catch (e) { console.error("PLAY_CARD_ERROR:", e); }
};