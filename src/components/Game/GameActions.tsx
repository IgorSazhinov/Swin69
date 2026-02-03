"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/Card";
import { useGameStore } from "@/store/useGameStore";
import { formatCardsLabel  } from "@/lib/utils";

interface GameActionsProps {
  status: string;
  isChoosingColor: boolean;
  previewCard: any;
  winnerName?: string;
  onAction: (action: any, color?: string) => void;
}

export const GameActions = ({
  status,
  isChoosingColor,
  previewCard,
  winnerName,
  onAction,
}: GameActionsProps) => {
  const { pendingPenalty, isMyTurn } = useGameStore();
  const previewKey = previewCard
    ? previewCard.instanceId || previewCard.id || "preview"
    : "no-preview";

  return (
    /* Фиксированная высота увеличена до 500px для стабильности */
    <div className="flex items-center justify-center h-[500px] w-full px-6 relative -translate-y-12">
      <AnimatePresence mode="wait">
        {/* ФИНАЛ ИГРЫ — СТРОГИЕ ОТСТУПЫ 10PX */}
        {status === "FINISHED" && (
          <motion.div
            key="finish-state"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            // Паддинг 10px сверху и снизу (py-[10px]), по бокам p-10 для ширины
            className="w-full max-w-[360px] bg-white py-[10px] px-10 rounded-[50px] text-center text-black border-[6px] border-orange-500 shadow-2xl flex flex-col items-center"
          >
            {/* 1. ИКОНКА */}
            <span className="text-6xl mb-2 block">🏆</span>

            {/* 2. ЗАГОЛОВОК */}
            <h2 className="text-3xl font-black uppercase italic mb-1 leading-none">
              ФИНАЛ!
            </h2>

            {/* 3. ИМЯ ПОБЕДИТЕЛЯ */}
            <p className="font-bold text-orange-600 uppercase mb-6 text-sm tracking-tighter">
              {winnerName} победил!
            </p>

            {/* 4. КНОПКА (отступ 10px до низа обеспечен py-[10px]) */}
            <button
              onClick={() => (window.location.href = "/")}
              className="w-[220px] py-4 bg-black text-white rounded-[24px] font-black uppercase text-xl hover:bg-zinc-800 transition-all active:scale-95 shadow-xl"
            >
              В МЕНЮ
            </button>
          </motion.div>
        )}

        {/* ХЛОПКОПЫТ */}
        {status === 'CHLOPKOPIT' && (
          <motion.div 
            key="chlopkopit-state"
            initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }}
            className="w-full max-w-[360px] bg-orange-600 py-[10px] px-8 rounded-[60px] border-[6px] border-white shadow-2xl flex flex-col items-center z-50"
          >
            <span className="text-6xl mb-2 animate-bounce">🐷</span>
            <h2 className="text-white font-black text-4xl uppercase italic mb-1 leading-none">ХЛОПКОПЫТ!</h2>
            <p className="text-white/80 font-bold text-sm mb-6 uppercase">Жми на стол!</p>
            <button 
              onClick={() => onAction('chlop')}
              className="w-[220px] py-6 bg-white text-orange-600 rounded-[35px] font-black uppercase text-3xl shadow-[0_10px_0_#ddd] active:shadow-none active:translate-y-[10px] transition-all"
            >
              ХЛОП!
            </button>
          </motion.div>
        )}

        {/* ХАПЕЖ (Обводка 6px как в оригинале) */}
        {status === "PLAYING" &&
          isMyTurn &&
          pendingPenalty > 0 &&
          !isChoosingColor && (
            <motion.div
              key="penalty-state"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              // Паддинг 10px сверху и снизу (py-[10px])
              className="w-full max-w-[360px] bg-red-950 py-[10px] px-8 rounded-[50px] text-center border-[6px] border-red-600 shadow-[0_0_60px_rgba(220,38,38,0.5)] flex flex-col items-center"
            >
              {/* 1. ЗАГОЛОВОК (10px от края сверху) */}
              <h2 className="text-white font-black text-5xl uppercase italic mb-2 tracking-tighter leading-none">
                ХАПЕЖ!
              </h2>

              {/* 2. ПОДЗАГОЛОВОК */}
              <p className="text-white font-bold text-xl mb-6 uppercase tracking-tight">
                Возьми {pendingPenalty} {formatCardsLabel(pendingPenalty)}
              </p>

              {/* 3. КНОПКА (ширина 220px как в финале) */}
              <button
                onClick={() => onAction("take-penalty")}
                className="w-[220px] py-5 bg-white text-red-700 rounded-[24px] font-black uppercase text-xl hover:bg-red-100 transition-all active:scale-95 shadow-xl"
              >
                ВЗЯТЬ
              </button>

              {/* 4. ПОДСКАЗКА (10px от края снизу обеспечено py-[10px]) */}
              <p className="text-white/20 text-[9px] mt-4 uppercase font-black tracking-widest leading-none">
                ИЛИ ПЕРЕВЕДИ
              </p>
            </motion.div>
          )}

        {/* ВЫБОР ЦВЕТА — СТРОГИЕ ОТСТУПЫ 10PX */}
        {status === "PLAYING" && isChoosingColor && (
          <motion.div
            key="color-choice-state"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            // Паддинг 10px со всех сторон
            className="w-full max-w-[300px] bg-black/90 backdrop-blur-3xl p-[10px] rounded-[40px] border-2 border-white/20 shadow-2xl flex flex-col items-center z-50"
          >
            {/* 1. ЗАГОЛОВОК */}
            <div className="w-full text-center pt-4 pb-2 font-black uppercase tracking-widest text-orange-500 text-xl italic drop-shadow-[0_2px_10px_rgba(234,88,12,0.4)]">
              Выбери цвет
            </div>

            {/* 2. ОТСТУП 10px */}
            <div className="h-[10px]" />

            {/* 3. СЕТКА 2х2 */}
            <div className="grid grid-cols-2 gap-[10px] w-full">
              {[
                { id: "red", hex: "#ef4444" },
                { id: "green", hex: "#22c55e" },
                { id: "blue", hex: "#3b82f6" },
                { id: "yellow", hex: "#eab308" },
              ].map((c) => (
                <motion.button
                  key={`color-btn-${c.id}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onAction("select-color", c.id)}
                  // Кнопки квадратные, занимают всё доступное место в сетке
                  className="aspect-square w-full min-h-[100px] rounded-[24px] border-4 border-white/10 shadow-lg transition-transform"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>

            {/* 4. НИЖНИЙ ОТСТУП 10px обеспечивается паддингом контейнера */}
          </motion.div>
        )}

        {/* ПРЕВЬЮ КАРТЫ — СТРОГИЕ ОТСТУПЫ 10PX */}
        {status === "PLAYING" &&
          previewCard &&
          !isChoosingColor &&
          pendingPenalty === 0 && (
            <motion.div
              key={`preview-container-${previewKey}`}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              // Контейнер подстраивается под контент, но держит структуру
              className="w-full max-w-[340px] flex flex-col items-center p-[10px] bg-black/90 backdrop-blur-3xl rounded-[40px] border-2 border-white/20 shadow-2xl z-50"
            >
              {/* 1. Верхний отступ 10px уже есть от падинга p-[10px] */}

              {/* 2. КАРТА (оригинальный размер как в стопке) */}
              <div className="relative w-[176px] h-[264px] flex-shrink-0 flex items-center justify-center overflow-visible">
                <Card card={previewCard} isInsideHand={false} />
              </div>

              {/* 3. ОТСТУП 10px */}
              <div className="h-[10px]" />

              {/* 4. ДВЕ КНОПКИ */}
              <div className="flex flex-col gap-[10px] w-full">
                <button
                  onClick={() => onAction("play")}
                  className="w-full py-5 bg-orange-600 text-white rounded-[24px] font-black uppercase text-xl shadow-lg hover:bg-orange-500 active:scale-95 transition-all"
                >
                  Сходить
                </button>
                <button
                  onClick={() => onAction("keep")}
                  className="w-full py-4 bg-white/10 text-white/60 rounded-[20px] font-black uppercase text-[11px] tracking-[0.3em] hover:bg-white/20 transition-all"
                >
                  В руку
                </button>
              </div>

              {/* 5. НИЖНИЙ ОТСТУП 10px обеспечивается падингом p-[10px] */}
            </motion.div>
          )}

        {/* ОЖИДАНИЕ */}
        {status === "PLAYING" &&
          !isChoosingColor &&
          !previewCard &&
          pendingPenalty === 0 && (
            <motion.div
              key="waiting-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="text-white/5 uppercase font-black italic text-3xl rotate-12 select-none leading-tight">
                Ожидание
                <br />
                действий
              </div>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};
