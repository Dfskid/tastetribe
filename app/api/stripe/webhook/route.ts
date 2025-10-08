import { NextRequest, NextResponse } from 'next/server';
import { stripeService } from '@/lib/services/stripe-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const event = stripeService.verifyWebhookSignature(body, signature);

    await stripeService.handleWebhookEvent(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook handler failed' },
      { status: 400 }
    );
  }
}
