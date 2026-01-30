import { Card, CardType } from "@/types/game";

export const canPlayCard = (cardToPlay: Card, topCard: Card | null): boolean => {
  if (!topCard) return true;
  if (cardToPlay.type === 'polyhryun') return true;
  if (cardToPlay.color === topCard.color) return true;
  if (cardToPlay.type === 'number' && topCard.type === 'number') {
    return cardToPlay.value === topCard.value;
  }
  return cardToPlay.type !== 'number' && cardToPlay.type === topCard.type;
};

export const calculateNextTurn = (currentIndex: number, direction: number, playerCount: number, cardType: CardType) => {
  let step = 1;
  if (cardType === 'zahalomon') step = 2; // Пропуск хода
  
  const nextIndex = (currentIndex + (direction * step) + playerCount) % playerCount;
  const nextDirection = cardType === 'perekhrkyu' ? direction * -1 : direction;
  
  return { nextIndex, nextDirection };
};