import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateDeck } from '@/lib/deck';
import { logGameAction } from '@/lib/game-log-service'; // Добавить этот импорт

export async function POST() {
  try {
    const fullDeck = generateDeck();
    const firstCardIndex = fullDeck.findIndex(c => c.type === 'number');
    const [firstCard] = fullDeck.splice(firstCardIndex, 1);

    const game = await prisma.game.create({
      data: {
        status: 'LOBBY',
        currentCard: JSON.stringify(firstCard),
        deck: JSON.stringify(fullDeck),
        discardPile: JSON.stringify([firstCard]),
        direction: 1,
        turnIndex: 0,
      },
    });

    // ЛОГИРОВАНИЕ: Создание игры
    await logGameAction(game.id, {
      action: 'game_created',
      details: {
        deckSize: fullDeck.length,
        firstCard: firstCard
      }
    });

    return NextResponse.json({ gameId: game.id });
  } catch (error) {
    console.error("CREATE GAME ERROR:", error);
    return NextResponse.json({ error: 'Ошибка создания игры' }, { status: 500 });
  }
}