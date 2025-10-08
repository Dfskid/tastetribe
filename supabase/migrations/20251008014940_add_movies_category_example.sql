/*
  # Add Movies Category Example

  1. Purpose
    - Demonstrates multi-category extensibility of the platform
    - Shows how the system supports different content types beyond restaurants
    
  2. Changes
    - Insert movie category schema configuration
    - Add sample movie data for testing
    - Configure search attributes for movies
  
  3. Movie Attributes
    - title: Movie title
    - genre: Movie genre (Action, Comedy, Drama, etc.)
    - release_year: Year of release
    - director: Director name
    - rating: Movie rating (G, PG, PG-13, R, etc.)
    - runtime_minutes: Duration in minutes
    - imdb_rating: IMDb rating (0-10)
    - streaming_platforms: Where the movie is available
*/

-- Insert movie category schema
INSERT INTO category_schemas (
  category_type,
  schema_version,
  required_attributes,
  optional_attributes,
  searchable_fields,
  filterable_fields,
  sortable_fields
) VALUES (
  'movie',
  1,
  '["title", "genre", "release_year"]'::jsonb,
  '["director", "rating", "runtime_minutes", "imdb_rating", "streaming_platforms", "poster_url", "description"]'::jsonb,
  '["title", "genre", "director", "description"]'::jsonb,
  '["genre", "release_year", "rating", "imdb_rating"]'::jsonb,
  '["title", "release_year", "imdb_rating"]'::jsonb
)
ON CONFLICT (category_type) DO UPDATE SET
  required_attributes = EXCLUDED.required_attributes,
  optional_attributes = EXCLUDED.optional_attributes,
  searchable_fields = EXCLUDED.searchable_fields,
  filterable_fields = EXCLUDED.filterable_fields,
  sortable_fields = EXCLUDED.sortable_fields,
  updated_at = now();

-- Insert sample movie data
INSERT INTO items (
  category,
  category_type,
  name,
  external_id,
  external_source,
  verified,
  attributes
)
SELECT
  'entertainment',
  'movie',
  'The Shawshank Redemption',
  'tt0111161',
  'imdb',
  true,
  jsonb_build_object(
    'title', 'The Shawshank Redemption',
    'genre', 'Drama',
    'release_year', 1994,
    'director', 'Frank Darabont',
    'rating', 'R',
    'runtime_minutes', 142,
    'imdb_rating', 9.3,
    'streaming_platforms', ARRAY['Netflix', 'Amazon Prime'],
    'description', 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.'
  )
WHERE NOT EXISTS (
  SELECT 1 FROM items WHERE external_id = 'tt0111161' AND external_source = 'imdb'
);

INSERT INTO items (category, category_type, name, external_id, external_source, verified, attributes)
SELECT 'entertainment', 'movie', 'The Dark Knight', 'tt0468569', 'imdb', true,
  jsonb_build_object('title', 'The Dark Knight', 'genre', 'Action', 'release_year', 2008, 'director', 'Christopher Nolan', 'rating', 'PG-13', 'runtime_minutes', 152, 'imdb_rating', 9.0, 'streaming_platforms', ARRAY['HBO Max', 'Amazon Prime'], 'description', 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.')
WHERE NOT EXISTS (SELECT 1 FROM items WHERE external_id = 'tt0468569' AND external_source = 'imdb');

INSERT INTO items (category, category_type, name, external_id, external_source, verified, attributes)
SELECT 'entertainment', 'movie', 'Pulp Fiction', 'tt0110912', 'imdb', true,
  jsonb_build_object('title', 'Pulp Fiction', 'genre', 'Crime', 'release_year', 1994, 'director', 'Quentin Tarantino', 'rating', 'R', 'runtime_minutes', 154, 'imdb_rating', 8.9, 'streaming_platforms', ARRAY['Paramount+', 'Amazon Prime'], 'description', 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.')
WHERE NOT EXISTS (SELECT 1 FROM items WHERE external_id = 'tt0110912' AND external_source = 'imdb');

INSERT INTO items (category, category_type, name, external_id, external_source, verified, attributes)
SELECT 'entertainment', 'movie', 'Forrest Gump', 'tt0109830', 'imdb', true,
  jsonb_build_object('title', 'Forrest Gump', 'genre', 'Drama', 'release_year', 1994, 'director', 'Robert Zemeckis', 'rating', 'PG-13', 'runtime_minutes', 142, 'imdb_rating', 8.8, 'streaming_platforms', ARRAY['Paramount+', 'Amazon Prime'], 'description', 'The presidencies of Kennedy and Johnson, the Vietnam War, and other historical events unfold from the perspective of an Alabama man.')
WHERE NOT EXISTS (SELECT 1 FROM items WHERE external_id = 'tt0109830' AND external_source = 'imdb');

INSERT INTO items (category, category_type, name, external_id, external_source, verified, attributes)
SELECT 'entertainment', 'movie', 'Inception', 'tt1375666', 'imdb', true,
  jsonb_build_object('title', 'Inception', 'genre', 'Sci-Fi', 'release_year', 2010, 'director', 'Christopher Nolan', 'rating', 'PG-13', 'runtime_minutes', 148, 'imdb_rating', 8.8, 'streaming_platforms', ARRAY['HBO Max', 'Netflix'], 'description', 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.')
WHERE NOT EXISTS (SELECT 1 FROM items WHERE external_id = 'tt1375666' AND external_source = 'imdb');

INSERT INTO items (category, category_type, name, external_id, external_source, verified, attributes)
SELECT 'entertainment', 'movie', 'The Matrix', 'tt0133093', 'imdb', true,
  jsonb_build_object('title', 'The Matrix', 'genre', 'Sci-Fi', 'release_year', 1999, 'director', 'Lana Wachowski', 'rating', 'R', 'runtime_minutes', 136, 'imdb_rating', 8.7, 'streaming_platforms', ARRAY['HBO Max', 'Amazon Prime'], 'description', 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.')
WHERE NOT EXISTS (SELECT 1 FROM items WHERE external_id = 'tt0133093' AND external_source = 'imdb');

INSERT INTO items (category, category_type, name, external_id, external_source, verified, attributes)
SELECT 'entertainment', 'movie', 'Goodfellas', 'tt0099685', 'imdb', true,
  jsonb_build_object('title', 'Goodfellas', 'genre', 'Crime', 'release_year', 1990, 'director', 'Martin Scorsese', 'rating', 'R', 'runtime_minutes', 146, 'imdb_rating', 8.7, 'streaming_platforms', ARRAY['Netflix', 'Amazon Prime'], 'description', 'The story of Henry Hill and his life in the mob, covering his relationship with his wife and his partners in crime.')
WHERE NOT EXISTS (SELECT 1 FROM items WHERE external_id = 'tt0099685' AND external_source = 'imdb');

INSERT INTO items (category, category_type, name, external_id, external_source, verified, attributes)
SELECT 'entertainment', 'movie', 'The Silence of the Lambs', 'tt0102926', 'imdb', true,
  jsonb_build_object('title', 'The Silence of the Lambs', 'genre', 'Thriller', 'release_year', 1991, 'director', 'Jonathan Demme', 'rating', 'R', 'runtime_minutes', 118, 'imdb_rating', 8.6, 'streaming_platforms', ARRAY['Hulu', 'Amazon Prime'], 'description', 'A young FBI cadet must receive the help of an incarcerated cannibal killer to catch another serial killer.')
WHERE NOT EXISTS (SELECT 1 FROM items WHERE external_id = 'tt0102926' AND external_source = 'imdb');

INSERT INTO items (category, category_type, name, external_id, external_source, verified, attributes)
SELECT 'entertainment', 'movie', 'Interstellar', 'tt0816692', 'imdb', true,
  jsonb_build_object('title', 'Interstellar', 'genre', 'Sci-Fi', 'release_year', 2014, 'director', 'Christopher Nolan', 'rating', 'PG-13', 'runtime_minutes', 169, 'imdb_rating', 8.6, 'streaming_platforms', ARRAY['Paramount+', 'Amazon Prime'], 'description', 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity survival.')
WHERE NOT EXISTS (SELECT 1 FROM items WHERE external_id = 'tt0816692' AND external_source = 'imdb');

INSERT INTO items (category, category_type, name, external_id, external_source, verified, attributes)
SELECT 'entertainment', 'movie', 'The Departed', 'tt0407887', 'imdb', true,
  jsonb_build_object('title', 'The Departed', 'genre', 'Crime', 'release_year', 2006, 'director', 'Martin Scorsese', 'rating', 'R', 'runtime_minutes', 151, 'imdb_rating', 8.5, 'streaming_platforms', ARRAY['HBO Max', 'Amazon Prime'], 'description', 'An undercover cop and a mole in the police attempt to identify each other while infiltrating an Irish gang in Boston.')
WHERE NOT EXISTS (SELECT 1 FROM items WHERE external_id = 'tt0407887' AND external_source = 'imdb');