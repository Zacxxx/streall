import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceOptimizationService } from '../performance-optimization-service';

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
            id: 1,
            tmdb_id: 1,
            title: 'Test Movie',
            type: 'movie' as const,
            rating: 8.0,
            year: 2023,
            overview: 'Test overview',
            poster: 'test-poster.jpg',
            genres: ['Action'],
            genreIds: [28],
            voteCount: 1000,
            popularity: 50,
            releaseDate: '01',
            false
          }
        ],
        totalResults: 1,
        totalPas: 1,
        p1
   });

      const titles = ['Test Movie', 'Another Movie'];
titles);

      expect(searchResult).toHaveLength(2);
      es(2);


    it('should handle search failures gracefully', async () =>
      const mockTmdbService = await import('../tmdb-service');
));

      const titles = ['Test Movie'];


      e


    it('should remove duplicate titles', async () => {
      const mockTmdbService = await import('../tmdb-service');
      vi.mocked(moe({
        res[
          {
            id: 1,
            tmdb_id: 1,
            title: 'Test Movie',
            type: 'movie const,
            rating: 8.0,
            year: 2023,
            overview: 'Test overview',
            poster: 'test-poste
            genres: ['Action
            genreIds: [28],
            voteCount: 1000,
            popularity: 50
           01',
          se
          }
        ],
        totalRe
        t1,
1
      });

'];
      await service.optimizedContentSearch(titles);

     1);

  });

  describe('optimizeConc> {
    it('s> {
      const requests[
        {
          ,
         e 1'
        },
        {
         ai2',
        2'

      ];

      const result = await service.optimizeCo

      expect(result.results).toHaveLength(
      eBe(2);
Be(0);
    });

    it('s
      const requests = [
        {
         ,
        '
 }
      ];

      // First request
;
      expect(result1.results[0]).toBe('F);

      // cache
      const newRequests = [
        {
         st',
        

      ];

      c);
 be cached
    });

    it('should handle re {
      let= 0;
      const requests = [
        {
          id: 'duplicate',
          request: async () => {
           +;
          
          }
        },
        {
          id: 'duplicate',
          request: async () => {
           ount++;
         ount}`;
        

      ];

      const concurrentResult = await service.optimizeConcurrentAIRequeststs);

      // Should only call the request functio
      e(1);
     (2);
);
  });

  describe('createLazyLoadObserver> {
    it('should create intersection observer with c
      // Mock Intersectio
      global.IntersectionOb
        observe: vi.fn(),
        unobservei.fn(),
)
      })) as any;

      const callback = vi.fn();
      service.createLa{
        r
.5
      });

      expect(global.Inack, {
        r100px',
       
     

  });

  describe('preloadImages', () => {
    it('should preload images succe) => {
      // Mock Image constructor
      const mockImages: any
      global.Image = vi.fn(() => {
        const mockImage = {
          onload:ull,
          
          src: ''
        
        mockImages.push(mockImage);
        
        // Simulate successful loading immediately
        setTim
        
        }, 1);
        
e;
      }) as any;

      g'];
      await expect(service.preloadImages(imageUrls, );
      
2);
    });

    it('should handle image loadin=> {
      const mockImages: any [];
      global.Image = vi.fn(() => {
        const mockImage = {
          onload:ull,
          l,
          src: ''
        ;
        mockImages.push(mockImage);
        
        // Simulate error immediately
        setTim(() => {
        );
        }, 1);
        
kImage;
      }) as any;

      ];
      await expect(service.preloadImages(imageUrls, ed();
      
     es(1);
);
  });

  describe('performance  {
    it('s
      const requests = [
        {
          id: 'metric-test',
          request: async () => {
            // Add small delaponse time
           ve, 1));
         s';
        }
  }
      ];

ts);
      const metrics = service.getPerformanceMetrics();

      expect(metrics.requestCount).toBeGreaterThan(0);
      e
(0);
    });

    it('should clear caches and reset metrics', () => {
();
      const metrics = service.getPerformanc;

      expect(metrics.requestCount).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
      etoBe(0);
     toBe(0);
);
  });

  describe('configuration u () => {
    it('should update configuration co
      service.updateConfig(
        { maxConcurrentRequests: 10 },
        
}
      );

      /w
     hrow();
   );
}); });
  }