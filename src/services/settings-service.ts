// Settings service for desktop app configuration
interface AppSettings {
  tmdbApiKey: string | null;
  isFirstLaunch: boolean;
  setupCompleted: boolean;
  appVersion: string;
  lastLaunch: string;
}

class SettingsService {
  private readonly STORAGE_KEY = 'streall-settings';
  private readonly DEFAULT_SETTINGS: AppSettings = {
    tmdbApiKey: null,
    isFirstLaunch: true,
    setupCompleted: false,
    appVersion: '1.0.0',
    lastLaunch: new Date().toISOString()
  };

  private settings: AppSettings;
  private isElectron: boolean;

  constructor() {
    this.isElectron = this.detectElectronEnvironment();
    this.settings = this.loadSettings();
  }

  private detectElectronEnvironment(): boolean {
    // Check if running in Electron
    return !!(window as any).electronAPI || 
           typeof (window as any).require !== 'undefined' ||
           navigator.userAgent.toLowerCase().includes('electron') ||
           process.env.NODE_ENV === 'production'; // Fallback for built app
  }

  private loadSettings(): AppSettings {
    try {
      // Both Electron and web versions now use localStorage for settings
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AppSettings;
        return { ...this.DEFAULT_SETTINGS, ...parsed };
      }
      
      // For web version, check if environment variable exists but still require setup
      if (!this.isElectron && import.meta.env.VITE_TMDB_API_KEY) {
        // Even if env var exists, still require user to set it up manually
        return {
          ...this.DEFAULT_SETTINGS,
          isFirstLaunch: true,
          setupCompleted: false
        };
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }

    return { ...this.DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    // Both web and desktop versions can now save settings
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  // Getters
  get tmdbApiKey(): string | null {
    return this.settings.tmdbApiKey;
  }

  get isFirstLaunch(): boolean {
    return this.settings.isFirstLaunch;
  }

  get isSetupCompleted(): boolean {
    return this.settings.setupCompleted && !!this.settings.tmdbApiKey;
  }

  get isDesktopApp(): boolean {
    return this.isElectron;
  }

  get appVersion(): string {
    return this.settings.appVersion;
  }

  // Setters
  setTmdbApiKey(apiKey: string): void {
    this.settings.tmdbApiKey = apiKey;
    this.saveSettings();
  }

  completeFirstLaunch(): void {
    this.settings.isFirstLaunch = false;
    this.settings.lastLaunch = new Date().toISOString();
    this.saveSettings();
  }

  completeSetup(): void {
    this.settings.setupCompleted = true;
    this.settings.isFirstLaunch = false;
    this.settings.lastLaunch = new Date().toISOString();
    this.saveSettings();
  }

  // Validation
  validateApiKey(apiKey: string): boolean {
    if (!apiKey || apiKey.trim().length === 0) return false;
    
    // Basic validation - TMDB API keys are typically JWT tokens or 32-character strings
    const trimmed = apiKey.trim();
    return trimmed.length >= 32 && (trimmed.startsWith('eyJ') || /^[a-f0-9]{32}$/i.test(trimmed));
  }

  async testApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    if (!this.validateApiKey(apiKey)) {
      return { valid: false, error: 'Invalid API key format' };
    }

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/configuration?api_key=${apiKey}`
      );

      if (response.ok) {
        return { valid: true };
      } else {
        const error = await response.text();
        return { 
          valid: false, 
          error: response.status === 401 ? 'Invalid API key' : `API Error: ${error}` 
        };
      }
    } catch (error) {
      return { 
        valid: false, 
        error: 'Network error. Please check your internet connection.' 
      };
    }
  }

  // Reset settings (for testing or user request)
  resetSettings(): void {
    this.settings = { ...this.DEFAULT_SETTINGS };
    this.saveSettings();
  }

  // Export/Import settings (for backup/restore)
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  importSettings(settingsJson: string): boolean {
    try {
      const imported = JSON.parse(settingsJson) as Partial<AppSettings>;
      this.settings = { ...this.DEFAULT_SETTINGS, ...imported };
      this.saveSettings();
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }
}

// Export singleton instance
export const settingsService = new SettingsService();
export default settingsService; 