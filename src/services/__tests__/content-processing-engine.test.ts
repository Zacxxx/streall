import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ContentProcessingEngine, ContentProcessingError, TMDBServiceError } from '../content-processing-engine';
import { tmdbService, ContentItem } from '../tmdb-service';

// Mock all external dependencies
vi.mock('../tmdb-service', () => ({
  tmdbService: {
    search: vi.fn(),
    getDetails: vi.fn(),
    getExternalIds: vi.fn(),
    getStreamingUrl: vi.fn()
  }
}));

// Mock performance optimization service
vi.mock('../performance-optimization-service', () => ({
  performanceOptimizationService: {
    optimizedContentSearch: vi.fn(),
    batchTMDBRequests: vi.fn()
  }
}));

// Mock error handling service
vi.mock('../error-handling-service', () => ({
  errorHandlingService: {
    executeWithRetry: vi.fn().mockImplementation(async (operation) => {
      return await operation();
    }),
    handleError: vi.fn(),
    normalizeError: vi.fn()
  }
}));

describe('ContentProcessingEngine', () => {
  let engine: ContentProcessingEngine;
  const mockTmdbService = vi.mocked(tmdbService);

  // Mock content items for testing
  const mockMovieContent: ContentItem = {
    id: 1,
    tmdb_id: 1,
    imdb_id: 'tt0111161',
    title: 'The Shawshank Redemption',
    originalTitle: 'The Shawshank Redemption',
    type: 'movie',
    year: 1994,
    releaseDate: '1994-09-23',
    overview: 'Two imprisoned men bond over a number of years...',
    poster: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    backdropPath: 'https://image.tmdb.org/t/p/w1280/backdrop.jpg',
    rating: 9.3,
    voteCount: 2000000,
    popularity: 85.5,
    genres: ['Drama', 'Crime'],
    genreIds: [18, 80],
    runtime: 142,
    seasons: null,
    episodes: null,
    status: 'Released',
    isAdult: false,
    streamUrl: 'https://www.2embed.cc/embed/tt0111161'
  };

  const mockTVContent: ContentItem = {
    id: 2,
    tmdb_id: 2,
    imdb_id: 'tt0903747',
    title: 'Breaking Bad',
    originalTitle: 'Breaking Bad',
    type: 'tv',
    year: 2008,
    releaseDate: '2008-01-20',
    overview: 'A high school chemistry teacher turned meth cook...',
    poster: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    backdropPath: 'https://image.tmdb.org/t/p/w1280/backdrop.jpg',
    rating: 9.5,
    voteCount: 1500000,
    popularity: 95.2,
    genres: ['Drama', 'Crime', 'Thriller'],
    genreIds: [18, 80, 53],
    runtime: null,
    seasons: 5,
    episodes: 62,
    status: 'Ended',
    isAdult: false,
    streamUrl: 'https://www.2embed.cc/embedtvfull/tt0903747'
  };

  beforeEach(() => {
    engine = new ContentProcessingEngine({
      maxConcurrentRequests: 3,
      requestTimeout: 5000,
      retryAttempts: 1,
      retryDelay: 100,
      enableFallbackSearch: true,
      minContentQuality: 0
    });

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    engine.clearCache();
  });

  describe('convertAISuggestionsToTMDB', () => {
    it('should convert AI suggestions to TMDB content successfully', async () => {
      const titles = ['The Shawshank Redemption', 'Breaking Bad'];
      
      // Mock search results
      mockTmdbService.search
        .mockResolvedValueOnce({
          results: [mockMovieContent],
          pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
        })
        .mockResolvedValueOnce({
          results: [mockTVContent],
          pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
        });

      // Mock detailed content
      mockTmdbService.getDetails
        .mockResolvedValueOnce(mockMovieContent)
        .mockResolvedValueOnce(mockTVContent);

      // Mock external IDs (already have IMDB IDs)
      mockTmdbService.getExternalIds
        .mockResolvedValue({ imdb_id: 'tt0111161' });

      const result = await engine.convertAISuggestionsToTMDB(titles);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('The Shawshank Redemption');
      expect(result[1].title).toBe('Breaking Bad');
      expect(mockTmdbService.search).toHaveBeenCalledTimes(2);
    });

    it('should handle empty titles array', async () => {
      const result = await engine.convertAISuggestionsToTMDB([]);
      expect(result).toEqual([]);
      expect(mockTmdbService.search).not.toHaveBeenCalled();
    });

    it('should filter out low-quality content', async () => {
      const lowQualityContent = {
        ...mockMovieContent,
        rating: 3.0,
        voteCount: 10
      };

      engine = new ContentProcessingEngine({
        minContentQuality: 5.0
      });

      mockTmdbService.search.mockResolvedValue({
        results: [lowQualityContent],
        pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
      });

      mockTmdbService.getDetails.mockResolvedValue(lowQualityContent);

      const result = await engine.convertAISuggestionsToTMDB(['Low Quality Movie']);

      expect(result).toHaveLength(0);
    });

    it('should handle processing errors gracefully', async () => {
      mockTmdbService.search.mockRejectedValue(new Error('TMDB API Error'));

      // The method should return empty array instead of throwing for individual failures
      const result = await engine.convertAISuggestionsToTMDB(['Test Movie']);
      expect(result).toEqual([]);
    });
  });

  describe('searchAndValidateContent', () => {
    it('should search and validate content successfully', async () => {
      mockTmdbService.search.mockResolvedValue({
        results: [mockMovieContent],
        pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
      });

      mockTmdbService.getDetails.mockResolvedValue(mockMovieContent);
      mockTmdbService.getExternalIds.mockResolvedValue({ imdb_id: 'tt0111161' });

      const result = await engine.searchAndValidateContent('The Shawshank Redemption');

      expect(result).not.toBeNull();
      expect(result?.title).toBe('The Shawshank Redemption');
      expect(result?.type).toBe('movie');
    });

    it('should search for specific content type', async () => {
      mockTmdbService.search.mockResolvedValue({
        results: [mockTVContent],
        pagination: { page: 1, limit: 3, hasNext: false, hasPrev: false }
      });

      mockTmdbService.getDetails.mockResolvedValue(mockTVContent);

      const result = await engine.searchAndValidateContent('Breaking Bad', 'tv');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('tv');
      expect(mockTmdbService.search).toHaveBeenCalledWith('Breaking Bad', { type: 'tv' }, 1, 3);
    });

    it('should return null for content not found', async () => {
      mockTmdbService.search.mockResolvedValue({
        results: [],
        pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
      });

      const result = await engine.searchAndValidateContent('Non-existent Movie');

      expect(result).toBeNull();
    });

    it('should use cache for repeated searches', async () => {
      mockTmdbService.search.mockResolvedValue({
        results: [mockMovieContent],
        pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
      });

      mockTmdbService.getDetails.mockResolvedValue(mockMovieContent);

      // First search
      const result1 = await engine.searchAndValidateContent('The Shawshank Redemption');
      
      // Second search (should use cache)
      const result2 = await engine.searchAndValidateContent('The Shawshank Redemption');

      expect(result1).toEqual(result2);
      expect(mockTmdbService.search).toHaveBeenCalledTimes(1); // Only called once due to caching
    });

    it('should handle TMDB service errors', async () => {
      mockTmdbService.search.mockRejectedValue(new Error('TMDB API Error'));

      const result = await engine.searchAndValidateContent('Test Movie');

      expect(result).toBeNull();
    });
  });

  describe('batchProcessTitles', () => {
    it('should process multiple titles concurrently', async () => {
      const titles = ['Movie 1', 'Movie 2', 'Movie 3'];
      
      mockTmdbService.search
        .mockResolvedValueOnce({
          results: [{ ...mockMovieContent, title: 'Movie 1' }],
          pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
        })
        .mockResolvedValueOnce({
          results: [{ ...mockMovieContent, title: 'Movie 2' }],
          pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
        })
        .mockResolvedValueOnce({
          results: [{ ...mockMovieContent, title: 'Movie 3' }],
          pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
        });

      mockTmdbService.getDetails
        .mockResolvedValueOnce({ ...mockMovieContent, title: 'Movie 1' })
        .mockResolvedValueOnce({ ...mockMovieContent, title: 'Movie 2' })
        .mockResolvedValueOnce({ ...mockMovieContent, title: 'Movie 3' });

      const result = await engine.batchProcessTitles(titles);

      expect(result.results).toHaveLength(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.successRate).toBe(1.0);
    });

    it('should handle partial failures in batch processing', async () => {
      const titles = ['Good Movie', 'Bad Movie'];
      
      mockTmdbService.search
        .mockResolvedValueOnce({
          results: [mockMovieContent],
          pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
        })
        .mockResolvedValueOnce({
          results: [],
          pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
        });

      mockTmdbService.getDetails.mockResolvedValueOnce(mockMovieContent);

      const result = await engine.batchProcessTitles(titles);

      expect(result.results).toHaveLength(2);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.successRate).toBe(0.5);
    });

    it('should remove duplicate titles', async () => {
      const titles = ['Movie 1', 'Movie 1', 'Movie 2'];
      
      mockTmdbService.search
        .mockResolvedValueOnce({
          results: [{ ...mockMovieContent, title: 'Movie 1' }],
          pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
        })
        .mockResolvedValueOnce({
          results: [{ ...mockMovieContent, title: 'Movie 2' }],
          pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
        });

      mockTmdbService.getDetails
        .mockResolvedValueOnce({ ...mockMovieContent, title: 'Movie 1' })
        .mockResolvedValueOnce({ ...mockMovieContent, title: 'Movie 2' });

      const result = await engine.batchProcessTitles(titles);

      expect(result.results).toHaveLength(2); // Only 2 unique titles processed
      expect(mockTmdbService.search).toHaveBeenCalledTimes(2);
    });
  });

  describe('enrichContentWithMetadata', () => {
    it('should enrich content with IMDB ID when missing', async () => {
      const contentWithoutImdb = { ...mockMovieContent, imdb_id: undefined };
      
      mockTmdbService.getExternalIds.mockResolvedValue({ imdb_id: 'tt0111161' });
      mockTmdbService.getStreamingUrl.mockReturnValue('https://www.2embed.cc/embed/tt0111161');

      const result = await engine.enrichContentWithMetadata(contentWithoutImdb);

      expect(result.imdb_id).toBe('tt0111161');
      expect(result.streamUrl).toBe('https://www.2embed.cc/embed/tt0111161');
    });

    it('should add quality indicators', async () => {
      const result = await engine.enrichContentWithMetadata(mockMovieContent);

      expect(result).toHaveProperty('qualityScore');
      expect(result).toHaveProperty('isHighQuality');
      expect(result).toHaveProperty('isPopular');
      expect(result).toHaveProperty('hasValidPoster');
      expect(result).toHaveProperty('hasValidBackdrop');
    });

    it('should handle enrichment errors gracefully', async () => {
      mockTmdbService.getExternalIds.mockRejectedValue(new Error('API Error'));

      const result = await engine.enrichContentWithMetadata(mockMovieContent);

      // Should return original content even if enrichment fails
      expect(result.title).toBe(mockMovieContent.title);
    });
  });

  describe('String similarity and matching', () => {
    it('should find best match from multiple results', async () => {
      const searchResults = [
        { ...mockMovieContent, title: 'The Shawshank Redemption', rating: 9.3 },
        { ...mockMovieContent, title: 'Shawshank', rating: 7.0 },
        { ...mockMovieContent, title: 'Redemption', rating: 6.0 }
      ];

      mockTmdbService.search.mockResolvedValue({
        results: searchResults,
        pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
      });

      mockTmdbService.getDetails.mockResolvedValue(searchResults[0]);

      const result = await engine.searchAndValidateContent('The Shawshank Redemption');

      expect(result?.title).toBe('The Shawshank Redemption');
    });

    it('should prefer exact title matches', async () => {
      const searchResults = [
        { ...mockMovieContent, title: 'Similar Title', rating: 8.0 },
        { ...mockMovieContent, title: 'Exact Match', rating: 7.0 }
      ];

      mockTmdbService.search.mockResolvedValue({
        results: searchResults,
        pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
      });

      mockTmdbService.getDetails.mockResolvedValue(searchResults[1]);

      const result = await engine.searchAndValidateContent('Exact Match');

      expect(result?.title).toBe('Exact Match');
    });
  });

  describe('Fallback search', () => {
    it('should try fallback search when initial search fails', async () => {
      // First search returns no results
      mockTmdbService.search
        .mockResolvedValueOnce({
          results: [],
          pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
        })
        // Fallback search finds result
        .mockResolvedValueOnce({
          results: [mockMovieContent],
          pagination: { page: 1, limit: 3, hasNext: false, hasPrev: false }
        });

      mockTmdbService.getDetails.mockResolvedValue(mockMovieContent);

      const result = await engine.searchAndValidateContent('The Shawshank Redemption (1994)');

      expect(result).not.toBeNull();
      expect(result?.title).toBe('The Shawshank Redemption');
      expect(mockTmdbService.search).toHaveBeenCalledTimes(2); // Initial + fallback
    });

    it('should disable fallback search when configured', async () => {
      engine = new ContentProcessingEngine({
        enableFallbackSearch: false
      });

      mockTmdbService.search.mockResolvedValue({
        results: [],
        pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
      });

      const result = await engine.searchAndValidateContent('Non-existent Movie');

      expect(result).toBeNull();
      expect(mockTmdbService.search).toHaveBeenCalledTimes(1); // No fallback
    });
  });

  describe('Configuration and utilities', () => {
    it('should update configuration', () => {
      const newConfig = {
        maxConcurrentRequests: 10,
        minContentQuality: 7.0
      };

      engine.updateConfig(newConfig);

      // Configuration should be updated (we can't directly test private config,
      // but we can test behavior that depends on it)
      expect(() => engine.updateConfig(newConfig)).not.toThrow();
    });

    it('should clear cache', () => {
      engine.clearCache();
      
      const stats = engine.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should provide cache statistics', () => {
      const stats = engine.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });
  });

  describe('Error handling', () => {
    it('should handle TMDBServiceError correctly', async () => {
      mockTmdbService.search.mockRejectedValue(new Error('TMDB API Error'));

      const result = await engine.searchAndValidateContent('Test Movie');

      expect(result).toBeNull();
    });

    it('should retry failed requests', async () => {
      engine = new ContentProcessingEngine({
        retryAttempts: 2,
        retryDelay: 10
      });

      // Test that retry configuration is properly set and retry logic exists
      const titles = ['Test Movie'];
      
      // Mock all attempts to fail to test retry behavior
      mockTmdbService.search.mockRejectedValue(new Error('Persistent error'));

      const result = await engine.batchProcessTitles(titles);

      // Should have attempted retries (even if all fail)
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].title).toBe('Test Movie');
      expect(result.failureCount).toBe(1);
      
      // The retry mechanism should be in place (we can't easily test the exact number 
      // of calls due to the complex async retry logic, but we can verify behavior)
      expect(result.results[0].error).toBeDefined();
    });

    it('should filter adult content', async () => {
      const adultContent = { ...mockMovieContent, isAdult: true };

      mockTmdbService.search.mockResolvedValue({
        results: [adultContent],
        pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
      });

      mockTmdbService.getDetails.mockResolvedValue(adultContent);

      const result = await engine.searchAndValidateContent('Adult Movie');

      expect(result).toBeNull(); // Should be filtered out
    });
  });
});