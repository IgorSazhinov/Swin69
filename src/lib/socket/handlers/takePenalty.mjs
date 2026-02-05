import { executeTakePenalty, getFullGameState } from "../../game-service.mjs"; // ДОБАВИЛИ getFullGameState
import { broadcastFullState, broadcastLogUpdate } from "../broadcaster.mjs";
import { logGameAction } from "../../game-log-service.mjs";

export const handleTakePenalty = async (io, socket, data) => {
  const { gameId, playerId } = data;
  
  console.log('[TAKE_PENALTY] Игрок берет штраф:', playerId);
  
  try {
    const state = await getFullGameState(gameId); // ТЕПЕРЬ ФУНКЦИЯ ДОСТУПНА
    if (!state) {
      console.log('[TAKE_PENALTY] Игра не найдена:', gameId);
      return;
    }
    
    const player = state.game.players.find(p => String(p.id) === String(playerId));
    
    if (!player) {
      console.log('[TAKE_PENALTY] Игрок не найден:', playerId);
      return;
    }
    
    console.log('[TAKE_PENALTY] Текущий штраф:', state.game.pendingPenalty);
    
    // Проверяем, может ли игрок взять штраф
    if (state.game.pendingPenalty <= 0) {
      console.log('[TAKE_PENALTY] Нет активного штрафа');
      
      const errorLog = await logGameAction(gameId, {
        playerId,
        playerName: player?.name,
        action: 'take_penalty_error',
        details: {
          error: 'Нет активного штрафа',
          pendingPenalty: state.game.pendingPenalty
        }
      });
      
      if (errorLog) await broadcastLogUpdate(io, gameId, errorLog);
      return;
    }
    
    // Проверяем, очередь ли игрока брать штраф
    const isPlayersTurn = player.order === state.game.turnIndex;
    if (!isPlayersTurn) {
      console.log('[TAKE_PENALTY] Не очередь игрока брать штраф:', {
        playerOrder: player.order,
        turnIndex: state.game.turnIndex
      });
      
      const errorLog = await logGameAction(gameId, {
        playerId,
        playerName: player?.name,
        action: 'take_penalty_error',
        details: {
          error: 'Не очередь брать штраф',
          playerOrder: player.order,
          turnIndex: state.game.turnIndex
        }
      });
      
      if (errorLog) await broadcastLogUpdate(io, gameId, errorLog);
      return;
    }
    
    // ЛОГИРОВАНИЕ: Взятие штрафа
    const logEntry = await logGameAction(gameId, {
      playerId,
      playerName: player?.name,
      action: 'take_penalty',
      details: {
        penaltyCount: state.game.pendingPenalty,
        cardsTaken: state.game.pendingPenalty
      }
    });

    // Отправляем обновление лога
    if (logEntry) await broadcastLogUpdate(io, gameId, logEntry);
    
    const result = await executeTakePenalty(gameId, playerId);
    
    if (result) {
      console.log('[TAKE_PENALTY] Штраф успешно взят');
      await broadcastFullState(io, gameId);
    } else {
      console.log('[TAKE_PENALTY] Не удалось взять штраф');
      
      const errorLog = await logGameAction(gameId, {
        playerId,
        playerName: player?.name,
        action: 'take_penalty_error',
        details: { error: 'executeTakePenalty вернул null' }
      });
      
      if (errorLog) await broadcastLogUpdate(io, gameId, errorLog);
    }
    
  } catch (e) {
    console.error("TAKE_PENALTY_ERROR:", e);
    
    // Логирование ошибки
    const errorLog = await logGameAction(gameId, {
      playerId,
      action: 'take_penalty_error',
      details: { 
        error: e.message,
        stack: e.stack
      }
    });
    
    if (errorLog) await broadcastLogUpdate(io, gameId, errorLog);
  }
};