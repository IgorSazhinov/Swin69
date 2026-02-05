import { getFullGameState } from "../game-service.mjs";
import { formatLogForDisplay } from "../game-log-service.mjs";

export const broadcastFullState = async (io, gameId) => {
    try {
        console.log(`[BROADCAST] Начинаем broadcast для игры: ${gameId}`);
        
        const state = await getFullGameState(gameId);
        if (!state) {
            console.log(`[BROADCAST] Игра ${gameId} не найдена`);
            return;
        }

        const nextPlayer = state.game.players.find(p => p.order === state.game.turnIndex);
        const nextPlayerId = nextPlayer ? String(nextPlayer.id) : null;
        
        console.log('[BROADCAST] Отправка состояния:', {
            gameId,
            status: state.game.status,
            turnIndex: state.game.turnIndex,
            nextPlayerId,
            nextPlayerName: nextPlayer?.name,
            pendingPenalty: state.game.pendingPenalty,
            chloppedPlayerIds: state.game.chloppedPlayerIds?.length || 0
        });

        // 1. Отправляем общее состояние всем в комнате игры
        io.to(gameId).emit("card_played", {
            card: JSON.parse(state.game.currentCard || "{}"),
            nextPlayerId: nextPlayerId,
            allPlayers: state.playersInfo,
            status: state.game.status,  // ← Важно: отправляем статус!
            winnerId: state.game.winnerId,
            direction: state.game.direction,
            pendingPenalty: state.game.pendingPenalty,
            chloppedPlayerIds: state.game.chloppedPlayerIds || []
        });

        // 2. Отправляем личные обновления рук
        state.game.players.forEach(player => {
            const personalRoom = String(player.id);
            const playerHand = JSON.parse(player.hand || "[]");
            
            io.to(personalRoom).emit("hand_updated", {
                hand: playerHand,
                status: state.game.status  // ← Добавляем статус и в личные обновления
            });
        });

        console.log(`[BROADCAST] Broadcast завершен для игры: ${gameId}`);

    } catch (error) {
        console.error("[BROADCAST] Ошибка:", error);
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
      playerName: logData.playerName || "Система",
      action: logData.action,
      cardType: logData.cardType,
      cardColor: logData.cardColor,
      details: logData.details, // Оставляем как есть
      timestamp: logData.timestamp,
      displayText: formatLogForDisplay(logData),
    };

    // Отправляем всем игрокам в комнате
    io.to(gameId).emit("game_log_update", formattedLog);

    console.log(`[BROADCAST_LOG] Log update sent:`, formattedLog.displayText);
  } catch (error) {
    console.error("[BROADCAST_LOG] Error:", error);
  }
};
