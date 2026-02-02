"use client";

import { motion } from "framer-motion";

interface PlayerInfo {
  id: string;
  name: string;
  cardCount: number;
  isTurn: boolean;
}

interface OpponentsProps {
  players: PlayerInfo[];
  currentPlayerId: string;
}

export const Opponents = ({ players, currentPlayerId }: OpponentsProps) => {
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isTurn) return -1;
    if (b.isTurn) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col gap-4 items-center justify-center h-full w-full px-[10px] overflow-y-auto no-scrollbar">
      <div className="w-full flex flex-col gap-6">
        {sortedPlayers.map((opp) => {
          const isMe = String(opp.id) === String(currentPlayerId);
          const maxVisibleCards = 15;
          const hasExtra = opp.cardCount > maxVisibleCards;
          const visibleCount = Math.min(opp.cardCount, maxVisibleCards);

          // Константы для позиционирования
          const cardWidth = 45;
          const cardOverlap = 20; 

          return (
            <motion.div 
              key={opp.id} 
              layout
              className={`relative w-full flex flex-col p-6 rounded-[50px] border-2 backdrop-blur-xl transition-all duration-500 ${
                opp.isTurn 
                  ? 'border-orange-500 shadow-[0_0_60px_rgba(234,88,12,0.3)] scale-[1.02] z-10' 
                  : 'border-white/10 opacity-80'
              } ${
                isMe 
                  ? 'animate-premium-gradient shadow-[inset_0_0_30px_rgba(234,88,12,0.2)] text-white' 
                  : 'bg-black/40'
              }`}
              style={isMe ? {
                background: "linear-gradient(270deg, #4c1d95, #7c2d12, #451a03, #7c2d12)",
                backgroundSize: "400% 400%"
              } : {}}
            >
              {/* ИНФО-ПАНЕЛЬ */}
              <div className="flex items-center justify-center gap-6 mb-8 w-full z-20">
                <div className={`font-black text-2xl uppercase tracking-tighter truncate max-w-[140px] text-right flex-1 ${isMe ? 'text-orange-400' : 'text-white'}`}>
                  {opp.name}
                </div>

                <div className="flex flex-col items-center min-w-[100px]">
                  <div className={`text-[10px] font-black uppercase tracking-[0.3em] italic mb-1 ${
                    opp.isTurn ? 'text-orange-500 animate-pulse' : 'text-white/10'
                  }`}>
                    {opp.isTurn ? 'ХОДИТ' : 'ЖДЕТ'}
                  </div>
                  <div className={`h-[2px] w-full rounded-full ${opp.isTurn ? 'bg-orange-500 shadow-[0_0_15px_#ea580c]' : 'bg-white/10'}`} />
                </div>

                <div className="flex items-center gap-3 flex-1 text-left">
                  <span className="text-orange-500 font-black text-4xl leading-none">
                    {opp.cardCount}
                  </span>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-tight">
                    КАРТ
                  </span>
                </div>
              </div>

              {/* ЗОНА КАРТ (ГРЕБЕНКА БЕЗ НАКЛОНА) */}
              <div className="relative h-[70px] w-full flex items-center justify-center overflow-visible">
                <div 
                  className="relative flex items-center"
                  style={{ width: `${(visibleCount - 1) * cardOverlap + cardWidth}px` }}
                >
                  {Array.from({ length: visibleCount }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-[45px] h-[65px] rounded-[8px] border-2 border-white/20 bg-[#0f172a] shadow-md"
                      style={{
                        left: `${i * cardOverlap}px`,
                        zIndex: i,
                        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.02) 5px, rgba(255,255,255,0.02) 10px)`
                      }}
                    >
                       <div className="w-full h-full flex items-center justify-center opacity-10 grayscale text-[10px]">🐽</div>
                    </motion.div>
                  ))}

                  {/* ИНДИКАТОР ЛИШНИХ КАРТ - КРУПНЫЙ (32px+) И СПРАВА */}
                  {hasExtra && (
                    <motion.div 
                      initial={{ scale: 0, x: -10 }}
                      animate={{ scale: 1, x: 0 }}
                      className="absolute flex items-center justify-center bg-orange-600 text-white font-black rounded-full shadow-[0_0_20px_rgba(234,88,12,0.5)] border-2 border-white/60 z-50 min-w-[32px] h-[32px] px-2 text-sm"
                      style={{ 
                        left: `${(visibleCount - 1) * cardOverlap + cardWidth + 12}px` 
                      }}
                    >
                      +{opp.cardCount - maxVisibleCards}
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes premium-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-premium-gradient {
          animation: premium-gradient 5s ease infinite;
        }
      `}</style>
    </div>
  );
};