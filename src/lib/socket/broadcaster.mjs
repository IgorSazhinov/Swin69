import { getFullGameState } from "../game-service.mjs";
import { formatLogForDisplay } from "../game-log-service.mjs";

export const broadcastFullState = async (io, gameId) => {
  try {
    console.log(`[BROADCAST] Starting broadcast for game: ${gameId}`);
    const state = await getFullGameState(gameId);
    if (!state) return;
    
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
      nextPlayerId: nextPlayerId,
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

// Отправка обновления лога всем игрокам
export const broadcastLogUpdate = async (io, gameId, logData) => {
  try {
    console.log(`[BROADCAST_LOG] Sending log update for game: ${gameId}`);
    
    // Форматируем лог для клиента
    const formattedLog = {
      id: logData.id,
      playerId: logData.playerId,
      playerName: logData.playerName || 'Система',
      action: logData.action,
      cardType: logData.cardType,
      cardColor: logData.cardColor,
      details: logData.details, // Оставляем как есть
      timestamp: logData.timestamp,
      displayText: formatLogForDisplay(logData)
    };
    
    // Отправляем всем игрокам в комнате
    io.to(gameId).emit('game_log_update', formattedLog);
    
    console.log(`[BROADCAST_LOG] Log update sent:`, formattedLog.displayText);
  } catch (error) {
    console.error("[BROADCAST_LOG] Error:", error);
  }
};