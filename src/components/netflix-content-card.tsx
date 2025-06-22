import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, ThumbsUp, Star, Calendar, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type ContentItem } from '@/services/tmdb-service';

interface NetflixContentCardProps {
  content: ContentItem;
  onPlay: (content: ContentItem) => void;
  index: number;
}

export function NetflixContentCard({ content, onPlay, index }: NetflixContentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePlay = async () => {
    setIsLoading(true);
    try {
      await onPlay(content);
    } finally {
      setIsLoading(false);
    }
  };

  const formatYear = (date: string) => {
    return new Date(date).getFullYear();
  };

  const formatRuntime = (runtime?: number) => {
    if (!runtime) return '';
    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative group cursor-pointer"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Main Card */}
      <motion.div
        className="relative w-80 h-48 rounded-lg overflow-hidden bg-slate-800 shadow-lg"
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.3 }}
      >
        {/* Background Image */}
        {content.backdropPath ? (
          <img
            src={content.backdropPath}
            alt={content.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
            <span className="text-slate-400 text-lg font-medium text-center p-4">
              {content.title}
            </span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Play Button Overlay */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          initial={false}
          animate={{ opacity: isExpanded ? 1 : 0 }}
        >
          <Button
            onClick={handlePlay}
            disabled={isLoading}
            className="w-16 h-16 rounded-full bg-white/90 hover:bg-white text-black shadow-lg"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 border-2 border-black border-t-transparent rounded-full"
              />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </Button>
        </motion.div>

        {/* Content Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-bold text-lg mb-2 line-clamp-1">
            {content.title}
          </h3>
          
          <div className="flex items-center gap-3 text-sm text-slate-300">
            {content.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{content.rating.toFixed(1)}</span>
              </div>
            )}
            
            <span>{formatYear(content.releaseDate)}</span>
            
            {content.type === 'tv' && content.seasons && (
              <span>{content.seasons} season{content.seasons > 1 ? 's' : ''}</span>
            )}
            
            {content.runtime && (
              <span>{formatRuntime(content.runtime)}</span>
            )}
          </div>
        </div>

        {/* Type Badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 text-xs font-bold rounded ${
            content.type === 'tv' 
              ? 'bg-red-600 text-white' 
              : 'bg-blue-600 text-white'
          }`}>
            {content.type === 'tv' ? 'SERIES' : 'MOVIE'}
          </span>
        </div>

        {/* Rating Badge */}
        {content.rating >= 8.0 && (
          <div className="absolute top-3 right-3">
            <div className="bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold">
              ★ {content.rating.toFixed(1)}
            </div>
          </div>
        )}
      </motion.div>

      {/* Expanded Details Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="absolute top-full left-0 right-0 mt-2 bg-slate-900 rounded-lg shadow-2xl border border-slate-700 p-6 z-50"
            style={{ minHeight: '250px' }}
          >
            <div className="space-y-4">
              {/* Title and Metadata */}
              <div>
                <h3 className="text-white font-bold text-xl mb-2">
                  {content.title}
                </h3>
                
                <div className="flex items-center gap-4 text-sm text-slate-300">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatYear(content.releaseDate)}</span>
                  </div>
                  
                  {content.runtime && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatRuntime(content.runtime)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{content.rating.toFixed(1)} ({content.voteCount.toLocaleString()} votes)</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-slate-300 text-sm leading-relaxed line-clamp-3">
                {content.overview}
              </p>

              {/* Genres */}
              {content.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {content.genres.slice(0, 4).map((genre, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-slate-700 text-slate-300 text-xs rounded-full"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handlePlay}
                  disabled={isLoading}
                  className="bg-white text-black hover:bg-slate-200 font-semibold flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Play Now
                </Button>
                
                <button className="w-10 h-10 rounded-full border-2 border-slate-400 bg-slate-800 flex items-center justify-center text-white hover:border-white transition-colors">
                  <Plus className="w-5 h-5" />
                </button>
                
                <button className="w-10 h-10 rounded-full border-2 border-slate-400 bg-slate-800 flex items-center justify-center text-white hover:border-white transition-colors">
                  <ThumbsUp className="w-5 h-5" />
                </button>
                
                <button className="w-10 h-10 rounded-full border-2 border-slate-400 bg-slate-800 flex items-center justify-center text-white hover:border-white transition-colors">
                  <Info className="w-5 h-5" />
                </button>
              </div>

              {/* Additional Info for TV Series */}
              {content.type === 'tv' && (
                <div className="pt-2 border-t border-slate-700">
                  <div className="text-sm text-slate-400">
                    {content.seasons && (
                      <span>{content.seasons} season{content.seasons > 1 ? 's' : ''}</span>
                    )}
                    {content.episodes && (
                      <span> • {content.episodes} episodes</span>
                    )}
                    {content.status && (
                      <span> • {content.status}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 