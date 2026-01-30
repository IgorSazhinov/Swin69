"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useGameSocket } from "@/hooks/useGameSocket";
import { Card } from "@/components/Card";
import { AnimatePresence, motion } from "framer-motion";
import { canPlayCard } from "@/lib/game-logic";

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = use(params);
  const [mounted, setMounted] = useState(false);
  const [playerId, setPlayerId] = useState("");
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
    winnerId 
  } = useGameStore();
  
  const onPreview = useCallback((card: any) => {
    setPreviewCard(card);
    setIsChoosingColor(false);
  }, []);

  const { sendCard, drawCard, confirmDraw } = useGameSocket(gameId, playerId, onPreview);

  useEffect(() => {
    const savedId = localStorage.getItem("svintus_playerId") || "";
    setPlayerId(savedId);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!playerId) return;
    fetch(`/api/player/${playerId}`).then(res => res.json()).then(data => {
      if (data.hand) setHand(data.hand);
      if (data.name) setPlayerName(data.name);
    });
  }, [playerId, setHand]);

  const handlePlayCard = (card: any) => {
    if (!isMyTurn || status === 'FINISHED' || !canPlayCard(card, topCard)) return;
    
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

  if (!mounted || !playerId) return null;

  const opponents = players.filter(p => p.id !== playerId);

  return (
    <div className="fixed inset-0 w-full h-full bg-[#064e3b] overflow-hidden flex flex-col justify-between select-none font-sans text-white">
      
      {/* 1. ШАПКА */}
      <header className="relative z-50 m-6 h-[100px] flex items-center bg-black/50 backdrop-blur-3xl rounded-[50px] border-2 border-white/20 px-10 shadow-2xl">
        <div className="flex items-center gap-6 min-w-[300px]">
          <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center border-2 border-white/30 rotate-3 shadow-xl">
             <span className="text-4xl font-black italic">🐽</span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-white font-black text-3xl uppercase tracking-tighter truncate max-w-[200px]">{playerName}</span>
            <button 
              onClick={() => { navigator.clipboard.writeText(gameId); setCopied(true); setTimeout(()=>setCopied(false), 2000); }} 
              className="text-white/40 text-[10px] font-black tracking-widest uppercase italic hover:text-white transition-colors text-left"
            >
                ID: {gameId.slice(-6)} {copied ? "✅ КОПИРОВАНО" : "📋 КОПИРОВАТЬ"}
            </button>
          </div>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2">
          <div className={`px-12 py-3 rounded-full border-2 transition-all duration-500 ${isMyTurn && status !== 'FINISHED' ? "bg-orange-500 border-white shadow-lg scale-110" : "bg-white/5 border-white/10 text-white/20"}`}>
            <span className="font-black italic tracking-widest text-xl uppercase italic">
              {status === 'FINISHED' ? "КОНЕЦ ИГРЫ" : isMyTurn ? "ТВОЙ ХОД!" : "ЖДЕМ СВИНЬЮ"}
            </span>
          </div>
        </div>
        <div className="ml-auto text-white/50 font-black text-4xl">{hand.length} 🃏</div>
      </header>

      {/* 2. АРЕНА */}
      <main className="relative flex-1 w-full flex items-center px-12">
        <div className="z-10 flex flex-col gap-6 w-[280px]">
          {opponents.map((opp) => (
            <div key={opp.id} className={`flex items-center gap-4 p-3 rounded-[24px] bg-black/30 border backdrop-blur-md transition-all ${opp.isTurn ? 'border-orange-500 bg-orange-500/10' : 'border-white/5'}`}>
               <div className="flex -space-x-10">
                  {[...Array(Math.min(opp.cardCount, 3))].map((_, i) => (
                    <div key={i} className="relative w-[45px] h-[65px] rounded-[6px] border border-white/10 shadow-lg bg-[#0f172a] flex items-center justify-center -rotate-6">
                       <span className="text-sm opacity-20 grayscale">🐽</span>
                    </div>
                  ))}
               </div>
               <div className="flex flex-col gap-1 text-left">
                  <div className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase ${opp.isTurn ? 'bg-orange-500 border-white text-white' : 'bg-white/10 border-white/5 text-white/40'}`}>
                    {opp.name}
                  </div>
                  <div className="text-white/40 text-[10px] font-black ml-1 uppercase tracking-widest">{opp.cardCount} КАРТ</div>
               </div>
            </div>
          ))}
        </div>

        <div className="flex-1 flex items-center justify-center relative">
          <div className="flex items-center gap-20 mr-40">
            <motion.button 
              whileHover={isMyTurn && !previewCard && !isChoosingColor ? { scale: 1.05 } : {}}
              onClick={drawCard} 
              disabled={!isMyTurn || !!previewCard || isChoosingColor || status === 'FINISHED'} 
              className={`w-[176px] h-[264px] rounded-[32px] border-[8px] flex items-center justify-center transition-all ${isMyTurn && !previewCard && !isChoosingColor ? "bg-orange-800 border-orange-400 shadow-2xl cursor-pointer" : "bg-zinc-900 border-zinc-800 opacity-40 cursor-not-allowed"}`}
            >
              <span className="text-8xl">🐽</span>
            </motion.button>

            <div className="relative w-[176px] h-[264px]">
              <div className="absolute inset-0 bg-black/40 rounded-[32px] translate-y-4 translate-x-2 -rotate-2 opacity-50" />
              <div className="absolute inset-0 bg-black/20 rounded-[32px] translate-y-2 translate-x-1 rotate-1 opacity-50" />
              <AnimatePresence mode="wait">
                {topCard && topCard.type && (
                  <motion.div 
                    key={topCard.instanceId || topCard.id} 
                    initial={{ scale: 0.2, opacity: 0, y: 100, rotate: -40 }} 
                    animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }} 
                    exit={{ scale: 1.2, opacity: 0 }}
                    className="absolute inset-0"
                  >
                    <Card card={topCard} isInsideHand={false} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ЕДИНАЯ ПАНЕЛЬ ДЕЙСТВИЙ */}
          <div className="absolute left-[calc(50%+220px)] z-50 w-[320px] min-h-[400px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              
              {/* ПОБЕДА */}
              {status === 'FINISHED' && (
                <motion.div 
                  key="win-panel"
                  initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} 
                  className="w-full bg-white p-8 rounded-[40px] text-center text-black shadow-2xl border-4 border-orange-500"
                >
                  <span className="text-6xl mb-4 block">🏆</span>
                  <h2 className="text-3xl font-black uppercase italic mb-2 tracking-tighter">ФИНАЛ!</h2>
                  <p className="text-sm font-bold text-orange-600 uppercase mb-6 tracking-tight">
                    {players.find(p => p.id === winnerId)?.name || "Игрок"} победил!
                  </p>
                  <button 
                    onClick={() => window.location.href = '/'} 
                    className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest"
                  >
                    В МЕНЮ
                  </button>
                </motion.div>
              )}

              {/* ВЫБОР ЦВЕТА */}
              {isChoosingColor && status !== 'FINISHED' && (
                <motion.div 
                  key="color-panel"
                  initial={{ x: 60, opacity: 0 }} 
                  animate={{ x: 0, opacity: 1 }} 
                  exit={{ x: 60, opacity: 0 }} 
                  className="w-full bg-black/90 backdrop-blur-3xl p-8 rounded-[48px] border-4 border-white/20 shadow-2xl flex flex-col items-center"
                >
                  <div className="text-[12px] font-black uppercase text-white mb-8 tracking-[0.3em] flex items-center gap-2">
                    <span className="animate-pulse">🌈</span> ВЫБЕРИ ЦВЕТ
                  </div>
                  
                  {/* Контейнер сетки с принудительными размерами */}
                  <div className="grid grid-cols-2 gap-6 w-full place-items-center">
                    {[
                      { id: 'red', hex: '#ef4444', label: 'КРАСНЫЙ' },
                      { id: 'green', hex: '#22c55e', label: 'ЗЕЛЕНЫЙ' },
                      { id: 'blue', hex: '#3b82f6', label: 'СИНИЙ' },
                      { id: 'yellow', hex: '#eab308', label: 'ЖЕЛТЫЙ' }
                    ].map(color => (
                      <motion.button 
                        key={color.id}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleAction('select-color', color.id)} 
                        className="relative w-24 h-24 rounded-[32px] border-4 border-white/20 shadow-xl overflow-hidden"
                        style={{ backgroundColor: color.hex, minWidth: '96px', minHeight: '96px' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/30 to-transparent" />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow-md opacity-0 hover:opacity-100 transition-opacity">
                          {color.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ПРЕДПРОСМОТР КАРТЫ */}
              {previewCard && !isChoosingColor && status !== 'FINISHED' && (
                <motion.div 
                  key="preview-panel"
                  initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 50, opacity: 0 }} 
                  className="w-full flex flex-col items-center p-6 bg-black/80 backdrop-blur-3xl rounded-[40px] border-2 border-white/20 shadow-2xl"
                >
                  <div className="text-[10px] font-black uppercase text-orange-400 mb-6 tracking-widest italic text-center">Вы вытянули</div>
                  <div className="w-[176px] h-[264px] mb-8">
                     <Card card={previewCard} isInsideHand={false} />
                  </div>
                  <div className="flex flex-col gap-3 w-full">
                    <button 
                      onClick={() => handleAction('play')} 
                      className="py-4 bg-orange-600 rounded-2xl font-black uppercase text-xs shadow-lg"
                    >
                      Сходить
                    </button>
                    <button 
                      onClick={() => handleAction('keep')} 
                      className="py-4 bg-white/10 border border-white/10 rounded-2xl font-black uppercase text-xs"
                    >
                      В руку
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* 3. РУКА ИГРОКА */}
      <footer className="w-full flex justify-center pb-8 px-10 overflow-visible items-end min-h-[220px] bg-gradient-to-t from-black/40 to-transparent">
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
                disabled={!isMyTurn || !!previewCard || isChoosingColor || status === 'FINISHED'} 
              />
            ))}
          </AnimatePresence>
        </div>
      </footer>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}