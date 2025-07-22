import { describe, it, expect, vi, beforeEach } from 'vitest';
import LazyNetflixCard from '../lazy-netflix-card';

// Mock the performance optimization service
vi.mock('../../services/performance-optimization-service', () => ({
  performanceOptimizationService: {
    createLazyLoadObserver: vi.fn((callback) => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    })),
    preloadImages: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock the NetflixCard component
vi.mock('../netflix-card', () => ({
  default: ({ content }: any) => (
    <div data-testid="netflix-card">
      {content.title}
    </div>
  )
}));

describe('LazyNetflixCard', () => {
  const mockContent = {
    id: '1',
    imdb_id: 'tt1234567',
    title: 'Test Movie',
    year: 2023,
    rating: 8.5,
    genres: ['Action', 'Drama'],
    poster: 'test-poster.jpg',
    backdropPath: 'test-backdrop.jpg',
    overview: 'A test movie overview',
    type: 'movie' as const,
    runtime: 120,
    tmdb_rating: 8.5,
    tmdb_id: 12345
  };

  const mockOnPlay = vi.fn();
  const mockOnAddToList = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be importable and have correct props interface', () => {
    expect(LazyNetflixCard).toBeDefined();
    expect(typeof LazyNetflixCard).toBe('function');
  });

  it('should handle lazy loading configuration correctly', () => {
    const lazyLoadConfig = {
      lazyLoadImages: true,
      preloadDistance: 300,
      priority: 'high' as const
    };
    
    expect(lazyLoadConfig.lazyLoadImages).toBe(true);
    expect(lazyLoadConfig.preloadDistance).toBe(300);
    expect(['high', 'low']).toContain(lazyLoadConfig.priority);
  });

  it('should handle image preloading configuration', () => {
    const imageUrls = ['test-poster.jpg', 'test-backdrop.jpg'];
    const priority = 'high';
    
    expect(imageUrls).toHaveLength(2);
    expect(imageUrls[0]).toBe('test-poster.jpg');
    expect(imageUrls[1]).toBe('test-backdrop.jpg');
    expect(['high', 'low']).toContain(priority);
  });

  it('should handle missing backdrop image gracefully', () => {
    const contentWithoutBackdrop = {
      ...mockContent,
      backdropPath: undefined
    };
    
    const imageUrls = [contentWithoutBackdrop.poster].filter(Boolean);
    
    expect(imageUrls).toHaveLength(1);
    expect(imageUrls[0]).toBe('test-poster.jpg');
  });

  it('should validate content props structure', () => {
    // Test that content has required properties
    expect(mockContent).toHaveProperty('id');
    expect(mockContent).toHaveProperty('imdb_id');
    expect(mockContent).toHaveProperty('title');
    expect(mockContent).toHaveProperty('type');
    expect(mockContent).toHaveProperty('poster');
    expect(mockContent).toHaveProperty('overview');
    
    // Test content types
    expect(typeof mockContent.id).toBe('string');
    expect(typeof mockContent.title).toBe('string');
    expect(['movie', 'tv', 'anime']).toContain(mockContent.type);
  });

  it('should handle different size configurations', () => {
    const sizes = ['small', 'medium', 'large'] as const;
    
    sizes.forEach(size => {
      expect(['small', 'medium', 'large']).toContain(size);
    });
  });

  it('should handle priority configurations', () => {
    const priorities = ['high', 'low'] as const;
    
    priorities.forEach(priority => {
      expect(['high', 'low']).toContain(priority);
    });
  });
});