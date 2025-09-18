import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { aiRecommendationService } from '../ai-recommendation-service';
import { enhancedChatRecommendationEngine } from '../enhanced-chat-recommendation-engine';
import { contentProcessingEngine } from '../content-processing-engine';
import { enhancedCacheService } from '../enhanced-cache-service';

// Mock all external services
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            curator: {
              name: "Integration Test Curator",
              bio: "A test curator for integration testing",
              expertise: ["Action", "Drama", "Sci-Fi"],
              description: "Expert in modern cinema"
            },
            theme: "Modern Action Cinema",
            reasoning: "Selected for high-energy entertainment",
            suggestedTitles: ["Mad Max: Fury Road", "John Wick", "The Matrix"]
          })
        }
      })
    })
  }))
}));

vi.mock('../tmdb-service', () => ({
  tmdbService: {
    search: vi.fn().mockResolvedValue({
      results: [
        {
          id: 1,
          tmdb_id: 76341,
          title: 'Mad Max: Fury Road',
          type: 'movie',
          year: 2015,
          rating: 8.1,
          genres: ['Action', 'Adventure'],
          poster: '/poster1.jpg',
          overview: 'Post-apocalyptic action film'
        }
      ],
      pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
    }),
    getDetails: vi.fn().mockResolvedValue({
      id: 1,
      tmdb_id: 76341,
      title: 'Mad Max: Fury Road',
      type: 'movie',
      year: 2015,
      rating: 8.1,
      genres: ['Action', 'Adventure'],
      poster: '/poster1.jpg',
      overview: 'Post-apocalyptic action film'
    }),
    getExternalIds: vi.fn().mockResolvedValue({ imdb_id: 'tt1392190' }),
    getStreamingUrl: vi.fn().mockReturnValue('https://multiembed.mov/?video_id=tt1392190')
  }
}));

vi.mock('../error-handling-service', () => ({
  errorHandlingService: {
    executeWithRetry: vi.fn().mockImplementation(async (operation) => {
      return await operation();
    }),
    handleError: vi.fn(),
    normalizeError: vi.fn()
  }
}));

vi.mock('../performance-optimization-service', () => ({
  performanceOptimizationService: {
    optimizedContentSearch: vi.fn().mockResolvedValue([
      {
        id: 1,
        tmdb_id: 76341,
        title: 'Mad Max: Fury Road',
        type: 'movie',
        year: 2015,
        rating: 8.1,
        genres: ['Action', 'Adventure'],
        poster: '/poster1.jpg',
        overview: 'Post-apocalyptic action film'
      }
    ]),
    batchTMDBRequests: vi.fn().mockResolvedValue([
      {
        id: 'test-request',
        success: true,
        data: {
          id: 1,
          tmdb_id: 76341,
          title: 'Mad Max: Fury Road'
        }
      }
    ])
  }
}));

describe('AI Suggestions Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enhancedCacheService.clearAllCaches();
  });

  afterEach(() => {
    enhancedCacheService.clearAllCaches();
  });

  describe('Daily Curator Generation Flow', () => {
    it('should generate complete daily selection with real content', async () => {
      const result = await aiRecommendationService.generateDailyCurator();

      // Verify curator structure
      expect(result).toHaveProperty('curator');
      expect(result.curator).toHaveProperty('name');
      expect(result.curator).toHaveProperty('bio');
      expect(result.curator).toHaveProperty('expertise');
      expect(result.curator).toHaveProperty('description');

      // Verify theme structure
      expect(result).toHaveProperty('theme');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('suggestedTitles');

      // Verify content structure
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);

      // Verify metadata
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('generatedAt');
      expect(result.metadata).toHaveProperty('aiModel');
      expect(result.metadata).toHaveProperty('contentSource');
    });

    it('should cache daily selection and retrieve from cache', async () => {
      const dateKey = enhancedCacheService.getCurrentDateKey();
      
      // First call should generate new content
      const result1 = await aiRecommendationService.generateDailyCurator();
      
      // Verify it was cached
      const cached = enhancedCacheService.getDailySelection(dateKey);
      expect(cached).toBeDefined();
      expect(cached?.curator.name).toBe(result1.curator.name);

      // Second call should use cache (mock should only be called once)
      const result2 = await aiRecommendationService.generateDailyCurator();
      expect(result2.curator.name).toBe(result1.curator.name);
    });

    it('should handle AI service failures gracefully', async () => {
      // Mock AI service to fail
      const mockGenAI = vi.mocked(await import('@google/generative-ai'));
      mockGenAI.GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockRejectedValue(new Error('AI service unavailable'))
        })
      }) as any);

      const result = await aiRecommendationService.generateDailyCurator();

      // Should still return a valid curator (fallback)
      expect(result).toHaveProperty('curator');
      expect(result.curator.name).toBeDefined();
      expect(result.theme).toBeDefined();
    });
  });

  describe('Chat Recommendation Flow', () => {
    it('should process user request and return recommendations', async () => {
      const mockChatAI = vi.mocked(await import('@google/generative-ai'));
      mockChatAI.GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn()
            .mockResolvedValueOnce({
              response: {
                text: () => JSON.stringify({
                  genres: ['action'],
                  moods: ['energetic'],
                  contentTypes: ['movie'],
                  confidence: 0.8
                })
              }
            })
            .mockResolvedValueOnce({
              response: {
                text: () => JSON.stringify({
                  responseText: "Here are some great action movies!",
                  suggestedTitles: ["Mad Max: Fury Road", "John Wick"],
                  confidence: 0.9,
                  conversationFlow: "recommending"
                })
              }
            })
        })
      }) as any);

      const result = await enhancedChatRecommendationEngine.processUserRequest(
        'I want some action movies',
        'test-session'
      );

      expect(result.responseText).toContain('action');
      expect(result.suggestedTitles).toContain('Mad Max: Fury Road');
      expect(result.content).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should maintain conversation context', async () => {
      const sessionId = 'context-test';
      
      // First interaction
      await enhancedChatRecommendationEngine.processUserRequest(
        'I like sci-fi movies',
        sessionId
      );

      // Second interaction should have context
      const result = await enhancedChatRecommendationEngine.processUserRequest(
        'something different',
        sessionId
      );

      expect(result).toBeDefined();
      expect(result.responseText).toBeDefined();
    });

    it('should cache chat responses', async () => {
      const message = 'recommend action movies';
      const sessionId = 'cache-test';
      
      // First request
      const result1 = await enhancedChatRecommendationEngine.processUserRequest(
        message,
        sessionId
      );

      // Check if response was cached
      const messageHash = enhancedCacheService.generateMessageHash(message);
      const cached = enhancedCacheService.getChatResponse(messageHash);
      
      expect(cached).toBeDefined();
    });
  });

  describe('Content Processing Integration', () => {
    it('should convert AI suggestions to TMDB content', async () => {
      const titles = ['Mad Max: Fury Road', 'John Wick', 'The Matrix'];
      
      const result = await contentProcessingEngine.convertAISuggestionsToTMDB(titles);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('tmdb_id');
        expect(result[0]).toHaveProperty('title');
        expect(result[0]).toHaveProperty('type');
      }
    });

    it('should handle batch processing with mixed success/failure', async () => {
      const mockTmdbService = vi.mocked(await import('../tmdb-service'));
      
      // Mock some searches to fail
      mockTmdbService.tmdbService.search
        .mockResolvedValueOnce({
          results: [{ id: 1, title: 'Success Movie' }],
          pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
        })
        .mockRejectedValueOnce(new Error('Search failed'))
        .mockResolvedValueOnce({
          results: [{ id: 2, title: 'Another Success' }],
          pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
        });

      const titles = ['Success Movie', 'Failed Movie', 'Another Success'];
      const result = await contentProcessingEngine.batchProcessTitles(titles);

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.results).toHaveLength(3);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle complete system failure gracefully', async () => {
      // Mock all services to fail
      const mockTmdbService = vi.mocked(await import('../tmdb-service'));
      mockTmdbService.tmdbService.search.mockRejectedValue(new Error('TMDB down'));

      const mockGenAI = vi.mocked(await import('@google/generative-ai'));
      mockGenAI.GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockRejectedValue(new Error('AI down'))
        })
      }) as any);

      // Should still return fallback content
      const result = await aiRecommendationService.generateDailyCurator();
      
      expect(result).toBeDefined();
      expect(result.curator).toBeDefined();
      expect(result.theme).toBeDefined();
    });

    it('should recover from partial failures', async () => {
      const mockTmdbService = vi.mocked(await import('../tmdb-service'));
      
      // First call fails, second succeeds
      mockTmdbService.tmdbService.search
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          results: [{ id: 1, title: 'Recovery Movie' }],
          pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
        });

      const result = await contentProcessingEngine.searchAndValidateContent('Test Movie');
      
      expect(result).toBeDefined();
      expect(result?.title).toBe('Recovery Movie');
    });
  });

  describe('Performance Integration', () => {
    it('should complete daily generation within reasonable time', async () => {
      const startTime = Date.now();
      
      const result = await aiRecommendationService.generateDailyCurator();
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result).toBeDefined();
    });

    it('should handle concurrent requests efficiently', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        enhancedChatRecommendationEngine.processUserRequest(
          `Request ${i}`,
          `session-${i}`
        )
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(5);
      expect(duration).toBeLessThan(10000); // Should handle 5 concurrent requests within 10 seconds
      
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.responseText).toBeDefined();
      });
    });
  });

  describe('Cache Integration', () => {
    it('should improve performance with caching', async () => {
      const dateKey = enhancedCacheService.getCurrentDateKey();
      
      // First call (no cache)
      const startTime1 = Date.now();
      const result1 = await aiRecommendationService.generateDailyCurator();
      const duration1 = Date.now() - startTime1;

      // Second call (with cache)
      const startTime2 = Date.now();
      const result2 = await aiRecommendationService.generateDailyCurator();
      const duration2 = Date.now() - startTime2;

      expect(duration2).toBeLessThan(duration1); // Cached call should be faster
      expect(result1.curator.name).toBe(result2.curator.name); // Should be same content
    });

    it('should handle cache expiration correctly', async () => {
      const message = 'test message';
      const messageHash = enhancedCacheService.generateMessageHash(message);
      
      // Store with short TTL
      const testCache = new (await import('../enhanced-cache-service')).EnhancedCacheService({
        chatResponseTTL: 100 // 100ms
      });

      const mockResponse = {
        id: 'test',
        type: 'ai' as const,
        content: 'Test response',
        timestamp: new Date()
      };

      testCache.storeChatResponse(messageHash, mockResponse);
      
      // Should be available immediately
      let cached = testCache.getChatResponse(messageHash);
      expect(cached).toEqual(mockResponse);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      cached = testCache.getChatResponse(messageHash);
      expect(cached).toBeNull();

      testCache.destroy();
    });
  });
});
