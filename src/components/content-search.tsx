import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Hash, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { tmdbService, type ContentItem } from '@/services/tmdb-service';
import NetflixCard from '@/components/netflix-card';
import { useNavigate } from 'react-router-dom';

interface ContentSearchProps {
  onPlayContent?: (content: ContentItem) => void;
}

export function ContentSearch({ onPlayContent }: ContentSearchProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [manualId, setManualId] = useState('');
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<'search' | 'manual'>('search');
  const [popularContent, setPopularContent] = useState<ContentItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced search function
  const searchTitles = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    
    try {
      const results = await tmdbService.searchMulti(query);
      setSearchResults(results.slice(0, 24));
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get search suggestions (simplified for now)
  const getSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      // Use a subset of search results as suggestions
      const results = await tmdbService.searchMulti(query);
      const suggestionList = results.slice(0, 8).map(item => item.title);
      setSuggestions(suggestionList);
    } catch (error) {
      console.error('Suggestions error:', error);
      setSuggestions([]);
    }
  }, []);

  // Load popular content on startup
  useEffect(() => {
    const loadPopularContent = async () => {
      try {
        const popular = await tmdbService.getPopularMovies();
        setPopularContent(popular.slice(0, 16));
      } catch (error) {
        console.error('Error loading popular content:', error);
      }
    };
    
    loadPopularContent();
  }, []);

  // Handle search with debouncing
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchMode === 'search' && searchQuery.trim()) {
        searchTitles(searchQuery);
        setShowSuggestions(false);
      } else if (searchMode === 'search' && !searchQuery.trim()) {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, searchMode, searchTitles]);

  // Handle suggestions with debouncing
  useEffect(() => {
    const delayedSuggestions = setTimeout(() => {
      if (searchMode === 'search' && searchQuery.trim() && showSuggestions) {
        getSuggestions(searchQuery);
      }
    }, 150);

    return () => clearTimeout(delayedSuggestions);
  }, [searchQuery, searchMode, showSuggestions, getSuggestions]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(true);
    setActiveSuggestionIndex(-1);
    
    if (!value.trim()) {
      setSuggestions([]);
      setSearchResults([]);
    }
  };

  const handleSearchInputFocus = () => {
    if (searchQuery.trim()) {
      setShowSuggestions(true);
    }
  };

  const handleSearchInputBlur = () => {
    // Delay hiding suggestions to allow for click
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    searchTitles(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
          handleSuggestionClick(suggestions[activeSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
        break;
    }
  };

  const handleManualSubmit = async () => {
    if (!manualId.trim()) return;
    
    try {
      // Try to get content details from TMDB using the ID
      let content = await tmdbService.getDetails(parseInt(manualId), 'movie');
      if (!content) {
        content = await tmdbService.getDetails(parseInt(manualId), 'tv');
      }
      
      if (content) {
        if (onPlayContent) {
          onPlayContent(content);
        } else {
          navigate(`/watch/${content.type}/${content.tmdb_id}`);
        }
      } else {
        // If not found, default to movie type
        navigate(`/watch/movie/${manualId}`);
      }
    } catch (error) {
      console.error('Error loading content:', error);
      // Fallback to movie type
      navigate(`/watch/movie/${manualId}`);
    }
  };

  const handlePlay = (content: ContentItem) => {
    if (onPlayContent) {
      onPlayContent(content);
    } else {
      navigate(`/details/${content.type}/${content.tmdb_id}`);
    }
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

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
  };

  const displayContent = searchResults.length > 0 ? searchResults : popularContent;

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-16">
      <div className="container mx-auto px-4 md:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Smart Search
          </h1>
          <p className="text-slate-400 text-lg">
            Discover your next favorite content with our advanced search engine
          </p>
        </motion.div>

        {/* Search Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          {/* Search Mode Toggle */}
          <div className="flex bg-slate-800 rounded-lg p-1 mb-6 w-fit">
            <Button
              variant={searchMode === 'search' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSearchMode('search')}
              className={`${searchMode === 'search' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'} transition-all`}
            >
              <Search className="w-4 h-4 mr-2" />
              Search by Title
            </Button>
            <Button
              variant={searchMode === 'manual' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSearchMode('manual')}
              className={`${searchMode === 'manual' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'} transition-all`}
            >
              <Hash className="w-4 h-4 mr-2" />
              Manual TMDB ID
            </Button>
          </div>

          {/* Search Input */}
          {searchMode === 'search' ? (
            <div className="relative max-w-2xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search movies, TV shows..."
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onFocus={handleSearchInputFocus}
                  onBlur={handleSearchInputBlur}
                  onKeyDown={handleKeyDown}
                  className="pl-12 pr-12 py-4 text-lg bg-slate-800/50 border-slate-600 text-white placeholder-slate-400 focus:border-red-500 focus:ring-red-500"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white p-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                {isLoading && (
                  <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 text-red-500 w-5 h-5 animate-spin" />
                )}
              </div>

              {/* Search Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  ref={suggestionsRef}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-600 rounded-lg mt-2 shadow-xl z-50 max-h-60 overflow-y-auto"
                >
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={`px-4 py-3 cursor-pointer transition-colors ${
                        index === activeSuggestionIndex
                          ? 'bg-red-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {suggestion}
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          ) : (
            /* Manual ID Input */
            <div className="max-w-2xl">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Enter TMDB ID (e.g., 550, 1399)"
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                    className="py-4 text-lg bg-slate-800/50 border-slate-600 text-white placeholder-slate-400 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
                <Button
                  onClick={handleManualSubmit}
                  disabled={!manualId.trim()}
                  className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate Embed
                </Button>
              </div>
              <p className="text-slate-400 text-sm mt-2">
                Enter a TMDB ID to directly generate the streaming embed
              </p>
            </div>
          )}
        </motion.div>

        {/* Results */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {searchMode === 'search' && (
            <>
              {/* Results Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {searchResults.length > 0 
                    ? `Search Results (${searchResults.length})` 
                    : 'Popular Content'
                  }
                </h2>
                {searchQuery && searchResults.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={clearSearch}
                    className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    Clear Search
                  </Button>
                )}
              </div>

              {/* Content Grid */}
              {displayContent.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                  {displayContent.map((item, index) => (
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
                </div>
              ) : !isLoading && searchQuery ? (
                <div className="text-center py-16">
                  <Search className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No results found</h3>
                  <p className="text-slate-400">
                    Try adjusting your search terms or browse our popular content above
                  </p>
                </div>
              ) : null}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
} 