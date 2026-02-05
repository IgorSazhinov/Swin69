import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { gameId, playerId, playerName, message } = await req.json();
    
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Сообщение не может быть пустым' },
        { status: 400 }
      );
    }
    
    if (message.length > 500) {
      return NextResponse.json(
        { error: 'Сообщение слишком длинное (макс. 500 символов)' },
        { status: 400 }
      );
    }
    
    const chatMessage = await prisma.chatMessage.create({
      data: {
        gameId,
        playerId,
        playerName,
        message: message.trim()
      },
      include: {
        player: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    return NextResponse.json({
      id: chatMessage.id,
      playerId: chatMessage.playerId,
      playerName: chatMessage.playerName || chatMessage.player?.name,
      message: chatMessage.message,
      timestamp: chatMessage.timestamp
    });
    
  } catch (error) {
    console.error("[API] Send chat error:", error);
    return NextResponse.json(
      { error: 'Ошибка отправки сообщения' },
      { status: 500 }
    );
  }
}