import { sendChatMessage, getChatHistory } from "../../game-log-service.mjs";
import { broadcastLogUpdate } from "../broadcaster.mjs";

export const handleChatMessage = async (io, socket, data) => {
  const { gameId, playerId, playerName, message } = data;
  
  try {
    console.log('[CHAT_HANDLER] Новое сообщение:', { playerName, message });
    
    // Проверяем длину сообщения
    if (!message || message.trim().length === 0) {
      socket.emit('chat_error', { message: 'Сообщение не может быть пустым' });
      return;
    }
    
    if (message.length > 500) {
      socket.emit('chat_error', { message: 'Сообщение слишком длинное (макс. 500 символов)' });
      return;
    }
    
    // Сохраняем сообщение в БД
    const chatMessage = await sendChatMessage(gameId, playerId, playerName, message.trim());
    
    if (chatMessage) {
      // Отправляем сообщение всем в комнате игры
      const messageData = {
        id: chatMessage.id,
        playerId: chatMessage.playerId,
        playerName: chatMessage.playerName || chatMessage.player?.name,
        message: chatMessage.message,
        timestamp: chatMessage.timestamp
      };
      
      io.to(gameId).emit('new_chat_message', messageData);
      console.log('[CHAT_HANDLER] Сообщение отправлено всем игрокам');
      
      // ЛОГИРОВАНИЕ: Сообщение в чате
      const chatLog = await logGameAction(gameId, {
        playerId,
        playerName,
        action: 'chat_message',
        details: {
          message: message.substring(0, 100) + (message.length > 100 ? '...' : '')
        }
      });
      
      if (chatLog) await broadcastLogUpdate(io, gameId, chatLog);
    }
    
  } catch (error) {
    console.error('[CHAT_HANDLER] Ошибка:', error);
    socket.emit('chat_error', { message: 'Ошибка отправки сообщения' });
  }
};

export const handleGetChatHistory = async (io, socket, data) => {
  const { gameId } = data;
  
  try {
    console.log('[CHAT_HANDLER] Запрос истории чата для игры:', gameId);
    
    const history = await getChatHistory(gameId);
    
    socket.emit('chat_history', {
      gameId,
      messages: history
    });
    
  } catch (error) {
    console.error('[CHAT_HANDLER] Ошибка получения истории:', error);
    socket.emit('chat_error', { message: 'Ошибка загрузки истории чата' });
  }
};