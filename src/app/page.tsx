"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [name, setName] = useState("");
  const [gameIdInput, setGameIdInput] = useState("");
  const router = useRouter();

  const createGame = async () => {
    const res = await fetch("/api/game/create", { method: "POST" });
    const { gameId } = await res.json();
    joinGame(gameId);
  };

  const joinGame = async (id: string) => {
    const res = await fetch("/api/game/join", {
      method: "POST",
      body: JSON.stringify({ gameId: id, playerName: name }),
    });
    const data = await res.json();
    // Сохраняем ID игрока в localStorage для простоты
    localStorage.setItem("svintus_playerId", data.playerId);
    router.push(`/game/${id}`);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-orange-100 p-4">
      <h1 className="text-6xl font-black text-orange-600 mb-8 transform -rotate-2">СВИНТУС</h1>
      <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col gap-4 w-full max-w-md">
        <input
          type="text"
          placeholder="Твое имя"
          className="p-3 border-2 rounded-lg outline-orange-500"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button 
          onClick={createGame}
          className="bg-orange-500 text-white p-3 rounded-lg font-bold hover:bg-orange-600"
        >
          Создать новую игру
        </button>
        <div className="flex gap-2 mt-4">
          <input
            type="text"
            placeholder="ID игры"
            className="flex-1 p-3 border-2 rounded-lg"
            value={gameIdInput}
            onChange={(e) => setGameIdInput(e.target.value)}
          />
          <button onClick={() => joinGame(gameIdInput)} className="bg-gray-800 text-white px-6 rounded-lg">
            Войти
          </button>
        </div>
      </div>
    </main>
  );
}