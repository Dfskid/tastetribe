import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RestaurantData {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  cuisine_type?: string;
  price_range?: string;
  google_places_id?: string;
  google_rating?: number;
  image_url?: string;
  latitude?: number;
  longitude?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!googleApiKey) {
      throw new Error('Google Places API key not configured');
    }

    const { searchRadius = 50000, limit = 500 } = await req.json().catch(() => ({}));

    const denverCenter = {
      lat: 39.7392,
      lng: -104.9903,
    };

    const restaurants: RestaurantData[] = [];
    let nextPageToken: string | undefined;
    const restaurantTypes = ['restaurant', 'cafe', 'bar', 'food'];

    for (const type of restaurantTypes) {
      if (restaurants.length >= limit) break;

      let hasMorePages = true;
      nextPageToken = undefined;

      while (hasMorePages && restaurants.length < limit) {
        const params = new URLSearchParams({
          location: `${denverCenter.lat},${denverCenter.lng}`,
          radius: searchRadius.toString(),
          type: type,
          key: googleApiKey,
        });

        if (nextPageToken) {
          params.append('pagetoken', nextPageToken);
        }

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`
        );

        const data = await response.json();

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          console.error('Google API error:', data.status, data.error_message);
          break;
        }

        if (data.results && data.results.length > 0) {
          for (const place of data.results) {
            if (restaurants.length >= limit) break;

            const detailsResponse = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,price_level,geometry,photos,types&key=${googleApiKey}`
            );

            const detailsData = await detailsResponse.json();

            if (detailsData.status === 'OK' && detailsData.result) {
              const details = detailsData.result;
              const cuisineType = details.types?.find(
                (t: string) => !['restaurant', 'food', 'point_of_interest', 'establishment'].includes(t)
              ) || 'Restaurant';

              const priceLevel = details.price_level
                ? '$'.repeat(details.price_level)
                : undefined;

              let imageUrl: string | undefined;
              if (details.photos && details.photos.length > 0) {
                const photoReference = details.photos[0].photo_reference;
                imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${googleApiKey}`;
              }

              restaurants.push({
                name: details.name,
                address: details.formatted_address,
                phone: details.formatted_phone_number,
                website: details.website,
                cuisine_type: cuisineType.replace(/_/g, ' '),
                price_range: priceLevel,
                google_places_id: place.place_id,
                google_rating: details.rating,
                image_url: imageUrl,
                latitude: details.geometry?.location?.lat,
                longitude: details.geometry?.location?.lng,
              });
            }

            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        nextPageToken = data.next_page_token;
        hasMorePages = !!nextPageToken;

        if (hasMorePages) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    const uniqueRestaurants = Array.from(
      new Map(restaurants.map(r => [r.google_places_id, r])).values()
    );

    const itemsToInsert = uniqueRestaurants.slice(0, limit).map(restaurant => ({
      category: 'restaurant',
      name: restaurant.name,
      attributes: {
        address: restaurant.address,
        phone: restaurant.phone,
        website: restaurant.website,
        cuisine_type: restaurant.cuisine_type,
        price_range: restaurant.price_range,
        google_places_id: restaurant.google_places_id,
        google_rating: restaurant.google_rating,
        image_url: restaurant.image_url,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
      },
    }));

    const { data: insertedItems, error: insertError } = await supabase
      .from('items')
      .insert(itemsToInsert)
      .select();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully populated ${insertedItems?.length || 0} restaurants`,
        count: insertedItems?.length || 0,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});