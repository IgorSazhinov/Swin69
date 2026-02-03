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
  const { setHand, setChlopped } = useGameStore(); // Добавили setChlopped

  useEffect(() => {
    if (!gameId || !playerId) return;
    
    socketRef.current = io();
    const socket = socketRef.current;

    socket.emit("join_game", { gameId, playerId });

    socket.on("card_played", (data: any) => {
      updateTable(data, playerId);
    });

    socket.on("hand_updated", ({ hand }: any) => {
      console.log("[SOCKET] Hand updated from server");
      setHand(hand);
    });

    socket.on("drawn_card_preview", ({ card }: any) => {
      onPreview(card);
    });

    // Добавили слушатель для галочек Хлопкопыта
    socket.on("player_chlopped", ({ playerId: chloppedId }: any) => {
      setChlopped(chloppedId);
    });

    socket.on("start_khlopkopit", (data: any) => {
      console.log("ХЛОПКОПЫТ МОМЕНТ!");
    });

    return () => { 
      socket.disconnect(); 
    };
  }, [gameId, playerId, updateTable, setHand, setChlopped, onPreview]);

  const sendCard = (card: any, chosenColor?: string) => {
    socketRef.current?.emit("play_card", { gameId, card, playerId, chosenColor });
  };

  const drawCard = () => {
    socketRef.current?.emit("draw_card", { gameId, playerId });
  };

  const takePenalty = () => {
    socketRef.current?.emit("take_penalty", { gameId, playerId });
  };

  const confirmDraw = (action: 'play' | 'keep', chosenColor?: string) => {
    socketRef.current?.emit("confirm_draw", { gameId, playerId, action, chosenColor });
  };

  // ЭТОЙ ФУНКЦИИ НЕ ХВАТАЛО
  const sendChlop = () => {
    console.log("[SOCKET] Sending chlop...");
    socketRef.current?.emit("chlop", { gameId, playerId });
  };

  // ДОБАВИЛИ sendChlop В RETURN
  return { sendCard, drawCard, takePenalty, confirmDraw, sendChlop };
};