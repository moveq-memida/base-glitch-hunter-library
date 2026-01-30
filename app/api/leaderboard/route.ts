import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, getGameLeaderboard } from '@/lib/ranking';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const game = searchParams.get('game');

    if (game) {
      const entries = await getGameLeaderboard(game, limit, offset);
      return NextResponse.json({
        entries,
        game,
        limit,
        offset,
      });
    }

    const entries = await getLeaderboard(limit, offset);
    return NextResponse.json({
      entries,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
