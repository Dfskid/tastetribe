import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripeService } from '@/lib/services/stripe-service';
import { z } from 'zod';
import { rateLimitMiddleware } from '@/lib/middleware/rate-limiting';

const checkoutSchema = z.object({
  tierId: z.string().uuid(),
  billingPeriod: z.enum(['monthly', 'yearly'])
});

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimitMiddleware(request, 'payment');
  if (rateLimitResult) return rateLimitResult;

  try {
    const supabase = getSupabaseClient();
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = checkoutSchema.parse(body);

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const session = await stripeService.createCheckoutSession({
      userId: user.id,
      tierId: validated.tierId,
      billingPeriod: validated.billingPeriod,
      successUrl: `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/subscription/canceled`
    });

    return NextResponse.json({ sessionId: session.sessionId, url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
