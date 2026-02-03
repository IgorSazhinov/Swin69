import { getFullGameState } from "../game-service.mjs";

export const broadcastFullState = async (io, gameId) => {
  try {
    console.log(`[SERVER] Starting broadcast for game: ${gameId}`);
    const state = await getFullGameState(gameId);
    if (!state) return;

    // 1. Общее состояние стола
    io.to(gameId).emit("card_played", {
      card: JSON.parse(state.game.currentCard || "{}"),
      nextPlayerId: state.currentPlayerId,
      allPlayers: state.playersInfo,
      status: state.game.status,
      winnerId: state.game.winnerId,
      direction: state.game.direction,
      pendingPenalty: state.game.pendingPenalty,
      // ПЕРЕДАЧА МАССИВА ХЛОПКОВ НА ФРОНТ
      chloppedPlayerIds: state.game.chloppedPlayerIds || []
    });

    // 2. Личное состояние рук
    state.game.players.forEach(player => {
      const personalRoom = String(player.id);
      const playerHand = JSON.parse(player.hand || "[]");
      io.to(personalRoom).emit("hand_updated", { hand: playerHand });
    });
    
    console.log(`[SERVER] Broadcast complete.`);
  } catch (error) {
    console.error("[SERVER] Broadcast Error:", error);
  }
};