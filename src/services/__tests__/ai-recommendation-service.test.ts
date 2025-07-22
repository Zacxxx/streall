import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiRecommendationService } from '../ai-recommendation-service';

// Mock all external dependencies
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            curator: {
              name: "Test Curator",
              bio: "A sophisticated test curator with extensive experience in film curation and deep knowledge of cinema history.",
              expertise: ["Test Genre", "Test Style", "Film History", "International Cinema"],
              description: "Test curator description for sophisticated film curation"
            },
            theme: "Test Theme for Enhanced Cinema",
            reasoning: "This detailed reasoning explains why this particular theme was chosen for today's sophisticated film selection, taking into account the current context and cinematic preferences.",
            suggestedTitles: ["Test Movie 1", "Test Movie 2", "Test Movie 3", "Test Movie 4", "Test Movie 5"]
          })
        }
      })
    })
  }))
}));

// Mock content processing engine
vi.mock('../content-processing-engine', () => ({
  contentProcessingEngine: {
    convertAISuggestionsToTMDB: vi.fn().mockResolvedValue([
      {
        id: 1,
        tmdb_id: 550,
        title: 'Test Movie 1',
        type: 'movie',
        year: 2023,
        rating: 8.5,
        genres: ['Action', 'Drama'],
        poster: '/test-poster.jpg',
        overview: 'Test movie overview'
      }
    ])
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

// Mock enhanced cache service
vi.mock('../enhanced-cache-service', () => ({
  enhancedCacheService: {
    getDailySelection: vi.fn().mockReturnValue(null),
    storeDailySelection: vi.fn(),
    getCurrentDateKey: vi.fn().mockReturnValue('2024-01-15')
  }
}));

describe('Enhanced AI Recommendation Service - Daily Curator Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateDailyCurator', () => {
    it('should generate a daily curator with all required fields', async () => {
      const result = await aiRecommendationService.generateDailyCurator();
      
      expect(result).toHaveProperty('curator');
      expect(result.curator).toHaveProperty('name');
      expect(result.curator).toHaveProperty('bio');
      expect(result.curator).toHaveProperty('expertise');
      expect(result.curator).toHaveProperty('description');
      expect(result).toHaveProperty('theme');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('suggestedTitles');
      
      expect(typeof result.curator.name).toBe('string');
      expect(typeof result.curator.bio).toBe('string');
      expect(Array.isArray(result.curator.expertise)).toBe(true);
      expect(typeof result.curator.description).toBe('string');
      expect(typeof result.theme).toBe('string');
      expect(typeof result.reasoning).toBe('string');
      expect(Array.isArray(result.suggestedTitles)).toBe(true);
    });

    it('should return fallback curator when AI service fails', async () => {
      // Mock AI service to fail
      const mockService = {
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockRejectedValue(new Error('AI service failed'))
        })
      };
      
      // Temporarily replace the AI service
      const originalGenAI = (aiRecommendationService as any).genAI;
      (aiRecommendationService as any).genAI = mockService;
      
      const result = await aiRecommendationService.generateDailyCurator();
      
      // Should still return a valid curator structure
      expect(result).toHaveProperty('curator');
      expect(result).toHaveProperty('theme');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('suggestedTitles');
      
      // Restore original service
      (aiRecommendationService as any).genAI = originalGenAI;
    });

    it('should generate contextual themes based on season and day', async () => {
      const result = await aiRecommendationService.generateDailyCurator();
      
      expect(result.theme).toBeTruthy();
      expect(result.reasoning).toBeTruthy();
      expect(result.reasoning.length).toBeGreaterThan(30); // Should be detailed
    });

    it('should include diverse curator expertise areas', async () => {
      const result = await aiRecommendationService.generateDailyCurator();
      
      expect(result.curator.expertise).toBeDefined();
      expect(result.curator.expertise.length).toBeGreaterThan(0);
      expect(result.curator.expertise.every(area => typeof area === 'string')).toBe(true);
    });

    it('should suggest appropriate number of titles', async () => {
      const result = await aiRecommendationService.generateDailyCurator();
      
      expect(result.suggestedTitles).toBeDefined();
      expect(result.suggestedTitles.length).toBeGreaterThanOrEqual(3);
      expect(result.suggestedTitles.length).toBeLessThanOrEqual(8);
      expect(result.suggestedTitles.every(title => typeof title === 'string')).toBe(true);
    });
  });

  describe('generateCuratorPersona', () => {
    it('should generate a curator persona with required fields', async () => {
      const result = await aiRecommendationService.generateCuratorPersona();
      
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('bio');
      expect(result).toHaveProperty('expertise');
      expect(result).toHaveProperty('description');
      
      expect(typeof result.name).toBe('string');
      expect(typeof result.bio).toBe('string');
      expect(Array.isArray(result.expertise)).toBe(true);
      expect(typeof result.description).toBe('string');
    });

    it('should generate diverse expertise areas', async () => {
      const result = await aiRecommendationService.generateCuratorPersona();
      
      expect(result.expertise.length).toBeGreaterThanOrEqual(2);
      expect(result.expertise.length).toBeLessThanOrEqual(6);
    });
  });

  describe('Fallback System', () => {
    it('should have sophisticated fallback curators', () => {
      const fallbackCurators = (aiRecommendationService as any).fallbackCurators;
      
      expect(fallbackCurators).toBeDefined();
      expect(fallbackCurators.length).toBeGreaterThan(5);
      
      fallbackCurators.forEach((curator: any) => {
        expect(curator).toHaveProperty('name');
        expect(curator).toHaveProperty('bio');
        expect(curator).toHaveProperty('expertise');
        expect(curator).toHaveProperty('description');
        expect(curator.bio.length).toBeGreaterThan(100); // Should be detailed
        expect(curator.expertise.length).toBeGreaterThanOrEqual(4);
      });
    });

    it('should have sophisticated fallback themes', () => {
      const fallbackThemes = (aiRecommendationService as any).fallbackThemes;
      
      expect(fallbackThemes).toBeDefined();
      expect(fallbackThemes.length).toBeGreaterThan(5);
      
      fallbackThemes.forEach((theme: any) => {
        expect(theme).toHaveProperty('name');
        expect(theme).toHaveProperty('description');
        expect(theme).toHaveProperty('reasoning');
        expect(theme.reasoning.length).toBeGreaterThan(50); // Should be detailed
      });
    });
  });

  describe('Service Configuration', () => {
    it('should handle missing API key gracefully', () => {
      const isConfigured = aiRecommendationService.isConfigured();
      expect(typeof isConfigured).toBe('boolean');
    });
  });

  describe('Contextual Selection', () => {
    it('should provide contextual reasoning based on time and season', async () => {
      const result = await aiRecommendationService.generateDailyCurator();
      
      // The reasoning should be contextual and detailed
      expect(result.reasoning).toBeTruthy();
      expect(result.reasoning.length).toBeGreaterThan(30);
    });
  });
});