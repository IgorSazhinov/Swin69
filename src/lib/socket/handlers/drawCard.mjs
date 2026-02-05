import { canPlayCard, generateInstanceId, reshuffleDeck } from "../../game-engine.mjs";
import { getFullGameState, prisma } from "../../game-service.mjs";
import { broadcastFullState } from "../broadcaster.mjs";
import { logGameAction } from "../../game-log-service.mjs"; // НОВЫЙ ИМПОРТ

export const handleDrawCard = async (io, socket, data) => {
  const { gameId, playerId } = data;
  
  try {
    const state = await getFullGameState(gameId);
    if (!state || state.currentPlayerId !== String(playerId)) return;
    
    const player = state.game.players.find(p => String(p.id) === String(playerId));
    if (!player) return;

    // ЛОГИРОВАНИЕ: Начало взятия карты
    await logGameAction(gameId, {
      playerId,
      playerName: player.name,
      action: 'draw_card_start'
    });

    let deck = JSON.parse(state.game.deck || "[]");
    
    // Если колода пуста, перемешиваем сброс
    if (deck.length === 0) {
      const discardPile = JSON.parse(state.game.discardPile || "[]");
      const reshuffled = reshuffleDeck(discardPile);
      
      if (!reshuffled) return;
      
      deck = reshuffled.newDeck;
      
      // ЛОГИРОВАНИЕ: Перемешивание колоды
      await logGameAction(gameId, {
        action: 'reshuffle_deck',
        details: {
          discardedCards: discardPile.length - 1,
          newDeckSize: deck.length
        }
      });
      
      await prisma.game.update({
        where: { id: gameId },
        data: {
          deck: JSON.stringify(deck),
          discardPile: JSON.stringify(reshuffled.newDiscardPile)
        }
      });
    }

    const drawnCard = { ...deck[0], instanceId: generateInstanceId('draw') };
    const topCard = JSON.parse(state.game.currentCard || "{}");
    
    // Если карту нельзя сыграть сразу
    if (!canPlayCard(drawnCard, topCard)) {
      deck.shift();
      const currentHand = JSON.parse(player.hand || "[]");
      const newHand = [...currentHand, drawnCard];
      
      const nextIdx = (state.game.turnIndex + state.game.direction + state.game.players.length) % state.game.players.length;
      
      // ЛОГИРОВАНИЕ: Карта взята в руку
      await logGameAction(gameId, {
        playerId,
        playerName: player.name,
        action: 'draw_card_to_hand',
        cardType: drawnCard.type,
        cardColor: drawnCard.color,
        details: {
          canPlay: false,
          newHandSize: newHand.length
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
      
      await broadcastFullState(io, gameId);
    } else {
      // ЛОГИРОВАНИЕ: Карту можно сыграть - отправляем предпросмотр
      await logGameAction(gameId, {
        playerId,
        playerName: player.name,
        action: 'draw_card_preview',
        cardType: drawnCard.type,
        cardColor: drawnCard.color,
        details: {
          canPlay: true,
          previewSent: true
        }
      });
      
      socket.emit("drawn_card_preview", { card: drawnCard });
    }
    
  } catch (e) {
    console.error("DRAW_CARD_ERROR:", e);
    
    // ЛОГИРОВАНИЕ: Ошибка
    await logGameAction(gameId, {
      playerId,
      action: 'draw_card_error',
      details: { error: e.message }
    });
  }
};