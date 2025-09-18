import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiRecommendationService } from '../ai-recommendation-service';
import { contentProcessingEngine } from '../content-processing-engine';
import { tmdbService } from '../tmdb-service';

// Mock the dependencies
vi.mock('../content-processing-engine');
vi.mock('../tmdb-service');

describe('Daily Curator TMDB Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully integrate AI suggestions with TMDB content', async () => {
    // Mock successful TMDB content processing
    const mockTMDBContent = [
      {
        id: 1,
        tmdb_id: 1,
        imdb_id: 'tt0111161',
        title: 'The Shawshank Redemption',
        type: 'movie' as const,
        year: 1994,
        releaseDate: '1994-09-23',
        overview: 'Two imprisoned men bond over a number of years...',
        poster: 'https://image.tmdb.org/t/p/w500/poster.jpg',
        backdropPath: 'https://image.tmdb.org/t/p/w1280/backdrop.jpg',
        rating: 9.3,
        voteCount: 2000000,
        popularity: 85.5,
        genres: ['Drama', 'Crime'],
        genreIds: [18, 80],
        runtime: 142,
        seasons: null,
        episodes: null,
        status: 'Released',
        isAdult: false,
        streamUrl: 'https://multiembed.mov/?video_id=tt0111161'
      },
      {
        id: 2,
        tmdb_id: 2,
        imdb_id: 'tt0068646',
        title: 'The Godfather',
        type: 'movie' as const,
        year: 1972,
        releaseDate: '1972-03-24',
        overview: 'The aging patriarch of an organized crime dynasty...',
        poster: 'https://image.tmdb.org/t/p/w500/poster2.jpg',
        backdropPath: 'https://image.tmdb.org/t/p/w1280/backdrop2.jpg',
        rating: 9.2,
        voteCount: 1500000,
        popularity: 90.2,
        genres: ['Drama', 'Crime'],
        genreIds: [18, 80],
        runtime: 175,
        seasons: null,
        episodes: null,
        status: 'Released',
        isAdult: false,
        streamUrl: 'https://multiembed.mov/?video_id=tt0068646'
      }
    ];

    // Mock the content processing engine
    vi.mocked(contentProcessingEngine.convertAISuggestionsToTMDB).mockResolvedValue(mockTMDBContent);
    vi.mocked(contentProcessingEngine.enrichContentWithMetadata).mockImplementation(async (content) => content);

    // Test the daily curator generation with TMDB integration
    const result = await aiRecommendationService.generateDailyCurator();

    expect(result).toBeDefined();
    expect(result.curator).toBeDefined();
    expect(result.theme).toBeDefined();
    expect(result.reasoning).toBeDefined();
    expect(result.suggestedTitles).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content).toHaveLength(2);
    
    // Verify TMDB content structure
    expect(result.content![0]).toMatchObject({
      title: 'The Shawshank Redemption',
      type: 'movie',
      rating: 9.3,
      streamUrl: 'https://multiembed.mov/?video_id=tt0111161'
    });

    // Verify the content processing engine was called
    expect(contentProcessingEngine.convertAISuggestionsToTMDB).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(String)])
    );
  });

  it('should handle TMDB processing failures gracefully', async () => {
    // Mock TMDB processing failure
    vi.mocked(contentProcessingEngine.convertAISuggestionsToTMDB).mockRejectedValue(
      new Error('TMDB API unavailable')
    );

    // Mock fallback content
    const mockFallbackContent = [
      {
        id: 3,
        tmdb_id: 3,
        title: 'Fallback Movie',
        type: 'movie' as const,
        year: 2020,
        releaseDate: '2020-01-01',
        overview: 'A fallback movie for testing',
        poster: null,
        backdropPath: null,
        rating: 7.0,
        voteCount: 1000,
        popularity: 50.0,
        genres: ['Drama'],
        genreIds: [18],
        runtime: 120,
        seasons: null,
        episodes: null,
        status: 'Released',
        isAdult: false,
        streamUrl: 'https://multiembed.mov/?video_id=3&tmdb=1'
      }
    ];

    // Mock fallback processing to succeed
    vi.mocked(contentProcessingEngine.convertAISuggestionsToTMDB)
      .mockRejectedValueOnce(new Error('TMDB API unavailable'))
      .mockResolvedValueOnce(mockFallbackContent);

    vi.mocked(contentProcessingEngine.enrichContentWithMetadata).mockImplementation(async (content) => content);

    const result = await aiRecommendationService.generateDailyCurator();

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content).toHaveLength(1);
    expect(result.content![0].title).toBe('Fallback Movie');

    // Verify fallback was attempted
    expect(contentProcessingEngine.convertAISuggestionsToTMDB).toHaveBeenCalledTimes(2);
  });

  it('should validate and enrich TMDB content properly', async () => {
    const mockRawContent = [
      {
        id: 1,
        tmdb_id: 1,
        title: 'Test Movie',
        type: 'movie' as const,
        year: 2023,
        releaseDate: '2023-01-01',
        overview: 'A test movie',
        poster: null,
        backdropPath: null,
        rating: 8.0,
        voteCount: 5000,
        popularity: 60.0,
        genres: ['Action'],
        genreIds: [28],
        runtime: 120,
        seasons: null,
        episodes: null,
        status: 'Released',
        isAdult: false,
        streamUrl: 'https://multiembed.mov/?video_id=1&tmdb=1'
      }
    ];

    const mockEnrichedContent = [
      {
        ...mockRawContent[0],
        imdb_id: 'tt1234567',
        streamUrl: 'https://multiembed.mov/?video_id=tt1234567',
        qualityScore: 75,
        isHighQuality: true,
        isPopular: true,
        hasValidPoster: false,
        hasValidBackdrop: false
      }
    ];

    vi.mocked(contentProcessingEngine.convertAISuggestionsToTMDB).mockResolvedValue(mockRawContent);
    vi.mocked(contentProcessingEngine.enrichContentWithMetadata).mockResolvedValue(mockEnrichedContent[0]);

    const result = await aiRecommendationService.generateDailyCurator();

    expect(result.content).toBeDefined();
    expect(result.content![0]).toMatchObject({
      title: 'Test Movie',
      imdb_id: 'tt1234567',
      streamUrl: 'https://multiembed.mov/?video_id=tt1234567'
    });

    // Verify enrichment was called
    expect(contentProcessingEngine.enrichContentWithMetadata).toHaveBeenCalledWith(mockRawContent[0]);
  });

  it('should handle empty TMDB results with proper fallback', async () => {
    // Mock empty results from both AI suggestions and fallback
    vi.mocked(contentProcessingEngine.convertAISuggestionsToTMDB).mockResolvedValue([]);

    try {
      await aiRecommendationService.generateDailyCurator();
      expect.fail('Should have thrown an error for complete failure');
    } catch (error: any) {
      expect(error.name).toBe('DailySelectionError');
      expect(error.message).toContain('Complete failure: Unable to generate daily curator with any content');
    }
  });

  it('should properly format content for Netflix cards', async () => {
    const mockTMDBContent = [
      {
        id: 1,
        tmdb_id: 1,
        imdb_id: 'tt0111161',
        title: 'The Shawshank Redemption',
        type: 'movie' as const,
        year: 1994,
        releaseDate: '1994-09-23',
        overview: 'Two imprisoned men bond over a number of years...',
        poster: 'https://image.tmdb.org/t/p/w500/poster.jpg',
        backdropPath: 'https://image.tmdb.org/t/p/w1280/backdrop.jpg',
        rating: 9.3,
        voteCount: 2000000,
        popularity: 85.5,
        genres: ['Drama', 'Crime'],
        genreIds: [18, 80],
        runtime: 142,
        seasons: null,
        episodes: null,
        status: 'Released',
        isAdult: false,
        streamUrl: 'https://multiembed.mov/?video_id=tt0111161'
      }
    ];

    vi.mocked(contentProcessingEngine.convertAISuggestionsToTMDB).mockResolvedValue(mockTMDBContent);
    vi.mocked(contentProcessingEngine.enrichContentWithMetadata).mockImplementation(async (content) => content);

    const result = await aiRecommendationService.generateDailyCurator();

    expect(result.content![0]).toMatchObject({
      id: expect.any(Number),
      tmdb_id: expect.any(Number),
      imdb_id: expect.any(String),
      title: expect.any(String),
      type: expect.stringMatching(/^(movie|tv)$/),
      poster: expect.any(String),
      rating: expect.any(Number),
      genres: expect.any(Array),
      streamUrl: expect.any(String)
    });
  });
});
