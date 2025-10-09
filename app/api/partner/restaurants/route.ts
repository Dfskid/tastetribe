import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimitMiddleware } from '@/lib/middleware/rate-limiting';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function validateApiKey(apiKey: string): Promise<{ valid: boolean; partnerId?: string }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('api_keys')
    .select('*, partner_id')
    .eq('key_hash', apiKey)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return { valid: false };
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false };
  }

  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() } as any)
    .eq('id', data.id);

  return { valid: true, partnerId: data.partner_id };
}

export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimitMiddleware(request, 'partner');
  if (rateLimitResult) return rateLimitResult;

  try {
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    const { valid, partnerId } = await validateApiKey(apiKey);

    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid or expired API key' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');
    const cuisineType = searchParams.get('cuisine_type');
    const priceRange = searchParams.get('price_range');

    const supabase = getSupabaseClient();
    let query = supabase
      .from('items')
      .select('id, name, category, category_type, attributes, location, created_at, verified')
      .eq('category_type', 'restaurant')
      .range(offset, offset + limit - 1);

    if (cuisineType) {
      query = query.eq('attributes->>cuisine_type', cuisineType);
    }

    if (priceRange) {
      query = query.eq('attributes->>price_range', priceRange);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      data,
      pagination: {
        limit,
        offset,
        total: count || data?.length || 0,
      },
    });
  } catch (error) {
    console.error('Partner API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimitMiddleware(request, 'partner');
  if (rateLimitResult) return rateLimitResult;

  try {
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    const { valid, partnerId } = await validateApiKey(apiKey);

    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid or expired API key' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const { name, cuisine_type, price_range, address, phone, website } = body;

    if (!name || !cuisine_type || !address) {
      return NextResponse.json(
        { error: 'Missing required fields: name, cuisine_type, address' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('items')
      .insert({
        category: 'restaurant',
        category_type: 'restaurant',
        name,
        attributes: {
          cuisine_type,
          price_range: price_range || '$',
          address,
          phone,
          website,
          partner_submitted: true,
          partner_id: partnerId,
        },
        verified: false,
      } as any)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Partner API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
