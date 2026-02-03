import { calculateNextTurn, generateInstanceId } from "../../game-engine.mjs";
import { getFullGameState, prisma } from "../../game-service.mjs";
import { broadcastFullState } from "../broadcaster.mjs";

export const handleConfirmDraw = async (io, socket, data) => {
  const { gameId, playerId, action, chosenColor } = data;
  try {
    const state = await getFullGameState(gameId);
    if (!state || state.currentPlayerId !== String(playerId)) return;

    let deck = JSON.parse(state.game.deck || "[]");
    const drawnCardRaw = deck.shift();
    if (!drawnCardRaw) return;

    if (action === 'play') {
      const { nextIndex, nextDirection } = calculateNextTurn(state.game.turnIndex, state.game.direction, state.game.players.length, drawnCardRaw.type);
      let newPenalty = state.game.pendingPenalty + (drawnCardRaw.type === 'khapezh' ? 3 : 0);
      await prisma.game.update({
        where: { id: gameId },
        data: { 
          currentCard: JSON.stringify({ ...drawnCardRaw, color: chosenColor || drawnCardRaw.color, instanceId: generateInstanceId('confirm') }), 
          turnIndex: nextIndex, direction: nextDirection, deck: JSON.stringify(deck), pendingPenalty: newPenalty
        }
      });
    } else {
      const player = state.game.players.find(p => String(p.id) === String(playerId));
      const newHand = [...JSON.parse(player.hand || "[]"), { ...drawnCardRaw, instanceId: generateInstanceId('confirm') }];
      const nextIdx = (state.game.turnIndex + state.game.direction + state.game.players.length) % state.game.players.length;
      await prisma.$transaction([
        prisma.player.update({ where: { id: playerId }, data: { hand: JSON.stringify(newHand) } }),
        prisma.game.update({ where: { id: gameId }, data: { deck: JSON.stringify(deck), turnIndex: nextIdx } })
      ]);
    }
    await broadcastFullState(io, gameId);
  } catch (e) { console.error("CONFIRM_DRAW_ERROR:", e); }
};