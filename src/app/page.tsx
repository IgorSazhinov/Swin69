"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [name, setName] = useState("");
  const [gameIdInput, setGameIdInput] = useState("");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // Состояние для модалки
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const savedName = localStorage.getItem("svintus_playerName");
    if (savedName) setName(savedName);
  }, []);

  const createGame = async () => {
    if (!name) return setError("Представься, ГЕЙ!");
    setLoading(true);
    localStorage.setItem("svintus_playerName", name);
    try {
      const res = await fetch("/api/game/create", { method: "POST" });
      const { gameId } = await res.json();
      await joinGame(gameId);
    } catch (e) {
      setLoading(false);
      setError("Ошибка при создании игры");
    }
  };

  const joinGame = async (id) => {
    if (!name) return setError("Введите имя!");
    if (!id) return setError("Введите ID игры!");
    setLoading(true);
    localStorage.setItem("svintus_playerName", name);
    try {
      const res = await fetch("/api/game/join", {
        method: "POST",
        body: JSON.stringify({ gameId: id, playerName: name }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      localStorage.setItem("svintus_playerId", data.playerId);
      router.push(`/game/${id}`);
    } catch (e) {
      setLoading(false);
      setError("Игра не найдена или ID неверный");
    }
  };

  if (!mounted) return null;

  return (
    <main className="relative min-h-screen bg-[#064e3b] flex items-center justify-center p-6 md:p-10 py-20 overflow-hidden">
      {/* МОДАЛЬНОЕ ОКНО ОШИБКИ */}
      <AnimatePresence>
        {error && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* ТЕМНЫЙ ФОН НА ВЕСЬ ЭКРАН */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-2xl"
              onClick={() => setError(null)}
            />

            {/* ГИГАНТСКАЯ КАРТОЧКА ОШИБКИ */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              /* Принудительная ширина: 500px на десктопе, почти во весь экран на мобилках */
              className="relative z-[110] bg-[#064e3b] border-[6px] border-orange-500 p-12 rounded-[60px] shadow-[0_0_150px_rgba(234,88,12,0.4)] w-[90vw] max-w-[500px] min-w-[300px] text-center"
            >
              <h2 className="text-white font-black text-6xl uppercase italic tracking-tighter mb-6">
                АЛЁ!
              </h2>

              <p className="text-white font-black text-2xl mb-10 uppercase leading-none tracking-tighter">
                {error}
              </p>

              <button
                onClick={() => setError(null)}
                className="w-full h-20 bg-white text-orange-600 rounded-[30px] font-black text-3xl uppercase italic hover:bg-orange-500 hover:text-white transition-all active:scale-90 shadow-xl"
              >
                ОК
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[600px]"
      >
        <div className="text-center mb-16 md:mb-24">
          <h1 className="text-7xl md:text-9xl font-black text-white italic tracking-tighter drop-shadow-2xl">
            ГЕЙ<span className="text-orange-500">ТУС</span>
          </h1>
          <p className="text-orange-400 font-black tracking-[0.3em] md:tracking-[0.5em] uppercase text-xl md:text-2xl mt-4 md:mt-6">
            Premium Edition
          </p>
        </div>

        <div className="bg-black/40 backdrop-blur-3xl rounded-[80px] border-4 border-white/10 shadow-2xl p-[20px]">
          <div className="flex flex-col gap-[10px]">
            <div className="w-full text-center">
              <label className="block text-xl font-black text-orange-500 uppercase tracking-[0.3em] mb-2">
                Имя игрока
              </label>
              <input
                type="text"
                placeholder="ТВОЙ НИК..."
                className="w-full h-[40px] bg-white/5 border-4 border-white/10 px-6 rounded-[40px] text-[32px] font-black outline-none focus:border-orange-500 transition-all placeholder:text-white/5 uppercase text-white leading-none text-center"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <button
              onClick={createGame}
              disabled={loading}
              className="w-full h-[40px] bg-orange-600 rounded-[40px] font-black text-[28px] uppercase italic hover:bg-orange-500 active:scale-[0.98] transition-all shadow-lg text-white flex items-center justify-center leading-none disabled:opacity-50"
            >
              {loading ? "..." : "СОЗДАТЬ ИГРУ"}
            </button>

            <div className="flex items-center gap-10 py-2">
              <div className="flex-1 h-2 bg-white/10 rounded-full" />
              <span className="text-xl font-black text-white/20 uppercase tracking-[0.4em]">
                ИЛИ
              </span>
              <div className="flex-1 h-2 bg-white/10 rounded-full" />
            </div>

            <div className="flex flex-col gap-[10px] text-center">
              <label className="block text-xl font-black text-white/40 uppercase tracking-[0.3em]">
                Вход по ID
              </label>
              <div className="flex gap-[10px]">
                <input
                  type="text"
                  placeholder="ID МАТЧА"
                  className="flex-1 h-[40px] bg-white/5 border-4 border-white/10 px-6 rounded-[40px] text-[32px] font-black outline-none focus:border-white/30 transition-all placeholder:text-white/5 uppercase text-white leading-none text-center"
                  value={gameIdInput}
                  onChange={(e) => setGameIdInput(e.target.value)}
                />
                <button
                  onClick={() => joinGame(gameIdInput)}
                  disabled={loading}
                  className="px-10 h-[40px] bg-white text-black rounded-[40px] font-black uppercase text-[28px] hover:bg-orange-500 hover:text-white transition-all active:scale-90 flex items-center justify-center leading-none"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-12 md:mt-16 text-white/20 text-sm md:text-lg font-black uppercase tracking-[0.4em] md:tracking-[0.7em]">
          digital ГЕЙ experience
        </div>
      </motion.div>
    </main>
  );
}
