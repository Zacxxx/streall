import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, Grid, List, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import NetflixCard from '@/components/netflix-card';
import { watchlistService, type WatchlistItem } from '@/services/watchlist-service';
import { type ContentItem } from '@/services/tmdb-service';

interface WatchlistViewProps {
  onPlayContent?: (content: ContentItem) => void;
}

export function WatchlistView({ onPlayContent }: WatchlistViewProps) {
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [filteredWatchlist, setFilteredWatchlist] = useState<WatchlistItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'year' | 'rating'>('recent');

  useEffect(() => {
    loadWatchlist();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [watchlist, filterType, sortBy]);

  const loadWatchlist = () => {
    const items = watchlistService.getWatchlist();
    setWatchlist(items);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...watchlist];

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    // Apply sorting
    switch (sortBy) {
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'year':
        filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
        break;
    }

    setFilteredWatchlist(filtered);
  };

  const handlePlay = (item: WatchlistItem) => {
    if (onPlayContent) {
      // Convert WatchlistItem to ContentItem format
      const contentItem: ContentItem = {
        id: parseInt(item.id),
        tmdb_id: parseInt(item.imdb_id),
        imdb_id: undefined,
        title: item.title,
        originalTitle: item.title,
        type: item.type,
        year: item.year || null,
        releaseDate: item.year ? `${item.year}-01-01` : '',
        overview: '',
        poster: item.poster || null,
        backdropPath: item.poster || null,
        rating: item.rating || 0,
        voteCount: 0,
        popularity: 0,
        genres: item.genres,
        genreIds: [],
        runtime: null,
        seasons: null,
        episodes: null,
        status: null,
        isAdult: false,
        streamUrl: ''
      };
      onPlayContent(contentItem);
    } else {
      navigate(`/watch/${item.type}/${item.imdb_id}`);
    }
  };

  const handleRemoveFromWatchlist = (tmdbId: string) => {
    watchlistService.removeFromWatchlist(tmdbId);
    loadWatchlist();
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear your watchlist?')) {
      watchlistService.clearWatchlist();
      loadWatchlist();
    }
  };

  const convertToNetflixCardFormat = (item: WatchlistItem) => ({
    id: item.id,
    imdb_id: item.imdb_id,
    title: item.title,
    year: item.year,
    rating: item.rating,
    genres: item.genres,
    poster: item.poster || undefined,
    backdropPath: item.poster || undefined,
    overview: '',
    type: item.type,
    runtime: null,
    tmdb_rating: item.rating
  });

  if (watchlist.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white pt-20">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Heart className="w-24 h-24 text-slate-600 mx-auto" />
              <h1 className="text-4xl font-bold text-white">My Watchlist</h1>
              <p className="text-slate-400 text-lg max-w-md mx-auto">
                Your watchlist is empty. Add content by clicking the heart button on any movie or TV show.
              </p>
              <Button
                onClick={() => navigate('/')}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3"
              >
                Discover Content
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-20">
      <div className="container mx-auto px-4 md:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Heart className="w-8 h-8 text-red-600" />
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                My Watchlist
              </h1>
            </div>
            {watchlist.length > 0 && (
              <Button
                variant="outline"
                onClick={handleClearAll}
                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear List
              </Button>
            )}
          </div>
          
          <p className="text-slate-400 text-lg mb-6">
            {watchlist.length} item{watchlist.length > 1 ? 's' : ''} in your list
          </p>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-800 rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Type Filter */}
            <Select value={filterType} onValueChange={(value: 'all' | 'movie' | 'tv') => setFilterType(value)}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 focus:ring-red-500 focus:border-red-500 min-w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600 text-white">
                <SelectItem value="all" className="hover:bg-slate-700 focus:bg-slate-700 text-white">All Types</SelectItem>
                <SelectItem value="movie" className="hover:bg-slate-700 focus:bg-slate-700 text-white">Movies</SelectItem>
                <SelectItem value="tv" className="hover:bg-slate-700 focus:bg-slate-700 text-white">TV Shows</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Options */}
            <Select value={sortBy} onValueChange={(value: 'recent' | 'alphabetical' | 'year' | 'rating') => setSortBy(value)}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 focus:ring-red-500 focus:border-red-500 min-w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600 text-white">
                <SelectItem value="recent" className="hover:bg-slate-700 focus:bg-slate-700 text-white">Recently Added</SelectItem>
                <SelectItem value="alphabetical" className="hover:bg-slate-700 focus:bg-slate-700 text-white">Alphabetical</SelectItem>
                <SelectItem value="year" className="hover:bg-slate-700 focus:bg-slate-700 text-white">By Year</SelectItem>
                <SelectItem value="rating" className="hover:bg-slate-700 focus:bg-slate-700 text-white">By Rating</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Content Grid/List */}
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
            >
              {filteredWatchlist.map((item, index) => (
                <motion.div
                  key={item.imdb_id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <NetflixCard
                    content={convertToNetflixCardFormat(item)}
                    onPlay={() => handlePlay(item)}
                    onAddToList={() => handleRemoveFromWatchlist(item.imdb_id)}
                    size="medium"
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {filteredWatchlist.map((item, index) => (
                <motion.div
                  key={item.imdb_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <NetflixCard
                    content={convertToNetflixCardFormat(item)}
                    onPlay={() => handlePlay(item)}
                    onAddToList={() => handleRemoveFromWatchlist(item.imdb_id)}
                    compact={true}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 