import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const lang = searchParams.get('lang');
  const resolvePath = (path: string) =>
    lang === 'en' || lang === 'ja' ? `${path}?lang=${lang}` : path;
  const resolveUrl = (path: string) => new URL(resolvePath(path), requestUrl);

  try {
    const excludeIdParam = searchParams.get('excludeId');
    const excludeId = excludeIdParam ? Number.parseInt(excludeIdParam, 10) : null;
    const excludeGame = searchParams.get('game')?.trim() || '';

    const baseWhere: { id?: { not: number }; game_name?: { not: string } } = {};
    if (excludeId && Number.isFinite(excludeId)) {
      baseWhere.id = { not: excludeId };
    }
    if (excludeGame) {
      baseWhere.game_name = { not: excludeGame };
    }

    const hasFilters = Object.keys(baseWhere).length > 0;
    let where = hasFilters ? baseWhere : undefined;
    let count = await prisma.glitch.count({ where });

    if (count === 0) {
      if (excludeGame) {
        where = baseWhere.id ? { id: baseWhere.id } : undefined;
        count = await prisma.glitch.count({ where });
      }
      if (count === 0) {
        return NextResponse.redirect(resolveUrl('/'));
      }
    }

    const skip = Math.floor(Math.random() * count);
    const [glitch] = await prisma.glitch.findMany({
      where,
      select: { id: true },
      take: 1,
      skip,
      orderBy: { id: 'asc' },
    });

    if (!glitch) {
      return NextResponse.redirect(resolveUrl('/'));
    }

    return NextResponse.redirect(resolveUrl(`/glitch/${glitch.id}`));
  } catch (error) {
    console.error('Error selecting random glitch:', error);
    return NextResponse.redirect(resolveUrl('/'));
  }
}
