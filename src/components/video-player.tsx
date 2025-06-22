import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Volume2, Settings, ExternalLink, ArrowLeft, Tv, Film, Star, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tmdbService, type ContentItem } from '@/services/tmdb-service';

interface VideoPlayerProps {
  content: ContentItem;
  embedUrl: string;
  onBack: () => void;
}

export function VideoPlayer({ content, embedUrl, onBack }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState('1');
  const [selectedEpisode, setSelectedEpisode] = useState('1');
  const [currentEmbedUrl, setCurrentEmbedUrl] = useState(embedUrl);

  useEffect(() => {
    setCurrentEmbedUrl(embedUrl);
  }, [embedUrl]);

  const handleSeasonEpisodeChange = () => {
    if (content.type === 'tv') {
      const newUrl = tmdbService.getStreamingUrl(
        content.tmdb_id,
        content.type,
        parseInt(selectedSeason),
        parseInt(selectedEpisode)
      );
      setCurrentEmbedUrl(newUrl);
      setIsPlaying(false); // Reset playing state when changing episode
    }
  };

  useEffect(() => {
    handleSeasonEpisodeChange();
  }, [selectedSeason, selectedEpisode]);

  const formatYear = (date: string) => {
    return new Date(date).getFullYear();
  };

  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  const formatVotes = (votes: number) => {
    if (votes >= 1000000) return `${(votes / 1000000).toFixed(1)}M`;
    if (votes >= 1000) return `${Math.round(votes / 1000)}K`;
    return votes.toString();
  };

  const getTypeIcon = () => {
    return content.type === 'tv' ? <Tv className="w-5 h-5" /> : <Film className="w-5 h-5" />;
  };

  const getTypeLabel = () => {
    return content.type === 'tv' ? 'TV Series' : 'Movie';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="relative z-10 p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={onBack}
            variant="outline"
            className="flex items-center gap-2 bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Browse
          </Button>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50"
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Audio
            </Button>
          </div>
        </div>

        {/* Content Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Player Section */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-600 overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-video bg-black">
                  {!isPlaying ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                      <div className="text-center space-y-4">
                        <motion.button
                          onClick={() => setIsPlaying(true)}
                          className="w-20 h-20 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white shadow-2xl transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Play className="w-10 h-10 fill-current ml-1" />
                        </motion.button>
                        <p className="text-white text-lg font-medium">
                          Click to start playing
                        </p>
                      </div>
                    </div>
                  ) : (
                    <iframe
                      src={currentEmbedUrl}
                      className="w-full h-full"
                      frameBorder="0"
                      allowFullScreen
                      title={content.title}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  {getTypeIcon()}
                  {content.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-slate-300">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatYear(content.releaseDate)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{formatRating(content.rating)}</span>
                  </div>
                  
                  <span className="text-slate-400">
                    ({formatVotes(content.voteCount)} votes)
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-white">Type</h4>
                  <p className="text-slate-300 text-sm">{getTypeLabel()}</p>
                </div>

                {content.genres.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-white">Genres</h4>
                    <div className="flex flex-wrap gap-2">
                      {content.genres.map((genre, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium text-white">Overview</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {content.overview || 'No description available.'}
                  </p>
                </div>

                <Button
                  asChild
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700/50"
                >
                  <a
                    href={currentEmbedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in New Tab
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Season/Episode Selector for TV Series */}
            {content.type === 'tv' && (
              <Card className="bg-slate-800/50 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Episode Selection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Season</label>
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

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Episode</label>
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

                  <div className="pt-2 text-xs text-slate-400">
                    <p>Current: Season {selectedSeason}, Episode {selectedEpisode}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Technical Info */}
            <Card className="bg-slate-800/50 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white text-lg">Technical Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Player:</span>
                  <span className="text-slate-300">2embed.cc</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Quality:</span>
                  <span className="text-slate-300">Auto (HD)</span>
                </div>
                {content.tmdb_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">TMDB ID:</span>
                    <span className="text-slate-300 font-mono">{content.tmdb_id}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-green-400">● Online</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 