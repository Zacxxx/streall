import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
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
import { ProfilePage } from '@/components/profile-page'
import { tmdbService, type ContentItem } from '@/services/tmdb-service'
import { authService } from '@/services/auth-service'
import { settingsService } from '@/services/settings-service'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ArrowLeft, User, Settings, ChevronDown } from 'lucide-react'
import { ContentDetails } from '@/components/content-details'
import { CustomVideoPlayer } from '@/components/custom-video-player'
import { SubtitleControls } from '@/components/subtitle-overlay'
import { subtitleService } from '@/services/subtitle-service'
import { StreamExtractor } from '@/utils/stream-extractor'
import { DynamicStreamCapture } from '@/utils/dynamic-stream-capture'
import { DirectStreamUrls } from '@/utils/direct-stream-urls'
import { RealStreamExtractor } from '@/utils/real-stream-extractor'
import { RedirectFollower } from '@/utils/redirect-follower'
import { StreamCapture } from '@/utils/stream-capture'
import { StreamInjector } from '@/utils/stream-injector'
import { ChangelogPage } from '@/components/changelog-page'

// Layout wrapper for consistent header/footer
function Layout({ children, showNavbar = true, showFooter = true }: { 
  children: React.ReactNode, 
  showNavbar?: boolean, 
  showFooter?: boolean 
}) {
  const navigate = useNavigate()
  const [showSettings, setShowSettings] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showCreateProfile, setShowCreateProfile] = useState(false)
  const [authState, setAuthState] = useState(authService.getCurrentAuthState())

  // Profile creation form
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: ''
  })

  useEffect(() => {
    // Listen for auth state changes
    const checkAuthState = () => {
      setAuthState(authService.getCurrentAuthState())
    }
    
    // Check auth state periodically (simple solution)
    const interval = setInterval(checkAuthState, 1000)
    return () => clearInterval(interval)
  }, [])



  const handleSearch = () => {
    navigate('/search')
  }

  const handleHome = () => {
    navigate('/')
  }

  const handleSettings = () => {
    setShowSettings(true)
  }

  const handleProfile = () => {
    if (authState.isAuthenticated) {
      setShowProfile(true)
    } else {
      setShowCreateProfile(true)
    }
  }

  const handleLogin = () => {
    if (authState.user && !authState.isAuthenticated) {
      // User exists but not logged in
      authService.login()
      setAuthState(authService.getCurrentAuthState())
    } else {
      // No user profile exists
      setShowCreateProfile(true)
    }
  }

  const handleLogout = () => {
    authService.logout()
    setAuthState(authService.getCurrentAuthState())
  }

  const handleCreateProfile = () => {
    if (!profileForm.name.trim()) return

    const user = authService.createProfile(
      profileForm.name,
      profileForm.email || undefined
    )

    if (user) {
      setAuthState(authService.getCurrentAuthState())
      setShowCreateProfile(false)
      setProfileForm({ name: '', email: '' })
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {showNavbar && (
        <NetflixNavbar
          currentView="home"
          onViewChange={() => {}}
          onSearch={handleSearch}
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
      <ProfilePage
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />

      {/* Create Profile Modal */}
      <Dialog open={showCreateProfile} onOpenChange={setShowCreateProfile}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Create Your Profile
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-400">
              Create a local profile to save your watchlist and preferences. No registration required!
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Name *</label>
                <Input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter your name"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Email (Optional)</label>
                <Input
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter your email"
                  type="email"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleCreateProfile}
                disabled={!profileForm.name.trim()}
                className="bg-red-600 hover:bg-red-700 text-white flex-1"
              >
                Create Profile
              </Button>
              <Button
                onClick={() => {
                  setShowCreateProfile(false)
                  setProfileForm({ name: '', email: '' })
                }}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
            </div>

            <div className="text-xs text-gray-500 text-center">
              <p>✨ No registration required</p>
              <p>🔒 All data stored locally on your device</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Player Page Component
function PlayerPage() {
  const { mediaType, contentId } = useParams<{ mediaType: string; contentId: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [embedUrl, setEmbedUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [hasSubtitles, setHasSubtitles] = useState(false);
  const [subtitlesVisible, setSubtitlesVisible] = useState(false);
  const [subtitleTimerRunning, setSubtitleTimerRunning] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  
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
      if (!contentId || !mediaType) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await tmdbService.getDetails(parseInt(contentId), mediaType as 'movie' | 'tv');
        if (data) {
          setContent(data);
          
          // Generate 2embed URL using our tmdbService
          const baseUrl = 'https://www.2embed.cc';
          let url = '';
          
          if (mediaType === 'movie') {
            url = `${baseUrl}/embed/${contentId}`;
          } else if (mediaType === 'tv') {
            // Get season and episode from URL params
            const urlParams = new URLSearchParams(window.location.search);
            const season = urlParams.get('s') || '1';
            const episode = urlParams.get('e') || '1';
            // Fix: Use correct 2embed URL format with & separator
            url = `${baseUrl}/embedtv/${contentId}&s=${season}&e=${episode}`;
          }
          
          setEmbedUrl(url);
        }
      } catch (error) {
        console.error('Error loading content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [contentId, mediaType]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleExtractStreams = async () => {
    console.log('🎬 Enhanced 2embed.cc stream extraction from:', embedUrl);
    setIsExtracting(true);
    
    try {
      // Step 1: Use our enhanced StreamExtractor for 2embed.cc
      console.log('🎯 Step 1: Enhanced 2embed.cc extraction...');
      const extractedStreams = await StreamExtractor.extractStreamsFromUrl(embedUrl);
      
      if (extractedStreams && extractedStreams.sources.length > 0) {
        console.log(`✅ Enhanced extraction found ${extractedStreams.sources.length} stream sources`);
        console.log('🎯 Stream sources:', extractedStreams.sources);
        
        // Sort sources by preference (HLS > MP4 > WebM > etc.)
        const sortedSources = StreamExtractor.sortSourcesByPreference(extractedStreams.sources);
        
        // Display results to user
        const bestSource = sortedSources[0];
        if (bestSource) {
          console.log('🏆 Best source selected:', bestSource);
          
          // Show success message with stream details
          alert(`✅ Stream extraction successful!\n\nFound ${sortedSources.length} sources\nBest quality: ${bestSource.type.toUpperCase()} - ${bestSource.quality}\n\nCheck console for full details.`);
        } else {
          alert(`✅ Stream extraction successful!\n\nFound ${sortedSources.length} sources\nCheck console for full details.`);
        }
        
        setIsExtracting(false);
        return;
      }

      // Step 2: Fallback to dynamic capture
      console.log('🔄 Step 2: Dynamic stream capture fallback...');
      const dynamicResult = await DynamicStreamCapture.captureRealStreams(embedUrl);
      
      if (dynamicResult.success && dynamicResult.streams.length > 0) {
        console.log(`✅ Dynamic capture found ${dynamicResult.streams.length} real stream URLs`);
        console.log('🎯 Captured streams:', dynamicResult.streams);
        
        const sortedDynamicStreams = DynamicStreamCapture.sortStreamsByPreference(dynamicResult.streams);
        const bestDynamic = sortedDynamicStreams[0];
        
        if (bestDynamic) {
          alert(`✅ Dynamic capture successful!\n\nFound ${sortedDynamicStreams.length} streams\nBest: ${bestDynamic.type.toUpperCase()} - ${bestDynamic.quality}\n\nCheck console for details.`);
        } else {
          alert(`✅ Dynamic capture successful!\n\nFound ${sortedDynamicStreams.length} streams\nCheck console for details.`);
        }
        
        setIsExtracting(false);
        return;
      }

      // Step 3: Extract TMDB ID and use advanced methods
      const tmdbIdMatch = embedUrl.match(/\/(\d+)$/);
      if (tmdbIdMatch) {
        const tmdbId = tmdbIdMatch[1];
        if (!tmdbId) {
          console.log('❌ Could not extract valid TMDB ID');
        } else {
          console.log('🎬 Step 3: Using TMDB ID for advanced extraction:', tmdbId);

          // Try direct stream URLs from HAR analysis
          console.log('🔄 Step 3a: Direct stream URLs from HAR analysis...');
          const directStreams = await DirectStreamUrls.getWorkingStreams(tmdbId, 'movie');
          
          if (directStreams.length > 0) {
            console.log(`✅ Found ${directStreams.length} direct stream URLs`);
            const sortedDirectStreams = DirectStreamUrls.sortStreamsByPreference(directStreams);
            const bestDirect = sortedDirectStreams[0];
            
            if (bestDirect) {
              alert(`✅ Direct streams found!\n\nProvider: ${bestDirect.provider}\nQuality: ${bestDirect.quality}\nStreams: ${directStreams.length}\n\nCheck console for URLs.`);
            } else {
              alert(`✅ Direct streams found!\n\nStreams: ${directStreams.length}\n\nCheck console for URLs.`);
            }
            
            setIsExtracting(false);
            return;
          }

          // Try real stream extractor with iframe monitoring
          console.log('🔄 Step 3b: Real streaming infrastructure...');
          const providerResults = await RealStreamExtractor.extractFromTMDBId(tmdbId, 'movie');
          
          if (providerResults.length > 0) {
            console.log(`✅ Found ${providerResults.length} streaming providers`);
            const realSources = RealStreamExtractor.getBestSources(providerResults);
            
            if (realSources.length > 0) {
              const bestReal = realSources[0];
              if (bestReal) {
                alert(`✅ Real streams extracted!\n\nProvider: ${bestReal.provider}\nType: ${bestReal.type.toUpperCase()}\nQuality: ${bestReal.quality}\n\nCheck console for details.`);
              } else {
                alert(`✅ Real streams extracted!\n\nSources: ${realSources.length}\n\nCheck console for details.`);
              }
              
              setIsExtracting(false);
              return;
            }
          }
        }
      }

      // Step 4: Redirect following fallback
      console.log('🔗 Step 4: Following redirect chain...');
      const redirectChain = await RedirectFollower.followRedirectChain(embedUrl);
      
      if (redirectChain.streamingProvider !== 'unknown' && redirectChain.streamingProvider !== 'error') {
        console.log('✅ Found streaming provider:', redirectChain.streamingProvider);
        console.log('🔗 Redirect chain:', redirectChain);
        
        const potentialUrls = RedirectFollower.generateStreamingUrls(redirectChain);
        
        if (potentialUrls.length > 0) {
          alert(`✅ Redirect analysis successful!\n\nProvider: ${redirectChain.streamingProvider}\nPotential URLs: ${potentialUrls.length}\n\nCheck console for details.`);
          
          setIsExtracting(false);
          return;
        }
      }
      
      // Step 5: Hybrid capture method
      console.log('🎬 Step 5: Hybrid network capture method...');
      const capturedStreams = await StreamCapture.captureStreamsFromEmbed(embedUrl);
      
      if (capturedStreams.length > 0) {
        console.log('✅ Hybrid capture found streams:', capturedStreams);
        const sortedCaptured = StreamCapture.sortStreamsByPreference(capturedStreams);
        const bestCaptured = sortedCaptured[0];
        
        if (bestCaptured) {
          alert(`✅ Hybrid capture successful!\n\nType: ${bestCaptured.type.toUpperCase()}\nQuality: ${bestCaptured.quality}\nStreams: ${capturedStreams.length}\n\nCheck console for URLs.`);
        } else {
          alert(`✅ Hybrid capture successful!\n\nStreams: ${capturedStreams.length}\n\nCheck console for URLs.`);
        }
        
        setIsExtracting(false);
        return;
      }
      
      // Step 6: JavaScript injection method (last resort)
      console.log('🎬 Step 6: JavaScript injection method...');
      const injectedStreams = await StreamInjector.extractStreamsWithInjection(embedUrl);
      
      if (injectedStreams.length > 0) {
        console.log('✅ JavaScript injection found streams:', injectedStreams);
        const bestInjected = injectedStreams[0];
        
        if (bestInjected) {
          alert(`✅ Injection method successful!\n\nType: ${bestInjected.type.toUpperCase()}\nQuality: ${bestInjected.quality || 'auto'}\nStreams: ${injectedStreams.length}\n\nCheck console for URLs.`);
        } else {
          alert(`✅ Injection method successful!\n\nStreams: ${injectedStreams.length}\n\nCheck console for URLs.`);
        }
        
        setIsExtracting(false);
        return;
      }

      // If all methods failed
      console.log('❌ All extraction methods failed');
      alert('❌ Stream extraction failed\n\nNo streams could be extracted using any of the 6 available methods.\n\nThis might be due to:\n- Changed embed service structure\n- Network restrictions\n- CORS policies\n\nPlease check the console for detailed logs.');
      
    } catch (error) {
      console.error('❌ Stream extraction error:', error);
      alert(`❌ Stream extraction error\n\n${error instanceof Error ? error.message : 'Unknown error occurred'}\n\nCheck console for details.`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Subtitle functions
  const handleUploadSubtitles = async (file: File) => {
    try {
      console.log('📄 Uploading subtitle file:', file.name);
      const track = await subtitleService.loadSubtitleFile(file);
      subtitleService.setTrack(track);
      setHasSubtitles(true);
      setSubtitlesVisible(true);
      console.log('✅ Subtitles loaded successfully:', track.label);
    } catch (error) {
      console.error('❌ Error loading subtitles:', error);
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
                  <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl z-50">
                    <div className="p-2">
                      <Button
                        onClick={() => {
                          handleExtractStreams();
                          setShowSettingsDropdown(false);
                        }}
                        disabled={isExtracting}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-white hover:bg-green-700/40 hover:text-green-300 disabled:opacity-50"
                      >
                        {isExtracting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Extracting...
                          </>
                        ) : (
                          <>
                            🎯 Enhanced 2embed.cc Extraction
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={() => {
                          // This will trigger the Try Direct Stream functionality in CustomVideoPlayer
                          const event = new CustomEvent('tryDirectStream');
                          window.dispatchEvent(event);
                          setShowSettingsDropdown(false);
                        }}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-white hover:bg-blue-700/40 hover:text-blue-300 mt-1"
                      >
                        🎯 Try Direct Stream
                      </Button>
                    </div>
                  </div>
                )}
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
    // Settings will be opened by the Layout component
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Routes>
        {/* Home Page */}
        <Route path="/" element={
          <Layout>
            <>
              <NetflixHero onPlayContent={handlePlayContent} />
              <ContentRows />
            </>
          </Layout>
        } />

        {/* Search Page */}
        <Route path="/search" element={
          <Layout>
            <ContentSearch onPlayContent={handlePlayContent} />
          </Layout>
        } />

        {/* Ultra Search Page */}
        <Route path="/ultra-search" element={
          <Layout>
            <UltraSearch />
          </Layout>
        } />

        {/* Browse Page */}
        <Route path="/browse" element={
          <Layout>
            <AllContentBrowser />
          </Layout>
        } />

        {/* Browse Movies */}
        <Route path="/movies" element={
          <Layout>
            <AllContentBrowser
              defaultFilter={{ type: 'movie' }}
              title="Movies"
              description="Explore our extensive collection of movies"
            />
          </Layout>
        } />

        {/* Browse TV Shows */}
        <Route path="/tv" element={
          <Layout>
            <AllContentBrowser
              defaultFilter={{ type: 'tv' }}
              title="TV Shows"
              description="Discover amazing TV series and shows"
            />
          </Layout>
        } />

        {/* Watchlist */}
        <Route path="/watchlist" element={
          <Layout>
            <WatchlistView onPlayContent={handlePlayContent} />
          </Layout>
        } />

        {/* Player Page */}
        <Route path="/watch/:mediaType/:contentId" element={<PlayerPage />} />

        {/* Content Details Page */}
        <Route path="/details/:mediaType/:contentId" element={
          <Layout showNavbar={true} showFooter={true}>
            <ContentDetails />
          </Layout>
        } />

        {/* Changelog Page */}
        <Route path="/changelog" element={
          <Layout showNavbar={true} showFooter={true}>
            <ChangelogPage />
          </Layout>
        } />

        {/* Specific Changelog Version */}
        <Route path="/changelog/:version" element={
          <Layout showNavbar={true} showFooter={true}>
            <ChangelogPage />
          </Layout>
        } />

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
