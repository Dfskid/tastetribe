import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import { adminService } from '@/lib/services/admin';
import { z } from 'zod';

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  active: z.boolean().optional(),
  recommendation_config: z.object({
    algorithm: z.string(),
    weights: z.record(z.number()),
    min_ratings: z.number()
  }).optional()
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await withAdminAuth(request, 'content_manager');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const validated = updateCategorySchema.parse(body);

    const category = await adminService.updateCategory(params.id, validated);

    return NextResponse.json({ category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await withAdminAuth(request, 'super_admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    await adminService.deleteCategory(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
