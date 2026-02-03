"use client";

import { Card as CardType } from "@/types/game";
import { motion } from "framer-motion";
import { canPlayCard } from "@/lib/game-logic";
import { useGameStore } from "@/store/useGameStore";

interface CardProps {
  card?: CardType;
  isBack?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  isInsideHand?: boolean; 
  index?: number;
  totalCards?: number;
}

export const Card = ({ card, isBack, onClick, disabled, isInsideHand, index = 0, totalCards = 1 }: CardProps) => {
  const { topCard } = useGameStore();
  
  const colorHex = {
    red: "#ef4444", 
    green: "#22c55e", 
    blue: "#3b82f6", 
    yellow: "#eab308", 
    multi: "#1e293b",
  };

  // Расчет вращения для веера в руке
  const rotation = isInsideHand ? (index - (totalCards - 1) / 2) * (totalCards > 10 ? 3 : 6) : 0;

  // Отрисовка рубашки карты
  if (isBack || !card) {
    return (
      <div
        className="relative w-[176px] h-[264px] rounded-[32px] border-[8px] border-white/10 shadow-2xl flex items-center justify-center overflow-hidden bg-[#0f172a]"
        style={{ 
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.05) 5px, rgba(255,255,255,0.05) 10px)` 
        }}
      >
        <span className="text-8xl opacity-20 grayscale select-none">🐽</span>
      </div>
    );
  }

  // Проверка: можно ли сейчас сыграть эту карту
  const isPlayable = isInsideHand && !disabled && canPlayCard(card, topCard);
  
  // Символы для спецкарт
  const symbols: Record<string, string> = {
    khlopkopit: "🐾", 
    tikhohryun: "🤫", 
    perekhryuk: "🔄", 
    zakhrapin: "🚫", 
    polyhryun: "🌈",
    khapezh: "🃏"
  };

  const symbol = card.type === 'number' ? card.value : (symbols[card.type] || "?");

  // Определяем фоновый цвет
  const bgColor = colorHex[card.color as keyof typeof colorHex] || "#6b7280";
  
  // Адаптивный отступ для перекрытия карт в руке
  const dynamicMargin = isInsideHand && index !== 0 
    ? { marginLeft: `${Math.max(-150, -100 - (totalCards * 1.2))}px` } 
    : {};

  return (
    <motion.div
      layout={isInsideHand ? "position" : false}
      initial={isInsideHand ? { opacity: 0, y: 200 } : false}
      animate={{ 
        // Смягченные фильтры для неактивных карт
        opacity: isInsideHand && !isPlayable ? 0.6 : 1, 
        filter: isInsideHand && !isPlayable ? "brightness(0.7) saturate(0.8)" : "brightness(1) saturate(1)",
        y: isInsideHand ? Math.abs(rotation) * 2 : 0, 
        rotate: rotation,
        scale: 1,
        zIndex: isInsideHand ? index : 1 
      }}
      whileHover={isInsideHand && isPlayable && !disabled ? { 
        y: -150, 
        scale: 1.2, 
        zIndex: 100,
        transition: { type: "spring", stiffness: 300 } 
      } : {}}
      onClick={isPlayable ? onClick : undefined}
      style={{ 
        ...dynamicMargin,
        backgroundColor: bgColor,
        backgroundImage: card.type === 'polyhryun' && card.color === 'multi'
          ? `conic-gradient(from 180deg at 50% 50%, #ef4444, #eab308, #22c55e, #3b82f6, #ef4444)`
          : `linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(0,0,0,0.2) 100%)`
      }}
      className={`
        relative select-none flex-shrink-0 w-[176px] h-[264px] rounded-[32px] border-[8px] shadow-2xl
        flex items-center justify-center overflow-visible transition-all duration-300
        ${(card.color === 'yellow' || (card.type === 'polyhryun' && card.color === 'multi')) ? 'border-amber-200 text-amber-950' : 'border-white/20 text-white'}
        ${!isPlayable && isInsideHand ? "cursor-not-allowed" : "cursor-pointer active:scale-95"}
      `}
    >
      {/* Только основной центральный символ */}
      <span 
        style={{ fontSize: card.type === 'number' ? '160px' : '120px' }} 
        className="font-black drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] select-none"
      >
        {symbol}
      </span>
      
      {/* Индикатор выбранного цвета для Полисвина на столе */}
      {!isInsideHand && card.type === 'polyhryun' && card.color !== 'multi' && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-6 -right-6 w-16 h-16 rounded-full border-4 border-white shadow-2xl z-50" 
          style={{ backgroundColor: bgColor }} 
        />
      )}
    </motion.div>
  );
};