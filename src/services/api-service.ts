// API service for communicating with the backend
const API_BASE_URL = 'http://localhost:3001/api';

export interface ApiContentItem {
  id: string;
  imdb_id: string;
  title: string;
  originalTitle: string;
  type: 'movie' | 'tv';
  year: number | null;
  runtime: number | null;
  genres: string[];
  isAdult: boolean;
  poster: string;
  backdropPath: string;
  rating: number;
  overview?: string;
  seasons?: number;
  episodes?: Array<{
    season: number;
    episode: number;
    imdb_id: string;
  }>;
}

class ApiService {
  private async fetchJson<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API fetch error for ${url}:`, error);
      throw error;
    }
  }

  async getPopularContent(type: 'all' | 'movie' | 'tvSeries' = 'all', limit: number = 20): Promise<ApiContentItem[]> {
    const url = `${API_BASE_URL}/content/popular?type=${type}&limit=${limit}`;
    return this.fetchJson<ApiContentItem[]>(url);
  }

  async getTrendingContent(limit: number = 10): Promise<ApiContentItem[]> {
    const url = `${API_BASE_URL}/content/trending?limit=${limit}`;
    return this.fetchJson<ApiContentItem[]>(url);
  }

  async searchContent(query: string, limit: number = 20): Promise<ApiContentItem[]> {
    if (!query || query.length < 2) return [];
    
    const url = `${API_BASE_URL}/content/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    return this.fetchJson<ApiContentItem[]>(url);
  }

  async getContentById(imdbId: string): Promise<ApiContentItem> {
    const url = `${API_BASE_URL}/content/${imdbId}`;
    return this.fetchJson<ApiContentItem>(url);
  }

  async getHealthCheck(): Promise<{
    status: string;
    dataLoaded: boolean;
    titlesCount: number;
    episodesCount: number;
    timestamp: string;
  }> {
    const url = `${API_BASE_URL}/health`;
    return this.fetchJson<any>(url);
  }

  async getContentByGenre(genre: string, limit: number = 20): Promise<ApiContentItem[]> {
    const url = `${API_BASE_URL}/content/genre/${encodeURIComponent(genre)}?limit=${limit}`;
    return this.fetchJson<ApiContentItem[]>(url);
  }

  async getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }
    
    const url = `${API_BASE_URL}/content/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`;
    return this.fetchJson<string[]>(url);
  }

  async getAllContent(options: {
    page?: number;
    limit?: number;
    type?: 'all' | 'movie' | 'tv';
    yearMin?: number;
    yearMax?: number;
    genre?: string;
    sort?: 'recent' | 'alphabetical' | 'rating' | 'random';
  } = {}): Promise<{
    items: ApiContentItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const params = new URLSearchParams();
    
    if (options.page) params.set('page', options.page.toString());
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.type) params.set('type', options.type);
    if (options.yearMin) params.set('year_min', options.yearMin.toString());
    if (options.yearMax) params.set('year_max', options.yearMax.toString());
    if (options.genre) params.set('genre', options.genre);
    if (options.sort) params.set('sort', options.sort);
    
    const url = `${API_BASE_URL}/content/all?${params.toString()}`;
    return this.fetchJson<any>(url);
  }

  // Convert API content item to frontend content item format
  convertToContentItem(apiItem: ApiContentItem): any {
    return {
      id: apiItem.id,
      imdbId: apiItem.imdb_id,
      title: apiItem.title,
      originalTitle: apiItem.originalTitle,
      type: apiItem.type,
      releaseDate: apiItem.year ? `${apiItem.year}-01-01` : '',
      runtime: apiItem.runtime,
      genres: apiItem.genres,
      posterPath: apiItem.poster,
      backdropPath: apiItem.backdropPath,
      rating: apiItem.rating,
      overview: apiItem.overview || `${apiItem.title} is a ${apiItem.type} from ${apiItem.year}.`,
      seasons: apiItem.seasons,
      episodes: apiItem.episodes
    };
  }
}

export const apiService = new ApiService(); 