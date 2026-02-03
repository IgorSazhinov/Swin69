import { executeTakePenalty } from "../../game-service.mjs";
import { broadcastFullState } from "../broadcaster.mjs";

export const handleTakePenalty = async (io, socket, data) => {
  const { gameId, playerId } = data;
  try {
    const result = await executeTakePenalty(gameId, playerId);
    if (result) await broadcastFullState(io, gameId);
  } catch (e) { console.error("TAKE_PENALTY_ERROR:", e); }
};