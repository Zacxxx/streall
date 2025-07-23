// Comprehensive Error Handling Service for AI Suggestions Enhancement
// Implements Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6

import { ContentItem } from './tmdb-service';

// Base error class for all suggestion-related errors
export class SuggestionsError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true,
    public userMessage?: string,
    public retryable?: boolean,
    public cause?: Error
  ) {
    super(message);
    this.name = 'SuggestionsError';
    this.cause = cause;
  }
}

// Specific error types for different failure scenarios
export class AIServiceError extends SuggestionsError {
  constructor(
    message: string,
    public aiProvider: string,
    public endpoint?: string,
    cause?: Error
  ) {
    super(
      message,
      'AI_SERVICE_ERROR',
      true,
      'AI service is temporarily unavailable. Using fallback recommendations.',
      true,
      cause
    );
    this.name = 'AIServiceError';
  }
}

export class TMDBServiceError extends SuggestionsError {
  constructor(
    message: string,
    public endpoint: string,
    public statusCode?: number,
    cause?: Error
  ) {
    super(
      message,
      'TMDB_SERVICE_ERROR',
      true,
      'Content search is temporarily unavailable. Showing cached recommendations.',
      true,
      cause
    );
    this.name = 'TMDBServiceError';
  }
}

export class ContentProcessingError extends SuggestionsError {
  constructor(
    message: string,
    public contentTitle: string,
    public processingStage: string,
    cause?: Error
  ) {
    super(
      message,
      'CONTENT_PROCESSING_ERROR',
      false,
      'Some content could not be processed. Showing available recommendations.',
      false,
      cause
    );
    this.name = 'ContentProcessingError';
  }
}

export class CacheServiceError extends SuggestionsError {
  constructor(
    message: string,
    public cacheKey: string,
    cause?: Error
  ) {
    super(
      message,
      'CACHE_SERVICE_ERROR',
      true,
      'Cache temporarily unavailable. Content may load slower.',
      false,
      cause
    );
    this.name = 'CacheServiceError';
  }
}

export class NetworkError extends SuggestionsError {
  constructor(
    message: string,
    public url: string,
    public statusCode?: number,
    cause?: Error
  ) {
    super(
      message,
      'NETWORK_ERROR',
      true,
      'Network connection issue. Please check your internet connection.',
      true,
      cause
    );
    this.name = 'NetworkError';
  }
}

// Error recovery strategies
export interface RecoveryStrategy {
  name: string;
  canRecover: (error: Error) => boolean;
  recover: (error: Error, context?: any) => Promise<any>;
  priority: number; // Lower number = higher priority
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: string[]; // Error codes that should be retried
}

// Error context for better debugging and recovery
export interface ErrorContext {
  operation: string;
  timestamp: Date;
  userAgent?: string;
  sessionId?: string;
  additionalData?: Record<string, any>;
}

// User-friendly error messages mapping
const USER_ERROR_MESSAGES: Record<string, string> = {
  AI_SERVICE_ERROR: 'Our AI recommendation service is temporarily unavailable. We\'re showing you curated selections instead.',
  TMDB_SERVICE_ERROR: 'Content search is experiencing issues. We\'re showing you cached recommendations.',
  CONTENT_PROCESSING_ERROR: 'Some content couldn\'t be loaded. We\'re showing you the available recommendations.',
  CACHE_SERVICE_ERROR: 'Content may load a bit slower than usual.',
  NETWORK_ERROR: 'Please check your internet connection and try again.',
  RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment and try again.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
};

export class ErrorHandlingService {
  private recoveryStrategies: RecoveryStrategy[] = [];
  private errorHistory: Map<string, { count: number; lastOccurrence: Date }> = new Map();
  private retryConfig: RetryConfig;

  constructor(retryConfig?: Partial<RetryConfig>) {
    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: ['AI_SERVICE_ERROR', 'TMDB_SERVICE_ERROR', 'NETWORK_ERROR', 'TIMEOUT_ERROR'],
      ...retryConfig
    };

    this.initializeRecoveryStrategies();
  }

  /**
   * Initialize built-in recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    // AI Service fallback strategy
    this.addRecoveryStrategy({
      name: 'ai-service-fallback',
      priority: 1,
      canRecover: (error) => error instanceof AIServiceError,
      recover: async (_error: Error, context) => {
        // const aiError = error as AIServiceError; // Currently not used but kept for future error handling
        console.log('Applying AI service fallback strategy');
        
        if (context?.operation === 'generateDailyCurator') {
          return this.getFallbackDailyCurator();
        } else if (context?.operation === 'processUserRequest') {
          return this.getFallbackChatResponse(context.userMessage || '');
        }
        
        throw _error;
      }
    });

    // TMDB Service fallback strategy
    this.addRecoveryStrategy({
      name: 'tmdb-service-fallback',
      priority: 2,
      canRecover: (error) => error instanceof TMDBServiceError,
      recover: async (_error: Error, context) => {
        console.log('Applying TMDB service fallback strategy');
        
        // Try to use cached content first
        if (context?.cachedContent && context.cachedContent.length > 0) {
          return context.cachedContent;
        }
        
        // Use predefined fallback content
        return this.getFallbackTMDBContent(context?.theme || 'general');
      }
    });

    // Content processing fallback strategy
    this.addRecoveryStrategy({
      name: 'content-processing-fallback',
      priority: 3,
      canRecover: (error) => error instanceof ContentProcessingError,
      recover: async (_error: Error, context) => {
        console.log('Applying content processing fallback strategy');
        
        // Return partial results if available
        if (context?.partialResults && context.partialResults.length > 0) {
          return context.partialResults;
        }
        
        // Use generic fallback content
        return this.getFallbackTMDBContent('popular');
      }
    });

    // Network error retry strategy
    this.addRecoveryStrategy({
      name: 'network-retry',
      priority: 4,
      canRecover: (error) => error instanceof NetworkError,
      recover: async (error: Error, context) => {
        console.log('Applying network retry strategy');
        
        if (context?.retryFunction && context.retryAttempt < this.retryConfig.maxAttempts) {
          const delay = this.calculateRetryDelay(context.retryAttempt);
          await this.delay(delay);
          return context.retryFunction();
        }
        
        throw error;
      }
    });
  }

  /**
   * Add a custom recovery strategy
   */
  addRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
    this.recoveryStrategies.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Handle error with automatic recovery attempts
   */
  async handleError(
    error: Error,
    context?: ErrorContext & Record<string, any>
  ): Promise<{ recovered: boolean; result?: any; finalError?: Error }> {
    console.error('Error handling service processing error:', error);
    
    // Track error occurrence
    this.trackError(error);
    
    // Normalize error to SuggestionsError if needed
    const normalizedError = this.normalizeError(error);
    
    // Try recovery strategies
    for (const strategy of this.recoveryStrategies) {
      if (strategy.canRecover(normalizedError)) {
        try {
          console.log(`Attempting recovery with strategy: ${strategy.name}`);
          const result = await strategy.recover(normalizedError, context);
          
          console.log(`Recovery successful with strategy: ${strategy.name}`);
          return { recovered: true, result };
        } catch (recoveryError) {
          console.warn(`Recovery strategy ${strategy.name} failed:`, recoveryError);
          continue;
        }
      }
    }
    
    // No recovery possible
    console.error('All recovery strategies failed for error:', normalizedError);
    return { recovered: false, finalError: normalizedError };
  }

  /**
   * Execute operation with automatic retry and error handling
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const normalizedError = this.normalizeError(lastError);
        
        // Check if error is retryable
        if (!this.isRetryableError(normalizedError) || attempt === this.retryConfig.maxAttempts - 1) {
          break;
        }
        
        console.log(`Retry ${attempt + 1}/${this.retryConfig.maxAttempts} for ${operationName} after error:`, normalizedError.message);
        
        const delay = this.calculateRetryDelay(attempt);
        await this.delay(delay);
      }
    }
    
    // All retries failed, try recovery
    const recoveryResult = await this.handleError(lastError!, {
      operation: operationName,
      timestamp: new Date(),
      retryAttempt: this.retryConfig.maxAttempts,
      ...context
    });
    
    if (recoveryResult.recovered) {
      return recoveryResult.result;
    }
    
    throw recoveryResult.finalError || lastError;
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: Error): string {
    const normalizedError = this.normalizeError(error);
    
    if (normalizedError instanceof SuggestionsError && normalizedError.userMessage) {
      return normalizedError.userMessage;
    }
    
    return USER_ERROR_MESSAGES[normalizedError.name] || 
           USER_ERROR_MESSAGES['UNKNOWN_ERROR'] || 'An unexpected error occurred';
  }

  /**
   * Check if error should trigger a retry
   */
  isRetryableError(error: Error): boolean {
    const normalizedError = this.normalizeError(error);
    
    if (normalizedError instanceof SuggestionsError) {
      return normalizedError.retryable === true;
    }
    
    return this.retryConfig.retryableErrors.includes((normalizedError as any).name || 'UNKNOWN_ERROR');
  }

  /**
   * Normalize any error to SuggestionsError
   */
  private normalizeError(error: Error): SuggestionsError {
    if (error instanceof SuggestionsError) {
      return error;
    }
    
    // Check for specific error patterns
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new NetworkError(error.message, 'unknown', undefined, error);
    }
    
    if (error.message.includes('timeout')) {
      return new SuggestionsError(
        error.message,
        'TIMEOUT_ERROR',
        true,
        'Request timed out. Please try again.',
        true,
        error
      );
    }
    
    if (error.message.includes('rate limit')) {
      return new SuggestionsError(
        error.message,
        'RATE_LIMIT_ERROR',
        true,
        'Too many requests. Please wait a moment and try again.',
        true,
        error
      );
    }
    
    // Generic error
    return new SuggestionsError(
      error.message,
      'UNKNOWN_ERROR',
      false,
      'An unexpected error occurred. Please try again.',
      false,
      error
    );
  }

  /**
   * Track error occurrence for monitoring
   */
  private trackError(error: Error): void {
    const errorKey = `${error.name}:${error.message}`;
    const existing = this.errorHistory.get(errorKey);
    
    if (existing) {
      existing.count++;
      existing.lastOccurrence = new Date();
    } else {
      this.errorHistory.set(errorKey, {
        count: 1,
        lastOccurrence: new Date()
      });
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats(): { totalErrors: number; errorTypes: Record<string, number> } {
    const errorTypes: Record<string, number> = {};
    let totalErrors = 0;
    
    for (const [key, data] of this.errorHistory.entries()) {
      const errorType = key.split(':')[0];
      if (errorType) {
        errorTypes[errorType] = (errorTypes[errorType] || 0) + data.count;
      }
      totalErrors += data.count;
    }
    
    return { totalErrors, errorTypes };
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory.clear();
  }

  // Fallback content generators
  private async getFallbackDailyCurator(): Promise<any> {
    return {
      curator: {
        name: "Martin Scorsese",
        bio: "Legendary filmmaker and cinema historian known for his meticulous attention to detail and deep understanding of film history.",
        expertise: ["Crime Drama", "Character Studies", "Film History", "Neo-Noir", "Film Preservation"],
        description: "Legendary filmmaker and cinema preservation advocate"
      },
      theme: "Cinematic Masterpieces",
      reasoning: "Today calls for films that demonstrate the pure artistry of cinema through masterful storytelling and visual composition.",
      suggestedTitles: ["The Godfather", "Goodfellas", "Taxi Driver", "The Departed", "Casino", "The Wolf of Wall Street"],
      content: []
    };
  }

  private async getFallbackChatResponse(userMessage: string): Promise<any> {
    const lowerMessage = userMessage.toLowerCase();
    let responseText = "I understand you're looking for recommendations. ";
    let suggestedTitles: string[] = [];
    let detectedPreferences: any = {
      genres: [],
      excludedGenres: [],
      contentTypes: ['movie'],
      moods: [],
      themes: [],
      specificRequests: [],
      languages: []
    };
    
    if (lowerMessage.includes('action')) {
      responseText += "Here are some excellent action films that showcase exceptional choreography and storytelling.";
      suggestedTitles = ["Mad Max: Fury Road", "John Wick", "The Raid", "Baby Driver"];
      detectedPreferences.genres = ['action'];
      detectedPreferences.moods = ['energetic'];
    } else if (lowerMessage.includes('comedy')) {
      responseText += "These comedies blend humor with intelligence and heart.";
      suggestedTitles = ["The Grand Budapest Hotel", "Parasite", "Knives Out", "Hunt for the Wilderpeople"];
      detectedPreferences.genres = ['comedy'];
      detectedPreferences.moods = ['light-hearted'];
    } else if (lowerMessage.includes('horror')) {
      responseText += "These horror films prioritize psychological tension and artistic merit.";
      suggestedTitles = ["Hereditary", "The Witch", "Get Out", "Midsommar"];
      detectedPreferences.genres = ['horror'];
      detectedPreferences.moods = ['intense'];
    } else if (lowerMessage.includes('sci-fi') || lowerMessage.includes('science fiction')) {
      responseText += "These science fiction films explore complex themes and innovative storytelling.";
      suggestedTitles = ["Blade Runner 2049", "Arrival", "Ex Machina", "Interstellar"];
      detectedPreferences.genres = ['sci-fi'];
      detectedPreferences.moods = ['contemplative'];
    } else if (lowerMessage.includes('thought-provoking') || lowerMessage.includes('contemplative') || 
               (lowerMessage.includes('contemporary') && lowerMessage.includes('not horror'))) {
      responseText += "These films offer deep, contemplative experiences.";
      suggestedTitles = ["The Tree of Life", "Her", "Moonlight", "Manchester by the Sea"];
      detectedPreferences.moods = ['contemplative'];
      detectedPreferences.themes = ['philosophical'];
      if (lowerMessage.includes('international')) {
        detectedPreferences.languages = ['international'];
      }
    } else if (lowerMessage.includes('international') || lowerMessage.includes('foreign')) {
      responseText += "These international films showcase diverse storytelling traditions.";
      suggestedTitles = ["Parasite", "Roma", "Amélie", "The Handmaiden"];
      detectedPreferences.languages = ['international'];
      detectedPreferences.moods = ['contemplative'];
    } else {
      responseText += "Here are some critically acclaimed films across different genres.";
      suggestedTitles = ["The Godfather", "Pulp Fiction", "The Shawshank Redemption", "Goodfellas"];
      detectedPreferences.genres = ['drama'];
    }
    
    return {
      responseText,
      suggestedTitles,
      confidence: 0.6,
      content: [],
      detectedPreferences,
      conversationFlow: 'recommending',
      recommendationReasoning: 'Generated using fallback recommendations based on detected preferences'
    };
  }

  private async getFallbackTMDBContent(theme: string): Promise<ContentItem[]> {
    // Return empty array - actual fallback content would need to be implemented
    // with hardcoded popular content or cached data
    console.warn(`Fallback TMDB content requested for theme: ${theme}`);
    return [];
  }
}

// Export singleton instance
export const errorHandlingService = new ErrorHandlingService();
export default errorHandlingService;