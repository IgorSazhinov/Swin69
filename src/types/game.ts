export type CardColor = 'red' | 'green' | 'blue' | 'yellow' | 'multi';
export type CardType = 'number' | 'khlopokopyt' | 'tikhohryun' | 'perekhrkyu' | 'zahalomon' | 'polyhryun';

export interface Card {
  id: string;
  color: CardColor;
  value?: number; // Для обычных карт 0-7
  type: CardType;
}