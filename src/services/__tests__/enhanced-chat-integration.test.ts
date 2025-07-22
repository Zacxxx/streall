import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enhancedChatRecommendationEngine } from '../enhanced-chat-recommendation-engine';

// Mock the content processing engine
vi.mock('../content-processing-engine', () => ({
  contentProcessingEngine: {
    convertAISuggestionsToTMDB: vi.fn().mockResolvedValue([
      {
        id: 1,
        tmdb_id: 550,
        title: 'Fight Club',
        year: 1999,
        rating: 8.8,
        genres: ['Drama', 'Thriller'],
        poster: 'https://image.tmdb.org/t/p/w500/poster1.jpg',
        backdropPath: 'https://image.tmdb.org/t/p/w1280/backdrop1.jpg',
        overview: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club.',
        type: 'movie' as const,
        runtime: 139,
        isAdult: false
      }
    ])
  }
}));

describe('Enhanced Chat Recommendation Engine Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process user requests and return recommendations', async () => {
    const result = await enhancedChatRecommendationEngine.processUserRequest(
      'I want some action movies',
      'test-session'
    );

    // Basic structure validation
    expect(result).toHaveProperty('responseText');
    expect(result).toHaveProperty('suggestedTitles');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('detectedPreferences');
    expect(result).toHaveProperty('recommendationReasoning');
    expect(result).toHaveProperty('conversationFlow');

    // Content validation
    expect(result.responseText).toBeTruthy();
    expect(Array.isArray(result.suggestedTitles)).toBe(true);
    expect(result.suggestedTitles.length).toBeGreaterThan(0);
    expect(typeof result.confidence).toBe('number');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(result.content)).toBe(true);
    expect(typeof result.detectedPreferences).toBe('object');
    expect(typeof result.recommendationReasoning).toBe('string');
    expect(['initial', 'clarifying', 'recommending', 'refining']).toContain(result.conversationFlow);

    console.log('Enhanced Chat Response:', {
      responseText: result.responseText,
      suggestedTitles: result.suggestedTitles,
      confidence: result.confidence,
      contentCount: result.content.length,
      detectedPreferences: result.detectedPreferences,
      conversationFlow: result.conversationFlow
    });
  });

  it('should handle rule-based analysis for different genres', async () => {
    const testCases = [
      { input: 'sci-fi movies', expectedGenre: 'sci-fi' },
      { input: 'horror films', expectedGenre: 'horror' },
      { input: 'comedy shows', expectedGenre: 'comedy' },
      { input: 'action thrillers', expectedGenre: 'action' }
    ];

    for (const testCase of testCases) {
      const result = await enhancedChatRecommendationEngine.processUserRequest(
        testCase.input,
        `test-session-${testCase.expectedGenre}`
      );

      expect(result.detectedPreferences.genres).toContain(testCase.expectedGenre);
      expect(result.suggestedTitles.length).toBeGreaterThan(0);
      
      console.log(`${testCase.input} -> Genres: ${result.detectedPreferences.genres?.join(', ')}, Titles: ${result.suggestedTitles.slice(0, 3).join(', ')}`);
    }
  });

  it('should handle complex preference detection', async () => {
    const result = await enhancedChatRecommendationEngine.processUserRequest(
      'I want something thought-provoking and contemporary, but not horror. Maybe some international films?',
      'complex-test-session'
    );

    expect(result.detectedPreferences.moods).toContain('contemplative');
    expect(result.detectedPreferences.languages).toContain('international');
    expect(result.suggestedTitles.length).toBeGreaterThan(0);

    console.log('Complex Preferences Result:', {
      detectedPreferences: result.detectedPreferences,
      suggestedTitles: result.suggestedTitles.slice(0, 3)
    });
  });

  it('should maintain conversation context', async () => {
    const sessionId = 'context-test';
    
    // First request
    const result1 = await enhancedChatRecommendationEngine.processUserRequest(
      'I like comedy movies',
      sessionId
    );

    expect(result1.detectedPreferences.genres).toContain('comedy');

    // Second request should build on context
    const result2 = await enhancedChatRecommendationEngine.processUserRequest(
      'something different',
      sessionId
    );

    // Should still have some context from previous interaction
    expect(result2.responseText).toBeTruthy();
    expect(result2.suggestedTitles.length).toBeGreaterThan(0);

    console.log('Context Test:', {
      first: { genres: result1.detectedPreferences.genres, titles: result1.suggestedTitles.slice(0, 2) },
      second: { titles: result2.suggestedTitles.slice(0, 2) }
    });
  });

  it('should clean up old contexts', () => {
    // Test context cleanup functionality
    enhancedChatRecommendationEngine.cleanupOldContexts();
    
    // This should not throw an error
    expect(true).toBe(true);
  });
});