/**
 * Валидация возможности обычного хода.
 */
 export const canPlayCard = (cardToPlay, topCard) => {
  if (!topCard || !topCard.type) return true;
  
  // Полисвин можно кинуть на всё
  if (cardToPlay.type === "polyhryun") return true;

  // Совпадение по цвету
  if (cardToPlay.color === topCard.color) return true;

  // Совпадение по номиналу (для цифровых карт)
  if (cardToPlay.type === "number" && topCard.type === "number") {
    return String(cardToPlay.value) === String(topCard.value);
  }

  // Совпадение по типу (для спецкарт)
  if (cardToPlay.type !== "number" && cardToPlay.type === topCard.type) {
    return true;
  }

  return false;
};

/**
 * Проверка на ПЕРЕХВАТ (Intercept).
 */
export const canIntercept = (cardToPlay, topCard) => {
  if (!topCard || !topCard.type) return false;
  if (cardToPlay.type === "polyhryun") return false;

  const colorMatch = cardToPlay.color === topCard.color;
  const typeMatch = cardToPlay.type === topCard.type;

  if (cardToPlay.type === "number") {
    const valueMatch = String(cardToPlay.value) === String(topCard.value);
    return colorMatch && valueMatch;
  }
  return colorMatch && typeMatch;
};

/**
 * Расчет следующего хода и направления.
 */
export const calculateNextTurn = (
  actingPlayerOrder,
  currentDirection,
  playerCount,
  cardType
) => {
  let direction = currentDirection;

  // 1. ХЛОПКОПЫТ: замираем на текущем игроке, пока не пройдут хлопки
  if (cardType === "khlopkopit" || cardType === "khlopokopyt") {
    return { 
      nextIndex: actingPlayerOrder, 
      nextDirection: direction, 
      isStall: true 
    };
  }

  // 2. ПЕРЕХРЮК: меняем направление
  if (cardType === "perekhryuk") {
    direction = currentDirection * -1;
  }

  let nextIndex;

  // 3. ЛОГИКА ДЛЯ 2 ИГРОКОВ (Дуэль)
  if (playerCount === 2) {
    // В дуэли:
    // Захрапин — ход остается у того же игрока (прыжок через 1)
    // Хапеж, Перехрюк и обычные карты — ход ВСЕГДА переходит оппоненту
    const isJump = cardType === "zakhrapin";
    nextIndex = isJump ? actingPlayerOrder : (actingPlayerOrder === 0 ? 1 : 0);
  } 
  // 4. ЛОГИКА ДЛЯ 3+ ИГРОКОВ
  else {
    // Хапеж и Захрапин перепрыгивают через одного (step = 2)
    const step = (cardType === "zakhrapin" || cardType === "khapezh") ? 2 : 1;
    
    nextIndex = (actingPlayerOrder + (direction * step)) % playerCount;
    
    // Исправление для отрицательных чисел в JavaScript
    if (nextIndex < 0) {
      nextIndex += playerCount;
    }
  }

  return { 
    nextIndex, 
    nextDirection: direction, 
    isStall: false 
  };
};

/**
 * Генератор уникальных ID.
 */
export const generateInstanceId = (prefix = "id") => {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 9)}`;
};

/**
 * Логика перемешивания колоды из сброса.
 */
export const reshuffleDeck = (discardPile) => {
  if (!discardPile || discardPile.length <= 1) return null;
  
  const topCard = discardPile.pop();
  const newDeck = [...discardPile].sort(() => Math.random() - 0.5);
  
  return {
    newDeck,
    newDiscardPile: [topCard],
  };
};