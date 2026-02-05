import { prisma } from "./game-service.mjs";

// ЛОГИРОВАНИЕ ДЕЙСТВИЙ В ИГРЕ
export const logGameAction = async (gameId, data) => {
  try {
    const { playerId, playerName, action, cardType, cardColor, details } = data;

    const logEntry = await prisma.gameLog.create({
      data: {
        gameId,
        playerId,
        playerName,
        action,
        cardType,
        cardColor,
        details: details ? JSON.stringify(details) : null,
      },
    });

    console.log("[GAME_LOG] Записано действие:", {
      gameId,
      playerName,
      action,
      cardType,
    });

    return logEntry;
  } catch (error) {
    console.error("[GAME_LOG] Ошибка:", error);
    return null;
  }
};

// ПОЛУЧЕНИЕ ЛОГА ИГРЫ
export const getGameLogs = async (gameId, limit = 50) => {
  try {
    const logs = await prisma.gameLog.findMany({
      where: { gameId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        player: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    // Форматируем лог для клиента
    return logs.map(log => ({
      id: log.id,
      playerId: log.playerId,
      playerName: log.playerName || log.player?.name || 'Игрок',
      action: log.action,
      cardType: log.cardType,
      cardColor: log.cardColor,
      details: log.details, // Оставляем как есть, будет обработано на клиенте
      timestamp: log.timestamp
    }));
  } catch (error) {
    console.error('[GAME_LOG] Ошибка получения логов:', error);
    return [];
  }
};

// ОТПРАВКА СООБЩЕНИЯ В ЧАТ
export const sendChatMessage = async (
  gameId,
  playerId,
  playerName,
  message
) => {
  try {
    const chatMessage = await prisma.chatMessage.create({
      data: {
        gameId,
        playerId,
        playerName,
        message,
      },
      include: {
        player: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log("[CHAT] Сообщение отправлено:", {
      gameId,
      playerName,
      message: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
    });

    return chatMessage;
  } catch (error) {
    console.error("[CHAT] Ошибка отправки сообщения:", error);
    return null;
  }
};

// ПОЛУЧЕНИЕ ИСТОРИИ ЧАТА
export const getChatHistory = async (gameId, limit = 100) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { gameId },
      orderBy: { timestamp: "asc" },
      take: limit,
      include: {
        player: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return messages.map((msg) => ({
      id: msg.id,
      playerId: msg.playerId,
      playerName: msg.playerName || msg.player?.name,
      message: msg.message,
      timestamp: msg.timestamp,
      isMyMessage: false, // Определяется на клиенте
    }));
  } catch (error) {
    console.error("[CHAT] Ошибка получения истории:", error);
    return [];
  }
};

export const formatLogForDisplay = (log) => {
  const { playerName, action, cardType, cardColor, details } = log;
  
  // Проверяем, является ли details уже объектом или строкой JSON
  let formattedDetails = {};
  try {
    if (details) {
      if (typeof details === 'string') {
        formattedDetails = JSON.parse(details);
      } else if (typeof details === 'object') {
        formattedDetails = details;
      }
    }
  } catch (e) {
    console.warn('[FORMAT_LOG] Ошибка парсинга details:', e);
    formattedDetails = {};
  }
  
  const messages = {
    'game_created': () => '🎮 Игра создана',
    'player_joined': () => `👤 ${playerName} присоединился к игре`,
    'play_card': () => `🃏 ${playerName} сыграл ${formatCard(cardType, cardColor)}`,
    'intercept_card': () => `⚡ ${playerName} перехватил картой ${formatCard(cardType, cardColor)}`,
    'draw_card_start': () => `🎴 ${playerName} тянет карту`,
    'draw_card_to_hand': () => `🤲 ${playerName} взял карту в руку`,
    'draw_card_preview': () => `👁️ ${playerName} может сыграть карту`,
    'play_preview_card': () => `🎯 ${playerName} сыграл карту из предпросмотра`,
    'keep_preview_card': () => `💾 ${playerName} оставил карту в руке`,
    'take_penalty': () => `⚠️ ${playerName} взял ${formattedDetails.cardsTaken || formattedDetails.penaltyCount || 0} карт штрафа`,
    'take_penalty_start': () => `⚠️ ${playerName} берет штраф`,
    'take_penalty_complete': () => `✅ ${playerName} взял штраф`,
    'chlop_tap': () => `👏 ${playerName} нажал хлоп`,
    'chlop_lose': () => `💥 ${playerName} проиграл хлопкопыт и взял 2 карты`,
    'win_game': () => `🏆 ${playerName} ПОБЕДИЛ!`,
    'chat_message': () => `💬 ${playerName}: ${formattedDetails.message || 'написал сообщение'}`,
    'invalid_play_during_penalty': () => `🚫 ${playerName} пытался сыграть не хапеж при активном штрафе`,
    'out_of_turn_attempt': () => `⏰ ${playerName} пытался сыграть не в свой ход`,
    'reshuffle_deck': () => `🔀 Колода перемешана (${formattedDetails.newDeckSize || 0} карт)`,
    'play_card_error': () => `❌ Ошибка при игре карты`,
    'take_penalty_error': () => `❌ Ошибка при взятии штрафа`,
    'chlop_error': () => `❌ Ошибка при хлопке`,
    'khapezh_played': () => `💣 ${playerName} кинул хапеж (+3 карты)`,
  };
  
  const formatter = messages[action];
  return formatter ? formatter() : `📝 ${playerName || 'Система'}: ${action}`;
};

const formatCard = (type, color) => {
  if (!type) return 'карту';
  
  const colorNames = {
    'red': '🔴',
    'green': '🟢', 
    'blue': '🔵',
    'yellow': '🟡',
    'multi': '🌈'
  };
  
  const typeNames = {
    'number': 'цифровую',
    'khlopkopit': '👣 Хлопкопыт',
    'tikhohryun': '🤫 Тихохрюн',
    'perekhryuk': '🔄 Перехрюк',
    'zakhrapin': '🐸 Захрапин',
    'khapezh': '💣 Хапеж',
    'polyhryun': '🎨 Полихрюн'
  };
  
  const colorText = colorNames[color] || '';
  const typeText = typeNames[type] || type;
  
  if (type === 'number') {
    return `${colorText} цифровую карту`;
  }
  
  return `${colorText} ${typeText}`.trim();
};