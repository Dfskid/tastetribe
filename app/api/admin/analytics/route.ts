import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/admin-auth';
import { adminService } from '@/lib/services/admin';

async function handleGet(request: NextRequest) {
  try {
    const analytics = await adminService.getAdminAnalytics();
    return NextResponse.json({ analytics });
  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

export const GET = requireAdmin(handleGet);
