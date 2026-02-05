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
/**
 * Вычисление следующего хода.
 */
export const calculateNextTurn = (
    actingPlayerOrder,
    currentDirection,
    playerCount,
    cardType
) => {
    let direction = currentDirection;
    
    // 1. Хлопкопыт: пропуск хода
    if (cardType === "khlopkopit") {
        console.log("[CALCULATE_NEXT_TURN] Хлопкопыт detected, isStall = true");
        return {
            nextIndex: actingPlayerOrder,  // Ход остается у того же игрока
            nextDirection: direction,
            isStall: true
        };
    }
    
    // 2. Перехрюк: меняем направление
    if (cardType === "perekhryuk") {
        direction = currentDirection * -1;
    }
    
    let nextIndex;
    
    // 3. Для 2 игроков
    if (playerCount === 2) {
        const isZakhrapin = cardType === "zakhrapin";
        nextIndex = isZakhrapin ? actingPlayerOrder : (actingPlayerOrder === 0 ? 1 : 0);
    }
    // 4. Для 3+ игроков
    else {
        const step = cardType === "zakhrapin" ? 2 : 1;
        nextIndex = (actingPlayerOrder + (direction * step)) % playerCount;
        
        // Обработка отрицательных индексов
        if (nextIndex < 0) {
            nextIndex += playerCount;
        }
    }
    
    console.log("[CALCULATE_NEXT_TURN] Результат:", {
        actingPlayerOrder,
        direction,
        playerCount,
        cardType,
        nextIndex,
        isStall: cardType === "khlopkopit"
    });
    
    return {
        nextIndex,
        nextDirection: direction,
        isStall: false
    };
}

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