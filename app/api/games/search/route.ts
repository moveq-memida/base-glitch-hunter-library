import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = Math.min(20, parseInt(searchParams.get('limit') || '10', 10));

    if (query.length < 2) {
      return NextResponse.json([]);
    }

    // First try to find in the Game table
    const games = await prisma.game.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { aliases: { hasSome: [query] } },
        ],
      },
      take: limit,
      select: {
        id: true,
        slug: true,
        name: true,
        aliases: true,
      },
    });

    if (games.length > 0) {
      return NextResponse.json(games);
    }

    // Fallback: search unique game names from Glitch table
    const uniqueGames = await prisma.glitch.groupBy({
      by: ['game_name'],
      where: {
        game_name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      orderBy: {
        game_name: 'asc',
      },
      take: limit,
    });

    // Format as Game-like objects
    const formattedGames = uniqueGames.map((g, index) => ({
      id: -(index + 1), // Negative ID to indicate it's not from Game table
      slug: encodeURIComponent(g.game_name),
      name: g.game_name,
      aliases: [],
    }));

    return NextResponse.json(formattedGames);
  } catch (error) {
    console.error('Error searching games:', error);
    return NextResponse.json(
      { error: 'Failed to search games' },
      { status: 500 }
    );
  }
}
