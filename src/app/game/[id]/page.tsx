"use client";

import dynamic from 'next/dynamic';

const GameClient = dynamic(() => import('@/components/Game/GameClient'), { 
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-[#064e3b] flex items-center justify-center font-black text-white text-2xl uppercase italic animate-pulse">
        Подготовка стола...
    </div>
  )
});

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  return <GameClient params={params} />;
}