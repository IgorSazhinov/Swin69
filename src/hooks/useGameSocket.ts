import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useGameStore } from '@/store/useGameStore';

export const useGameSocket = (
  gameId: string, 
  playerId: string, 
  updateTable: (data: any, myId: string) => void,
  onPreview: (card: any) => void
) => {
  const socketRef = useRef<Socket | null>(null);
  const { setHand } = useGameStore();

  useEffect(() => {
    if (!gameId || !playerId) return;
    
    // Подключаемся к сокету
    socketRef.current = io();
    const socket = socketRef.current;

    socket.emit("join_game", { gameId, playerId });

    // Слушатель обновления стола
    socket.on("card_played", (data: any) => {
      updateTable(data, playerId);
    });

    // ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ РУКИ (Критично для Хапежа)
    socket.on("hand_updated", ({ hand }: any) => {
      console.log("[SOCKET] Hand updated from server");
      setHand(hand);
    });

    socket.on("card_drawn", ({ newCard }: any) => {
      // Можно использовать для анимации, но hand_updated синхронизирует всё
    });

    socket.on("drawn_card_preview", ({ card }: any) => {
      onPreview(card);
    });

    socket.on("start_khlopokopyt", (data: any) => {
      console.log("ХЛОПКОПЫТ МОМЕНТ!");
    });

    return () => { 
      socket.disconnect(); 
    };
  }, [gameId, playerId, updateTable, setHand, onPreview]);

  const sendCard = (card: any, chosenColor?: string) => {
    socketRef.current?.emit("play_card", { gameId, card, playerId, chosenColor });
  };

  const drawCard = () => {
    socketRef.current?.emit("draw_card", { gameId, playerId });
  };

  // Метод для взятия штрафных карт Хапежа
  const takePenalty = () => {
    socketRef.current?.emit("take_penalty", { gameId, playerId });
  };

  const confirmDraw = (action: 'play' | 'keep', chosenColor?: string) => {
    socketRef.current?.emit("confirm_draw", { gameId, playerId, action, chosenColor });
  };

  return { sendCard, drawCard, takePenalty, confirmDraw };
};