import { ContentItem } from './tmdb-service';
import { tmdbService } from './tmdb-service';

// Interface for batch request configuration
export interface BatchRequestConfig {
  maxConcurrentRequests: number;
  batchSize: number;
  requestDelay: number;
  retryAttempts: number;
  timeoutMs: number;
}

// Interface for lazy loading configuration
export interface LazyLoadingConfig {
  rootMargin: string;
  threshold: number;
  enableImagePreloading: boolean;
  preloadDistance: number;
}

// Interface for AI request optimization
export interface AIRequestConfig {
  maxConcurrentAIRequests: number;
  aiRequestTimeout: number;
  enableRequestDeduplication: boolean;
  cacheAIResponses: boolean;
}

// Interface for batch processing result
export interface BatchProcessingResult<T> {
  results: T[];
  successCount: number;
  failureCount: number;
  totalTime: number;
  averageTime: number;
}

// Interface for performance metrics
export interface PerformanceMetrics {
  requestCount: number;
  successRate: number;
  averageResponseTime: number;
  cacheHitRate: number;
  concurrentRequestsActive: number;
}

export class PerformanceOptimizationService {
  private batchConfig: BatchRequestConfig;
  private lazyConfig: LazyLoadingConfig;
  private aiConfig: AIRequestConfig;
  
  // Request batching state
  private requestQueue: Map<string, Promise<any>> = new Map();
  // These are currently not used but kept for future batch processing implementation
  // private batchQueue: Array<{ id: string; request: () => Promise<any>; resolve: (value: any) => void; reject: (error: any) => void }> = [];
  // private batchTimer: NodeJS.Timeout | null = null;
  
  // Performance tracking
  private metrics: PerformanceMetrics = {
    requestCount: 0,
    successRate: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
    concurrentRequestsActive: 0
  };
  
  // Request deduplication cache
  private requestCache = new Map<string, { result: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  // Active request tracking
  private activeRequests = new Set<string>();

  constructor(
    batchConfig?: Partial<BatchRequestConfig>,
    lazyConfig?: Partial<LazyLoadingConfig>,
    aiConfig?: Partial<AIRequestConfig>
  ) {
    this.batchConfig = {
      maxConcurrentRequests: 8,
      batchSize: 5,
      requestDelay: 100,
      retryAttempts: 2,
      timeoutMs: 10000,
      ...batchConfig
    };

    this.lazyConfig = {
      rootMargin: '50px',
      threshold: 0.1,
      enableImagePreloading: true,
      preloadDistance: 200,
      ...lazyConfig
    };

    this.aiConfig = {
      maxConcurrentAIRequests: 3,
      aiRequestTimeout: 15000,
      enableRequestDeduplication: true,
      cacheAIResponses: true,
      ...aiConfig
    };
  }

  /**
   * Batch TMDB API requests for optimal performance
   */
  async batchTMDBRequests<T>(
    requests: Array<{ id: string; request: () => Promise<T> }>,
    _options?: { priority?: 'high' | 'normal' | 'low' }
  ): Promise<BatchProcessingResult<T | null>> {
    const startTime = Date.now();
    const results: (T | null)[] = [];
    let successCount = 0;
    let failureCount = 0;

    console.log(`Batching ${requests.length} TMDB requests with max ${this.batchConfig.maxConcurrentRequests} concurrent`);

    // Process requests in batches to avoid overwhelming the API
    const batches = this.chunkArray(requests, this.batchConfig.batchSize);
    
    for (const batch of batches) {
      const batchPromises = batch.map(async ({ id, request }) => {
        try {
          // Check if request is already in progress
          if (this.activeRequests.has(id)) {
            console.log(`Request ${id} already in progress, waiting...`);
            return await this.waitForExistingRequest(id);
          }

          // Mark request as active
          this.activeRequests.add(id);
          this.metrics.concurrentRequestsActive = this.activeRequests.size;

          // Execute request with timeout
          const result = await this.executeWithTimeout(request, this.batchConfig.timeoutMs);
          successCount++;
          return result;
        } catch (error) {
          console.error(`Batch request ${id} failed:`, error);
          failureCount++;
          return null;
        } finally {
          this.activeRequests.delete(id);
          this.metrics.concurrentRequestsActive = this.activeRequests.size;
        }
      });

      // Wait for current batch to complete before starting next batch
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.delay(this.batchConfig.requestDelay);
      }
    }

    const totalTime = Date.now() - startTime;
    const averageTime = totalTime / requests.length;

    // Update metrics
    this.updateMetrics(successCount, failureCount, averageTime);

    console.log(`Batch processing completed: ${successCount} successes, ${failureCount} failures in ${totalTime}ms`);

    return {
      results,
      successCount,
      failureCount,
      totalTime,
      averageTime
    };
  }

  /**
   * Optimize TMDB content search with intelligent batching
   */
  async optimizedContentSearch(titles: string[]): Promise<ContentItem[]> {
    const uniqueTitles = [...new Set(titles)];
    console.log(`Optimizing content search for ${uniqueTitles.length} unique titles`);

    // Create batch requests for TMDB searches
    const searchRequests = uniqueTitles.map(title => ({
      id: `search_${title}`,
      request: async () => {
        try {
          const searchResult = await tmdbService.search(title, { type: 'all' }, 1, 1);
          if (searchResult.results && searchResult.results.length > 0) {
            return searchResult.results[0];
          }
          return null;
        } catch (error) {
          console.error(`Search failed for "${title}":`, error);
          return null;
        }
      }
    }));

    // Execute batch requests
    const batchResult = await this.batchTMDBRequests(searchRequests, { priority: 'high' });
    
    // Filter out null results and return valid content
    const validContent = batchResult.results.filter((item): item is ContentItem => item !== null);
    
    console.log(`Optimized search completed: ${validContent.length}/${uniqueTitles.length} titles found`);
    return validContent;
  }

  /**
   * Create optimized intersection observer for lazy loading
   */
  createLazyLoadObserver(
    callback: (entries: IntersectionObserverEntry[]) => void,
    options?: Partial<LazyLoadingConfig>
  ): IntersectionObserver {
    const config = { ...this.lazyConfig, ...options };
    
    const observer = new IntersectionObserver(callback, {
      rootMargin: config.rootMargin,
      threshold: config.threshold
    });

    return observer;
  }

  /**
   * Preload images for better user experience
   */
  async preloadImages(imageUrls: string[], priority: 'high' | 'low' = 'low'): Promise<void> {
    if (!this.lazyConfig.enableImagePreloading || imageUrls.length === 0) {
      return;
    }

    console.log(`Preloading ${imageUrls.length} images with ${priority} priority`);

    const preloadPromises = imageUrls.map(url => this.preloadSingleImage(url, priority));
    
    // Use Promise.allSettled to avoid failing on individual image errors
    const results = await Promise.allSettled(preloadPromises);
    
    const successCount = results.filter(result => result.status === 'fulfilled').length;
    console.log(`Image preloading completed: ${successCount}/${imageUrls.length} images loaded`);
  }

  /**
   * Optimize concurrent AI requests with deduplication and caching
   */
  async optimizeConcurrentAIRequests<T>(
    requests: Array<{ id: string; request: () => Promise<T> }>,
    options?: { enableCache?: boolean; priority?: 'high' | 'normal' | 'low' }
  ): Promise<BatchProcessingResult<T | null>> {
    const startTime = Date.now();
    const results: (T | null)[] = [];
    let successCount = 0;
    let failureCount = 0;

    console.log(`Optimizing ${requests.length} concurrent AI requests`);

    // Check cache first if enabled
    const cachedResults = new Map<string, T>();
    const uncachedRequests: typeof requests = [];

    if (this.aiConfig.cacheAIResponses && options?.enableCache !== false) {
      for (const { id, request } of requests) {
        const cached = this.getFromCache(id);
        if (cached) {
          cachedResults.set(id, cached as T);
          successCount++;
        } else {
          uncachedRequests.push({ id, request });
        }
      }
    } else {
      uncachedRequests.push(...requests);
    }

    console.log(`Found ${cachedResults.size} cached results, processing ${uncachedRequests.length} new requests`);

    // Process uncached requests with concurrency limit
    if (uncachedRequests.length > 0) {
      const batches = this.chunkArray(uncachedRequests, this.aiConfig.maxConcurrentAIRequests);
      
      for (const batch of batches) {
        const batchPromises = batch.map(async ({ id, request }) => {
          try {
            // Check for request deduplication
            if (this.aiConfig.enableRequestDeduplication && this.requestQueue.has(id)) {
              console.log(`AI request ${id} already in progress, reusing...`);
              return await this.requestQueue.get(id)!;
            }

            // Execute request with timeout and caching
            const requestPromise = this.executeWithTimeout(request, this.aiConfig.aiRequestTimeout);
            
            if (this.aiConfig.enableRequestDeduplication) {
              this.requestQueue.set(id, requestPromise);
            }

            const result = await requestPromise;
            
            // Cache the result if enabled
            if (this.aiConfig.cacheAIResponses) {
              this.setCache(id, result);
            }

            successCount++;
            return result;
          } catch (error) {
            console.error(`AI request ${id} failed:`, error);
            failureCount++;
            return null;
          } finally {
            if (this.aiConfig.enableRequestDeduplication) {
              this.requestQueue.delete(id);
            }
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        // Merge batch results with cached results
        batch.forEach(({ id }, index) => {
          const result = batchResults[index] || cachedResults.get(id) || null;
          results.push(result);
        });
      }
    }

    // Add cached results to final results
    requests.forEach(({ id }) => {
      if (cachedResults.has(id) && !uncachedRequests.some(req => req.id === id)) {
        results.push(cachedResults.get(id)!);
      }
    });

    const totalTime = Date.now() - startTime;
    const averageTime = totalTime / requests.length;

    console.log(`AI request optimization completed: ${successCount} successes, ${failureCount} failures in ${totalTime}ms`);

    return {
      results,
      successCount,
      failureCount,
      totalTime,
      averageTime
    };
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear all caches and reset metrics
   */
  clearCaches(): void {
    this.requestCache.clear();
    this.requestQueue.clear();
    this.activeRequests.clear();
    this.metrics = {
      requestCount: 0,
      successRate: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      concurrentRequestsActive: 0
    };
    console.log('Performance optimization caches cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(
    batchConfig?: Partial<BatchRequestConfig>,
    lazyConfig?: Partial<LazyLoadingConfig>,
    aiConfig?: Partial<AIRequestConfig>
  ): void {
    if (batchConfig) {
      this.batchConfig = { ...this.batchConfig, ...batchConfig };
    }
    if (lazyConfig) {
      this.lazyConfig = { ...this.lazyConfig, ...lazyConfig };
    }
    if (aiConfig) {
      this.aiConfig = { ...this.aiConfig, ...aiConfig };
    }
    console.log('Performance optimization configuration updated');
  }

  // Private helper methods

  private async executeWithTimeout<T>(request: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      request()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private async waitForExistingRequest(id: string): Promise<any> {
    const existingRequest = this.requestQueue.get(id);
    if (existingRequest) {
      try {
        return await existingRequest;
      } catch (error) {
        // If existing request failed, we'll let the caller retry
        throw error;
      }
    }
    return null;
  }

  private async preloadSingleImage(url: string, priority: 'high' | 'low'): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Set loading priority if supported
      if ('loading' in img) {
        img.loading = priority === 'high' ? 'eager' : 'lazy';
      }
      
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
      img.src = url;
    });
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }
    if (cached) {
      this.requestCache.delete(key); // Remove expired cache
    }
    return null;
  }

  private setCache<T>(key: string, result: T): void {
    this.requestCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateMetrics(successCount: number, failureCount: number, averageTime: number): void {
    const totalRequests = successCount + failureCount;
    this.metrics.requestCount += totalRequests;
    this.metrics.successRate = totalRequests > 0 ? successCount / totalRequests : 0;
    this.metrics.averageResponseTime = averageTime;
    
    // Update cache hit rate (simplified calculation)
    const cacheHits = this.requestCache.size;
    const totalCacheRequests = this.metrics.requestCount;
    this.metrics.cacheHitRate = totalCacheRequests > 0 ? cacheHits / totalCacheRequests : 0;
  }
}

// Export singleton instance
export const performanceOptimizationService = new PerformanceOptimizationService();
export default performanceOptimizationService;