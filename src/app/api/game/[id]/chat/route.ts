import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;
    
    const messages = await prisma.chatMessage.findMany({
      where: { gameId },
      orderBy: { timestamp: 'asc' },
      take: 200,
      include: {
        player: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      playerId: msg.playerId,
      playerName: msg.playerName || msg.player?.name,
      message: msg.message,
      timestamp: msg.timestamp.toISOString()
    }));
    
    return NextResponse.json({ messages: formattedMessages });
    
  } catch (error) {
    console.error("[API] Chat history error:", error);
    return NextResponse.json(
      { error: 'Ошибка получения истории чата' },
      { status: 500 }
    );
  }
}