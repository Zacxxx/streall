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
import { ArrowLeft, User } from 'lucide-react'
import { ContentDetails } from '@/components/content-details'
import { CustomVideoPlayer } from '@/components/custom-video-player'

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
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
      if (!contentId || !mediaType) {
        navigate('/');
        return;
      }

      try {
        setIsLoading(true);
        
        // Get content details from TMDB
        let contentData: ContentItem | null = null;
        
        if (mediaType === 'movie') {
          contentData = await tmdbService.getDetails(parseInt(contentId), 'movie');
        } else if (mediaType === 'tv') {
          contentData = await tmdbService.getDetails(parseInt(contentId), 'tv');
        }

        if (!contentData) {
          console.error('Content not found');
          navigate('/');
          return;
        }

        setContent(contentData);

        // Generate embed URL using 2embed.cc
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
      } catch (error) {
        console.error('Error loading content:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [contentId, mediaType, navigate]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleExtractStreams = () => {
    setIsExtracting(true);
    // Call the extract function exposed by CustomVideoPlayer
    const windowWithExtract = window as Window & { extractStreamsFunction?: () => void };
    if (windowWithExtract.extractStreamsFunction) {
      windowWithExtract.extractStreamsFunction();
    }
    // Reset extracting state after a delay
    setTimeout(() => setIsExtracting(false), 3000);
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
              
              <Button
                onClick={handleExtractStreams}
                disabled={isExtracting}
                variant="outline"
                size="sm"
                className="text-white border-green-500 hover:bg-green-500/20 disabled:opacity-50"
              >
                {isExtracting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Extracting...
                  </>
                ) : (
                  <>
                    🎬 Dynamic Stream Capture
                  </>
                )}
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
