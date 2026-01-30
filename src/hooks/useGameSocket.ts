import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useGameStore } from '@/store/useGameStore';

export const useGameSocket = (gameId: string, playerId: string, onPreview: (card: any) => void) => {
  const socketRef = useRef<Socket | null>(null);
  const { updateTable, addCardToHand } = useGameStore();

  useEffect(() => {
    if (!gameId || !playerId) return;
    
    socketRef.current = io();
    const socket = socketRef.current;

    socket.emit("join_game", { gameId, playerId });

    socket.on("card_played", (data: any) => {
      updateTable(data);
    });

    socket.on("card_drawn", ({ newCard }: any) => {
      addCardToHand(newCard);
    });

    socket.on("drawn_card_preview", ({ card }: any) => {
      onPreview(card);
    });

    return () => { socket.disconnect(); };
  }, [gameId, playerId, updateTable, addCardToHand, onPreview]);

  const sendCard = (card: any, chosenColor?: string) => {
    socketRef.current?.emit("play_card", { gameId, card, playerId, chosenColor });
  };

  const drawCard = () => {
    socketRef.current?.emit("draw_card", { gameId, playerId });
  };

  const confirmDraw = (action: 'play' | 'keep', chosenColor?: string) => {
    socketRef.current?.emit("confirm_draw", { gameId, playerId, action, chosenColor });
  };

  return { sendCard, drawCard, confirmDraw };
};