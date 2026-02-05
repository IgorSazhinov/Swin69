import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logGameAction } from '@/lib/game-log-service'; // Добавить этот импорт

export async function POST(req: Request) {
  try {
    const { gameId, playerName } = await req.json();
    
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });
    
    if (!game) return NextResponse.json({ error: 'Игра не найдена' }, { status: 404 });

    let currentDeck = JSON.parse(game.deck || "[]");
    const playerCount = await prisma.player.count({ where: { gameId } });
    
    const playerHand = currentDeck.splice(0, 8);

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
        data: { deck: JSON.stringify(currentDeck) }
      })
    ]);

    // ЛОГИРОВАНИЕ: Присоединение игрока
    await logGameAction(gameId, {
      playerId: player.id,
      playerName,
      action: 'player_joined',
      details: {
        order: playerCount,
        handSize: playerHand.length,
        totalPlayers: playerCount + 1
      }
    });

    return NextResponse.json({ 
      playerId: player.id, 
      hand: playerHand 
    });
    
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка присоединения' }, { status: 500 });
  }
}