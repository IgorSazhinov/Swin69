import { prisma, getFullGameState } from "../../game-service.mjs";
import { broadcastFullState, broadcastLogUpdate } from "../broadcaster.mjs";
import { generateInstanceId } from "../../game-engine.mjs";
import { logGameAction } from "../../game-log-service.mjs";

export const handleChlop = async (io, socket, data) => {
  const { gameId, playerId } = data;
  
  console.log('[CHLOP] Игрок нажал хлоп:', playerId);
  
  try {
    const state = await getFullGameState(gameId);
    if (!state || state.game.status !== 'CHLOPKOPIT') {
      console.log('[CHLOP] Неверный статус игры или игра не найдена');
      return;
    }
    
    console.log('[CHLOP] Текущий статус:', state.game.status);
    console.log('[CHLOP] Текущий turnIndex:', state.game.turnIndex);
    
    let chloppedIds = state.game.chloppedPlayerIds || [];
    const pId = String(playerId);
    
    console.log('[CHLOP] Уже нажали хлоп:', chloppedIds);
    
    if (!chloppedIds.includes(pId)) {
      chloppedIds.push(pId);
      io.to(gameId).emit("player_chlopped", { playerId: pId });
      
      console.log('[CHLOP] Обновленный список хлопов:', chloppedIds);
      
      // ЛОГИРОВАНИЕ: Нажатие хлопка
      const tapLog = await logGameAction(gameId, {
        playerId,
        playerName: state.game.players.find(p => String(p.id) === pId)?.name,
        action: 'chlop_tap'
      });
      
      if (tapLog) await broadcastLogUpdate(io, gameId, tapLog);
      
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
          
          // Ход ВСЕГДА переходит к следующему игроку
          const playersCount = state.game.players.length;
          let nextTurnIndex = (state.game.turnIndex + state.game.direction) % playersCount;
          if (nextTurnIndex < 0) nextTurnIndex += playersCount;
          
          console.log('[CHLOP] Переход хода после хлопов:', {
            currentTurnIndex: state.game.turnIndex,
            direction: state.game.direction,
            playerCount: playersCount,
            nextTurnIndex: fixedNextTurnIndex,
            currentPlayer: state.game.players.find(p => p.order === state.game.turnIndex)?.name,
            nextPlayer: state.game.players.find(p => p.order === fixedNextTurnIndex)?.name
          });
          
          // ЛОГИРОВАНИЕ: Завершение хлопкопыта
          const loseLog = await logGameAction(gameId, {
            playerId: loser.id,
            playerName: loser.name,
            action: 'chlop_lose',
            details: {
              penaltyCards: 2,
              chloppedPlayers: chloppedIds.length
            }
          });
          
          if (loseLog) await broadcastLogUpdate(io, gameId, loseLog);
          
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
                turnIndex: fixedNextTurnIndex
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
    
    // Логирование ошибки
    const errorLog = await logGameAction(gameId, {
      playerId,
      action: 'chlop_error',
      details: { error: e.message }
    });
    
    if (errorLog) await broadcastLogUpdate(io, gameId, errorLog);
  }
};