import { create } from 'zustand';

interface Card {
  id: string;
  type: string;
  color: string;
  value?: string | number;
  instanceId?: string;
}

interface PlayerInfo {
  id: string;
  name: string;
  cardCount: number;
  isTurn: boolean;
  order: number;
}

interface GameState {
  hand: Card[];
  topCard: Card | null;
  isMyTurn: boolean;
  players: PlayerInfo[];
  status: string;
  pendingPenalty: number;
  direction: number;
  winnerId: string | null;
  setHand: (cards: Card[]) => void;
  updateTable: (data: any, myId: string) => void;
  playCardOptimistic: (cardId: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
  hand: [],
  topCard: null,
  isMyTurn: false,
  players: [],
  status: 'LOBBY',
  pendingPenalty: 0,
  direction: 1,
  winnerId: null,

  setHand: (cards) => set({ hand: [...cards] }),
  
  playCardOptimistic: (cardId) => set((state) => ({
    hand: state.hand.filter(c => c.id !== cardId),
    isMyTurn: false 
  })),

  updateTable: (data, myId) => {
    set({
      topCard: data.card && (data.card.id || data.card.type) ? data.card : null,
      isMyTurn: String(data.nextPlayerId) === String(myId),
      players: data.allPlayers || [],
      status: data.status,
      pendingPenalty: Number(data.pendingPenalty) || 0,
      direction: data.direction || 1,
      winnerId: data.winnerId || null
    });
  },
}));