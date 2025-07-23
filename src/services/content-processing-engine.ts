import { tmdbService, ContentItem } from './tmdb-service';
import { errorHandlingService, TMDBServiceError } from './error-handling-service';
import { performanceOptimizationService } from './performance-optimization-service';

// Error classes for content processing
export class ContentProcessingError extends Error {
  constructor(message: string, public contentTitle: string, public recoverable: boolean = false) {
    super(message);
    this.name = 'ContentProcessingError';
  }
}



// Interface for content processing results
export interface ProcessingResult {
  content: ContentItem | null;
  title: string;
  success: boolean;
  error?: string;
  processingTime: number;
}

export interface BatchProcessingResult {
  results: ProcessingResult[];
  successCount: number;
  failureCount: number;
  totalProcessingTime: number;
  successRate: number;
}

// Configuration for content processing
export interface ProcessingConfig {
  maxConcurrentRequests: number;
  requestTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableFallbackSearch: boolean;
  minContentQuality: number; // Minimum vote average
}

export class ContentProcessingEngine {
  private config: ProcessingConfig;
  private processingQueue: Map<string, Promise<ProcessingResult>> = new Map();
  private cache: Map<string, { result: ProcessingResult; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  constructor(config?: Partial<ProcessingConfig>) {
    this.config = {
      maxConcurrentRequests: 5,
      requestTimeout: 10000, // 10 seconds
      retryAttempts: 2,
      retryDelay: 1000, // 1 second
      enableFallbackSearch: true,
      minContentQuality: 0, // Accept all content by default
      ...config
    };
  }

  /**
   * Convert AI suggestions to TMDB content items with optimized concurrent processing and robust error handling
   */
  async convertAISuggestionsToTMDB(titles: string[]): Promise<ContentItem[]> {
    if (!titles || titles.length === 0) {
      return [];
    }

    const startTime = Date.now();
    console.log(`Processing ${titles.length} AI suggestions with performance optimization...`);

    return await errorHandlingService.executeWithRetry(
      async () => {
        // Use performance optimization service for intelligent batching
        const optimizedContent = await performanceOptimizationService.optimizedContentSearch(titles);
        
        // Enrich content with additional metadata
        const enrichedContent = await Promise.all(
          optimizedContent.map(content => this.enrichContentWithMetadata(content))
        );
        
        // Filter by quality
        const qualityContent = enrichedContent.filter(content => this.validateContentQuality(content));

        console.log(`Successfully processed ${qualityContent.length}/${titles.length} titles in ${Date.now() - startTime}ms with optimization`);
        
        // If we got some results but not all, that's still a partial success
        if (qualityContent.length === 0 && titles.length > 0) {
          throw new ContentProcessingError(
            'No valid content found after processing all suggestions',
            titles.join(', '),
            false
          );
        }
        
        return qualityContent;
      },
      'convertAISuggestionsToTMDB',
      {
        operation: 'convertAISuggestionsToTMDB',
        titles,
        partialResults: [], // Could be populated with any successful results
        retryFunction: () => performanceOptimizationService.optimizedContentSearch(titles)
      }
    );
  }

  /**
   * Search and validate individual content with intelligent type detection
   */
  async searchAndValidateContent(title: string, type?: 'movie' | 'tv'): Promise<ContentItem | null> {
    const cacheKey = `${title}_${type || 'auto'}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result.content;
    }

    const startTime = Date.now();
    
    try {
      let content: ContentItem | null = null;

      if (type) {
        // Search for specific type
        content = await this.searchSpecificType(title, type);
      } else {
        // Intelligent type detection and search
        content = await this.searchWithTypeDetection(title);
      }

      if (content) {
        // Enrich content with additional metadata
        content = await this.enrichContentWithMetadata(content);
        
        // Validate content quality
        if (!this.validateContentQuality(content)) {
          console.warn(`Content "${title}" failed quality validation`);
          content = null;
        }
      }

      const result: ProcessingResult = {
        content,
        title,
        success: content !== null,
        error: content ? undefined : 'Content not found or failed validation',
        processingTime: Date.now() - startTime
      };

      // Cache the result
      this.cache.set(cacheKey, { result, timestamp: Date.now() });

      return content;
    } catch (error) {
      console.error(`Error searching for content "${title}":`, error);
      
      const result: ProcessingResult = {
        content: null,
        title,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };

      this.cache.set(cacheKey, { result, timestamp: Date.now() });
      return null;
    }
  }

  /**
   * Process multiple titles concurrently with optimized rate limiting and batching
   */
  async batchProcessTitles(titles: string[]): Promise<BatchProcessingResult> {
    // const startTime = Date.now(); // Currently not used but kept for future performance tracking
    const uniqueTitles = [...new Set(titles)]; // Remove duplicates
    
    console.log(`Optimized batch processing ${uniqueTitles.length} unique titles`);

    // Create batch requests for the performance optimization service
    const batchRequests = uniqueTitles.map(title => ({
      id: `process_${title}`,
      request: async () => {
        const result = await this.processWithRetry(title);
        return result;
      }
    }));

    // Use performance optimization service for intelligent batching
    const batchResult = await performanceOptimizationService.batchTMDBRequests(
      batchRequests,
      { priority: 'high' }
    );

    // Convert optimization service results to our format
    const results: ProcessingResult[] = batchResult.results.map((result, index) => {
      if (result) {
        return result as ProcessingResult;
      } else {
        return {
          content: null,
          title: uniqueTitles[index] || 'Unknown',
          success: false,
          error: 'Processing failed',
          processingTime: 0
        };
      }
    });

    const successCount = batchResult.successCount;
    const failureCount = batchResult.failureCount;
    const totalProcessingTime = batchResult.totalTime;
    const successRate = results.length > 0 ? successCount / results.length : 0;

    console.log(`Optimized batch processing completed: ${successCount} successes, ${failureCount} failures in ${totalProcessingTime}ms`);

    return {
      results,
      successCount,
      failureCount,
      totalProcessingTime,
      successRate
    };
  }

  /**
   * Enrich content with additional metadata and streaming information
   */
  async enrichContentWithMetadata(content: ContentItem): Promise<ContentItem> {
    try {
      // Get detailed information if not already present
      if (!content.imdb_id) {
        const externalIds = await tmdbService.getExternalIds(content.tmdb_id, content.type);
        if (externalIds?.imdb_id) {
          content.imdb_id = externalIds.imdb_id;
          // Update streaming URL with IMDB ID
          content.streamUrl = tmdbService.getStreamingUrl(externalIds.imdb_id, content.type);
        }
      }

      // Ensure streaming URL is properly set
      if (!content.streamUrl) {
        const id = content.imdb_id || content.tmdb_id;
        content.streamUrl = tmdbService.getStreamingUrl(id, content.type);
      }

      // Add additional quality indicators
      const enrichedContent = {
        ...content,
        qualityScore: this.calculateQualityScore(content),
        isHighQuality: content.rating >= 7.0 && content.voteCount >= 100,
        isPopular: content.popularity >= 10,
        hasValidPoster: !!(content.poster && !content.poster.includes('null')),
        hasValidBackdrop: !!(content.backdropPath && !content.backdropPath.includes('null'))
      };

      return enrichedContent;
    } catch (error) {
      console.warn(`Failed to enrich content metadata for "${content.title}":`, error);
      return content;
    }
  }

  /**
   * Search for content with intelligent type detection
   */
  private async searchWithTypeDetection(title: string): Promise<ContentItem | null> {
    try {
      // First, try multi-search to get the best match
      const searchResult = await tmdbService.search(title, { type: 'all' }, 1, 5);
      
      if (searchResult.results.length === 0) {
        return this.config.enableFallbackSearch ? await this.fallbackSearch(title) : null;
      }

      // Find the best match using intelligent scoring
      const bestMatch = this.findBestMatch(title, searchResult.results);
      
      if (bestMatch) {
        // Get detailed information for the best match
        const detailedContent = await tmdbService.getDetails(bestMatch.tmdb_id, bestMatch.type);
        return detailedContent;
      }

      return null;
    } catch (error) {
      console.error(`Error in type detection search for "${title}":`, error);
      throw new TMDBServiceError(`Type detection search failed for "${title}"`, 'search/multi');
    }
  }

  /**
   * Search for specific content type
   */
  private async searchSpecificType(title: string, type: 'movie' | 'tv'): Promise<ContentItem | null> {
    try {
      const searchResult = await tmdbService.search(title, { type }, 1, 3);
      
      if (searchResult.results.length === 0) {
        return this.config.enableFallbackSearch ? await this.fallbackSearch(title, type) : null;
      }

      const bestMatch = this.findBestMatch(title, searchResult.results);
      
      if (bestMatch) {
        const detailedContent = await tmdbService.getDetails(bestMatch.tmdb_id, bestMatch.type);
        return detailedContent;
      }

      return null;
    } catch (error) {
      console.error(`Error in specific type search for "${title}" (${type}):`, error);
      throw new TMDBServiceError(`Specific type search failed for "${title}"`, `search/${type}`);
    }
  }

  /**
   * Fallback search with alternative strategies
   */
  private async fallbackSearch(title: string, preferredType?: 'movie' | 'tv'): Promise<ContentItem | null> {
    console.log(`Attempting fallback search for "${title}"`);

    try {
      // Try different search variations
      const searchVariations = this.generateSearchVariations(title);
      
      for (const variation of searchVariations) {
        const searchResult = await tmdbService.search(variation, { type: 'all' }, 1, 3);
        
        if (searchResult.results.length > 0) {
          const bestMatch = this.findBestMatch(title, searchResult.results, preferredType);
          
          if (bestMatch) {
            console.log(`Fallback search successful: found "${bestMatch.title}" for "${title}"`);
            return await tmdbService.getDetails(bestMatch.tmdb_id, bestMatch.type);
          }
        }
      }

      console.log(`All fallback searches failed for "${title}"`);
      return null;
    } catch (error) {
      console.error(`Fallback search failed for "${title}":`, error);
      return null;
    }
  }

  /**
   * Generate search variations for fallback searches
   */
  private generateSearchVariations(title: string): string[] {
    const variations: string[] = [title];
    
    // Remove common prefixes/suffixes
    const cleanTitle = title
      .replace(/^(The|A|An)\s+/i, '')
      .replace(/\s+(Movie|Film|Series|Show)$/i, '')
      .replace(/\s*\(\d{4}\)$/, '') // Remove year
      .replace(/\s*:\s*.*$/, '') // Remove subtitle after colon
      .trim();
    
    if (cleanTitle !== title) {
      variations.push(cleanTitle);
    }

    // Add original title with "The" prefix if not present
    if (!title.toLowerCase().startsWith('the ')) {
      variations.push(`The ${title}`);
    }

    // Try without special characters
    const alphanumericTitle = title.replace(/[^\w\s]/g, '').trim();
    if (alphanumericTitle !== title && alphanumericTitle.length > 0) {
      variations.push(alphanumericTitle);
    }

    return variations;
  }

  /**
   * Find the best match from search results using intelligent scoring
   */
  private findBestMatch(
    originalTitle: string, 
    results: ContentItem[], 
    preferredType?: 'movie' | 'tv'
  ): ContentItem | null {
    if (results.length === 0) return null;
    if (results.length === 1) return results[0] || null;

    // Score each result
    const scoredResults = results.map(item => ({
      item,
      score: this.calculateMatchScore(originalTitle, item, preferredType)
    }));

    // Sort by score (highest first)
    scoredResults.sort((a, b) => b.score - a.score);

    // Return the best match if it meets minimum threshold
    const bestMatch = scoredResults[0];
    const minScore = 0.3; // Minimum similarity threshold

    if (bestMatch && bestMatch.score >= minScore) {
      return bestMatch.item;
    }

    console.warn(`No good match found for "${originalTitle}". Best score: ${bestMatch?.score || 0}`);
    return null;
  }

  /**
   * Calculate match score for content item
   */
  private calculateMatchScore(
    originalTitle: string, 
    item: ContentItem, 
    preferredType?: 'movie' | 'tv'
  ): number {
    let score = 0;

    // Title similarity (most important factor)
    const titleSimilarity = this.calculateStringSimilarity(
      originalTitle.toLowerCase(),
      item.title.toLowerCase()
    );
    score += titleSimilarity * 0.6;

    // Original title similarity (if available)
    if (item.originalTitle) {
      const originalSimilarity = this.calculateStringSimilarity(
        originalTitle.toLowerCase(),
        item.originalTitle.toLowerCase()
      );
      score += originalSimilarity * 0.2;
    }

    // Type preference bonus
    if (preferredType && item.type === preferredType) {
      score += 0.1;
    }

    // Quality indicators
    if (item.rating >= 7.0) score += 0.05;
    if (item.voteCount >= 100) score += 0.03;
    if (item.popularity >= 10) score += 0.02;

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0]![i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j]![0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j]![i] = Math.min(
          matrix[j]![i - 1] + 1,     // deletion
          matrix[j - 1]![i] + 1,     // insertion
          matrix[j - 1]![i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length]![str1.length];
  }

  /**
   * Validate content quality based on configuration
   */
  private validateContentQuality(content: ContentItem): boolean {
    // Check minimum rating requirement
    if (content.rating < this.config.minContentQuality) {
      return false;
    }

    // Check for essential fields
    if (!content.title || content.title.trim().length === 0) {
      return false;
    }

    // Check for adult content (optional filter)
    if (content.isAdult) {
      return false; // Skip adult content for general recommendations
    }

    return true;
  }

  /**
   * Calculate overall quality score for content
   */
  private calculateQualityScore(content: ContentItem): number {
    let score = 0;

    // Rating contribution (0-40 points)
    score += Math.min(content.rating * 4, 40);

    // Vote count contribution (0-20 points)
    const voteScore = Math.min(Math.log10(content.voteCount + 1) * 5, 20);
    score += voteScore;

    // Popularity contribution (0-20 points)
    const popularityScore = Math.min(Math.log10(content.popularity + 1) * 4, 20);
    score += popularityScore;

    // Completeness bonus (0-20 points)
    let completenessScore = 0;
    if (content.poster && !content.poster.includes('null')) completenessScore += 5;
    if (content.backdropPath && !content.backdropPath.includes('null')) completenessScore += 5;
    if (content.overview && content.overview.length > 50) completenessScore += 5;
    if (content.genres && content.genres.length > 0) completenessScore += 5;
    score += completenessScore;

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Process title with retry logic
   */
  private async processWithRetry(title: string): Promise<ProcessingResult> {
    const cacheKey = `retry_${title}`;
    
    // Check if already processing
    if (this.processingQueue.has(cacheKey)) {
      return await this.processingQueue.get(cacheKey)!;
    }

    const processPromise = this.executeWithRetry(title);
    this.processingQueue.set(cacheKey, processPromise);

    try {
      const result = await processPromise;
      return result;
    } finally {
      this.processingQueue.delete(cacheKey);
    }
  }

  /**
   * Execute search with retry logic
   */
  private async executeWithRetry(title: string): Promise<ProcessingResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const content = await this.searchAndValidateContent(title);
        
        return {
          content,
          title,
          success: content !== null,
          error: content ? undefined : 'Content not found',
          processingTime: 0 // Will be set by searchAndValidateContent
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.config.retryAttempts) {
          console.log(`Retry ${attempt + 1}/${this.config.retryAttempts} for "${title}" after error:`, error);
          await this.delay(this.config.retryDelay * (attempt + 1)); // Exponential backoff
        }
      }
    }

    return {
      content: null,
      title,
      success: false,
      error: lastError?.message || 'Unknown error after retries',
      processingTime: 0
    };
  }

  /**
   * Utility method to chunk array into smaller arrays
   */
  // Utility method to chunk array - currently not used but kept for future batch processing optimization
  /* private _chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  } */

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear processing cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Content processing cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // Would need to track hits/misses to calculate
    };
  }

  /**
   * Update processing configuration
   */
  updateConfig(newConfig: Partial<ProcessingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Content processing configuration updated:', this.config);
  }
}

// Export singleton instance
export const contentProcessingEngine = new ContentProcessingEngine();
export default contentProcessingEngine;