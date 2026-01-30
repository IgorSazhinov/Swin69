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
  updateTable: (data: any) => void;
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

  updateTable: ({ card, nextPlayerId, allPlayers, status, winnerId }) => {
    const myId = typeof window !== 'undefined' ? localStorage.getItem("svintus_playerId") : "";
    set({ 
      topCard: card && card.type ? { ...card } : null, 
      isMyTurn: nextPlayerId === myId && status === 'PLAYING', 
      players: [...allPlayers],
      status: status,
      winnerId: winnerId || null
    });
  },

  addCardToHand: (card) => set((state) => ({ 
    hand: [...state.hand, card] 
  })),
}));