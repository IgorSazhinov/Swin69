import { calculateNextTurn, generateInstanceId } from "../../game-engine.mjs";
import { getFullGameState, prisma } from "../../game-service.mjs";
import { broadcastFullState } from "../broadcaster.mjs";
import { logGameAction } from "../../game-log-service.mjs";

export const handleConfirmDraw = async (io, socket, data) => {
    const { gameId, playerId, action, chosenColor } = data;
    console.log("[CONFIRM_DRAW] Начало обработки:", { gameId, playerId, action });

    try {
        const state = await getFullGameState(gameId);
        if (!state || state.currentPlayerId !== String(playerId)) {
            console.log("[CONFIRM_DRAW] Не очередь игрока или игра не найдена");
            return;
        }

        const player = state.game.players.find(p => String(p.id) === String(playerId));
        if (!player) return;

        let deck = JSON.parse(state.game.deck || "[]");
        const drawnCardRaw = deck.shift();
        
        if (!drawnCardRaw) {
            console.log("[CONFIRM_DRAW] Колода пуста");
            return;
        }

        console.log("[CONFIRM_DRAW] Карта для игры:", {
            type: drawnCardRaw.type,
            color: drawnCardRaw.color,
            isKhlopkopit: drawnCardRaw.type === "khlopkopit"
        });

        if (action === 'play') {
            const isKhlopkopit = drawnCardRaw.type === "khlopkopit";
            
            // Определяем следующий ход
            let nextIndex, nextDirection;
            if (isKhlopkopit) {
                // Хлопкопыт: ход остается у текущего игрока
                nextIndex = state.game.turnIndex;
                nextDirection = state.game.direction;
                console.log("[CONFIRM_DRAW] Это хлопкопыт! Ход остается у игрока");
            } else {
                // Обычная карта
                const result = calculateNextTurn(
                    state.game.turnIndex,
                    state.game.direction,
                    state.game.players.length,
                    drawnCardRaw.type
                );
                nextIndex = result.nextIndex;
                nextDirection = result.nextDirection;
            }

            let newPenalty = state.game.pendingPenalty;
            if (drawnCardRaw.type === "khapezh") {
                newPenalty = state.game.pendingPenalty > 0 
                    ? state.game.pendingPenalty + 3 
                    : 3;
            }

            // ОПРЕДЕЛЯЕМ СТАТУС - КЛЮЧЕВОЙ МОМЕНТ!
            let nextStatus = "PLAYING";
            if (isKhlopkopit) {
                nextStatus = "CHLOPKOPIT";
                console.log("[CONFIRM_DRAW] Устанавливаем статус CHLOPKOPIT");
            }

            console.log("[CONFIRM_DRAW] Данные для обновления:", {
                nextStatus,
                nextIndex,
                isKhlopkopit,
                cardType: drawnCardRaw.type
            });

            // Логируем
            await logGameAction(gameId, {
                playerId,
                playerName: player.name,
                action: 'play_preview_card',
                cardType: drawnCardRaw.type,
                cardColor: chosenColor || drawnCardRaw.color,
                details: {
                    fromPreview: true,
                    action: 'play',
                    chosenColor,
                    newPenalty,
                    nextPlayerIndex: nextIndex,
                    nextStatus
                }
            });

            // Добавляем в сброс текущую карту
            const discardPile = JSON.parse(state.game.discardPile || "[]");
            if (state.game.currentCard) {
                discardPile.push(JSON.parse(state.game.currentCard));
            }

            // Обновляем БД
            await prisma.game.update({
                where: { id: gameId },
                data: {
                    currentCard: JSON.stringify({
                        ...drawnCardRaw,
                        color: chosenColor || drawnCardRaw.color,
                        instanceId: generateInstanceId('confirm')
                    }),
                    discardPile: JSON.stringify(discardPile),
                    turnIndex: nextIndex,
                    direction: nextDirection,
                    deck: JSON.stringify(deck),
                    pendingPenalty: newPenalty,
                    status: nextStatus  // ← ОБЯЗАТЕЛЬНО обновляем статус!
                }
            });

            console.log("[CONFIRM_DRAW] БД обновлена. Статус:", nextStatus);

        } else if (action === 'keep') {
            // Карта остается в руке
            const currentHand = JSON.parse(player.hand || "[]");
            const newHand = [...currentHand, {
                ...drawnCardRaw,
                instanceId: generateInstanceId('confirm')
            }];

            const nextIdx = (state.game.turnIndex + state.game.direction + state.game.players.length) % state.game.players.length;

            await logGameAction(gameId, {
                playerId,
                playerName: player.name,
                action: 'keep_preview_card',
                cardType: drawnCardRaw.type,
                cardColor: drawnCardRaw.color,
                details: {
                    fromPreview: true,
                    action: 'keep',
                    newHandSize: newHand.length,
                    nextPlayerIndex: nextIdx
                }
            });

            await prisma.$transaction([
                prisma.player.update({
                    where: { id: playerId },
                    data: { hand: JSON.stringify(newHand) }
                }),
                prisma.game.update({
                    where: { id: gameId },
                    data: {
                        deck: JSON.stringify(deck),
                        turnIndex: nextIdx
                    }
                })
            ]);
        }

        await broadcastFullState(io, gameId);
        
    } catch (e) {
        console.error("[CONFIRM_DRAW_ERROR]:", e);
        
        await logGameAction(gameId, {
            playerId,
            action: 'confirm_draw_error',
            details: { error: e.message }
        });
    }
};