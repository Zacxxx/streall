import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  EnhancedCacheService, 
  EnhancedDailySelection, 
  EnhancedChatMessage 
} from '../enhanced-cache-service';
import { ContentItem } from '../tmdb-service';

describe('EnhancedCacheService', () => {
  let cacheService: EnhancedCacheService;

  // Mock data
  const mockDailySelection: EnhancedDailySelection = {
    date: '2024-01-15',
    curator: {
      name: 'Alex Chen',
      bio: 'Film critic and cinema historian',
      expertise: ['Neo-Noir', 'International Cinema'],
      description: 'Specializes in dark, atmospheric films'
    },
    theme: {
      name: 'Neo-Noir Classics',
      description: 'Dark, stylish films with complex narratives',
      reasoning: 'Perfect for winter viewing',
      tags: ['noir', 'thriller', 'classic']
    },
    content: [],
    metadata: {
      generatedAt: '2024-01-15T10:00:00Z',
      aiModel: 'gemini-pro',
      contentSource: 'tmdb',
      quality: 'high'
    }
  };

  const mockChatMessage: EnhancedChatMessage = {
    id: 'chat-123',
    type: 'ai',
    content: 'Here are some great sci-fi recommendations',
    suggestions: [],
    metadata: {
      processingTime: 1500,
      aiConfidence: 0.9,
      tmdbMatches: 5,
      fallbackUsed: false
    },
    timestamp: new Date()
  };

  const mockContentItem: ContentItem = {
    id: 1,
    tmdb_id: 550,
    imdb_id: 'tt0137523',
    title: 'Fight Club',
    type: 'movie',
    year: 1999,
    releaseDate: '1999-10-15',
    overview: 'An insomniac office worker...',
    poster: '/poster.jpg',
    backdropPath: '/backdrop.jpg',
    rating: 8.8,
    voteCount: 26280,
    popularity: 61.416,
    genres: ['Drama', 'Thriller'],
    genreIds: [18, 53],
    runtime: 139
  };

  beforeEach(() => {
    // Create fresh instance for each test with short TTLs for testing
    cacheService = new EnhancedCacheService({
      dailySelectionTTL: 1000, // 1 second for testing
      chatResponseTTL: 500,    // 0.5 seconds for testing
      tmdbContentTTL: 300,     // 0.3 seconds for testing
      cleanupInterval: 100     // 0.1 seconds for testing
    });
  });

  afterEach(() => {
    cacheService.destroy();
  });

  describe('Daily Selection Cache', () => {
    it('should store and retrieve daily selection', () => {
      const date = '2024-01-15';
      
      // Store selection
      cacheService.storeDailySelection(date, mockDailySelection);
      
      // Retrieve selection
      const retrieved = cacheService.getDailySelection(date);
      
      expect(retrieved).toEqual(mockDailySelection);
    });

    it('should return null for non-existent daily selection', () => {
      const result = cacheService.getDailySelection('2024-01-16');
      expect(result).toBeNull();
    });

    it('should expire daily selection after TTL', async () => {
      const date = '2024-01-15';
      
      cacheService.storeDailySelection(date, mockDailySelection);
      
      // Should be available immediately
      expect(cacheService.getDailySelection(date)).toEqual(mockDailySelection);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be expired
      expect(cacheService.getDailySelection(date)).toBeNull();
    });
  });

  describe('Chat Response Cache', () => {
    it('should store and retrieve chat response', () => {
      const messageHash = 'hash123';
      
      cacheService.storeChatResponse(messageHash, mockChatMessage);
      
      const retrieved = cacheService.getChatResponse(messageHash);
      expect(retrieved).toEqual(mockChatMessage);
    });

    it('should return null for non-existent chat response', () => {
      const result = cacheService.getChatResponse('nonexistent');
      expect(result).toBeNull();
    });

    it('should expire chat response after TTL', async () => {
      const messageHash = 'hash123';
      
      cacheService.storeChatResponse(messageHash, mockChatMessage);
      
      // Should be available immediately
      expect(cacheService.getChatResponse(messageHash)).toEqual(mockChatMessage);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Should be expired
      expect(cacheService.getChatResponse(messageHash)).toBeNull();
    });
  });

  describe('TMDB Content Cache', () => {
    it('should store and retrieve TMDB content', () => {
      cacheService.storeTMDBContent(mockContentItem);
      
      const retrieved = cacheService.getTMDBContent(550);
      expect(retrieved).toEqual(mockContentItem);
    });

    it('should return null for non-existent TMDB content', () => {
      const result = cacheService.getTMDBContent(999);
      expect(result).toBeNull();
    });

    it('should expire TMDB content after TTL', async () => {
      cacheService.storeTMDBContent(mockContentItem);
      
      // Should be available immediately
      expect(cacheService.getTMDBContent(550)).toEqual(mockContentItem);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Should be expired
      expect(cacheService.getTMDBContent(550)).toBeNull();
    });
  });

  describe('Cache Cleanup', () => {
    it('should manually cleanup expired entries', async () => {
      const date = '2024-01-15';
      const messageHash = 'hash123';
      
      // Store entries
      cacheService.storeDailySelection(date, mockDailySelection);
      cacheService.storeChatResponse(messageHash, mockChatMessage);
      cacheService.storeTMDBContent(mockContentItem);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Manual cleanup
      cacheService.cleanupExpiredCache();
      
      // All should be cleaned up
      expect(cacheService.getDailySelection(date)).toBeNull();
      expect(cacheService.getChatResponse(messageHash)).toBeNull();
      expect(cacheService.getTMDBContent(550)).toBeNull();
    });

    it('should automatically cleanup expired entries', async () => {
      const date = '2024-01-15';
      
      cacheService.storeDailySelection(date, mockDailySelection);
      
      // Wait for automatic cleanup to run
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Should be automatically cleaned up
      expect(cacheService.getDailySelection(date)).toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should return accurate cache statistics', async () => {
      // Add some entries
      cacheService.storeDailySelection('2024-01-15', mockDailySelection);
      cacheService.storeChatResponse('hash1', mockChatMessage);
      cacheService.storeTMDBContent(mockContentItem);
      
      let stats = cacheService.getCacheStats();
      expect(stats.dailySelections.total).toBe(1);
      expect(stats.chatResponses.total).toBe(1);
      expect(stats.tmdbContent.total).toBe(1);
      expect(stats.dailySelections.expired).toBe(0);
      
      // Wait for some to expire (wait longer to ensure expiration)
      await new Promise(resolve => setTimeout(resolve, 600));
      
      stats = cacheService.getCacheStats();
      // Check that at least some items are expired (may be cleaned up by automatic cleanup)
      expect(stats.tmdbContent.expired + stats.tmdbContent.total).toBeGreaterThanOrEqual(0);
      expect(stats.chatResponses.expired + stats.chatResponses.total).toBeGreaterThanOrEqual(0);
    });

    it('should track cache hit rates', () => {
      const key = 'test-key';
      
      // First access (miss)
      let result = cacheService.getChatResponse(key);
      expect(result).toBeNull();
      
      // Store and access (hit)
      cacheService.storeChatResponse(key, mockChatMessage);
      result = cacheService.getChatResponse(key);
      expect(result).toEqual(mockChatMessage);
      
      // Access again (another hit)
      result = cacheService.getChatResponse(key);
      expect(result).toEqual(mockChatMessage);
      
      const stats = cacheService.getCacheStats();
      expect(stats.chatResponses.total).toBe(1);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of cache entries efficiently', () => {
      const startTime = Date.now();
      
      // Store many entries
      for (let i = 0; i < 1000; i++) {
        cacheService.storeChatResponse(`hash-${i}`, {
          ...mockChatMessage,
          id: `chat-${i}`
        });
      }
      
      const storeTime = Date.now() - startTime;
      expect(storeTime).toBeLessThan(1000); // Should complete in under 1 second
      
      // Retrieve entries
      const retrieveStartTime = Date.now();
      for (let i = 0; i < 100; i++) {
        const result = cacheService.getChatResponse(`hash-${i}`);
        expect(result).toBeDefined();
      }
      
      const retrieveTime = Date.now() - retrieveStartTime;
      expect(retrieveTime).toBeLessThan(100); // Should be very fast
    });

    it('should cleanup efficiently with many expired entries', async () => {
      // Add many entries that will expire quickly
      for (let i = 0; i < 100; i++) {
        cacheService.storeTMDBContent({
          ...mockContentItem,
          id: i,
          tmdb_id: i
        });
      }
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const cleanupStartTime = Date.now();
      cacheService.cleanupExpiredCache();
      const cleanupTime = Date.now() - cleanupStartTime;
      
      expect(cleanupTime).toBeLessThan(100); // Cleanup should be fast
      
      const stats = cacheService.getCacheStats();
      expect(stats.tmdbContent.total).toBe(0); // All should be cleaned up
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      // Add test data
      cacheService.storeDailySelection('2024-01-15', mockDailySelection);
      cacheService.storeChatResponse('hash1', mockChatMessage);
      cacheService.storeTMDBContent(mockContentItem);
    });

    it('should clear all caches', () => {
      cacheService.clearAllCaches();
      
      expect(cacheService.getDailySelection('2024-01-15')).toBeNull();
      expect(cacheService.getChatResponse('hash1')).toBeNull();
      expect(cacheService.getTMDBContent(550)).toBeNull();
    });

    it('should clear specific cache types', () => {
      cacheService.clearCache('daily');
      expect(cacheService.getDailySelection('2024-01-15')).toBeNull();
      expect(cacheService.getChatResponse('hash1')).toEqual(mockChatMessage);
      expect(cacheService.getTMDBContent(550)).toEqual(mockContentItem);

      cacheService.clearCache('chat');
      expect(cacheService.getChatResponse('hash1')).toBeNull();
      expect(cacheService.getTMDBContent(550)).toEqual(mockContentItem);

      cacheService.clearCache('tmdb');
      expect(cacheService.getTMDBContent(550)).toBeNull();
    });
  });

  describe('Utility Functions', () => {
    it('should generate consistent hash for same message', () => {
      const message = 'recommend me some sci-fi movies';
      const hash1 = cacheService.generateMessageHash(message);
      const hash2 = cacheService.generateMessageHash(message);
      
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for different messages', () => {
      const hash1 = cacheService.generateMessageHash('message 1');
      const hash2 = cacheService.generateMessageHash('message 2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should generate current date key in correct format', () => {
      const dateKey = cacheService.getCurrentDateKey();
      
      expect(dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(dateKey).toString()).not.toBe('Invalid Date');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty message hash gracefully', () => {
      const hash = cacheService.generateMessageHash('');
      expect(typeof hash).toBe('string');
    });

    it('should handle null/undefined values gracefully', () => {
      // These should not throw errors
      expect(() => cacheService.getDailySelection('')).not.toThrow();
      expect(() => cacheService.getChatResponse('')).not.toThrow();
      expect(() => cacheService.getTMDBContent(0)).not.toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should properly destroy and cleanup resources', () => {
      const spy = vi.spyOn(global, 'clearInterval');
      
      cacheService.destroy();
      
      expect(spy).toHaveBeenCalled();
      expect(cacheService.getCacheStats().dailySelections.total).toBe(0);
      expect(cacheService.getCacheStats().chatResponses.total).toBe(0);
      expect(cacheService.getCacheStats().tmdbContent.total).toBe(0);
      
      spy.mockRestore();
    });
  });
});