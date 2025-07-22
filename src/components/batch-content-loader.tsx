import React, { useState, useEffect, useCallback } from 'react';
import { performanceOptimizationService } from '@/services/performance-optimization-service';
import LazyNetflixCard from './lazy-netflix-card';

interface BatchContentLoaderProps {
  content: Array<{
    id: string;
    imdb_id: string;
    title: string;
    year?: number | null;
    rating?: number;
    genres?: string[];
    poster?: string;
    backdropPath?: string;
    overview: string;
    type: 'movie' | 'tv' | 'anime';
    runtime?: number | null;
    tmdb_rating?: number;
    seasons?: number;
    episodes?: number;
    tmdb_id?: number;
  }>;
  onPlay: (contentId: string) => void;
  onAddToList?: (contentId: string) => void;
  size?: 'small' | 'medium' | 'large';
  compact?: boolean;
  className?: string;
  batchSize?: number;
  loadingDelay?: number;
  enableImagePreloading?: boolean;
  gridCols?: number;
}

const BatchContentLoader: React.FC<BatchContentLoaderProps> = ({
  content,
  onPlay,
  onAddToList,
  size = 'medium',
  compact = false,
  className = '',
  batchSize = 6,
  loadingDelay = 100,
  enableImagePreloading = true,
  gridCols = 3
}) => {
  const [loadedBatches, setLoadedBatches] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState(false);

  // Calculate total batches needed
  const totalBatches = Math.ceil(content.length / batchSize);
  const visibleContent = content.slice(0, loadedBatches * batchSize);
  const hasMore = loadedBatches < totalBatches;

  // Preload images for visible content
  useEffect(() => {
    if (!enableImagePreloading || preloadedImages) return;

    const preloadVisibleImages = async () => {
      try {
        const imagesToPreload = visibleContent
          .map(item => [item.poster, item.backdropPath])
          .flat()
          .filter((url): url is string => Boolean(url));

        if (imagesToPreload.length > 0) {
          await performanceOptimizationService.preloadImages(imagesToPreload, 'low');
          setPreloadedImages(true);
        }
      } catch (error) {
        console.warn('Failed to preload batch images:', error);
      }
    };

    preloadVisibleImages();
  }, [visibleContent, enableImagePreloading, preloadedImages]);

  // Load next batch of content
  const loadNextBatch = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    
    // Add a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, loadingDelay));
    
    setLoadedBatches(prev => prev + 1);
    setIsLoading(false);
    
    // Reset preloaded images flag to trigger preloading for new batch
    setPreloadedImages(false);
  }, [isLoading, hasMore, loadingDelay]);

  // Auto-load next batch when user scrolls near the end
  useEffect(() => {
    const handleScroll = () => {
      if (isLoading || !hasMore) return;

      const scrollPosition = window.innerHeight + window.scrollY;
      const documentHeight = document.documentElement.offsetHeight;
      const threshold = 200; // Load when 200px from bottom

      if (scrollPosition >= documentHeight - threshold) {
        loadNextBatch();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadNextBatch, isLoading, hasMore]);

  // Generate grid classes based on gridCols
  const getGridClasses = () => {
    const baseClasses = 'grid gap-4';
    switch (gridCols) {
      case 2:
        return `${baseClasses} grid-cols-2`;
      case 3:
        return `${baseClasses} grid-cols-2 sm:grid-cols-3`;
      case 4:
        return `${baseClasses} grid-cols-2 sm:grid-cols-3 md:grid-cols-4`;
      case 6:
        return `${baseClasses} grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6`;
      default:
        return `${baseClasses} grid-cols-2 sm:grid-cols-3`;
    }
  };

  if (content.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400">No content available</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Content Grid */}
      <div className={getGridClasses()}>
        {visibleContent.map((item, index) => (
          <LazyNetflixCard
            key={`${item.id}-${index}`}
            content={item}
            onPlay={onPlay}
            onAddToList={onAddToList}
            size={size}
            compact={compact}
            lazyLoadImages={true}
            preloadDistance={100}
            priority={index < batchSize ? 'high' : 'low'}
          />
        ))}
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="flex items-center gap-2 text-slate-400">
            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading more content...</span>
          </div>
        </div>
      )}

      {/* Load More Button */}
      {hasMore && !isLoading && (
        <div className="flex justify-center py-6">
          <button
            onClick={loadNextBatch}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 font-medium"
          >
            Load More ({content.length - visibleContent.length} remaining)
          </button>
        </div>
      )}

      {/* Performance Stats (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-slate-800 rounded-lg text-xs text-slate-400">
          <div className="grid grid-cols-2 gap-2">
            <div>Loaded: {visibleContent.length}/{content.length}</div>
            <div>Batches: {loadedBatches}/{totalBatches}</div>
            <div>Preloaded: {preloadedImages ? 'Yes' : 'No'}</div>
            <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchContentLoader;