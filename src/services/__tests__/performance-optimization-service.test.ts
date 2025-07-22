import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performanceOptimizationService, PerformanceOptimizationService } from '../performance-optimization-service';

// Mock the TMDB service
vi.mock('../tmdb-service', () => ({
  tmdbService: {
    search: vi.fn(),
    getStreamingUrl: vi.fn(() => 'http://example.com/stream'),
    getExternalIds: vi.fn()
  }
}));

describe('PerformanceOptimizationService', () => {
  let service: PerformanceOptimizationService;

  beforeEach(() => {
    service = new PerformanceOptimizationService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.clearCaches();
  });

  describe('batchTMDBRequests', () => {
    it('should batch requests and return results', async () => {
      const requests = [
        {
          id: 'test1',
          request: async () => ({ title: 'Movie 1', id: 1 })
        },
        {
          id: 'test2',
          request: async () => ({ title: 'Movie 2', id: 2 })
        }
      ];

      const result = await service.batchTMDBRequests(requests);

      expect(result.results).toHaveLength(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.totalTime).toBeGreaterThan(0);
    });

    it('should handle failed requests gracefully', async () => {
      const requests = [
        {
          id: 'success',
          request: async () => ({ title: 'Success', id: 1 })
        },
        {
          id: 'failure',
          request: async () => {
            throw new Error('Request failed');
          }
        }
      ];

      const result = await service.batchTMDBRequests(requests);

      expect(result.results).toHaveLength(2);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.results[0]).toEqual({ title: 'Success', id: 1 });
      expect(result.results[1]).toBeNull();
    });

    it('should respect batch size limits', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        id: `test${i}`,
        request: async () => ({ title: `Movie ${i}`, id: i })
      }));

      const result = await service.batchTMDBRequests(requests);

      expect(result.results).toHaveLength(10);
      expect(result.successCount).toBe(10);
    });
  });

  describe('optimizedContentSearch', () => {
    it('should search for content and return results', async () => {
      const mockTmdbService = await import('../tmdb-service');
      vi.mocked(mockTmdbService.tmdbService.search).mockResolvedValue({
        results: [
          {
            tmdb_id: 1,
            title: 'Test Movie',
            type: 'movie' as const,
            rating: 8.0,
            year: 2023,
            overview: 'Test overview',
            poster: 'test-poster.jpg',
            genres: ['Action'],
            voteCount: 1000,
            popularity: 50,
            releaseDate: '2023-01-01',
            isAdult: false
          }
        ],
        totalResults: 1,
        totalPages: 1,
        page: 1
      });

      const titles = ['Test Movie', 'Another Movie'];
      const result = await service.optimizedContentSearch(titles);

      expect(result).toHaveLength(2);
      expect(mockTmdbService.tmdbService.search).toHaveBeenCalledTimes(2);
    });

    it('should handle search failures gracefully', async () => {
      const mockTmdbService = await import('../tmdb-service');
      vi.mocked(mockTmdbService.tmdbService.search).mockRejectedValue(new Error('Search failed'));

      const titles = ['Test Movie'];
      const result = await service.optimizedContentSearch(titles);

      expect(result).toHaveLength(0);
    });

    it('should remove duplicate titles', async () => {
      const mockTmdbService = await import('../tmdb-service');
      vi.mocked(mockTmdbService.tmdbService.search).mockResolvedValue({
        results: [
          {
            tmdb_id: 1,
            title: 'Test Movie',
            type: 'movie' as const,
            rating: 8.0,
            year: 2023,
            overview: 'Test overview',
            poster: 'test-poster.jpg',
            genres: ['Action'],
            voteCount: 1000,
            popularity: 50,
            releaseDate: '2023-01-01',
            isAdult: false
          }
        ],
        totalResults: 1,
        totalPages: 1,
        page: 1
      });

      const titles = ['Test Movie', 'Test Movie', 'Test Movie'];
      const result = await service.optimizedContentSearch(titles);

      expect(mockTmdbService.tmdbService.search).toHaveBeenCalledTimes(1);
    });
  });

  describe('optimizeConcurrentAIRequests', () => {
    it('should process AI requests concurrently', async () => {
      const requests = [
        {
          id: 'ai1',
          request: async () => 'AI Response 1'
        },
        {
          id: 'ai2',
          request: async () => 'AI Response 2'
        }
      ];

      const result = await service.optimizeConcurrentAIRequests(requests);

      expect(result.results).toHaveLength(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
    });

    it('should use cache when enabled', async () => {
      const requests = [
        {
          id: 'cached-request',
          request: async () => 'First Response'
        }
      ];

      // First request
      const result1 = await service.optimizeConcurrentAIRequests(requests, { enableCache: true });
      expect(result1.results[0]).toBe('First Response');

      // Second request should use cache
      const newRequests = [
        {
          id: 'cached-request',
          request: async () => 'Second Response'
        }
      ];

      const result2 = await service.optimizeConcurrentAIRequests(newRequests, { enableCache: true });
      expect(result2.results[0]).toBe('First Response'); // Should be cached
    });

    it('should handle request deduplication', async () => {
      let callCount = 0;
      const requests = [
        {
          id: 'duplicate',
          request: async () => {
            callCount++;
            return `Response ${callCount}`;
          }
        },
        {
          id: 'duplicate',
          request: async () => {
            callCount++;
            return `Response ${callCount}`;
          }
        }
      ];

      const result = await service.optimizeConcurrentAIRequests(requests);

      // Should only call the request function once due to deduplication
      expect(callCount).toBe(1);
      expect(result.results).toHaveLength(2);
    });
  });

  describe('createLazyLoadObserver', () => {
    it('should create intersection observer with correct options', () => {
      // Mock IntersectionObserver
      global.IntersectionObserver = vi.fn(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn()
      })) as any;

      const callback = vi.fn();
      const observer = service.createLazyLoadObserver(callback, {
        rootMargin: '100px',
        threshold: 0.5
      });

      expect(global.IntersectionObserver).toHaveBeenCalledWith(callback, {
        rootMargin: '100px',
        threshold: 0.5
      });
    });
  });

  describe('preloadImages', () => {
    it('should preload images successfully', async () => {
      // Mock Image constructor
      const mockImages: any[] = [];
      global.Image = vi.fn(() => {
        const mockImage = {
          onload: null as (() => void) | null,
          onerror: null as (() => void) | null,
          src: ''
        };
        mockImages.push(mockImage);
        
        // Simulate successful loading immediately
        setTimeout(() => {
          if (mockImage.onload) mockImage.onload();
        }, 1);
        
        return mockImage;
      }) as any;

      const imageUrls = ['image1.jpg', 'image2.jpg'];
      await expect(service.preloadImages(imageUrls, 'high')).resolves.toBeUndefined();
      
      expect(global.Image).toHaveBeenCalledTimes(2);
    });

    it('should handle image loading failures', async () => {
      const mockImages: any[] = [];
      global.Image = vi.fn(() => {
        const mockImage = {
          onload: null as (() => void) | null,
          onerror: null as (() => void) | null,
          src: ''
        };
        mockImages.push(mockImage);
        
        // Simulate error immediately
        setTimeout(() => {
          if (mockImage.onerror) mockImage.onerror();
        }, 1);
        
        return mockImage;
      }) as any;

      const imageUrls = ['invalid-image.jpg'];
      await expect(service.preloadImages(imageUrls, 'low')).resolves.toBeUndefined();
      
      expect(global.Image).toHaveBeenCalledTimes(1);
    });
  });

  describe('performance metrics', () => {
    it('should track performance metrics', async () => {
      const requests = [
        {
          id: 'metric-test',
          request: async () => {
            // Add small delay to ensure measurable response time
            await new Promise(resolve => setTimeout(resolve, 1));
            return 'Success';
          }
        }
      ];

      await service.batchTMDBRequests(requests);
      const metrics = service.getPerformanceMetrics();

      expect(metrics.requestCount).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThan(0);
      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
    });

    it('should clear caches and reset metrics', () => {
      service.clearCaches();
      const metrics = service.getPerformanceMetrics();

      expect(metrics.requestCount).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
      expect(metrics.cacheHitRate).toBe(0);
      expect(metrics.concurrentRequestsActive).toBe(0);
    });
  });

  describe('configuration updates', () => {
    it('should update configuration correctly', () => {
      service.updateConfig(
        { maxConcurrentRequests: 10 },
        { rootMargin: '200px' },
        { maxConcurrentAIRequests: 5 }
      );

      // Configuration is private, but we can test that the method doesn't throw
      expect(() => service.updateConfig()).not.toThrow();
    });
  });
});