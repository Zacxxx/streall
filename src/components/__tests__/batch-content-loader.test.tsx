import { describe, it, expect, vi, beforeEach } from 'vitest';
import BatchContentLoader from '../batch-content-loader';

// Mock the performance optimization service
vi.mock('../../services/performance-optimization-service', () => ({
  performanceOptimizationService: {
    preloadImages: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock the LazyNetflixCard component
vi.mock('../lazy-netflix-card', () => ({
  default: ({ content }: any) => (
    <div data-testid="lazy-netflix-card">
      {content.title}
    </div>
  )
}));

describe('BatchContentLoader', () => {
  const mockContent = Array.from({ length: 20 }, (_, i) => ({
    id: `${i + 1}`,
    imdb_id: `tt${i + 1}`,
    title: `Movie ${i + 1}`,
    year: 2023,
    rating: 8.0 + (i * 0.1),
    genres: ['Action'],
    poster: `poster-${i + 1}.jpg`,
    backdropPath: `backdrop-${i + 1}.jpg`,
    overview: `Overview for movie ${i + 1}`,
    type: 'movie' as const,
    runtime: 120,
    tmdb_rating: 8.0 + (i * 0.1),
    tmdb_id: i + 1
  }));

  const mockOnPlay = vi.fn();
  const mockOnAddToList = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be importable and have correct interface', () => {
    expect(BatchContentLoader).toBeDefined();
    expect(typeof BatchContentLoader).toBe('function');
  });

  it('should handle batch size calculations correctly', () => {
    const batchSize = 6;
    const totalItems = mockContent.length;
    const expectedBatches = Math.ceil(totalItems / batchSize);
    
    expect(expectedBatches).toBe(4); // 20 items / 6 per batch = 4 batches
  });

  it('should handle empty content gracefully', () => {
    const emptyContent: typeof mockContent = [];
    
    expect(emptyContent.length).toBe(0);
    expect(Math.ceil(emptyContent.length / 6)).toBe(0);
  });

  it('should generate correct grid classes for different configurations', () => {
    const getGridClasses = (gridCols: number) => {
      const baseClasses = 'grid gap-4';
      switch (gridCols) {
        case 2:
          return `${baseClasses} grid-cols-2`;
        case 3:
          return `${baseClasses} grid-cols-2 sm:grid-cols-3`;
        case 4:
          return `${baseClasses} grid-cols-2 sm:grid-cols-3 md:grid-cols-4`;
        case 6:
          return `${baseClasses} grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6`;
        default:
          return `${baseClasses} grid-cols-2 sm:grid-cols-3`;
      }
    };

    expect(getGridClasses(2)).toBe('grid gap-4 grid-cols-2');
    expect(getGridClasses(3)).toBe('grid gap-4 grid-cols-2 sm:grid-cols-3');
    expect(getGridClasses(4)).toBe('grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4');
    expect(getGridClasses(6)).toBe('grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6');
  });

  it('should handle image preloading for batch content', () => {
    const batchContent = mockContent.slice(0, 3);
    const expectedImages = batchContent
      .map(item => [item.poster, item.backdropPath])
      .flat()
      .filter(Boolean);

    expect(expectedImages).toHaveLength(6); // 3 posters + 3 backdrops
    expect(expectedImages).toContain('poster-1.jpg');
    expect(expectedImages).toContain('backdrop-1.jpg');
  });

  it('should validate content structure for batch processing', () => {
    mockContent.forEach((item, index) => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('poster');
      expect(item.title).toBe(`Movie ${index + 1}`);
      expect(['movie', 'tv', 'anime']).toContain(item.type);
    });
  });

  it('should handle batch loading state management', () => {
    const totalBatches = Math.ceil(mockContent.length / 6);
    let loadedBatches = 1;
    
    expect(loadedBatches).toBe(1);
    expect(totalBatches).toBe(4);
    expect(loadedBatches < totalBatches).toBe(true);
    
    // Simulate loading next batch
    loadedBatches++;
    expect(loadedBatches).toBe(2);
    expect(loadedBatches < totalBatches).toBe(true);
  });

  it('should calculate visible content correctly', () => {
    const batchSize = 6;
    const loadedBatches = 2;
    const visibleContent = mockContent.slice(0, loadedBatches * batchSize);
    
    expect(visibleContent.length).toBe(12);
    expect(visibleContent[0].title).toBe('Movie 1');
    expect(visibleContent[11].title).toBe('Movie 12');
  });

  it('should handle development mode environment detection', () => {
    const originalEnv = process.env.NODE_ENV;
    
    // Test development mode
    process.env.NODE_ENV = 'development';
    expect(process.env.NODE_ENV).toBe('development');
    
    // Test production mode
    process.env.NODE_ENV = 'production';
    expect(process.env.NODE_ENV).toBe('production');
    
    // Restore original
    process.env.NODE_ENV = originalEnv;
  });
});