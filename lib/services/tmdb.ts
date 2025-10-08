const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  adult: boolean;
}

export interface TMDBTVShow {
  id: number;
  name: string;
  overview: string;
  first_air_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export class TMDBService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || TMDB_API_KEY || '';
  }

  private async fetch(endpoint: string, params: Record<string, string> = {}) {
    if (!this.apiKey) {
      throw new Error('TMDB API key is not configured');
    }

    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', this.apiKey);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getPopularMovies(page: number = 1): Promise<{ results: TMDBMovie[]; total_pages: number }> {
    return this.fetch('/movie/popular', { page: page.toString() });
  }

  async getTopRatedMovies(page: number = 1): Promise<{ results: TMDBMovie[]; total_pages: number }> {
    return this.fetch('/movie/top_rated', { page: page.toString() });
  }

  async getNowPlayingMovies(page: number = 1): Promise<{ results: TMDBMovie[]; total_pages: number }> {
    return this.fetch('/movie/now_playing', { page: page.toString() });
  }

  async getUpcomingMovies(page: number = 1): Promise<{ results: TMDBMovie[]; total_pages: number }> {
    return this.fetch('/movie/upcoming', { page: page.toString() });
  }

  async getMovieDetails(movieId: number) {
    return this.fetch(`/movie/${movieId}`);
  }

  async getPopularTVShows(page: number = 1): Promise<{ results: TMDBTVShow[]; total_pages: number }> {
    return this.fetch('/tv/popular', { page: page.toString() });
  }

  async getTopRatedTVShows(page: number = 1): Promise<{ results: TMDBTVShow[]; total_pages: number }> {
    return this.fetch('/tv/top_rated', { page: page.toString() });
  }

  async getAiringTodayTVShows(page: number = 1): Promise<{ results: TMDBTVShow[]; total_pages: number }> {
    return this.fetch('/tv/airing_today', { page: page.toString() });
  }

  async getTVShowDetails(tvId: number) {
    return this.fetch(`/tv/${tvId}`);
  }

  async getMovieGenres(): Promise<{ genres: TMDBGenre[] }> {
    return this.fetch('/genre/movie/list');
  }

  async getTVGenres(): Promise<{ genres: TMDBGenre[] }> {
    return this.fetch('/genre/tv/list');
  }

  async searchMovies(query: string, page: number = 1): Promise<{ results: TMDBMovie[]; total_pages: number }> {
    return this.fetch('/search/movie', { query, page: page.toString() });
  }

  async searchTVShows(query: string, page: number = 1): Promise<{ results: TMDBTVShow[]; total_pages: number }> {
    return this.fetch('/search/tv', { query, page: page.toString() });
  }

  async discoverMovies(params: {
    with_genres?: string;
    sort_by?: string;
    year?: number;
    page?: number;
  }): Promise<{ results: TMDBMovie[]; total_pages: number }> {
    const queryParams: Record<string, string> = {};

    if (params.with_genres) queryParams.with_genres = params.with_genres;
    if (params.sort_by) queryParams.sort_by = params.sort_by;
    if (params.year) queryParams.year = params.year.toString();
    if (params.page) queryParams.page = params.page.toString();

    return this.fetch('/discover/movie', queryParams);
  }

  async discoverTVShows(params: {
    with_genres?: string;
    sort_by?: string;
    first_air_date_year?: number;
    page?: number;
  }): Promise<{ results: TMDBTVShow[]; total_pages: number }> {
    const queryParams: Record<string, string> = {};

    if (params.with_genres) queryParams.with_genres = params.with_genres;
    if (params.sort_by) queryParams.sort_by = params.sort_by;
    if (params.first_air_date_year) queryParams.first_air_date_year = params.first_air_date_year.toString();
    if (params.page) queryParams.page = params.page.toString();

    return this.fetch('/discover/tv', queryParams);
  }

  getImageUrl(path: string | null, size: 'w500' | 'w780' | 'original' = 'w500'): string | null {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }

  transformMovieToItem(movie: TMDBMovie) {
    return {
      category: 'movies',
      name: movie.title,
      attributes: {
        tmdb_id: movie.id,
        overview: movie.overview,
        release_date: movie.release_date,
        poster_url: this.getImageUrl(movie.poster_path),
        backdrop_url: this.getImageUrl(movie.backdrop_path, 'w780'),
        genre_ids: movie.genre_ids,
        rating: movie.vote_average,
        vote_count: movie.vote_count,
        popularity: movie.popularity,
        language: movie.original_language,
        adult: movie.adult
      }
    };
  }

  transformTVShowToItem(show: TMDBTVShow) {
    return {
      category: 'tv_shows',
      name: show.name,
      attributes: {
        tmdb_id: show.id,
        overview: show.overview,
        first_air_date: show.first_air_date,
        poster_url: this.getImageUrl(show.poster_path),
        backdrop_url: this.getImageUrl(show.backdrop_path, 'w780'),
        genre_ids: show.genre_ids,
        rating: show.vote_average,
        vote_count: show.vote_count,
        popularity: show.popularity,
        language: show.original_language
      }
    };
  }

  async seedMovies(
    maxPages: number = 5,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ movies: any[]; totalFetched: number }> {
    const allMovies: any[] = [];

    for (let page = 1; page <= maxPages; page++) {
      const [popular, topRated] = await Promise.all([
        this.getPopularMovies(page),
        this.getTopRatedMovies(page)
      ]);

      const movies = [...popular.results, ...topRated.results];
      const uniqueMovies = movies.filter((movie, index, self) =>
        index === self.findIndex(m => m.id === movie.id)
      );

      const transformedMovies = uniqueMovies.map(m => this.transformMovieToItem(m));
      allMovies.push(...transformedMovies);

      if (onProgress) {
        onProgress(page, maxPages);
      }

      await new Promise(resolve => setTimeout(resolve, 250));
    }

    return {
      movies: allMovies,
      totalFetched: allMovies.length
    };
  }

  async seedTVShows(
    maxPages: number = 5,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ shows: any[]; totalFetched: number }> {
    const allShows: any[] = [];

    for (let page = 1; page <= maxPages; page++) {
      const [popular, topRated] = await Promise.all([
        this.getPopularTVShows(page),
        this.getTopRatedTVShows(page)
      ]);

      const shows = [...popular.results, ...topRated.results];
      const uniqueShows = shows.filter((show, index, self) =>
        index === self.findIndex(s => s.id === show.id)
      );

      const transformedShows = uniqueShows.map(s => this.transformTVShowToItem(s));
      allShows.push(...transformedShows);

      if (onProgress) {
        onProgress(page, maxPages);
      }

      await new Promise(resolve => setTimeout(resolve, 250));
    }

    return {
      shows: allShows,
      totalFetched: allShows.length
    };
  }
}

export const tmdbService = new TMDBService();
