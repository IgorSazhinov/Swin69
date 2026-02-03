import { canPlayCard, generateInstanceId, reshuffleDeck } from "../../game-engine.mjs";
import { getFullGameState, prisma } from "../../game-service.mjs";
import { broadcastFullState } from "../broadcaster.mjs";

export const handleDrawCard = async (io, socket, data) => {
  const { gameId, playerId } = data;
  try {
    const state = await getFullGameState(gameId);
    if (!state || state.currentPlayerId !== String(playerId)) return;
    
    let deck = JSON.parse(state.game.deck || "[]");
    if (deck.length === 0) {
      const discardPile = JSON.parse(state.game.discardPile || "[]");
      const reshuffled = reshuffleDeck(discardPile);
      if (!reshuffled) return;
      deck = reshuffled.newDeck;
      await prisma.game.update({
        where: { id: gameId },
        data: { deck: JSON.stringify(deck), discardPile: JSON.stringify(reshuffled.newDiscardPile) }
      });
    }

    const drawnCard = { ...deck[0], instanceId: generateInstanceId('draw') };
    const topCard = JSON.parse(state.game.currentCard || "{}");

    if (!canPlayCard(drawnCard, topCard)) {
      deck.shift();
      const player = state.game.players.find(p => String(p.id) === String(playerId));
      const newHand = [...JSON.parse(player.hand || "[]"), drawnCard];
      const nextIdx = (state.game.turnIndex + state.game.direction + state.game.players.length) % state.game.players.length;

      await prisma.$transaction([
        prisma.player.update({ where: { id: playerId }, data: { hand: JSON.stringify(newHand) } }),
        prisma.game.update({ where: { id: gameId }, data: { deck: JSON.stringify(deck), turnIndex: nextIdx } })
      ]);
      await broadcastFullState(io, gameId);
    } else {
      socket.emit("drawn_card_preview", { card: drawnCard });
    }
  } catch (e) { console.error("DRAW_CARD_ERROR:", e); }
};