import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, TrendingUp, Star, Clock, Zap, ChevronLeft } from 'lucide-react';
import NetflixCard from './netflix-card';
import { NetflixCardSkeleton } from './netflix-loading';
import { tmdbService } from '../services/tmdb-service';

// Content section interface
interface ContentSection {
  title: string;
  items: any[];
  type: 'popular' | 'trending' | 'genre';
  genre?: string;
  icon?: React.ReactNode;
  description?: string;
}

export function ContentRows() {
  const navigate = useNavigate();
  const scrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [scrollPositions, setScrollPositions] = useState<{ [key: string]: number }>({});
  const [sections, setSections] = useState<ContentSection[]>([
    { 
      title: 'Trending Now', 
      items: [], 
      type: 'trending',
      icon: <TrendingUp className="w-6 h-6" />,
      description: 'What everyone\'s watching right now'
    },
    { 
      title: 'Popular Movies', 
      items: [], 
      type: 'popular',
      icon: <Star className="w-6 h-6" />,
      description: 'Top-rated films loved by audiences'
    },
    { 
      title: 'Action & Adventure', 
      items: [], 
      type: 'genre', 
      genre: 'Action',
      icon: <Zap className="w-6 h-6" />,
      description: 'Heart-pounding thrills and epic adventures'
    },
    { 
      title: 'Sci-Fi & Fantasy', 
      items: [], 
      type: 'genre', 
      genre: 'Sci-Fi',
      icon: <span className="text-lg">🚀</span>,
      description: 'Explore new worlds and possibilities'
    },
    { 
      title: 'Comedy', 
      items: [], 
      type: 'genre', 
      genre: 'Comedy',
      icon: <span className="text-lg">😂</span>,
      description: 'Laugh-out-loud entertainment'
    },
    { 
      title: 'Drama', 
      items: [], 
      type: 'genre', 
      genre: 'Drama',
      icon: <span className="text-lg">🎭</span>,
      description: 'Compelling stories that move you'
    },
    { 
      title: 'Thriller & Crime', 
      items: [], 
      type: 'genre', 
      genre: 'Thriller',
      icon: <Clock className="w-6 h-6" />,
      description: 'Edge-of-your-seat suspense'
    },
    { 
      title: 'Horror', 
      items: [], 
      type: 'genre', 
      genre: 'Horror',
      icon: <span className="text-lg">👻</span>,
      description: 'Spine-chilling scares await'
    }
  ]);

  useEffect(() => {
    const loadAllContent = async () => {
      try {
        const [trending, popular, action, scifi, comedy, drama, thriller, horror] = await Promise.all([
          tmdbService.getTrending('day'),
          tmdbService.getPopular('all'), // Get both movies and TV shows
          tmdbService.getContentByGenre('Action', 'movie'), // Action
          tmdbService.getContentByGenre('Science Fiction', 'movie'), // Sci-Fi
          tmdbService.getContentByGenre('Comedy', 'tv'), // Comedy TV shows
          tmdbService.getContentByGenre('Drama', 'tv'), // Drama TV shows
          tmdbService.getContentByGenre('Thriller', 'movie'), // Thriller
          tmdbService.getContentByGenre('Horror', 'movie') // Horror
        ]);

        setSections(prev => prev.map((section, index) => {
          const results = [trending, popular.results, action, scifi, comedy, drama, thriller, horror][index];
          const items = (Array.isArray(results) ? results : []).map((item: any) => ({
            id: item.id?.toString() || item.tmdb_id?.toString(),
            imdb_id: (item.tmdb_id || item.id || 0).toString(),
            tmdb_id: item.tmdb_id || item.id || 0,
            title: item.title,
            poster: item.poster,
            type: item.type,
            year: item.year,
            rating: item.rating,
            tmdb_rating: item.rating,
            genres: item.genres || [],
            seasons: item.seasons,
            episodes: item.episodes,
            overview: item.overview || '',
            releaseDate: item.releaseDate || '',
            backdropPath: item.backdropPath,
            runtime: item.runtime
          }));
          
          return { ...section, items: items.slice(0, 20) };
        }));
      } catch (error) {
        console.error('Error loading content:', error);
      }
    };

    loadAllContent();
  }, []);

  const handleCardClick = (item: any) => {
    // Use TMDB ID consistently for routing
    const contentId = item.tmdb_id || item.id;
    navigate(`/details/${item.type}/${contentId}`);
  };

  const handleViewAll = (section: ContentSection) => {
    if (section.type === 'genre' && section.genre) {
      navigate(`/browse?genre=${section.genre.toLowerCase()}`);
    } else if (section.type === 'trending') {
      navigate('/browse?filter=trending');
    } else if (section.type === 'popular') {
      navigate('/browse?filter=popular');
    } else {
      navigate('/browse');
    }
  };

  // Track scroll position for arrow visibility
  const handleScroll = (sectionTitle: string, scrollLeft: number) => {
    setScrollPositions(prev => ({
      ...prev,
      [sectionTitle]: scrollLeft
    }));
  };

  // Simple scroll function for navigation arrows
  const scrollSection = (sectionTitle: string, direction: 'left' | 'right') => {
    const container = scrollRefs.current[sectionTitle];
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8;
    const newScrollLeft = direction === 'left' 
      ? container.scrollLeft - scrollAmount 
      : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });

    // Update scroll position immediately for UI feedback
    setTimeout(() => {
      handleScroll(sectionTitle, container.scrollLeft);
    }, 100);
  };

  return (
    <div className="space-y-8 pb-12 px-4 md:px-8">
      {sections.map((section) => {
        const currentScrollPosition = scrollPositions[section.title] || 0;
        const showLeftArrow = currentScrollPosition > 0;
        
        return (
          <motion.section
            key={section.title}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative"
          >
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="text-red-500">
                  {section.icon}
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    {section.title}
                  </h2>
                  {section.description && (
                    <p className="text-sm text-slate-400 mt-1">
                      {section.description}
                    </p>
                  )}
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleViewAll(section)}
                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-medium"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Scrollable Content Row with Navigation */}
            <div className="relative group content-rows-container netflix-content-row">
              {/* Left Navigation Arrow - Only show if scrolled */}
              {showLeftArrow && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.95)" }}
                  whileTap={{ scale: 0.95 }}
                  className="navigation-button absolute left-2 z-20 bg-black/80 hover:bg-black/95 text-white p-3 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg"
                  style={{ 
                    top: '50%',
                    transform: 'translateY(-50%)',
                    transformOrigin: 'center center'
                  }}
                  onClick={() => scrollSection(section.title, 'left')}
                >
                  <ChevronLeft className="w-6 h-6" />
                </motion.button>
              )}

              {/* Right Navigation Arrow */}
              <motion.button
                whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.95)" }}
                whileTap={{ scale: 0.95 }}
                className="navigation-button absolute right-2 z-20 bg-black/80 hover:bg-black/95 text-white p-3 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg"
                style={{ 
                  top: '50%',
                  transform: 'translateY(-50%)',
                  transformOrigin: 'center center'
                }}
                onClick={() => scrollSection(section.title, 'right')}
              >
                <ChevronRight className="w-6 h-6" />
              </motion.button>

              {/* Gradient overlays for better visual effect */}
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black via-black/50 to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black via-black/50 to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Horizontal scrolling container */}
              <div
                ref={(el) => { scrollRefs.current[section.title] = el; }}
                className="flex gap-4 content-rows-scrollable scrollbar-hide scroll-smooth"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}
                onScroll={(e) => handleScroll(section.title, e.currentTarget.scrollLeft)}
              >
                {section.items.length > 0 ? (
                  section.items.map((item, index) => (
                    <motion.div
                      key={`${item.tmdb_id}-${index}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ 
                        duration: 0.4, 
                        delay: index * 0.05,
                        ease: "easeOut"
                      }}
                      className="flex-shrink-0 content-rows-item"
                      style={{ 
                        pointerEvents: 'auto',
                        touchAction: 'manipulation' // Prevent scroll interference
                      }}
                    >
                      <NetflixCard
                        content={item}
                        onPlay={() => handleCardClick(item)}
                        size="medium"
                      />
                    </motion.div>
                  ))
                ) : (
                  // Loading skeletons
                  Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="flex-shrink-0 content-rows-item">
                      <NetflixCardSkeleton count={1} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.section>
        );
      })}

      {/* Call to Action */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-center py-16"
      >
        <div className="max-w-2xl mx-auto">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Can't find what you're looking for?
          </h3>
          <p className="text-slate-400 mb-8 text-lg">
            Use our advanced search to discover content across all genres and platforms
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/search')}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Explore Advanced Search
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
} 