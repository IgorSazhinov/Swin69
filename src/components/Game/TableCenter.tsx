"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/Card";

interface TableCenterProps {
  topCard: any;
  isMyTurn: boolean;
  canDraw: boolean;
  onDraw: () => void;
}

export const TableCenter = ({ topCard, isMyTurn, canDraw, onDraw }: TableCenterProps) => {
  return (
    <div className="w-full h-full grid grid-cols-3 items-center justify-items-center overflow-visible relative">
      
      {/* 1. ЛЕВО (25% центральной зоны) */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <motion.button 
            onClick={onDraw} 
            disabled={!canDraw} 
            whileHover={canDraw ? { scale: 1.05, y: -5 } : {}}
            whileTap={canDraw ? { scale: 0.95 } : {}}
            className={`w-[176px] h-[264px] rounded-[32px] border-[8px] flex items-center justify-center transition-all duration-300 relative z-10 ${
              canDraw 
                ? "bg-orange-800 border-orange-400 shadow-[0_15px_40px_rgba(234,88,12,0.3)] cursor-pointer" 
                : "bg-zinc-900 border-zinc-800 opacity-40 cursor-not-allowed"
            }`}
          >
            <span className="text-8xl drop-shadow-2xl select-none">🐽</span>
            {/* Слой стопки */}
            <div className="absolute inset-0 bg-orange-950 rounded-[24px] translate-x-1.5 translate-y-1.5 -z-10 border-2 border-orange-900/20" />
          </motion.button>
        </div>
        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] italic">Колода</span>
      </div>

      {/* 2. ЦЕНТР (50% центральной зоны) */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-[176px] h-[264px]">
          <AnimatePresence mode="wait">
            {topCard ? (
              <motion.div 
                key={topCard.instanceId || topCard.id} 
                initial={{ scale: 1.5, opacity: 0, y: -50, rotate: -10 }} 
                animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }} 
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="absolute inset-0"
              >
                <Card card={topCard} isInsideHand={false} />
              </motion.div>
            ) : (
              <div className="w-full h-full rounded-[32px] border-4 border-dashed border-white/5 bg-white/5" />
            )}
          </AnimatePresence>
        </div>
        <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] italic bg-orange-500/10 px-4 py-1 rounded-full">Стол</span>
      </div>

      {/* 3. ПРАВО (75% центральной зоны - Резерв) */}
      <div className="flex flex-col items-center gap-4 opacity-10">
        <div className="w-[176px] h-[264px] rounded-[32px] border-4 border-dashed border-white/20 flex items-center justify-center">
           <span className="text-[10px] font-black uppercase text-center px-4">Спец</span>
        </div>
        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] italic">Резерв</span>
      </div>

    </div>
  );
};