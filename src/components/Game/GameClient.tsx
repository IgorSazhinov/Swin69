"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useGameSocket } from "@/hooks/useGameSocket";
import { canPlayCard } from "@/lib/game-logic";
import { GameHeader } from "./GameHeader";
import { Opponents } from "./Opponents";
import { TableCenter } from "./TableCenter";
import { GameActions } from "./GameActions";
import { ChatLogModal } from "@/components/ChatLog/ChatLogModal";
import { Card } from "@/components/Card";
import { AnimatePresence, motion } from "framer-motion";

export default function GameClient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: gameId } = use(params);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [previewCard, setPreviewCard] = useState<any>(null);
  const [isChoosingColor, setIsChoosingColor] = useState(false);
  const [polyToPlay, setPolyToPlay] = useState<any>(null);
  const [showChatLog, setShowChatLog] = useState(false);

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
    direction,
    pendingPenalty,
    setChlopped,
  } = useGameStore();

  const onPreview = useCallback((card: any) => setPreviewCard(card), []);

  const { sendCard, drawCard, confirmDraw, takePenalty, sendChlop } =
    useGameSocket(gameId, playerId || "", updateTable, onPreview);

  useEffect(() => {
    const savedId = localStorage.getItem("svintus_playerId");
    const savedName = localStorage.getItem("svintus_playerName");

    if (savedId) setPlayerId(savedId);
    if (savedName) setPlayerName(savedName);
  }, []);

  useEffect(() => {
    if (!playerId) return;

    fetch(`/api/player/${playerId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.hand) setHand(data.hand);
        if (data.name) setPlayerName(data.name);
      })
      .catch(console.error);
  }, [playerId, setHand]);

  const handlePlayCard = (card: any) => {
    if (pendingPenalty > 0 && card.type !== "khapezh") return;
    if (!isMyTurn || status !== "PLAYING" || !canPlayCard(card, topCard))
      return;

    if (card.type === "polyhryun") {
      setPolyToPlay(card);
      setIsChoosingColor(true);
    } else {
      playCardOptimistic(card.id);
      sendCard(card);
    }
  };

  const handleAction = (
    action: "play" | "keep" | "select-color" | "take-penalty" | "chlop",
    color?: string
  ) => {
    if (action === "take-penalty") {
      takePenalty();
      return;
    }

    if (action === "chlop") {
      if (playerId) setChlopped(playerId);
      sendChlop();
      return;
    }

    if (action === "select-color" && color) {
      if (polyToPlay) {
        playCardOptimistic(polyToPlay.id);
        sendCard(polyToPlay, color);
        setPolyToPlay(null);
        setIsChoosingColor(false);
      } else if (previewCard) {
        confirmDraw("play", color);
        setPreviewCard(null);
        setIsChoosingColor(false);
      }
    } else if (action === "play") {
      if (previewCard?.type === "polyhryun") {
        setIsChoosingColor(true);
      } else {
        confirmDraw("play");
        setPreviewCard(null);
      }
    } else if (action === "keep") {
      confirmDraw("keep");
      setPreviewCard(null);
      setIsChoosingColor(false);
    }
  };

  if (!playerId) {
    return (
      <div className="fixed inset-0 bg-[#064e3b] flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Загрузка...</div>
      </div>
    );
  }

  return (
    <>
      {/* ОСНОВНОЙ ИНТЕРФЕЙС ИГРЫ */}
      <div className="fixed inset-0 w-full h-full bg-[#064e3b] overflow-hidden flex flex-col justify-between select-none font-sans text-white">
        <GameHeader
          name={playerName}
          gameId={gameId}
          cardCount={hand.length}
          isMyTurn={isMyTurn}
          status={status}
          direction={direction}
        />

        <main className="flex-1 grid grid-cols-3 w-full h-full px-10 items-stretch overflow-visible">
          {/* Левая колонка: противники */}
          <div className="w-full flex items-center justify-center overflow-visible border-r border-white/5">
            <div className="w-full h-full">
              <Opponents
                players={players}
                currentPlayerId={playerId}
                direction={direction}
                pendingPenalty={pendingPenalty}
              />
            </div>
          </div>

          {/* Центральная колонка: стол */}
          <div className="w-full flex items-center justify-center overflow-visible">
            <TableCenter
              topCard={topCard}
              isMyTurn={isMyTurn}
              canDraw={
                isMyTurn &&
                status === "PLAYING" &&
                pendingPenalty === 0 &&
                !previewCard &&
                !isChoosingColor
              }
              onDraw={drawCard}
            />
          </div>

          {/* Правая колонка: действия */}
          <div className="w-full flex items-center justify-center overflow-visible border-l border-white/5">
            <div className="w-full">
              <GameActions
                status={status}
                isChoosingColor={isChoosingColor}
                previewCard={previewCard}
                winnerName={players.find((p) => p.id === winnerId)?.name}
                onAction={handleAction}
              />
            </div>
          </div>
        </main>

        {/* Низ: рука игрока */}
        <footer className="w-full flex justify-center pb-12 px-10 items-end min-h-[300px] bg-gradient-to-t from-black/80 to-transparent overflow-visible">
          {/* Карты в руке */}
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
                  disabled={
                    !isMyTurn ||
                    !!previewCard ||
                    isChoosingColor ||
                    status !== "PLAYING"
                  }
                />
              ))}
            </AnimatePresence>
          </div>
        </footer>
      </div>

      {/* КНОПКА ЧАТА/ЛОГА В ПРАВОМ НИЖНЕМ УГЛУ */}
      <motion.button
        onClick={() => setShowChatLog(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: "fixed",
          bottom: "32px",
          right: "32px",
          zIndex: 9999,
        }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-600 to-orange-800 border-4 border-white/20 shadow-2xl flex flex-col items-center justify-center gap-1 hover:from-orange-500 hover:to-orange-700 hover:border-orange-300/50 hover:shadow-[0_0_40px_rgba(234,88,12,0.5)] transition-all group fixed-bottom-right"
      >
        {/* Иконка чата */}
        <div className="text-2xl group-hover:scale-110 transition-transform">
          💬
        </div>

        {/* Иконка лога */}
        <div className="text-xl opacity-90 group-hover:opacity-100 transition-opacity">
          📋
        </div>

        {/* Всплывающая подсказка */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Чат и история игры
        </div>
      </motion.button>

      {/* Индикатор новых сообщений (опционально) */}
      {/* <div className="fixed bottom-24 right-24 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold animate-pulse z-50">
        3
      </div> */}

      {/* МОДАЛЬНОЕ ОКНО ЧАТА/ЛОГА */}
      <ChatLogModal
        isOpen={showChatLog}
        onClose={() => setShowChatLog(false)}
        gameId={gameId}
        playerId={playerId}
        playerName={playerName}
      />
    </>
  );
}
