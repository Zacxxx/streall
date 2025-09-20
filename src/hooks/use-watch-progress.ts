import { useEffect, useState } from 'react';
import { watchProgressService, type WatchProgressEntry, type WatchProgressMediaType } from '@/services/watch-progress-service';

export function useWatchProgress(
  tmdbId?: number,
  mediaType?: WatchProgressMediaType,
  season?: number,
  episode?: number,
) {
  const [progress, setProgress] = useState<WatchProgressEntry | null>(() => {
    if (tmdbId === undefined || !mediaType) {
      return null;
    }

    if (mediaType === 'tv' && season && episode) {
      return watchProgressService.getProgress({ tmdbId, mediaType, season, episode });
    }

    return watchProgressService.getLatestProgress(tmdbId, mediaType);
  });

  useEffect(() => {
    if (tmdbId === undefined || !mediaType) {
      setProgress(null);
      return;
    }

    const update = () => {
      if (mediaType === 'tv' && season && episode) {
        setProgress(watchProgressService.getProgress({ tmdbId, mediaType, season, episode }));
      } else {
        setProgress(watchProgressService.getLatestProgress(tmdbId, mediaType));
      }
    };

    update();
    return watchProgressService.subscribe(update);
  }, [tmdbId, mediaType, season, episode]);

  return progress;
}

export function useLastWatchedProgress() {
  const [progress, setProgress] = useState<WatchProgressEntry | null>(() => watchProgressService.getLastWatched());

  useEffect(() => {
    const update = () => {
      setProgress(watchProgressService.getLastWatched());
    };

    update();
    return watchProgressService.subscribe(update);
  }, []);

  return progress;
}
