/** Валидация возможности хода */
export const canPlayCard = (cardToPlay, topCard) => {
  if (!topCard || !topCard.type) return true;
  if (cardToPlay.type === 'polyhryun') return true;
  if (cardToPlay.color === topCard.color) return true;
  if (cardToPlay.type === 'number' && topCard.type === 'number') {
    return String(cardToPlay.value) === String(topCard.value);
  }
  return cardToPlay.type !== 'number' && cardToPlay.type === topCard.type;
};

/** Расчет следующего игрока с учетом спецкарт */
export const calculateNextTurn = (currentIndex, direction, playerCount, cardType) => {
  // Захломон, Хапеж или Перехрюк вдвоем заставляют пропустить ход (прыжок через одного)
  let jump = (cardType === 'zahalomon' || (cardType === 'perekhryuk' && playerCount === 2) || cardType === 'khapezh') ? 2 : 1;
  
  let nextIdx = (currentIndex + (direction * jump)) % playerCount;
  if (nextIdx < 0) nextIdx += playerCount;
  return nextIdx;
};

/** Генератор уникальных ключей для React */
export const generateInstanceId = (prefix = 'id') => 
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

/** Логика перемешивания колоды из сброса */
export const reshuffleDeck = (discardPile) => {
  if (discardPile.length <= 1) return [];
  const topCard = discardPile.pop(); // Оставляем верхнюю карту на столе
  const newDeck = discardPile.sort(() => Math.random() - 0.5);
  return { newDeck, newDiscardPile: [topCard] };
};