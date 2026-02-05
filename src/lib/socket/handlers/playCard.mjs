import { canIntercept, calculateNextTurn, generateInstanceId, } from "../../game-engine.mjs";
import { getFullGameState, prisma } from "../../game-service.mjs";
import { broadcastFullState, broadcastLogUpdate } from "../broadcaster.mjs";
import { logGameAction } from "../../game-log-service.mjs";

export const handlePlayCard = async (io, socket, data) => {
    const { gameId, card, playerId, chosenColor } = data;
    console.log("[PLAY_CARD] Запрос на ход картой. Тип:", card.type, "Игрок:", playerId);

    try {
        const state = await getFullGameState(gameId);
        if (!state || state.game.status !== "PLAYING") {
            console.log("[PLAY_CARD] Игра не в состоянии PLAYING:", state?.game?.status);
            return;
        }

        console.log("[PLAY_CARD] Текущий ход (turnIndex):", state.game.turnIndex);
        console.log(
            "[PLAY_CARD] Игроки:",
            state.playersInfo.map((p) => ({
                id: p.id,
                order: p.order,
                name: p.name,
                isTurn: p.order === state.game.turnIndex
            }))
        );

        const actingPlayer = state.game.players.find(
            (p) => String(p.id) === String(playerId)
        );

        if (!actingPlayer) {
            console.log("[PLAY_CARD] Игрок не найден");
            return;
        }

        console.log("[PLAY_CARD] Игрок, совершающий ход:", {
            id: actingPlayer.id,
            order: actingPlayer.order,
            name: actingPlayer.name,
            turnIndex: state.game.turnIndex
        });

        // Проверка: нельзя ходить, если есть пенальти (кроме хапежа)
        if (state.game.pendingPenalty > 0 && card.type !== "khapezh") {
            console.log("[PLAY_CARD] Нельзя ходить при пенальти. Пенальти:", state.game.pendingPenalty);
            
            const errorLog = await logGameAction(gameId, {
                playerId,
                playerName: actingPlayer.name,
                action: "invalid_play_during_penalty",
                cardType: card.type,
                details: {
                    pendingPenalty: state.game.pendingPenalty,
                    allowedCard: "khapezh_only",
                },
            });
            
            if (errorLog) await broadcastLogUpdate(io, gameId, errorLog);
            return;
        }

        const topCard = JSON.parse(state.game.currentCard || "{}");
        const isMyTurn = actingPlayer.order === state.game.turnIndex;
        const isIntercept = canIntercept(card, topCard);
        
        console.log("[PLAY_CARD] Проверка хода:", {
            isMyTurn,
            isIntercept,
            playerOrder: actingPlayer.order,
            turnIndex: state.game.turnIndex,
            cardType: card.type,
            topCardType: topCard.type
        });

        if (!isMyTurn && !isIntercept) {
            console.log("[PLAY_CARD] Не очередь игрока и не интерцепт");
            
            const errorLog = await logGameAction(gameId, {
                playerId,
                playerName: actingPlayer.name,
                action: "out_of_turn_attempt",
                cardType: card.type,
                details: {
                    isMyTurn,
                    isIntercept,
                    currentTurnOrder: state.game.turnIndex,
                    playerOrder: actingPlayer.order,
                },
            });
            
            if (errorLog) await broadcastLogUpdate(io, gameId, errorLog);
            return;
        }

        // Вычисляем следующий ход
        const { nextIndex, nextDirection, isStall } = calculateNextTurn(
            actingPlayer.order,
            state.game.direction,
            state.game.players.length,
            card.type
        );

        console.log("[PLAY_CARD] Результат calculateNextTurn:", {
            actingPlayerOrder: actingPlayer.order,
            playerCount: state.game.players.length,
            cardType: card.type,
            nextIndex,
            nextDirection,
            isStall,
            isKhlopkopit: card.type === "khlopkopit"
        });

        // Обработка пенальти
        let newPenalty = state.game.pendingPenalty;
        if (card.type === "khapezh") {
            // Хапеж: добавляем +3 к существующему пенальти или устанавливаем 3
            if (state.game.pendingPenalty > 0) {
                newPenalty += 3;
                console.log("[PLAY_CARD] Добавляем 3 к существующему пенальти. Итого:", newPenalty);
            } else {
                newPenalty = 3;
                console.log("[PLAY_CARD] Устанавливаем пенальти 3");
            }
        } else if (!state.game.pendingPenalty) {
            // Если пенальти нет, обнуляем
            newPenalty = 0;
        }

        console.log("[PLAY_CARD] Новый пенальти:", newPenalty);

        // Обновляем руку игрока
        const currentHand = JSON.parse(actingPlayer.hand || "[]");
        const newHand = currentHand.filter((c) => c.id !== card.id);
        const isWin = newHand.length === 0;

        // Добавляем текущую карту в сброс
        const discardPile = JSON.parse(state.game.discardPile || "[]");
        if (state.game.currentCard) {
            discardPile.push(JSON.parse(state.game.currentCard));
        }

        // Определяем следующий статус - КЛЮЧЕВОЕ МЕСТО!
        let nextStatus = "PLAYING";
        if (isWin) {
            nextStatus = "FINISHED";
            console.log("[PLAY_CARD] Игрок победил!");
        } else if (card.type === "khlopkopit" || isStall) {
            nextStatus = "CHLOPKOPIT";
            console.log("[PLAY_CARD] Активируем режим ХЛОПКОПЫТ! (isStall:", isStall, ")");
        }

        console.log("[PLAY_CARD] Следующий статус игры:", nextStatus);

        // Логируем действие
        const logEntry = await logGameAction(gameId, {
            playerId,
            playerName: actingPlayer.name,
            action: isIntercept ? "intercept_card" : "play_card",
            cardType: card.type,
            cardColor: chosenColor || card.color,
            details: {
                isIntercept,
                isMyTurn,
                isStall,
                isWin,
                newPenalty,
                handSizeBefore: currentHand.length,
                handSizeAfter: newHand.length,
                nextPlayerIndex: nextIndex,
                nextDirection,
                nextStatus,
                isKhlopkopit: card.type === "khlopkopit"
            },
        });

        if (logEntry) await broadcastLogUpdate(io, gameId, logEntry);

        // Логируем победу, если есть
        if (isWin) {
            const winLog = await logGameAction(gameId, {
                playerId,
                playerName: actingPlayer.name,
                action: "win_game",
                details: {
                    finalHandSize: newHand.length,
                    totalPlayers: state.game.players.length,
                },
            });
            if (winLog) await broadcastLogUpdate(io, gameId, winLog);
        }

        // Вычисляем следующий ход
        const finalNextIndex = (card.type === "khlopkopit" || isStall) 
            ? actingPlayer.order  // Хлопкопыт: ход остается у текущего игрока
            : nextIndex;

        console.log("[PLAY_CARD] Обновление БД. Следующий ход:", finalNextIndex, "Статус:", nextStatus);

        // Обновляем базу данных
        await prisma.$transaction([
            prisma.player.update({
                where: { id: playerId },
                data: { hand: JSON.stringify(newHand) },
            }),
            prisma.game.update({
                where: { id: gameId },
                data: {
                    currentCard: JSON.stringify({
                        ...card,
                        color: chosenColor || card.color,
                        instanceId: generateInstanceId('play')
                    }),
                    discardPile: JSON.stringify(discardPile),
                    turnIndex: finalNextIndex,
                    direction: nextDirection,
                    pendingPenalty: newPenalty,
                    status: nextStatus,
                    ...(isWin && { winnerId: playerId })
                },
            }),
        ]);

        console.log("[PLAY_CARD] Ход завершен. Отправка обновленного состояния...");
        await broadcastFullState(io, gameId);

    } catch (e) {
        console.error("[SERVER] PLAY_CARD_ERROR:", e);
        
        const errorLog = await logGameAction(gameId, {
            playerId,
            action: 'play_card_error',
            details: { error: e.message, stack: e.stack }
        });
        
        if (errorLog) await broadcastLogUpdate(io, gameId, errorLog);
    }
};