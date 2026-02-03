import { Card, CardColor, CardType } from "@/types/game";

/**
 * Генерация полной колоды для игры "Свинтус".
 * Правила:
 * - Цифровые карты: 0-7 (по 2 карты каждого номинала на каждый цвет).
 * - Спецкарты: Захрапин, Перехрюк, Хапеж, Тихохрюн, Хлопкопыт (по 2 на цвет).
 * - Полисвин: 8 карт (цвет multi).
 */
export const generateDeck = (): Card[] => {
  const deck: Card[] = [];
  const colors: CardColor[] = ['red', 'green', 'blue', 'yellow'];

  colors.forEach((color) => {
    // 1. ЦИФРОВЫЕ КАРТЫ
    // 0-7 — по две карты каждого номинала на каждый цвет
    for (let i = 0; i <= 7; i++) {
      for (let j = 1; j <= 2; j++) {
        deck.push({ 
          id: `${color}-num-${i}-${j}`, 
          color, 
          value: i, 
          type: 'number' 
        });
      }
    }

    // 2. ЦВЕТНЫЕ СПЕЦКАРТЫ (по 2 штуки каждого типа на каждый цвет)
    const specialTypes: CardType[] = [
      'khlopkopit', 
      'tikhohryun', 
      'perekhryuk', 
      'zakhrapin', 
      'khapezh'
    ];

    specialTypes.forEach((type) => {
      for (let j = 1; j <= 2; j++) {
        deck.push({ 
          id: `${color}-spec-${type}-${j}`, 
          color, 
          type 
        });
      }
    });
  });

  // 3. ПОЛИСВИНЫ (8 штук, цвет multi)
  for (let i = 1; i <= 8; i++) {
    deck.push({ 
      id: `multi-polyhryun-${i}`, 
      color: 'multi', 
      type: 'polyhryun' 
    });
  }

  // 4. ТАСОВАНИЕ (Алгоритм Фишера — Йейтса)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};