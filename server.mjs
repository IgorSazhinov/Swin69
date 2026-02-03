import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { canPlayCard, canIntercept, calculateNextTurn, generateInstanceId, reshuffleDeck } from "./src/lib/game-engine.mjs";
import { getFullGameState, executeTakePenalty, prisma } from "./src/lib/game-service.mjs";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handle);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
  });

  /**
   * Функция broadcastFullState
   * Отвечает за полную синхронизацию всех клиентов в игре.
   * Рассылает общие данные стола и персональные данные рук.
   */
  const broadcastFullState = async (gameId) => {
    try {
      console.log(`[SERVER] Starting broadcast for game: ${gameId}`);
      const state = await getFullGameState(gameId);
      
      if (!state) {
        console.error(`[SERVER] State not found for game: ${gameId}`);
        return;
      }

      // 1. Отправляем общее состояние всем игрокам в комнате gameId
      io.to(gameId).emit("card_played", {
        card: JSON.parse(state.game.currentCard || "{}"),
        nextPlayerId: state.currentPlayerId,
        allPlayers: state.playersInfo,
        status: state.game.status,
        winnerId: state.game.winnerId,
        direction: state.game.direction,
        pendingPenalty: state.game.pendingPenalty
      });

      // 2. Отправляем персональное обновление руки каждому игроку индивидуально
      // Это критически важно для механики Хапежа, чтобы карты появлялись без рефреша
      for (const player of state.game.players) {
        const personalRoom = String(player.id);
        const playerHand = JSON.parse(player.hand || "[]");
        
        io.to(personalRoom).emit("hand_updated", {
          hand: playerHand
        });
        
        console.log(`[SERVER] Personal hand sent to player: ${player.name} (${player.id})`);
      }
      
      console.log(`[SERVER] Broadcast for game ${gameId} finished successfully.`);
    } catch (error) {
      console.error("[SERVER] Broadcast Critical Error:", error);
    }
  };

  io.on("connection", (socket) => {
    console.log(">>> [SOCKET] New connection:", socket.id);

    // Обработка входа в игру
    socket.on("join_game", async ({ gameId, playerId }) => {
      try {
        if (!gameId || !playerId) {
          console.error("[SOCKET] Join failed: Missing gameId or playerId");
          return;
        }
        
        socket.join(gameId);
        socket.join(String(playerId)); // Подписка на личный канал обновлений
        
        console.log(`[SOCKET] Player ${playerId} joined game ${gameId}`);
        await broadcastFullState(gameId);
      } catch (error) {
        console.error("[SOCKET] JOIN_GAME_ERROR:", error);
      }
    });

    // Основной лог разыгрывания карты
    socket.on("play_card", async ({ gameId, card, playerId, chosenColor }) => {
      try {
        console.log(`[SOCKET] play_card attempt by ${playerId}`);
        
        const state = await getFullGameState(gameId);
        if (!state || state.game.status !== 'PLAYING') {
          console.log("[SOCKET] Play blocked: Game not found or not in PLAYING status");
          return;
        }

        const actingPlayer = state.game.players.find(p => String(p.id) === String(playerId));
        if (!actingPlayer) {
          console.error("[SOCKET] Play blocked: Acting player not found in DB");
          return;
        }

        // ЛОГИКА ШТРАФА (ХАПЕЖ): 
        // Если на игроке висит штраф, он обязан либо перевести его Хапежом, либо взять карты.
        if (state.game.pendingPenalty > 0 && card.type !== 'khapezh') {
          console.log("[SOCKET] Play blocked: Player must resolve pending penalty first");
          return;
        }

        const topCard = JSON.parse(state.game.currentCard || "{}");
        const isMyTurn = actingPlayer.order === state.game.turnIndex;
        const isIntercept = canIntercept(card, topCard);

        // Проверка: чей ход или перехват
        if (!isMyTurn && !isIntercept) {
          console.log("[SOCKET] Play blocked: Not player turn and not a valid intercept");
          return;
        }

        // Вычисляем следующий ход через движок
        // ВАЖНО: step для Хапежа теперь 1, ход идет к ЖЕРТВЕ
        const { nextIndex, nextDirection } = calculateNextTurn(
          actingPlayer.order,
          state.game.direction,
          state.game.players.length,
          card.type
        );

        // Расчет накопления штрафа
        let newPenalty = state.game.pendingPenalty;
        if (card.type === 'khapezh') {
          newPenalty += 3;
        }

        const currentHand = JSON.parse(actingPlayer.hand || "[]");
        const newHand = currentHand.filter(c => c.id !== card.id);
        const isWin = newHand.length === 0;

        const discardPile = JSON.parse(state.game.discardPile || "[]");
        if (state.game.currentCard) {
          discardPile.push(JSON.parse(state.game.currentCard));
        }

        // Атомарная транзакция обновления БД
        await prisma.$transaction([
          prisma.player.update({ 
            where: { id: playerId }, 
            data: { hand: JSON.stringify(newHand) } 
          }),
          prisma.game.update({ 
            where: { id: gameId }, 
            data: { 
              currentCard: JSON.stringify({ 
                ...card, 
                color: chosenColor || card.color, 
                instanceId: generateInstanceId(isIntercept ? 'int' : 'p') 
              }), 
              turnIndex: nextIndex, 
              direction: nextDirection,
              pendingPenalty: newPenalty,
              status: isWin ? 'FINISHED' : 'PLAYING',
              winnerId: isWin ? playerId : null,
              discardPile: JSON.stringify(discardPile)
            } 
          })
        ]);

        console.log(`[SOCKET] Card ${card.type} played. Next index: ${nextIndex}, Penalty: ${newPenalty}`);
        await broadcastFullState(gameId);

        // Специальное событие для Хлопкопыта
        if (card.type === 'khlopokopyt') {
          io.to(gameId).emit("start_khlopokopyt", { message: "БЕЙ!" });
        }

      } catch (error) {
        console.error("[SOCKET] PLAY_CARD_ERROR:", error);
      }
    });

    // Обработка события нажатия кнопки "ВЗЯТЬ КАРТЫ" (Штраф)
    socket.on("take_penalty", async ({ gameId, playerId }) => {
      try {
        console.log(`[SOCKET] take_penalty triggered by ${playerId}`);
        const result = await executeTakePenalty(gameId, playerId);
        if (result) {
          console.log(`[SOCKET] Penalty executed for ${playerId}`);
          await broadcastFullState(gameId);
        }
      } catch (error) {
        console.error("[SOCKET] TAKE_PENALTY_ERROR:", error);
      }
    });

    // Взятие карты из колоды (обычный добор)
    socket.on("draw_card", async ({ gameId, playerId }) => {
      try {
        const state = await getFullGameState(gameId);
        if (!state || String(state.currentPlayerId) !== String(playerId)) {
          console.log("[SOCKET] Draw blocked: Not player turn");
          return;
        }
        
        let deck = JSON.parse(state.game.deck || "[]");
        
        // Перемешивание сброса если колода пуста
        if (deck.length === 0) {
          console.log("[SOCKET] Deck empty, reshuffling discard pile...");
          const discardPile = JSON.parse(state.game.discardPile || "[]");
          const reshuffled = reshuffleDeck(discardPile);
          if (!reshuffled) {
            console.log("[SOCKET] Reshuffle failed: Not enough cards");
            return;
          }
          deck = reshuffled.newDeck;
          await prisma.game.update({
            where: { id: gameId },
            data: { 
              deck: JSON.stringify(deck), 
              discardPile: JSON.stringify(reshuffled.newDiscardPile) 
            }
          });
        }

        const topCardOnTable = JSON.parse(state.game.currentCard || "{}");
        // Берем верхнюю карту (deck)
        const drawnCard = { ...deck[0], instanceId: generateInstanceId('draw') };

        if (!canPlayCard(drawnCard, topCardOnTable)) {
          // Если сыграть нельзя - просто кладем в руку и переводим ход
          deck.shift();
          const player = state.game.players.find(p => String(p.id) === String(playerId));
          const currentHand = JSON.parse(player.hand || "[]");
          const newHand = [...currentHand, drawnCard];
          
          const nextIdx = (state.game.turnIndex + state.game.direction + state.game.players.length) % state.game.players.length;

          await prisma.$transaction([
            prisma.player.update({ where: { id: playerId }, data: { hand: JSON.stringify(newHand) } }),
            prisma.game.update({ where: { id: gameId }, data: { deck: JSON.stringify(deck), turnIndex: nextIdx } })
          ]);

          console.log(`[SOCKET] Player ${playerId} drew and kept the card.`);
          await broadcastFullState(gameId);
        } else {
          // Если карту можно сыграть - отправляем превью игроку
          console.log(`[SOCKET] Player ${playerId} drew a playable card. Sending preview.`);
          socket.emit("drawn_card_preview", { card: drawnCard });
        }
      } catch (error) {
        console.error("[SOCKET] DRAW_CARD_ERROR:", error);
      }
    });

    // Подтверждение игры или сохранения вытянутой карты
    socket.on("confirm_draw", async ({ gameId, playerId, action, chosenColor }) => {
      try {
        const state = await getFullGameState(gameId);
        if (!state || String(state.currentPlayerId) !== String(playerId)) return;

        let deck = JSON.parse(state.game.deck || "[]");
        const drawnCardRaw = deck.shift();
        if (!drawnCardRaw) return;

        const instanceId = generateInstanceId('confirm');

        if (action === 'play') {
          // Игрок решил сразу сыграть вытянутую карту
          const { nextIndex, nextDirection } = calculateNextTurn(
            state.game.turnIndex, 
            state.game.direction, 
            state.game.players.length, 
            drawnCardRaw.type
          );
          
          let newPenalty = state.game.pendingPenalty + (drawnCardRaw.type === 'khapezh' ? 3 : 0);

          await prisma.game.update({
            where: { id: gameId },
            data: { 
              currentCard: JSON.stringify({ ...drawnCardRaw, color: chosenColor || drawnCardRaw.color, instanceId }), 
              turnIndex: nextIndex, 
              direction: nextDirection,
              deck: JSON.stringify(deck),
              pendingPenalty: newPenalty
            }
          });
          console.log(`[SOCKET] Player ${playerId} confirmed PLAY after draw.`);
        } else {
          // Игрок решил оставить карту себе (пропуск хода)
          const player = state.game.players.find(p => String(p.id) === String(playerId));
          const currentHand = JSON.parse(player.hand || "[]");
          const newHand = [...currentHand, { ...drawnCardRaw, instanceId }];
          
          const nextIdx = (state.game.turnIndex + state.game.direction + state.game.players.length) % state.game.players.length;

          await prisma.$transaction([
            prisma.player.update({ where: { id: playerId }, data: { hand: JSON.stringify(newHand) } }),
            prisma.game.update({ where: { id: gameId }, data: { deck: JSON.stringify(deck), turnIndex: nextIdx } })
          ]);
          console.log(`[SOCKET] Player ${playerId} confirmed KEEP after draw.`);
        }
        
        await broadcastFullState(gameId);
      } catch (error) {
        console.error("[SOCKET] CONFIRM_DRAW_ERROR:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("<<< [SOCKET] Player disconnected:", socket.id);
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`\n--------------------------------------------`);
    console.log(`>>> СВИНТУС ГЕЙТУС ЗАПУЩЕН НА ПОРТУ ${PORT} <<<`);
    console.log(`--------------------------------------------\n`);
  });
});