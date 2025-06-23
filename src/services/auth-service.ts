import { settingsService } from './settings-service';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  createdAt: string;
  lastLogin: string;
  preferences: {
    theme: 'dark' | 'light';
    language: string;
    autoplay: boolean;
    notifications: boolean;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
}

class AuthService {
  private readonly STORAGE_KEY = 'streall_user_profile';
  private authState: AuthState = {
    isAuthenticated: false,
    user: null
  };

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = settingsService.isDesktopApp 
        ? this.loadFromFile() 
        : this.loadFromLocalStorage();
      
      if (stored) {
        this.authState = stored;
      }
    } catch (error) {
      console.error('Error loading auth state from storage:', error);
      this.authState = {
        isAuthenticated: false,
        user: null
      };
    }
  }

  private loadFromLocalStorage(): AuthState | null {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  private loadFromFile(): AuthState | null {
    // For desktop app, we'll use localStorage for now
    // In a real desktop app, this would read from a config file
    return this.loadFromLocalStorage();
  }

  private saveToStorage(): void {
    try {
      if (settingsService.isDesktopApp) {
        this.saveToFile();
      } else {
        this.saveToLocalStorage();
      }
    } catch (error) {
      console.error('Error saving auth state to storage:', error);
    }
  }

  private saveToLocalStorage(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.authState));
  }

  private saveToFile(): void {
    // For desktop app, we'll use localStorage for now
    // In a real desktop app, this would write to a config file
    this.saveToLocalStorage();
  }

  // Create a new local user profile
  createProfile(name: string, email?: string): UserProfile {
    const user: UserProfile = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: email?.trim(),
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      preferences: {
        theme: 'dark',
        language: 'en',
        autoplay: true,
        notifications: true
      }
    };

    this.authState = {
      isAuthenticated: true,
      user
    };

    this.saveToStorage();
    return user;
  }

  // Quick login for existing user
  login(): boolean {
    if (this.authState.user) {
      this.authState.user.lastLogin = new Date().toISOString();
      this.authState.isAuthenticated = true;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  logout(): void {
    this.authState = {
      isAuthenticated: false,
      user: this.authState.user // Keep user data but mark as not authenticated
    };
    this.saveToStorage();
  }

  deleteProfile(): void {
    this.authState = {
      isAuthenticated: false,
      user: null
    };
    
    // Clear all related data
    if (settingsService.isDesktopApp) {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem('streall_watchlist');
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem('streall_watchlist');
    }
  }

  getCurrentAuthState(): AuthState {
    return { ...this.authState };
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated && this.authState.user !== null;
  }

  hasProfile(): boolean {
    return this.authState.user !== null;
  }

  getCurrentUser(): UserProfile | null {
    return this.authState.user ? { ...this.authState.user } : null;
  }

  updateUserProfile(updates: Partial<UserProfile>): boolean {
    if (!this.authState.user) {
      return false;
    }

    this.authState.user = {
      ...this.authState.user,
      ...updates
    };

    this.saveToStorage();
    return true;
  }

  updatePreferences(preferences: Partial<UserProfile['preferences']>): boolean {
    if (!this.authState.user) {
      return false;
    }

    this.authState.user.preferences = {
      ...this.authState.user.preferences,
      ...preferences
    };

    this.saveToStorage();
    return true;
  }

  // Get user statistics
  getUserStats(): {
    accountAge: number; // days
    watchlistCount: number;
    lastActive: string;
  } {
    if (!this.authState.user) {
      return {
        accountAge: 0,
        watchlistCount: 0,
        lastActive: 'Never'
      };
    }

    const createdDate = new Date(this.authState.user.createdAt);
    const now = new Date();
    const accountAge = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get watchlist count from localStorage
    let watchlistCount = 0;
    try {
      const watchlist = localStorage.getItem('streall_watchlist');
      if (watchlist) {
        watchlistCount = JSON.parse(watchlist).length;
      }
    } catch (error) {
      console.error('Error reading watchlist count:', error);
    }

    return {
      accountAge,
      watchlistCount,
      lastActive: this.authState.user.lastLogin
    };
  }
}

export const authService = new AuthService(); 