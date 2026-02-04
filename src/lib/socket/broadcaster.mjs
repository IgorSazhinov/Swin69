import { getFullGameState } from "../game-service.mjs";

export const broadcastFullState = async (io, gameId) => {
  try {
    console.log(`[BROADCAST] Starting broadcast for game: ${gameId}`);
    const state = await getFullGameState(gameId);
    if (!state) return;
    
    // Определяем следующего игрока
    const nextPlayer = state.game.players.find(p => p.order === state.game.turnIndex);
    const nextPlayerId = nextPlayer ? String(nextPlayer.id) : null;
    
    console.log('[BROADCAST] Данные для отправки:', {
      turnIndex: state.game.turnIndex,
      nextPlayerId,
      nextPlayerName: nextPlayer?.name,
      status: state.game.status
    });
    
    // 1. Отправляем обновление стола всем игрокам
    io.to(gameId).emit("card_played", {
      card: JSON.parse(state.game.currentCard || "{}"),
      nextPlayerId: nextPlayerId,  // Важно: ID следующего игрока, а не currentPlayerId!
      allPlayers: state.playersInfo,
      status: state.game.status,
      winnerId: state.game.winnerId,
      direction: state.game.direction,
      pendingPenalty: state.game.pendingPenalty,
      chloppedPlayerIds: state.game.chloppedPlayerIds || []
    });
    
    // 2. Отправляем обновленные руки каждому игроку
    state.game.players.forEach(player => {
      const personalRoom = String(player.id);
      const playerHand = JSON.parse(player.hand || "[]");
      io.to(personalRoom).emit("hand_updated", {
        hand: playerHand
      });
    });
    
    console.log(`[BROADCAST] Broadcast complete.`);
  } catch (error) {
    console.error("[BROADCAST] Error:", error);
  }
};