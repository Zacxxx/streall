import { ContentItem } from './tmdb-service';
import { tmdbService } from './tmdb-service';

// Interface for Netflix Card compatible content
export interface NetflixCardContent {
  id: string;
  imdb_id: string;
  title: string;
  year?: number | null;
  rating?: number;
  genres?: string[];
  poster?: string;
  backdropPath?: string;
  overview: string;
  type: 'movie' | 'tv' | 'anime';
  runtime?: number | null;
  tmdb_rating?: number;
  seasons?: number;
  episodes?: number;
  tmdb_id?: number; // Add TMDB ID for proper routing
}

// Interface for streaming URL generation options
export interface StreamingUrlOptions {
  season?: number;
  episode?: number;
  preferImdbId?: boolean;
}

// Interface for content validation result
export interface ValidationResult {
  isValid: boolean;
  completeness: number; // 0-100 percentage
  missingFields: string[];
  qualityScore: number; // 0-100 overall quality score
  warnings: string[];
}

// Interface for content enrichment options
export interface EnrichmentOptions {
  includeExternalIds?: boolean;
  includeStreamingUrls?: boolean;
  includeSeasonUrls?: boolean;
  validateQuality?: boolean;
}

// Error class for content mapping errors
export class ContentMappingError extends Error {
  constructor(message: string, public contentId: string | number, public operation: string) {
    super(message);
    this.name = 'ContentMappingError';
  }
}

export class SmartContentMapper {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  /**
   * Convert TMDB content to Netflix Card compatible format
   */
  tmdbToNetflixCard(tmdbContent: ContentItem): NetflixCardContent {
    try {
      // Ensure we have a valid IMDB ID
      const imdbId = this.ensureValidImdbId(tmdbContent.imdb_id, tmdbContent.tmdb_id);
      
      // Map the content with proper field transformations
      const netflixCard: NetflixCardContent = {
        id: tmdbContent.tmdb_id.toString(), // Always use TMDB ID as primary ID for consistency
        imdb_id: imdbId,
        title: tmdbContent.title || 'Unknown Title',
        year: tmdbContent.year,
        rating: tmdbContent.rating || 0,
        genres: tmdbContent.genres || [],
        poster: this.normalizePosterUrl(tmdbContent.poster),
        backdropPath: this.normalizeBackdropUrl(tmdbContent.backdropPath),
        overview: tmdbContent.overview || '',
        type: tmdbContent.type,
        runtime: tmdbContent.runtime,
        tmdb_rating: tmdbContent.rating,
        seasons: tmdbContent.seasons || undefined,
        episodes: tmdbContent.episodes || undefined,
        tmdb_id: tmdbContent.tmdb_id // Always include TMDB ID for proper routing
      };

      return netflixCard;
    } catch (error) {
      console.error('Error converting TMDB content to Netflix card format:', error);
      throw new ContentMappingError(
        `Failed to convert content to Netflix card format: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tmdbContent.tmdb_id,
        'tmdbToNetflixCard'
      );
    }
  }

  /**
   * Generate streaming URL with proper TMDB/IMDB ID handling
   */
  tmdbToStreamingUrl(tmdbContent: ContentItem, options: StreamingUrlOptions = {}): string {
    try {
      const { season, episode, preferImdbId = true } = options;
      
      // Determine the best ID to use for streaming
      let streamingId: string | number;
      
      // Use IMDB ID for streaming when available and valid (for better compatibility with SuperEmbed)
      if (preferImdbId && tmdbContent.imdb_id && tmdbContent.imdb_id.startsWith('tt')) {
        // Use IMDB ID when it's a valid IMDB ID (starts with 'tt')
        streamingId = tmdbContent.imdb_id;
      } else {
        // Use TMDB ID as fallback for consistent routing
        streamingId = tmdbContent.tmdb_id;
      }

      // Generate the appropriate streaming URL
      const contentType = tmdbContent.type;
      return tmdbService.getStreamingUrl(streamingId, contentType, season, episode);
    } catch (error) {
      console.error('Error generating streaming URL:', error);
      throw new ContentMappingError(
        `Failed to generate streaming URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tmdbContent.tmdb_id,
        'tmdbToStreamingUrl'
      );
    }
  }

  /**
   * Validate content completeness and quality
   */
  validateContentCompleteness(content: ContentItem): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      completeness: 0,
      missingFields: [],
      qualityScore: 0,
      warnings: []
    };

    // Define required and optional fields
    const requiredFields = ['id', 'tmdb_id', 'title', 'type'];
    const importantFields = ['poster', 'overview', 'rating', 'releaseDate'];
    const optionalFields = ['backdropPath', 'genres', 'imdb_id', 'runtime'];

    let totalFields = requiredFields.length + importantFields.length + optionalFields.length;
    let presentFields = 0;

    // Check required fields
    for (const field of requiredFields) {
      if (this.hasValidValue(content, field)) {
        presentFields++;
      } else {
        result.missingFields.push(field);
        result.isValid = false;
      }
    }

    // Check important fields
    for (const field of importantFields) {
      if (this.hasValidValue(content, field)) {
        presentFields++;
      } else {
        result.missingFields.push(field);
        result.warnings.push(`Missing important field: ${field}`);
      }
    }

    // Check optional fields
    for (const field of optionalFields) {
      if (this.hasValidValue(content, field)) {
        presentFields++;
      }
    }

    // Calculate completeness percentage
    result.completeness = Math.round((presentFields / totalFields) * 100);

    // Calculate quality score
    result.qualityScore = this.calculateContentQualityScore(content);

    // Additional validation checks
    this.performAdditionalValidation(content, result);

    return result;
  }

  /**
   * Enrich content with additional metadata and streaming data
   */
  async enrichWithStreamingData(content: ContentItem, options: EnrichmentOptions = {}): Promise<ContentItem> {
    const cacheKey = `enrich_${content.tmdb_id}_${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      let enrichedContent = { ...content };

      // Get external IDs if requested and not present
      if (options.includeExternalIds && !enrichedContent.imdb_id) {
        try {
          const contentType = content.type;
          const externalIds = await tmdbService.getExternalIds(content.tmdb_id, contentType);
          if (externalIds?.imdb_id) {
            enrichedContent.imdb_id = externalIds.imdb_id;
          }
        } catch (error) {
          console.warn(`Failed to fetch external IDs for ${content.title}:`, error);
        }
      }

      // Generate streaming URLs if requested
      if (options.includeStreamingUrls) {
        const streamingId = enrichedContent.imdb_id || enrichedContent.tmdb_id;
        const contentType = enrichedContent.type;
        enrichedContent.streamUrl = tmdbService.getStreamingUrl(streamingId, contentType);
      }

      // Generate season URLs for TV shows if requested
      if (options.includeSeasonUrls && enrichedContent.type === 'tv' && enrichedContent.seasons) {
        const streamingId = enrichedContent.imdb_id || enrichedContent.tmdb_id;
        const seasonUrls = Array.from({ length: enrichedContent.seasons }, (_, i) => ({
          season: i + 1,
          url: tmdbService.getStreamingUrl(streamingId, 'tv', i + 1)
        }));
        
        // Add season URLs as additional property
        (enrichedContent as any).seasonUrls = seasonUrls;
      }

      // Validate quality if requested
      if (options.validateQuality) {
        const validation = this.validateContentCompleteness(enrichedContent);
        (enrichedContent as any).validationResult = validation;
      }

      // Normalize image URLs
      enrichedContent.poster = this.normalizePosterUrl(enrichedContent.poster);
      enrichedContent.backdropPath = this.normalizeBackdropUrl(enrichedContent.backdropPath);

      // Cache the enriched content
      this.cache.set(cacheKey, { data: enrichedContent, timestamp: Date.now() });

      return enrichedContent;
    } catch (error) {
      console.error(`Error enriching content ${content.title}:`, error);
      throw new ContentMappingError(
        `Failed to enrich content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        content.tmdb_id,
        'enrichWithStreamingData'
      );
    }
  }

  /**
   * Batch convert multiple TMDB items to Netflix card format
   */
  batchTmdbToNetflixCard(tmdbContents: ContentItem[]): NetflixCardContent[] {
    const results: NetflixCardContent[] = [];
    const errors: { content: ContentItem; error: Error }[] = [];

    for (const content of tmdbContents) {
      try {
        const netflixCard = this.tmdbToNetflixCard(content);
        results.push(netflixCard);
      } catch (error) {
        console.error(`Failed to convert content ${content.title}:`, error);
        errors.push({ content, error: error as Error });
      }
    }

    if (errors.length > 0) {
      console.warn(`Failed to convert ${errors.length}/${tmdbContents.length} content items`);
    }

    return results;
  }

  /**
   * Generate streaming URL by content ID and type with proper routing
   */
  generateStreamingUrlById(id: string | number, type: 'movie' | 'tv', options: StreamingUrlOptions = {}): string {
    const { season, episode } = options;
    
    // Ensure consistent ID handling with proper type detection
    let streamingId = id;
    
    // Handle different ID formats
    if (typeof id === 'string') {
      if (id.startsWith('tmdb_')) {
        // Convert tmdb_ prefix to numeric ID
        streamingId = parseInt(id.replace('tmdb_', ''));
      } else if (id.startsWith('tt')) {
        // Valid IMDB ID, use as is for better streaming compatibility
        streamingId = id;
      } else if (!isNaN(parseInt(id))) {
        // Numeric string, convert to number for TMDB ID
        streamingId = parseInt(id);
      }
    }
    
    return tmdbService.getStreamingUrl(streamingId, type, season, episode);
  }

  /**
   * Normalize and validate IMDB ID format
   */
  private ensureValidImdbId(imdbId?: string, tmdbId?: number): string {
    if (imdbId && imdbId !== 'null' && imdbId !== 'undefined') {
      // Ensure IMDB ID has proper format
      if (imdbId.startsWith('tt')) {
        return imdbId;
      } else if (/^\d+$/.test(imdbId)) {
        return `tt${imdbId}`;
      }
    }
    
    // Fallback to TMDB ID if no valid IMDB ID
    return tmdbId ? `tmdb_${tmdbId}` : 'unknown';
  }

  /**
   * Normalize poster URL with fallback handling
   */
  private normalizePosterUrl(posterPath?: string | null): string | undefined {
    if (!posterPath || posterPath === 'null' || posterPath === 'n/a') {
      return undefined;
    }
    
    // If it's already a full URL, return as is
    if (posterPath.startsWith('http')) {
      return posterPath;
    }
    
    // If it's a TMDB path, it should already be processed by tmdbService
    return posterPath;
  }

  /**
   * Normalize backdrop URL with fallback handling
   */
  private normalizeBackdropUrl(backdropPath?: string | null): string | undefined {
    if (!backdropPath || backdropPath === 'null' || backdropPath === 'n/a') {
      return undefined;
    }
    
    // If it's already a full URL, return as is
    if (backdropPath.startsWith('http')) {
      return backdropPath;
    }
    
    // If it's a TMDB path, it should already be processed by tmdbService
    return backdropPath;
  }

  /**
   * Check if a field has a valid value
   */
  private hasValidValue(content: any, field: string): boolean {
    const value = content[field];
    
    if (value === null || value === undefined) {
      return false;
    }
    
    if (typeof value === 'string') {
      return value.trim().length > 0 && value !== 'null' && value !== 'n/a';
    }
    
    if (typeof value === 'number') {
      return !isNaN(value) && isFinite(value);
    }
    
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    
    return true;
  }

  /**
   * Calculate content quality score based on various factors
   */
  private calculateContentQualityScore(content: ContentItem): number {
    let score = 0;

    // Rating contribution (0-30 points)
    if (content.rating > 0) {
      score += Math.min(content.rating * 3, 30);
    }

    // Vote count contribution (0-20 points)
    if (content.voteCount > 0) {
      const voteScore = Math.min(Math.log10(content.voteCount + 1) * 5, 20);
      score += voteScore;
    }

    // Popularity contribution (0-15 points)
    if (content.popularity > 0) {
      const popularityScore = Math.min(Math.log10(content.popularity + 1) * 3, 15);
      score += popularityScore;
    }

    // Completeness contribution (0-25 points)
    let completenessScore = 0;
    if (this.hasValidValue(content, 'poster')) completenessScore += 6;
    if (this.hasValidValue(content, 'backdropPath')) completenessScore += 4;
    if (this.hasValidValue(content, 'overview') && content.overview.length > 50) completenessScore += 6;
    if (this.hasValidValue(content, 'genres') && content.genres.length > 0) completenessScore += 4;
    if (this.hasValidValue(content, 'imdb_id')) completenessScore += 5;
    score += completenessScore;

    // Recency bonus (0-10 points)
    if (content.releaseDate) {
      const releaseYear = new Date(content.releaseDate).getFullYear();
      const currentYear = new Date().getFullYear();
      const yearDiff = currentYear - releaseYear;
      
      if (yearDiff <= 5) {
        score += Math.max(10 - yearDiff * 2, 0);
      }
    }

    return Math.min(Math.round(score), 100);
  }

  /**
   * Perform additional validation checks
   */
  private performAdditionalValidation(content: ContentItem, result: ValidationResult): void {
    // Check for adult content
    if (content.isAdult) {
      result.warnings.push('Content is marked as adult');
    }

    // Check rating validity
    if (content.rating < 0 || content.rating > 10) {
      result.warnings.push('Rating is outside valid range (0-10)');
    }

    // Check for very low ratings
    if (content.rating > 0 && content.rating < 3) {
      result.warnings.push('Content has very low rating');
    }

    // Check for insufficient vote count
    if (content.voteCount < 10) {
      result.warnings.push('Content has very few votes');
    }

    // Check title length
    if (content.title.length < 2) {
      result.warnings.push('Title is too short');
    }

    // Check overview length
    if (content.overview && content.overview.length < 20) {
      result.warnings.push('Overview is too short');
    }

    // Check for missing IMDB ID
    if (!content.imdb_id) {
      result.warnings.push('Missing IMDB ID - streaming may not work properly');
    }

    // TV-specific checks
    if (content.type === 'tv') {
      if (!content.seasons || content.seasons === 0) {
        result.warnings.push('TV show missing season information');
      }
    }

    // Movie-specific checks
    if (content.type === 'movie') {
      if (!content.runtime || content.runtime === 0) {
        result.warnings.push('Movie missing runtime information');
      }
    }
  }

  /**
   * Clear the internal cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxAge: number } {
    return {
      size: this.cache.size,
      maxAge: this.CACHE_DURATION
    };
  }
}

// Export singleton instance
export const smartContentMapper = new SmartContentMapper();
export default smartContentMapper;
