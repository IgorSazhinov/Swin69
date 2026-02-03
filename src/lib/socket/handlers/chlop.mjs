import { prisma, getFullGameState } from "../../game-service.mjs";
import { broadcastFullState } from "../broadcaster.mjs";
import { generateInstanceId } from "../../game-engine.mjs";

export const handleChlop = async (io, socket, data) => {
  const { gameId, playerId } = data;
  try {
    const state = await getFullGameState(gameId);
    if (!state || state.game.status !== 'CHLOPKOPIT') return;

    let chloppedIds = state.game.chloppedPlayerIds || [];
    const pId = String(playerId);
    
    if (!chloppedIds.includes(pId)) {
      chloppedIds.push(pId);

      io.to(gameId).emit("player_chlopped", { playerId: pId });

      // Раунд окончен, если нажали все кроме одного
      const isRoundOver = chloppedIds.length >= state.game.players.length - 1;

      if (isRoundOver && state.game.players.length > 1) {
        const loser = state.game.players.find(p => !chloppedIds.includes(String(p.id)));
        
        if (loser) {
          let deck = JSON.parse(state.game.deck || "[]");
          const penaltyCards = deck.splice(0, 2).map(c => ({
            ...c, 
            instanceId: generateInstanceId('chlop_pen')
          }));
          
          const currentHand = JSON.parse(loser.hand || "[]");
          const newHand = [...currentHand, ...penaltyCards];

          await prisma.$transaction([
            prisma.player.update({ 
              where: { id: loser.id }, 
              data: { hand: JSON.stringify(newHand) } 
            }),
            prisma.game.update({
              where: { id: gameId },
              data: {
                status: 'PLAYING',
                deck: JSON.stringify(deck),
                chloppedPlayerIds: JSON.stringify([]) 
              }
            })
          ]);
        }
      } else {
        await prisma.game.update({
          where: { id: gameId },
          data: { chloppedPlayerIds: JSON.stringify(chloppedIds) }
        });
      }

      await broadcastFullState(io, gameId);
    }
  } catch (e) { 
    console.error("[SERVER] CHLOP_ERROR:", e); 
  }
};