"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useGameSocket } from "@/hooks/useGameSocket";
import { Card } from "@/components/Card";
import { AnimatePresence, motion } from "framer-motion";
import { canPlayCard } from "@/lib/game-logic";

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
  const [copied, setCopied] = useState(false);

  const {
    hand = [],
    topCard,
    isMyTurn,
    players = [],
    setHand,
    playCardOptimistic,
    status,
    winnerId,
    updateTable,
  } = useGameStore();

  const onPreview = useCallback((card: any) => {
    setPreviewCard(card);
    setIsChoosingColor(false);
  }, []);

  // Передаем функцию обновления прямо в хук сокетов
  const { sendCard, drawCard, confirmDraw } = useGameSocket(
    gameId,
    playerId || "",
    (data) => {
      updateTable(data, playerId || "");
    },
    onPreview,
  );

  useEffect(() => {
    const savedId = localStorage.getItem("svintus_playerId");
    if (savedId) setPlayerId(savedId);
  }, []);

  useEffect(() => {
    if (!playerId) return;
    fetch(`/api/player/${playerId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.hand) setHand(data.hand);
        if (data.name) setPlayerName(data.name);
      });
  }, [playerId, setHand]);

  const handlePlayCard = (card: any) => {
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
    action: "play" | "keep" | "select-color",
    color?: string,
  ) => {
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
      if (previewCard?.type === "polyhryun") setIsChoosingColor(true);
      else {
        confirmDraw("play");
        setPreviewCard(null);
      }
    } else if (action === "keep") {
      confirmDraw("keep");
      setPreviewCard(null);
      setIsChoosingColor(false);
    }
  };

  if (!playerId) return null;

  const opponents = players.filter((p) => String(p.id) !== String(playerId));

  return (
    <div className="fixed inset-0 w-full h-full bg-[#064e3b] overflow-hidden flex flex-col justify-between select-none font-sans text-white">
      {/* HEADER */}
      <header className="relative z-50 m-6 h-[100px] flex items-center bg-black/50 backdrop-blur-3xl rounded-[50px] border-2 border-white/20 px-10 shadow-2xl">
        <div className="flex items-center gap-6 min-w-[300px]">
          <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center border-2 border-white/30 rotate-3 shadow-xl text-4xl italic">
            🐽
          </div>
          <div className="flex flex-col text-left">
            <span className="text-white font-black text-3xl uppercase tracking-tighter truncate max-w-[200px]">
              {playerName}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(gameId);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-white/40 text-[10px] font-black uppercase italic hover:text-white transition-colors text-left"
            >
              {copied ? "✅ КОПИРОВАНО" : `ID: ${gameId.slice(-6)} 📋`}
            </button>
          </div>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2">
          <div
            className={`px-12 py-3 rounded-full border-2 transition-all duration-500 ${isMyTurn && status === "PLAYING" ? "bg-orange-500 border-white shadow-lg scale-110" : "bg-white/5 border-white/10 text-white/20"}`}
          >
            <span className="font-black italic tracking-widest text-xl uppercase italic">
              {status === "FINISHED"
                ? "КОНЕЦ ИГРЫ"
                : status === "LOBBY"
                  ? "ЖДЕМ ИГРОКОВ..."
                  : isMyTurn
                    ? "ТВОЙ ХОД!"
                    : "ЖДЕМ СВИНЬЮ"}
            </span>
          </div>
        </div>
        <div className="ml-auto text-white/50 font-black text-4xl">
          {hand.length} 🃏
        </div>
      </header>

      {/* 3 ОБЛАСТИ ПО 33.33% */}
      <main className="flex-1 grid grid-cols-3 w-full px-10 gap-0 items-center overflow-visible">
        {/* 1. СОПЕРНИКИ */}
        <div className="flex flex-col gap-6 items-center justify-center h-full border-r border-white/5">
          <div className="w-full max-w-[300px] flex flex-col gap-6">
            {opponents.map((opp) => (
              <div
                key={opp.id}
                className={`flex items-center gap-6 p-5 rounded-[40px] bg-black/40 border-2 backdrop-blur-xl transition-all ${opp.isTurn ? "border-orange-500 shadow-[0_0_40px_rgba(234,88,12,0.4)]" : "border-white/10"}`}
              >
                <div className="flex -space-x-10">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-[45px] h-[65px] rounded-[12px] border-2 border-white/20 bg-[#0f172a] shadow-xl -rotate-12"
                    />
                  ))}
                </div>
                <div className="flex flex-col">
                  <div className="text-white font-black text-xl uppercase tracking-tighter leading-none mb-1">
                    {opp.name}
                  </div>
                  <div className="text-orange-500 font-black text-sm uppercase tracking-widest">
                    {opp.cardCount} КАРТ
                  </div>
                </div>
              </div>
            ))}
            {opponents.length === 0 && (
              <div className="text-white/10 font-black uppercase text-center tracking-[0.3em] italic animate-pulse">
                Ожидание соперников...
              </div>
            )}
          </div>
        </div>

        {/* 2. ЦЕНТР: КОЛОДА И КАРТА */}
        <div className="flex flex-col items-center justify-center h-full px-4 relative">
          <div className="flex items-center gap-10">
            {/* Колода */}
            <div className="flex flex-col items-center gap-4">
              <motion.button
                onClick={drawCard}
                disabled={
                  !isMyTurn ||
                  !!previewCard ||
                  isChoosingColor ||
                  status !== "PLAYING"
                }
                className={`w-[150px] h-[225px] rounded-[28px] border-[8px] flex items-center justify-center transition-all ${isMyTurn && !previewCard && status === "PLAYING" ? "bg-orange-800 border-orange-400 shadow-2xl scale-105" : "bg-zinc-900 border-zinc-800 opacity-40"}`}
              >
                <span className="text-7xl">🐽</span>
              </motion.button>
              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">
                Колода
              </span>
            </div>

            {/* Текущая карта */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-[150px] h-[225px]">
                <AnimatePresence mode="wait">
                  {topCard && (
                    <motion.div
                      key={topCard.instanceId || topCard.id}
                      initial={{ scale: 0.5, opacity: 0, rotate: -20, y: 50 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0, y: 0 }}
                      className="absolute inset-0"
                    >
                      <Card card={topCard} isInsideHand={false} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest italic">
                Стол
              </span>
            </div>

            {/* Пустая стопка */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-[150px] h-[225px] rounded-[28px] border-4 border-dashed border-white/10 flex items-center justify-center bg-white/5 opacity-30">
                <span className="text-[10px] font-black text-white/20 uppercase rotate-90">
                  Сброс
                </span>
              </div>
              <span className="text-[10px] font-black text-white/10 uppercase tracking-widest italic invisible">
                .
              </span>
            </div>
          </div>
        </div>

        {/* 3. ДЕЙСТВИЯ */}
        <div className="flex items-center justify-center h-full border-l border-white/5 px-10">
          <AnimatePresence mode="wait">
            {!isChoosingColor && !previewCard && status === 'PLAYING' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-white/5 uppercase font-black italic text-3xl rotate-12">
                 Ожидание<br/>действий
              </motion.div>
            )}

            {status === 'FINISHED' && (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full bg-white p-10 rounded-[50px] text-center text-black shadow-2xl border-[6px] border-orange-500">
                <span className="text-6xl mb-4 block">🏆</span>
                <h2 className="text-3xl font-black uppercase italic mb-2 tracking-tighter leading-none">ФИНАЛ!</h2>
                <p className="font-bold text-orange-600 uppercase mb-8 tracking-tighter">
                  {players.find(p => String(p.id) === String(winnerId))?.name || "Игрок"} победил!
                </p>
                <button onClick={() => window.location.href = '/'} className="w-full py-5 bg-black text-white rounded-[24px] font-black uppercase text-xl">В МЕНЮ</button>
              </motion.div>
            )}

            {isChoosingColor && (
              <motion.div 
                initial={{ x: 80, opacity: 0 }} 
                animate={{ x: 0, opacity: 1 }} 
                exit={{ x: 80, opacity: 0 }} 
                className="w-full max-w-[320px] bg-black/90 backdrop-blur-3xl p-10 rounded-[60px] border-4 border-white/20 shadow-2xl flex flex-col items-center"
              >
                <div className="text-center mb-8 font-black uppercase tracking-widest text-orange-500 text-sm italic">
                  Выбери цвет
                </div>
                
                {/* Сетка с фиксированными размерами строк и колонок */}
                <div className="grid grid-cols-2 gap-6 w-fit h-fit">
                  {[
                    {id:'red',hex:'#ef4444'},
                    {id:'green',hex:'#22c55e'},
                    {id:'blue',hex:'#3b82f6'},
                    {id:'yellow',hex:'#eab308'}
                  ].map(c => (
                    <motion.button 
                      key={c.id} 
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleAction('select-color', c.id)} 
                      // Явные размеры: w-24 (96px) h-24 (96px) + min-height
                      className="w-24 h-24 min-h-[96px] min-w-[96px] rounded-[30px] border-4 border-white/20 shadow-lg flex-shrink-0" 
                      style={{ 
                        backgroundColor: c.hex, 
                        boxShadow: `0 0 20px ${c.hex}40` 
                      }} 
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {previewCard && (
              <motion.div initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 80, opacity: 0 }} className="w-full flex flex-col items-center p-8 bg-black/80 backdrop-blur-3xl rounded-[50px] border-2 border-white/20 shadow-2xl">
                <div className="w-[160px] h-[240px] mb-8"><Card card={previewCard} isInsideHand={false} /></div>
                <div className="flex flex-col gap-4 w-full">
                  <button onClick={() => handleAction('play')} className="py-5 bg-orange-600 rounded-[24px] font-black uppercase text-xl shadow-lg">Сходить</button>
                  <button onClick={() => handleAction('keep')} className="py-4 bg-white/10 rounded-[24px] font-black uppercase text-[10px] tracking-widest opacity-50">В руку</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full flex justify-center pb-12 px-10 items-end min-h-[260px] bg-gradient-to-t from-black/60 to-transparent overflow-visible">
        <div className="flex items-end justify-center overflow-visible">
          <AnimatePresence initial={false} mode="popLayout">
            {hand.map((card, index) => (
              <Card
                key={card.id}
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
  );
}
