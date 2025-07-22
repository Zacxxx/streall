import React, { useState, useEffect, useRef, useCallback } from 'react';
import { performanceOptimizationService } from '@/services/performance-optimization-service';
import NetflixCard from './netflix-card';

interface LazyNetflixCardProps {
  content: {
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
  };
  onPlay: (contentId: string) => void;
  onAddToList?: (contentId: string) => void;
  size?: 'small' | 'medium' | 'large';
  compact?: boolean;
  lazyLoadImages?: boolean;
  preloadDistance?: number;
  priority?: 'high' | 'low';
}

const LazyNetflixCard: React.FC<LazyNetflixCardProps> = ({
  content,
  onPlay,
  onAddToList,
  size = 'medium',
  compact = false,
  lazyLoadImages = true,
  preloadDistance = 200,
  priority = 'low'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!lazyLoadImages);
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Create intersection observer for lazy loading
  useEffect(() => {
    if (!lazyLoadImages || shouldLoad) return;

    const observer = performanceOptimizationService.createLazyLoadObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setShouldLoad(true);
            
            // Preload images when card becomes visible
            preloadCardImages();
            
            // Stop observing once loaded
            if (observerRef.current && cardRef.current) {
              observerRef.current.unobserve(cardRef.current);
            }
          }
        });
      },
      {
        rootMargin: `${preloadDistance}px`,
        threshold: 0.1
      }
    );

    observerRef.current = observer;

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [lazyLoadImages, shouldLoad, preloadDistance]);

  // Preload card images for better UX
  const preloadCardImages = useCallback(async () => {
    if (imagesPreloaded || !content.poster) return;

    try {
      const imagesToPreload = [content.poster];
      if (content.backdropPath) {
        imagesToPreload.push(content.backdropPath);
      }

      await performanceOptimizationService.preloadImages(imagesToPreload, priority);
      setImagesPreloaded(true);
    } catch (error) {
      console.warn(`Failed to preload images for ${content.title}:`, error);
    }
  }, [content.poster, content.backdropPath, content.title, imagesPreloaded, priority]);

  // Render placeholder while loading
  if (!shouldLoad) {
    const cardSizes = {
      small: compact ? 'w-full h-24' : 'w-44 h-64 max-h-64',
      medium: compact ? 'w-full h-32' : 'w-48 h-72 max-h-72',
      large: compact ? 'w-full h-40' : 'w-56 h-80 max-h-80'
    };

    return (
      <div
        ref={cardRef}
        className={`${cardSizes[size]} bg-slate-800 rounded-lg animate-pulse flex items-center justify-center flex-shrink-0`}
      >
        <div className="text-slate-400 text-sm font-medium text-center px-2">
          {content.title}
        </div>
      </div>
    );
  }

  // Render the actual Netflix card once loaded
  return (
    <div ref={cardRef}>
      <NetflixCard
        content={content}
        onPlay={onPlay}
        onAddToList={onAddToList}
        size={size}
        compact={compact}
      />
    </div>
  );
};

export default LazyNetflixCard;