const WATCH_PROGRESS_STORAGE_PREFIX = 'streall_watch_progress';

export type WatchProgressMediaType = 'movie' | 'tv';

export interface WatchProgressMetadata {
  tmdbId: number;
  imdbId?: string;
  mediaType: WatchProgressMediaType;
  season?: number;
  episode?: number;
  title: string;
  poster?: string | null;
  backdropPath?: string | null;
  episodeTitle?: string | null;
}

export interface WatchProgressEntry extends WatchProgressMetadata {
  positionSeconds: number;
  durationSeconds?: number;
  updatedAt: string;
}

interface UpdateProgressOptions {
  positionSeconds: number;
  durationSeconds?: number;
  force?: boolean;
}

export class WatchProgressService {
  private storageKey = WATCH_PROGRESS_STORAGE_PREFIX;
  private progressMap = new Map<string, WatchProgressEntry>();
  private listeners = new Set<() => void>();

  constructor() {
    this.loadFromStorage();
  }

  setUserContext(userId: string | null) {
    const nextKey = userId ? `${WATCH_PROGRESS_STORAGE_PREFIX}_${userId}` : WATCH_PROGRESS_STORAGE_PREFIX;
    if (nextKey === this.storageKey) {
      return;
    }

    this.storageKey = nextKey;
    this.progressMap.clear();
    this.loadFromStorage();
    this.notify();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getProgress(metadata: Pick<WatchProgressMetadata, 'tmdbId' | 'mediaType'> & { season?: number; episode?: number }): WatchProgressEntry | null {
    const key = this.buildKey(metadata.tmdbId, metadata.mediaType, metadata.season, metadata.episode);
    return this.progressMap.get(key) ?? null;
  }

  getLatestProgress(tmdbId: number, mediaType: WatchProgressMediaType): WatchProgressEntry | null {
    const prefix = this.buildKeyPrefix(tmdbId, mediaType);
    const entries: WatchProgressEntry[] = [];

    for (const [key, value] of this.progressMap.entries()) {
      if (key.startsWith(prefix)) {
        entries.push(value);
      }
    }

    if (entries.length === 0) {
      return null;
    }

    const sorted = entries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return sorted.length > 0 ? sorted[0]! : null;
  }

  getLastWatched(): WatchProgressEntry | null {
    if (this.progressMap.size === 0) {
      return null;
    }

    const entries = Array.from(this.progressMap.values());
    const sorted = entries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return sorted.length > 0 ? sorted[0]! : null;
  }

  updateProgress(metadata: WatchProgressMetadata, options: UpdateProgressOptions) {
    if (!metadata.tmdbId || !metadata.mediaType) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const safePosition = Number.isFinite(options.positionSeconds) ? Math.max(0, options.positionSeconds) : 0;
    const safeDuration = options.durationSeconds && Number.isFinite(options.durationSeconds)
      ? Math.max(0, options.durationSeconds)
      : undefined;

    if (!options.force) {
      if (safeDuration && safeDuration > 0 && safePosition / safeDuration >= 0.95) {
        this.clearProgress(metadata);
        return;
      }

      if (safePosition < 5) {
        // Ignore near-zero progress updates unless forced so we don't create noisy records
        return;
      }
    }

    const key = this.buildKey(metadata.tmdbId, metadata.mediaType, metadata.season, metadata.episode);
    const existing = this.progressMap.get(key);

    if (!options.force && existing) {
      const diff = Math.abs(existing.positionSeconds - safePosition);
      if (diff < 5 && (!safeDuration || existing.durationSeconds === safeDuration)) {
        return;
      }
    }

    const entry: WatchProgressEntry = {
      ...metadata,
      positionSeconds: safePosition,
      durationSeconds: safeDuration,
      updatedAt: new Date().toISOString(),
    };

    this.progressMap.set(key, entry);
    this.persist();
    this.notify();
  }

  clearProgress(metadata: Pick<WatchProgressMetadata, 'tmdbId' | 'mediaType'> & { season?: number; episode?: number }) {
    const key = this.buildKey(metadata.tmdbId, metadata.mediaType, metadata.season, metadata.episode);
    if (this.progressMap.delete(key)) {
      this.persist();
      this.notify();
    }
  }

  clearAll() {
    if (this.progressMap.size === 0) {
      return;
    }

    this.progressMap.clear();
    this.persist();
    this.notify();
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        console.error('[watch-progress] listener error', error);
      }
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = window.localStorage.getItem(this.storageKey);
      if (!stored) {
        return;
      }

      const parsed: WatchProgressEntry[] = JSON.parse(stored);
      this.progressMap.clear();

      for (const entry of parsed) {
        if (entry && typeof entry.tmdbId === 'number' && entry.mediaType) {
          const key = this.buildKey(entry.tmdbId, entry.mediaType, entry.season, entry.episode);
          this.progressMap.set(key, entry);
        }
      }
    } catch (error) {
      console.error('[watch-progress] Failed to load from storage', error);
      this.progressMap.clear();
    }
  }

  private persist() {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const entries = Array.from(this.progressMap.values());
      window.localStorage.setItem(this.storageKey, JSON.stringify(entries));
    } catch (error) {
      console.error('[watch-progress] Failed to persist progress', error);
    }
  }

  private buildKeyPrefix(tmdbId: number, mediaType: WatchProgressMediaType) {
    return `${mediaType}:${tmdbId}`;
  }

  private buildKey(tmdbId: number, mediaType: WatchProgressMediaType, season?: number, episode?: number) {
    const prefix = this.buildKeyPrefix(tmdbId, mediaType);
    if (mediaType === 'tv') {
      const seasonPart = season ? `:s${season}` : ':s1';
      const episodePart = episode ? `:e${episode}` : ':e1';
      return `${prefix}${seasonPart}${episodePart}`;
    }

    return `${prefix}:movie`;
  }
}

export const watchProgressService = new WatchProgressService();
