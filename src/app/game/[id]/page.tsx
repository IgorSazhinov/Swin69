"use client";

import dynamic from 'next/dynamic';

// Отключаем SSR для игрового процесса. 
// Это убирает 100% ошибок гидратации, так как сервер больше не рендерит этот компонент.
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