"use client";

import { motion } from "framer-motion";

interface GameHeaderProps {
  name: string;
  gameId: string;
  cardCount: number;
  isMyTurn: boolean;
  status: string;
  direction?: number;
}

export const GameHeader = ({ 
  name, 
  gameId, 
  cardCount, 
  isMyTurn, 
  status,
  direction = 1 
}: GameHeaderProps) => {
  const getStatusText = () => {
    if (status === 'FINISHED') return "КОНЕЦ ИГРЫ";
    if (status === 'LOBBY') return "ЖДЕМ ИГРОКОВ...";
    return isMyTurn ? "ТВОЙ ХОД!" : "ЖДЕМ СВИНЬЮ";
  };

  const copiedToClipboard = () => {
    navigator.clipboard.writeText(gameId);
  };

  return (
    <header className="relative z-50 m-6 h-[100px] flex items-center bg-black/50 backdrop-blur-3xl rounded-[50px] border-2 border-white/20 px-10 shadow-2xl">
      <div className="flex items-center gap-6 min-w-[300px]">
        <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center border-2 border-white/30 rotate-3 shadow-xl text-4xl italic">
          🐽
        </div>
        <div className="flex flex-col text-left">
          <span className="text-white font-black text-3xl uppercase tracking-tighter truncate max-w-[200px]">
            {name}
          </span>
          <button 
            onClick={copiedToClipboard}
            className="text-white/40 text-[10px] font-black uppercase italic hover:text-white transition-colors text-left"
          >
            ID: {gameId.slice(-6)} 📋
          </button>
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        <motion.div 
          initial={false}
          animate={{
            scale: isMyTurn && status === 'PLAYING' ? 1.1 : 1,
            backgroundColor: isMyTurn && status === 'PLAYING' ? "rgba(234, 88, 12, 1)" : "rgba(255, 255, 255, 0.05)"
          }}
          className={`px-12 py-3 rounded-full border-2 transition-all duration-500 ${
            isMyTurn && status === 'PLAYING' ? "border-white shadow-lg" : "border-white/10 text-white/20"
          }`}
        >
          <span className="font-black italic tracking-widest text-xl uppercase">
            {getStatusText()}
          </span>
        </motion.div>
        
        {/* Индикатор направления */}
        {status === 'PLAYING' && (
          <motion.div 
            animate={{ rotate: direction === 1 ? 0 : 180 }}
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-orange-500 text-xs font-black tracking-[0.5em]"
          >
            {direction === 1 ? ">>>>>>" : "<<<<<<"}
          </motion.div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-white/20 uppercase">Твои карты</span>
          <span className="text-white font-black text-4xl leading-none">{cardCount}</span>
        </div>
        <span className="text-4xl">🃏</span>
      </div>
    </header>
  );
};