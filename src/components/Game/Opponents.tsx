"use client";

import { motion } from "framer-motion";

interface Opponent {
  id: string;
  name: string;
  cardCount: number;
  isTurn: boolean;
}

export const Opponents = ({ players }: { players: Opponent[] }) => {
  return (
    <div className="flex flex-col gap-4 items-center justify-center h-full border-r border-white/5 px-[10px]">
      <div className="w-full flex flex-col gap-4">
        {players.map((opp) => (
          <div 
            key={opp.id} 
            className={`relative w-full flex flex-col p-6 rounded-[50px] bg-black/40 border-2 backdrop-blur-xl transition-all duration-500 ${
              opp.isTurn 
                ? 'border-orange-500 shadow-[0_0_60px_rgba(234,88,12,0.25)] scale-[1.02] z-10' 
                : 'border-white/10 opacity-70'
            }`}
          >
            {/* ГОРИЗОНТАЛЬНАЯ ИНФО-ПАНЕЛЬ ПО ЦЕНТРУ */}
            <div className="flex items-center justify-center gap-6 mb-8 w-full">
              
              {/* ИМЯ */}
              <div className="text-white font-black text-2xl uppercase tracking-tighter truncate max-w-[140px] text-right flex-1">
                {opp.name}
              </div>

              {/* СТАТУС / РАЗДЕЛИТЕЛЬ */}
              <div className="flex flex-col items-center min-w-[100px]">
                <div className={`text-[10px] font-black uppercase tracking-[0.3em] italic mb-1 ${
                  opp.isTurn ? 'text-orange-500 animate-pulse' : 'text-white/10'
                }`}>
                  {opp.isTurn ? 'ХОДИТ' : 'ЖДЕТ'}
                </div>
                <div className="h-[2px] w-full bg-white/10 rounded-full" />
              </div>

              {/* КОЛИЧЕСТВО КАРТ */}
              <div className="flex items-center gap-3 flex-1 text-left">
                <span className="text-orange-500 font-black text-4xl leading-none">
                  {opp.cardCount}
                </span>
                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-tight">
                  КАРТ
                </span>
              </div>

            </div>

            {/* ВЕЕР КАРТ ПО ЦЕНТРУ */}
            <div className="relative h-[80px] w-full flex items-center justify-center overflow-visible">
              {Array.from({ length: Math.min(opp.cardCount, 15) }).map((_, i, arr) => {
                const total = arr.length;
                const step = total > 1 ? Math.min(25, 240 / total) : 0;
                const offset = (i - (total - 1) / 2) * step;
                const rotation = (i - (total - 1) / 2) * (total > 10 ? 3 : 5);

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute w-[50px] h-[72px] rounded-[10px] border-2 border-white/20 bg-[#0f172a] shadow-2xl flex items-center justify-center"
                    style={{
                      left: `calc(50% + ${offset}px)`,
                      transform: `translateX(-50%) rotate(${rotation}deg)`,
                      zIndex: i,
                      backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.02) 5px, rgba(255,255,255,0.02) 10px)`
                    }}
                  >
                    <span className="text-[10px] opacity-10 grayscale">🐽</span>
                  </motion.div>
                );
              })}
              
              {opp.cardCount > 15 && (
                <div className="absolute -right-2 bottom-0 bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xl z-50 border-2 border-white/20">
                  +{opp.cardCount - 15}
                </div>
              )}
            </div>
          </div>
        ))}

        {players.length === 0 && (
          <div className="py-20 flex flex-col items-center gap-4 opacity-10">
            <div className="text-white font-black uppercase text-center tracking-[0.5em] italic text-xs">
              ПОИСК ИГРОКОВ
            </div>
          </div>
        )}
      </div>
    </div>
  );
};