import { Card, CardColor, CardType } from "@/types/game";

export const generateDeck = (): Card[] => {
  const deck: Card[] = [];
  const colors: CardColor[] = ['red', 'green', 'blue', 'yellow'];

  colors.forEach((color) => {
    // Цифровые карты: 0 (1 шт), 1-7 (по 2 шт)
    for (let i = 0; i <= 7; i++) {
      const count = i === 0 ? 1 : 2;
      for (let j = 0; j < count; j++) {
        deck.push({ 
          id: `${color}-num-${i}-${j}`, 
          color, 
          value: i, 
          type: 'number' 
        });
      }
    }

    // Спецкарты (по 2 каждого типа на цвет)
    const specialTypes: CardType[] = ['khlopkoput', 'tikhohryun', 'perekhryuk', 'zakhryapin', 'khapezh'];
    specialTypes.forEach((type) => {
      for (let j = 0; j < 2; j++) {
        deck.push({ 
          id: `${color}-spec-${type}-${j}`, 
          color, 
          type 
        });
      }
    });
  });

  // Полисвин (8 штук)
  for (let i = 0; i < 8; i++) {
    deck.push({ 
      id: `multi-poly-${i}`, 
      color: 'multi', 
      type: 'polyhryun' 
    });
  }

  // Фишер-Йейтс
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};