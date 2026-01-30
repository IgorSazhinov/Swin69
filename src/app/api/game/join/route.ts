import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { gameId, playerName } = await req.json();

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return NextResponse.json({ error: 'Игра не найдена' }, { status: 404 });

    // Достаем общую колоду из БД
    let currentDeck = JSON.parse(game.deck || "[]");
    const playerCount = await prisma.player.count({ where: { gameId } });

    // Раздаем 8 УНИКАЛЬНЫХ карт из этой колоды
    const playerHand = currentDeck.splice(0, 8);

    // Обновляем игру и создаем игрока одной транзакцией
    const [player] = await prisma.$transaction([
      prisma.player.create({
        data: {
          name: playerName,
          gameId: gameId,
          order: playerCount,
          hand: JSON.stringify(playerHand),
        },
      }),
      prisma.game.update({
        where: { id: gameId },
        data: { deck: JSON.stringify(currentDeck) } // Сохраняем похудевшую колоду
      })
    ]);

    return NextResponse.json({ playerId: player.id, hand: playerHand });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка входа' }, { status: 500 });
  }
}