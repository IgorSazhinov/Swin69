import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: string;
  isMyMessage?: boolean;
}

interface GameLogEntry {
  id: string;
  playerId: string | null;
  playerName: string;
  action: string;
  cardType?: string;
  cardColor?: string;
  details?: any;
  timestamp: string;
  displayText?: string;
}

interface UseChatLogReturn {
  messages: ChatMessage[];
  logs: GameLogEntry[];
  sendMessage: (message: string) => void;
  loading: boolean;
  error: string | null;
}

export const useChatLog = (
  gameId: string,
  playerId: string,
  playerName: string
): UseChatLogReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [logs, setLogs] = useState<GameLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!gameId || !playerId) return;

    // Инициализация socket
    socketRef.current = io();
    const socket = socketRef.current;

    // Загрузка истории чата и логов
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Загрузка истории чата
        const chatResponse = await fetch(`/api/game/${gameId}/chat`);
        const chatData = await chatResponse.json();
        
        // Загрузка логов игры
        const logResponse = await fetch(`/api/game/${gameId}/log`);
        const logData = await logResponse.json();
        
        if (chatData.messages) {
          const formattedMessages = chatData.messages.map((msg: any) => ({
            ...msg,
            isMyMessage: msg.playerId === playerId
          }));
          setMessages(formattedMessages);
        }
        
        if (logData.logs) {
          setLogs(logData.logs);
        }
        
      } catch (err) {
        console.error('Ошибка загрузки данных чата/лога:', err);
        setError('Не удалось загрузить историю');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    // Socket события
    socket.emit('join_game', { gameId, playerId });

    // Новое сообщение в чате
    socket.on('new_chat_message', (message: ChatMessage) => {
      setMessages(prev => [...prev, {
        ...message,
        isMyMessage: message.playerId === playerId
      }]);
    });

    // Обновление логов (новое действие в игре)
    socket.on('game_log_update', (logEntry: GameLogEntry) => {
      setLogs(prev => [logEntry, ...prev]);
    });

    // Ошибки чата
    socket.on('chat_error', (errorData: { message: string }) => {
      setError(errorData.message);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [gameId, playerId, playerName]);

  const sendMessage = (message: string) => {
    if (!message.trim() || !socketRef.current) return;
    
    socketRef.current.emit('chat_message', {
      gameId,
      playerId,
      playerName,
      message: message.trim()
    });
  };

  return {
    messages,
    logs,
    sendMessage,
    loading,
    error
  };
};