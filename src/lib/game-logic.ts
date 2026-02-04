import { Card } from "@/types/game";

/**
 * Валидация возможности обычного хода.
 */
export const canPlayCard = (
  cardToPlay: Card,
  topCard: Card | null
): boolean => {
  if (!topCard) return true;

  if (cardToPlay.type === "polyhryun") return true;

  if (cardToPlay.color === topCard.color) return true;

  if (cardToPlay.type === "number" && topCard.type === "number") {
    return String(cardToPlay.value) === String(topCard.value);
  }

  if (cardToPlay.type !== "number" && cardToPlay.type === topCard.type) {
    return true;
  }

  return false;
};

/**
 * Проверка на ПЕРЕХВАТ (Intercept).
 */
export const canIntercept = (
  cardToPlay: Card,
  topCard: Card | null
): boolean => {
  if (!topCard) return false;

  if (cardToPlay.type === "khapezh" && topCard.type === "khapezh") {
    return true;
  }

  if (cardToPlay.type === "polyhryun" && topCard.type === "polyhryun") {
    return true;
  }

  if (cardToPlay.type === "polyhryun" || topCard.type === "polyhryun") {
    return false;
  }

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
  actingPlayerOrder: number,
  currentDirection: number,
  playerCount: number,
  cardType: string
) => {
  let direction = currentDirection;

  // ХЛОПКОПЫТ: замираем на текущем игроке
  if (cardType === "khlopkopit") {
    return { nextIndex: actingPlayerOrder, nextDirection: direction, isStall: true };
  }

  // Меняем направление, если это Перехрюк
  if (cardType === "perekhryuk") {
    direction *= -1;
  }

  // ОСНОВНОЕ ИЗМЕНЕНИЕ: Хапеж НЕ должен пропускать игрока!
  // Только захрапин пропускает игрока
  const step = cardType === "zakhrapin" ? 2 : 1;

  let nextIndex;

  if (playerCount === 2) {
    // В дуэли:
    // - Обычные карты, хапеж, перехрюк: ход другому игроку
    // - Захрапин: ход остается у текущего (пропускает противника)
    nextIndex =
      cardType === "zakhrapin" ? actingPlayerOrder : (actingPlayerOrder === 0 ? 1 : 0);
  } else {
    // Для 3+ игроков:
    // - Хапеж: следующий игрок (step = 1), но добавляет штраф
    // - Захрапин: пропускает одного игрока (step = 2)
    // - Остальные: следующий игрок (step = 1)
    const step = cardType === "zakhrapin" ? 2 : 1;
    nextIndex = (actingPlayerOrder + direction * step) % playerCount;

    // Исправляем отрицательный результат для JS
    if (nextIndex < 0) {
      nextIndex += playerCount;
    }
  }

  return { 
    nextIndex, 
    nextDirection: direction,
    isStall: false // Хапеж не вызывает хлопкопыт
  };
};

/**
 * Генератор уникальных ID.
 */
export const generateInstanceId = (prefix = "id"): string => {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 9)}`;
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
    newDiscardPile: [topCard as Card],
  };
};
