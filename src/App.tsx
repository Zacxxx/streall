import { useState, useEffect } from 'react'
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
import { NetflixScrollToTop } from '@/components/netflix-enhancement'
import { WelcomeModal } from '@/components/welcome-modal'
import { SettingsPage } from '@/components/settings-page'
import { AuthPage } from '@/pages/auth-page'
import { ProfilePage } from '@/pages/profile-page'
import { tmdbService, type ContentItem } from '@/services/tmdb-service'
import { authService } from '@/services/auth-service'
import { watchlistService } from '@/services/watchlist-service'
import { settingsService } from '@/services/settings-service'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Settings, ChevronDown } from 'lucide-react'
import { ContentDetails } from '@/components/content-details'
import { CustomVideoPlayer } from '@/components/custom-video-player'
import { SubtitleControls } from '@/components/subtitle-overlay'
import { subtitleService } from '@/services/subtitle-service'
import { ChangelogPage } from '@/components/changelog-page'
import { AnimePage } from '@/components/anime-page'
import { AnimeSection } from '@/components/anime-section'
import { MovieSuggestions } from '@/components/movie-suggestions'

function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [authState, setAuthState] = useState(authService.getCurrentAuthState());
  const [initialising, setInitialising] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.addListener((state) => {
      setAuthState(state);
      watchlistService.setUserContext(state.user?.id ?? null);
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
  const [content, setContent] = useState<ContentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [embedUrl, setEmbedUrl] = useState('');
  const [hasSubtitles, setHasSubtitles] = useState(false);
  const [subtitlesVisible, setSubtitlesVisible] = useState(false);
  const [subtitleTimerRunning, setSubtitleTimerRunning] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [uploadedSubtitle, setUploadedSubtitle] = useState<{ url: string; label: string } | null>(null);
  const [streamContext, setStreamContext] = useState<{ id: number | string; type: 'movie' | 'tv'; season?: number; episode?: number } | null>(null);
  const [useVipStream, setUseVipStream] = useState(false);
  
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

        // Handle anime content
        if (mediaType === 'anime' && animeSlug) {
          const animeData = location.state?.anime;
          const animeEmbedUrl = location.state?.embedUrl;
          
          if (animeData && animeEmbedUrl) {
            // Convert anime data to ContentItem format
            const animeContent: ContentItem = {
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
            };
            
            setContent(animeContent);
            setEmbedUrl(animeEmbedUrl);
          } else {
            // Fallback: try to get anime details from service
            const { animeService } = await import('@/services/anime-service');
            const animeDetails = await animeService.getAnimeDetails(animeSlug);
            
            if (animeDetails) {
              const animeContent: ContentItem = animeService.convertToContentItem(animeDetails);
              setContent(animeContent);
              setEmbedUrl(animeDetails.streamUrl);
            } else {
              console.error('Anime not found:', animeSlug);
            }
          }
        } 
        // Handle regular movie/TV content
        else if (contentId && mediaType && mediaType !== 'anime') {
          const data = await tmdbService.getDetails(parseInt(contentId), mediaType as 'movie' | 'tv');
          if (data) {
            setContent(data);
            
            // Generate SuperEmbed URL using our streaming service
            const urlParams = new URLSearchParams(window.location.search);
            const seasonParam = urlParams.get('s') ?? urlParams.get('season');
            const episodeParam = urlParams.get('e') ?? urlParams.get('episode');
            const seasonNumber = seasonParam ? Number(seasonParam) : undefined;
            const episodeNumber = episodeParam ? Number(episodeParam) : undefined;

            setStreamContext({
              id: data.imdb_id ?? data.id,
              type: mediaType as 'movie' | 'tv',
              season: seasonNumber,
              episode: episodeNumber
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

    const { id, type, season, episode } = streamContext;
    const extras: { useVip?: true; subtitle?: { url: string; label: string } } = {};

    if (uploadedSubtitle) {
      extras.subtitle = uploadedSubtitle;
    }

    if (useVipStream) {
      extras.useVip = true;
    }

    const extrasArg = extras.subtitle || extras.useVip ? extras : undefined;
    const updatedUrl = tmdbService.getStreamingUrl(id, type, season, episode, extrasArg);
    setEmbedUrl(updatedUrl);
  }, [streamContext, uploadedSubtitle, useVipStream]);

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

  const handlePlayContent = (content: ContentItem) => {
    // Navigate to player with the content
    window.location.href = `/watch/${content.type}/${content.tmdb_id}`;
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





