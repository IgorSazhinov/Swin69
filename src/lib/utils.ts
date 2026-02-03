/** Склонение слова "карта" */
export const formatCardsLabel = (count: number): string => {
    const n = Math.abs(count) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return 'карт';
    if (n1 > 1 && n1 < 5) return 'карты';
    if (n1 === 1) return 'карту'; // Для хапежа (возьми 1 карту)
    return 'карт';
  };
  
  /** Версия для списка оппонентов (7 карт, а не карту) */
  export const formatCardsCount = (count: number): string => {
    const n = Math.abs(count) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return 'карт';
    if (n1 > 1 && n1 < 5) return 'карты';
    return 'карт';
  };