import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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
import { tmdbService, type ContentItem } from '@/services/tmdb-service'
import { authService } from '@/services/auth-service'
import { settingsService } from '@/services/settings-service'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Settings } from 'lucide-react'
import { ContentDetails } from '@/components/content-details'

// Layout wrapper for consistent header/footer
function Layout({ children, showNavbar = true, showFooter = true }: { 
  children: React.ReactNode, 
  showNavbar?: boolean, 
  showFooter?: boolean 
}) {
  const navigate = useNavigate()
  const [showSettings, setShowSettings] = useState(false)

  const handleSearch = () => {
    navigate('/search')
  }

  const handleHome = () => {
    navigate('/')
  }

  const handleSettings = () => {
    setShowSettings(true)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {showNavbar && (
        <NetflixNavbar
          currentView="home"
          onViewChange={() => {}}
          onSearch={handleSearch}
          onHome={handleHome}
          onSettings={settingsService.isDesktopApp ? handleSettings : undefined}
        />
      )}
      
      <main className={showNavbar ? "pt-20" : ""}>
        {children}
      </main>
      
      {showFooter && <Footer />}
      <NetflixScrollToTop />
      
      {/* Settings Modal */}
      <SettingsPage
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  )
}

// Player Page Component
function PlayerPage() {
  const { contentId, mediaType } = useParams<{ contentId: string; mediaType: string }>()
  const navigate = useNavigate()
  const [content, setContent] = useState<ContentItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Get season and episode from URL query parameters
  const urlParams = new URLSearchParams(window.location.search)
  const season = urlParams.get('s') ? parseInt(urlParams.get('s')!) : undefined
  const episode = urlParams.get('e') ? parseInt(urlParams.get('e')!) : undefined

  const loadContent = async (id: string, type: string) => {
    try {
      setIsLoading(true)
      
      // Use TMDB ID with the specified media type
      const numericId = parseInt(id)
      const contentData = await tmdbService.getDetails(numericId, type as 'movie' | 'tv')
      
      if (contentData) {
        setContent(contentData)
      } else {
        // If TMDB lookup fails, create minimal content for direct streaming
        const minimalContent: ContentItem = {
          id: numericId,
          tmdb_id: numericId,
          imdb_id: undefined,
          title: `Content ${id}`,
          originalTitle: `Content ${id}`,
          type: type as 'movie' | 'tv',
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
        }
        setContent(minimalContent)
      }
    } catch (error) {
      console.error('Error loading content:', error)
      // Create fallback content even on error to allow streaming attempt
      const fallbackContent: ContentItem = {
        id: parseInt(id) || 0,
        tmdb_id: parseInt(id) || 0,
        imdb_id: undefined,
        title: `Content ${id}`,
        originalTitle: `Content ${id}`,
        type: type as 'movie' | 'tv',
        year: null,
        releaseDate: '',
        overview: 'Error loading content details',
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
      }
      setContent(fallbackContent)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (contentId && mediaType) {
      loadContent(contentId, mediaType)
    }
  }, [contentId, mediaType])

  const handleBack = () => {
    navigate(-1)
  }

  const embedUrl = content ? 
    tmdbService.getStreamingUrl(content.tmdb_id, content.type, season, episode) : ''

  if (isLoading) {
    return (
      <Layout showNavbar={false} showFooter={false}>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-white text-lg">Loading content...</p>
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
        {/* Player Container */}
        <div className="relative w-full h-screen">
          {/* Header Controls */}
          <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-6">
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
              </div>

              <div className="text-right">
                <h1 className="text-xl font-bold">{content.title}</h1>
                <p className="text-sm text-slate-300">
                  {content.year} • {content.type === 'movie' ? 'Movie' : 'TV Series'} • {content.rating}/10
                </p>
              </div>
            </div>
          </div>

          {/* Direct Iframe - No Loading State */}
          <iframe
            src={embedUrl}
            className="w-full h-full"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen"
            title={content.title}
            style={{ background: '#000' }}
          />
        </div>
      </div>
    </Layout>
  )
}

// Main App Component
function MainApp() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [setupRequired, setSetupRequired] = useState(false)

  useEffect(() => {
    // Initialize app
    const initialize = async () => {
      try {
        // Check if user is already authenticated
        const authState = authService.getCurrentAuthState()
        if (authState.isAuthenticated && authState.user) {
          // User is authenticated
        }

        // Check for first-time setup (only for desktop)
        if (settingsService.isDesktopApp) {
          const isFirstLaunch = settingsService.isFirstLaunch
          const isSetupComplete = settingsService.isSetupCompleted
          
          if (isFirstLaunch && !isSetupComplete) {
            setShowWelcome(true)
            setSetupRequired(true)
          } else if (!isSetupComplete) {
            // Not first launch but setup incomplete
            setSetupRequired(true)
          }
        }
      } catch (error) {
        console.error('Authentication error:', error)
      } finally {
        setTimeout(() => {
          setIsLoading(false)
        }, 1500)
      }
    }

    initialize()
  }, [])

  const handlePlayContent = (content: ContentItem) => {
    // Use TMDB ID consistently with media type
    const contentId = content.tmdb_id;
    navigate(`/watch/${content.type}/${contentId}`)
  }

  const handleWelcomeClose = () => {
    setShowWelcome(false)
    settingsService.completeFirstLaunch()
  }

  const handleWelcomeOpenSettings = () => {
    setShowWelcome(false)
    setShowSettings(true)
    settingsService.completeFirstLaunch()
  }

  const handleSettingsClose = () => {
    setShowSettings(false)
    // Check if setup is now complete
    if (settingsService.isSetupCompleted) {
      setSetupRequired(false)
    }
  }

  const handleSetupComplete = () => {
    setShowSettings(false)
    setSetupRequired(false)
    // Optionally show a success message or refresh the app
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-6">
          <motion.div
            className="text-6xl font-black text-red-600"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            STREALL
          </motion.div>
          
          <motion.div
            className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full mx-auto"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          
          <motion.p
            className="text-slate-400 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Loading your streaming experience...
          </motion.p>
        </div>
      </div>
    )
  }

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

        {/* Redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* First-time setup modals - only for desktop */}
      {settingsService.isDesktopApp && (
        <>
          <WelcomeModal
            isOpen={showWelcome}
            onClose={handleWelcomeClose}
            onOpenSettings={handleWelcomeOpenSettings}
          />
          
          <SettingsPage
            isOpen={showSettings}
            onClose={handleSettingsClose}
            onSetupComplete={handleSetupComplete}
          />
        </>
      )}

      {/* Setup Required Warning */}
      {setupRequired && !showWelcome && !showSettings && (
        <div className="fixed bottom-4 right-4 z-50 bg-yellow-600 text-black p-4 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <div>
              <p className="font-semibold">Setup Required</p>
              <p className="text-sm">Configure your TMDB API key to access content.</p>
            </div>
          </div>
          <Button
            size="sm"
            className="mt-2 bg-yellow-700 hover:bg-yellow-800 text-white"
            onClick={() => setShowSettings(true)}
          >
            Open Settings
          </Button>
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <Router>
      <MainApp />
    </Router>
  )
}

export default App
