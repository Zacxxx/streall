export interface PlatformUpdate {
  id: string;
  version: string;
  title: string;
  description: string;
  date: string;
  type: 'feature' | 'bugfix' | 'security' | 'major';
  changes: string[];
  isRead: boolean;
}

export interface SeriesUpdate {
  id: string;
  seriesId: number;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeTitle: string;
  airDate: string;
  poster: string | null;
  isRead: boolean;
}

export interface Notification {
  id: string;
  type: 'platform_update' | 'series_update';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  data: PlatformUpdate | SeriesUpdate;
}

class NotificationService {
  private storageKey = 'streall_notifications';
  private watchlistKey = 'streall_watchlist';
  private settingsKey = 'streall_notification_settings';

  // Platform updates (changelog data)
  private platformUpdates: PlatformUpdate[] = [
    {
      id: 'v1.0.6',
      version: '1.0.6',
      title: 'Enhanced Stream Extraction & UI Improvements',
      description: 'Major improvements to stream extraction and user interface',
      date: '2025-06-24',
      type: 'major',
      changes: [
        'Added enhanced 2embed.cc extraction system',
        'Implemented 6-step stream extraction cascade',
        'Fixed genre filtering functionality',
        'Added settings dropdown for stream options',
        'Improved content finding and navigation',
        'Enhanced navbar with better logo styling',
        'Fixed sideshading behavior in content rows'
      ],
      isRead: false
    },
    {
      id: 'v1.0.5',
      version: '1.0.5',
      title: 'Content Discovery & Search',
      description: 'Enhanced content discovery with better search and filtering',
      date: '2025-06-24',
      type: 'feature',
      changes: [
        'Improved search functionality',
        'Added genre-based filtering',
        'Enhanced content browsing',
        'Better TMDB integration',
        'Performance optimizations'
      ],
      isRead: true
    },
    {
      id: 'v1.0.4',
      version: '1.0.4',
      title: 'Watchlist & Profile System',
      description: 'Added watchlist functionality and user profiles',
      date: '2025-06-24',
      type: 'feature',
      changes: [
        'Added watchlist functionality',
        'Implemented user profiles',
        'Added subtitle support',
        'Enhanced video player',
        'UI/UX improvements'
      ],
      isRead: true
    }
  ];

  // Get notification settings
  getSettings() {
    const settings = localStorage.getItem(this.settingsKey);
    return settings ? JSON.parse(settings) : {
      platformUpdates: true,
      seriesUpdates: true,
      soundEnabled: true,
      pushEnabled: false
    };
  }

  // Update notification settings
  updateSettings(settings: {
    platformUpdates: boolean;
    seriesUpdates: boolean;
    soundEnabled: boolean;
    pushEnabled: boolean;
  }) {
    localStorage.setItem(this.settingsKey, JSON.stringify(settings));
  }

  // Get all notifications
  getNotifications(): Notification[] {
    // Add platform update notifications
    const platformNotifications = this.platformUpdates.map(update => ({
      id: `platform_${update.id}`,
      type: 'platform_update' as const,
      title: `Update ${update.version} Available`,
      message: update.title,
      timestamp: update.date,
      isRead: update.isRead,
      data: update
    }));

    // Add series update notifications (if any)
    const seriesNotifications = this.getSeriesUpdateNotifications();

    return [...platformNotifications, ...seriesNotifications]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Get unread notification count
  getUnreadCount(): number {
    return this.getNotifications().filter(n => !n.isRead).length;
  }

  // Mark notification as read
  markAsRead(notificationId: string) {
    const notifications = this.getNotifications();
    const notification = notifications.find(n => n.id === notificationId);
    
    if (notification) {
      notification.isRead = true;
      
      // Update platform updates
      if (notification.type === 'platform_update') {
        const update = this.platformUpdates.find(u => `platform_${u.id}` === notificationId);
        if (update) {
          update.isRead = true;
        }
      }
      
      // Save updated notifications
      this.saveNotifications(notifications);
    }
  }

  // Mark all notifications as read
  markAllAsRead() {
    const notifications = this.getNotifications();
    notifications.forEach(n => n.isRead = true);
    
    // Update platform updates
    this.platformUpdates.forEach(u => u.isRead = true);
    
    this.saveNotifications(notifications);
  }

  // Get platform update by version
  getPlatformUpdate(version: string): PlatformUpdate | null {
    return this.platformUpdates.find(u => u.version === version) || null;
  }

  // Check for series updates (mock implementation)
  private getSeriesUpdateNotifications(): Notification[] {
    const watchlist = this.getWatchlist();
    const seriesUpdates: Notification[] = [];

    // Mock: Check if any watchlisted series have new episodes
    // In a real app, this would check against a TV database API
    watchlist.forEach((item: any) => {
      if (item.type === 'tv') {
        // Mock: Randomly generate updates for demo purposes
        const hasUpdate = Math.random() > 0.8; // 20% chance of update
        
        if (hasUpdate) {
          const mockUpdate: SeriesUpdate = {
            id: `series_${item.tmdb_id}_${Date.now()}`,
            seriesId: item.tmdb_id,
            seriesTitle: item.title,
            seasonNumber: 1,
            episodeNumber: Math.floor(Math.random() * 10) + 1,
            episodeTitle: `Episode ${Math.floor(Math.random() * 10) + 1}`,
            airDate: new Date().toISOString(),
            poster: item.poster,
            isRead: false
          };

          seriesUpdates.push({
            id: mockUpdate.id,
            type: 'series_update',
            title: 'New Episode Available',
            message: `${item.title} - S${mockUpdate.seasonNumber}E${mockUpdate.episodeNumber}`,
            timestamp: mockUpdate.airDate,
            isRead: false,
            data: mockUpdate
          });
        }
      }
    });

    return seriesUpdates;
  }

  // Get user's watchlist
  private getWatchlist() {
    const watchlist = localStorage.getItem(this.watchlistKey);
    return watchlist ? JSON.parse(watchlist) : [];
  }

  // Save notifications
  private saveNotifications(notifications: Notification[]) {
    const seriesNotifications = notifications.filter(n => n.type === 'series_update');
    localStorage.setItem(this.storageKey, JSON.stringify(seriesNotifications));
  }

  // Check for new series episodes (would be called periodically)
  async checkForUpdates(): Promise<void> {
    // In a real implementation, this would:
    // 1. Get user's watchlisted TV series
    // 2. Check TMDB or TV database for new episodes
    // 3. Compare with last known episodes
    // 4. Generate notifications for new episodes
    
    console.log('Checking for series updates...');
    // Mock implementation - in real app would make API calls
  }

  // Get changelog data for a specific version
  getChangelog(version: string) {
    return this.getPlatformUpdate(version);
  }

  // Get all changelogs
  getAllChangelogs() {
    return this.platformUpdates.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService; 