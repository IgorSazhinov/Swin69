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

  const rotation = isInsideHand ? (index - (totalCards - 1) / 2) * (totalCards > 10 ? 3 : 6) : 0;

  if (isBack || !card) {
    return (
      <div
        className="relative w-[50px] h-[75px] rounded-[8px] border-[2px] border-white/10 shadow-lg flex items-center justify-center overflow-hidden bg-[#0f172a]"
        style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.05) 5px, rgba(255,255,255,0.05) 10px)` }}
      >
        <span className="text-xl opacity-20 grayscale">🐽</span>
      </div>
    );
  }

  const isPlayable = isInsideHand && !disabled && canPlayCard(card, topCard);
  
  const symbol = card.type === 'number' 
    ? card.value 
    : ({ 
        khlopokopyt: "🐾", 
        tikhohryun: "🤫", 
        perekhrkyu: "🔄", 
        zahalomon: "🚫", 
        polyhryun: "🌈",
        khapezh: "🃏" 
      }[card.type] || "?");

  // Если это полисвин и у него уже назначен цвет (после выбора), используем его hex
  const bgColor = colorHex[card.color as keyof typeof colorHex] || "#6b7280";
  
  const dynamicMargin = isInsideHand && index !== 0 
    ? { marginLeft: `${Math.max(-140, -70 - (totalCards * 1.5))}px` } 
    : {};

  return (
    <motion.div
      layout={isInsideHand ? "position" : false}
      initial={isInsideHand ? { opacity: 0, y: 150 } : false}
      animate={{ 
        opacity: isInsideHand && !isPlayable ? 0.4 : 1, 
        filter: isInsideHand && !isPlayable ? "grayscale(0.6)" : "grayscale(0)",
        y: isInsideHand ? Math.abs(rotation) * 2 : 0, 
        rotate: rotation,
        scale: 1,
        zIndex: isInsideHand ? index : 1 
      }}
      whileHover={isInsideHand && !disabled ? { y: -140, scale: 1.15, zIndex: 100 } : {}}
      onClick={isPlayable ? onClick : undefined}
      style={{ 
        ...dynamicMargin,
        backgroundColor: bgColor,
        backgroundImage: card.type === 'polyhryun' && card.color === 'multi'
          ? `conic-gradient(from 180deg at 50% 50%, #ef4444, #eab308, #22c55e, #3b82f6, #ef4444)`
          : `linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.15) 100%)`
      }}
      className={`
        relative select-none flex-shrink-0 w-[176px] h-[264px] rounded-[32px] border-[8px] shadow-2xl
        flex items-center justify-center overflow-visible transition-all duration-300
        ${(card.color === 'yellow' || (card.type === 'polyhryun' && card.color === 'multi')) ? 'border-amber-200 text-amber-950' : 'border-white/20 text-white'}
        ${!isPlayable && isInsideHand ? "cursor-not-allowed" : "cursor-pointer active:scale-90"}
      `}
    >
      <span style={{ fontSize: '150px' }} className="font-black drop-shadow-2xl">{symbol}</span>
      
      {/* Маленький индикатор текущего цвета для Полисвина, если он уже на столе */}
      {!isInsideHand && card.type === 'polyhryun' && card.color !== 'multi' && (
        <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full border-4 border-white shadow-xl" style={{ backgroundColor: bgColor }} />
      )}
    </motion.div>
  );
};