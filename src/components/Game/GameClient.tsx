"use client";

import { useEffect, useState, use, useCallback, useMemo } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useGameSocket } from "@/hooks/useGameSocket";
import { canPlayCard } from "@/lib/game-logic";
import { GameHeader } from "./GameHeader";
import { Opponents } from "./Opponents";
import { TableCenter } from "./TableCenter";
import { GameActions } from "./GameActions";
import { Card } from "@/components/Card";
import { AnimatePresence } from "framer-motion";

export default function GameClient({ params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = use(params);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState(""); 
  const [previewCard, setPreviewCard] = useState<any>(null);
  const [isChoosingColor, setIsChoosingColor] = useState(false);
  const [polyToPlay, setPolyToPlay] = useState<any>(null);

  const { 
    hand, 
    topCard, 
    isMyTurn, 
    players, 
    setHand, 
    playCardOptimistic, 
    status, 
    winnerId, 
    updateTable,
    direction 
  } = useGameStore();
  
  const onPreview = useCallback((card: any) => setPreviewCard(card), []);

  const { sendCard, drawCard, confirmDraw } = useGameSocket(
    gameId, 
    playerId || "", 
    updateTable, 
    onPreview
  );

  // Инициализация ID игрока
  useEffect(() => {
    const savedId = localStorage.getItem("svintus_playerId");
    if (savedId) setPlayerId(savedId);
  }, []);

  // Загрузка начальных данных игрока
  useEffect(() => {
    if (!playerId) return;
    fetch(`/api/player/${playerId}`)
      .then(res => res.json())
      .then(data => {
        if (data.hand) setHand(data.hand);
        if (data.name) setPlayerName(data.name);
      });
  }, [playerId, setHand]);

  const handlePlayCard = (card: any) => {
    if (!isMyTurn || status !== 'PLAYING' || !canPlayCard(card, topCard)) return;
    
    if (card.type === 'polyhryun') { 
      setPolyToPlay(card); 
      setIsChoosingColor(true); 
    } else { 
      playCardOptimistic(card.id); 
      sendCard(card); 
    }
  };

  const handleAction = (action: 'play' | 'keep' | 'select-color', color?: string) => {
    if (action === 'select-color' && color) {
      if (polyToPlay) { 
        playCardOptimistic(polyToPlay.id); 
        sendCard(polyToPlay, color); 
        setPolyToPlay(null); 
        setIsChoosingColor(false); 
      } else if (previewCard) { 
        confirmDraw('play', color); 
        setPreviewCard(null); 
        setIsChoosingColor(false); 
      }
    } else if (action === 'play') {
      if (previewCard?.type === 'polyhryun') {
        setIsChoosingColor(true);
      } else { 
        confirmDraw('play'); 
        setPreviewCard(null); 
      }
    } else if (action === 'keep') { 
      confirmDraw('keep'); 
      setPreviewCard(null); 
      setIsChoosingColor(false); 
    }
  };

  // Механика: передаем ВСЕХ игроков (включая себя) для корректного отображения очереди
  const allPlayersWithMe = useMemo(() => {
    return players; 
  }, [players]);

  if (!playerId) return null;

  return (
    <div className="fixed inset-0 w-full h-full bg-[#064e3b] overflow-hidden flex flex-col justify-between select-none font-sans text-white">
      {/* ШАПКА */}
      <GameHeader 
        name={playerName} 
        gameId={gameId} 
        cardCount={hand.length} 
        isMyTurn={isMyTurn} 
        status={status}
        direction={direction}
      />

      {/* ОСНОВНАЯ ИГРОВАЯ ЗОНА — Строгое деление на 3 части без схлопывания */}
      <main className="flex-1 grid grid-cols-3 w-full h-full px-10 items-stretch overflow-visible">
        
        {/* ПЕРВАЯ ЧАСТЬ (ЛЕВО) — Растягиваем на всю ширину колонки */}
        <div className="w-full flex items-center justify-center overflow-visible border-r border-white/5">
          <div className="w-full h-full py-10">
            <Opponents players={allPlayersWithMe} currentPlayerId={playerId} />
          </div>
        </div>

        {/* ВТОРАЯ ЧАСТЬ (ЦЕНТР) — Игровой стол */}
        <div className="w-full flex items-center justify-center overflow-visible">
          <TableCenter 
            topCard={topCard} 
            isMyTurn={isMyTurn} 
            canDraw={isMyTurn && !previewCard && !isChoosingColor && status === 'PLAYING'} 
            onDraw={drawCard} 
          />
        </div>

        {/* ТРЕТЬЯ ЧАСТЬ (ПРАВО) — Панель действий */}
        <div className="w-full flex items-center justify-center overflow-visible border-l border-white/5">
          <div className="w-full">
            <GameActions 
              status={status} 
              isChoosingColor={isChoosingColor} 
              previewCard={previewCard} 
              winnerName={players.find(p => p.id === winnerId)?.name} 
              onAction={handleAction} 
            />
          </div>
        </div>

      </main>

      {/* РУКА ИГРОКА (ВНИЗУ) */}
      <footer className="w-full flex justify-center pb-12 px-10 items-end min-h-[300px] bg-gradient-to-t from-black/80 to-transparent overflow-visible">
        <div className="flex items-end justify-center overflow-visible max-w-[90vw]">
          <AnimatePresence initial={false} mode="popLayout">
            {hand.map((card, index) => (
              <Card 
                key={card.instanceId || card.id} 
                card={card} 
                isInsideHand 
                index={index} 
                totalCards={hand.length} 
                onClick={() => handlePlayCard(card)} 
                disabled={!isMyTurn || !!previewCard || isChoosingColor || status !== 'PLAYING'} 
              />
            ))}
          </AnimatePresence>
        </div>
      </footer>
    </div>
  );
}