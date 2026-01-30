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
  const [pendingPoly, setPendingPoly] = useState<any>(null);
  const [isConfirmingPoly, setIsConfirmingPoly] = useState(false);
  const [copied, setCopied] = useState(false);

  const { hand, topCard, isMyTurn, players, setHand, playCardOptimistic, status, winnerId } = useGameStore();
  const onPreview = useCallback((card: any) => setPreviewCard(card), []);

  useEffect(() => {
    setMounted(true);
    const savedId = localStorage.getItem("svintus_playerId") || "";
    setPlayerId(savedId);
  }, []);

  const { sendCard, drawCard, confirmDraw } = useGameSocket(gameId, playerId, onPreview);

  useEffect(() => {
    if (!playerId) return;
    fetch(`/api/player/${playerId}`).then(res => res.json()).then(data => {
      if (data.hand) setHand(data.hand);
      if (data.name) setPlayerName(data.name);
    });
  }, [playerId, setHand]);

  const handlePlayCard = (card: any) => {
    if (!isMyTurn || status === 'FINISHED' || !canPlayCard(card, topCard)) return;
    if (card.type === 'polyhryun') setPendingPoly(card);
    else { playCardOptimistic(card.id); sendCard(card); }
  };

  const handleConfirmAction = (action: 'play' | 'keep', color?: string) => {
    if (action === 'play' && previewCard?.type === 'polyhryun' && !color) {
      setIsConfirmingPoly(true);
      return;
    }
    confirmDraw(action, color);
    setPreviewCard(null);
    setIsConfirmingPoly(false);
  };

  if (!mounted || !playerId) return (
    <div className="fixed inset-0 bg-[#064e3b] flex items-center justify-center font-black text-white text-2xl uppercase italic animate-pulse">
        Загрузка...
    </div>
  );

  return (
    <div className="fixed inset-0 w-full h-full bg-[#064e3b] overflow-hidden flex flex-col justify-between select-none font-sans text-white">
      
      {/* 1. ШАПКА */}
      <header className="relative z-50 m-6 h-[100px] flex items-center bg-black/50 backdrop-blur-3xl rounded-[50px] border-2 border-white/20 px-10 shadow-[0_30px_70px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-6 min-w-[300px]">
          <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center border-2 border-white/30 rotate-3 shadow-xl">
             <span className="text-4xl">🐽</span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-white font-black text-3xl uppercase tracking-tighter truncate max-w-[200px]">{playerName}</span>
            <button onClick={() => { navigator.clipboard.writeText(gameId); setCopied(true); setTimeout(()=>setCopied(false), 2000); }} className="text-white/40 text-[10px] font-black tracking-widest uppercase italic hover:text-white transition-colors">
                ID: {gameId.slice(-6)} {copied ? "✅ КОПИРОВАНО" : "📋 КОПИРОВАТЬ"}
            </button>
          </div>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2">
          <div className={`px-12 py-3 rounded-full border-2 transition-all duration-500 ${isMyTurn && status !== 'FINISHED' ? "bg-orange-500 border-white shadow-lg scale-110 text-white" : "bg-white/5 border-white/10 text-white/20"}`}>
            <span className="font-black italic tracking-widest text-xl uppercase italic">
              {isMyTurn ? "ТВОЙ ХОД!" : players.length < 2 ? "ЖДЕМ ИГРОКОВ..." : "ЖДЕМ СВИНЬЮ"}
            </span>
          </div>
        </div>
        <div className="ml-auto text-white/50 font-black text-4xl">{hand.length} 🃏</div>
      </header>

      {/* 2. АРЕНА */}
      <main className="relative flex-1 w-full flex items-center px-12">
        
        {/* СОПЕРНИКИ */}
        <div className="z-10 flex flex-col gap-6 w-[280px]">
          {players.filter(p => p.id !== playerId).map((opp) => (
            <div key={opp.id} className={`flex items-center gap-4 p-3 rounded-[24px] bg-black/30 border backdrop-blur-md shadow-xl transition-all ${opp.isTurn ? 'border-orange-500 bg-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'border-white/5'}`}>
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

        {/* ЦЕНТР СТОЛА */}
        <div className="flex-1 flex items-center justify-center relative">
          <div className="flex items-center gap-20 mr-40">
            {/* КОЛОДА */}
            <motion.button 
              whileHover={isMyTurn && !previewCard ? { scale: 1.05 } : {}}
              onClick={drawCard} 
              disabled={!isMyTurn || !!previewCard} 
              className={`w-[176px] h-[264px] rounded-[32px] border-[8px] flex items-center justify-center transition-all ${isMyTurn && !previewCard ? "bg-orange-900 border-orange-400 shadow-2xl cursor-pointer" : "bg-zinc-900 border-zinc-800 opacity-40 cursor-not-allowed"}`}
            >
              <span className="text-8xl">🐽</span>
            </motion.button>

            {/* СТОЛ */}
            <div className="relative w-[176px] h-[264px] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40 rounded-[32px] translate-y-4 translate-x-2 -rotate-2 opacity-50" />
              <div className="absolute inset-0 bg-black/20 rounded-[32px] translate-y-2 translate-x-1 rotate-1 opacity-50" />
              
              <AnimatePresence mode="wait">
                {topCard && topCard.type ? (
                  <motion.div 
                    key={topCard.instanceId || topCard.id} 
                    initial={{ scale: 0.2, opacity: 0, y: 100, rotate: -40 }} 
                    animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }} 
                    exit={{ scale: 1.2, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="absolute inset-0"
                  >
                    <Card card={topCard} isInsideHand={false} />
                  </motion.div>
                ) : (
                   <div className="text-white/10 uppercase font-black text-xs tracking-widest text-center">Ждем первый ход...</div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ПРЕВЬЮ ПОСЛЕ ДОБОРА */}
          <div className="absolute left-[calc(50%+220px)] z-50 w-[240px]">
            <AnimatePresence>
              {previewCard && (
                <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 50, opacity: 0 }} className="flex flex-col items-center p-6 bg-black/80 backdrop-blur-3xl rounded-[40px] border-2 border-white/20 shadow-2xl">
                  <div className="text-[10px] font-black uppercase text-orange-400 mb-6 tracking-widest text-center">ВЫ ВЫТЯНУЛИ</div>
                  <div className="w-[176px] h-[264px] mb-8">
                     <Card card={previewCard} isInsideHand={false} />
                  </div>
                  <div className="flex flex-col gap-3 w-full">
                    {!isConfirmingPoly ? (
                      <>
                        <button onClick={() => handleConfirmAction('play')} className="py-4 bg-orange-600 rounded-2xl font-black uppercase text-xs shadow-lg hover:brightness-110 transition-all">Сходить</button>
                        <button onClick={() => handleConfirmAction('keep')} className="py-4 bg-white/10 border border-white/10 rounded-2xl font-black uppercase text-xs hover:bg-white/20 transition-all">В руку</button>
                      </>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 p-2 bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl">
                        {['red', 'green', 'blue', 'yellow'].map(c => (
                          <button key={c} onClick={() => handleConfirmAction('play', c)} className="w-12 h-12 rounded-xl border-2 border-white/20 hover:scale-110 transition-all" style={{ backgroundColor: c === 'red' ? '#ef4444' : c === 'green' ? '#22c55e' : c === 'blue' ? '#3b82f6' : '#eab308' }} />
                        ))}
                      </div>
                    )}
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
                disabled={!isMyTurn || !!previewCard} 
              />
            ))}
          </AnimatePresence>
        </div>
      </footer>

      {/* МОДАЛКА ПОЛИСВИНА */}
      <AnimatePresence>
        {pendingPoly && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="bg-zinc-900 p-12 rounded-[60px] flex flex-col items-center gap-10 border-2 border-white/10 shadow-2xl">
              <h3 className="text-white font-black text-4xl uppercase italic tracking-tighter">Выбери цвет</h3>
              <div className="grid grid-cols-2 gap-8">
                {['red', 'green', 'blue', 'yellow'].map(c => (
                  <button key={c} onClick={() => { playCardOptimistic(pendingPoly.id); sendCard(pendingPoly, c); setPendingPoly(null); }} style={{ backgroundColor: c === 'red' ? '#ef4444' : c === 'green' ? '#22c55e' : c === 'blue' ? '#3b82f6' : '#eab308' }} className="w-32 h-32 rounded-[40px] border-4 border-white/20 hover:scale-110 transition-all shadow-xl" />
                ))}
              </div>
              <button onClick={()=>setPendingPoly(null)} className="text-white/20 uppercase font-black text-xs hover:text-white transition-colors">Отмена</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ЭКРАН ПОБЕДЫ */}
      <AnimatePresence>
        {status === 'FINISHED' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-3xl">
            <div className="bg-white p-12 rounded-[50px] text-center text-black shadow-2xl max-w-sm w-full">
              <span className="text-8xl mb-4 block animate-bounce">🏆</span>
              <h2 className="text-5xl font-black uppercase italic mb-2 tracking-tighter">СВИНТУС!</h2>
              <p className="text-xl font-bold text-orange-600 uppercase mb-8">{players.find(p => p.id === winnerId)?.name} победил!</p>
              <button onClick={() => window.location.href = '/'} className="w-full py-4 bg-black text-white rounded-full font-black hover:scale-105 transition-transform">В МЕНЮ</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}