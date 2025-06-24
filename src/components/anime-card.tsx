import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Star, Calendar, Tv, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AnimeItem } from '@/services/anime-service';

interface AnimeCardProps {
  anime: AnimeItem;
  onPlay: (anime: AnimeItem) => void;
  size?: 'small' | 'medium' | 'large';
}

const cardSizes = {
  small: 'w-48 h-72',
  medium: 'w-64 h-96',
  large: 'w-80 h-[28rem]'
};

export function AnimeCard({ anime, onPlay, size = 'medium' }: AnimeCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleCardClick = () => {
    onPlay(anime);
  };

  const displayImage = imageError || !anime.poster 
    ? `https://via.placeholder.com/300x400/1a1a1a/ffffff?text=${encodeURIComponent(anime.title)}` 
    : anime.poster;

  const rating = anime.rating ? Math.round(anime.rating * 10) / 10 : 0;

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
        e.stopPropagation();
      }}
    >
      {/* Main Card Container */}
      <div className="relative w-full h-full overflow-hidden rounded-lg bg-gray-900 shadow-lg group-hover:shadow-2xl transition-all duration-300">
        
        {/* Poster Image */}
        <img
          src={displayImage}
          alt={anime.title}
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
              {anime.title}
            </h3>
            
            {/* Badges - fixed width */}
            <div className="flex flex-col gap-1 flex-shrink-0">
              <span className="bg-purple-600 px-2 py-1 rounded text-white text-xs font-medium whitespace-nowrap">
                ANIME
              </span>
              {rating > 0 && (
                <div className="flex items-center gap-1 bg-black/80 backdrop-blur-sm px-2 py-1 rounded">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-white text-xs font-medium">{rating}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center">
            <div className="text-gray-400 text-sm font-medium text-center px-2">
              {anime.title}
            </div>
          </div>
        )}

        {/* Hover Info Overlay - Bottom Half of Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: isHovered ? 1 : 0,
            y: isHovered ? 0 : 20
          }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent"
        >
          {/* Quick Info */}
          <div className="space-y-2 mb-4">
            {anime.year && (
              <div className="flex items-center gap-2 text-slate-300 text-xs">
                <Calendar className="w-3 h-3" />
                <span>{anime.year}</span>
              </div>
            )}
            
            {anime.episodes && (
              <div className="flex items-center gap-2 text-slate-300 text-xs">
                <Tv className="w-3 h-3" />
                <span>{anime.episodes} episodes</span>
              </div>
            )}

            {anime.duration && (
              <div className="flex items-center gap-2 text-slate-300 text-xs">
                <Clock className="w-3 h-3" />
                <span>{anime.duration}</span>
              </div>
            )}
          </div>

          {/* Genres */}
          {anime.genres && anime.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {anime.genres.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="bg-slate-700/80 text-slate-300 px-2 py-1 rounded text-xs font-medium"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {anime.description && (
            <p className="text-slate-300 text-xs line-clamp-3 mb-3">
              {anime.description}
            </p>
          )}

          {/* Action Button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Watch Now
          </Button>
        </motion.div>

        {/* Studio/Status Info */}
        {(anime.studio || anime.status) && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-black/80 backdrop-blur-sm rounded px-2 py-1">
              {anime.studio && (
                <p className="text-slate-400 text-xs">{anime.studio}</p>
              )}
              {anime.status && (
                <p className="text-slate-400 text-xs capitalize">{anime.status}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 