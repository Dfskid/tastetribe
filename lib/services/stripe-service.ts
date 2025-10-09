import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/client';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const missingStripeKeyMessage =
  'Missing Stripe secret key. Please set STRIPE_SECRET_KEY in your environment configuration.';
let hasLoggedStripeWarning = false;

function createRejectedPromise() {
  const rejection = Promise.reject(new Error(missingStripeKeyMessage));
  rejection.catch(() => {});
  return rejection;
}

function createStripeStub(): Stripe {
  if (!stripeSecretKey && !hasLoggedStripeWarning && process.env.NODE_ENV !== 'production') {
    console.warn(missingStripeKeyMessage);
    hasLoggedStripeWarning = true;
  }

  const createProxy = (): any =>
    new Proxy(() => {
      throw new Error(missingStripeKeyMessage);
    }, {
      get(_target, prop) {
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          const rejection = createRejectedPromise();
          const method = rejection[prop as keyof Promise<never>];
          return typeof method === 'function' ? method.bind(rejection) : undefined;
        }

        return createProxy();
      },
      apply() {
        throw new Error(missingStripeKeyMessage);
      },
      construct() {
        throw new Error(missingStripeKeyMessage);
      },
    });

  return createProxy() as Stripe;
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-09-30.clover'
    })
  : createStripeStub();

export interface SubscriptionTier {
  id: string;
  name: 'free' | 'basic' | 'premium' | 'enterprise';
  price_monthly: number;
  price_yearly: number;
  features: Record<string, any>;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
}

export interface CreateCheckoutSessionParams {
  userId: string;
  tierId: string;
  billingPeriod: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}

export interface CreatePortalSessionParams {
  customerId: string;
  returnUrl: string;
}

export class StripeService {
  private supabase = createClient();

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{ sessionId: string; url: string }> {
    const { data: tier } = await this.supabase
      .from('subscription_tiers')
      .select('*')
      .eq('id', params.tierId)
      .single();

    if (!tier) {
      throw new Error('Subscription tier not found');
    }

    const priceId = params.billingPeriod === 'monthly'
      ? tier.stripe_price_id_monthly
      : tier.stripe_price_id_yearly;

    if (!priceId) {
      throw new Error('Stripe price ID not configured for this tier');
    }

    const { data: existingSubscription } = await this.supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', params.userId)
      .maybeSingle();

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.userId,
      metadata: {
        user_id: params.userId,
        tier_id: params.tierId,
        billing_period: params.billingPeriod
      }
    };

    if (existingSubscription?.stripe_customer_id) {
      sessionParams.customer = existingSubscription.stripe_customer_id;
    } else {
      sessionParams.customer_email = (await this.supabase.auth.getUser()).data.user?.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      sessionId: session.id,
      url: session.url || ''
    };
  }

  async createPortalSession(params: CreatePortalSessionParams): Promise<{ url: string }> {
    const session = await stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl
    });

    return { url: session.url };
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.user_id;
    const tierId = session.metadata?.tier_id;

    if (!userId || !tierId) {
      console.error('Missing user_id or tier_id in session metadata');
      return;
    }

    const subscription: any = await stripe.subscriptions.retrieve(session.subscription as string);

    await this.supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        tier_id: tierId,
        status: subscription.status,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription.id,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end
      }, {
        onConflict: 'user_id'
      });

    await this.supabase
      .from('payment_history')
      .insert({
        user_id: userId,
        stripe_payment_id: session.payment_intent as string,
        amount: session.amount_total || 0,
        currency: session.currency || 'usd',
        status: 'succeeded',
        description: `Subscription to ${session.metadata?.tier_id}`
      });
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const { data: existingSubscription } = await this.supabase
      .from('user_subscriptions')
      .select('user_id, tier_id')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle();

    if (!existingSubscription) {
      console.error('Subscription not found in database');
      return;
    }

    const sub: any = subscription;
    await this.supabase
      .from('user_subscriptions')
      .update({
        status: sub.status,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end
      })
      .eq('stripe_subscription_id', sub.id);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const { data: freeTier } = await this.supabase
      .from('subscription_tiers')
      .select('id')
      .eq('name', 'free')
      .single();

    if (!freeTier) {
      console.error('Free tier not found');
      return;
    }

    await this.supabase
      .from('user_subscriptions')
      .update({
        tier_id: freeTier.id,
        status: 'canceled'
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const inv: any = invoice;
    const { data: subscription } = await this.supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', inv.subscription as string)
      .maybeSingle();

    if (!subscription) {
      return;
    }

    await this.supabase
      .from('payment_history')
      .insert({
        user_id: subscription.user_id,
        stripe_payment_id: inv.payment_intent as string,
        amount: inv.amount_paid,
        currency: inv.currency,
        status: 'succeeded',
        description: inv.description || 'Subscription payment'
      });

    await this.supabase
      .from('user_subscriptions')
      .update({ status: 'active' })
      .eq('user_id', subscription.user_id);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const inv: any = invoice;
    const { data: subscription } = await this.supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', inv.subscription as string)
      .maybeSingle();

    if (!subscription) {
      return;
    }

    await this.supabase
      .from('payment_history')
      .insert({
        user_id: subscription.user_id,
        stripe_payment_id: inv.payment_intent as string || `failed_${Date.now()}`,
        amount: inv.amount_due,
        currency: inv.currency,
        status: 'failed',
        description: inv.description || 'Failed payment'
      });

    await this.supabase
      .from('user_subscriptions')
      .update({ status: 'past_due' })
      .eq('user_id', subscription.user_id);
  }

  async getSubscriptionTiers(): Promise<SubscriptionTier[]> {
    const { data, error } = await this.supabase
      .from('subscription_tiers')
      .select('*')
      .eq('active', true)
      .order('price_monthly', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getUserSubscription(userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('user_subscriptions')
      .select(`
        *,
        tier:subscription_tiers(*)
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getUserPaymentHistory(userId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('payment_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async cancelSubscription(userId: string, cancelImmediately: boolean = false): Promise<void> {
    const { data: subscription } = await this.supabase
      .from('user_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .single();

    if (!subscription?.stripe_subscription_id) {
      throw new Error('No active subscription found');
    }

    if (cancelImmediately) {
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
    } else {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true
      });
    }
  }

  verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}

export const stripeService = new StripeService();
