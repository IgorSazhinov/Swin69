import { broadcastFullState } from "./socket/broadcaster.mjs";
import { handlePlayCard } from "./socket/handlers/playCard.mjs";
import { handleTakePenalty } from "./socket/handlers/takePenalty.mjs";
import { handleDrawCard } from "./socket/handlers/drawCard.mjs";
import { handleConfirmDraw } from "./socket/handlers/confirmDraw.mjs";
import { handleChlop } from "./socket/handlers/chlop.mjs";
import { handleChatMessage, handleGetChatHistory } from "./socket/handlers/chat.mjs";

export const registerSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log(">>> [SOCKET] Connected:", socket.id);
    
    socket.on("join_game", async ({ gameId, playerId }) => {
      socket.join(gameId);
      socket.join(String(playerId));
      await broadcastFullState(io, gameId);
    });

    socket.on("play_card", (data) => handlePlayCard(io, socket, data));
    socket.on("take_penalty", (data) => handleTakePenalty(io, socket, data));
    socket.on("draw_card", (data) => handleDrawCard(io, socket, data));
    socket.on("confirm_draw", (data) => handleConfirmDraw(io, socket, data));
    socket.on("chlop", (data) => handleChlop(io, socket, data));
    socket.on("chat_message", (data) => handleChatMessage(io, socket, data));
    socket.on("get_chat_history", (data) => handleGetChatHistory(io, socket, data));

    socket.on("disconnect", () => console.log("<<< [SOCKET] Disconnected"));
  });
};