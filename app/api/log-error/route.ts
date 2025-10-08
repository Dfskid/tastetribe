import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, stack, digest, url } = body;

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('user_events').insert({
      user_id: user?.id,
      event_type: 'error',
      event_category: 'system',
      event_metadata: {
        error_message: message,
        error_stack: stack,
        error_digest: digest,
        error_url: url,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to log error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}