export const GameHeader = ({ name, gameId, cardCount, isMyTurn }) => (
  <div className="relative z-50 m-6 h-[100px] flex items-center bg-black/50 backdrop-blur-3xl rounded-[50px] border-2 border-white/20 px-10">
    <div className="flex flex-col">
      <span className="text-white font-black text-3xl uppercase">{name}</span>
      <span className="text-white/50 text-[10px]">ID: {gameId.slice(-6)}</span>
    </div>
    <div
      className={`absolute left-1/2 -translate-x-1/2 px-12 py-3 rounded-full border-2 ${
        isMyTurn ? "bg-orange-500" : "bg-white/5 opacity-20"
      }`}
    >
      <span className="font-black italic text-xl">
        {isMyTurn ? "ТВОЙ ХОД!" : "ЖДЕМ..."}
      </span>
    </div>
    <div className="ml-auto text-white/50 font-black text-4xl">
      {cardCount} 🃏
    </div>
  </div>
);
