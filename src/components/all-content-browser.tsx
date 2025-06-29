import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Grid, List, Shuffle, X, Film, ChevronLeft, ChevronRight } from 'lucide-react';
import NetflixCard from '@/components/netflix-card';
import { AnimeCard } from '@/components/anime-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tmdbService, type ContentItem } from '@/services/tmdb-service';
import { animeService, type AnimeItem } from '@/services/anime-service';

interface AllContentBrowserProps {
  initialType?: 'all' | 'movie' | 'tv' | 'anime';
  defaultFilter?: {
    type?: 'movie' | 'tv' | 'anime';
  };
  title?: string; // Custom title for the page
  description?: string; // Custom description
}

export function AllContentBrowser({ 
  initialType = 'all', 
  defaultFilter,
  title,
  description
}: AllContentBrowserProps) {
  const navigate = useNavigate();
  
  // State
  const [content, setContent] = useState<ContentItem[]>([]);
  const [animeContent, setAnimeContent] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [animeSearchResults, setAnimeSearchResults] = useState<AnimeItem[]>([]);
  
  // Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [type, setType] = useState<'all' | 'movie' | 'tv' | 'anime'>(
    defaultFilter?.type || initialType
  );
  const [sort, setSort] = useState<'rating' | 'recent' | 'alphabetical' | 'random' | 'popular'>('recent');
  const [genre, setGenre] = useState<string>('all');
  const [yearMin, setYearMin] = useState<number | undefined>();
  const [yearMax, setYearMax] = useState<number | undefined>();
  const [itemsPerPage, setItemsPerPage] = useState(48);
  
  // Available genres with their TMDB IDs
  const genres = [
    { name: 'Action', movieId: 28, tvId: 10759 },
    { name: 'Adventure', movieId: 12, tvId: 10759 },
    { name: 'Animation', movieId: 16, tvId: 16 },
    { name: 'Comedy', movieId: 35, tvId: 35 },
    { name: 'Crime', movieId: 80, tvId: 80 },
    { name: 'Documentary', movieId: 99, tvId: 99 },
    { name: 'Drama', movieId: 18, tvId: 18 },
    { name: 'Family', movieId: 10751, tvId: 10751 },
    { name: 'Fantasy', movieId: 14, tvId: 10765 },
    { name: 'History', movieId: 36, tvId: 36 },
    { name: 'Horror', movieId: 27, tvId: 27 },
    { name: 'Music', movieId: 10402, tvId: 10402 },
    { name: 'Mystery', movieId: 9648, tvId: 9648 },
    { name: 'Romance', movieId: 10749, tvId: 10749 },
    { name: 'Sci-Fi', movieId: 878, tvId: 10765 },
    { name: 'Sport', movieId: 9648, tvId: 9648 },
    { name: 'Thriller', movieId: 53, tvId: 53 },
    { name: 'War', movieId: 10752, tvId: 10752 },
    { name: 'Western', movieId: 37, tvId: 37 }
  ];

  // TV show specific options
  const tvSortOptions = [
    { value: 'recent', label: 'Recently Aired' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'alphabetical', label: 'A-Z' },
    { value: 'random', label: 'Random' }
  ];

  const movieSortOptions = [
    { value: 'recent', label: 'Latest Releases' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'alphabetical', label: 'A-Z' },
    { value: 'random', label: 'Random' }
  ];

  // Search functionality
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setAnimeSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      if (type === 'anime') {
        // Search only anime
        const animeResults = await animeService.searchAnime(query, 1, 24);
        setAnimeSearchResults(animeResults.results);
        setSearchResults([]);
      } else if (type === 'all') {
        // Search both TMDB and anime
        const [tmdbResults, animeResults] = await Promise.all([
          tmdbService.search(query, { type: 'all' }),
          animeService.searchAnime(query, 1, 12)
        ]);
        setSearchResults(tmdbResults.results);
        setAnimeSearchResults(animeResults.results);
      } else {
        // Search only TMDB (movies/tv)
        const results = await tmdbService.search(query, { 
          type: type as 'movie' | 'tv' | 'all'
        });
        setSearchResults(results.results);
        setAnimeSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setAnimeSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [type]);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setAnimeSearchResults([]);
    setIsSearching(false);
  };

  // Debounced search
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, handleSearch]);

  // Load content
  const loadContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let results: ContentItem[] = [];
      let animeResults: AnimeItem[] = [];
      
      if (type === 'anime') {
        // Load anime content
        switch (sort) {
          case 'rating':
          case 'popular':
            animeResults = await animeService.getTrendingAnime(48);
            break;
          case 'recent':
            const newAnime = await animeService.getNewAnime(1, 48);
            animeResults = newAnime.results;
            break;
          default:
            animeResults = await animeService.getTrendingAnime(48);
        }
        
        // Use fallback if API fails
        if (animeResults.length === 0) {
          animeResults = animeService.getMockPopularAnime();
        }
        
        // Sort anime results
        switch (sort) {
          case 'alphabetical':
            animeResults.sort((a, b) => a.title.localeCompare(b.title));
            break;
          case 'rating':
            animeResults.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            break;
          case 'random':
            animeResults = animeResults.sort(() => Math.random() - 0.5);
            break;
        }
        
        setAnimeContent(animeResults);
        setContent([]);
      } else {
        // Use existing TMDB service methods based on type and sort
        if (type === 'movie') {
          switch (sort) {
            case 'rating':
              results = await tmdbService.getTopRatedMovies();
              break;
            case 'recent':
              results = await tmdbService.getNowPlayingMovies();
              break;
            case 'popular':
              results = await tmdbService.getPopularMovies();
              break;
            default:
              results = await tmdbService.getPopularMovies();
          }
        } else if (type === 'tv') {
          switch (sort) {
            case 'rating':
              results = await tmdbService.getTopRatedTVShows();
              break;
            case 'recent':
              results = await tmdbService.getTVAiringToday();
              break;
            case 'popular':
              results = await tmdbService.getPopularTVShows();
              break;
            default:
              results = await tmdbService.getPopularTVShows();
          }
        } else {
          // Mixed content - get both movies and TV shows
          const [movies, tvShows] = await Promise.all([
            tmdbService.getPopularMovies(),
            tmdbService.getPopularTVShows()
          ]);
          results = [...movies.slice(0, 20), ...tvShows.slice(0, 20)];
        }
        
        // Ensure proper data format for all results (copy from search logic)
        results = results.map(item => ({
          ...item,
          type: item.type || (item.releaseDate?.includes('-') && item.releaseDate.split('-').length === 3 ? 'movie' : 'tv'),
          title: item.title || item.originalTitle || 'Unknown Title',
          year: item.year || (item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined),
          tmdb_id: item.tmdb_id || item.id || 0
        }));
        
        // Filter by genre if specified
        if (genre && genre !== 'all') {
          // Find the genre object with the matching name
          const genreObj = genres.find(g => g.name.toLowerCase() === genre.toLowerCase());
          
          results = results.filter(item => {
            // Check both genre names and genre IDs for maximum compatibility
            const hasGenreByName = item.genres && item.genres.length > 0 && 
              item.genres.some(g => g.toLowerCase().includes(genre.toLowerCase()));
            
            const hasGenreById = genreObj && item.genreIds && item.genreIds.length > 0 && 
              item.genreIds.includes(item.type === 'movie' ? genreObj.movieId : genreObj.tvId);
            
            return hasGenreByName || hasGenreById;
          });
        }
        
        // Filter by year range
        if (yearMin || yearMax) {
          results = results.filter(item => {
            const year = item.year || 0;
            return (!yearMin || year >= yearMin) && (!yearMax || year <= yearMax);
          });
        }
        
        // Sort results
        switch (sort) {
          case 'alphabetical':
            results.sort((a, b) => a.title.localeCompare(b.title));
            break;
          case 'rating':
            results.sort((a, b) => b.rating - a.rating);
            break;
          case 'random':
            results = results.sort(() => Math.random() - 0.5);
            break;
          case 'recent':
            results.sort((a, b) => {
              const aDate = new Date(a.releaseDate || 0).getTime();
              const bDate = new Date(b.releaseDate || 0).getTime();
              return bDate - aDate;
            });
            break;
          case 'popular':
            // Keep original order (usually by popularity)
            break;
          default:
            // Keep original order (usually by popularity)
            break;
        }
        
        setContent(results);
        setAnimeContent([]);
      }
      
      // Calculate pagination based on content type
      const totalResults = type === 'anime' ? animeResults.length : results.length;
      setTotalPages(Math.ceil(totalResults / itemsPerPage));
      setTotalItems(totalResults);
      
    } catch (err) {
      console.error('Error loading content:', err);
      setError('Failed to load content. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, type, sort, genre, yearMin, yearMax]);

  // Load content when filters change
  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [type, sort, genre, yearMin, yearMax, itemsPerPage]);

  // Reset type when defaultFilter changes (for navigation between browse pages)
  useEffect(() => {
    const newType = defaultFilter?.type || initialType;
    if (newType !== type) {
      setType(newType);
      // Clear search when changing browse type
      clearSearch();
    }
  }, [defaultFilter?.type, initialType]);

  // Clear search when type changes
  useEffect(() => {
    if (searchQuery) {
      clearSearch();
    }
  }, [type]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setType(defaultFilter?.type || initialType);
    setSort('recent');
    setGenre('all');
    setYearMin(undefined);
    setYearMax(undefined);
    setCurrentPage(1);
    clearSearch();
  };

  const randomizePage = () => {
    const randomPage = Math.floor(Math.random() * totalPages) + 1;
    setCurrentPage(randomPage);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto"
          >
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Film className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Oops! Something went wrong</h2>
            <p className="text-gray-400 mb-6 leading-relaxed">{error}</p>
            <Button 
              onClick={loadContent} 
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-md font-semibold transition-all duration-300 hover:scale-105"
            >
              Try Again
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 pt-16"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
              <Grid className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">
                {title || 'Browse All Content'}
              </h1>
              <p className="text-gray-400">
                {description || `Discover from our collection of ${totalItems.toLocaleString()} titles`}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <div className="relative max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder={`Search ${type === 'movie' ? 'movies' : type === 'tv' ? 'TV shows' : type === 'anime' ? 'anime' : 'content'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-slate-900/50 border-slate-700 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            {searchQuery && (
              <div className="mt-2 text-center">
                <span className="text-sm text-gray-400">
                  {isSearching ? 'Searching...' : `Found ${searchResults.length + animeSearchResults.length} results for "${searchQuery}"`}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/50 backdrop-blur-sm rounded-lg p-6 mb-8 border border-slate-700"
        >
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-white">Filters</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="ml-auto bg-slate-800 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500"
          >
            Clear All
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* Content Type */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Type</label>
            <Select value={type} onValueChange={(value: any) => setType(value)}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 focus:ring-red-500 focus:border-red-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600 text-white">
                <SelectItem value="all" className="hover:bg-slate-700 focus:bg-slate-700 text-white">All</SelectItem>
                <SelectItem value="movie" className="hover:bg-slate-700 focus:bg-slate-700 text-white">Movies</SelectItem>
                <SelectItem value="tv" className="hover:bg-slate-700 focus:bg-slate-700 text-white">TV Shows</SelectItem>
                <SelectItem value="anime" className="hover:bg-slate-700 focus:bg-slate-700 text-white">Anime</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Sort</label>
            <Select value={sort} onValueChange={(value: any) => setSort(value)}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 focus:ring-red-500 focus:border-red-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600 text-white">
                {(type === 'tv' ? tvSortOptions : type === 'movie' ? movieSortOptions : [
                  { value: 'recent', label: 'Most Recent' },
                  { value: 'popular', label: 'Most Popular' },
                  { value: 'rating', label: 'Highest Rated' },
                  { value: 'alphabetical', label: 'A-Z' },
                  { value: 'random', label: 'Random' }
                ]).map(option => (
                  <SelectItem key={option.value} value={option.value} className="hover:bg-slate-700 focus:bg-slate-700 text-white">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Genre */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Genre</label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 focus:ring-red-500 focus:border-red-500">
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600 text-white">
                <SelectItem value="all" className="hover:bg-slate-700 focus:bg-slate-700 text-white">All Genres</SelectItem>
                {genres.map(g => (
                  <SelectItem key={g.name} value={g.name} className="hover:bg-slate-700 focus:bg-slate-700 text-white">{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Range */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">From Year</label>
            <Input
              type="number"
              placeholder="1900"
              value={yearMin || ''}
              onChange={(e) => setYearMin(e.target.value ? parseInt(e.target.value) : undefined)}
              className="bg-slate-800 border-slate-600 text-white placeholder-gray-400 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">To Year</label>
            <Input
              type="number"
              placeholder="2025"
              value={yearMax || ''}
              onChange={(e) => setYearMax(e.target.value ? parseInt(e.target.value) : undefined)}
              className="bg-slate-800 border-slate-600 text-white placeholder-gray-400 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Items per page */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Per Page</label>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 focus:ring-red-500 focus:border-red-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600 text-white">
                <SelectItem value="24" className="hover:bg-slate-700 focus:bg-slate-700 text-white">24</SelectItem>
                <SelectItem value="48" className="hover:bg-slate-700 focus:bg-slate-700 text-white">48</SelectItem>
                <SelectItem value="96" className="hover:bg-slate-700 focus:bg-slate-700 text-white">96</SelectItem>
                <SelectItem value="144" className="hover:bg-slate-700 focus:bg-slate-700 text-white">144</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        </motion.div>

              {/* View Controls */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between mb-6"
        >
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500'
            }
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500'
            }
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={randomizePage}
            className="ml-4 bg-slate-800 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500"
          >
            <Shuffle className="w-4 h-4 mr-2" />
            Random Page
          </Button>
        </div>
        
                  <div className="text-sm text-gray-400">
            {searchQuery ? 
              `Showing ${searchResults.length + animeSearchResults.length} search results for "${searchQuery}"` :
              `Showing ${((currentPage - 1) * itemsPerPage) + 1}-${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems.toLocaleString()}`
            }
          </div>
        </motion.div>

      {/* Content Grid */}
      <AnimatePresence mode="wait">
        {(loading || isSearching) ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: Math.min(itemsPerPage, 24) }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="bg-slate-800 rounded-lg aspect-[2/3] animate-pulse"
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity, 
                      repeatType: "reverse",
                      delay: i * 0.05 
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {Array.from({ length: Math.min(itemsPerPage, 20) }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="bg-slate-800 rounded-lg h-32 animate-pulse"
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity, 
                      repeatType: "reverse",
                      delay: i * 0.05 
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`grid ${
              viewMode === 'grid' 
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4' 
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            }`}
          >
            {/* Render search results or regular content */}
            {searchQuery ? (
              <>
                {/* TMDB Search Results */}
                {searchResults.map((item) => (
                  <motion.div
                    key={`tmdb-${item.tmdb_id || item.id}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <NetflixCard
                      content={{
                        id: item.id.toString(),
                        imdb_id: item.tmdb_id.toString(),
                        title: item.title,
                        year: item.year,
                        rating: item.rating,
                        genres: item.genres,
                        poster: item.poster || undefined,
                        backdropPath: item.backdropPath || undefined,
                        overview: item.overview,
                        type: item.type,
                        runtime: item.runtime,
                        tmdb_rating: item.rating,
                        seasons: item.seasons || undefined,
                        episodes: item.episodes || undefined
                      }}
                      onPlay={() => {
                        const contentId = item.tmdb_id || item.id;
                        navigate(`/details/${item.type}/${contentId}`);
                      }}
                      compact={viewMode === 'list'}
                    />
                  </motion.div>
                ))}
                
                {/* Anime Search Results */}
                {animeSearchResults.map((anime) => (
                  <motion.div
                    key={`anime-${anime.id}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AnimeCard
                      anime={anime}
                      onPlay={() => {
                        navigate(`/watch/anime/${anime.slug}`, { 
                          state: { 
                            anime,
                            embedUrl: anime.streamUrl 
                          } 
                        });
                      }}
                    />
                  </motion.div>
                ))}
              </>
            ) : (
              <>
                {/* Regular content or anime content based on type */}
                {type === 'anime' ? (
                  /* Anime Content with Pagination */
                  animeContent.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((anime) => (
                    <motion.div
                      key={`anime-${anime.id}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <AnimeCard
                        anime={anime}
                        onPlay={() => {
                          navigate(`/watch/anime/${anime.slug}`, { 
                            state: { 
                              anime,
                              embedUrl: anime.streamUrl 
                            } 
                          });
                        }}
                      />
                    </motion.div>
                  ))
                ) : (
                  /* TMDB Content */
                  content.map((item) => (
                    <motion.div
                      key={`tmdb-${item.tmdb_id || item.id}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <NetflixCard
                        content={{
                          id: item.id.toString(),
                          imdb_id: item.tmdb_id.toString(),
                          title: item.title,
                          year: item.year,
                          rating: item.rating,
                          genres: item.genres,
                          poster: item.poster || undefined,
                          backdropPath: item.backdropPath || undefined,
                          overview: item.overview,
                          type: item.type,
                          runtime: item.runtime,
                          tmdb_rating: item.rating,
                          seasons: item.seasons || undefined,
                          episodes: item.episodes || undefined
                        }}
                        onPlay={() => {
                          const contentId = item.tmdb_id || item.id;
                          navigate(`/details/${item.type}/${contentId}`);
                        }}
                        compact={viewMode === 'list'}
                      />
                    </motion.div>
                  ))
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && !searchQuery && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-2 mt-12"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {/* First page */}
            {currentPage > 3 && (
              <>
                <Button
                  variant={1 === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(1)}
                >
                  1
                </Button>
                {currentPage > 4 && <span className="text-gray-400 px-2">...</span>}
              </>
            )}
            
            {/* Current page range */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              if (pageNum > totalPages) return null;
              
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            
            {/* Last page */}
            {currentPage < totalPages - 2 && (
              <>
                {currentPage < totalPages - 3 && <span className="text-gray-400 px-2">...</span>}
                <Button
                  variant={totalPages === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                >
                  {totalPages}
                </Button>
              </>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </div>
  </div>
);
}