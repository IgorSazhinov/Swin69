import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateDeck } from '@/lib/deck';

export async function POST() {
  try {
    const fullDeck = generateDeck();
    
    // Ищем первую цифровую карту для старта (чтобы не начинать с Хапежа)
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

    return NextResponse.json({ gameId: game.id });
  } catch (error) {
    console.error("CREATE GAME ERROR:", error);
    return NextResponse.json({ error: 'Ошибка при создании записи в БД' }, { status: 500 });
  }
}