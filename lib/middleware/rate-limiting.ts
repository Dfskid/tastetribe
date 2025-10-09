import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Authentication routes: 5 requests per 15 minutes
  auth: { windowMs: 900000, maxRequests: 5 },

  // Sensitive operations: 20 requests per hour
  sensitive: { windowMs: 3600000, maxRequests: 20 },

  // Data modifications: 20 requests per hour
  modification: { windowMs: 3600000, maxRequests: 20 },

  // General queries: 100 requests per hour
  query: { windowMs: 3600000, maxRequests: 100 },

  // Search/filtering: 50 requests per hour
  search: { windowMs: 3600000, maxRequests: 50 },

  // File uploads: 10 requests per hour
  upload: { windowMs: 3600000, maxRequests: 10 },

  // Admin operations: 50 requests per hour
  admin: { windowMs: 3600000, maxRequests: 50 },

  // Partner API: 200 requests per hour
  partner: { windowMs: 3600000, maxRequests: 200 },

  // Webhooks: 500 requests per hour (external systems)
  webhook: { windowMs: 3600000, maxRequests: 500 },

  // Error logging: 100 requests per hour
  logging: { windowMs: 3600000, maxRequests: 100 },

  // Payment operations: 10 requests per hour
  payment: { windowMs: 3600000, maxRequests: 10 },

  // Legacy support
  api: { windowMs: 3600000, maxRequests: 100 },
  invite: { windowMs: 3600000, maxRequests: 20 },
  rating: { windowMs: 3600000, maxRequests: 30 },
};

export async function rateLimitMiddleware(
  request: NextRequest,
  limitType: keyof typeof RATE_LIMITS = 'api'
): Promise<NextResponse | null> {
  const identifier = getIdentifier(request);
  const config = RATE_LIMITS[limitType];

  const isAllowed = await checkRateLimit(
    identifier,
    limitType,
    config.maxRequests,
    Math.floor(config.windowMs / 60000)
  );

  if (!isAllowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil(config.windowMs / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(config.windowMs / 1000).toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  return null;
}

function getIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  const userId = request.headers.get('x-user-id') || '';

  return userId || ip;
}

async function checkRateLimit(
  identifier: string,
  action: string,
  maxRequests: number,
  windowMinutes: number
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_action: action,
      p_max_requests: maxRequests,
      p_window_minutes: windowMinutes,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      return true;
    }

    return data === true;
  } catch (error) {
    console.error('Rate limit error:', error);
    return true;
  }
}

export async function getRateLimitInfo(
  request: NextRequest,
  limitType: keyof typeof RATE_LIMITS
): Promise<{ limit: number; remaining: number; reset: number }> {
  const identifier = getIdentifier(request);
  const config = RATE_LIMITS[limitType];
  const windowStart = Date.now() - config.windowMs;

  try {
    const { data } = await supabase
      .from('rate_limits')
      .select('count')
      .eq('identifier', identifier)
      .eq('action', limitType)
      .gte('window_start', new Date(windowStart).toISOString())
      .maybeSingle();

    const used = data?.count || 0;
    const remaining = Math.max(0, config.maxRequests - used);
    const reset = Date.now() + config.windowMs;

    return {
      limit: config.maxRequests,
      remaining,
      reset,
    };
  } catch (error) {
    console.error('Failed to get rate limit info:', error);
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: Date.now() + config.windowMs,
    };
  }
}