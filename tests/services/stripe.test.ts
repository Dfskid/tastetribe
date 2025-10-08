import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StripeService } from '@/lib/services/stripe-service';

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: {
          create: vi.fn()
        }
      },
      billingPortal: {
        sessions: {
          create: vi.fn()
        }
      },
      subscriptions: {
        retrieve: vi.fn(),
        update: vi.fn(),
        cancel: vi.fn()
      },
      webhooks: {
        constructEvent: vi.fn()
      }
    }))
  };
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } }
      })
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn()
    }))
  })
}));

describe.skip('StripeService', () => {
  let stripeService: StripeService;

  beforeEach(() => {
    stripeService = new StripeService();
    vi.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('should create a checkout session for new customer', async () => {
      const supabase = (stripeService as any).supabase;
      const mockChain = supabase.from();

      mockChain.single.mockResolvedValueOnce({
        data: {
          id: 'tier-123',
          name: 'premium',
          stripe_price_id_monthly: 'price_123'
        },
        error: null
      });

      mockChain.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const mockStripe = (stripeService as any).supabase;
      mockStripe.checkout = {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/pay/cs_test_123'
          })
        }
      };

      const result = await stripeService.createCheckoutSession({
        userId: 'user-123',
        tierId: 'tier-123',
        billingPeriod: 'monthly',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      });

      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('url');
    });

    it('should throw error if tier not found', async () => {
      const supabase = (stripeService as any).supabase;
      const mockChain = supabase.from();

      mockChain.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      });

      await expect(
        stripeService.createCheckoutSession({
          userId: 'user-123',
          tierId: 'invalid-tier',
          billingPeriod: 'monthly',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        })
      ).rejects.toThrow();
    });

    it('should throw error if price ID not configured', async () => {
      const supabase = (stripeService as any).supabase;
      const mockChain = supabase.from();

      mockChain.single.mockResolvedValue({
        data: {
          id: 'tier-123',
          name: 'premium',
          stripe_price_id_monthly: null
        },
        error: null
      });

      await expect(
        stripeService.createCheckoutSession({
          userId: 'user-123',
          tierId: 'tier-123',
          billingPeriod: 'monthly',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        })
      ).rejects.toThrow('Stripe price ID not configured');
    });
  });

  describe('getUserSubscription', () => {
    it('should return user subscription with tier details', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        tier: {
          name: 'premium',
          features: {}
        },
        status: 'active'
      };

      const supabase = (stripeService as any).supabase;
      const mockChain = supabase.from();
      mockChain.maybeSingle.mockResolvedValue({
        data: mockSubscription,
        error: null
      });

      const result = await stripeService.getUserSubscription('user-123');

      expect(result).toEqual(mockSubscription);
    });

    it('should return null if no subscription found', async () => {
      const supabase = (stripeService as any).supabase;
      const mockChain = supabase.from();
      mockChain.maybeSingle.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await stripeService.getUserSubscription('user-123');

      expect(result).toBeNull();
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end', async () => {
      const supabase = (stripeService as any).supabase;
      const mockChain = supabase.from();
      mockChain.single.mockResolvedValue({
        data: { stripe_subscription_id: 'sub_123' },
        error: null
      });

      await expect(
        stripeService.cancelSubscription('user-123', false)
      ).resolves.not.toThrow();
    });

    it('should throw error if no subscription found', async () => {
      const supabase = (stripeService as any).supabase;
      const mockChain = supabase.from();
      mockChain.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      });

      await expect(
        stripeService.cancelSubscription('user-123', false)
      ).rejects.toThrow();
    });
  });
});
