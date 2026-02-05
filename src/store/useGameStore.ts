import { create } from "zustand";

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
  chloppedPlayerIds: string[];
  setHand: (cards: Card[]) => void;
  updateTable: (data: any, myId: string) => void;
  playCardOptimistic: (cardId: string) => void;
  setChlopped: (playerId: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
  hand: [],
  topCard: null,
  isMyTurn: false,
  players: [],
  status: "LOBBY",
  pendingPenalty: 0,
  direction: 1,
  winnerId: null,
  chloppedPlayerIds: [],

  setHand: (cards) => set({ hand: [...cards] }),

  playCardOptimistic: (cardId) =>
    set((state) => ({
      hand: state.hand.filter((c) => c.id !== cardId),
      isMyTurn: false,
    })),

  setChlopped: (playerId) =>
    set((state) => ({
      chloppedPlayerIds: [...state.chloppedPlayerIds, playerId],
    })),

  updateTable: (data, myId) => {
    console.log("[STORE] updateTable:", {
      status: data.status,
      nextPlayerId: data.nextPlayerId,
      myId: myId,
    });

    set({
      topCard: data.card,
      players: data.allPlayers || [],
      status: data.status || "PLAYING", // ← Вот здесь обновляем статус!
      winnerId: data.winnerId,
      direction: data.direction || 1,
      pendingPenalty: data.pendingPenalty || 0,
      chloppedPlayerIds: data.chloppedPlayerIds || [],
    });

    // Проверяем, является ли текущий игрок следующим
    const isMyTurn = String(myId) === String(data.nextPlayerId);
    console.log(
      "[STORE] isMyTurn:",
      isMyTurn,
      "myId:",
      myId,
      "nextPlayerId:",
      data.nextPlayerId,
    );
    set({ isMyTurn });
  },
}));
