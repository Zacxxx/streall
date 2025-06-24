import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, TrendingUp, Star, Clock, Zap, ChevronLeft, Play, Info } from 'lucide-react';
import { AnimeCard } from '@/components/anime-card';
import { Button } from '@/components/ui/button';
import { animeService, type AnimeItem } from '@/services/anime-service';

// Anime section interface
interface AnimeSection {
  title: string;
  items: AnimeItem[];
  type: 'trending' | 'newest' | 'popular' | 'topRated';
  icon?: React.ReactNode;
  description?: string;
}

export function AnimePage() {
  const navigate = useNavigate();
  const scrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [scrollPositions, setScrollPositions] = useState<{ [key: string]: number }>({});
  const [heroAnime, setHeroAnime] = useState<AnimeItem | null>(null);
  const [sections, setSections] = useState<AnimeSection[]>([
    { 
      title: 'Trending Anime', 
      items: [], 
      type: 'trending',
      icon: <TrendingUp className="w-6 h-6" />,
      description: 'Most popular anime right now'
    },
    { 
      title: 'Latest Releases', 
      items: [], 
      type: 'newest',
      icon: <Clock className="w-6 h-6" />,
      description: 'Newest anime episodes and series'
    },
    { 
      title: 'All Time Favorites', 
      items: [], 
      type: 'popular',
      icon: <Star className="w-6 h-6" />,
      description: 'Classic anime everyone loves'
    },
    { 
      title: 'Top Rated', 
      items: [], 
      type: 'topRated',
      icon: <Zap className="w-6 h-6" />,
      description: 'Highest rated anime series'
    }
  ]);

  useEffect(() => {
    loadAllAnime();
  }, []);

  const loadAllAnime = async () => {
    try {
      const [trending, newest] = await Promise.all([
        animeService.getTrendingAnime(24),
        animeService.getNewAnime(1, 24).then(result => result.results)
      ]);

      // Use fallback data if API fails
      const trendingData = trending.length > 0 ? trending : animeService.getMockPopularAnime();
      const newestData = newest.length > 0 ? newest : animeService.getMockPopularAnime().slice(0, 12);

      // Set hero anime (first trending anime)
      if (trendingData.length > 0) {
        setHeroAnime(trendingData[0] || null);
      }

      // Create sections with different data
      setSections(prev => prev.map((section) => {
        let items: AnimeItem[] = [];
        
        switch (section.type) {
          case 'trending':
            items = trendingData.slice(0, 20);
            break;
          case 'newest':
            items = newestData.slice(0, 20);
            break;
          case 'popular':
            // Mix of trending and newest for variety
            items = [...trendingData.slice(5, 15), ...newestData.slice(0, 10)];
            break;
          case 'topRated':
            // Reverse trending for different order
            items = [...trendingData].reverse().slice(0, 20);
            break;
          default:
            items = trendingData.slice(0, 20);
        }
        
        return { ...section, items };
      }));
    } catch (error) {
      console.error('Error loading anime:', error);
      // Use mock data as fallback
      const mockData = animeService.getMockPopularAnime();
      setHeroAnime(mockData[0] || null);
      setSections(prev => prev.map(section => ({ 
        ...section, 
        items: mockData.slice(0, 20) 
      })));
    }
  };

  const handleAnimeClick = (anime: AnimeItem) => {
    navigate(`/watch/anime/${anime.slug}`, { 
      state: { 
        anime,
        embedUrl: anime.streamUrl 
      } 
    });
  };

  const handlePlayHero = () => {
    if (heroAnime) {
      handleAnimeClick(heroAnime);
    }
  };

  const handleViewAll = () => {
    navigate('/browse?type=anime');
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-black"
    >
      {/* Hero Section */}
      {heroAnime && (
        <div className="relative h-screen flex items-center overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0">
            {heroAnime.cover || heroAnime.poster ? (
              <img
                src={heroAnime.cover || heroAnime.poster || undefined}
                alt={heroAnime.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-900 via-pink-900 to-red-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          </div>

          {/* Content */}
          <div className="relative z-10 px-4 md:px-8 max-w-4xl">
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  ANIME
                </span>
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight">
                {heroAnime.title}
              </h1>
              
              {heroAnime.description && (
                <p className="text-lg md:text-xl text-slate-300 mb-6 max-w-2xl leading-relaxed">
                  {heroAnime.description.length > 300 
                    ? `${heroAnime.description.substring(0, 300)}...` 
                    : heroAnime.description}
                </p>
              )}

              <div className="flex items-center gap-4 mb-8">
                {heroAnime.rating && (
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <span className="text-white font-semibold">{heroAnime.rating}</span>
                  </div>
                )}
                {heroAnime.year && (
                  <span className="text-slate-300">{heroAnime.year}</span>
                )}
                {heroAnime.episodes && (
                  <span className="text-slate-300">{heroAnime.episodes} Episodes</span>
                )}
                {heroAnime.studio && (
                  <span className="text-slate-300">Studio: {heroAnime.studio}</span>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handlePlayHero}
                  size="lg"
                  className="bg-white text-black hover:bg-slate-200 font-semibold px-8 py-3 rounded-lg transition-all duration-200"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Watch Now
                </Button>
                
                <Button
                  onClick={handleViewAll}
                  variant="outline"
                  size="lg"
                  className="border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-3 rounded-lg transition-all duration-200"
                >
                  <Info className="w-5 h-5 mr-2" />
                  Browse All
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Anime Sections */}
      <div className="space-y-8 pb-12 px-4 md:px-8 -mt-32 relative z-10">
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
                  <div className="text-purple-400">
                    {section.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">
                      {section.title}
                    </h2>
                    {section.description && (
                      <p className="text-slate-400 text-sm mt-1">
                        {section.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <Button
                  onClick={handleViewAll}
                  variant="ghost"
                  className="text-slate-300 hover:text-white group transition-colors duration-200"
                >
                  View All
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
                </Button>
              </div>

              {/* Content Row */}
              <div className="relative group">
                {/* Left Arrow */}
                {showLeftArrow && (
                  <button
                    onClick={() => scrollSection(section.title, 'left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-2 hover:translate-x-0"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}

                {/* Right Arrow */}
                <button
                  onClick={() => scrollSection(section.title, 'right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 hover:translate-x-0"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Left Gradient */}
                {showLeftArrow && (
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
                )}

                {/* Right Gradient */}
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

                {/* Scrollable Container */}
                <div
                  ref={(el) => { scrollRefs.current[section.title] = el; }}
                  className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 scroll-smooth"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  onScroll={(e) => handleScroll(section.title, e.currentTarget.scrollLeft)}
                >
                  {section.items.map((anime, index) => (
                    <motion.div
                      key={`${anime.id}-${index}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex-shrink-0"
                    >
                      <AnimeCard
                        anime={anime}
                        onPlay={() => handleAnimeClick(anime)}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>
          );
        })}
      </div>
    </motion.div>
  );
} 