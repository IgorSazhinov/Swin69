"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/Card";
import { useGameStore } from "@/store/useGameStore";

interface GameActionsProps {
  status: string;
  isChoosingColor: boolean;
  previewCard: any;
  winnerName?: string;
  onAction: (action: any, color?: string) => void;
}

export const GameActions = ({ status, isChoosingColor, previewCard, winnerName, onAction }: GameActionsProps) => {
  const { pendingPenalty, isMyTurn } = useGameStore();
  const previewKey = previewCard ? (previewCard.instanceId || previewCard.id || "preview") : "no-preview";

  return (
    <div className="flex items-center justify-center h-full w-full px-10">
      <AnimatePresence mode="wait">
        
        {/* ФИНАЛ ИГРЫ */}
        {status === 'FINISHED' && (
          <motion.div 
            key="finish-state"
            initial={{ scale: 0.8, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.8, opacity: 0 }}
            className="w-full bg-white p-10 rounded-[50px] text-center text-black border-[6px] border-orange-500 shadow-2xl"
          >
            <span className="text-6xl mb-4 block">🏆</span>
            <h2 className="text-3xl font-black uppercase italic mb-2">ФИНАЛ!</h2>
            <p className="font-bold text-orange-600 uppercase mb-8">{winnerName} победил!</p>
            <button 
              onClick={() => window.location.href = '/'} 
              className="w-full py-5 bg-black text-white rounded-[24px] font-black uppercase text-xl hover:bg-zinc-800 transition-all"
            >
              В МЕНЮ
            </button>
          </motion.div>
        )}

        {/* КРАСНОЕ ОКНО ХАПЕЖА */}
        {status === 'PLAYING' && isMyTurn && pendingPenalty > 0 && !isChoosingColor && (
          <motion.div 
            key="penalty-state"
            initial={{ y: 50, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: -50, opacity: 0 }}
            className="w-full bg-red-950 p-10 rounded-[50px] text-center border-[6px] border-red-600 shadow-[0_0_60px_rgba(220,38,38,0.5)]"
          >
            <h2 className="text-white font-black text-5xl uppercase italic mb-4">ХАПЕЖ!</h2>
            <p className="text-white font-bold text-2xl mb-8 uppercase tracking-tighter">Нужно взять {pendingPenalty} карт</p>
            <button 
              onClick={() => onAction('take-penalty')}
              className="w-full py-6 bg-white text-red-700 rounded-[24px] font-black uppercase text-2xl hover:bg-red-100 transition-all active:scale-95 shadow-xl"
            >
              ВЗЯТЬ КАРТЫ
            </button>
            <p className="text-white/20 text-[10px] mt-6 uppercase font-black tracking-widest leading-none">Или переведи своим Хапежом</p>
          </motion.div>
        )}

        {/* ВЫБОР ЦВЕТА ПОЛИСВИНА */}
        {status === 'PLAYING' && isChoosingColor && (
          <motion.div 
            key="color-choice-state"
            initial={{ x: 80, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            exit={{ x: -80, opacity: 0 }}
            className="w-full max-w-[340px] bg-black/90 backdrop-blur-3xl p-10 rounded-[60px] border-4 border-white/20 shadow-2xl flex flex-col items-center"
          >
            <div className="text-center mb-8 font-black uppercase tracking-widest text-orange-500 text-sm italic">Выбери цвет</div>
            <div className="grid grid-cols-2 gap-6">
              {[
                {id:'red', hex:'#ef4444'},
                {id:'green', hex:'#22c55e'},
                {id:'blue', hex:'#3b82f6'},
                {id:'yellow', hex:'#eab308'}
              ].map(c => (
                <motion.button 
                  key={`color-btn-${c.id}`} 
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

        {/* ПРЕВЬЮ КАРТЫ */}
        {status === 'PLAYING' && previewCard && !isChoosingColor && pendingPenalty === 0 && (
          <motion.div 
            key={`preview-container-${previewKey}`}
            initial={{ x: 80, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            exit={{ x: -80, opacity: 0 }}
            className="w-full flex flex-col items-center p-8 bg-black/80 backdrop-blur-3xl rounded-[50px] border-2 border-white/20 shadow-2xl"
          >
            <div className="w-[160px] h-[240px] mb-8">
              <Card card={previewCard} isInsideHand={false} />
            </div>
            <div className="flex flex-col gap-4 w-full">
              <button 
                onClick={() => onAction('play')} 
                className="py-5 bg-orange-600 rounded-[24px] font-black uppercase text-xl shadow-lg hover:bg-orange-500"
              >
                Сходить
              </button>
              <button 
                onClick={() => onAction('keep')} 
                className="py-4 bg-white/10 rounded-[24px] font-black uppercase text-[10px] tracking-widest opacity-50"
              >
                В руку
              </button>
            </div>
          </motion.div>
        )}

        {/* ПУСТОЕ СОСТОЯНИЕ */}
        {status === 'PLAYING' && !isChoosingColor && !previewCard && pendingPenalty === 0 && (
          <motion.div 
            key="waiting-state"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="text-center text-white/5 uppercase font-black italic text-3xl rotate-12"
          >
             Ожидание<br/>действий
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};