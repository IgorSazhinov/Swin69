/** Валидация возможности обычного хода */
export const canPlayCard = (cardToPlay, topCard) => {
  if (!topCard || !topCard.type) return true;
  if (cardToPlay.type === "polyhryun") return true;
  if (cardToPlay.color === topCard.color) return true;
  if (cardToPlay.type === "number" && topCard.type === "number") {
    return String(cardToPlay.value) === String(topCard.value);
  }
  return cardToPlay.type !== "number" && cardToPlay.type === topCard.type;
};

/** Проверка на ПЕРЕХВАТ (полное совпадение) */
export const canIntercept = (cardToPlay, topCard) => {
  if (!topCard || !topCard.type) return false;
  // Полисвин не перехватывается, так как в руке он "бесцветный"
  if (cardToPlay.type === "polyhryun") return false;

  const colorMatch = cardToPlay.color === topCard.color;
  const typeMatch = cardToPlay.type === topCard.type;

  if (cardToPlay.type === "number") {
    const valueMatch = String(cardToPlay.value) === String(topCard.value);
    return colorMatch && valueMatch;
  }
  return colorMatch && typeMatch;
};

/** Расчет следующего игрока и направления */
export const calculateNextTurn = (
  actingPlayerOrder,
  currentDirection,
  playerCount,
  cardType
) => {
  let nextDirection = currentDirection;

  // Перехрюк меняет направление (если игроков больше 2)
  if (cardType === "perekhryuk") {
    nextDirection = currentDirection * -1;
  }

  // КРИТИЧЕСКИЙ ФИКС:
  // Для Хапежа шаг ВСЕГДА 1, чтобы ход перешел К ЖЕРТВЕ.
  // Захрапин по-прежнему перепрыгивает (step = 2).
  // В дуэли (2 игрока) Перехрюк тоже работает как прыжок (step = 2).
  const isJump = cardType === "zakhrapin";

  const step = isJump ? 2 : 1;

  let nextIndex = (actingPlayerOrder + nextDirection * step) % playerCount;

  // Исправление для отрицательных чисел в JS
  if (nextIndex < 0) {
    nextIndex += playerCount;
  }
  
  return { nextIndex, nextDirection };
};

/** Генератор уникальных ключей для React */
export const generateInstanceId = (prefix = "id") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

/** Логика перемешивания колоды из сброса */
export const reshuffleDeck = (discardPile) => {
  if (discardPile.length <= 1) return null;
  const topCard = discardPile.pop();
  const newDeck = [...discardPile].sort(() => Math.random() - 0.5);
  return { newDeck, newDiscardPile: [topCard] };
};
