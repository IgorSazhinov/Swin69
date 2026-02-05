import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;
    
    const logs = await prisma.gameLog.findMany({
      where: { gameId },
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: {
        player: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    const formattedLogs = logs.map(log => ({
      id: log.id,
      playerId: log.playerId,
      playerName: log.playerName || log.player?.name || 'Игрок',
      action: log.action,
      cardType: log.cardType,
      cardColor: log.cardColor,
      details: log.details, // Не парсим здесь
      timestamp: log.timestamp.toISOString()
    }));
    
    return NextResponse.json({ logs: formattedLogs });
    
  } catch (error) {
    console.error("[API] Game log error:", error);
    return NextResponse.json(
      { error: 'Ошибка получения лога игры' },
      { status: 500 }
    );
  }
}