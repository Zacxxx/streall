import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  errorHandlingService, 
  ErrorHandlingService,
  AIServiceError, 
  TMDBServiceError, 
  ContentProcessingError,
  NetworkError,
  SuggestionsError
} from '../error-handling-service';

describe('ErrorHandlingService', () => {
  let service: ErrorHandlingService;

  beforeEach(() => {
    service = new ErrorHandlingService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.clearErrorHistory();
  });

  describe('Error Classification', () => {
    it('should classify AI service errors correctly', () => {
      const error = new AIServiceError('AI service failed', 'gemini', 'content-generation');
      
      expect(error.name).toBe('AIServiceError');
      expect(error.code).toBe('AI_SERVICE_ERROR');
      expect(error.recoverable).toBe(true);
      expect(error.retryable).toBe(true);
      expect(error.aiProvider).toBe('gemini');
    });

    it('should classify TMDB service errors correctly', () => {
      const error = new TMDBServiceError('TMDB API failed', 'search/movie', 429);
      
      expect(error.name).toBe('TMDBServiceError');
      expect(error.code).toBe('TMDB_SERVICE_ERROR');
      expect(error.recoverable).toBe(true);
      expect(error.endpoint).toBe('search/movie');
      expect(error.statusCode).toBe(429);
    });

    it('should classify content processing errors correctly', () => {
      const error = new ContentProcessingError('Processing failed', 'The Matrix', 'validation');
      
      expect(error.name).toBe('ContentProcessingError');
      expect(error.code).toBe('CONTENT_PROCESSING_ERROR');
      expect(error.recoverable).toBe(false);
      expect(error.contentTitle).toBe('The Matrix');
      expect(error.processingStage).toBe('validation');
    });

    it('should classify network errors correctly', () => {
      const error = new NetworkError('Network timeout', 'https://api.example.com', 408);
      
      expect(error.name).toBe('NetworkError');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.recoverable).toBe(true);
      expect(error.retryable).toBe(true);
      expect(error.url).toBe('https://api.example.com');
    });
  });

  describe('Error Normalization', () => {
    it('should normalize generic errors to SuggestionsError', () => {
      const genericError = new Error('Something went wrong');
      const result = service['normalizeError'](genericError);
      
      expect(result).toBeInstanceOf(SuggestionsError);
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.recoverable).toBe(false);
    });

    it('should detect network errors from message content', () => {
      const networkError = new Error('fetch failed due to network issue');
      const result = service['normalizeError'](networkError);
      
      expect(result).toBeInstanceOf(NetworkError);
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.retryable).toBe(true);
    });

    it('should detect timeout errors from message content', () => {
      const timeoutError = new Error('Request timeout after 10 seconds');
      const result = service['normalizeError'](timeoutError);
      
      expect(result.code).toBe('TIMEOUT_ERROR');
      expect(result.retryable).toBe(true);
    });

    it('should detect rate limit errors from message content', () => {
      const rateLimitError = new Error('API rate limit exceeded');
      const result = service['normalizeError'](rateLimitError);
      
      expect(result.code).toBe('RATE_LIMIT_ERROR');
      expect(result.retryable).toBe(true);
    });
  });

  describe('User-Friendly Messages', () => {
    it('should provide user-friendly message for AI service errors', () => {
      const error = new AIServiceError('AI service failed', 'gemini');
      const message = service.getUserFriendlyMessage(error);
      
      expect(message).toBe('AI service is temporarily unavailable. Using fallback recommendations.');
    });

    it('should provide user-friendly message for TMDB service errors', () => {
      const error = new TMDBServiceError('TMDB API failed', 'search/movie');
      const message = service.getUserFriendlyMessage(error);
      
      expect(message).toBe('Content search is temporarily unavailable. Showing cached recommendations.');
    });

    it('should provide user-friendly message for content processing errors', () => {
      const error = new ContentProcessingError('Processing failed', 'The Matrix', 'validation');
      const message = service.getUserFriendlyMessage(error);
      
      expect(message).toBe('Some content could not be processed. Showing available recommendations.');
    });

    it('should provide generic message for unknown errors', () => {
      const error = new Error('Unknown error');
      const message = service.getUserFriendlyMessage(error);
      
      expect(message).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('Retry Logic', () => {
    it('should identify retryable errors correctly', () => {
      const aiError = new AIServiceError('AI failed', 'gemini');
      const tmdbError = new TMDBServiceError('TMDB failed', 'search');
      const networkError = new NetworkError('Network failed', 'http://example.com');
      const processingError = new ContentProcessingError('Processing failed', 'title', 'stage');
      
      expect(service.isRetryableError(aiError)).toBe(true);
      expect(service.isRetryableError(tmdbError)).toBe(true);
      expect(service.isRetryableError(networkError)).toBe(true);
      expect(service.isRetryableError(processingError)).toBe(false);
    });

    it('should calculate retry delay with exponential backoff', () => {
      const delay0 = service['calculateRetryDelay'](0);
      const delay1 = service['calculateRetryDelay'](1);
      const delay2 = service['calculateRetryDelay'](2);
      
      expect(delay1).toBeGreaterThan(delay0);
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay2).toBeLessThanOrEqual(10000); // Max delay cap
    });

    it('should execute operation with retry on retryable errors', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new AIServiceError('Temporary failure', 'gemini');
        }
        return 'success';
      });

      const result = await service.executeWithRetry(operation, 'test-operation');
      
      expect(result).toBe('success');
      expect(attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors but may recover', async () => {
      const operation = vi.fn().mockImplementation(() => {
        throw new ContentProcessingError('Non-retryable error', 'title', 'stage');
      });

      // This should not retry but may recover through error handling
      const result = await service.executeWithRetry(operation, 'test-operation', {
        partialResults: []
      });
      
      expect(operation).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]); // Should return empty array from recovery
    });
  });

  describe('Error Recovery', () => {
    it('should attempt recovery for recoverable errors', async () => {
      const error = new AIServiceError('AI service failed', 'gemini');
      const context = { operation: 'generateDailyCurator' };
      
      const result = await service.handleError(error, context);
      
      expect(result.recovered).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.curator).toBeDefined();
    });

    it('should attempt TMDB recovery with cached content', async () => {
      const error = new TMDBServiceError('TMDB failed', 'search/movie');
      const cachedContent = [{ id: 1, title: 'Test Movie' }];
      const context = { operation: 'searchContent', cachedContent };
      
      const result = await service.handleError(error, context);
      
      expect(result.recovered).toBe(true);
      expect(result.result).toEqual(cachedContent);
    });

    it('should handle content processing errors with partial results', async () => {
      const error = new ContentProcessingError('Processing failed', 'title', 'stage');
      const partialResults = [{ id: 1, title: 'Partial Result' }];
      const context = { operation: 'processContent', partialResults };
      
      const result = await service.handleError(error, context);
      
      expect(result.recovered).toBe(true);
      expect(result.result).toEqual(partialResults);
    });

    it('should return unrecovered error when no strategy applies', async () => {
      const error = new Error('Unrecoverable error');
      
      const result = await service.handleError(error);
      
      expect(result.recovered).toBe(false);
      expect(result.finalError).toBeDefined();
    });
  });

  describe('Error Tracking', () => {
    it('should track error occurrences', async () => {
      const error1 = new AIServiceError('AI failed', 'gemini');
      const error2 = new AIServiceError('AI failed', 'gemini');
      const error3 = new TMDBServiceError('TMDB failed', 'search');
      
      await service.handleError(error1);
      await service.handleError(error2);
      await service.handleError(error3);
      
      const stats = service.getErrorStats();
      
      expect(stats.totalErrors).toBe(3);
      expect(stats.errorTypes.AIServiceError).toBe(2);
      expect(stats.errorTypes.TMDBServiceError).toBe(1);
    });

    it('should clear error history', async () => {
      const error = new AIServiceError('AI failed', 'gemini');
      await service.handleError(error);
      
      let stats = service.getErrorStats();
      expect(stats.totalErrors).toBe(1);
      
      service.clearErrorHistory();
      stats = service.getErrorStats();
      expect(stats.totalErrors).toBe(0);
    });
  });

  describe('Integration with executeWithRetry', () => {
    it('should combine retry and recovery mechanisms', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts <= 2) {
          throw new AIServiceError('Temporary AI failure', 'gemini');
        }
        throw new ContentProcessingError('Final processing error', 'title', 'stage');
      });

      const result = await service.executeWithRetry(
        operation, 
        'test-operation',
        { 
          operation: 'processContent',
          partialResults: [{ id: 1, title: 'Fallback Content' }]
        }
      );
      
      // Should retry AI errors, then recover from processing error
      expect(result).toEqual([{ id: 1, title: 'Fallback Content' }]);
      expect(attempts).toBe(3); // 2 retries + 1 final attempt
    });
  });
});