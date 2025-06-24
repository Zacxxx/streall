// Anime service for 2anime.xyz and animeapi.skin integration

const ANIME_API_BASE_URL = 'https://animeapi.skin';
const EMBED_BASE_URL = 'https://2anime.xyz/embed';

export interface AnimeItem {
  id: number;
  title: string;
  title_en?: string;
  title_jp?: string;
  slug: string;
  description?: string;
  poster?: string | null;
  cover?: string | null;
  year?: number | null;
  status?: string;
  type?: string;
  episodes?: number | null;
  genres?: string[];
  rating?: number | null;
  duration?: string;
  studio?: string;
  streamUrl: string; // 2anime.xyz embed URL
}

export interface AnimeEpisode {
  id: number;
  number: number;
  title?: string;
  description?: string;
  thumbnail?: string;
  duration?: string;
  streamUrl: string;
}

export interface AnimeSearchResult {
  results: AnimeItem[];
  pagination?: {
    page: number;
    hasNext: boolean;
    total?: number;
  };
}

class AnimeService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 15 * 60 * 1000; // 15 minutes cache for anime data

  // Make API request to anime API
  private async animeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const url = new URL(`${ANIME_API_BASE_URL}${endpoint}`);
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Anime API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      
      return data;
    } catch (error) {
      console.error('Anime API Request failed:', error);
      throw error;
    }
  }

  // Convert API response to our AnimeItem format
  private convertAnimeItem(item: any): AnimeItem {
    // Extract title from the API response
    const title = item.title || 'Unknown Title';
    const slug = this.generateSlug(title);
    
    return {
      id: Math.random() * 1000000, // Generate random ID since API doesn't provide one
      title: title,
      title_en: item.title2 || title,
      title_jp: item.title2 || title,
      slug,
      description: '', // API doesn't provide description
      poster: item.thumbnail_url || null,
      cover: item.thumbnail_url || null,
      year: null, // API doesn't provide year directly
      status: '',
      type: 'anime',
      episodes: this.extractEpisodeNumber(item.episode) || null,
      genres: [],
      rating: null,
      duration: '',
      studio: '',
      streamUrl: item.embed_url || this.generateEmbedUrl(slug, this.extractEpisodeNumber(item.episode) || 1)
    };
  }

  // Extract episode number from episode string
  private extractEpisodeNumber(episodeStr: string): number | null {
    if (!episodeStr) return null;
    const num = parseInt(episodeStr);
    return isNaN(num) ? null : num;
  }

  // Generate slug from title for embed URL
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  }

  // Generate 2anime.xyz embed URL
  generateEmbedUrl(titleSlug: string, episodeNumber: number): string {
    return `${EMBED_BASE_URL}/${titleSlug}-episode-${episodeNumber}`;
  }

  // Get popular/trending anime
  async getTrendingAnime(limit: number = 20): Promise<AnimeItem[]> {
    try {
      const data = await this.animeRequest('/trending');
      const animeList = data.value || [];
      
      return animeList
        .slice(0, limit)
        .map((item: any) => this.convertAnimeItem(item));
    } catch (error) {
      console.error('Failed to fetch trending anime:', error);
      // Return fallback mock data
      return this.getMockPopularAnime().slice(0, limit);
    }
  }

  // Get new anime with pagination
  async getNewAnime(page: number = 1, limit: number = 20): Promise<AnimeSearchResult> {
    try {
      const data = await this.animeRequest('/new', { page });
      const animeList = data.value || [];
      
      return {
        results: animeList
          .slice(0, limit)
          .map((item: any) => this.convertAnimeItem(item)),
        pagination: {
          page,
          hasNext: animeList.length >= limit,
          total: data.Count || animeList.length
        }
      };
    } catch (error) {
      console.error('Failed to fetch new anime:', error);
      // Return fallback mock data
      return { 
        results: this.getMockPopularAnime().slice(0, limit),
        pagination: {
          page,
          hasNext: false,
          total: this.getMockPopularAnime().length
        }
      };
    }
  }

  // Search anime by keywords
  async searchAnime(query: string, page: number = 1, limit: number = 20): Promise<AnimeSearchResult> {
    if (!query.trim()) {
      return { results: [] };
    }

    try {
      const data = await this.animeRequest('/search', { q: query });
      const animeList = data.value || [];
      
      return {
        results: animeList
          .slice(0, limit)
          .map((item: any) => this.convertAnimeItem(item)),
        pagination: {
          page,
          hasNext: animeList.length >= limit,
          total: data.Count || animeList.length
        }
      };
    } catch (error) {
      console.error('Failed to search anime:', error);
      // Return filtered mock data
      const mockData = this.getMockPopularAnime();
      const filtered = mockData.filter(anime => 
        anime.title.toLowerCase().includes(query.toLowerCase())
      );
      return { 
        results: filtered.slice(0, limit),
        pagination: {
          page,
          hasNext: false,
          total: filtered.length
        }
      };
    }
  }

  // Get episodes for a specific anime
  async getAnimeEpisodes(title: string): Promise<AnimeEpisode[]> {
    try {
      const data = await this.animeRequest('/episodes', { title });
      const episodes = data.value || [];
      
      return episodes.map((episode: any, index: number) => ({
        id: episode.id || index + 1,
        number: this.extractEpisodeNumber(episode.episode) || index + 1,
        title: episode.title || `Episode ${this.extractEpisodeNumber(episode.episode) || index + 1}`,
        description: episode.description || '',
        thumbnail: episode.thumbnail_url || null,
        duration: episode.duration || '',
        streamUrl: episode.embed_url || this.generateEmbedUrl(this.generateSlug(title), this.extractEpisodeNumber(episode.episode) || index + 1)
      }));
    } catch (error) {
      console.error('Failed to fetch anime episodes:', error);
      // Return empty array as fallback
      return [];
    }
  }

  // Get anime details by slug
  async getAnimeDetails(titleSlug: string): Promise<AnimeItem | null> {
    try {
      // Since the API doesn't have a direct details endpoint, try searching for the title
      const searchResults = await this.searchAnime(titleSlug.replace(/-/g, ' '));
      return searchResults.results[0] || null;
    } catch (error) {
      console.error('Failed to fetch anime details:', error);
      return null;
    }
  }

  // Mock data for fallback
  getMockPopularAnime(): AnimeItem[] {
    return [
      {
        id: 1,
        title: 'One Piece',
        title_en: 'One Piece',
        title_jp: 'ワンピース',
        slug: 'one-piece',
        description: 'Follow Monkey D. Luffy and his pirate crew in search of the greatest treasure ever left by the legendary Pirate, Gold Roger.',
        poster: 'https://cdn.myanimelist.net/images/anime/6/73245.jpg',
        cover: 'https://cdn.myanimelist.net/images/anime/6/73245.jpg',
        year: 1999,
        status: 'Ongoing',
        type: 'TV',
        episodes: 1000,
        genres: ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Shounen'],
        rating: 9.0,
        duration: '24 min',
        studio: 'Toei Animation',
        streamUrl: this.generateEmbedUrl('one-piece', 1)
      },
      {
        id: 2,
        title: 'Naruto',
        title_en: 'Naruto',
        title_jp: 'ナルト',
        slug: 'naruto',
        description: 'Naruto Uzumaki, a hyperactive ninja, searches for approval and recognition, as well as to become Hokage.',
        poster: 'https://cdn.myanimelist.net/images/anime/13/17405.jpg',
        cover: 'https://cdn.myanimelist.net/images/anime/13/17405.jpg',
        year: 2002,
        status: 'Completed',
        type: 'TV',
        episodes: 720,
        genres: ['Action', 'Martial Arts', 'Comedy', 'Super Power', 'Drama', 'Fantasy', 'Shounen'],
        rating: 8.4,
        duration: '23 min',
        studio: 'Pierrot',
        streamUrl: this.generateEmbedUrl('naruto', 1)
      },
      {
        id: 3,
        title: 'Attack on Titan',
        title_en: 'Attack on Titan',
        title_jp: '進撃の巨人',
        slug: 'attack-on-titan',
        description: 'Humanity fights for survival against giant humanoid Titans.',
        poster: 'https://cdn.myanimelist.net/images/anime/10/47347.jpg',
        cover: 'https://cdn.myanimelist.net/images/anime/10/47347.jpg',
        year: 2013,
        status: 'Completed',
        type: 'TV',
        episodes: 75,
        genres: ['Action', 'Drama', 'Fantasy', 'Military', 'Shounen', 'Super Power'],
        rating: 8.7,
        duration: '24 min',
        studio: 'WIT Studio / MAPPA',
        streamUrl: this.generateEmbedUrl('attack-on-titan', 1)
      },
      {
        id: 4,
        title: 'My Hero Academia',
        title_en: 'My Hero Academia',
        title_jp: '僕のヒーローアカデミア',
        slug: 'my-hero-academia',
        description: 'A superhero-loving boy without any powers enrolls in a prestigious hero academy.',
        poster: 'https://cdn.myanimelist.net/images/anime/10/78745.jpg',
        cover: 'https://cdn.myanimelist.net/images/anime/10/78745.jpg',
        year: 2016,
        status: 'Ongoing',
        type: 'TV',
        episodes: 138,
        genres: ['Action', 'Comedy', 'School', 'Shounen', 'Super Power'],
        rating: 8.5,
        duration: '24 min',
        studio: 'Bones',
        streamUrl: this.generateEmbedUrl('my-hero-academia', 1)
      }
    ];
  }

  // Convert anime to ContentItem format for compatibility
  convertToContentItem(anime: AnimeItem): any {
    return {
      id: anime.id,
      tmdb_id: anime.id,
      imdb_id: anime.slug,
      title: anime.title,
      originalTitle: anime.title_jp || anime.title,
      type: 'anime' as const,
      year: anime.year,
      releaseDate: anime.year ? `${anime.year}-01-01` : '',
      overview: anime.description || '',
      poster: anime.poster,
      backdropPath: anime.cover || anime.poster,
      rating: anime.rating || 0,
      voteCount: 0,
      popularity: 0,
      genres: anime.genres || [],
      genreIds: [],
      runtime: null,
      seasons: null,
      episodes: anime.episodes,
      status: anime.status,
      isAdult: false,
      streamUrl: anime.streamUrl
    };
  }
}

// Export singleton instance
export const animeService = new AnimeService();
export default animeService; 