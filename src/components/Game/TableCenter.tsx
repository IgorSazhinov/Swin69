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
    <div className="flex flex-col items-center justify-center h-full px-4 relative">
      <div className="flex items-center gap-10">
        <div className="flex flex-col items-center gap-4">
          <motion.button 
            onClick={onDraw} 
            disabled={!canDraw} 
            className={`w-[150px] h-[225px] rounded-[28px] border-[8px] flex items-center justify-center transition-all ${
              canDraw ? "bg-orange-800 border-orange-400 shadow-2xl scale-105 cursor-pointer" : "bg-zinc-900 border-zinc-800 opacity-40 cursor-not-allowed"
            }`}
          >
            <span className="text-7xl">🐽</span>
          </motion.button>
          <span className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">Колода</span>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="relative w-[150px] h-[225px]">
            <AnimatePresence mode="wait">
              {topCard && (
                <motion.div 
                  key={topCard.instanceId || topCard.id} 
                  initial={{ scale: 0.5, opacity: 0, rotate: -20, y: 50 }} 
                  animate={{ scale: 1, opacity: 1, rotate: 0, y: 0 }} 
                  className="absolute inset-0"
                >
                  <Card card={topCard} isInsideHand={false} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest italic">Стол</span>
        </div>
      </div>
    </div>
  );
};