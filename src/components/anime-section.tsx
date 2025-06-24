import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { AnimeCard } from '@/components/anime-card';
import { animeService, type AnimeItem } from '@/services/anime-service';
import { useNavigate } from 'react-router-dom';

interface AnimeSectionProps {
  title?: string;
  showTrending?: boolean;
}

export function AnimeSection({ 
  title = "Trending Anime", 
  showTrending = true 
}: AnimeSectionProps) {
  const [animeList, setAnimeList] = useState<AnimeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadAnime();
  }, []);

  const loadAnime = async () => {
    setIsLoading(true);
    try {
      let anime: AnimeItem[] = [];
      
      if (showTrending) {
        anime = await animeService.getTrendingAnime(12);
      }
      
      // Fallback to mock data if API fails
      if (anime.length === 0) {
        anime = animeService.getMockPopularAnime();
      }
      
      setAnimeList(anime);
    } catch (error) {
      console.error('Failed to load anime:', error);
      // Use mock data as fallback
      setAnimeList(animeService.getMockPopularAnime());
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnimeClick = (anime: AnimeItem) => {
    // Navigate to anime player page
    navigate(`/watch/anime/${anime.slug}`, { 
      state: { 
        anime,
        embedUrl: anime.streamUrl 
      } 
    });
  };

  const scrollSection = (direction: 'left' | 'right') => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8;
    const newScrollLeft = direction === 'left' 
      ? container.scrollLeft - scrollAmount 
      : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  const handleScroll = (scrollLeft: number) => {
    setScrollPosition(scrollLeft);
  };

  const showLeftArrow = scrollPosition > 0;

  if (isLoading) {
    return (
      <div className="px-4 md:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-purple-500" />
          <h2 className="text-xl md:text-2xl font-bold text-white">
            {title}
          </h2>
        </div>
        
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="w-64 h-96 bg-slate-800/50 rounded-lg animate-pulse flex-shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  if (animeList.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="px-4 md:px-8 py-8"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-purple-500" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">
              {title}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Discover the hottest anime series
            </p>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/anime')}
          className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-medium"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Scrollable Content Row with Navigation */}
      <div className="relative group">
        {/* Left Navigation Arrow */}
        {showLeftArrow && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.95)" }}
            whileTap={{ scale: 0.95 }}
            className="absolute left-2 z-20 bg-black/80 hover:bg-black/95 text-white p-3 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg"
            style={{ 
              top: '50%',
              transform: 'translateY(-50%)',
            }}
            onClick={() => scrollSection('left')}
          >
            <ChevronLeft className="w-6 h-6" />
          </motion.button>
        )}

        {/* Right Navigation Arrow */}
        <motion.button
          whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.95)" }}
          whileTap={{ scale: 0.95 }}
          className="absolute right-2 z-20 bg-black/80 hover:bg-black/95 text-white p-3 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg"
          style={{ 
            top: '50%',
            transform: 'translateY(-50%)',
          }}
          onClick={() => scrollSection('right')}
        >
          <ChevronRight className="w-6 h-6" />
        </motion.button>

        {/* Gradient overlays */}
        {showLeftArrow && (
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black via-black/50 to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black via-black/50 to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Horizontal scrolling container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
          onScroll={(e) => handleScroll(e.currentTarget.scrollLeft)}
        >
          {animeList.map((anime, index) => (
            <motion.div
              key={anime.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                duration: 0.4, 
                delay: index * 0.05,
                ease: "easeOut"
              }}
              className="flex-shrink-0"
            >
              <AnimeCard
                anime={anime}
                onPlay={handleAnimeClick}
                size="medium"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
} 