"use client";

import { motion, AnimatePresence } from "framer-motion";
import { formatCardsCount } from "@/lib/utils";

interface PlayerInfo {
  id: string;
  name: string;
  cardCount: number;
  isTurn: boolean;
}

interface OpponentsProps {
  players: PlayerInfo[];
  currentPlayerId: string;
  direction?: number;
  pendingPenalty?: number;
}

export const Opponents = ({
  players,
  currentPlayerId,
  direction = 1,
  pendingPenalty = 0,
}: OpponentsProps) => {
  // 1. Учитываем направление хода: если -1 (реверс), разворачиваем исходный список
  const directionalPlayers =
    direction === -1 ? [...players].reverse() : players;
  // 2. Находим индекс того, кто сейчас ходит в ЭТОМ списке
  const activeIndex = directionalPlayers.findIndex((p) => p.isTurn);

  // 3. Сдвигаем массив так, чтобы активный был первым, а остальные шли по порядку
  const sortedPlayers =
    activeIndex !== -1
      ? [
          ...directionalPlayers.slice(activeIndex),
          ...directionalPlayers.slice(0, activeIndex),
        ]
      : directionalPlayers;

  return (
    <div className="flex flex-col gap-4 items-center justify-start h-full w-full px-[10px] overflow-y-auto no-scrollbar py-10">
      <div className="w-full flex flex-col gap-6 max-w-2xl">
        <AnimatePresence mode="popLayout">
          {sortedPlayers.map((opp) => {
            const isMe = String(opp.id) === String(currentPlayerId);
            const isTakingPenalty = opp.isTurn && pendingPenalty > 0;
            const maxVisibleCards = 15;
            const hasExtra = opp.cardCount > maxVisibleCards;
            const visibleCount = Math.min(opp.cardCount, maxVisibleCards);

            // Константы для позиционирования карт
            const cardWidth = 45;
            const cardOverlap = 20;

            return (
              <motion.div
                key={opp.id}
                layout // Обеспечивает плавную смену позиций при пересортировке
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`relative w-full flex flex-col p-6 rounded-[50px] border-2 backdrop-blur-xl transition-shadow duration-500 ${
                  opp.isTurn
                    ? "border-orange-500 shadow-[0_0_60px_rgba(234,88,12,0.3)] z-10"
                    : "border-white/10 opacity-70"
                } ${
                  isMe
                    ? "animate-premium-gradient shadow-[inset_0_0_30px_rgba(234,88,12,0.2)] text-white"
                    : "bg-black/40"
                }`}
                style={
                  isMe
                    ? {
                        background:
                          "linear-gradient(270deg, #4c1d95, #7c2d12, #451a03, #7c2d12)",
                        backgroundSize: "400% 400%",
                      }
                    : {}
                }
              >
                {/* ИНФО-ПАНЕЛЬ */}
                <div className="flex items-center justify-center gap-6 mb-8 w-full z-20">
                  <div
                    className={`font-black text-2xl uppercase tracking-tighter truncate max-w-[140px] text-right flex-1 ${
                      isMe ? "text-orange-400" : "text-white"
                    }`}
                  >
                    {opp.name}
                  </div>

                  <div className="flex flex-col items-center min-w-[100px]">
                    <div
                      className={`text-[10px] font-black uppercase tracking-[0.2em] italic mb-1 ${
                        isTakingPenalty
                          ? "text-red-500 animate-bounce"
                          : opp.isTurn
                          ? "text-orange-500 animate-pulse"
                          : "text-white/10"
                      }`}
                    >
                      {isTakingPenalty
                        ? "БЕРЕТ ХАПЕЖ"
                        : opp.isTurn
                        ? "ХОДИТ"
                        : "ЖДЕТ"}
                    </div>

                    <div
                      className={`h-[2px] w-full rounded-full transition-all duration-500 ${
                        isTakingPenalty
                          ? "bg-red-600 shadow-[0_0_15px_#dc2626]"
                          : opp.isTurn
                          ? "bg-orange-500 shadow-[0_0_15px_#ea580c]"
                          : "bg-white/10"
                      }`}
                    />
                  </div>

                  <div className="flex items-center gap-3 flex-1 text-left">
                    <span className="text-orange-500 font-black text-4xl leading-none">
                      {opp.cardCount}
                    </span>
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-tight">
                      {formatCardsCount(opp.cardCount)}
                    </span>
                  </div>
                </div>

                {/* ЗОНА КАРТ */}
                <div className="relative h-[70px] w-full flex items-center justify-center overflow-visible">
                  <div
                    className="relative flex items-center"
                    style={{
                      width: `${
                        (visibleCount - 1) * cardOverlap + cardWidth
                      }px`,
                    }}
                  >
                    {Array.from({ length: visibleCount }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-[45px] h-[65px] rounded-[8px] border-2 border-white/20 bg-[#0f172a] shadow-md"
                        style={{
                          left: `${i * cardOverlap}px`,
                          zIndex: i,
                          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.02) 5px, rgba(255,255,255,0.02) 10px)`,
                        }}
                      >
                        <div className="w-full h-full flex items-center justify-center opacity-10 grayscale text-[10px]">
                          🐽
                        </div>
                      </motion.div>
                    ))}

                    {/* ИНДИКАТОР ЛИШНИХ КАРТ */}
                    {hasExtra && (
                      <motion.div
                        initial={{ scale: 0, x: -10 }}
                        animate={{ scale: 1, x: 0 }}
                        className="absolute flex items-center justify-center bg-orange-600 text-white font-black rounded-full shadow-[0_0_20px_rgba(234,88,12,0.5)] border-2 border-white/60 z-50 min-w-[35px] h-[35px] px-2 text-sm"
                        style={{
                          left: `${
                            (visibleCount - 1) * cardOverlap + cardWidth + 12
                          }px`,
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
        </AnimatePresence>
      </div>

      <style jsx global>{`
        @keyframes premium-gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-premium-gradient {
          animation: premium-gradient 5s ease infinite;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
