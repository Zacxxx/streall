import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enhancedChatRecommendationEngine, EnhancedChatRecommendationEngine } from '../enhanced-chat-recommendation-engine';
import { contentProcessingEngine } from '../content-processing-engine';
import { ContentItem } from '../tmdb-service';

// Mock the content processing engine
vi.mock('../content-processing-engine', () => ({
  contentProcessingEngine: {
    convertAISuggestionsToTMDB: vi.fn()
  }
}));

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn()
    })
  }))
}));

describe('EnhancedChatRecommendationEngine', () => {
  let engine: EnhancedChatRecommendationEngine;
  const mockContentItems: ContentItem[] = [
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
      isAdult: false,
      releaseDate: '1999-10-15',
      voteCount: 26280,
      popularity: 61.416,
      genreIds: [18, 53]
    },
    {
      id: 2,
      tmdb_id: 13,
      title: 'Forrest Gump',
      year: 1994,
      rating: 8.8,
      genres: ['Drama', 'Romance'],
      poster: 'https://image.tmdb.org/t/p/w500/poster2.jpg',
      backdropPath: 'https://image.tmdb.org/t/p/w1280/backdrop2.jpg',
      overview: 'The presidencies of Kennedy and Johnson through the eyes of an Alabama man.',
      type: 'movie' as const,
      runtime: 142,
      isAdult: false,
      releaseDate: '1994-07-06',
      voteCount: 25853,
      popularity: 48.307,
      genreIds: [18, 10749]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new EnhancedChatRecommendationEngine();
    
    // Mock environment variable
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-api-key');
    
    // Mock successful TMDB content conversion
    vi.mocked(contentProcessingEngine.convertAISuggestionsToTMDB).mockResolvedValue(mockContentItems);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('processUserRequest', () => {
    it('should process a simple genre request with AI analysis', async () => {
      // Mock AI response
      const mockAIResponse = {
        response: {
          text: () => JSON.stringify({
            genres: ['action'],
            excludedGenres: [],
            moods: ['energetic'],
            themes: [],
            contentTypes: ['movie'],
            specificRequests: [],
            temporalPreferences: [],
            culturalPreferences: [],
            qualityIndicators: [],
            viewingContext: [],
            confidence: 0.8
          })
        }
      };

      const mockRecommendationResponse = {
        response: {
          text: () => JSON.stringify({
            responseText: "I can see you're in the mood for some high-octane action! Here are some exceptional action films that showcase masterful choreography and compelling characters.",
            suggestedTitles: ["Mad Max: Fury Road", "John Wick", "The Raid", "Baby Driver"],
            confidence: 0.9,
            recommendationReasoning: "Selected based on your preference for energetic action movies",
            conversationFlow: "recommending"
          })
        }
      };

      // Mock the AI model calls
      const mockModel = {
        generateContent: vi.fn()
          .mockResolvedValueOnce(mockAIResponse) // First call for preference analysis
          .mockResolvedValueOnce(mockRecommendationResponse) // Second call for recommendations
      };

      // Mock the GoogleGenerativeAI instance
      vi.doMock('@google/generative-ai', () => ({
        GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
          getGenerativeModel: vi.fn().mockReturnValue(mockModel)
        }))
      }));

      const result = await engine.processUserRequest('I want some action movies', 'test-session');

      expect(result).toMatchObject({
        responseText: expect.stringContaining('action'),
        suggestedTitles: expect.arrayContaining(['Mad Max: Fury Road', 'John Wick']),
        confidence: expect.any(Number),
        content: mockContentItems,
        conversationFlow: 'recommending'
      });

      expect(contentProcessingEngine.convertAISuggestionsToTMDB).toHaveBeenCalledWith([
        "Mad Max: Fury Road", "John Wick", "The Raid", "Baby Driver", "Mission: Impossible - Fallout", "Atomic Blonde"
      ]);
    });

    it('should handle complex multi-dimensional preferences', async () => {
      const mockAIResponse = {
        response: {
          text: () => JSON.stringify({
            genres: ['sci-fi', 'thriller'],
            excludedGenres: ['horror'],
            moods: ['contemplative', 'thought-provoking'],
            themes: ['artificial intelligence', 'identity'],
            contentTypes: ['movie'],
            specificRequests: [],
            temporalPreferences: ['contemporary'],
            culturalPreferences: [],
            qualityIndicators: ['critically acclaimed'],
            viewingContext: ['solo'],
            confidence: 0.9
          })
        }
      };

      const mockRecommendationResponse = {
        response: {
          text: () => JSON.stringify({
            responseText: "Based on your interest in thought-provoking sci-fi that explores AI and identity, I've selected some contemporary masterpieces that will challenge your mind.",
            suggestedTitles: ["Ex Machina", "Her", "Arrival", "Blade Runner 2049"],
            confidence: 0.95,
            recommendationReasoning: "Selected for their exploration of AI, identity, and philosophical themes",
            conversationFlow: "recommending"
          })
        }
      };

      const mockModel = {
        generateContent: vi.fn()
          .mockResolvedValueOnce(mockAIResponse)
          .mockResolvedValueOnce(mockRecommendationResponse)
      };

      vi.doMock('@google/generative-ai', () => ({
        GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
          getGenerativeModel: vi.fn().mockReturnValue(mockModel)
        }))
      }));

      const result = await engine.processUserRequest(
        'I want something thought-provoking about AI and identity, but not horror. Something recent and critically acclaimed that I can watch alone.',
        'test-session'
      );

      expect(result.detectedPreferences).toMatchObject({
        genres: expect.arrayContaining(['sci-fi', 'thriller']),
        excludedGenres: expect.arrayContaining(['horror']),
        moods: expect.arrayContaining(['contemplative']),
        themes: expect.arrayContaining(['artificial intelligence'])
      });

      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should generate clarifying questions when preferences are unclear', async () => {
      const mockAIResponse = {
        response: {
          text: () => JSON.stringify({
            genres: [],
            excludedGenres: [],
            moods: [],
            themes: [],
            contentTypes: [],
            specificRequests: [],
            temporalPreferences: [],
            culturalPreferences: [],
            qualityIndicators: [],
            viewingContext: [],
            confidence: 0.2
          })
        }
      };

      const mockModel = {
        generateContent: vi.fn().mockResolvedValueOnce(mockAIResponse)
      };

      vi.doMock('@google/generative-ai', () => ({
        GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
          getGenerativeModel: vi.fn().mockReturnValue(mockModel)
        }))
      }));

      const result = await engine.processUserRequest('something good', 'test-session');

      expect(result.conversationFlow).toBe('clarifying');
      expect(result.clarifyingQuestions).toBeDefined();
      expect(result.clarifyingQuestions!.length).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should maintain conversation context across multiple requests', async () => {
      const sessionId = 'context-test-session';
      
      // First request
      const mockAIResponse1 = {
        response: {
          text: () => JSON.stringify({
            genres: ['comedy'],
            excludedGenres: [],
            moods: ['light'],
            themes: [],
            contentTypes: ['movie'],
            specificRequests: [],
            temporalPreferences: [],
            culturalPreferences: [],
            qualityIndicators: [],
            viewingContext: [],
            confidence: 0.8
          })
        }
      };

      const mockRecommendationResponse1 = {
        response: {
          text: () => JSON.stringify({
            responseText: "Here are some great comedies for a light mood!",
            suggestedTitles: ["The Grand Budapest Hotel", "Knives Out"],
            confidence: 0.8,
            recommendationReasoning: "Light comedies as requested",
            conversationFlow: "recommending"
          })
        }
      };

      const mockModel = {
        generateContent: vi.fn()
          .mockResolvedValueOnce(mockAIResponse1)
          .mockResolvedValueOnce(mockRecommendationResponse1)
      };

      vi.doMock('@google/generative-ai', () => ({
        GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
          getGenerativeModel: vi.fn().mockReturnValue(mockModel)
        }))
      }));

      await engine.processUserRequest('I want something funny', sessionId);

      // Second request should have context
      const mockAIResponse2 = {
        response: {
          text: () => JSON.stringify({
            genres: ['comedy'],
            excludedGenres: [],
            moods: ['light'],
            themes: [],
            contentTypes: ['movie'],
            specificRequests: ['different'],
            temporalPreferences: [],
            culturalPreferences: [],
            qualityIndicators: [],
            viewingContext: [],
            confidence: 0.8
          })
        }
      };

      const mockRecommendationResponse2 = {
        response: {
          text: () => JSON.stringify({
            responseText: "Here are some different comedy options!",
            suggestedTitles: ["Parasite", "Hunt for the Wilderpeople"],
            confidence: 0.8,
            recommendationReasoning: "Different comedies based on previous context",
            conversationFlow: "refining"
          })
        }
      };

      mockModel.generateContent
        .mockResolvedValueOnce(mockAIResponse2)
        .mockResolvedValueOnce(mockRecommendationResponse2);

      const result2 = await engine.processUserRequest('something different', sessionId);

      expect(result2.conversationFlow).toBe('recommending'); // Will be set by determineConversationFlow
      expect(result2.suggestedTitles).not.toEqual(['The Grand Budapest Hotel', 'Knives Out']);
    });

    it('should fall back to rule-based analysis when AI is unavailable', async () => {
      // Create engine without API key
      vi.stubEnv('VITE_GEMINI_API_KEY', '');
      const engineWithoutAI = new EnhancedChatRecommendationEngine();

      const result = await engineWithoutAI.processUserRequest('I want action movies', 'test-session');

      expect(result.detectedPreferences.genres).toContain('action');
      expect(result.confidence).toBeLessThan(0.8); // Rule-based has lower confidence
      expect(result.responseText).toBeDefined();
      expect(result.suggestedTitles.length).toBeGreaterThan(0);
    });

    it('should handle TMDB content conversion failures gracefully', async () => {
      // Mock TMDB conversion failure
      vi.mocked(contentProcessingEngine.convertAISuggestionsToTMDB).mockRejectedValue(
        new Error('TMDB API error')
      );

      const mockAIResponse = {
        response: {
          text: () => JSON.stringify({
            genres: ['action'],
            excludedGenres: [],
            moods: [],
            themes: [],
            contentTypes: ['movie'],
            specificRequests: [],
            temporalPreferences: [],
            culturalPreferences: [],
            qualityIndicators: [],
            viewingContext: [],
            confidence: 0.8
          })
        }
      };

      const mockRecommendationResponse = {
        response: {
          text: () => JSON.stringify({
            responseText: "Here are some action recommendations!",
            suggestedTitles: ["Mad Max: Fury Road", "John Wick"],
            confidence: 0.8,
            recommendationReasoning: "Action movies as requested",
            conversationFlow: "recommending"
          })
        }
      };

      const mockModel = {
        generateContent: vi.fn()
          .mockResolvedValueOnce(mockAIResponse)
          .mockResolvedValueOnce(mockRecommendationResponse)
      };

      vi.doMock('@google/generative-ai', () => ({
        GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
          getGenerativeModel: vi.fn().mockReturnValue(mockModel)
        }))
      }));

      const result = await engine.processUserRequest('action movies', 'test-session');

      expect(result.content).toEqual([]); // Should handle gracefully with empty content
      expect(result.suggestedTitles).toEqual(['Mad Max: Fury Road', 'John Wick', 'The Raid', 'Baby Driver', 'Mission: Impossible - Fallout', 'Atomic Blonde']);
      expect(result.responseText).toBeDefined();
    });

    it('should handle malformed AI responses gracefully', async () => {
      const mockAIResponse = {
        response: {
          text: () => 'Invalid JSON response'
        }
      };

      const mockModel = {
        generateContent: vi.fn().mockResolvedValue(mockAIResponse)
      };

      vi.doMock('@google/generative-ai', () => ({
        GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
          getGenerativeModel: vi.fn().mockReturnValue(mockModel)
        }))
      }));

      const result = await engine.processUserRequest('action movies', 'test-session');

      // Should fall back to rule-based analysis
      expect(result.detectedPreferences.genres).toContain('action');
      expect(result.responseText).toBeDefined();
      expect(result.confidence).toBeLessThan(0.8);
    });
  });

  describe('Rule-based preference analysis', () => {
    it('should detect genres from keywords', async () => {
      vi.stubEnv('VITE_GEMINI_API_KEY', '');
      const engineWithoutAI = new EnhancedChatRecommendationEngine();

      const result = await engineWithoutAI.processUserRequest(
        'I want sci-fi horror comedy',
        'test-session'
      );

      expect(result.detectedPreferences.genres).toEqual(
        expect.arrayContaining(['sci-fi', 'horror', 'comedy'])
      );
    });

    it('should detect moods from context', async () => {
      vi.stubEnv('VITE_GEMINI_API_KEY', '');
      const engineWithoutAI = new EnhancedChatRecommendationEngine();

      const result = await engineWithoutAI.processUserRequest(
        'something to help me relax and unwind',
        'test-session'
      );

      expect(result.detectedPreferences.moods).toContain('relaxed');
    });

    it('should detect content types', async () => {
      vi.stubEnv('VITE_GEMINI_API_KEY', '');
      const engineWithoutAI = new EnhancedChatRecommendationEngine();

      const result = await engineWithoutAI.processUserRequest(
        'recommend some TV series',
        'test-session'
      );

      expect(result.detectedPreferences.contentTypes).toContain('tv');
    });

    it('should detect cultural preferences', async () => {
      vi.stubEnv('VITE_GEMINI_API_KEY', '');
      const engineWithoutAI = new EnhancedChatRecommendationEngine();

      const result = await engineWithoutAI.processUserRequest(
        'foreign films with subtitles',
        'test-session'
      );

      expect(result.detectedPreferences.languages).toContain('international');
    });
  });

  describe('Context management', () => {
    it('should clean up old contexts', () => {
      const engine = new EnhancedChatRecommendationEngine();
      
      // Create a context with old timestamp
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 2); // 2 days ago
      
      // Access private property for testing
      (engine as any).chatContexts.set('old-session', {
        sessionHistory: ['old message'],
        previousRecommendations: [],
        userPreferences: {},
        conversationFlow: 'initial',
        lastInteractionTime: oldDate
      });

      // Add a recent context
      (engine as any).chatContexts.set('recent-session', {
        sessionHistory: ['recent message'],
        previousRecommendations: [],
        userPreferences: {},
        conversationFlow: 'initial',
        lastInteractionTime: new Date()
      });

      expect((engine as any).chatContexts.size).toBe(2);

      engine.cleanupOldContexts();

      expect((engine as any).chatContexts.size).toBe(1);
      expect((engine as any).chatContexts.has('recent-session')).toBe(true);
      expect((engine as any).chatContexts.has('old-session')).toBe(false);
    });
  });
});