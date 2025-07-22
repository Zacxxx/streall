import { ContentItem } from './tmdb-service';

// Enhanced Daily Selection Model
export interface EnhancedDailySelection {
  date: string;
  curator: {
    name: string;
    bio: string;
    expertise: string[];
    description: string;
    avatar?: string;
  };
  theme: {
    name: string;
    description: string;
    reasoning: string;
    tags: string[];
  };
  content: ContentItem[];
  metadata: {
    generatedAt: string;
    aiModel: string;
    contentSource: 'tmdb';
    quality: 'high' | 'medium' | 'low';
  };
}

// Enhanced Chat Message Model
export interface EnhancedChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  suggestions?: ContentItem[];
  metadata?: {
    processingTime: number;
    aiConfidence: number;
    tmdbMatches: number;
    fallbackUsed: boolean;
  };
  timestamp: Date;
  isLoading?: boolean;
}

// Cache entry wrapper with expiration
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Cache configuration
interface CacheConfig {
  dailySelectionTTL: number; // 24 hours in milliseconds
  chatResponseTTL: number;   // 1 hour in milliseconds
  tmdbContentTTL: number;    // 30 minutes in milliseconds
  cleanupInterval: number;   // Auto cleanup interval
}

/**
 * Enhanced Cache Service for AI suggestions system
 * Provides intelligent caching with time-based expiration and automatic cleanup
 */
export class EnhancedCacheService {
  private dailySelectionCache = new Map<string, CacheEntry<EnhancedDailySelection>>();
  private chatResponseCache = new Map<string, CacheEntry<EnhancedChatMessage>>();
  private tmdbContentCache = new Map<number, CacheEntry<ContentItem>>();
  
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      dailySelectionTTL: 24 * 60 * 60 * 1000, // 24 hours
      chatResponseTTL: 60 * 60 * 1000,        // 1 hour
      tmdbContentTTL: 30 * 60 * 1000,         // 30 minutes
      cleanupInterval: 15 * 60 * 1000,        // 15 minutes
      ...config
    };

    // Start automatic cleanup
    this.startAutomaticCleanup();
  }

  /**
   * Get daily selection from cache
   */
  getDailySelection(date: string): EnhancedDailySelection | null {
    const entry = this.dailySelectionCache.get(date);
    
    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.dailySelectionCache.delete(date);
      return null;
    }

    return entry.data;
  }

  /**
   * Store daily selection in cache
   */
  storeDailySelection(date: string, selection: EnhancedDailySelection): void {
    const entry: CacheEntry<EnhancedDailySelection> = {
      data: selection,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.dailySelectionTTL
    };

    this.dailySelectionCache.set(date, entry);
  }

  /**
   * Get chat response from cache using message hash
   */
  getChatResponse(messageHash: string): EnhancedChatMessage | null {
    const entry = this.chatResponseCache.get(messageHash);
    
    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.chatResponseCache.delete(messageHash);
      return null;
    }

    return entry.data;
  }

  /**
   * Store chat response in cache
   */
  storeChatResponse(messageHash: string, response: EnhancedChatMessage): void {
    const entry: CacheEntry<EnhancedChatMessage> = {
      data: response,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.chatResponseTTL
    };

    this.chatResponseCache.set(messageHash, entry);
  }

  /**
   * Get TMDB content from cache
   */
  getTMDBContent(tmdbId: number): ContentItem | null {
    const entry = this.tmdbContentCache.get(tmdbId);
    
    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.tmdbContentCache.delete(tmdbId);
      return null;
    }

    return entry.data;
  }

  /**
   * Store TMDB content in cache
   */
  storeTMDBContent(content: ContentItem): void {
    const entry: CacheEntry<ContentItem> = {
      data: content,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.tmdbContentTTL
    };

    this.tmdbContentCache.set(content.tmdb_id, entry);
  }

  /**
   * Manual cleanup of expired cache entries
   */
  cleanupExpiredCache(): void {
    const now = Date.now();

    // Clean daily selections
    for (const [key, entry] of this.dailySelectionCache.entries()) {
      if (now > entry.expiresAt) {
        this.dailySelectionCache.delete(key);
      }
    }

    // Clean chat responses
    for (const [key, entry] of this.chatResponseCache.entries()) {
      if (now > entry.expiresAt) {
        this.chatResponseCache.delete(key);
      }
    }

    // Clean TMDB content
    for (const [key, entry] of this.tmdbContentCache.entries()) {
      if (now > entry.expiresAt) {
        this.tmdbContentCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    dailySelections: { total: number; expired: number };
    chatResponses: { total: number; expired: number };
    tmdbContent: { total: number; expired: number };
  } {
    const now = Date.now();

    const dailyExpired = Array.from(this.dailySelectionCache.values())
      .filter(entry => now > entry.expiresAt).length;
    
    const chatExpired = Array.from(this.chatResponseCache.values())
      .filter(entry => now > entry.expiresAt).length;
    
    const tmdbExpired = Array.from(this.tmdbContentCache.values())
      .filter(entry => now > entry.expiresAt).length;

    return {
      dailySelections: {
        total: this.dailySelectionCache.size,
        expired: dailyExpired
      },
      chatResponses: {
        total: this.chatResponseCache.size,
        expired: chatExpired
      },
      tmdbContent: {
        total: this.tmdbContentCache.size,
        expired: tmdbExpired
      }
    };
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.dailySelectionCache.clear();
    this.chatResponseCache.clear();
    this.tmdbContentCache.clear();
  }

  /**
   * Clear specific cache type
   */
  clearCache(type: 'daily' | 'chat' | 'tmdb'): void {
    switch (type) {
      case 'daily':
        this.dailySelectionCache.clear();
        break;
      case 'chat':
        this.chatResponseCache.clear();
        break;
      case 'tmdb':
        this.tmdbContentCache.clear();
        break;
    }
  }

  /**
   * Generate hash for chat messages to use as cache key
   */
  generateMessageHash(message: string): string {
    // Simple hash function for cache keys
    let hash = 0;
    if (message.length === 0) return hash.toString();
    
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString();
  }

  /**
   * Get current date string in GMT+1 timezone for daily cache keys
   */
  getCurrentDateKey(): string {
    const now = new Date();
    // Convert to GMT+1
    const gmt1 = new Date(now.getTime() + (60 * 60 * 1000));
    return gmt1.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  /**
   * Destroy the cache service and cleanup timers
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clearAllCaches();
  }

  /**
   * Check if a cache entry is expired
   */
  private isExpired<T>(entry: CacheEntry<T>): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Start automatic cleanup timer
   */
  private startAutomaticCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredCache();
    }, this.config.cleanupInterval);
  }
}

// Export singleton instance
export const enhancedCacheService = new EnhancedCacheService();