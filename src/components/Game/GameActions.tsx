"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/Card";

interface GameActionsProps {
  status: string;
  isChoosingColor: boolean;
  previewCard: any;
  winnerName?: string;
  onAction: (action: any, color?: string) => void;
}

export const GameActions = ({ status, isChoosingColor, previewCard, winnerName, onAction }: GameActionsProps) => {
  return (
    <div className="flex items-center justify-center h-full border-l border-white/5 px-10">
      <AnimatePresence mode="wait">
        {status === 'PLAYING' && !isChoosingColor && !previewCard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-white/5 uppercase font-black italic text-3xl rotate-12">
             Ожидание<br/>действий
          </motion.div>
        )}

        {status === 'FINISHED' && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full bg-white p-10 rounded-[50px] text-center text-black shadow-2xl border-[6px] border-orange-500">
            <span className="text-6xl mb-4 block">🏆</span>
            <h2 className="text-3xl font-black uppercase italic mb-2">ФИНАЛ!</h2>
            <p className="font-bold text-orange-600 uppercase mb-8">{winnerName} победил!</p>
            <button onClick={() => window.location.href = '/'} className="w-full py-5 bg-black text-white rounded-[24px] font-black uppercase text-xl">В МЕНЮ</button>
          </motion.div>
        )}

        {isChoosingColor && (
          <motion.div initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="w-full max-w-[320px] bg-black/90 backdrop-blur-3xl p-10 rounded-[60px] border-4 border-white/20 shadow-2xl flex flex-col items-center">
            <div className="text-center mb-8 font-black uppercase tracking-widest text-orange-500 text-sm italic">Выбери цвет</div>
            <div className="grid grid-cols-2 gap-6">
              {[{id:'red',hex:'#ef4444'},{id:'green',hex:'#22c55e'},{id:'blue',hex:'#3b82f6'},{id:'yellow',hex:'#eab308'}].map(c => (
                <motion.button 
                  key={c.id} 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onAction('select-color', c.id)} 
                  className="w-24 h-24 min-h-[96px] min-w-[96px] rounded-[30px] border-4 border-white/20 shadow-lg" 
                  style={{ backgroundColor: c.hex }} 
                />
              ))}
            </div>
          </motion.div>
        )}

        {previewCard && (
          <motion.div initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="w-full flex flex-col items-center p-8 bg-black/80 backdrop-blur-3xl rounded-[50px] border-2 border-white/20 shadow-2xl">
            <div className="w-[160px] h-[240px] mb-8"><Card card={previewCard} isInsideHand={false} /></div>
            <div className="flex flex-col gap-4 w-full">
              <button onClick={() => onAction('play')} className="py-5 bg-orange-600 rounded-[24px] font-black uppercase text-xl shadow-lg">Сходить</button>
              <button onClick={() => onAction('keep')} className="py-4 bg-white/10 rounded-[24px] font-black uppercase text-[10px] tracking-widest opacity-50">В руку</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};