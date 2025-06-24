import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, Zap, Clock, Hash, Play } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import NetflixCard from './netflix-card';
import { NetflixLoading } from './netflix-loading';
import { tmdbService } from '../services/tmdb-service';
import { ContentItem } from '../services/tmdb-service';
import { useNavigate } from 'react-router-dom';

export const UltraSearch: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [manualId, setManualId] = useState('');
  const [results, setResults] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTime, setSearchTime] = useState<number>(0);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [searchMode, setSearchMode] = useState<'search' | 'manual'>('search');
  
  // Filters
  const [type, setType] = useState<'all' | 'movie' | 'tv'>('all');
  const [sortBy, setSortBy] = useState('popularity');
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchRef = useRef<string>('');

  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotalResults(0);
      setSearchTime(0);
      return;
    }

    // Skip if same as last search
    if (searchQuery === lastSearchRef.current) return;
    lastSearchRef.current = searchQuery;

    setLoading(true);
    const startTime = Date.now();

    try {
      // Use TMDB service for search
      const searchResults = await tmdbService.searchMulti(searchQuery);
      
      // Filter by type if specified
      let filteredResults = searchResults;
      if (type !== 'all') {
        filteredResults = searchResults.filter(item => item.type === type);
      }
      
      // Sort results
      switch (sortBy) {
        case 'rating':
          filteredResults.sort((a, b) => b.rating - a.rating);
          break;
        case 'year':
          filteredResults.sort((a, b) => (b.year || 0) - (a.year || 0));
          break;
        case 'title':
          filteredResults.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'popularity':
        default:
          filteredResults.sort((a, b) => b.popularity - a.popularity);
          break;
      }
      
      const endTime = Date.now();
      setSearchTime(endTime - startTime);
      setResults(filteredResults.slice(0, 50));
      setTotalResults(filteredResults.length);
      
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setTotalResults(0);
      setSearchTime(0);
    } finally {
      setLoading(false);
    }
  }, [type, sortBy]);

  // Handle search input with debouncing
  const handleSearchChange = (value: string) => {
    setQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  // Handle manual TMDB/IMDB ID submission
  const handleManualSubmit = async () => {
    if (!manualId.trim()) return;
    
    const cleanId = manualId.trim();
    
    try {
      // For numeric TMDB IDs, try to get content details
      if (/^\d+$/.test(cleanId)) {
        let content = await tmdbService.getDetails(parseInt(cleanId), 'movie');
        if (!content) {
          content = await tmdbService.getDetails(parseInt(cleanId), 'tv');
        }
        
        if (content) {
          navigate(`/watch/${content.type}/${content.tmdb_id}`);
        } else {
          // If not found, default to movie
          navigate(`/watch/movie/${cleanId}`);
        }
      } else {
        // Invalid format
        alert('Please enter a valid TMDB ID (numeric)');
        return;
      }
    } catch (error) {
      console.error('Error loading content:', error);
      // Fallback to movie
      navigate(`/watch/movie/${cleanId}`);
    }
  };

  const handlePlay = (content: ContentItem) => {
    navigate(`/watch/${content.type}/${content.tmdb_id}`);
  };

  const convertToCardFormat = (item: ContentItem) => ({
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
    tmdb_rating: item.rating
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-16">
      <div className="container mx-auto px-4 md:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Zap className="w-8 h-8 text-red-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-red-300 bg-clip-text text-transparent">
              Ultra Search
            </h1>
            <Zap className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Advanced search powered by TMDB with intelligent matching and manual ID lookup
          </p>
        </motion.div>

        {/* Search Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-4xl mx-auto mb-12"
        >
          {/* Search Mode Toggle */}
          <div className="flex bg-slate-800 rounded-lg p-1 mb-6 w-fit mx-auto">
            <Button
              variant={searchMode === 'search' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSearchMode('search')}
              className={`${searchMode === 'search' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'} transition-all`}
            >
              <Search className="w-4 h-4 mr-2" />
              Smart Search
            </Button>
            <Button
              variant={searchMode === 'manual' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSearchMode('manual')}
              className={`${searchMode === 'manual' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'} transition-all`}
            >
              <Hash className="w-4 h-4 mr-2" />
              Manual ID
            </Button>
          </div>

          {searchMode === 'search' ? (
            <>
              {/* Main Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search movies and TV shows..."
                  value={query}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-12 pr-4 py-4 text-lg bg-gray-900/50 border-gray-700 focus:border-red-500 rounded-lg"
                />
                {loading && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500" />
                  </div>
                )}
              </div>

              {/* Advanced Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Select value={type} onValueChange={(value: 'all' | 'movie' | 'tv') => setType(value)}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 focus:ring-red-500 focus:border-red-500">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600 text-white">
                    <SelectItem value="all" className="hover:bg-slate-700 focus:bg-slate-700 text-white">All Types</SelectItem>
                    <SelectItem value="movie" className="hover:bg-slate-700 focus:bg-slate-700 text-white">Movies</SelectItem>
                    <SelectItem value="tv" className="hover:bg-slate-700 focus:bg-slate-700 text-white">TV Shows</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 focus:ring-red-500 focus:border-red-500">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600 text-white">
                    <SelectItem value="popularity" className="hover:bg-slate-700 focus:bg-slate-700 text-white">Popularity</SelectItem>
                    <SelectItem value="rating" className="hover:bg-slate-700 focus:bg-slate-700 text-white">Rating</SelectItem>
                    <SelectItem value="year" className="hover:bg-slate-700 focus:bg-slate-700 text-white">Release Date</SelectItem>
                    <SelectItem value="title" className="hover:bg-slate-700 focus:bg-slate-700 text-white">Title</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    setTotalResults(0);
                    setSearchTime(0);
                  }}
                >
                  Clear
                </Button>
              </div>
            </>
          ) : (
            /* Manual ID Input */
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Enter TMDB ID (e.g., 550) or IMDB ID (e.g., tt0137523)"
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                    className="py-4 text-lg bg-gray-900/50 border-gray-700 focus:border-red-500"
                  />
                </div>
                <Button
                  onClick={handleManualSubmit}
                  disabled={!manualId.trim()}
                  className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Watch Now
                </Button>
              </div>
              <div className="text-slate-400 text-sm space-y-2">
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 font-mono">TMDB:</span>
                    <span>Numeric (550, 609681)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400 font-mono">IMDB:</span>
                    <span>tt + numbers (tt0137523)</span>
                  </div>
                </div>
                <p className="text-center">
                  Find IDs on{' '}
                  <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300">
                    TMDB
                  </a>
                  {' '}or{' '}
                  <a href="https://www.imdb.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                    IMDB
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* Search Results Info */}
          <AnimatePresence>
            {(searchMode === 'search' && query && !loading && results.length > 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between mb-6 p-4 bg-gray-900/30 rounded-lg border border-gray-800"
              >
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-medium">{formatNumber(totalResults)} results</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 font-medium">{formatTime(searchTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-400 font-medium">Ultra Fast</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Search Results */}
        <AnimatePresence>
          {searchMode === 'search' && (
            <>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center py-12"
                >
                  <NetflixLoading />
                </motion.div>
              )}

              {!loading && query && results.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-12"
                >
                  <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No results found</h3>
                  <p className="text-gray-400">
                    Try adjusting your search terms or use the manual ID lookup
                  </p>
                </motion.div>
              )}

              {!loading && results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-8"
                >
                  {results.map((item, index) => (
                    <motion.div
                      key={`${item.tmdb_id}-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <NetflixCard
                        content={convertToCardFormat(item)}
                        onPlay={() => handlePlay(item)}
                        size="medium"
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}; 