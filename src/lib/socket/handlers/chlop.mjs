import { prisma, getFullGameState } from "../../game-service.mjs";
import { broadcastFullState, broadcastLogUpdate } from "../broadcaster.mjs";
import { generateInstanceId } from "../../game-engine.mjs";
import { logGameAction } from "../../game-log-service.mjs";

export const handleChlop = async (io, socket, data) => {
    const { gameId, playerId } = data;
    console.log('[CHLOP] Запрос от:', playerId);

    try {
        const state = await getFullGameState(gameId);
        if (!state || state.game.status !== 'CHLOPKOPIT') {
            console.log('[CHLOP] Игра не в режиме CHLOPKOPIT');
            return;
        }

        console.log('[CHLOP] Статус игры:', state.game.status);
        console.log('[CHLOP] Текущий ход:', state.game.turnIndex);

        let chloppedIds = state.game.chloppedPlayerIds || [];
        const playerIdStr = String(playerId);
        
        console.log('[CHLOP] Уже хлопнули:', chloppedIds);

        // Проверяем, не хлопал ли уже игрок
        if (!chloppedIds.includes(playerIdStr)) {
            chloppedIds.push(playerIdStr);
            
            // Уведомляем всех, что игрок хлопнул
            io.to(gameId).emit("player_chlopped", { playerId: playerIdStr });
            console.log('[CHLOP] Обновленный список хлопнувших:', chloppedIds);

            // Логируем хлоп
            const player = state.game.players.find(p => String(p.id) === playerIdStr);
            const tapLog = await logGameAction(gameId, {
                playerId,
                playerName: player?.name,
                action: 'chlop_tap'
            });
            
            if (tapLog) await broadcastLogUpdate(io, gameId, tapLog);

            // Проверяем, все ли хлопнули, кроме одного
            const isRoundOver = chloppedIds.length >= state.game.players.length - 1;
            console.log('[CHLOP] Раунд окончен?', isRoundOver, 
                       'Нужно хлопнуть:', state.game.players.length - 1, 
                       'Уже хлопнули:', chloppedIds.length);

            if (isRoundOver && state.game.players.length > 1) {
                console.log('[CHLOP] Раунд окончен! Ищем проигравшего...');
                
                // Находим игрока, который не хлопнул
                const loser = state.game.players.find(p => 
                    !chloppedIds.includes(String(p.id))
                );
                
                console.log('[CHLOP] Проигравший:', loser ? { 
                    id: loser.id, 
                    name: loser.name, 
                    order: loser.order 
                } : 'не найден');

                if (loser) {
                    // Берем 2 карты из колоды
                    let deck = JSON.parse(state.game.deck || "[]");
                    const penaltyCards = deck.splice(0, 2).map(c => ({
                        ...c,
                        instanceId: generateInstanceId('chlop_pen')
                    }));

                    // Добавляем карты проигравшему
                    const currentHand = JSON.parse(loser.hand || "[]");
                    const newHand = [...currentHand, ...penaltyCards];

                    // Вычисляем следующий ход
                    const playerCount = state.game.players.length;
                    let nextTurnIndex = (state.game.turnIndex + state.game.direction) % playerCount;
                    if (nextTurnIndex < 0) nextTurnIndex += playerCount;

                    console.log('[CHLOP] Следующий ход:', {
                        currentTurnIndex: state.game.turnIndex,
                        direction: state.game.direction,
                        playerCount,
                        nextTurnIndex,
                        currentPlayer: state.game.players.find(p => p.order === state.game.turnIndex)?.name,
                        nextPlayer: state.game.players.find(p => p.order === nextTurnIndex)?.name
                    });

                    // Логируем проигрыш
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

                    // Обновляем БД
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
                                turnIndex: nextTurnIndex
                            }
                        })
                    ]);

                    console.log('[CHLOP] Игра возобновлена. Следующий ход:', nextTurnIndex);
                }
            } else {
                // Просто обновляем список хлопнувших
                console.log('[CHLOP] Раунд продолжается, обновляем список хлопнувших');
                await prisma.game.update({
                    where: { id: gameId },
                    data: { chloppedPlayerIds: JSON.stringify(chloppedIds) }
                });
            }

            console.log('[CHLOP] Отправляем обновленное состояние');
            await broadcastFullState(io, gameId);
        } else {
            console.log('[CHLOP] Игрок уже хлопал');
        }
    } catch (e) {
        console.error("[SERVER] Ошибка CHLOP:", e);
        
        const errorLog = await logGameAction(gameId, {
            playerId,
            action: 'chlop_error',
            details: { error: e.message }
        });
        
        if (errorLog) await broadcastLogUpdate(io, gameId, errorLog);
    }
};