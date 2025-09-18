import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { SmartContentMapper, ContentMappingError } from '../smart-content-mapper';
import { ContentItem } from '../tmdb-service';
import { tmdbService } from '../tmdb-service';

// Mock the tmdb service
vi.mock('../tmdb-service', () => ({
  tmdbService: {
    getStreamingUrl: vi.fn(),
    getExternalIds: vi.fn(),
  }
}));

describe('SmartContentMapper', () => {
  let mapper: SmartContentMapper;
  let mockTmdbService: {
    getStreamingUrl: Mock;
    getExternalIds: Mock;
  };

  const mockMovieContent: ContentItem = {
    id: 123,
    tmdb_id: 123,
    imdb_id: 'tt1234567',
    title: 'Test Movie',
    originalTitle: 'Test Movie Original',
    type: 'movie',
    year: 2023,
    releaseDate: '2023-01-01',
    overview: 'A test movie for unit testing',
    poster: 'https://image.tmdb.org/t/p/w500/test-poster.jpg',
    backdropPath: 'https://image.tmdb.org/t/p/w1280/test-backdrop.jpg',
    rating: 7.5,
    voteCount: 1000,
    popularity: 85.5,
    genres: ['Action', 'Adventure'],
    genreIds: [28, 12],
    runtime: 120,
    seasons: null,
    episodes: null,
    status: 'Released',
    isAdult: false
  };

  const mockTvContent: ContentItem = {
    id: 456,
    tmdb_id: 456,
    imdb_id: 'tt7654321',
    title: 'Test TV Show',
    originalTitle: 'Test TV Show Original',
    type: 'tv',
    year: 2022,
    releaseDate: '2022-06-01',
    overview: 'A test TV show for unit testing',
    poster: 'https://image.tmdb.org/t/p/w500/test-tv-poster.jpg',
    backdropPath: 'https://image.tmdb.org/t/p/w1280/test-tv-backdrop.jpg',
    rating: 8.2,
    voteCount: 2500,
    popularity: 92.3,
    genres: ['Drama', 'Thriller'],
    genreIds: [18, 53],
    runtime: null,
    seasons: 3,
    episodes: 30,
    status: 'Ended',
    isAdult: false
  };

  beforeEach(() => {
    mapper = new SmartContentMapper();
    mockTmdbService = tmdbService as any;
    
    // Reset mocks
    mockTmdbService.getStreamingUrl.mockReset();
    mockTmdbService.getExternalIds.mockReset();
    
    // Clear cache
    mapper.clearCache();
  });

  describe('tmdbToNetflixCard', () => {
    it('should convert movie content to Netflix card format', () => {
      const result = mapper.tmdbToNetflixCard(mockMovieContent);

      expect(result).toEqual({
        id: '123',
        imdb_id: 'tt1234567',
        title: 'Test Movie',
        year: 2023,
        rating: 7.5,
        genres: ['Action', 'Adventure'],
        poster: 'https://image.tmdb.org/t/p/w500/test-poster.jpg',
        backdropPath: 'https://image.tmdb.org/t/p/w1280/test-backdrop.jpg',
        overview: 'A test movie for unit testing',
        type: 'movie',
        runtime: 120,
        tmdb_rating: 7.5,
        seasons: undefined,
        episodes: undefined,
        tmdb_id: 123
      });
    });

    it('should convert TV content to Netflix card format', () => {
      const result = mapper.tmdbToNetflixCard(mockTvContent);

      expect(result).toEqual({
        id: '456',
        imdb_id: 'tt7654321',
        title: 'Test TV Show',
        year: 2022,
        rating: 8.2,
        genres: ['Drama', 'Thriller'],
        poster: 'https://image.tmdb.org/t/p/w500/test-tv-poster.jpg',
        backdropPath: 'https://image.tmdb.org/t/p/w1280/test-tv-backdrop.jpg',
        overview: 'A test TV show for unit testing',
        type: 'tv',
        runtime: null,
        tmdb_rating: 8.2,
        seasons: 3,
        episodes: 30,
        tmdb_id: 456
      });
    });

    it('should handle missing IMDB ID by generating fallback', () => {
      const contentWithoutImdb = { ...mockMovieContent, imdb_id: undefined };
      const result = mapper.tmdbToNetflixCard(contentWithoutImdb);

      expect(result.imdb_id).toBe('tmdb_123');
    });

    it('should handle anime content type', () => {
      const animeContent = { ...mockTvContent, type: 'anime' as const };
      const result = mapper.tmdbToNetflixCard(animeContent);

      expect(result.type).toBe('anime');
    });

    it('should throw ContentMappingError on invalid content', () => {
      const invalidContent = { ...mockMovieContent, tmdb_id: null as any };
      
      expect(() => mapper.tmdbToNetflixCard(invalidContent)).toThrow(ContentMappingError);
    });
  });

  describe('tmdbToStreamingUrl', () => {
    beforeEach(() => {
      mockTmdbService.getStreamingUrl.mockReturnValue('https://multiembed.mov/?video_id=tt1234567');
    });

    it('should generate streaming URL using IMDB ID by default', () => {
      const result = mapper.tmdbToStreamingUrl(mockMovieContent);

      expect(mockTmdbService.getStreamingUrl).toHaveBeenCalledWith('tt1234567', 'movie', undefined, undefined);
      expect(result).toBe('https://multiembed.mov/?video_id=tt1234567');
    });

    it('should fallback to TMDB ID when IMDB ID is missing', () => {
      const contentWithoutImdb = { ...mockMovieContent, imdb_id: undefined };
      const result = mapper.tmdbToStreamingUrl(contentWithoutImdb);

      expect(mockTmdbService.getStreamingUrl).toHaveBeenCalledWith(123, 'movie', undefined, undefined);
      expect(result).toBe('https://multiembed.mov/?video_id=tt1234567');
    });

    it('should handle TV content with season and episode', () => {
      const result = mapper.tmdbToStreamingUrl(mockTvContent, { season: 1, episode: 5 });

      expect(mockTmdbService.getStreamingUrl).toHaveBeenCalledWith('tt7654321', 'tv', 1, 5);
      expect(result).toBe('https://multiembed.mov/?video_id=tt1234567');
    });

    it('should handle anime content by converting to tv type', () => {
      const animeContent = { ...mockTvContent, type: 'anime' as const };
      const result = mapper.tmdbToStreamingUrl(animeContent);

      expect(mockTmdbService.getStreamingUrl).toHaveBeenCalledWith('tt7654321', 'tv', undefined, undefined);
      expect(result).toBe('https://multiembed.mov/?video_id=tt1234567');
    });

    it('should use TMDB ID when preferImdbId is false', () => {
      const result = mapper.tmdbToStreamingUrl(mockMovieContent, { preferImdbId: false });

      expect(mockTmdbService.getStreamingUrl).toHaveBeenCalledWith(123, 'movie', undefined, undefined);
      expect(result).toBe('https://multiembed.mov/?video_id=tt1234567');
    });
  });

  describe('validateContentCompleteness', () => {
    it('should validate complete content as valid', () => {
      const result = mapper.validateContentCompleteness(mockMovieContent);

      expect(result.isValid).toBe(true);
      expect(result.completeness).toBeGreaterThan(80);
      expect(result.qualityScore).toBeGreaterThan(50);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should identify missing required fields', () => {
      const incompleteContent = { ...mockMovieContent, title: '', tmdb_id: null as any };
      const result = mapper.validateContentCompleteness(incompleteContent);

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('title');
      expect(result.missingFields).toContain('tmdb_id');
    });

    it('should warn about missing important fields', () => {
      const contentWithoutPoster = { ...mockMovieContent, poster: null };
      const result = mapper.validateContentCompleteness(contentWithoutPoster);

      expect(result.warnings).toContain('Missing important field: poster');
    });

    it('should warn about low ratings', () => {
      const lowRatedContent = { ...mockMovieContent, rating: 2.0 };
      const result = mapper.validateContentCompleteness(lowRatedContent);

      expect(result.warnings).toContain('Content has very low rating');
    });

    it('should warn about missing IMDB ID', () => {
      const contentWithoutImdb = { ...mockMovieContent, imdb_id: undefined };
      const result = mapper.validateContentCompleteness(contentWithoutImdb);

      expect(result.warnings).toContain('Missing IMDB ID - streaming may not work properly');
    });

    it('should perform TV-specific validation', () => {
      const tvWithoutSeasons = { ...mockTvContent, seasons: null };
      const result = mapper.validateContentCompleteness(tvWithoutSeasons);

      expect(result.warnings).toContain('TV show missing season information');
    });

    it('should perform movie-specific validation', () => {
      const movieWithoutRuntime = { ...mockMovieContent, runtime: null };
      const result = mapper.validateContentCompleteness(movieWithoutRuntime);

      expect(result.warnings).toContain('Movie missing runtime information');
    });
  });

  describe('enrichWithStreamingData', () => {
    beforeEach(() => {
      mockTmdbService.getExternalIds.mockResolvedValue({ imdb_id: 'tt9999999' });
      mockTmdbService.getStreamingUrl.mockReturnValue('https://multiembed.mov/?video_id=tt9999999');
    });

    it('should enrich content with external IDs when missing', async () => {
      const contentWithoutImdb = { ...mockMovieContent, imdb_id: undefined };
      const result = await mapper.enrichWithStreamingData(contentWithoutImdb, { includeExternalIds: true });

      expect(mockTmdbService.getExternalIds).toHaveBeenCalledWith(123, 'movie');
      expect(result.imdb_id).toBe('tt9999999');
    });

    it('should add streaming URLs when requested', async () => {
      const result = await mapper.enrichWithStreamingData(mockMovieContent, { includeStreamingUrls: true });

      expect(result.streamUrl).toBe('https://multiembed.mov/?video_id=tt9999999');
    });

    it('should add season URLs for TV shows', async () => {
      const result = await mapper.enrichWithStreamingData(mockTvContent, { includeSeasonUrls: true });

      expect((result as any).seasonUrls).toHaveLength(3);
      expect((result as any).seasonUrls[0]).toEqual({
        season: 1,
        url: 'https://multiembed.mov/?video_id=tt9999999'
      });
    });

    it('should handle anime content for season URLs', async () => {
      const animeContent = { ...mockTvContent, type: 'anime' as const };
      const result = await mapper.enrichWithStreamingData(animeContent, { includeSeasonUrls: true });

      expect((result as any).seasonUrls).toHaveLength(3);
    });

    it('should add validation result when requested', async () => {
      const result = await mapper.enrichWithStreamingData(mockMovieContent, { validateQuality: true });

      expect((result as any).validationResult).toBeDefined();
      expect((result as any).validationResult.isValid).toBe(true);
    });

    it('should use cache for repeated requests', async () => {
      const contentWithoutImdb = { ...mockMovieContent, imdb_id: undefined };
      const options = { includeExternalIds: true };
      
      await mapper.enrichWithStreamingData(contentWithoutImdb, options);
      await mapper.enrichWithStreamingData(contentWithoutImdb, options);

      expect(mockTmdbService.getExternalIds).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
      mockTmdbService.getExternalIds.mockRejectedValue(new Error('API Error'));
      
      const result = await mapper.enrichWithStreamingData(mockMovieContent, { includeExternalIds: true });

      expect(result.imdb_id).toBe('tt1234567'); // Should keep original
    });
  });

  describe('batchTmdbToNetflixCard', () => {
    it('should convert multiple items successfully', () => {
      const contents = [mockMovieContent, mockTvContent];
      const results = mapper.batchTmdbToNetflixCard(contents);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Test Movie');
      expect(results[1].title).toBe('Test TV Show');
    });

    it('should handle errors in individual items', () => {
      const invalidContent = { ...mockMovieContent, tmdb_id: null as any };
      const contents = [mockMovieContent, invalidContent, mockTvContent];
      
      const results = mapper.batchTmdbToNetflixCard(contents);

      expect(results).toHaveLength(2); // Should skip the invalid one
      expect(results[0].title).toBe('Test Movie');
      expect(results[1].title).toBe('Test TV Show');
    });
  });

  describe('generateStreamingUrlById', () => {
    beforeEach(() => {
      mockTmdbService.getStreamingUrl.mockReturnValue('https://multiembed.mov/?video_id=123&tmdb=1');
    });

    it('should generate streaming URL by ID', () => {
      const result = mapper.generateStreamingUrlById(123, 'movie');

      expect(mockTmdbService.getStreamingUrl).toHaveBeenCalledWith(123, 'movie', undefined, undefined);
      expect(result).toBe('https://multiembed.mov/?video_id=123&tmdb=1');
    });

    it('should handle TV content with season and episode', () => {
      const result = mapper.generateStreamingUrlById('tt1234567', 'tv', { season: 2, episode: 10 });

      expect(mockTmdbService.getStreamingUrl).toHaveBeenCalledWith('tt1234567', 'tv', 2, 10);
      expect(result).toBe('https://multiembed.mov/?video_id=123&tmdb=1');
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      mapper.clearCache();
      const stats = mapper.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should return cache statistics', () => {
      const stats = mapper.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxAge');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.maxAge).toBe('number');
    });
  });
});
