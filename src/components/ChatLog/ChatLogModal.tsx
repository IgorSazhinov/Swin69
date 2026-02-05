"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatLog } from "@/hooks/useChatLog";

interface ChatLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  playerId: string;
  playerName: string;
}

export const ChatLogModal = ({
  isOpen,
  onClose,
  gameId,
  playerId,
  playerName
}: ChatLogModalProps) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'log'>('chat');
  const [message, setMessage] = useState('');
  
  const { messages, logs, sendMessage, loading, error } = useChatLog(
    gameId,
    playerId,
    playerName
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автопрокрутка к новым сообщениям
  useEffect(() => {
    if (messagesEndRef.current && activeTab === 'chat') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Закрытие по ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '--:--';
    }
  };

  const formatLogDisplay = (log: any) => {
    if (log.displayText) return log.displayText;
    
    const player = log.playerName || 'Игрок';
    const action = log.action || 'действие';
    
    const actionMap: Record<string, string> = {
      'play_card': `🃏 ${player} сыграл карту`,
      'intercept_card': `⚡ ${player} перехватил карту`,
      'draw_card_start': `🎴 ${player} тянет карту`,
      'take_penalty': `⚠️ ${player} взял штраф`,
      'chlop_tap': `👏 ${player} нажал хлоп`,
      'chlop_lose': `💥 ${player} проиграл хлопкопыт`,
      'win_game': `🏆 ${player} ПОБЕДИЛ!`,
      'chat_message': `💬 ${player}: написал сообщение`,
    };
    
    return actionMap[action] || `📝 ${player}: ${action}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm"
            style={{ position: 'fixed' }}
          />
          
          {/* Modal - фиксированная позиция в правом нижнем углу */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, translateX: 100, translateY: 100 }}
            animate={{ opacity: 1, scale: 1, translateX: 0, translateY: 0 }}
            exit={{ opacity: 0, scale: 0.8, translateX: 100, translateY: 100 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300,
              mass: 0.8 
            }}
            className="fixed bottom-8 right-8 z-[10000] w-[90vw] max-w-[500px] h-[70vh] max-h-[600px] bg-[#064e3b] rounded-[30px] border-[3px] border-orange-500 shadow-2xl overflow-hidden flex flex-col"
            style={{ 
              position: 'fixed',
              bottom: '2rem',
              right: '2rem'
            }}
          >
            
            {/* Заголовок */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/30">
              <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">
                💬 Чат и 📋 Лог
              </h2>
              
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg transition-colors hover:scale-110 active:scale-95"
              >
                ✕
              </button>
            </div>
            
            {/* Табы */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 text-center font-black uppercase text-sm tracking-wider transition-all relative ${
                  activeTab === 'chat' 
                    ? 'text-orange-500' 
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                💬 Чат
                {activeTab === 'chat' && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500"
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('log')}
                className={`flex-1 py-2 text-center font-black uppercase text-sm tracking-wider transition-all relative ${
                  activeTab === 'log' 
                    ? 'text-cyan-400' 
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                📋 Лог
                {activeTab === 'log' && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-cyan-400"
                  />
                )}
              </button>
            </div>
            
            {/* Контент */}
            <div className="flex-1 overflow-hidden">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-white/40 text-sm animate-pulse">
                    Загрузка...
                  </div>
                </div>
              ) : activeTab === 'chat' ? (
                <div className="h-full flex flex-col">
                  {/* Сообщения */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {messages.length === 0 ? (
                      <div className="text-center text-white/30 py-8 italic text-sm">
                        Начните общение первым!
                      </div>
                    ) : (
                      <>
                        {messages.map((msg, idx) => (
                          <motion.div
                            key={msg.id || idx}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-2 rounded-lg max-w-[85%] ${msg.isMyMessage 
                              ? 'bg-orange-500/20 border border-orange-500/30 ml-auto' 
                              : 'bg-white/5 border border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-bold text-xs ${msg.isMyMessage ? 'text-orange-300' : 'text-cyan-300'}`}>
                                {msg.playerName}
                              </span>
                              <span className="text-white/40 text-[10px]">
                                {formatTime(msg.timestamp)}
                              </span>
                            </div>
                            <p className="text-white/90 text-xs break-words">
                              {msg.message}
                            </p>
                          </motion.div>
                        ))}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>
                  
                  {/* Поле ввода */}
                  <div className="p-3 border-t border-white/10 bg-black/30">
                    {error && (
                      <div className="text-red-400 text-[10px] mb-1 text-center animate-pulse">
                        {error}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Введите сообщение..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-[15px] px-3 py-2 text-white text-xs resize-none outline-none focus:border-orange-500/50 transition-all placeholder:text-white/30"
                        rows={2}
                        maxLength={500}
                        autoFocus
                      />
                      <motion.button
                        onClick={handleSendMessage}
                        disabled={!message.trim()}
                        whileHover={message.trim() ? { scale: 1.05 } : {}}
                        whileTap={message.trim() ? { scale: 0.95 } : {}}
                        className="bg-gradient-to-b from-orange-600 to-orange-700 text-white rounded-[15px] px-4 font-black uppercase text-xs hover:from-orange-500 hover:to-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg flex items-center gap-1"
                      >
                        Отпр
                        <span className="text-xs">✈️</span>
                      </motion.button>
                    </div>
                    <div className="text-white/30 text-[10px] text-right mt-1">
                      {message.length}/500
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto p-3">
                  {logs.length === 0 ? (
                    <div className="text-center text-white/30 py-8 italic text-sm">
                      История действий пока пуста
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {logs.map((log, idx) => (
                        <motion.div
                          key={log.id || idx}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.01 }}
                          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${
                              log.action?.includes('win') ? 'bg-yellow-500' :
                              log.action?.includes('khapezh') ? 'bg-red-500' :
                              log.action?.includes('chlop') ? 'bg-purple-500' :
                              log.action?.includes('play') ? 'bg-green-500' :
                              'bg-blue-500'
                            }`} />
                            <span className="text-white/60 text-[10px]">
                              {formatTime(log.timestamp)}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              log.playerId === playerId 
                                ? 'bg-orange-500/30 text-orange-300' 
                                : 'bg-white/10 text-white/60'
                            }`}>
                              {log.playerName || 'Система'}
                            </span>
                          </div>
                          <p className="text-white/90 text-xs">
                            {formatLogDisplay(log)}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Статус бар */}
            <div className="border-t border-white/10 p-2 text-center bg-black/30">
              <span className="text-white/40 text-[10px]">
                {activeTab === 'chat' 
                  ? `${messages.length} сообщений` 
                  : `${logs.length} записей в логе`
                }
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};