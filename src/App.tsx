import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom'
import { NetflixHero } from '@/components/netflix-hero'
import { ContentRows } from '@/components/content-rows'
import { NetflixNavbar } from '@/components/netflix-navbar'
import { Footer } from '@/components/footer'
import { ContentSearch } from '@/components/content-search'
import { AllContentBrowser } from '@/components/all-content-browser'
import { UltraSearch } from '@/components/ultra-search'
import { WatchlistView } from '@/components/watchlist-view'
import { NetflixScrollToTop, NetflixToast } from '@/components/netflix-enhancement'
import { WelcomeModal } from '@/components/welcome-modal'
import { SettingsPage } from '@/components/settings-page'
import { AuthPage } from '@/pages/auth-page'
import { ProfilePage } from '@/pages/profile-page'
import { tmdbService, type ContentItem, type EpisodeDetails } from '@/services/tmdb-service'
import { authService } from '@/services/auth-service'
import { watchlistService } from '@/services/watchlist-service'
import { watchProgressService } from '@/services/watch-progress-service'
import { settingsService } from '@/services/settings-service'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Settings, ChevronDown, PlayCircle } from 'lucide-react'
import { ContentDetails } from '@/components/content-details'
import { CustomVideoPlayer } from '@/components/custom-video-player'
import { SubtitleControls } from '@/components/subtitle-overlay'
import { subtitleService } from '@/services/subtitle-service'
import { ChangelogPage } from '@/components/changelog-page'
import { AnimePage } from '@/components/anime-page'
import { AnimeSection } from '@/components/anime-section'
import { MovieSuggestions } from '@/components/movie-suggestions'
import type { PlaybackOptions } from '@/types/playback'

type ExtendedContentItem = ContentItem & {
  similar?: ContentItem[];
  seasonUrls?: { season: number; url: string }[] | null;
};

function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [authState, setAuthState] = useState(authService.getCurrentAuthState());
  const [initialising, setInitialising] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.addListener((state) => {
      setAuthState(state);
      watchlistService.setUserContext(state.user?.id ?? null);
      watchProgressService.setUserContext(state.user?.id ?? null);
      setInitialising(false);
    });

    return () => unsubscribe();
  }, []);

  if (initialising) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="text-sm text-slate-300">Checking your session...</p>
        </div>
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return <Navigate to="/auth" replace state={{ redirectTo: `${location.pathname}${location.search}${location.hash}` }} />;
  }

  return <>{children}</>;
}

// Layout wrapper for consistent header/footer
function Layout({ children, showNavbar = true, showFooter = true }: { 
  children: ReactNode, 
  showNavbar?: boolean, 
  showFooter?: boolean 
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [showSettings, setShowSettings] = useState(false)
  const [authState, setAuthState] = useState(authService.getCurrentAuthState())

  useEffect(() => {
    const unsubscribe = authService.addListener((state) => {
      setAuthState(state)
      watchlistService.setUserContext(state.user?.id ?? null)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const handleOpenSettingsEvent = () => setShowSettings(true)
    window.addEventListener('streall-open-settings', handleOpenSettingsEvent as EventListener)
    return () => window.removeEventListener('streall-open-settings', handleOpenSettingsEvent as EventListener)
  }, [])

  const handleHome = () => {
    navigate('/')
  }

  const buildRedirectTarget = () => `${location.pathname}${location.search}${location.hash}`;

  const redirectToAuth = () => {
    navigate('/auth', { state: { redirectTo: buildRedirectTarget() } });
  };

  const ensureAuthenticated = () => {
    if (!authState.isAuthenticated) {
      redirectToAuth();
      return false;
    }
    return true;
  };

  const handleSettings = () => {
    if (!ensureAuthenticated()) return;
    setShowSettings(true);
  };

  const handleProfile = () => {
    if (!ensureAuthenticated()) return;
    navigate('/profile');
  };

  const handleLogin = () => {
    redirectToAuth();
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {showNavbar && (
        <NetflixNavbar
          currentView="home"
          onViewChange={() => {}}
          onHome={handleHome}
          onSettings={handleSettings}
          onProfile={handleProfile}
          isAuthenticated={authState.isAuthenticated}
          userProfile={authState.user ? {
            name: authState.user.name,
            email: authState.user.email || '',
            avatar: authState.user.avatar,
            isPremium: false // No premium system in open source version
          } : undefined}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      )}
      
      <main className={showNavbar ? "pt-20" : ""}>
        {children}
      </main>
      
      {showFooter && (
        <Footer 
          onProfileClick={handleProfile}
          onSettingsClick={handleSettings}
          onLoginClick={handleLogin}
          isAuthenticated={authState.isAuthenticated}
          userProfile={authState.user ? {
            name: authState.user.name,
            email: authState.user.email || '',
            avatar: authState.user.avatar,
            isPremium: false
          } : undefined}
        />
      )}
      <NetflixScrollToTop />
      
      {/* Settings Modal */}
      <SettingsPage
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Profile Page */}
    </div>
  )
}

// Player Page Component
function PlayerPage() {
  const { mediaType, contentId, animeSlug } = useParams<{ 
    mediaType: string; 
    contentId: string; 
    animeSlug: string; 
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [content, setContent] = useState<ExtendedContentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [embedUrl, setEmbedUrl] = useState('');
  const [hasSubtitles, setHasSubtitles] = useState(false);
  const [subtitlesVisible, setSubtitlesVisible] = useState(false);
  const [subtitleTimerRunning, setSubtitleTimerRunning] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [uploadedSubtitle, setUploadedSubtitle] = useState<{ url: string; label: string } | null>(null);
  const [streamContext, setStreamContext] = useState<{ id: number | string; type: 'movie' | 'tv'; season?: number; episode?: number; resumeAt?: number | null } | null>(null);
  const [useVipStream, setUseVipStream] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(
    () => authService.getCurrentUser()?.preferences.autoplay ?? true
  );
  const seasonEpisodesRef = useRef<Record<number, EpisodeDetails[]>>({});
  const [seasonEpisodesVersion, setSeasonEpisodesVersion] = useState(0);
  const autoplayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayTriggerRef = useRef<{ key: string; triggered: boolean }>({ key: '', triggered: false });
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastKnownPositionRef = useRef(0);
  const lastKnownDurationRef = useRef<number | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showSettingsDropdown && !target.closest('.settings-dropdown')) {
        setShowSettingsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettingsDropdown]);

  useEffect(() => {
    const unsubscribe = authService.addListener((state) => {
      setAutoplayEnabled(state.user?.preferences.autoplay ?? true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadContent = async () => {
      try {
        setIsLoading(true);

        setStreamContext(null);
        setUseVipStream(false);
        setUploadedSubtitle(null);
        setHasSubtitles(false);
        setSubtitlesVisible(false);
        setSubtitleTimerRunning(false);
        subtitleService.setTrack(null);
        subtitleService.stop();
        seasonEpisodesRef.current = {};
        setSeasonEpisodesVersion(0);
        autoplayTriggerRef.current = { key: '', triggered: false };
        if (autoplayTimeoutRef.current) {
          clearTimeout(autoplayTimeoutRef.current);
          autoplayTimeoutRef.current = null;
        }

        // Handle anime content
        if (mediaType === 'anime' && animeSlug) {
          const animeData = location.state?.anime;
          const animeEmbedUrl = location.state?.embedUrl;

          if (animeData && animeEmbedUrl) {
            // Convert anime data to ContentItem format
            const animeContent: ExtendedContentItem = {
              id: animeData.id,
              tmdb_id: animeData.id,
              title: animeData.title,
              originalTitle: animeData.title_jp || animeData.title,
              type: 'tv' as const,
              year: animeData.year,
              releaseDate: animeData.year ? `${animeData.year}-01-01` : '',
              overview: animeData.description || '',
              poster: animeData.poster,
              backdropPath: animeData.cover || animeData.poster,
              rating: animeData.rating || 0,
              voteCount: 0,
              popularity: 0,
              genres: animeData.genres || [],
              genreIds: [],
              episodes: animeData.episodes,
              isAdult: false,
              similar: [],
              seasonUrls: null,
            };

            setContent(animeContent);
            setEmbedUrl(animeEmbedUrl);
          } else {
            // Fallback: try to get anime details from service
            const { animeService } = await import('@/services/anime-service');
            const animeDetails = await animeService.getAnimeDetails(animeSlug);

            if (animeDetails) {
              const animeContent = animeService.convertToContentItem(animeDetails) as ExtendedContentItem;
              animeContent.similar = [];
              animeContent.seasonUrls = null;
              setContent(animeContent);
              setEmbedUrl(animeDetails.streamUrl);
            } else {
              console.error('Anime not found:', animeSlug);
            }
          }
        }
        // Handle regular movie/TV content
        else if (contentId && mediaType && mediaType !== 'anime') {
          const data = await tmdbService.getDetails(parseInt(contentId), mediaType as 'movie' | 'tv') as ExtendedContentItem | null;
          if (data) {
            setContent(data);

            // Generate SuperEmbed URL using our streaming service
            const urlParams = new URLSearchParams(window.location.search);
            const seasonParam = urlParams.get('s') ?? urlParams.get('season');
            const episodeParam = urlParams.get('e') ?? urlParams.get('episode');
            const timeParam = urlParams.get('t') ?? urlParams.get('start') ?? urlParams.get('time');
            const seasonNumber = seasonParam ? Number(seasonParam) : undefined;
            const episodeNumber = episodeParam ? Number(episodeParam) : undefined;
            const resolvedSeason = seasonNumber ?? (data.type === 'tv' ? 1 : undefined);
            const resolvedEpisode = episodeNumber ?? (data.type === 'tv' ? 1 : undefined);
            const savedProgress = data.tmdb_id ? watchProgressService.getLatestProgress(data.tmdb_id, data.type) : null;
            let nextSeason = resolvedSeason;
            let nextEpisode = resolvedEpisode;

            if (savedProgress && data.type === 'tv' && !seasonNumber && !episodeNumber) {
              nextSeason = savedProgress.season ?? resolvedSeason;
              nextEpisode = savedProgress.episode ?? resolvedEpisode;
            }

            const parsedResume = timeParam ? Number(timeParam) : null;
            const resumeFromQuery = parsedResume !== null && !Number.isNaN(parsedResume) ? Math.max(0, parsedResume) : null;
            const resumeAt = resumeFromQuery ?? (savedProgress ? savedProgress.positionSeconds : null);

            if (resumeAt && resumeAt > 0) {
              lastKnownPositionRef.current = resumeAt;
            } else {
              lastKnownPositionRef.current = 0;
            }
            lastKnownDurationRef.current = savedProgress?.durationSeconds ?? null;

            setStreamContext({
              id: data.imdb_id ?? data.id,
              type: mediaType as 'movie' | 'tv',
              season: nextSeason,
              episode: nextEpisode,
              resumeAt,
            });
          }
        }
      } catch (error) {
        console.error('Error loading content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [contentId, mediaType, animeSlug, location.state]);

  useEffect(() => {
    if (!streamContext) {
      return;
    }

    const { id, type, season, episode, resumeAt } = streamContext;
    const extras: { useVip?: true; subtitle?: { url: string; label: string }; startTimeSeconds?: number; autoplay?: boolean } = {};

    if (uploadedSubtitle) {
      extras.subtitle = uploadedSubtitle;
    }

    if (useVipStream) {
      extras.useVip = true;
    }

    if (resumeAt && resumeAt > 0) {
      extras.startTimeSeconds = resumeAt;
      extras.autoplay = true;
    }

    const extrasArg = extras.subtitle || extras.useVip || extras.startTimeSeconds || extras.autoplay ? extras : undefined;
    const updatedUrl = tmdbService.getStreamingUrl(id, type, season, episode, extrasArg);
    setEmbedUrl(updatedUrl);
  }, [streamContext, uploadedSubtitle, useVipStream]);

  useEffect(() => {
    if (!content) {
      return;
    }

    const parsePayload = (payload: unknown): { currentTime: number | null; duration: number | null } | null => {
      const parseNumber = (value: unknown): number | null => {
        if (typeof value === 'number' && Number.isFinite(value)) {
          return value;
        }
        if (typeof value === 'string') {
          const parsed = Number(value);
          if (!Number.isNaN(parsed)) {
            return parsed;
          }
        }
        return null;
      };

      let data = payload;

      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          const numericMatch = (data as string).match(/\d+(?:\.\d+)?/g);
          if (numericMatch && numericMatch.length > 0) {
            const current = Number(numericMatch[0]);
            const duration = numericMatch.length > 1 ? Number(numericMatch[1]) : null;
            return {
              currentTime: Number.isNaN(current) ? null : current,
              duration: duration !== null && !Number.isNaN(duration) ? duration : null,
            };
          }
        }
      }

      if (typeof data === 'object' && data !== null) {
        const currentTime = parseNumber((data as Record<string, unknown>).currentTime
          ?? (data as Record<string, unknown>).time
          ?? (data as Record<string, unknown>).position
          ?? (data as Record<string, unknown>).current_seconds
          ?? (data as Record<string, unknown>).seconds);

        const duration = parseNumber((data as Record<string, unknown>).duration
          ?? (data as Record<string, unknown>).length
          ?? (data as Record<string, unknown>).total);

        if (currentTime !== null || duration !== null) {
          return { currentTime, duration };
        }
      }

      return null;
    };

    const handleMessage = (event: MessageEvent) => {
      const extracted = parsePayload(event.data);
      if (!extracted) {
        return;
      }

      const { currentTime, duration } = extracted;

      if (currentTime !== null) {
        lastKnownPositionRef.current = currentTime;
        setStreamContext((prev) => {
          if (!prev) {
            return prev;
          }
          if (!prev.resumeAt || Math.abs(prev.resumeAt - currentTime) >= 5) {
            return { ...prev, resumeAt: currentTime };
          }
          return prev;
        });
      }

      if (duration !== null) {
        lastKnownDurationRef.current = duration;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [content, streamContext?.season, streamContext?.episode]);

  useEffect(() => {
    if (!content) {
      return;
    }

    const isTv = content.type === 'tv';

    const persistProgress = (force = false) => {
      if (!content.tmdb_id) {
        return;
      }

      if (isTv && (!streamContext?.season || !streamContext?.episode)) {
        return;
      }

      const metadata = {
        tmdbId: content.tmdb_id,
        imdbId: content.imdb_id ?? undefined,
        mediaType: content.type,
        season: isTv ? streamContext?.season : undefined,
        episode: isTv ? streamContext?.episode : undefined,
        title: content.title,
        poster: content.poster ?? null,
        backdropPath: content.backdropPath ?? null,
        episodeTitle: null as string | null,
      };

      if (isTv && streamContext?.season && streamContext?.episode) {
        const episodes = seasonEpisodesRef.current[streamContext.season];
        const match = episodes?.find((ep) => ep.episodeNumber === streamContext.episode);
        metadata.episodeTitle = match?.name ?? null;
      }

      watchProgressService.updateProgress(metadata, {
        positionSeconds: lastKnownPositionRef.current,
        durationSeconds: lastKnownDurationRef.current ?? undefined,
        force,
      });
    };

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    progressIntervalRef.current = setInterval(() => persistProgress(false), 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistProgress(true);
      }
    };

    const handleBeforeUnload = () => {
      persistProgress(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      persistProgress(true);
    };
  }, [content, streamContext]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleExtractStreams = () => {
    alert('SuperEmbed uses a direct iframe player. Advanced stream extraction tools have been deprecated.');
  };

  const handleSelectStreamMode = (nextUseVip: boolean) => {
    setUseVipStream((prev) => {
      if (prev === nextUseVip) {
        return prev;
      }
      return nextUseVip;
    });
    setShowSettingsDropdown(false);
  };

  // Subtitle functions
  const handleUploadSubtitles = async (file: File) => {
    try {
      console.log('[subtitles] Uploading file:', file.name);
      const extension = file.name.split('.').pop()?.toLowerCase();
      const mime = extension === 'vtt' ? 'text/vtt' : 'application/x-subrip';
      const fileContent = await file.text();
      const encoder = new TextEncoder();
      const utf8Bytes = encoder.encode(fileContent);
      let binary = '';
      utf8Bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      const base64Content = btoa(binary);
      const dataUrl = `data:${mime};base64,${base64Content}`;

      const normalizedFile = new File([fileContent], file.name, { type: mime });
      const track = await subtitleService.loadSubtitleFile(normalizedFile);
      subtitleService.setTrack(track);

      setUploadedSubtitle({
        url: dataUrl,
        label: track.label || 'Custom Subtitles',
      });

      setHasSubtitles(true);
      setSubtitlesVisible(true);
      console.log('[subtitles] Ready and SuperEmbed URL updated:', track.label);
    } catch (error) {
      console.error('[subtitles] Error loading subtitles:', error);
      alert(error instanceof Error ? error.message : 'Failed to load subtitle file');
    }
  };
  const handleToggleSubtitles = () => {
    setSubtitlesVisible(!subtitlesVisible);
  };

  const handleStartSubtitleTimer = () => {
    subtitleService.startAutoTimer();
    setSubtitleTimerRunning(true);
  };

  const handleStopSubtitleTimer = () => {
    subtitleService.stop();
    setSubtitleTimerRunning(false);
  };

  const storeSeasonEpisodes = useCallback((season: number, episodes: EpisodeDetails[]) => {
    seasonEpisodesRef.current = { ...seasonEpisodesRef.current, [season]: episodes };
    setSeasonEpisodesVersion((version) => version + 1);
  }, []);

  const getSeasonEpisodes = useCallback(async (season: number) => {
    if (!content || content.type !== 'tv') {
      return [];
    }

    const cached = seasonEpisodesRef.current[season];
    if (cached) {
      return cached;
    }

    try {
      const details = await tmdbService.getSeasonDetails(content.tmdb_id, season);
      if (details?.episodes?.length) {
        storeSeasonEpisodes(season, details.episodes);
        return details.episodes;
      }
    } catch (error) {
      console.error('[autoplay] Failed to load season details:', error);
    }

    return [];
  }, [content, storeSeasonEpisodes]);

  const similarMovies = useMemo(() => {
    if (!content) {
      return [] as ContentItem[];
    }

    return (content.similar ?? []).filter(
      (item) => item.type === 'movie' && item.tmdb_id !== content.tmdb_id
    );
  }, [content]);

  const similarTvShows = useMemo(() => {
    if (!content) {
      return [] as ContentItem[];
    }

    return (content.similar ?? []).filter(
      (item) => item.type === 'tv' && item.tmdb_id !== content.tmdb_id
    );
  }, [content]);

  const getRecommendedMovie = useCallback(async () => {
    if (!content) {
      return null;
    }

    if (similarMovies.length > 0) {
      return similarMovies[0];
    }

    try {
      const popular = await tmdbService.getPopular('movie', 1, 10);
      return popular.results.find((item) => item.tmdb_id !== content.tmdb_id) ?? null;
    } catch (error) {
      console.error('[autoplay] Failed to load fallback movie recommendation:', error);
      return null;
    }
  }, [content, similarMovies]);

  const getRecommendedTvShow = useCallback(async () => {
    if (!content) {
      return null;
    }

    if (similarTvShows.length > 0) {
      return similarTvShows[0];
    }

    try {
      const popular = await tmdbService.getPopular('tv', 1, 10);
      return popular.results.find((item) => item.tmdb_id !== content.tmdb_id) ?? null;
    } catch (error) {
      console.error('[autoplay] Failed to load fallback TV recommendation:', error);
      return null;
    }
  }, [content, similarTvShows]);

  const updateEpisodeContext = useCallback((seasonNumber: number, episodeNumber: number) => {
    if (!content) {
      return;
    }

    const streamId = streamContext?.id ?? content.imdb_id ?? content.id;
    const savedProgress = content.tmdb_id
      ? watchProgressService.getProgress({ tmdbId: content.tmdb_id, mediaType: 'tv', season: seasonNumber, episode: episodeNumber })
      : null;

    lastKnownPositionRef.current = savedProgress?.positionSeconds ?? 0;
    lastKnownDurationRef.current = savedProgress?.durationSeconds ?? null;

    setStreamContext({
      id: streamId,
      type: 'tv',
      season: seasonNumber,
      episode: episodeNumber,
      resumeAt: savedProgress?.positionSeconds ?? null,
    });

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('s', String(seasonNumber));
    searchParams.set('e', String(episodeNumber));
    if (savedProgress?.positionSeconds) {
      searchParams.set('t', Math.floor(savedProgress.positionSeconds).toString());
    } else {
      searchParams.delete('t');
    }
    navigate(`/watch/${content.type}/${content.tmdb_id}?${searchParams.toString()}`, { replace: true });
  }, [content, navigate, streamContext]);

  const handleAutoplayAdvance = useCallback(async () => {
    if (!autoplayEnabled || !content) {
      return;
    }

    if (content.type === 'movie') {
      const nextMovie = await getRecommendedMovie();
      if (nextMovie) {
        navigate(`/watch/${nextMovie.type}/${nextMovie.tmdb_id}`, { replace: false, state: { autoplay: true } });
      } else {
        console.warn('[autoplay] No recommended movie available.');
      }
      return;
    }

    const currentSeason = streamContext?.season ?? 1;
    const currentEpisode = streamContext?.episode ?? 1;

    const episodes = await getSeasonEpisodes(currentSeason);
    if (episodes.length > 0) {
      const sortedEpisodes = [...episodes].sort((a, b) => a.episodeNumber - b.episodeNumber);
      const currentIndex = sortedEpisodes.findIndex((episode) => episode.episodeNumber === currentEpisode);
      if (currentIndex > -1 && currentIndex < sortedEpisodes.length - 1) {
        const nextEpisode = sortedEpisodes[currentIndex + 1];
        if (nextEpisode) {
          updateEpisodeContext(nextEpisode.seasonNumber ?? currentSeason, nextEpisode.episodeNumber);
          return;
        }
      }
    }

    const totalSeasons = content.seasons ?? 0;
    if (totalSeasons && currentSeason < totalSeasons) {
      const nextSeasonNumber = currentSeason + 1;
      const nextSeasonEpisodes = await getSeasonEpisodes(nextSeasonNumber);
      if (nextSeasonEpisodes.length > 0) {
        const firstEpisode = [...nextSeasonEpisodes].sort((a, b) => a.episodeNumber - b.episodeNumber)[0];
        if (firstEpisode) {
          updateEpisodeContext(firstEpisode.seasonNumber ?? nextSeasonNumber, firstEpisode.episodeNumber);
          return;
        }
      }
    }

    const nextShow = await getRecommendedTvShow();
    if (nextShow) {
      navigate(`/watch/${nextShow.type}/${nextShow.tmdb_id}`, { replace: false, state: { autoplay: true } });
    } else {
      console.warn('[autoplay] No recommended TV show available.');
    }
  }, [autoplayEnabled, content, getRecommendedMovie, getRecommendedTvShow, getSeasonEpisodes, navigate, streamContext, updateEpisodeContext]);

  const triggerAutoplayAdvance = useCallback(() => {
    if (!autoplayEnabled || !content || !embedUrl) {
      return;
    }

    if (autoplayTriggerRef.current.key !== embedUrl) {
      autoplayTriggerRef.current = { key: embedUrl, triggered: false };
    }

    if (autoplayTriggerRef.current.triggered) {
      return;
    }

    autoplayTriggerRef.current.triggered = true;

    if (autoplayTimeoutRef.current) {
      clearTimeout(autoplayTimeoutRef.current);
      autoplayTimeoutRef.current = null;
    }

    void handleAutoplayAdvance();
  }, [autoplayEnabled, content, embedUrl, handleAutoplayAdvance]);

  useEffect(() => {
    if (!content || content.type !== 'tv') {
      return;
    }

    const seasonToLoad = streamContext?.season ?? 1;
    void getSeasonEpisodes(seasonToLoad);

    if (content.seasons && seasonToLoad < content.seasons) {
      void getSeasonEpisodes(seasonToLoad + 1);
    }
  }, [content, getSeasonEpisodes, streamContext?.season]);

  useEffect(() => {
    if (!embedUrl) {
      return;
    }

    autoplayTriggerRef.current = { key: embedUrl, triggered: false };

    return () => {
      autoplayTriggerRef.current = { key: '', triggered: false };
    };
  }, [embedUrl]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!autoplayEnabled) {
        return;
      }

      const candidates: string[] = [];
      if (typeof event.data === 'string') {
        candidates.push(event.data);
      } else if (typeof event.data === 'object' && event.data !== null) {
        ['event', 'type', 'action', 'state', 'status'].forEach((key) => {
          const value = (event.data as Record<string, unknown>)[key];
          if (typeof value === 'string') {
            candidates.push(value);
          }
        });
      }

      if (
        candidates.some((value) => {
          const normalized = value.toLowerCase();
          return normalized.includes('ended') || normalized.includes('finished') || normalized.includes('complete');
        })
      ) {
        triggerAutoplayAdvance();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [autoplayEnabled, triggerAutoplayAdvance]);

  useEffect(() => {
    if (autoplayTimeoutRef.current) {
      clearTimeout(autoplayTimeoutRef.current);
      autoplayTimeoutRef.current = null;
    }

    if (!autoplayEnabled || !content || !embedUrl) {
      return;
    }

    let runtimeMinutes: number | null = null;

    if (content.type === 'movie') {
      runtimeMinutes = content.runtime ?? null;
    } else {
      const currentSeason = streamContext?.season ?? 1;
      const currentEpisode = streamContext?.episode ?? 1;
      const currentEpisodes = seasonEpisodesRef.current[currentSeason];
      const currentEpisodeDetails = currentEpisodes?.find((episode) => episode.episodeNumber === currentEpisode);
      runtimeMinutes = currentEpisodeDetails?.runtime ?? content.runtime ?? null;
    }

    if (!runtimeMinutes || runtimeMinutes <= 0) {
      runtimeMinutes = content.type === 'movie' ? 120 : 45;
    }

    const bufferMs = 30 * 1000;
    const timeoutMs = runtimeMinutes * 60 * 1000 + bufferMs;

    autoplayTimeoutRef.current = setTimeout(() => {
      triggerAutoplayAdvance();
    }, timeoutMs);

    return () => {
      if (autoplayTimeoutRef.current) {
        clearTimeout(autoplayTimeoutRef.current);
        autoplayTimeoutRef.current = null;
      }
    };
  }, [autoplayEnabled, content, embedUrl, seasonEpisodesVersion, streamContext, triggerAutoplayAdvance]);

  useEffect(() => {
    return () => {
      if (autoplayTimeoutRef.current) {
        clearTimeout(autoplayTimeoutRef.current);
        autoplayTimeoutRef.current = null;
      }
    };
  }, []);

  const handleToggleAutoplay = async () => {
    const nextValue = !autoplayEnabled;
    setAutoplayEnabled(nextValue);

    try {
      await authService.updatePreferences({ autoplay: nextValue });
    } catch (error) {
      console.error('[autoplay] Failed to update autoplay preference:', error);
      setAutoplayEnabled(!nextValue);
    }
  };

  const streamQualityLabel = useVipStream ? 'VIP Stream' : 'Standard Stream';
  const streamQualityIndicatorClass = useVipStream
    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
    : 'bg-slate-700/40 text-slate-200 border border-slate-500/50';

  if (isLoading) {
    return (
      <Layout showNavbar={false} showFooter={false}>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-white">Loading content...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!content) {
    return (
      <Layout showNavbar={false} showFooter={false}>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-white text-2xl mb-4">Content Not Found</h1>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout showNavbar={false} showFooter={false}>
      <div className="min-h-screen bg-black text-white">
        {/* Header Controls */}
        <div className="relative z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleBack}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Button>
              
              {/* Settings Dropdown */}
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-semibold tracking-wide px-3 py-1 rounded-full ${streamQualityIndicatorClass}`}
                >
                  {streamQualityLabel}
                </span>
                <div className="relative settings-dropdown">
                  <Button
                    onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                    variant="outline"
                    size="sm"
                    className="text-white border-slate-400 bg-slate-900/30 hover:bg-slate-700/40 hover:border-slate-300 font-medium"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Stream Settings
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>

                  {showSettingsDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl z-50">
                      <div className="p-2 space-y-1">
                        <Button
                          onClick={() => {
                            handleExtractStreams();
                            setShowSettingsDropdown(false);
                          }}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-white hover:bg-green-700/40 hover:text-green-300"
                        >
                          SuperEmbed Integration Info
                        </Button>
                        <Button
                          onClick={() => handleSelectStreamMode(true)}
                          variant="ghost"
                          size="sm"
                          disabled={useVipStream}
                          className="w-full justify-start text-white hover:bg-emerald-700/40 hover:text-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {useVipStream ? 'VIP Stream Active' : 'Switch to VIP Stream'}
                        </Button>
                        <Button
                          onClick={() => handleSelectStreamMode(false)}
                          variant="ghost"
                          size="sm"
                          disabled={!useVipStream}
                          className="w-full justify-start text-white hover:bg-slate-700/40 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {useVipStream ? 'Switch to Standard Stream' : 'Standard Stream Active'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Subtitle Controls */}
              <SubtitleControls
                onUploadSubtitles={handleUploadSubtitles}
                onToggleSubtitles={handleToggleSubtitles}
                onStartTimer={handleStartSubtitleTimer}
                onStopTimer={handleStopSubtitleTimer}
                hasSubtitles={hasSubtitles}
                isVisible={subtitlesVisible}
                isTimerRunning={subtitleTimerRunning}
                activeSubtitleLabel={uploadedSubtitle?.label}
              />

              <Button
                onClick={handleToggleAutoplay}
                variant="outline"
                size="sm"
                aria-pressed={autoplayEnabled}
                className={`flex items-center gap-2 text-white border-slate-400 bg-slate-900/30 hover:bg-slate-700/40 hover:border-slate-300 ${
                  autoplayEnabled ? 'border-emerald-400/60 bg-emerald-600/20 hover:bg-emerald-600/30' : ''
                }`}
              >
                <PlayCircle className="w-4 h-4" />
                Autoplay {autoplayEnabled ? 'On' : 'Off'}
              </Button>
            </div>

            <div className="text-right">
              <h1 className="text-xl font-bold">{content.title}</h1>
              <p className="text-sm text-slate-300">
                {content.year} • {content.type === 'movie' ? 'Movie' : 'TV Series'} • {content.rating}/10
              </p>
            </div>
          </div>
        </div>

        {/* Custom Video Player Container */}
        <div className="relative w-full" style={{ height: 'calc(100vh - 80px)' }}>
          <CustomVideoPlayer
            embedUrl={embedUrl}
            title={content.title}
            onBack={handleBack}
            onExtractStreams={handleExtractStreams}
            subtitlesVisible={subtitlesVisible}
            hasSubtitles={hasSubtitles}
          />
        </div>
      </div>
    </Layout>
  )
}

// Main App Component
function MainApp() {
  const [showWelcome, setShowWelcome] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if setup is needed
    const checkSetup = () => {
      const isSetupCompleted = settingsService.isSetupCompleted;
      if (!isSetupCompleted) {
        setShowWelcome(true);
      }
    };

    checkSetup();
  }, []);

  const handlePlayContent = (content: ContentItem, options?: PlaybackOptions) => {
    const params = new URLSearchParams();

    if (options?.season) {
      params.set('s', options.season.toString());
    }

    if (options?.episode) {
      params.set('e', options.episode.toString());
    }

    if (options?.resumeAt) {
      params.set('t', Math.floor(options.resumeAt).toString());
    }

    const query = params.toString();
    const path = `/watch/${content.type}/${content.tmdb_id}`;
    navigate(query ? `${path}?${query}` : path);
  };

  const handleCloseWelcome = () => {
    setShowWelcome(false);
  };

  const handleOpenSettings = () => {
    setShowWelcome(false);
    window.dispatchEvent(new CustomEvent('streall-open-settings'));
  };

  const renderWithLayout = (content: ReactNode, layoutOptions?: { showNavbar?: boolean; showFooter?: boolean }) => (
    <RequireAuth>
      <Layout
        showNavbar={layoutOptions?.showNavbar ?? true}
        showFooter={layoutOptions?.showFooter ?? true}
      >
        {content}
      </Layout>
    </RequireAuth>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Routes>
        {/* Home Page */}
        <Route
          path="/"
          element={renderWithLayout(
            <>
                          <NetflixHero onPlayContent={handlePlayContent} />
                          <ContentRows />
                          <AnimeSection />
                        </>
          )}
        />

        <Route path="/auth" element={<AuthPage />} />

        <Route
          path="/profile"
          element={renderWithLayout(<ProfilePage />, { showFooter: false })}
        />

        {/* Search Page */}
        <Route
          path="/search"
          element={renderWithLayout(
            <ContentSearch onPlayContent={handlePlayContent} />
          )}
        />

        {/* Ultra Search Page */}
        <Route
          path="/ultra-search"
          element={renderWithLayout(
            <UltraSearch />
          )}
        />

        {/* Browse Page */}
        <Route
          path="/browse"
          element={renderWithLayout(
            <AllContentBrowser />
          )}
        />

        {/* Browse Movies */}
        <Route
          path="/movies"
          element={renderWithLayout(
            <AllContentBrowser
                          defaultFilter={{ type: 'movie' }}
                          title="Movies"
                          description="Explore our extensive collection of movies"
                        />
          )}
        />

        {/* Browse TV Shows */}
        <Route
          path="/tv"
          element={renderWithLayout(
            <AllContentBrowser
                          defaultFilter={{ type: 'tv' }}
                          title="TV Shows"
                          description="Discover amazing TV series and shows"
                        />
          )}
        />

        {/* Anime Page */}
        <Route
          path="/anime"
          element={renderWithLayout(
            <AnimePage />
          )}
        />

        {/* Movie Suggestions */}
        <Route
          path="/suggestions"
          element={renderWithLayout(
            <MovieSuggestions />
          )}
        />

        {/* Watchlist */}
        <Route
          path="/watchlist"
          element={renderWithLayout(
            <WatchlistView onPlayContent={handlePlayContent} />
          )}
        />

        {/* Player Page */}
        <Route
          path="/watch/:mediaType/:contentId"
          element={<RequireAuth><PlayerPage /></RequireAuth>}
        />

        {/* Anime Player Page */}
        <Route
          path="/watch/anime/:animeSlug"
          element={<RequireAuth><PlayerPage /></RequireAuth>}
        />

        {/* Content Details Page */}
        <Route
          path="/details/:mediaType/:contentId"
          element={renderWithLayout(
            <ContentDetails />
          )}
        />

        {/* Changelog Page */}
        <Route
          path="/changelog"
          element={renderWithLayout(
            <ChangelogPage />
          )}
        />

        {/* Specific Changelog Version */}
        <Route
          path="/changelog/:version"
          element={renderWithLayout(
            <ChangelogPage />
          )}
        />

        {/* Catch all redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={showWelcome}
        onClose={handleCloseWelcome}
        onOpenSettings={handleOpenSettings}
      />
      <NetflixToast />
    </div>
  );
}

function App() {
  return (
    <Router>
      <MainApp />
    </Router>
  );
}

export default App;





