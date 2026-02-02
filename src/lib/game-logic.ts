import { Card } from "@/types/game";

/**
 * Валидация возможности обычного хода.
 */
export const canPlayCard = (cardToPlay: Card, topCard: Card | null): boolean => {
  if (!topCard) return true;

  if (cardToPlay.type === 'polyhryun') return true;

  if (cardToPlay.color === topCard.color) return true;

  if (cardToPlay.type === 'number' && topCard.type === 'number') {
    return String(cardToPlay.value) === String(topCard.value);
  }

  if (cardToPlay.type !== 'number' && cardToPlay.type === topCard.type) {
    return true;
  }

  return false;
};

/**
 * Проверка на ПЕРЕХВАТ (Intercept).
 */
export const canIntercept = (cardToPlay: Card, topCard: Card | null): boolean => {
  if (!topCard) return false;

  if (cardToPlay.type === 'polyhryun' && topCard.type === 'polyhryun') {
    return true;
  }

  if (cardToPlay.type === 'polyhryun' || topCard.type === 'polyhryun') {
    return false;
  }

  const colorMatch = cardToPlay.color === topCard.color;
  const typeMatch = cardToPlay.type === topCard.type;

  if (cardToPlay.type === 'number') {
    const valueMatch = String(cardToPlay.value) === String(topCard.value);
    return colorMatch && valueMatch;
  }

  return colorMatch && typeMatch;
};

/**
 * Расчет следующего хода и направления.
 */
export const calculateNextTurn = (
  actingPlayerOrder: number, 
  currentDirection: number, 
  playerCount: number, 
  cardType: string
) => {
  let direction = currentDirection;

  if (cardType === 'perekhrkyu') {
    if (playerCount === 2) {
      return { nextIndex: actingPlayerOrder, nextDirection: direction };
    }
    direction *= -1;
  }

  const step = (cardType === 'zakhrapin' || cardType === 'khapezh') ? 2 : 1;
  let nextIndex = (actingPlayerOrder + (direction * step) + playerCount) % playerCount;

  return { nextIndex, nextDirection: direction };
};

/**
 * Генератор уникальных ID.
 */
export const generateInstanceId = (prefix = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Перемешивание колоды.
 */
export const reshuffleDeck = (discardPile: Card[]) => {
  if (!discardPile || discardPile.length <= 1) return null;

  const topCard = discardPile.pop();
  const newDeck = [...discardPile];
  
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }

  return {
    newDeck,
    newDiscardPile: [topCard as Card]
  };
};