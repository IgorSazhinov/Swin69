"use client";

import { motion } from "framer-motion";

interface Opponent {
  id: string;
  name: string;
  cardCount: number;
  isTurn: boolean;
}

export const Opponents = ({ players }: { players: Opponent[] }) => {
  return (
    <div className="flex flex-col gap-6 items-center justify-center h-full border-r border-white/5">
      <div className="w-full max-w-[300px] flex flex-col gap-6">
        {players.map((opp) => (
          <div 
            key={opp.id} 
            className={`flex items-center gap-6 p-5 rounded-[40px] bg-black/40 border-2 backdrop-blur-xl transition-all ${
              opp.isTurn ? 'border-orange-500 shadow-[0_0_40px_rgba(234,88,12,0.4)] scale-105' : 'border-white/10 opacity-60'
            }`}
          >
            <div className="flex -space-x-10">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-[45px] h-[65px] rounded-[12px] border-2 border-white/20 bg-[#0f172a] shadow-xl -rotate-12" />
              ))}
            </div>
            <div className="flex flex-col">
              <div className="text-white font-black text-xl uppercase tracking-tighter leading-none mb-1 truncate max-w-[120px]">
                {opp.name}
              </div>
              <div className="text-orange-500 font-black text-sm uppercase tracking-widest">
                {opp.cardCount} КАРТ
              </div>
            </div>
          </div>
        ))}
        {players.length === 0 && (
          <div className="text-white/10 font-black uppercase text-center tracking-[0.3em] italic animate-pulse">
            Ожидание соперников...
          </div>
        )}
      </div>
    </div>
  );
};