import {
  canIntercept,
  calculateNextTurn,
  generateInstanceId,
} from "../../game-engine.mjs";
import { getFullGameState, prisma } from "../../game-service.mjs";
import { broadcastFullState, broadcastLogUpdate } from "../broadcaster.mjs";
import { logGameAction } from "../../game-log-service.mjs";

export const handlePlayCard = async (io, socket, data) => {
  const { gameId, card, playerId, chosenColor } = data;

  console.log("[PLAY_CARD] Начало. Карта:", card.type, "Игрок:", playerId);

  try {
    const state = await getFullGameState(gameId);
    if (!state || state.game.status !== "PLAYING") return;

    console.log("[PLAY_CARD] Текущий turnIndex:", state.game.turnIndex);
    console.log(
      "[PLAY_CARD] Игроки:",
      state.playersInfo.map((p) => ({ id: p.id, order: p.order, name: p.name }))
    );

    const actingPlayer = state.game.players.find(
      (p) => String(p.id) === String(playerId)
    );
    if (!actingPlayer) return;

    console.log("[PLAY_CARD] Играющий игрок:", {
      id: actingPlayer.id,
      order: actingPlayer.order,
      name: actingPlayer.name,
    });

    // (хапеж), если есть pendingPenalty > 0
    if (state.game.pendingPenalty > 0 && card.type !== "khapezh") {
      console.log("[PLAY_CARD] Попытка сыграть не хапеж при активном штрафе");

      // Логирование попытки сыграть не хапеж при штрафе
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

    console.log("[PLAY_CARD] isMyTurn:", isMyTurn, "isIntercept:", isIntercept);

    if (!isMyTurn && !isIntercept) {
      console.log("[PLAY_CARD] Попытка сыграть не в свой ход и не перехват");

      // Логирование попытки сыграть не в свой ход
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

    // рассчитать следующий ход
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
    });

    // Логика штрафа хапежа
    let newPenalty = state.game.pendingPenalty;

    if (card.type === "khapezh") {
      // Если уже есть штраф - это перехват хапежа
      if (state.game.pendingPenalty > 0) {
        newPenalty += 3; // Увеличиваем существующий штраф
        console.log("[PLAY_CARD] Перехват хапежа! Штраф увеличен:", newPenalty);
      } else {
        // Первый хапеж в цепочке
        newPenalty = 3;
        console.log("[PLAY_CARD] Первый хапеж. Штраф установлен:", newPenalty);
      }
    } else if (!state.game.pendingPenalty) {
      // Если играется не-хапеж и нет активного штрафа
      newPenalty = 0;
    }
    // Если играется не-хапеж при активном штрафе - этот случай уже отсеян выше

    console.log("[PLAY_CARD] Итоговый штраф после игры:", newPenalty);

    const currentHand = JSON.parse(actingPlayer.hand || "[]");
    const newHand = currentHand.filter((c) => c.id !== card.id);
    const isWin = newHand.length === 0;

    const discardPile = JSON.parse(state.game.discardPile || "[]");
    if (state.game.currentCard) {
      discardPile.push(JSON.parse(state.game.currentCard));
    }

    // определить следующий статус
    let nextStatus = "PLAYING";
    if (isWin) {
      nextStatus = "FINISHED";
    } else if (isStall) {
      nextStatus = "CHLOPKOPIT";
    }

    // ЛОГИРОВАНИЕ: Успешная игра карты
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
      },
    });

    // Отправляем обновление лога всем игрокам
    if (logEntry) await broadcastLogUpdate(io, gameId, logEntry);

    if (isWin) {
      // ЛОГИРОВАНИЕ: Победа
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

    const finalNextIndex = isStall ? actingPlayer.order : nextIndex;

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
            instanceId: generateInstanceId(isIntercept ? "int" : "p"),
          }),
          turnIndex: finalNextIndex,
          direction: nextDirection,
          pendingPenalty: newPenalty,
          status: nextStatus,
          winnerId: isWin ? playerId : null,
          discardPile: JSON.stringify(discardPile),
          chloppedPlayerIds: isStall ? JSON.stringify([]) : undefined,
        },
      }),
    ]);

    console.log(
      "[PLAY_CARD] Обновление БД завершено. Новый turnIndex:",
      finalNextIndex
    );
    console.log("[PLAY_CARD] Новый статус:", nextStatus);

    await broadcastFullState(io, gameId);
  } catch (e) {
    console.error("[SERVER] PLAY_CARD_ERROR:", e);

    // Логирование ошибки
    const errorLog = await logGameAction(gameId, {
      playerId,
      action: "play_card_error",
      details: { error: e.message },
    });

    if (errorLog) await broadcastLogUpdate(io, gameId, errorLog);
  }
};
