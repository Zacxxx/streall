import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { StreamExtractor, type StreamSource } from '@/utils/stream-extractor';
import { StreamInjector } from '@/utils/stream-injector';
import { StreamCapture } from '@/utils/stream-capture';
import { RedirectFollower } from '@/utils/redirect-follower';
import { RealStreamExtractor } from '@/utils/real-stream-extractor';
import { DirectStreamUrls } from '@/utils/direct-stream-urls';
import { DynamicStreamCapture } from '@/utils/dynamic-stream-capture';

// Extend Window interface to include our custom function
declare global {
  interface Window {
    extractStreamsFunction?: () => void;
  }
}

interface CustomVideoPlayerProps {
  embedUrl: string;
  title: string;
  onBack?: () => void;
  onExtractStreams?: () => void;
}

interface StreamData {
  sources: StreamSource[];
  currentSource: StreamSource | null;
}

export function CustomVideoPlayer({ embedUrl, title, onExtractStreams }: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [useDirectStream, setUseDirectStream] = useState(false);

  // Extract actual streaming URL from embed service
  const extractStreamUrl = async (embedUrl: string): Promise<StreamData | null> => {
    try {
      setIsLoading(true);
      console.log('🔍 Extracting real stream URLs from:', embedUrl);

      // Extract TMDB ID from embed URL
      const tmdbIdMatch = embedUrl.match(/\/(\d+)$/);
      if (tmdbIdMatch) {
        const tmdbId = tmdbIdMatch[1];
        if (!tmdbId) {
          throw new Error('Invalid TMDB ID extracted from URL');
        }
        console.log('🎬 Using TMDB ID:', tmdbId);

        // Primary method: Dynamic stream capture with real browser interaction
        console.log('🎬 Using dynamic stream capture (real browser interaction)...');
        const dynamicResult = await DynamicStreamCapture.captureRealStreams(embedUrl);
        
        if (dynamicResult.success && dynamicResult.streams.length > 0) {
          console.log(`✅ Dynamic capture found ${dynamicResult.streams.length} real stream URLs`);
          console.log('🎯 Captured streams:', dynamicResult.streams);
          
          // Sort streams by preference
          const sortedDynamicStreams = DynamicStreamCapture.sortStreamsByPreference(dynamicResult.streams);
          
          // Convert to StreamSource format with proper type handling
          const sources: StreamSource[] = sortedDynamicStreams.map((stream) => ({
            url: stream.url,
            type: stream.type as StreamSource['type'], // Type assertion since we know it's compatible
            quality: stream.quality,
            label: `${stream.type.toUpperCase()} - ${stream.quality}`
          }));
          
          return {
            sources: sources,
            currentSource: sources[0] || null
          };
        }

        // Fallback: Use direct stream URLs based on HAR analysis
        console.log('🔄 Fallback: Using direct stream URLs from HAR analysis...');
        const directStreams = await DirectStreamUrls.getWorkingStreams(tmdbId, 'movie');
        
        if (directStreams.length > 0) {
          console.log(`✅ Found ${directStreams.length} direct stream URLs`);
          
          // Sort streams by preference
          const sortedDirectStreams = DirectStreamUrls.sortStreamsByPreference(directStreams);
          
          // Convert to StreamSource format with proper type handling
          const sources: StreamSource[] = sortedDirectStreams.map((stream) => ({
            url: stream.url,
            type: stream.type === 'direct' ? 'unknown' : stream.type as StreamSource['type'],
            quality: stream.quality,
            label: `${stream.provider} - ${stream.label}`
          }));
          
          return {
            sources: sources,
            currentSource: sources[0] || null
          };
        }

        // Fallback: Use the real stream extractor with iframe monitoring
        console.log('🔄 Fallback: Using real streaming infrastructure...');
        const providerResults = await RealStreamExtractor.extractFromTMDBId(tmdbId, 'movie');
        
        if (providerResults.length > 0) {
          console.log(`✅ Found ${providerResults.length} streaming providers`);
          
          // Get best sources from all providers
          const realSources = RealStreamExtractor.getBestSources(providerResults);
          
          if (realSources.length > 0) {
            // Convert to StreamSource format
            const sources: StreamSource[] = realSources.map((source) => ({
              url: source.url,
              type: source.type,
              quality: source.quality,
              label: `${source.provider} - ${source.label}`
            }));
            
            const sortedSources = StreamExtractor.sortSourcesByPreference(sources);
            return {
              sources: sortedSources,
              currentSource: sortedSources[0] || null
            };
          }
        }
      }

      // Fallback: try redirect following to get actual streaming provider
      console.log('🔗 Fallback: Following redirect chain...');
      const redirectChain = await RedirectFollower.followRedirectChain(embedUrl);
      
      if (redirectChain.streamingProvider !== 'unknown' && redirectChain.streamingProvider !== 'error') {
        console.log('✅ Found streaming provider:', redirectChain.streamingProvider);
        console.log('🔗 Redirect chain:', redirectChain);
        
        // Generate potential streaming URLs
        const potentialUrls = RedirectFollower.generateStreamingUrls(redirectChain);
        
        // Convert to StreamSource format
        const sources: StreamSource[] = potentialUrls.map((url, index) => ({
          url,
          type: url.includes('.m3u8') ? 'hls' : url.includes('.mp4') ? 'mp4' : 'unknown',
          quality: index === 0 ? 'auto' : 'alternate',
          label: `${redirectChain.streamingProvider} Stream ${index + 1}`
        }));
        
        const sortedSources = StreamExtractor.sortSourcesByPreference(sources);
        return {
          sources: sortedSources,
          currentSource: sortedSources[0] || null
        };
      }
      
      // Fallback: try the hybrid capture method (works around CORS restrictions)
      console.log('🎬 Trying hybrid network capture method...');
      const capturedStreams = await StreamCapture.captureStreamsFromEmbed(embedUrl);
      
      if (capturedStreams.length > 0) {
        console.log('✅ Hybrid capture found streams:', capturedStreams);
        
        const sortedSources = StreamCapture.sortStreamsByPreference(capturedStreams);
        return {
          sources: sortedSources,
          currentSource: sortedSources[0] || null
        };
      }
      
      // Fallback to JavaScript injection method
      console.log('🎬 Trying JavaScript injection method...');
      const injectedStreams = await StreamInjector.extractStreamsWithInjection(embedUrl);
      
      if (injectedStreams.length > 0) {
        console.log('✅ JavaScript injection found streams:', injectedStreams);
        
        // Convert to our format
        const sources: StreamSource[] = injectedStreams.map(stream => ({
          url: stream.url,
          type: stream.type,
          quality: stream.quality || 'auto',
          label: `${stream.type.toUpperCase()} Stream`
        }));
        
        const sortedSources = StreamExtractor.sortSourcesByPreference(sources);
        return {
          sources: sortedSources,
          currentSource: sortedSources[0] || null
        };
      }

      // Fallback to static HTML extraction
      console.log('⚠️ JavaScript injection failed, trying static extraction...');
      const extractedStreams = await StreamExtractor.extractStreamsFromUrl(embedUrl);
      
      if (!extractedStreams || extractedStreams.sources.length === 0) {
        console.log('❌ No streams found with any method');
        return null;
      }

      // Sort sources by preference
      const sortedSources = StreamExtractor.sortSourcesByPreference(extractedStreams.sources);
      console.log('🎯 Found and sorted streams:', sortedSources);

      return {
        sources: sortedSources,
        currentSource: sortedSources[0] || null
      };
    } catch (error) {
      console.error('❌ Error extracting stream URL:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Expose extract function to parent and debug tools
  useEffect(() => {
    if (onExtractStreams) {
      // Replace the parent's extract function with our enhanced version
      window.extractStreamsFunction = () => setUseDirectStream(true);
      
      // Expose stream utilities to global scope for debugging
      (window as any).StreamInjector = StreamInjector;
      (window as any).StreamExtractor = StreamExtractor;
      (window as any).StreamCapture = StreamCapture;
      (window as any).RedirectFollower = RedirectFollower;
      (window as any).RealStreamExtractor = RealStreamExtractor;
      (window as any).DynamicStreamCapture = DynamicStreamCapture;
      (window as any).DirectStreamUrls = DirectStreamUrls;
      
      console.log('🔧 Stream utilities exposed to global scope');
    }
  }, [onExtractStreams]);

  // Add global function to window for debugging
  useEffect(() => {
    (window as any).extractStreamsFunction = () => {
      console.log('🔧 Manual stream extraction triggered');
      if (onExtractStreams) {
        onExtractStreams();
      }
    };
    
    return () => {
      delete (window as any).extractStreamsFunction;
    };
  }, [onExtractStreams]);

  // Initialize player when component mounts
  useEffect(() => {
    initializePlayer();
    
    // Cleanup function
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, [embedUrl]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime || 0);
    const handleDurationChange = () => setDuration(video.duration || 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume || 0);
      setIsMuted(video.muted);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, []);

  // Control functions
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video || !value.length) return;

    video.volume = value[0] || 0;
    setVolume(value[0] || 0);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video || !value.length) return;

    video.currentTime = value[0] || 0;
    setCurrentTime(value[0] || 0);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!isFullscreen) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Initialize video player
  const initializePlayer = async () => {
    if (useDirectStream) {
      const stream = await extractStreamUrl(embedUrl);
      if (stream && stream.currentSource) {
        setStreamData(stream);
        console.log('✅ Using direct stream:', stream.currentSource.url);
      } else {
        setError('Could not extract direct stream URL');
        console.log('⚠️ Falling back to iframe embed');
        setUseDirectStream(false);
      }
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-black rounded-lg">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading player...</p>
          <p className="text-sm text-gray-400 mt-2">Extracting stream URLs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-black rounded-lg">
        <div className="text-white text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-lg text-red-400">Error loading video</p>
          <p className="text-sm text-gray-400 mt-2">{error}</p>
          <button 
            onClick={() => initializePlayer()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (useDirectStream && streamData && streamData.currentSource) {
    return (
      <div 
        className="relative w-full h-full bg-black rounded-lg overflow-hidden"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <video
          ref={videoRef}
          className="w-full h-full"
          poster=""
          preload="metadata"
          crossOrigin="anonymous"
        />
        
        {showControls && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center gap-4 mb-2">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-white text-sm min-w-[100px]">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => skip(-10)}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:text-red-400"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                
                <Button
                  onClick={togglePlay}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:text-red-400"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                
                <Button
                  onClick={() => skip(10)}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:text-red-400"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
                
                <Button
                  onClick={toggleMute}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:text-red-400"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                
                <Slider
                  value={[volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-20"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={toggleFullscreen}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:text-red-400"
                >
                  <Maximize className="w-4 h-4" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:text-red-400"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default to iframe embed if no direct streams are available
  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      <iframe
        src={embedUrl}
        className="w-full h-full"
        style={{ border: 'none', background: 'black', minHeight: '400px' }}
        allowFullScreen
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture; accelerometer; gyroscope"
        title={title}
      />
    </div>
  );
} 