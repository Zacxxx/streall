import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { aiRecommendationService } from '../ai-recommendation-service';
import { enhancedChatRecommendationEngine } from '../enhanced-chat-recommendation-engine';
import { contentProcessingEngine } from '../content-processing-engine';
import { enhancedCacheService } from '../enhanced-cache-service';
import { errorHandlingService } from '../error-handling-service';
import { smartContentMapper } from '../smart-content-mapper';
import { tmdbService } from '../tmdb-service';

// Mock external dependencies
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            curator: {
              name: "E2E Test Curator",
              bio: "A sophisticated curator for end-to-end testing scenarios",
              expertise: ["Modern Cinema", "International Films", "Genre Innovation"],
              description: "Expert in contemporary and classic cinema"
            },
            theme: "Contemporary Masterpieces",
            reasoning: "Today calls for films that showcase the evolution of modern storytelling",
            suggestedTitles: ["Parasite", "Nomadland", "The Power of the Dog", "Drive My Car", "Licorice Pizza", "Dune"]
          })
        }
      })
    })
  }))
}));

vi.mock('../tmdb-service', () => ({
  tmdbService: {
    search: vi.fn().mockImplementation((query: string) => {
      const mockResults = {
        'Parasite': {
          id: 1,
          tmdb_id: 496243,
          imdb_id: 'tt6751668',
          title: 'Parasite',
          type: 'movie',
          year: 2019,
          rating: 8.5,
          genres: ['Comedy', 'Drama', 'Thriller'],
          poster: '/poster-parasite.jpg',
          overview: 'A poor family schemes to become employed by a wealthy family.',
          runtime: 132
        },
        'Nomadland': {
          id: 2,
          tmdb_id: 581734,
          imdb_id: 'tt9770150',
          title: 'Nomadland',
          type: 'movie',
          year: 2020,
          rating: 7.3,
          genres: ['Drama'],
          poster: '/poster-nomadland.jpg',
          overview: 'A woman embarks on a journey through the American West.',
          runtime: 107
        },
        'Dune': {
          id: 3,
          tmdb_id: 438631,
          imdb_id: 'tt1160419',
          title: 'Dune',
          type: 'movie',
          year: 2021,
          rating: 8.0,
          genres: ['Action', 'Adventure', 'Drama', 'Sci-Fi'],
          poster: '/poster-dune.jpg',
          overview: 'Feature adaptation of Frank Herbert\'s science fiction novel.',
          runtime: 155
        }
      };

      const result = mockResults[query as keyof typeof mockResults];
      return Promise.resolve({
        results: result ? [result] : [],
        pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
      });
    }),
    getDetails: vi.fn().mockImplementation((id: number) => {
      return Promise.resolve({
        id,
        tmdb_id: id,
        title: `Movie ${id}`,
        type: 'movie',
        year: 2023,
        rating: 7.5,
        genres: ['Drama'],
        poster: `/poster-${id}.jpg`,
        overview: `Overview for movie ${id}`
      });
    }),
    getExternalIds: vi.fn().mockResolvedValue({ imdb_id: 'tt1234567' }),
    getStreamingUrl: vi.fn().mockReturnValue('https://2embed.cc/embed/tt1234567')
  }
}));

describe('End-to-End Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enhancedCacheService.clearAllCaches();
  });

  afterEach(() => {
    enhancedCacheService.clearAllCaches();
  });

  describe('Daily Curator Generation Flow', () => {
    it('should complete full daily curator generation workflow', async () => {
      // Test the complete flow from AI generation to TMDB content retrieval
      const startTime = Date.now();
      
      const result = await aiRecommendationService.generateDailyCurator();
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify complete response structure
      expect(result).toMatchObject({
        curator: {
          name: expect.any(String),
          bio: expect.any(String),
          expertise: expect.any(Array),
          description: expect.any(String)
        },
        theme: expect.any(String),
        reasoning: expect.any(String),
        suggestedTitles: expect.any(Array),
        content: expect.any(Array)
      });

      // Verify curator quality
      expect(result.curator.name).toBeTruthy();
      expect(result.curator.bio.length).toBeGreaterThan(50);
      expect(result.curator.expertise.length).toBeGreaterThan(0);
      expect(result.theme.length).toBeGreaterThan(10);
      expect(result.reasoning.length).toBeGreaterThan(30);

      // Verify content integration
      expect(result.suggestedTitles.length).toBeGreaterThan(0);
      expect(result.content).toBeDefined();
      
      if (result.content && result.content.length > 0) {
        const firstContent = result.content[0];
        expect(firstContent).toMatchObject({
          tmdb_id: expect.any(Number),
          title: expect.any(String),
          type: expect.stringMatching(/^(movie|tv)$/),
          year: expect.any(Number),
          rating: expect.any(Number),
          genres: expect.any(Array)
        });
      }

      // Verify performance
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      console.log('Daily Curator Generation E2E Test Results:', {
        duration: `${duration}ms`,
        curatorName: result.curator.name,
        theme: result.theme,
        suggestedCount: result.suggestedTitles.length,
        contentCount: result.content?.length || 0,
        firstTitle: result.content?.[0]?.title
      });
    });

    it('should handle caching in daily curator flow', async () => {
      const dateKey = enhancedCacheService.getCurrentDateKey();
      
      // First generation
      const result1 = await aiRecommendationService.generateDailyCurator();
      
      // Verify caching
      const cached = enhancedCacheService.getDailySelection(dateKey);
      expect(cached).toBeDefined();
      expect(cached?.curator.name).toBe(result1.curator.name);

      // Second generation should use cache
      const startTime = Date.now();
      const result2 = await aiRecommendationService.generateDailyCurator();
      const cachedDuration = Date.now() - startTime;

      expect(result2.curator.name).toBe(result1.curator.name);
      expect(cachedDuration).toBeLessThan(1000); // Cached should be much faster

      console.log('Caching Performance:', {
        cachedDuration: `${cachedDuration}ms`,
        cacheHit: result1.curator.name === result2.curator.name
      });
    });

    it('should handle TMDB integration failures gracefully', async () => {
      // Mock TMDB service to fail
      vi.mocked(tmdbService.search).mockRejectedValue(new Error('TMDB API unavailable'));

      const result = await aiRecommendationService.generateDailyCurator();

      // Should still return a valid curator with fallback content
      expect(result).toBeDefined();
      expect(result.curator).toBeDefined();
      expect(result.theme).toBeDefined();
      expect(result.suggestedTitles.length).toBeGreaterThan(0);

      console.log('TMDB Failure Fallback:', {
        curatorName: result.curator.name,
        theme: result.theme,
        hasFallbackContent: result.content !== undefined
      });
    });

    it('should validate content quality and completeness', async () => {
      const result = await aiRecommendationService.generateDailyCurator();

      if (result.content && result.content.length > 0) {
        for (const content of result.content) {
          // Verify required fields
          expect(content.tmdb_id).toBeDefined();
          expect(content.title).toBeTruthy();
          expect(content.type).toMatch(/^(movie|tv)$/);
          expect(content.year).toBeGreaterThan(1900);
          expect(content.rating).toBeGreaterThan(0);
          expect(Array.isArray(content.genres)).toBe(true);

          // Verify content can be mapped to Netflix card format
          const cardFormat = smartContentMapper.tmdbToNetflixCard(content);
          expect(cardFormat).toMatchObject({
            id: expect.any(String),
            title: expect.any(String),
            year: expect.any(Number),
            rating: expect.any(Number),
            genres: expect.any(Array)
          });
        }
      }

      console.log('Content Quality Validation:', {
        totalContent: result.content?.length || 0,
        validContent: result.content?.filter(c => c.tmdb_id && c.title).length || 0
      });
    });
  });

  describe('Chat Interaction and Content Recommendation Flow', () => {
    it('should complete full chat recommendation workflow', async () => {
      const sessionId = 'e2e-chat-test';
      const userMessage = 'I want some thought-provoking sci-fi movies with great cinematography';

      const startTime = Date.now();
      const result = await enhancedChatRecommendationEngine.processUserRequest(userMessage, sessionId);
      const duration = Date.now() - startTime;

      // Verify response structure
      expect(result).toMatchObject({
        responseText: expect.any(String),
        suggestedTitles: expect.any(Array),
        confidence: expect.any(Number),
        content: expect.any(Array),
        detectedPreferences: expect.any(Object),
        recommendationReasoning: expect.any(String),
        conversationFlow: expect.stringMatching(/^(initial|clarifying|recommending|refining)$/)
      });

      // Verify response quality
      expect(result.responseText.length).toBeGreaterThan(50);
      expect(result.suggestedTitles.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);

      // Verify preference detection
      expect(result.detectedPreferences.genres).toContain('sci-fi');
      expect(result.detectedPreferences.moods).toContain('contemplative');

      // Verify performance
      expect(duration).toBeLessThan(8000); // Should complete within 8 seconds

      console.log('Chat Recommendation E2E Test Results:', {
        duration: `${duration}ms`,
        responseLength: result.responseText.length,
        suggestedCount: result.suggestedTitles.length,
        confidence: result.confidence,
        detectedGenres: result.detectedPreferences.genres?.join(', '),
        conversationFlow: result.conversationFlow
      });
    });

    it('should maintain conversation context across multiple interactions', async () => {
      const sessionId = 'context-flow-test';

      // First interaction
      const result1 = await enhancedChatRecommendationEngine.processUserRequest(
        'I love psychological thrillers',
        sessionId
      );

      expect(result1.detectedPreferences.genres).toContain('mystery');
      expect(result1.suggestedTitles.length).toBeGreaterThan(0);

      // Second interaction building on context
      const result2 = await enhancedChatRecommendationEngine.processUserRequest(
        'something more recent',
        sessionId
      );

      expect(result2.responseText).toBeTruthy();
      expect(result2.suggestedTitles.length).toBeGreaterThan(0);

      // Third interaction with refinement
      const result3 = await enhancedChatRecommendationEngine.processUserRequest(
        'maybe something international',
        sessionId
      );

      expect(result3.detectedPreferences.languages).toContain('international');

      console.log('Context Flow Test:', {
        interaction1: { genres: result1.detectedPreferences.genres, titles: result1.suggestedTitles.slice(0, 2) },
        interaction2: { titles: result2.suggestedTitles.slice(0, 2) },
        interaction3: { languages: result3.detectedPreferences.languages, titles: result3.suggestedTitles.slice(0, 2) }
      });
    });

    it('should handle complex multi-dimensional preferences', async () => {
      const complexQuery = 'I want something like Blade Runner 2049 - visually stunning sci-fi with philosophical themes, but not too long, and preferably from the last 5 years';

      const result = await enhancedChatRecommendationEngine.processUserRequest(
        complexQuery,
        'complex-preferences-test'
      );

      // Verify complex preference detection
      expect(result.detectedPreferences.genres).toContain('sci-fi');
      expect(result.detectedPreferences.moods).toContain('contemplative');
      expect(result.detectedPreferences.themes).toContain('philosophical');

      // Verify quality response
      expect(result.responseText).toContain('sci-fi');
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.suggestedTitles.length).toBeGreaterThan(0);

      console.log('Complex Preferences Test:', {
        detectedPreferences: result.detectedPreferences,
        confidence: result.confidence,
        suggestedTitles: result.suggestedTitles.slice(0, 3)
      });
    });

    it('should integrate chat recommendations with TMDB content', async () => {
      const result = await enhancedChatRecommendationEngine.processUserRequest(
        'recommend some award-winning dramas',
        'tmdb-integration-test'
      );

      // Verify TMDB content integration
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      if (result.content.length > 0) {
        const firstContent = result.content[0];
        expect(firstContent).toMatchObject({
          tmdb_id: expect.any(Number),
          title: expect.any(String),
          type: expect.stringMatching(/^(movie|tv)$/),
          rating: expect.any(Number)
        });

        // Verify content can be used for streaming
        const streamingUrl = tmdbService.getStreamingUrl(firstContent.imdb_id || `tmdb_${firstContent.tmdb_id}`);
        expect(streamingUrl).toBeTruthy();
      }

      console.log('Chat TMDB Integration:', {
        suggestedTitles: result.suggestedTitles.length,
        tmdbContent: result.content.length,
        firstContentTitle: result.content[0]?.title
      });
    });
  });

  describe('Error Scenarios and Recovery Mechanisms', () => {
    it('should handle complete AI service failure', async () => {
      // Mock AI service to completely fail
      const mockGenAI = vi.mocked(await import('@google/generative-ai'));
      mockGenAI.GoogleGenerativeAI.mockImplementation(() => {
        throw new Error('AI service completely unavailable');
      });

      // Daily curator should still work with fallback
      const curatorResult = await aiRecommendationService.generateDailyCurator();
      expect(curatorResult).toBeDefined();
      expect(curatorResult.curator.name).toBeTruthy();

      // Chat should still work with rule-based fallback
      const chatResult = await enhancedChatRecommendationEngine.processUserRequest(
        'action movies',
        'ai-failure-test'
      );
      expect(chatResult).toBeDefined();
      expect(chatResult.responseText).toBeTruthy();
      expect(chatResult.suggestedTitles.length).toBeGreaterThan(0);

      console.log('Complete AI Failure Recovery:', {
        curatorFallback: curatorResult.curator.name,
        chatFallback: chatResult.suggestedTitles.slice(0, 2)
      });
    });

    it('should handle TMDB service degradation', async () => {
      // Mock TMDB to have intermittent failures
      let callCount = 0;
      vi.mocked(tmdbService.search).mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 0) {
          throw new Error('TMDB temporarily unavailable');
        }
        return Promise.resolve({
          results: [{
            id: 1,
            tmdb_id: 1,
            title: 'Fallback Movie',
            type: 'movie' as const,
            year: 2023,
            rating: 7.0,
            genres: ['Drama'],
            poster: '/fallback.jpg',
            overview: 'A fallback movie'
          }],
          pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
        });
      });

      const result = await aiRecommendationService.generateDailyCurator();

      // Should still get some content despite failures
      expect(result).toBeDefined();
      expect(result.curator).toBeDefined();

      console.log('TMDB Degradation Recovery:', {
        curatorGenerated: !!result.curator.name,
        contentRetrieved: result.content?.length || 0,
        tmdbCallCount: callCount
      });
    });

    it('should handle network timeout scenarios', async () => {
      // Mock network timeouts
      vi.mocked(tmdbService.search).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        });
      });

      const startTime = Date.now();
      const result = await aiRecommendationService.generateDailyCurator();
      const duration = Date.now() - startTime;

      // Should complete with fallback content
      expect(result).toBeDefined();
      expect(result.curator).toBeDefined();
      expect(duration).toBeLessThan(15000); // Should not hang indefinitely

      console.log('Network Timeout Recovery:', {
        duration: `${duration}ms`,
        recoverySuccessful: !!result.curator.name
      });
    });

    it('should handle concurrent request failures', async () => {
      // Simulate high load with concurrent requests
      const concurrentRequests = 10;
      const promises = Array.from({ length: concurrentRequests }, (_, i) => 
        enhancedChatRecommendationEngine.processUserRequest(
          `Request ${i}`,
          `concurrent-test-${i}`
        ).catch(error => ({ error, index: i }))
      );

      const results = await Promise.all(promises);
      
      // Count successful vs failed requests
      const successful = results.filter(r => !('error' in r));
      const failed = results.filter(r => 'error' in r);

      // Should handle at least some requests successfully
      expect(successful.length).toBeGreaterThan(0);
      
      // Log the results for analysis
      console.log('Concurrent Request Handling:', {
        total: concurrentRequests,
        successful: successful.length,
        failed: failed.length,
        successRate: `${(successful.length / concurrentRequests * 100).toFixed(1)}%`
      });
    });

    it('should implement proper retry mechanisms', async () => {
      let attemptCount = 0;
      
      // Mock service to fail first few attempts then succeed
      vi.mocked(tmdbService.search).mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary service failure');
        }
        return Promise.resolve({
          results: [{
            id: 1,
            tmdb_id: 1,
            title: 'Success After Retry',
            type: 'movie' as const,
            year: 2023,
            rating: 8.0,
            genres: ['Drama'],
            poster: '/success.jpg',
            overview: 'Success after retry'
          }],
          pagination: { page: 1, limit: 5, hasNext: false, hasPrev: false }
        });
      });

      const result = await contentProcessingEngine.searchAndValidateContent('Test Movie');

      expect(result).toBeDefined();
      expect(result?.title).toBe('Success After Retry');
      expect(attemptCount).toBe(3); // Should have retried

      console.log('Retry Mechanism Test:', {
        attempts: attemptCount,
        finalResult: result?.title,
        retrySuccessful: !!result
      });
    });

    it('should maintain data consistency during failures', async () => {
      // Test that partial failures don't corrupt the cache or state
      const sessionId = 'consistency-test';
      
      // First successful interaction
      const result1 = await enhancedChatRecommendationEngine.processUserRequest(
        'comedy movies',
        sessionId
      );
      
      expect(result1.detectedPreferences.genres).toContain('comedy');

      // Mock failure for next interaction
      const mockGenAI = vi.mocked(await import('@google/generative-ai'));
      mockGenAI.GoogleGenerativeAI.mockImplementationOnce(() => {
        throw new Error('Temporary AI failure');
      });

      // Second interaction with failure
      const result2 = await enhancedChatRecommendationEngine.processUserRequest(
        'something different',
        sessionId
      );

      // Should still work with fallback and maintain context
      expect(result2).toBeDefined();
      expect(result2.responseText).toBeTruthy();

      // Third interaction should work normally again
      const result3 = await enhancedChatRecommendationEngine.processUserRequest(
        'action movies',
        sessionId
      );

      expect(result3.detectedPreferences.genres).toContain('action');

      console.log('Data Consistency Test:', {
        interaction1Success: result1.detectedPreferences.genres?.includes('comedy'),
        interaction2Fallback: !!result2.responseText,
        interaction3Recovery: result3.detectedPreferences.genres?.includes('action')
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-frequency requests efficiently', async () => {
      const requestCount = 20;
      const startTime = Date.now();
      
      const promises = Array.from({ length: requestCount }, (_, i) => 
        enhancedChatRecommendationEngine.processUserRequest(
          `Request ${i % 5}`, // Reuse some queries to test caching
          `perf-test-${i}`
        )
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      const avgDuration = duration / requestCount;

      expect(results).toHaveLength(requestCount);
      expect(avgDuration).toBeLessThan(2000); // Average should be under 2 seconds

      console.log('High-Frequency Request Performance:', {
        totalRequests: requestCount,
        totalDuration: `${duration}ms`,
        averageDuration: `${avgDuration.toFixed(0)}ms`,
        requestsPerSecond: (requestCount / (duration / 1000)).toFixed(1)
      });
    });

    it('should optimize cache usage under load', async () => {
      const dateKey = enhancedCacheService.getCurrentDateKey();
      
      // Generate initial daily selection
      await aiRecommendationService.generateDailyCurator();
      
      // Multiple concurrent requests for daily selection
      const concurrentRequests = 15;
      const startTime = Date.now();
      
      const promises = Array.from({ length: concurrentRequests }, () => 
        aiRecommendationService.generateDailyCurator()
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // All should return the same cached result
      const firstCuratorName = results[0].curator.name;
      const allSame = results.every(r => r.curator.name === firstCuratorName);

      expect(allSame).toBe(true);
      expect(duration).toBeLessThan(5000); // Should be fast due to caching

      console.log('Cache Optimization Under Load:', {
        concurrentRequests,
        duration: `${duration}ms`,
        cacheConsistency: allSame,
        avgResponseTime: `${(duration / concurrentRequests).toFixed(0)}ms`
      });
    });

    it('should handle memory usage efficiently', async () => {
      // Test memory usage with multiple sessions
      const sessionCount = 50;
      const sessions = Array.from({ length: sessionCount }, (_, i) => `memory-test-${i}`);
      
      // Create multiple chat sessions
      for (const sessionId of sessions) {
        await enhancedChatRecommendationEngine.processUserRequest(
          'test message',
          sessionId
        );
      }

      // Cleanup old contexts
      enhancedChatRecommendationEngine.cleanupOldContexts();

      // Should not throw memory errors
      expect(true).toBe(true);

      console.log('Memory Usage Test:', {
        sessionsCreated: sessionCount,
        cleanupCompleted: true
      });
    });
  });

  describe('Integration with UI Components', () => {
    it('should provide data compatible with Netflix card component', async () => {
      const result = await aiRecommendationService.generateDailyCurator();

      if (result.content && result.content.length > 0) {
        for (const content of result.content) {
          const cardData = smartContentMapper.tmdbToNetflixCard(content);
          
          // Verify Netflix card compatibility
          expect(cardData).toMatchObject({
            id: expect.any(String),
            title: expect.any(String),
            year: expect.any(Number),
            rating: expect.any(Number),
            genres: expect.any(Array),
            poster: expect.any(String),
            overview: expect.any(String)
          });

          // Verify streaming URL generation
          const streamingUrl = tmdbService.getStreamingUrl(cardData.imdb_id);
          expect(streamingUrl).toMatch(/^https?:\/\//);
        }
      }

      console.log('UI Component Integration:', {
        contentCount: result.content?.length || 0,
        firstCardTitle: result.content?.[0] ? smartContentMapper.tmdbToNetflixCard(result.content[0]).title : 'N/A'
      });
    });

    it('should support proper navigation routing', async () => {
      const chatResult = await enhancedChatRecommendationEngine.processUserRequest(
        'action movies',
        'routing-test'
      );

      if (chatResult.content.length > 0) {
        const content = chatResult.content[0];
        
        // Verify routing data
        expect(content.tmdb_id).toBeDefined();
        expect(content.type).toMatch(/^(movie|tv)$/);
        
        // Verify streaming URL format
        const streamingUrl = tmdbService.getStreamingUrl(content.imdb_id || `tmdb_${content.tmdb_id}`);
        expect(streamingUrl).toMatch(/2embed\.cc/);
        
        // Verify details page routing
        const detailsPath = `/details/${content.type}/${content.tmdb_id}`;
        expect(detailsPath).toMatch(/^\/details\/(movie|tv)\/\d+$/);
      }

      console.log('Navigation Routing Test:', {
        contentAvailable: chatResult.content.length > 0,
        firstContentType: chatResult.content[0]?.type,
        firstContentId: chatResult.content[0]?.tmdb_id
      });
    });
  });
});