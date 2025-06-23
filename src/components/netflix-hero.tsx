import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info, Star, Volume2, VolumeX, Plus, ThumbsUp, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tmdbService, type ContentItem } from '@/services/tmdb-service';
import { watchlistService } from '@/services/watchlist-service';
import { useNavigate } from 'react-router-dom';

interface NetflixHeroProps {
  onPlayContent: (content: ContentItem) => void;
}

export function NetflixHero({ onPlayContent }: NetflixHeroProps) {
  const navigate = useNavigate();
  const [featuredContent, setFeaturedContent] = useState<ContentItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadFeaturedContent = async () => {
      try {
        setIsLoading(true);
        
        // Get mixed content - both movies and TV shows
        // These methods already return properly typed ContentItem[] objects
        const [trending, popularMovies, popularTV, topRatedMovies, topRatedTV] = await Promise.all([
          tmdbService.getTrending('day'),
          tmdbService.getPopularMovies(),
          tmdbService.getPopularTVShows(),
          tmdbService.getTopRatedMovies(),
          tmdbService.getTopRatedTVShows()
        ]);

        // Combine content - these are already properly processed ContentItem objects
        const allContent = [
          ...trending.slice(0, 4),
          ...popularMovies.slice(0, 2),
          ...popularTV.slice(0, 2),
          ...topRatedMovies.slice(0, 1),
          ...topRatedTV.slice(0, 1)
        ];

        // Filter out content without proper data and shuffle for variety
        // No need to re-process since these are already ContentItem objects
        const validContent = allContent
          .filter(item => item.title && item.overview && item.backdropPath)
          .sort(() => Math.random() - 0.5)
          .slice(0, 8);

        setFeaturedContent(validContent);
      } catch (error) {
        console.error('Error loading featured content:', error);
        setFeaturedContent([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadFeaturedContent();
  }, []);

  useEffect(() => {
    if (featuredContent.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % featuredContent.length);
      }, 8000); // Change every 8 seconds

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [featuredContent.length]);

  const currentContent = featuredContent[currentIndex];

  // Check watchlist status when current content changes
  useEffect(() => {
    if (currentContent) {
      const contentId = currentContent.imdb_id && currentContent.imdb_id !== 'undefined' 
        ? currentContent.imdb_id 
        : currentContent.tmdb_id.toString();
      setIsInWatchlist(watchlistService.isInWatchlist(contentId));
    }
  }, [currentContent]);

  const handlePlay = () => {
    if (currentContent) {
      // Use the appropriate ID for routing - prefer IMDB ID if available, otherwise TMDB ID
      const contentId = currentContent.imdb_id && currentContent.imdb_id !== 'undefined' 
        ? currentContent.imdb_id 
        : currentContent.tmdb_id;
      
      // For TV shows, always navigate to details page where users can select season/episode
      if (currentContent.type === 'tv') {
        navigate(`/details/tv/${contentId}`);
      } else {
        // For movies, use the callback if available, otherwise navigate to watch
        if (!onPlayContent) {
          navigate(`/watch/${contentId}`);
        } else {
          // Create a content object with the proper ID for the onPlayContent callback
          const contentForPlay = {
            ...currentContent,
            id: Number(contentId) || currentContent.tmdb_id,
            imdb_id: currentContent.imdb_id || contentId.toString()
          };
          
          onPlayContent(contentForPlay);
        }
      }
    }
  };

  const formatGenres = (genres: string[]) => {
    return genres.slice(0, 3).join(' • ');
  };

  const formatYear = (date: string) => {
    return new Date(date).getFullYear();
  };

  const handleAddToWatchlist = () => {
    if (!currentContent) return;
    
    const contentId = currentContent.imdb_id && currentContent.imdb_id !== 'undefined' 
      ? currentContent.imdb_id 
      : currentContent.tmdb_id.toString();
    
    if (isInWatchlist) {
      const removed = watchlistService.removeFromWatchlist(contentId);
      if (removed) setIsInWatchlist(false);
    } else {
      const watchlistItem = {
        id: currentContent.id.toString(),
        imdb_id: contentId,
        title: currentContent.title,
        year: currentContent.year,
        type: currentContent.type,
        poster: currentContent.poster || undefined,
        genres: currentContent.genres,
        rating: currentContent.rating
      };
      
      const added = watchlistService.addToWatchlist(watchlistItem);
      if (added) setIsInWatchlist(true);
    }
  };

  if (isLoading || !currentContent) {
    return (
      <div className="relative h-[75vh] flex items-center justify-center bg-gradient-to-br from-slate-900 to-black">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-slate-400 text-lg">Loading featured content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[75vh] overflow-hidden">
      {/* Background Image with Ken Burns Effect */}
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {currentContent.backdropPath && (
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${currentContent.backdropPath})`,
                  filter: 'brightness(0.4) saturate(1.1)',
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Gradient Overlays - Netflix Style */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />

      {/* Main Content */}
      <div className="relative z-10 h-full flex items-center pt-16">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="max-w-2xl">
            
            {/* Netflix Series/Movie Badge */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-4 mb-6"
            >
              <div className="flex items-center">
                <div className="w-6 h-8 bg-red-600 mr-2 font-black text-white text-xs flex items-center justify-center">
                  S
                </div>
                <span className="text-white font-medium text-sm tracking-wider">
                  {currentContent.type === 'tv' ? 'SERIES' : 'FILM'}
                </span>
              </div>
              
              {currentContent.rating && (
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm font-medium rounded-full backdrop-blur-sm">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{currentContent.rating.toFixed(1)}</span>
                </div>
              )}
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight"
              style={{ 
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
            >
              {currentContent.title}
            </motion.h1>

            {/* Metadata */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-4 mb-6 text-slate-300"
            >
              <span className="text-green-400 font-semibold">
                {Math.round(currentContent.rating * 10)}% Match
              </span>
              <span>{formatYear(currentContent.releaseDate)}</span>
              {currentContent.type === 'tv' && currentContent.seasons ? (
                <span>{currentContent.seasons} Season{currentContent.seasons > 1 ? 's' : ''}</span>
              ) : currentContent.runtime ? (
                <span>{Math.floor(currentContent.runtime / 60)}h {currentContent.runtime % 60}m</span>
              ) : null}
              <div className="px-2 py-1 border border-slate-500 text-xs font-medium">
                {currentContent.type === 'tv' ? 'SERIES' : 'HD'}
              </div>
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-lg text-slate-200 mb-8 leading-relaxed max-w-xl line-clamp-3"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
            >
              {currentContent.overview}
            </motion.p>

            {/* Action Buttons - Netflix Style */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex items-center gap-4 mb-8"
            >
              <Button
                onClick={handlePlay}
                size="lg"
                className="bg-white text-black hover:bg-slate-200 font-bold px-8 py-3 text-lg rounded-md transition-all duration-300 hover:scale-105 flex items-center gap-3"
              >
                <Play className="w-6 h-6 fill-current" />
                {currentContent.type === 'tv' ? 'Watch Series' : 'Play'}
              </Button>
              
              <Button
                onClick={() => {
                  const contentId = currentContent.imdb_id && currentContent.imdb_id !== 'undefined' 
                    ? currentContent.imdb_id 
                    : currentContent.tmdb_id;
                  navigate(`/details/${currentContent.type}/${contentId}`);
                }}
                variant="outline"
                size="lg"
                className="bg-slate-600/70 border-slate-500 text-white hover:bg-slate-500/70 font-bold px-8 py-3 text-lg rounded-md backdrop-blur-md flex items-center gap-3"
              >
                <Info className="w-5 h-5" />
                More Info
              </Button>

              {/* Quick Action Buttons */}
              <div className="flex gap-2 ml-4">
                <button 
                  onClick={handleAddToWatchlist}
                  className={`w-12 h-12 rounded-full border-2 backdrop-blur-sm flex items-center justify-center transition-all duration-300 ${
                    isInWatchlist 
                      ? 'border-red-500 bg-red-600/80 text-white hover:bg-red-500/80' 
                      : 'border-white/60 bg-black/60 text-white hover:border-white hover:bg-white/10'
                  }`}
                  title={isInWatchlist ? 'Remove from My List' : 'Add to My List'}
                >
                  {isInWatchlist ? (
                    <Heart className="w-5 h-5 fill-current" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                </button>
                <button className="w-12 h-12 rounded-full border-2 border-white/60 bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:border-white hover:bg-white/10 transition-all duration-300">
                  <ThumbsUp className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-12 h-12 rounded-full border-2 border-white/60 bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:border-white hover:bg-white/10 transition-all duration-300"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>

            {/* Genres */}
            {currentContent.genres.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="text-slate-400 text-sm"
              >
                <span className="text-slate-500">Genres: </span>
                {formatGenres(currentContent.genres)}
              </motion.div>
            )}
          </div>

          {/* Content Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-20 right-8 flex flex-col gap-2"
          >
            {featuredContent.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-1 h-8 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'bg-white' 
                    : 'bg-slate-600 hover:bg-slate-400'
                }`}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
} 