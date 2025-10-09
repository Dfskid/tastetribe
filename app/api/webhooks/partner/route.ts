import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { rateLimitMiddleware } from '@/lib/middleware/rate-limiting';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimitMiddleware(request, 'webhook');
  if (rateLimitResult) return rateLimitResult;

  try {
    const signature = request.headers.get('x-webhook-signature');
    const partnerId = request.headers.get('x-partner-id');

    if (!signature || !partnerId) {
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { data: partner } = await supabase
      .from('partner_businesses')
      .select('webhook_secret, is_active')
      .eq('id', partnerId)
      .maybeSingle();

    if (!partner || !partner.is_active) {
      return NextResponse.json(
        { error: 'Invalid partner' },
        { status: 401 }
      );
    }

    const rawBody = await request.text();

    if (!verifyWebhookSignature(rawBody, signature, partner.webhook_secret)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);

    const { event_type, data } = payload;

    switch (event_type) {
      case 'promotion.created':
        console.log('Partner promotion created:', data);
        break;

      case 'promotion.updated':
        console.log('Partner promotion updated:', data);
        break;

      case 'promotion.deleted':
        console.log('Partner promotion deleted:', data);
        break;

      case 'restaurant.updated':
        if (data.restaurant_id && data.attributes) {
          await supabase
            .from('items')
            .update({ attributes: data.attributes } as any)
            .eq('id', data.restaurant_id)
            .eq('attributes->>partner_id', partnerId);
        }
        break;

      default:
        console.log('Unknown event type:', event_type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
