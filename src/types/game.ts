export type CardColor = 'red' | 'green' | 'blue' | 'yellow' | 'multi';

export type CardType = 
  | 'number' 
  | 'khlopokopyt' 
  | 'tikhohryun' 
  | 'perekhryuk' 
  | 'zakhrapin' 
  | 'khapezh' 
  | 'polyhryun';

export interface Card {
  id: string;
  color: CardColor;
  type: CardType;
  value?: number;     // Только для типа 'number' (0-7)
  instanceId?: string; // Уникальный ID для анимаций во фронтенде
}

export interface PlayerInfo {
  id: string;
  name: string;
  cardCount: number;
  isTurn: boolean;
}

export interface GameState {
  id: string;
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  currentCard: Card | null;
  deckCount: number;
  direction: number;
  turnIndex: number;
  winnerId: string | null;
}

export interface ServerToClientEvents {
  card_played: (data: { 
    card: Card; 
    nextPlayerId: string; 
    allPlayers: PlayerInfo[]; 
    status: string; 
    winnerId: string | null;
    direction: number;
    isIntercept?: boolean;
  }) => void;
  
  card_drawn: (data: { newCard: Card }) => void;
  
  drawn_card_preview: (data: { card: Card }) => void;
  
  start_khlopokopyt: (data: { message: string }) => void;
  
  game_error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  join_game: (data: { gameId: string; playerId: string }) => void;
  
  play_card: (data: { 
    gameId: string; 
    playerId: string; 
    card: Card; 
    chosenColor?: CardColor; 
  }) => void;
  
  draw_card: (data: { gameId: string; playerId: string }) => void;
  
  confirm_draw: (data: { 
    gameId: string; 
    playerId: string; 
    action: 'play' | 'keep'; 
    chosenColor?: CardColor; 
  }) => void;
  
  tap_khlopokopyt: (data: { gameId: string; playerId: string }) => void;
}