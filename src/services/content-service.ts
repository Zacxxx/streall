// Content service inspired by the PHP scripts for fetching latest movies and episodes
import { tmdbService } from './tmdb-service';

export interface ContentItem {
  imdb_id: string;
  tmdb_id: number;
  title: string;
  imdb_embed: string;
  tmdb_embed: string;
  poster: string;
  season?: number;
  episode?: number;
  type: 'movie' | 'tv';
  year?: number;
  rating?: number;
  overview?: string;
}

export class ContentService {
  private cache = new Map<string, ContentItem[]>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  private setCache(key: string, data: ContentItem[]) {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  // Simulate the PHP movie fetching logic
  async getLatestMovies(page: number = 1): Promise<ContentItem[]> {
    const cacheKey = `movies-${page}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey) || [];
    }

    try {
      // Get popular movies from TMDB (simulating vidsrc.me API)
      const movies = await tmdbService.getPopularMovies();
      
      const contentItems: ContentItem[] = [];
      
      for (const movie of movies.slice(0, 20)) {
        if (!movie.imdb_id) continue;
        
        const contentItem: ContentItem = {
          imdb_id: movie.imdb_id,
          tmdb_id: movie.id,
          title: movie.title,
          imdb_embed: `https://www.2embed.cc/embed/${movie.imdb_id}`,
          tmdb_embed: `https://www.2embed.cc/embed/${movie.imdb_id}`,
          poster: movie.poster || 'n/a',
          type: 'movie',
          year: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : undefined,
          rating: movie.rating,
          overview: movie.overview
        };
        
        contentItems.push(contentItem);
      }
      
      this.setCache(cacheKey, contentItems);
      return contentItems;
      
    } catch (error) {
      console.error('Error fetching latest movies:', error);
      return [];
    }
  }

  // Simulate the PHP TV episodes fetching logic
  async getLatestEpisodes(page: number = 1): Promise<ContentItem[]> {
    const cacheKey = `episodes-${page}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey) || [];
    }

    try {
      // Get popular TV shows from TMDB
      const tvShows = await tmdbService.getPopularTVShows();
      
      const contentItems: ContentItem[] = [];
      
      for (const show of tvShows.slice(0, 15)) {
        if (!show.imdb_id) continue;
        
        // Generate episodes for each season (simulate latest episodes)
        const maxSeasons = show.seasons || 3;
        const episodesPerSeason = Math.min(6, 12); // Simulate recent episodes
        
        for (let season = 1; season <= maxSeasons; season++) {
          for (let episode = 1; episode <= episodesPerSeason; episode++) {
            const contentItem: ContentItem = {
              imdb_id: show.imdb_id,
              tmdb_id: show.id,
              title: show.title,
              season,
              episode,
              imdb_embed: `https://www.2embed.cc/embedtv/${show.imdb_id}&s=${season}&e=${episode}`,
              tmdb_embed: `https://www.2embed.cc/embedtv/${show.imdb_id}&s=${season}&e=${episode}`,
              poster: show.poster || 'n/a',
              type: 'tv',
              year: show.releaseDate ? new Date(show.releaseDate).getFullYear() : undefined,
              rating: show.rating,
              overview: show.overview
            };
            
            contentItems.push(contentItem);
            
            // Limit total episodes per page
            if (contentItems.length >= 20) break;
          }
          if (contentItems.length >= 20) break;
        }
      }
      
      this.setCache(cacheKey, contentItems);
      return contentItems;
      
    } catch (error) {
      console.error('Error fetching latest episodes:', error);
      return [];
    }
  }

  // Get trending content (mix of movies and TV)
  async getTrendingContent(): Promise<ContentItem[]> {
    const cacheKey = 'trending';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey) || [];
    }

    try {
      const [movies, episodes] = await Promise.all([
        this.getLatestMovies(1),
        this.getLatestEpisodes(1)
      ]);
      
      // Mix movies and episodes
      const trending = [...movies.slice(0, 10), ...episodes.slice(0, 10)]
        .sort(() => Math.random() - 0.5); // Shuffle
      
      this.setCache(cacheKey, trending);
      return trending;
      
    } catch (error) {
      console.error('Error fetching trending content:', error);
      return [];
    }
  }

  // Search content by title (using local IMDB database)
  async searchContent(query: string): Promise<ContentItem[]> {
    try {
      // First search TMDB for comprehensive results
      const tmdbResults = await tmdbService.searchMulti(query);
      
      const contentItems: ContentItem[] = [];
      
      for (const item of tmdbResults.slice(0, 20)) {
        if (!item.imdb_id) {
          // Try to find IMDB ID if not available
          try {
            // Try to find TMDB data by searching title
            const searchResult = await tmdbService.search(item.title);
            const tmdbData = searchResult.results[0];
            if (tmdbData?.imdb_id) {
              item.imdb_id = tmdbData.imdb_id;
            }
          } catch (error) {
            console.log(`Could not find IMDB ID for ${item.title}`);
            continue;
          }
        }
        
        const contentItem: ContentItem = {
          imdb_id: item.imdb_id || `tt${item.id}`, // Fallback
          tmdb_id: item.id,
          title: item.title,
          imdb_embed: item.type === 'tv' 
            ? `https://www.2embed.cc/embedtvfull/${item.imdb_id}` 
            : `https://www.2embed.cc/embed/${item.imdb_id}`,
          tmdb_embed: item.type === 'tv' 
            ? `https://www.2embed.cc/embedtvfull/${item.imdb_id}` 
            : `https://www.2embed.cc/embed/${item.imdb_id}`,
          poster: item.poster || 'n/a',
          type: item.type as 'movie' | 'tv',
          year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined,
          rating: item.rating,
          overview: item.overview
        };
        
        contentItems.push(contentItem);
      }
      
      return contentItems;
      
    } catch (error) {
      console.error('Error searching content:', error);
      return [];
    }
  }

  // Get content by IMDB ID
  async getContentByImdbId(imdbId: string): Promise<ContentItem | null> {
    try {
      const cleanId = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;
      
      // Find content using TMDB
      // Try to find content by searching
      const searchResult = await tmdbService.search(cleanId);
      const tmdbData = searchResult.results[0];
      
      if (!tmdbData) return null;
      
      const isTV = tmdbData.type === 'tv';
      
      const contentItem: ContentItem = {
        imdb_id: cleanId,
        tmdb_id: tmdbData.id,
        title: tmdbData.title || 'Unknown Title',
        imdb_embed: isTV 
          ? `https://www.2embed.cc/embedtvfull/${cleanId}` 
          : `https://www.2embed.cc/embed/${cleanId}`,
        tmdb_embed: isTV 
          ? `https://www.2embed.cc/embedtvfull/${cleanId}` 
          : `https://www.2embed.cc/embed/${cleanId}`,
        poster: tmdbData.poster || 'n/a',
        type: isTV ? 'tv' : 'movie',
        year: tmdbData.year || undefined,
        rating: tmdbData.rating,
        overview: tmdbData.overview
      };
      
      return contentItem;
      
    } catch (error) {
      console.error(`Error getting content for ${imdbId}:`, error);
      return null;
    }
  }

  // Generate embed URL for specific episode
  generateEpisodeEmbedUrl(imdbId: string, season: number, episode: number): string {
    const cleanId = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;
    return `https://www.2embed.cc/embedtv/${cleanId}&s=${season}&e=${episode}`;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

export const contentService = new ContentService(); 