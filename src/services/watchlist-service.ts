export interface WatchlistItem {
  id: string;
  imdb_id: string;
  title: string;
  year?: number | null;
  type: 'movie' | 'tv';
  poster?: string;
  genres: string[];
  rating?: number;
  addedAt: string;
}

class WatchlistService {
  private readonly STORAGE_KEY = 'streall_watchlist';
  private watchlist: WatchlistItem[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
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
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.watchlist));
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
  getWatchlistByType(type: 'movie' | 'tv'): WatchlistItem[] {
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