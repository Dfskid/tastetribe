import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/admin-auth';
import { adminService } from '@/lib/services/admin';
import { z } from 'zod';
import { rateLimitMiddleware } from '@/lib/middleware/rate-limiting';

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  icon: z.string().optional(),
  active: z.boolean().optional(),
  recommendation_config: z.object({
    algorithm: z.string(),
    weights: z.record(z.number()),
    min_ratings: z.number()
  }).optional()
});

async function handleGet(request: NextRequest) {
  const rateLimitResult = await rateLimitMiddleware(request, 'admin');
  if (rateLimitResult) return rateLimitResult;

  try {
    const categories = await adminService.getAllCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

async function handlePost(request: NextRequest) {
  const rateLimitResult = await rateLimitMiddleware(request, 'admin');
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();
    const validated = categorySchema.parse(body);

    const category = await adminService.createCategory(validated as any);

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

export const GET = requireRole('content_manager')(handleGet);
export const POST = requireRole('content_manager')(handlePost);
