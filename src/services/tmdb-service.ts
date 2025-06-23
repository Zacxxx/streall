// Direct TMDB API service with 2embed streaming integration
import { settingsService } from './settings-service';

// Fallback API key for development - will be overridden by settings service in production
const FALLBACK_TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '17db4e1c6aec4f836a26810b82bb01b6';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';

export interface ContentItem {
  id: number;
  tmdb_id: number;
  imdb_id?: string;
  title: string;
  originalTitle: string;
  type: 'movie' | 'tv';
  year: number | null;
  releaseDate: string;
  overview: string;
  poster: string | null;
  backdropPath: string | null;
  rating: number;
  voteCount: number;
  popularity: number;
  genres: string[];
  genreIds: number[];
  runtime?: number | null;
  seasons?: number | null;
  episodes?: number | null;
  status?: string | null;
  isAdult: boolean;
  streamUrl: string; // 2embed streaming URL
}

export interface SearchFilters {
  type?: 'all' | 'movie' | 'tv';
  genre?: number;
  year?: number;
  minRating?: number;
  maxRating?: number;
  sortBy?: 'popularity' | 'rating' | 'year' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  results: T[];
  pagination: {
    page: number;
    limit: number;
    total?: number;
    totalPages?: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface Genre {
  id: number;
  name: string;
}

export interface SeasonDetails {
  id: number;
  name: string;
  overview: string;
  seasonNumber: number;
  airDate: string;
  poster: string | null;
  episodes: EpisodeDetails[];
}

export interface EpisodeDetails {
  id: number;
  name: string;
  overview: string;
  episodeNumber: number;
  seasonNumber: number;
  airDate: string;
  stillPath: string | null;
  voteAverage: number;
  streamUrl: string;
}

class TMDBService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 30 * 60 * 1000; // 30 minutes

  // Get the current API key from settings or fallback
  private getApiKey(): string {
    const settingsApiKey = settingsService.tmdbApiKey;
    return settingsApiKey || FALLBACK_TMDB_API_KEY;
  }

  // Check if API key is configured
  public isConfigured(): boolean {
    const apiKey = this.getApiKey();
    return !!(apiKey && apiKey !== FALLBACK_TMDB_API_KEY);
  }

  // Make API request to TMDB
  private async tmdbRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const apiKey = this.getApiKey();
    
    if (!apiKey) {
      throw new Error('TMDB API key not configured. Please configure your API key in settings.');
    }

    const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
      url.searchParams.append('api_key', apiKey);
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid TMDB API key. Please check your API key in settings.');
        }
        throw new Error(`TMDB API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      
      return data;
    } catch (error) {
      console.error('TMDB API Request failed:', error);
      throw error;
    }
  }

  // Convert TMDB item to our format
  private convertTMDBItem(item: any, type?: 'movie' | 'tv'): ContentItem {
    // Enhanced type detection logic
    let finalType: 'movie' | 'tv';
    
    if (type) {
      // Use explicit type if provided
      finalType = type;
    } else if (item.media_type) {
      // Use media_type from TMDB API
      finalType = item.media_type === 'tv' ? 'tv' : 'movie';
    } else {
      // Fallback logic based on properties
      const hasMovieProps = item.title || item.release_date || item.runtime;
      const hasTvProps = item.name || item.first_air_date || item.number_of_seasons || item.number_of_episodes;
      
      if (hasTvProps && !hasMovieProps) {
        finalType = 'tv';
      } else if (hasMovieProps && !hasTvProps) {
        finalType = 'movie';
      } else if (item.first_air_date || item.number_of_seasons) {
        finalType = 'tv';
      } else {
        finalType = 'movie';
      }
    }
    
    // Use IMDB ID from external_ids if available, or from item directly
    const imdbId = item.external_ids?.imdb_id || item.imdb_id || null;
    
    const contentItem: ContentItem = {
      id: item.id,
      tmdb_id: item.id,
      imdb_id: imdbId,
      title: item.title || item.name,
      originalTitle: item.original_title || item.original_name,
      type: finalType,
      year: item.release_date ? new Date(item.release_date).getFullYear() : 
            item.first_air_date ? new Date(item.first_air_date).getFullYear() : null,
      releaseDate: item.release_date || item.first_air_date || '',
      overview: item.overview || '',
      poster: item.poster_path ? `${TMDB_IMAGE_BASE_URL}w500${item.poster_path}` : null,
      backdropPath: item.backdrop_path ? `${TMDB_IMAGE_BASE_URL}w1280${item.backdrop_path}` : null,
      rating: item.vote_average || 0,
      voteCount: item.vote_count || 0,
      popularity: item.popularity || 0,
      genres: item.genres ? item.genres.map((g: any) => g.name) : [],
      genreIds: item.genre_ids || [],
      runtime: item.runtime || null,
      seasons: item.number_of_seasons || null,
      episodes: item.number_of_episodes || null,
      status: item.status || null,
      isAdult: item.adult || false,
      // Use IMDB ID for streaming if available, otherwise use TMDB ID
      streamUrl: this.generate2EmbedUrl(imdbId || item.id, finalType)
    };

    return contentItem;
  }

  // Generate 2embed streaming URLs
  private generate2EmbedUrl(id: number | string, type: 'movie' | 'tv', season?: number, episode?: number): string {
    // Handle IMDB IDs (starting with 'tt') vs TMDB IDs (numeric)
    // const isImdbId = typeof id === 'string' && id.startsWith('tt');
    
    if (type === 'tv') {
      if (season && episode) {
        // Specific episode - use embedtv with season and episode parameters
        return `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`;
      } else if (season) {
        // Full season - use embedtv with just season parameter
        return `https://www.2embed.cc/embedtv/${id}&s=${season}`;
      } else {
        // Full TV series - use embedtvfull
        return `https://www.2embed.cc/embedtvfull/${id}`;
      }
    } else {
      // Movie - simple embed
      return `https://www.2embed.cc/embed/${id}`;
    }
  }

  // Get streaming URL for any content (supports both TMDB and IMDB IDs)
  getStreamingUrl(id: number | string, type: 'movie' | 'tv', season?: number, episode?: number): string {
    return this.generate2EmbedUrl(id, type, season, episode);
  }

  // Get streaming URL specifically for IMDB ID
  getStreamingUrlByImdbId(imdbId: string, type: 'movie' | 'tv', season?: number, episode?: number): string {
    return this.generate2EmbedUrl(imdbId, type, season, episode);
  }

  // Get trending content
  async getTrending(timeWindow: 'day' | 'week' = 'week', limit: number = 20): Promise<ContentItem[]> {
    try {
      const data = await this.tmdbRequest(`/trending/all/${timeWindow}`, { page: 1 });
      return data.results
        .slice(0, limit)
        .filter((item: any) => item.media_type !== 'person')
        .map((item: any) => this.convertTMDBItem(item));
    } catch (error) {
      console.error('Error fetching trending content:', error);
      return [];
    }
  }

  // Get popular content
  async getPopular(type: 'movie' | 'tv' | 'all' = 'all', page: number = 1, limit: number = 20): Promise<PaginatedResponse<ContentItem>> {
    try {
      let results: ContentItem[] = [];
      let totalPages = 1;
      let totalResults = 0;

      if (type === 'all') {
        // Get both movies and TV shows
        const [moviesData, tvData] = await Promise.all([
          this.tmdbRequest('/movie/popular', { page }),
          this.tmdbRequest('/tv/popular', { page })
        ]);
        
        const movies = moviesData.results.slice(0, Math.floor(limit / 2)).map((item: any) => this.convertTMDBItem(item, 'movie'));
        const tvShows = tvData.results.slice(0, Math.ceil(limit / 2)).map((item: any) => this.convertTMDBItem(item, 'tv'));
        
        results = [...movies, ...tvShows].sort((a, b) => b.popularity - a.popularity);
        totalPages = Math.max(moviesData.total_pages, tvData.total_pages);
        totalResults = moviesData.total_results + tvData.total_results;
      } else {
        const endpoint = type === 'movie' ? '/movie/popular' : '/tv/popular';
        const data = await this.tmdbRequest(endpoint, { page });
        results = data.results.slice(0, limit).map((item: any) => this.convertTMDBItem(item, type));
        totalPages = data.total_pages;
        totalResults = data.total_results;
      }

      return {
        results,
        pagination: {
          page,
          limit,
          total: totalResults,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error fetching popular content:', error);
      return {
        results: [],
        pagination: { page: 1, limit: 20, hasNext: false, hasPrev: false }
      };
    }
  }

  // Search content
  async search(query: string, filters: SearchFilters = {}, page: number = 1, limit: number = 20): Promise<PaginatedResponse<ContentItem>> {
    if (!query.trim()) {
      return {
        results: [],
        pagination: { page: 1, limit: 20, hasNext: false, hasPrev: false }
      };
    }

    try {
      let results: ContentItem[] = [];
      let totalPages = 1;
      let totalResults = 0;

      if (filters.type === 'all' || !filters.type) {
        const data = await this.tmdbRequest('/search/multi', { query, page });
        results = data.results
          .filter((item: any) => item.media_type !== 'person')
          .slice(0, limit)
          .map((item: any) => this.convertTMDBItem(item));
        totalPages = data.total_pages;
        totalResults = data.total_results;
      } else {
        const endpoint = filters.type === 'movie' ? '/search/movie' : '/search/tv';
        const data = await this.tmdbRequest(endpoint, { query, page });
        results = data.results.slice(0, limit).map((item: any) => this.convertTMDBItem(item, filters.type === 'all' ? undefined : filters.type));
        totalPages = data.total_pages;
        totalResults = data.total_results;
      }

      return {
        results,
        pagination: {
          page,
          limit,
          total: totalResults,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error searching content:', error);
      return {
        results: [],
        pagination: { page: 1, limit: 20, hasNext: false, hasPrev: false }
      };
    }
  }

  // Get content details
  async getDetails(id: number, type: 'movie' | 'tv'): Promise<ContentItem | null> {
    try {
      const endpoint = type === 'movie' ? `/movie/${id}` : `/tv/${id}`;
      const data = await this.tmdbRequest(endpoint, { 
        append_to_response: 'credits,videos,similar,external_ids' 
      });
      
      const item = this.convertTMDBItem(data, type);
      
      // Add additional details
      return {
        ...item,
        // @ts-ignore - Adding extra properties
        credits: data.credits,
        videos: data.videos,
        similar: data.similar ? data.similar.results.slice(0, 10).map((sim: any) => this.convertTMDBItem(sim, type)) : [],
        externalIds: data.external_ids,
        // For TV shows, add season streaming URLs
        seasonUrls: type === 'tv' && item.seasons ? 
          Array.from({ length: item.seasons }, (_, i) => ({
            season: i + 1,
            url: this.generate2EmbedUrl(item.tmdb_id, 'tv', i + 1)
          })) : null
      };
    } catch (error) {
      console.error('Error fetching content details:', error);
      return null;
    }
  }

  // Get TV season details
  async getSeasonDetails(tvId: number, seasonNumber: number): Promise<SeasonDetails | null> {
    try {
      const data = await this.tmdbRequest(`/tv/${tvId}/season/${seasonNumber}`);
      
      const episodes: EpisodeDetails[] = data.episodes.map((episode: any) => ({
        id: episode.id,
        name: episode.name,
        overview: episode.overview,
        episodeNumber: episode.episode_number,
        seasonNumber: episode.season_number,
        airDate: episode.air_date,
        stillPath: episode.still_path ? `${TMDB_IMAGE_BASE_URL}w500${episode.still_path}` : null,
        voteAverage: episode.vote_average,
        streamUrl: this.generate2EmbedUrl(tvId, 'tv', seasonNumber, episode.episode_number)
      }));
      
      return {
        id: data.id,
        name: data.name,
        overview: data.overview,
        seasonNumber: data.season_number,
        airDate: data.air_date,
        poster: data.poster_path ? `${TMDB_IMAGE_BASE_URL}w500${data.poster_path}` : null,
        episodes
      };
    } catch (error) {
      console.error('Error fetching season details:', error);
      return null;
    }
  }

  // Discover content by filters
  async discover(type: 'movie' | 'tv', filters: {
    genre?: number;
    year?: number;
    sortBy?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedResponse<ContentItem>> {
    try {
      const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv';
      const params: any = {
        page: filters.page || 1,
        sort_by: filters.sortBy || 'popularity.desc'
      };
      
      if (filters.genre) params.with_genres = filters.genre;
      if (filters.year) {
        if (type === 'movie') {
          params.year = filters.year;
        } else {
          params.first_air_date_year = filters.year;
        }
      }
      
      const data = await this.tmdbRequest(endpoint, params);
      const limit = filters.limit || 20;
      
      const results = data.results.slice(0, limit).map((item: any) => this.convertTMDBItem(item, type));
      
      return {
        results,
        pagination: {
          page: filters.page || 1,
          limit,
          total: data.total_results,
          totalPages: data.total_pages,
          hasNext: (filters.page || 1) < data.total_pages,
          hasPrev: (filters.page || 1) > 1
        }
      };
    } catch (error) {
      console.error('Error discovering content:', error);
      return {
        results: [],
        pagination: { page: 1, limit: 20, hasNext: false, hasPrev: false }
      };
    }
  }

  // Get genres
  async getGenres(type: 'movie' | 'tv'): Promise<Genre[]> {
    try {
      const endpoint = type === 'movie' ? '/genre/movie/list' : '/genre/tv/list';
      const data = await this.tmdbRequest(endpoint);
      return data.genres;
    } catch (error) {
      console.error('Error fetching genres:', error);
      return [];
    }
  }

  // Get now playing movies
  async getNowPlaying(limit: number = 20): Promise<ContentItem[]> {
    try {
      const data = await this.tmdbRequest('/movie/now_playing');
      return data.results.slice(0, limit).map((item: any) => this.convertTMDBItem(item, 'movie'));
    } catch (error) {
      console.error('Error fetching now playing movies:', error);
      return [];
    }
  }

  // Get upcoming movies
  async getUpcoming(limit: number = 20): Promise<ContentItem[]> {
    try {
      const data = await this.tmdbRequest('/movie/upcoming');
      return data.results.slice(0, limit).map((item: any) => this.convertTMDBItem(item, 'movie'));
    } catch (error) {
      console.error('Error fetching upcoming movies:', error);
      return [];
    }
  }

  // Get top rated content
  async getTopRated(type: 'movie' | 'tv', limit: number = 20): Promise<ContentItem[]> {
    try {
      const endpoint = type === 'movie' ? '/movie/top_rated' : '/tv/top_rated';
      const data = await this.tmdbRequest(endpoint);
      return data.results.slice(0, limit).map((item: any) => this.convertTMDBItem(item, type));
    } catch (error) {
      console.error('Error fetching top rated content:', error);
      return [];
    }
  }

  // Get TV shows airing today
  async getAiringToday(limit: number = 20): Promise<ContentItem[]> {
    try {
      const data = await this.tmdbRequest('/tv/airing_today');
      return data.results.slice(0, limit).map((item: any) => this.convertTMDBItem(item, 'tv'));
    } catch (error) {
      console.error('Error fetching airing today shows:', error);
      return [];
    }
  }

  // Helper methods for backward compatibility
  async searchMulti(query: string): Promise<ContentItem[]> {
    const result = await this.search(query, { type: 'all' });
    return result.results;
  }

  async getPopularMovies(): Promise<ContentItem[]> {
    const result = await this.getPopular('movie');
    return result.results;
  }

  async getPopularTVShows(): Promise<ContentItem[]> {
    const result = await this.getPopular('tv');
    return result.results;
  }

  async getTopRatedMovies(): Promise<ContentItem[]> {
    return this.getTopRated('movie');
  }

  async getTopRatedTVShows(): Promise<ContentItem[]> {
    return this.getTopRated('tv');
  }

  async getNowPlayingMovies(): Promise<ContentItem[]> {
    return this.getNowPlaying();
  }

  async getUpcomingMovies(): Promise<ContentItem[]> {
    return this.getUpcoming();
  }

  async getTVAiringToday(): Promise<ContentItem[]> {
    return this.getAiringToday();
  }

  async getContentByGenre(genre: string, type: 'movie' | 'tv'): Promise<ContentItem[]> {
    const genres = await this.getGenres(type);
    const genreObj = genres.find(g => g.name.toLowerCase() === genre.toLowerCase());
    
    if (!genreObj) {
      console.warn(`Genre "${genre}" not found`);
      return [];
    }
    
    const result = await this.discover(type, { genre: genreObj.id });
    return result.results;
  }

  // Image URL helpers (keeping from original)
  getPosterUrl(path: string, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string {
    return `${TMDB_IMAGE_BASE_URL}${size}${path}`;
  }

  getBackdropUrl(path: string, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w1280'): string {
    return `${TMDB_IMAGE_BASE_URL}${size}${path}`;
  }

  // Get external IDs for a content item (including IMDB ID)
  async getExternalIds(id: number, type: 'movie' | 'tv'): Promise<{ imdb_id?: string; [key: string]: any } | null> {
    try {
      const endpoint = type === 'movie' ? `/movie/${id}/external_ids` : `/tv/${id}/external_ids`;
      const data = await this.tmdbRequest(endpoint);
      return data;
    } catch (error) {
      console.error('Error fetching external IDs:', error);
      return null;
    }
  }

  // Enhanced method to get content with IMDB ID (similar to PHP logic)
  async getContentWithImdbId(id: number, type: 'movie' | 'tv'): Promise<ContentItem | null> {
    try {
      // Get both content details and external IDs
      const [contentData, externalIds] = await Promise.all([
        this.getDetails(id, type),
        this.getExternalIds(id, type)
      ]);

      if (!contentData) return null;

      // Update IMDB ID if we found one
      if (externalIds?.imdb_id && !contentData.imdb_id) {
        contentData.imdb_id = externalIds.imdb_id;
        // Update stream URL to use IMDB ID
        contentData.streamUrl = this.generate2EmbedUrl(externalIds.imdb_id, type);
      }

      return contentData;
    } catch (error) {
      console.error('Error fetching content with IMDB ID:', error);
      return null;
    }
  }
}

// Export singleton instance
export const tmdbService = new TMDBService();
export default tmdbService;
