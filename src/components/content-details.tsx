import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Plus, ArrowLeft, Star, Calendar, Clock, Tv, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { tmdbService, type ContentItem } from '@/services/tmdb-service';
import { watchlistService } from '@/services/watchlist-service';

export function ContentDetails() {
  const { mediaType, contentId } = useParams<{ mediaType: string; contentId: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState('1');
  const [selectedEpisode, setSelectedEpisode] = useState('1');
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [similarContent, setSimilarContent] = useState<ContentItem[]>([]);

  useEffect(() => {
    const loadContent = async () => {
      if (!contentId || !mediaType) {
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Use TMDB ID consistently - contentId should be TMDB ID
        const tmdbId = parseInt(contentId);
        const contentData = await tmdbService.getDetails(tmdbId, mediaType as 'movie' | 'tv');
        
        if (contentData) {
          setContent(contentData);
          setIsInWatchlist(watchlistService.isInWatchlist(contentData.tmdb_id.toString()));
          
          // Load similar content
          if (contentData.tmdb_id > 0) {
            try {
              const similar = await tmdbService.search(contentData.title, { type: contentData.type }, 1, 6);
              setSimilarContent(similar.results.filter(item => item.tmdb_id !== contentData.tmdb_id));
            } catch (error) {
              console.error('Error loading similar content:', error);
            }
          }
        } else {
          // Create minimal content for direct streaming with TMDB ID
          const minimalContent: ContentItem = {
            id: tmdbId,
            tmdb_id: tmdbId,
            imdb_id: undefined,
            title: `Content ${contentId}`,
            originalTitle: `Content ${contentId}`,
            type: mediaType as 'movie' | 'tv',
            year: null,
            releaseDate: '',
            overview: 'Content details not available',
            poster: null,
            backdropPath: null,
            rating: 0,
            voteCount: 0,
            popularity: 0,
            genres: [],
            genreIds: [],
            runtime: null,
            seasons: null,
            episodes: null,
            status: null,
            isAdult: false,
            streamUrl: ''
          };
          setContent(minimalContent);
        }
      } catch (error) {
        console.error('Error loading content details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [contentId, mediaType]);

  const handlePlay = () => {
    if (!content) return;
    
    // Use TMDB ID consistently with media type
    const id = content.tmdb_id;
    
    if (content.type === 'tv') {
      // For TV shows, include season and episode in the URL
      navigate(`/watch/${content.type}/${id}?s=${selectedSeason}&e=${selectedEpisode}`);
    } else {
      // For movies, also include media type
      navigate(`/watch/${content.type}/${id}`);
    }
  };

  const handleAddToWatchlist = () => {
    if (!content) return;
    
    if (isInWatchlist) {
      const removed = watchlistService.removeFromWatchlist(content.tmdb_id.toString());
      if (removed) setIsInWatchlist(false);
    } else {
      const watchlistItem = {
        id: content.id.toString(),
        imdb_id: content.tmdb_id.toString(), // Use TMDB ID for consistency
        title: content.title,
        year: content.year,
        type: content.type,
        poster: content.poster || undefined,
        genres: content.genres,
        rating: content.rating
      };
      
      const added = watchlistService.addToWatchlist(watchlistItem);
      if (added) setIsInWatchlist(true);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const formatYear = (date: string) => {
    if (!date) return 'Unknown';
    return new Date(date).getFullYear();
  };

  const formatRuntime = (runtime: number | null) => {
    if (!runtime) return '';
    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-slate-400 text-lg">Loading content details...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-white text-2xl mb-4">Content Not Found</h1>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section with Backdrop */}
      <div className="relative h-[30vh] overflow-hidden">
        {/* Background Image */}
        {content.backdropPath && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${content.backdropPath})`,
              filter: 'brightness(0.2) saturate(1.1)',
            }}
          />
        )}
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        
        {/* Back Button */}
        <div className="relative z-10 pt-16 px-4 md:px-8">
          <Button
            onClick={handleBack}
            variant="ghost"
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="container mx-auto px-4 md:px-8 py-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Column 1: Poster Image */}
          <div className="lg:col-span-3">
            {content.poster && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="aspect-[2/3] bg-slate-800 rounded-lg overflow-hidden shadow-2xl"
              >
                <img
                  src={content.poster}
                  alt={content.title}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            )}
          </div>

          {/* Column 2: Main Content Details */}
          <div className="lg:col-span-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {/* Type Badge and Rating */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center">
                  <div className="w-6 h-8 bg-red-600 mr-2 font-black text-white text-xs flex items-center justify-center">
                    S
                  </div>
                  <span className="text-white font-medium text-sm tracking-wider">
                    {content.type === 'tv' ? 'SERIES' : 'FILM'}
                  </span>
                </div>
                
                {content.rating > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm font-medium rounded-full backdrop-blur-sm">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{content.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">
                {content.title}
              </h1>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 mb-6 text-slate-300 text-sm">
                <span className="text-green-400 font-semibold">
                  {Math.round(content.rating * 10)}% Match
                </span>
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
                {content.type === 'tv' && content.seasons && (
                  <div className="flex items-center gap-1">
                    <Tv className="w-4 h-4" />
                    <span>{content.seasons} Season{content.seasons > 1 ? 's' : ''}</span>
                  </div>
                )}
                <div className="px-2 py-1 border border-slate-500 text-xs font-medium">
                  HD
                </div>
              </div>

              {/* Description */}
              <p className="text-lg text-slate-200 mb-8 leading-relaxed">
                {content.overview || 'No description available.'}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 mb-8">
                <Button
                  onClick={handlePlay}
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 text-lg rounded-md flex items-center gap-3"
                >
                  <Play className="w-5 h-5 fill-current" />
                  {content.type === 'tv' ? `Play S${selectedSeason}:E${selectedEpisode}` : 'Play Now'}
                </Button>
                
                <Button
                  onClick={handleAddToWatchlist}
                  variant="outline"
                  size="lg"
                  className={`font-bold px-8 py-3 text-lg rounded-md flex items-center gap-3 transition-all duration-300 ${
                    isInWatchlist 
                      ? 'border-red-500 bg-red-600/20 text-red-400 hover:bg-red-600/30 hover:border-red-400' 
                      : 'border-white/60 bg-white/10 text-white hover:bg-white/20 hover:border-white'
                  }`}
                >
                  {isInWatchlist ? <Heart className="w-5 h-5 fill-current" /> : <Plus className="w-5 h-5" />}
                  {isInWatchlist ? 'Remove from List' : 'Add to List'}
                </Button>
              </div>

              {/* Genres */}
              {content.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {content.genres.map((genre, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-slate-700/60 text-slate-300 text-sm rounded-full"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Column 3: Sidebar with Additional Info and Episode Selector */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-6"
            >
              {/* TV Show Episode Selector */}
              {content.type === 'tv' && (
                <Card className="bg-slate-800/50 border-slate-600">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Tv className="w-5 h-5" />
                      Episodes
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">Season</label>
                        <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                          <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            {Array.from({ length: content.seasons || 5 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                Season {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">Episode</label>
                        <Select value={selectedEpisode} onValueChange={setSelectedEpisode}>
                          <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            {Array.from({ length: 20 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                Episode {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Info Card */}
              <Card className="bg-slate-800/50 border-slate-600">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-lg font-bold text-white">Details</h3>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Type:</span>
                      <span className="text-white">{content.type === 'tv' ? 'TV Series' : 'Movie'}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rating:</span>
                      <span className="text-white">{content.rating.toFixed(1)}/10</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-400">Release:</span>
                      <span className="text-white">{formatYear(content.releaseDate)}</span>
                    </div>
                    
                    {content.runtime && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Duration:</span>
                        <span className="text-white">{formatRuntime(content.runtime)}</span>
                      </div>
                    )}
                    
                    {content.type === 'tv' && content.seasons && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Seasons:</span>
                        <span className="text-white">{content.seasons}</span>
                      </div>
                    )}
                    
                    {content.tmdb_id && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">TMDB ID:</span>
                        <span className="text-white font-mono text-xs">{content.tmdb_id}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Similar Content Section - Full Width Below */}
        {similarContent.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12"
          >
            <h3 className="text-2xl font-bold text-white mb-6">More Like This</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {similarContent.map((item) => (
                <Card
                  key={item.tmdb_id}
                  className="bg-slate-800/50 border-slate-600 cursor-pointer hover:bg-slate-700/50 transition-colors"
                  onClick={() => navigate(`/details/${item.type}/${item.tmdb_id}`)}
                >
                  <CardContent className="p-4">
                    <div className="aspect-video bg-slate-700 rounded mb-3 overflow-hidden">
                      {item.poster && (
                        <img
                          src={item.poster}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <h4 className="font-semibold text-white text-sm mb-1 line-clamp-1">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{item.year}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span>{item.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
} 