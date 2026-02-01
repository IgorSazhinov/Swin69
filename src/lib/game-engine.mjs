/** Валидация возможности обычного хода */
export const canPlayCard = (cardToPlay, topCard) => {
  if (!topCard || !topCard.type) return true;
  if (cardToPlay.type === 'polyhryun') return true;
  if (cardToPlay.color === topCard.color) return true;
  if (cardToPlay.type === 'number' && topCard.type === 'number') {
    return String(cardToPlay.value) === String(topCard.value);
  }
  return cardToPlay.type !== 'number' && cardToPlay.type === topCard.type;
};

/** Проверка на ПЕРЕХВАТ (полное совпадение) */
export const canIntercept = (cardToPlay, topCard) => {
  if (!topCard || !topCard.type) return false;
  // Полисвин не перехватывается, так как в руке он "бесцветный"
  if (cardToPlay.type === 'polyhryun') return false;

  const colorMatch = cardToPlay.color === topCard.color;
  const typeMatch = cardToPlay.type === topCard.type;
  const valueMatch = String(cardToPlay.value) === String(topCard.value);

  if (cardToPlay.type === 'number') {
    return colorMatch && valueMatch;
  }
  return colorMatch && typeMatch;
};

/** Расчет следующего игрока с учетом прыжков (Захломон/Хапеж) */
export const calculateNextTurn = (actingPlayerIndex, direction, playerCount, cardType) => {
  // Если кинули Захломон, Хапеж или Перехрюк в дуэли — следующий пропускает ход
  let jump = (cardType === 'zahalomon' || (cardType === 'perekhryuk' && playerCount === 2) || cardType === 'khapezh') ? 2 : 1;
  
  let nextIdx = (actingPlayerIndex + (direction * jump)) % playerCount;
  if (nextIdx < 0) nextIdx += playerCount;
  return nextIdx;
};

/** Генератор уникальных ключей для React */
export const generateInstanceId = (prefix = 'id') => 
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

/** Логика перемешивания колоды из сброса */
export const reshuffleDeck = (discardPile) => {
  if (discardPile.length <= 1) return null;
  const topCard = discardPile.pop(); // Оставляем текущую карту
  const newDeck = discardPile.sort(() => Math.random() - 0.5);
  return { newDeck, newDiscardPile: [topCard] };
};