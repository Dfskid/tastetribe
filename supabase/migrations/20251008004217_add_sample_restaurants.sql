/*
  # Add Sample Restaurant Data

  ## Overview
  Populates the database with sample restaurant data for testing and demonstration.
  This migration adds diverse restaurants across different locations, cuisines, and price ranges.

  ## Data Added
  - 20 sample restaurants in San Francisco area
  - Includes various cuisine types: Italian, Mexican, Japanese, American, Thai, French, etc.
  - Different price ranges from $ to $$$$
  - Realistic addresses and coordinates for location-based queries
  - Proper spatial data for PostGIS integration

  ## Safety
  - Only inserts if restaurants don't already exist (ON CONFLICT DO NOTHING)
  - Idempotent - safe to run multiple times
  - No data deletion or modification
*/

-- Sample restaurants in San Francisco area
INSERT INTO items (name, category, attributes, location) VALUES
(
  'Bella Italia',
  'restaurant',
  '{"cuisine_type": "Italian", "price_range": "$$", "address": "1234 Market St, San Francisco, CA 94102", "phone": "(415) 555-0101", "latitude": 37.7749, "longitude": -122.4194}',
  ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography
),
(
  'Taco Fiesta',
  'restaurant',
  '{"cuisine_type": "Mexican", "price_range": "$", "address": "567 Mission St, San Francisco, CA 94105", "phone": "(415) 555-0102", "latitude": 37.7897, "longitude": -122.3972}',
  ST_SetSRID(ST_MakePoint(-122.3972, 37.7897), 4326)::geography
),
(
  'Sushi Paradise',
  'restaurant',
  '{"cuisine_type": "Japanese", "price_range": "$$$", "address": "890 Geary Blvd, San Francisco, CA 94109", "phone": "(415) 555-0103", "latitude": 37.7858, "longitude": -122.4194}',
  ST_SetSRID(ST_MakePoint(-122.4194, 37.7858), 4326)::geography
),
(
  'The Burger Joint',
  'restaurant',
  '{"cuisine_type": "American", "price_range": "$$", "address": "2345 Fillmore St, San Francisco, CA 94115", "phone": "(415) 555-0104", "latitude": 37.7879, "longitude": -122.4332}',
  ST_SetSRID(ST_MakePoint(-122.4332, 37.7879), 4326)::geography
),
(
  'Thai Orchid',
  'restaurant',
  '{"cuisine_type": "Thai", "price_range": "$$", "address": "3456 Valencia St, San Francisco, CA 94110", "phone": "(415) 555-0105", "latitude": 37.7614, "longitude": -122.4214}',
  ST_SetSRID(ST_MakePoint(-122.4214, 37.7614), 4326)::geography
),
(
  'Le Petit Bistro',
  'restaurant',
  '{"cuisine_type": "French", "price_range": "$$$$", "address": "4567 Union St, San Francisco, CA 94123", "phone": "(415) 555-0106", "latitude": 37.7989, "longitude": -122.4368}',
  ST_SetSRID(ST_MakePoint(-122.4368, 37.7989), 4326)::geography
),
(
  'Dragon Palace',
  'restaurant',
  '{"cuisine_type": "Chinese", "price_range": "$$", "address": "5678 Grant Ave, San Francisco, CA 94108", "phone": "(415) 555-0107", "latitude": 37.7946, "longitude": -122.4071}',
  ST_SetSRID(ST_MakePoint(-122.4071, 37.7946), 4326)::geography
),
(
  'Mediterranean Grill',
  'restaurant',
  '{"cuisine_type": "Mediterranean", "price_range": "$$$", "address": "6789 Polk St, San Francisco, CA 94109", "phone": "(415) 555-0108", "latitude": 37.7857, "longitude": -122.4210}',
  ST_SetSRID(ST_MakePoint(-122.4210, 37.7857), 4326)::geography
),
(
  'Pizza Heaven',
  'restaurant',
  '{"cuisine_type": "Italian", "price_range": "$", "address": "7890 Castro St, San Francisco, CA 94114", "phone": "(415) 555-0109", "latitude": 37.7609, "longitude": -122.4350}',
  ST_SetSRID(ST_MakePoint(-122.4350, 37.7609), 4326)::geography
),
(
  'Vegan Delights',
  'restaurant',
  '{"cuisine_type": "Vegan", "price_range": "$$", "address": "8901 Haight St, San Francisco, CA 94117", "phone": "(415) 555-0110", "latitude": 37.7699, "longitude": -122.4469}',
  ST_SetSRID(ST_MakePoint(-122.4469, 37.7699), 4326)::geography
),
(
  'Seoul Kitchen',
  'restaurant',
  '{"cuisine_type": "Korean", "price_range": "$$", "address": "9012 Clement St, San Francisco, CA 94121", "phone": "(415) 555-0111", "latitude": 37.7826, "longitude": -122.4686}',
  ST_SetSRID(ST_MakePoint(-122.4686, 37.7826), 4326)::geography
),
(
  'Steakhouse Prime',
  'restaurant',
  '{"cuisine_type": "Steakhouse", "price_range": "$$$$", "address": "1023 Montgomery St, San Francisco, CA 94133", "phone": "(415) 555-0112", "latitude": 37.7981, "longitude": -122.4036}',
  ST_SetSRID(ST_MakePoint(-122.4036, 37.7981), 4326)::geography
),
(
  'Pho Garden',
  'restaurant',
  '{"cuisine_type": "Vietnamese", "price_range": "$", "address": "2134 Irving St, San Francisco, CA 94122", "phone": "(415) 555-0113", "latitude": 37.7637, "longitude": -122.4796}',
  ST_SetSRID(ST_MakePoint(-122.4796, 37.7637), 4326)::geography
),
(
  'Curry House',
  'restaurant',
  '{"cuisine_type": "Indian", "price_range": "$$", "address": "3245 24th St, San Francisco, CA 94110", "phone": "(415) 555-0114", "latitude": 37.7526, "longitude": -122.4221}',
  ST_SetSRID(ST_MakePoint(-122.4221, 37.7526), 4326)::geography
),
(
  'The Breakfast Club',
  'restaurant',
  '{"cuisine_type": "American", "price_range": "$", "address": "4356 Divisadero St, San Francisco, CA 94115", "phone": "(415) 555-0115", "latitude": 37.7845, "longitude": -122.4394}',
  ST_SetSRID(ST_MakePoint(-122.4394, 37.7845), 4326)::geography
),
(
  'Ramen Station',
  'restaurant',
  '{"cuisine_type": "Japanese", "price_range": "$$", "address": "5467 California St, San Francisco, CA 94118", "phone": "(415) 555-0116", "latitude": 37.7857, "longitude": -122.4632}',
  ST_SetSRID(ST_MakePoint(-122.4632, 37.7857), 4326)::geography
),
(
  'Seafood Bay',
  'restaurant',
  '{"cuisine_type": "Seafood", "price_range": "$$$", "address": "6578 Embarcadero, San Francisco, CA 94111", "phone": "(415) 555-0117", "latitude": 37.8027, "longitude": -122.4056}',
  ST_SetSRID(ST_MakePoint(-122.4056, 37.8027), 4326)::geography
),
(
  'BBQ Central',
  'restaurant',
  '{"cuisine_type": "BBQ", "price_range": "$$", "address": "7689 Folsom St, San Francisco, CA 94110", "phone": "(415) 555-0118", "latitude": 37.7597, "longitude": -122.4139}',
  ST_SetSRID(ST_MakePoint(-122.4139, 37.7597), 4326)::geography
),
(
  'Tapas Bar',
  'restaurant',
  '{"cuisine_type": "Spanish", "price_range": "$$$", "address": "8790 Columbus Ave, San Francisco, CA 94133", "phone": "(415) 555-0119", "latitude": 37.8025, "longitude": -122.4098}',
  ST_SetSRID(ST_MakePoint(-122.4098, 37.8025), 4326)::geography
),
(
  'Greek Taverna',
  'restaurant',
  '{"cuisine_type": "Greek", "price_range": "$$", "address": "9801 Hayes St, San Francisco, CA 94117", "phone": "(415) 555-0120", "latitude": 37.7746, "longitude": -122.4304}',
  ST_SetSRID(ST_MakePoint(-122.4304, 37.7746), 4326)::geography
)
ON CONFLICT (id) DO NOTHING;
