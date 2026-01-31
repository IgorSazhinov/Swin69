import { create } from 'zustand';
import { Card } from '@/types/game';

interface PlayerInfo {
  id: string;
  name: string;
  cardCount: number;
  isTurn: boolean;
}

interface GameState {
  hand: Card[];
  topCard: Card | null;
  isMyTurn: boolean;
  players: PlayerInfo[];
  status: string;
  winnerId: string | null;
  setHand: (cards: Card[]) => void;
  playCardOptimistic: (cardId: string) => void;
  updateTable: (data: any, myId: string) => void;
  addCardToHand: (card: Card) => void;
}

export const useGameStore = create<GameState>((set) => ({
  hand: [],
  topCard: null,
  isMyTurn: false,
  players: [],
  status: 'LOBBY',
  winnerId: null,

  setHand: (cards) => set({ hand: [...cards] }),
  
  playCardOptimistic: (cardId) => set((state) => ({
    hand: state.hand.filter(c => c.id !== cardId),
    isMyTurn: false 
  })),

  updateTable: (data, myId) => {
    set({ 
      topCard: data.card && (data.card.id || data.card.type) ? { ...data.card } : null, 
      isMyTurn: String(data.nextPlayerId) === String(myId) && data.status === 'PLAYING', 
      players: data.allPlayers || [],
      status: data.status,
      winnerId: data.winnerId || null
    });
  },

  addCardToHand: (card) => set((state) => ({ 
    hand: [...state.hand, card] 
  })),
}));