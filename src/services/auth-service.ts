import { supabaseClient } from '@/lib/supabase-client';
import type { Session, User } from '@supabase/supabase-js';
import { WATCHLIST_STORAGE_KEY_PREFIX, watchlistService } from './watchlist-service';
import { watchProgressService } from './watch-progress-service';

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

type AuthListener = (state: AuthState) => void;

const defaultPreferences: UserProfile['preferences'] = {
  theme: 'dark',
  language: 'en',
  autoplay: true,
  notifications: true,
};

class AuthService {
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
  };

  private listeners = new Set<AuthListener>();

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      const { data } = await supabaseClient.auth.getSession();
      this.applySession(data.session);
    } catch (error) {
      console.error('[auth] Failed to retrieve existing session', error);
    }

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      this.applySession(session);
    });

  }

  private notifyListeners() {
    const snapshot = this.getCurrentAuthState();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (error) {
        console.error('[auth] listener error', error);
      }
    }
  }

  private applySession(session: Session | null) {
    if (session?.user) {
      const userProfile = this.mapUser(session.user);
      this.authState = {
        isAuthenticated: true,
        user: userProfile,
      };
      watchlistService.setUserContext(userProfile.id);
      watchProgressService.setUserContext(userProfile.id);
    } else {
      this.authState = {
        isAuthenticated: false,
        user: null,
      };
      watchlistService.setUserContext(null);
      watchProgressService.setUserContext(null);
    }

    this.notifyListeners();
  }

  private mapUser(user: User): UserProfile {
    const metadata = user.user_metadata ?? {};
    const preferences = metadata.preferences as Partial<UserProfile['preferences']> | undefined;

    return {
      id: user.id,
      name: metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Streall User',
      email: user.email ?? undefined,
      avatar: metadata.avatar_url ?? undefined,
      createdAt: user.created_at,
      lastLogin: user.last_sign_in_at || user.created_at,
      preferences: {
        ...defaultPreferences,
        ...(preferences || {}),
      },
    };
  }

  addListener(listener: AuthListener) {
    this.listeners.add(listener);
    listener(this.getCurrentAuthState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getCurrentAuthState(): AuthState {
    return {
      isAuthenticated: this.authState.isAuthenticated,
      user: this.authState.user ? { ...this.authState.user, preferences: { ...this.authState.user.preferences } } : null,
    };
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  hasProfile(): boolean {
    return this.authState.user !== null;
  }

  getCurrentUser(): UserProfile | null {
    const state = this.getCurrentAuthState();
    return state.user;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message || 'Failed to sign in');
    }
  }

  async signUp(name: string, email: string, password: string): Promise<{ needsConfirmation: boolean }> {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to register account');
    }

    if (data.user && !data.session) {
      // Email confirmations enabled
      return { needsConfirmation: true };
    }

    return { needsConfirmation: false };
  }

  async signOut(): Promise<void> {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      throw new Error(error.message || 'Failed to sign out');
    }
  }

  async updateUserProfile(updates: { name?: string; email?: string; avatar?: string }): Promise<boolean> {
    if (!this.authState.user) {
      return false;
    }

    const payload: Parameters<typeof supabaseClient.auth.updateUser>[0] = {};

    if (updates.email && updates.email !== this.authState.user.email) {
      payload.email = updates.email;
    }

    if (updates.name || updates.avatar) {
      payload.data = {
        ...(updates.name ? { full_name: updates.name } : {}),
        ...(updates.avatar ? { avatar_url: updates.avatar } : {}),
      };
    }

    if (Object.keys(payload).length === 0) {
      return true;
    }

    const { error } = await supabaseClient.auth.updateUser(payload);
    if (error) {
      throw new Error(error.message || 'Failed to update profile');
    }

    // Refresh local state
    const { data } = await supabaseClient.auth.getSession();
    this.applySession(data.session);
    return true;
  }

  async updatePreferences(preferences: Partial<UserProfile['preferences']>): Promise<boolean> {
    if (!this.authState.user) {
      return false;
    }

    const { error } = await supabaseClient.auth.updateUser({
      data: {
        preferences: {
          ...this.authState.user.preferences,
          ...preferences,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to update preferences');
    }

    const { data } = await supabaseClient.auth.getSession();
    this.applySession(data.session);
    return true;
  }

  async deleteProfile(): Promise<void> {
    throw new Error('Account deletion must be handled by support. Please contact the administrator.');
  }

  getUserStats(): {
    accountAge: number;
    watchlistCount: number;
    lastActive: string;
  } {
    if (!this.authState.user) {
      return {
        accountAge: 0,
        watchlistCount: 0,
        lastActive: 'Never',
      };
    }

    const createdDate = new Date(this.authState.user.createdAt);
    const now = new Date();
    const accountAge = Math.max(0, Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));

    const watchlistKey = `${WATCHLIST_STORAGE_KEY_PREFIX}_${this.authState.user.id}`;
    let watchlistCount = 0;
    try {
      const stored = localStorage.getItem(watchlistKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          watchlistCount = parsed.length;
        }
      }
    } catch (error) {
      console.error('[auth] Failed to calculate watchlist count', error);
    }

    return {
      accountAge,
      watchlistCount,
      lastActive: this.authState.user.lastLogin,
    };
  }
}

export const authService = new AuthService();
