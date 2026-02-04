import { prisma, getFullGameState } from "../../game-service.mjs";
import { broadcastFullState } from "../broadcaster.mjs";
import { generateInstanceId } from "../../game-engine.mjs";

export const handleChlop = async (io, socket, data) => {
  const { gameId, playerId } = data;
  
  console.log('[CHLOP] Начало. Игрок нажал хлоп:', playerId);
  
  try {
    const state = await getFullGameState(gameId);
    if (!state || state.game.status !== 'CHLOPKOPIT') {
      console.log('[CHLOP] Неверный статус игры или игра не найдена');
      return;
    }
    
    console.log('[CHLOP] Текущий статус:', state.game.status);
    console.log('[CHLOP] Текущий turnIndex:', state.game.turnIndex);
    console.log('[CHLOP] Игроки в игре:', state.game.players.map(p => ({ id: p.id, order: p.order, name: p.name })));
    
    let chloppedIds = state.game.chloppedPlayerIds || [];
    const pId = String(playerId);
    
    console.log('[CHLOP] Уже нажали хлоп:', chloppedIds);
    console.log('[CHLOP] Текущий игрок нажал:', pId);
    
    if (!chloppedIds.includes(pId)) {
      chloppedIds.push(pId);
      io.to(gameId).emit("player_chlopped", { playerId: pId });
      
      console.log('[CHLOP] Обновленный список хлопов:', chloppedIds);
      
      // Проверяем, завершился ли раунд хлопков
      const isRoundOver = chloppedIds.length >= state.game.players.length - 1;
      console.log('[CHLOP] Раунд завершен?', isRoundOver, 'Нужно хлопов:', state.game.players.length - 1, 'Есть хлопов:', chloppedIds.length);
      
      if (isRoundOver && state.game.players.length > 1) {
        console.log('[CHLOP] Раунд хлопков ЗАВЕРШЕН!');
        
        const loser = state.game.players.find(p => !chloppedIds.includes(String(p.id)));
        console.log('[CHLOP] Проигравший:', loser ? { id: loser.id, name: loser.name, order: loser.order } : 'нет');
        
        if (loser) {
          let deck = JSON.parse(state.game.deck || "[]");
          const penaltyCards = deck.splice(0, 2).map(c => ({ 
            ...c, 
            instanceId: generateInstanceId('chlop_pen') 
          }));
          
          const currentHand = JSON.parse(loser.hand || "[]");
          const newHand = [...currentHand, ...penaltyCards];
          
          // ОСНОВНОЕ ИСПРАВЛЕНИЕ: Ход ВСЕГДА переходит к следующему игроку
          const playersCount = state.game.players.length;
          const nextTurnIndex = (state.game.turnIndex + state.game.direction) % playersCount;
          // Исправляем для отрицательных значений
          const fixedNextTurnIndex = nextTurnIndex < 0 ? nextTurnIndex + playersCount : nextTurnIndex;
          
          console.log('[CHLOP] Переход хода после хлопков:', {
            currentTurnIndex: state.game.turnIndex,
            direction: state.game.direction,
            playerCount: playersCount,
            nextTurnIndex: fixedNextTurnIndex,
            formula: `(${state.game.turnIndex} + ${state.game.direction}) % ${playersCount} = ${fixedNextTurnIndex}`,
            currentPlayer: state.game.players.find(p => p.order === state.game.turnIndex)?.name,
            nextPlayer: state.game.players.find(p => p.order === fixedNextTurnIndex)?.name
          });
          
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
                chloppedPlayerIds: JSON.stringify([]),
                turnIndex: fixedNextTurnIndex  // Ход переходит следующему игроку
              }
            })
          ]);
          
          console.log('[CHLOP] БД обновлена. Новый turnIndex:', fixedNextTurnIndex);
        }
      } else {
        // Раунд не завершен, просто сохраняем хлопки
        console.log('[CHLOP] Раунд не завершен, сохраняем хлопки');
        await prisma.game.update({
          where: { id: gameId },
          data: { chloppedPlayerIds: JSON.stringify(chloppedIds) }
        });
      }
      
      console.log('[CHLOP] Вызываем broadcastFullState');
      await broadcastFullState(io, gameId);
    } else {
      console.log('[CHLOP] Игрок уже нажимал хлоп');
    }
  } catch (e) {
    console.error("[SERVER] CHLOP_ERROR:", e);
  }
};