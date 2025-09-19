export const WATCHLIST_STORAGE_KEY_PREFIX = 'streall_watchlist';

export interface WatchlistItem {
  id: string;
  imdb_id: string;
  title: string;
  year?: number | null;
  type: 'movie' | 'tv' | 'anime';
  poster?: string;
  genres: string[];
  rating?: number;
  addedAt: string;
}

class WatchlistService {
  private storageKey = WATCHLIST_STORAGE_KEY_PREFIX;
  private watchlist: WatchlistItem[] = [];

  constructor() {
    this.loadFromStorage();
  }

  setUserContext(userId: string | null) {
    const nextKey = userId ? `${WATCHLIST_STORAGE_KEY_PREFIX}_${userId}` : WATCHLIST_STORAGE_KEY_PREFIX;
    if (nextKey === this.storageKey) {
      return;
    }
    this.storageKey = nextKey;
    this.loadFromStorage();
  }


  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.watchlist = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading watchlist from storage:', error);
      this.watchlist = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.watchlist));
    } catch (error) {
      console.error('Error saving watchlist to storage:', error);
    }
  }

  addToWatchlist(item: Omit<WatchlistItem, 'addedAt'>): boolean {
    if (this.isInWatchlist(item.imdb_id)) {
      return false; // Already in watchlist
    }

    const watchlistItem: WatchlistItem = {
      ...item,
      addedAt: new Date().toISOString()
    };

    this.watchlist.unshift(watchlistItem); // Add to beginning
    this.saveToStorage();
    return true;
  }

  removeFromWatchlist(imdbId: string): boolean {
    const initialLength = this.watchlist.length;
    this.watchlist = this.watchlist.filter(item => item.imdb_id !== imdbId);
    
    if (this.watchlist.length < initialLength) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  isInWatchlist(imdbId: string): boolean {
    return this.watchlist.some(item => item.imdb_id === imdbId);
  }

  getWatchlist(): WatchlistItem[] {
    return [...this.watchlist]; // Return copy
  }

  getWatchlistCount(): number {
    return this.watchlist.length;
  }

  clearWatchlist(): void {
    this.watchlist = [];
    this.saveToStorage();
  }

  // Get watchlist filtered by type
  getWatchlistByType(type: 'movie' | 'tv' | 'anime'): WatchlistItem[] {
    return this.watchlist.filter(item => item.type === type);
  }

  // Get recently added items
  getRecentlyAdded(limit: number = 10): WatchlistItem[] {
    return this.watchlist
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .slice(0, limit);
  }
}

export const watchlistService = new WatchlistService();
