// Frontend-only database service using TMDB API directly
import { tmdbService, ContentItem, SearchFilters, PaginatedResponse } from './tmdb-service';

class DatabaseService {
  private isInitialized = false;

  constructor() {
    console.log('🚀 Frontend Database Service initialized (TMDB Direct)');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Test TMDB connection by getting a small amount of data
      await tmdbService.getTrending('week', 1);
      console.log('✅ TMDB API connected successfully');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to connect to TMDB API:', error);
      throw new Error('Failed to initialize TMDB service');
    }
  }

  // Get popular content
  async getPopularContent(
    type: 'all' | 'movie' | 'tv' = 'all',
    limit: number = 20,
    page: number = 1
  ): Promise<PaginatedResponse<ContentItem>> {
    await this.initialize();
    return tmdbService.getPopular(type, page, limit);
  }

  // Get trending content
  async getTrendingContent(
    limit: number = 20,
    timeWindow: 'day' | 'week' = 'week'
  ): Promise<ContentItem[]> {
    await this.initialize();
    return tmdbService.getTrending(timeWindow, limit);
  }

  // Search content
  async searchContent(
    query: string,
    filters: SearchFilters = {},
    limit: number = 20,
    page: number = 1
  ): Promise<PaginatedResponse<ContentItem>> {
    await this.initialize();
    return tmdbService.search(query, filters, page, limit);
  }

  // Get content details
  async getContentDetails(id: number, type: 'movie' | 'tv' = 'movie'): Promise<ContentItem | null> {
    await this.initialize();
    return tmdbService.getDetails(id, type);
  }

  // Get TV season details
  async getSeasonDetails(tvId: number, seasonNumber: number): Promise<any> {
    await this.initialize();
    return tmdbService.getSeasonDetails(tvId, seasonNumber);
  }

  // Discover content by genre/filters
  async discoverContent(
    type: 'movie' | 'tv' = 'movie',
    filters: {
      genre?: number;
      year?: number;
      sortBy?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<PaginatedResponse<ContentItem>> {
    await this.initialize();
    return tmdbService.discover(type, filters);
  }

  // Get genres
  async getGenres(type: 'movie' | 'tv' = 'movie'): Promise<Array<{ id: number; name: string }>> {
    await this.initialize();
    return tmdbService.getGenres(type);
  }

  // Generate streaming URL
  getStreamingUrl(
    tmdbId: number,
    type: 'movie' | 'tv',
    season?: number,
    episode?: number
  ): string {
    return tmdbService.getStreamingUrl(tmdbId, type, season, episode);
  }

  // Get streaming info (same as URL for frontend-only version)
  async getStreamingInfo(
    tmdbId: number,
    type: 'movie' | 'tv',
    season?: number,
    episode?: number
  ): Promise<{
    tmdbId: number;
    type: string;
    season: number | null;
    episode: number | null;
    streamUrl: string;
  }> {
    await this.initialize();
    
    return {
      tmdbId: tmdbId,
      type: type,
      season: season || null,
      episode: episode || null,
      streamUrl: this.getStreamingUrl(tmdbId, type, season, episode)
    };
  }

  // Backward compatibility methods
  async getAllContent(page: number = 1, limit: number = 50): Promise<PaginatedResponse<ContentItem>> {
    return this.getPopularContent('all', limit, page);
  }

  async getMovies(limit: number = 20): Promise<ContentItem[]> {
    const response = await this.getPopularContent('movie', limit);
    return response.results;
  }

  async getTVShows(limit: number = 20): Promise<ContentItem[]> {
    const response = await this.getPopularContent('tv', limit);
    return response.results;
  }

  async getContentByGenre(genre: string, type: 'movie' | 'tv' = 'movie'): Promise<ContentItem[]> {
    await this.initialize();
    return tmdbService.getContentByGenre(genre, type);
  }

  // Additional convenience methods using TMDB service
  async getTopRated(type: 'movie' | 'tv', limit: number = 20): Promise<ContentItem[]> {
    await this.initialize();
    return tmdbService.getTopRated(type, limit);
  }

  async getNowPlaying(limit: number = 20): Promise<ContentItem[]> {
    await this.initialize();
    return tmdbService.getNowPlaying(limit);
  }

  async getUpcoming(limit: number = 20): Promise<ContentItem[]> {
    await this.initialize();
    return tmdbService.getUpcoming(limit);
  }

  async getAiringToday(limit: number = 20): Promise<ContentItem[]> {
    await this.initialize();
    return tmdbService.getAiringToday(limit);
  }

  // Get service statistics
  async getStats(): Promise<any> {
    await this.initialize();
    
    return {
      status: 'healthy',
      service: 'TMDB Frontend Service',
      features: ['TMDB API', '2embed streaming', 'Direct frontend calls', 'No backend required'],
      version: '4.0.0-frontend-only',
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
export type { ContentItem, SearchFilters, PaginatedResponse };
export default databaseService; 