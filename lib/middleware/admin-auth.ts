import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function withAdminAuth(
  request: NextRequest,
  requiredRole?: 'super_admin' | 'content_manager' | 'analyst'
) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing authorization header' },
      { status: 401 }
    );
  }

  const token = authHeader.replace('Bearer ', '');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Invalid authentication token' },
      { status: 401 }
    );
  }

  const { data: adminRole, error: roleError } = await supabase
    .from('admin_roles')
    .select('role, permissions')
    .eq('user_id', user.id)
    .maybeSingle();

  if (roleError || !adminRole) {
    return NextResponse.json(
      { error: 'Unauthorized: Admin access required' },
      { status: 403 }
    );
  }

  if (requiredRole && adminRole.role !== requiredRole && adminRole.role !== 'super_admin') {
    return NextResponse.json(
      { error: `Unauthorized: ${requiredRole} role required` },
      { status: 403 }
    );
  }

  return { user, adminRole };
}

export function requireAdmin(
  handler: (request: NextRequest, context: { user: any; adminRole: any }) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const authResult = await withAdminAuth(request);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    return handler(request, authResult);
  };
}

export function requireRole(role: 'super_admin' | 'content_manager' | 'analyst') {
  return (
    handler: (request: NextRequest, context: { user: any; adminRole: any }) => Promise<NextResponse>
  ) => {
    return async (request: NextRequest) => {
      const authResult = await withAdminAuth(request, role);

      if (authResult instanceof NextResponse) {
        return authResult;
      }

      return handler(request, authResult);
    };
  };
}
