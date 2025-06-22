export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isPremium: boolean;
  createdAt: string;
  lastLogin: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  token: string | null;
}

class AuthService {
  private readonly STORAGE_KEY = 'streall_auth';
  private readonly DEMO_USER: UserProfile = {
    id: 'demo-user-1',
    name: 'Demo User',
    email: 'demo@streall.com',
    avatar: '',
    isPremium: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): AuthState {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading auth state from storage:', error);
    }
    
    return {
      isAuthenticated: false,
      user: null,
      token: null
    };
  }

  private saveToStorage(authState: AuthState): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authState));
    } catch (error) {
      console.error('Error saving auth state to storage:', error);
    }
  }

  // Demo login - in real app this would call an API
  login(email: string = 'demo@streall.com', _password: string = 'demo'): Promise<AuthState> {
    return new Promise((resolve) => {
      // Simulate API call delay
      setTimeout(() => {
        const user: UserProfile = {
          ...this.DEMO_USER,
          email,
          lastLogin: new Date().toISOString()
        };

        const authState: AuthState = {
          isAuthenticated: true,
          user,
          token: `demo-token-${Date.now()}`
        };

        this.saveToStorage(authState);
        resolve(authState);
      }, 500);
    });
  }

  // Quick login for demo purposes
  quickLogin(): AuthState {
    const user: UserProfile = {
      ...this.DEMO_USER,
      lastLogin: new Date().toISOString()
    };

    const authState: AuthState = {
      isAuthenticated: true,
      user,
      token: `demo-token-${Date.now()}`
    };

    this.saveToStorage(authState);
    return authState;
  }

  logout(): void {
    const authState: AuthState = {
      isAuthenticated: false,
      user: null,
      token: null
    };

    this.saveToStorage(authState);
  }

  getCurrentAuthState(): AuthState {
    return this.loadFromStorage();
  }

  isAuthenticated(): boolean {
    const authState = this.loadFromStorage();
    return authState.isAuthenticated && authState.user !== null;
  }

  getCurrentUser(): UserProfile | null {
    const authState = this.loadFromStorage();
    return authState.user;
  }

  updateUserProfile(updates: Partial<UserProfile>): boolean {
    const authState = this.loadFromStorage();
    
    if (!authState.isAuthenticated || !authState.user) {
      return false;
    }

    const updatedUser: UserProfile = {
      ...authState.user,
      ...updates
    };

    const newAuthState: AuthState = {
      ...authState,
      user: updatedUser
    };

    this.saveToStorage(newAuthState);
    return true;
  }

  // Check if user has premium access
  hasPremiumAccess(): boolean {
    const user = this.getCurrentUser();
    return user?.isPremium || false;
  }

  // Get user's watch history (placeholder for future implementation)
  getWatchHistory(): string[] {
    // This would typically come from an API
    return [];
  }

  // Clear all user data
  clearAllUserData(): void {
    this.logout();
    // Could also clear watchlist, preferences, etc.
    localStorage.removeItem('streall_watchlist');
  }
}

export const authService = new AuthService(); 