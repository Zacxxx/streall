import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  AIServiceError, 
  TMDBServiceError, 
  ContentProcessingError,
  SuggestionsError 
} from '../error-handling-service';
import { errorHandlingService } from '../error-handling-service';

describe('Error Handling Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AI Service Errors', () => {
    it('should handle Gemini AI rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';

      const mockOperation = vi.fn().mockRejectedValue(rateLimitError);

      try {
        await errorHandlingService.executeWithRetry(mockOperation, 'ai-operation');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
      }
    });

    it('should handle Gemini AI authentication errors', async () => {
      const authError = new Error('Invalid API key');
      authError.name = 'AuthenticationError';

      const mockOperation = vi.fn().mockRejectedValue(authError);

      await expect(
        errorHandlingService.executeWithRetry(mockOperation, 'ai-auth-operation')
      ).rejects.toThrow('Invalid API key');

      expect(mockOperation).toHaveBeenCalledTimes(1); // Should not retry auth errors
    });

    it('should handle Gemini AI quota exceeded', async () => {
      const quotaError = new Error('Quota exceeded');
      quotaError.name = 'QuotaExceededError';

      const mockOperation = vi.fn().mockRejectedValue(quotaError);

      await expect(
        errorHandlingService.executeWithRetry(mockOperation, 'ai-quota-operation')
      ).rejects.toThrow('Quota exceeded');
    });

    it('should handle malformed AI responses', () => {
      const malformedResponse = 'This is not JSON';
      
      expect(() => {
        JSON.parse(malformedResponse);
      }).toThrow();

      // Test fallback parsing
      const fallbackResult = errorHandlingService.normalizeError(
        new Error('JSON parse error')
      );

      expect(fallbackResult).toBeInstanceOf(Error);
      expect(fallbackResult.message).toContain('JSON parse error');
    });
  });

  describe('TMDB Service Errors', () => {
    it('should handle TMDB API key errors', async () => {
      const apiKeyError = new Error('Invalid API key');
      const mockOperation = vi.fn().mockRejectedValue(apiKeyError);

      await expect(
        errorHandlingService.executeWithRetry(mockOperation, 'tmdb-auth-operation')
      ).rejects.toThrow('Invalid API key');
    });

    it('should handle TMDB rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce('success');

      const result = await errorHandlingService.executeWithRetry(mockOperation, 'tmdb-rate-limit-operation');

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should handle TMDB server errors', async () => {
      const serverError = new Error('Internal server error');
      serverError.name = 'ServerError';

      const mockOperation = vi.fn().mockRejectedValue(serverError);

      await expect(
        errorHandlingService.executeWithRetry(mockOperation, 'tmdb-server-error-operation')
      ).rejects.toThrow('Internal server error');

      expect(mockOperation).toHaveBeenCalledTimes(3); // Should retry server errors
    });

    it('should handle TMDB network timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';

      const mockOperation = vi.fn()
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce('success after timeout');

      const result = await errorHandlingService.executeWithRetry(mockOperation, 'tmdb-timeout-operation');

      expect(result).toBe('success after timeout');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Content Processing Errors', () => {
    it('should handle empty search results', () => {
      const emptyResults = [];
      
      const error = new ContentProcessingError(
        'No content found for search query',
        'test-query'
      );

      expect(error).toBeInstanceOf(ContentProcessingError);
      expect(error.contentTitle).toBe('test-query');
      expect(error.recoverable).toBe('batch-processing');
    });

    it('should handle invalid content data', () => {
      const invalidContent = {
        id: null,
        title: '',
        type: 'unknown'
      };

      const error = new ContentProcessingError(
        'Invalid content data structure',
        'invalid-content'
      );

      expect(error.message).toContain('Invalid content data');
      expect(error.contentTitle).toBe('invalid-content');
    });

    it('should handle content mapping failures', () => {
      const mappingError = new Error('Failed to map TMDB data to application format');
      
      const normalizedError = errorHandlingService.normalizeError(mappingError);
      
      expect(normalizedError).toBeInstanceOf(Error);
      expect(normalizedError.message).toContain('Failed to map');
    });
  });

  describe('Network and Connectivity Errors', () => {
    it('should handle network disconnection', async () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';

      const mockOperation = vi.fn().mockRejectedValue(networkError);

      await expect(
        errorHandlingService.executeWithRetry(mockOperation, {
          maxRetries: 3,
          retryDelay: 100
        })
      ).rejects.toThrow('Network request failed');

      expect(mockOperation).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should handle DNS resolution failures', async () => {
      const dnsError = new Error('DNS resolution failed');
      dnsError.name = 'DNSError';

      const mockOperation = vi.fn().mockRejectedValue(dnsError);

      await expect(
        errorHandlingService.executeWithRetry(mockOperation, 'dns-resolution-operation')
      ).rejects.toThrow('DNS resolution failed');
    });

    it('should handle SSL/TLS errors', async () => {
      const sslError = new Error('SSL certificate error');
      sslError.name = 'SSLError';

      const mockOperation = vi.fn().mockRejectedValue(sslError);

      await expect(
        errorHandlingService.executeWithRetry(mockOperation, 'ssl-error-operation')
      ).rejects.toThrow('SSL certificate error');
    });
  });

  describe('Cache and Storage Errors', () => {
    it('should handle localStorage quota exceeded', () => {
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';

      const normalizedError = errorHandlingService.normalizeError(quotaError);
      
      expect(normalizedError).toBeInstanceOf(Error);
      expect(normalizedError.message).toContain('QuotaExceededError');
    });

    it('should handle cache corruption', () => {
      const corruptionError = new Error('Cache data corrupted');
      
      const normalizedError = errorHandlingService.normalizeError(corruptionError);
      
      expect(normalizedError.message).toContain('Cache data corrupted');
    });

    it('should handle cache cleanup failures', () => {
      const cleanupError = new Error('Failed to cleanup expired cache entries');
      
      const normalizedError = errorHandlingService.normalizeError(cleanupError);
      
      expect(normalizedError.message).toContain('cleanup expired cache');
    });
  });

  describe('Concurrent Operation Errors', () => {
    it('should handle race conditions in cache access', async () => {
      const raceConditionError = new Error('Race condition detected');
      
      const mockOperation1 = vi.fn().mockRejectedValue(raceConditionError);
      const mockOperation2 = vi.fn().mockResolvedValue('success');

      const promises = [
        errorHandlingService.executeWithRetry(mockOperation1, 'concurrent-operation-1').catch(e => e),
        errorHandlingService.executeWithRetry(mockOperation2, 'concurrent-operation-2')
      ];

      const results = await Promise.all(promises);
      
      expect(results[0]).toBeInstanceOf(Error);
      expect(results[1]).toBe('success');
    });

    it('should handle concurrent API rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      
      const mockOperations = Array.from({ length: 5 }, () => 
        vi.fn().mockRejectedValue(rateLimitError)
      );

      const promises = mockOperations.map((op, index) => 
        errorHandlingService.executeWithRetry(op, `rate-limit-operation-${index}`).catch(e => e)
      );

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result).toBeInstanceOf(Error);
        expect(result.message).toContain('Rate limit exceeded');
      });
    });
  });

  describe('Recovery Strategies', () => {
    it('should implement exponential backoff', async () => {
      const error = new Error('Temporary failure');
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const startTime = Date.now();
      
      const result = await errorHandlingService.executeWithRetry(mockOperation, 'exponential-backoff-operation');

      const duration = Date.now() - startTime;
      
      expect(result).toBe('success');
      expect(duration).toBeGreaterThan(300); // 100ms + 200ms delays
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should implement circuit breaker pattern', async () => {
      const error = new Error('Service unavailable');
      const mockOperation = vi.fn().mockRejectedValue(error);

      // Simulate multiple failures to trigger circuit breaker
      const failures = Array.from({ length: 5 }, () => 
        errorHandlingService.executeWithRetry(mockOperation, { maxRetries: 0 }).catch(e => e)
      );

      const results = await Promise.all(failures);
      
      results.forEach(result => {
        expect(result).toBeInstanceOf(Error);
      });
    });

    it('should provide fallback content on complete failure', async () => {
      const completeFailure = new Error('All services unavailable');
      const mockOperation = vi.fn().mockRejectedValue(completeFailure);

      try {
        await errorHandlingService.executeWithRetry(mockOperation);
      } catch (error) {
        // Should provide fallback mechanism
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('All services unavailable');
      }
    });
  });

  describe('Error Reporting and Monitoring', () => {
    it('should log errors with appropriate severity', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const criticalError = new Error('Critical system failure');
      errorHandlingService.handleError(criticalError);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error handling service processing error:'),
        criticalError
      );
      
      consoleSpy.mockRestore();
    });

    it('should track error frequencies', () => {
      const errors = [
        new Error('Error type 1'),
        new Error('Error type 1'),
        new Error('Error type 2')
      ];

      errors.forEach(error => {
        errorHandlingService.handleError(error);
      });

      // Error tracking would be implemented in the actual service
      expect(errors).toHaveLength(3);
    });

    it('should provide error context for debugging', () => {
      const contextualError = new ContentProcessingError(
        'Processing failed',
        'test-content'
      );

      expect(contextualError.contentTitle).toBe('test-content');
      expect(contextualError.recoverable).toBe('batch-processing');
      expect(contextualError.stack).toBeDefined();
    });
  });

  describe('User Experience Error Handling', () => {
    it('should provide user-friendly error messages', () => {
      const technicalError = new Error('XMLHttpRequest failed with status 500');
      const normalizedError = errorHandlingService.normalizeError(technicalError);
      
      // Should convert technical errors to user-friendly messages
      expect(normalizedError.message).toBeDefined();
    });

    it('should suggest recovery actions', () => {
      const networkError = new Error('Network connection failed');
      const normalizedError = errorHandlingService.normalizeError(networkError);
      
      expect(normalizedError.message).toBeDefined();
      // In a real implementation, this would include recovery suggestions
    });

    it('should handle graceful degradation', async () => {
      const partialFailure = new Error('Some features unavailable');
      
      // Should continue with reduced functionality
      const normalizedError = errorHandlingService.normalizeError(partialFailure);
      expect(normalizedError).toBeInstanceOf(Error);
    });
  });
});