import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request, 
  // В Next.js 15 params — это Promise
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    // Распаковываем params перед использованием
    const { id } = await params;

    const player = await prisma.player.findUnique({
      where: { id: id }
    });

    if (!player) {
      return NextResponse.json({ error: 'Игрок не найден' }, { status: 404 });
    }

    return NextResponse.json({
      name: player.name,
      hand: JSON.parse(player.hand) // Парсим строку из SQLite обратно в массив
    });
  } catch (error) {
    console.error("Ошибка API player:", error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}