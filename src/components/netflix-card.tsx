import React, { useState, useEffect } from 'react';
import { Play, Plus, ThumbsUp, Star, Heart, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { watchlistService } from '@/services/watchlist-service';
import { useNavigate } from 'react-router-dom';

interface NetflixCardProps {
  content: {
    id: string;
    imdb_id: string;
    title: string;
    year?: number | null;
    rating?: number;
    genres?: string[];
    poster?: string;
    backdropPath?: string;
    overview?: string;
    type: 'movie' | 'tv';
    runtime?: number | null;
    tmdb_rating?: number;
    seasons?: number;
    episodes?: number;
  };
  onPlay: (contentId: string) => void;
  onAddToList?: (contentId: string) => void;
  size?: 'small' | 'medium' | 'large';
  compact?: boolean;
}

const NetflixCard: React.FC<NetflixCardProps> = ({
  content,
  onPlay,
  onAddToList,
  size = 'medium',
  compact = false
}) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  useEffect(() => {
    setIsInWatchlist(watchlistService.isInWatchlist(content.imdb_id));
  }, [content.imdb_id]);

  const cardSizes = {
    small: compact ? 'w-full h-24' : 'w-44 h-64 max-h-64',
    medium: compact ? 'w-full h-32' : 'w-48 h-72 max-h-72',
    large: compact ? 'w-full h-40' : 'w-56 h-80 max-h-80'
  };

  const handlePlay = () => {
    onPlay(content.imdb_id);
  };

  const handleCardClick = () => {
    navigate(`/details/${content.type}/${content.imdb_id}`);
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/details/${content.type}/${content.imdb_id}`);
  };

  const handleMoreInfo = () => {
    navigate(`/details/${content.type}/${content.imdb_id}`);
  };

  const handleAddToWatchlist = () => {
    if (isInWatchlist) {
      const removed = watchlistService.removeFromWatchlist(content.imdb_id);
      if (removed) setIsInWatchlist(false);
    } else {
      const watchlistItem = {
        id: content.id.toString(),
        imdb_id: content.imdb_id,
        title: content.title,
        year: content.year,
        type: content.type,
        poster: content.poster,
        genres: content.genres || [],
        rating: content.rating,
        addedAt: new Date().toISOString()
      };
      
      const added = watchlistService.addToWatchlist(watchlistItem);
      if (added) setIsInWatchlist(true);
      onAddToList?.(content.imdb_id);
    }
  };

  const displayImage = imageError || !content.poster ? 
    content.backdropPath || `https://via.placeholder.com/400x600/1a1a1a/ffffff?text=${encodeURIComponent(content.title)}`
    : content.poster;

  const rating = content.tmdb_rating || content.rating || 0;
  const year = content.year || new Date().getFullYear();
  
  // Enhanced duration logic for TV shows
  const duration = content.runtime ? `${content.runtime}min` : 
    content.type === 'tv' ? 
      (() => {
        if (content.seasons && content.episodes) {
          return `${content.seasons} Season${content.seasons > 1 ? 's' : ''} • ${content.episodes} Episodes`;
        } else if (content.seasons) {
          return `${content.seasons} Season${content.seasons > 1 ? 's' : ''}`;
        } else if (content.episodes) {
          return `${content.episodes} Episodes`;
        } else {
          return 'TV Series';
        }
      })() : 
      'Movie';

  if (compact) {
    return (
      <div
        className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg hover:bg-slate-800/50 transition-all duration-300 cursor-pointer group"
        onClick={handleTitleClick}
      >
        {/* Compact Image */}
        <div className="flex-shrink-0 w-24 h-16 relative overflow-hidden rounded-md bg-gray-900">
          <img
            src={displayImage}
            alt={content.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading="lazy"
          />
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-800 animate-pulse" />
          )}
        </div>

        {/* Compact Info */}
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-white text-sm line-clamp-2 cursor-pointer hover:text-red-400 transition-colors flex-1 min-w-0">
              {content.title}
            </h3>
            <span className="bg-red-600 px-2 py-1 rounded text-white text-xs font-medium whitespace-nowrap flex-shrink-0">
              {content.type === 'tv' ? 'SERIES' : 'FILM'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
            <span>{year}</span>
            <span>•</span>
            <span>{duration}</span>
            {rating > 0 && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span>{rating.toFixed(1)}</span>
                </div>
              </>
            )}
          </div>
          {content.genres && content.genres.length > 0 && (
            <div className="mt-1">
              <span className="text-xs text-gray-500">
                {content.genres.slice(0, 2).join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Compact Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="bg-white text-black hover:bg-gray-200"
            onClick={handlePlay}
          >
            <Play className="w-4 h-4 mr-1 fill-black" />
            Play
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative ${cardSizes[size]} cursor-pointer transition-all duration-300 ease-out group flex-shrink-0`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      style={{
        touchAction: 'manipulation',
        pointerEvents: 'auto'
      }}
      onWheel={(e) => {
        // Prevent wheel events from bubbling up to prevent scroll interference
        e.stopPropagation();
      }}
    >
      {/* Main Card Container */}
      <div className="relative w-full h-full overflow-hidden rounded-lg bg-gray-900 shadow-lg group-hover:shadow-2xl transition-all duration-300">
        
        {/* Poster Image */}
        <img
          src={displayImage}
          alt={content.title}
          className={`w-full h-full object-cover transition-all duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          loading="lazy"
        />

        {/* Top Overlay with Better Layout */}
        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/90 via-black/60 to-transparent">
          <div className="flex items-start justify-between gap-2">
            {/* Title - takes available space */}
            <h3 className="font-bold text-white text-sm leading-tight line-clamp-2 drop-shadow-lg hover:text-red-400 transition-colors flex-1 min-w-0 pr-2">
              {content.title}
            </h3>
            
            {/* Badges - fixed width */}
            <div className="flex flex-col gap-1 flex-shrink-0">
              <span className="bg-red-600 px-2 py-1 rounded text-white text-xs font-medium whitespace-nowrap">
                {content.type === 'tv' ? 'SERIES' : 'FILM'}
              </span>
              {rating > 0 && (
                <div className="flex items-center gap-1 bg-black/80 backdrop-blur-sm px-2 py-1 rounded">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-white text-xs font-medium">{rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center">
            <div className="text-gray-400 text-sm font-medium text-center px-2">
              {content.title}
            </div>
          </div>
        )}
      </div>

        {/* Hover Info Overlay - Bottom Half of Card */}
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/85 to-transparent p-3 pt-6 transition-all duration-300 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          {/* Action Buttons Row */}
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="secondary" 
              size="sm"
              className="bg-white text-black hover:bg-gray-200 font-medium px-3 py-1 text-xs"
              onClick={handlePlay}
            >
              <Play className="w-3 h-3 mr-1 fill-black" />
              Play
            </Button>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 w-7 rounded-full transition-all duration-200 ${
                  isInWatchlist 
                    ? 'text-red-400 bg-red-500/30 hover:bg-red-500/40 border border-red-500/50' 
                    : 'text-white bg-white/10 hover:bg-white/20 border border-white/30 hover:border-white/50'
                }`}
                onClick={handleAddToWatchlist}
                title={isInWatchlist ? 'Remove from List' : 'Add to List'}
              >
                {isInWatchlist ? (
                  <Heart className="w-3 h-3 fill-current" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 rounded-full text-white hover:bg-white/20 hover:text-green-400 transition-all duration-200"
                title="Like"
              >
                <ThumbsUp className="w-3 h-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 rounded-full text-white hover:bg-white/20 transition-all duration-200"
                title="More Info"
                onClick={handleMoreInfo}
              >
                <Info className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Info Row */}
          <div className="flex items-center gap-2 text-xs text-gray-300 mb-1">
            <span className="font-medium">{year}</span>
            <span>•</span>
            <span>{duration}</span>
          </div>

          {/* Genres */}
          {content.genres && content.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {content.genres.slice(0, 2).map((genre, index) => (
                <span
                  key={index}
                  className="text-xs bg-zinc-700/60 text-gray-300 px-1 py-0.5 rounded-full"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Overview */}
          {content.overview && (
            <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">
              {content.overview}
            </p>
          )}
        </div>
    </div>
  );
};

export default NetflixCard; 