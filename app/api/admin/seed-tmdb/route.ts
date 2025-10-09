import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/admin-auth';
import { tmdbService } from '@/lib/services/tmdb';
import { adminService } from '@/lib/services/admin';
import { rateLimitMiddleware } from '@/lib/middleware/rate-limiting';

async function handlePost(request: NextRequest) {
  const rateLimitResult = await rateLimitMiddleware(request, 'admin');
  if (rateLimitResult) return rateLimitResult;

  try {
    const { type, maxPages = 5 } = await request.json();

    if (!['movies', 'tv_shows'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either "movies" or "tv_shows"' },
        { status: 400 }
      );
    }

    let items: any[] = [];
    let totalFetched = 0;

    if (type === 'movies') {
      const result = await tmdbService.seedMovies(maxPages);
      items = result.movies;
      totalFetched = result.totalFetched;
    } else {
      const result = await tmdbService.seedTVShows(maxPages);
      items = result.shows;
      totalFetched = result.totalFetched;
    }

    const inserted = await adminService.bulkCreateItems(items);

    return NextResponse.json({
      success: true,
      totalFetched,
      totalInserted: inserted,
      type
    });
  } catch (error) {
    console.error('Error seeding TMDB data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to seed data' },
      { status: 500 }
    );
  }
}

export const POST = requireRole('content_manager')(handlePost);
