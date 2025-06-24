import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, ChevronDown, Grid, Heart, Settings, X } from 'lucide-react';
import { NotificationBell, Notifications } from '@/components/notifications';
import { tmdbService, type ContentItem } from '@/services/tmdb-service';

type View = 'home' | 'search' | 'player' | 'movies' | 'series' | 'trending' | 'watchlist';

interface NetflixNavbarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onHome: () => void;
  onSettings?: () => void;
  onProfile?: () => void;
  isAuthenticated?: boolean;
  userProfile?: {
    name: string;
    email: string;
    avatar?: string;
    isPremium?: boolean;
  };
  onLogin?: () => void;
  onLogout?: () => void;
}

export function NetflixNavbar({ 
  onHome, 
  onSettings,
  onProfile,
  isAuthenticated = false,
  userProfile,
  onLogin,
  onLogout
}: NetflixNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showInlineSearch, setShowInlineSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Advanced scroll tracking for glassmorphic effects
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 20;
      const progress = Math.min(window.scrollY / 100, 1);
      setIsScrolled(scrolled);
      setScrollProgress(progress);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Focus search input when inline search is shown
  useEffect(() => {
    if (showInlineSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showInlineSearch]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(() => {
      handleInlineSearch(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  // Handle search functionality
  const handleInlineSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      const response = await tmdbService.search(query, {}, 1, 6); // Limit to 6 results for dropdown
      setSearchResults(response.results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleSearchResultClick = (result: ContentItem) => {
    navigate(`/watch/${result.type}/${result.tmdb_id}`);
    setShowInlineSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleInlineSearchToggle = () => {
    if (showInlineSearch) {
      setShowInlineSearch(false);
      setSearchQuery('');
      setSearchResults([]);
    } else {
      setShowInlineSearch(true);
    }
  };

  // Handle Enter key for search
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowInlineSearch(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showInlineSearch && !target.closest('.inline-search-container')) {
        setShowInlineSearch(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showInlineSearch]);

  const navItems = [
    { id: 'home', label: 'Home', path: '/', view: 'home' as View },
    { id: 'browse', label: 'Browse All', path: '/browse', icon: Grid },
    { id: 'search', label: 'Search', path: '/search', icon: Search },
    { id: 'watchlist', label: 'My List', path: '/watchlist', icon: Heart, view: 'watchlist' as View },
    { id: 'movies', label: 'Movies', path: '/movies', view: 'movies' as View },
    { id: 'series', label: 'TV Shows', path: '/tv', view: 'series' as View }
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleProfileAction = (action: string) => {
    setShowProfileMenu(false);
    
    switch (action) {
      case 'profile':
        onProfile?.();
        break;
      case 'settings':
        onSettings?.();
        break;
      case 'login':
        onLogin?.();
        break;
      case 'logout':
        onLogout?.();
        break;
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out"
      style={{
        background: isScrolled 
          ? `rgba(0, 0, 0, ${0.85 + scrollProgress * 0.1})` 
          : 'linear-gradient(to bottom, rgba(0, 0, 0, 0.8), transparent)',
        backdropFilter: isScrolled ? `blur(${12 + scrollProgress * 8}px) saturate(1.5)` : 'none',
        WebkitBackdropFilter: isScrolled ? `blur(${12 + scrollProgress * 8}px) saturate(1.5)` : 'none',
        borderBottom: isScrolled 
          ? `1px solid rgba(255, 255, 255, ${0.05 + scrollProgress * 0.05})` 
          : 'none',
        boxShadow: isScrolled 
          ? `0 8px 32px rgba(0, 0, 0, ${0.3 + scrollProgress * 0.2})` 
          : 'none'
      }}
    >
      {/* Subtle animated background pattern */}
      {isScrolled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: scrollProgress * 0.05 }}
          className="absolute inset-0 bg-gradient-to-r from-red-900/5 via-transparent to-red-900/5"
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(239, 68, 68, 0.1) 0%, transparent 50%)',
          }}
        />
      )}
      
      <div className="relative flex items-center justify-between px-4 md:px-8 py-4">
        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="cursor-pointer flex-shrink-0"
          onClick={onHome}
        >
          <motion.h1 
            className="text-xl sm:text-2xl md:text-3xl font-black whitespace-nowrap text-red-500"
            style={{
              filter: isScrolled ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.3))' : 'none',
              minWidth: 'fit-content',
              textShadow: isScrolled ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none'
            }}
          >
            STREALL
          </motion.h1>
        </motion.div>

        {/* Navigation Links */}
        <div className="hidden lg:flex items-center space-x-6 xl:space-x-8 flex-1 justify-center max-w-2xl">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const ItemIcon = item.icon;
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`relative px-2 xl:px-3 py-2 text-sm font-medium transition-all duration-300 flex items-center gap-2 group whitespace-nowrap ${
                  active
                    ? 'text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {ItemIcon && (
                  <ItemIcon className={`w-4 h-4 transition-all duration-300 flex-shrink-0 ${
                    active ? 'text-red-400' : 'group-hover:text-red-400'
                  }`} />
                )}
                <span className="relative">
                  {item.label}
                  {/* Enhanced hover effect */}
                  <motion.span
                    className="absolute inset-0 rounded-md bg-white/5 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)'
                    }}
                  />
                </span>
                {active && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    style={{
                      boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
          {/* Search Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleInlineSearchToggle}
            className="p-2 text-slate-300 hover:text-white transition-all duration-300 rounded-full hover:bg-white/10 group"
            style={{
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
          >
            {showInlineSearch ? (
              <X className="w-5 h-5 group-hover:text-red-400 transition-colors" />
            ) : (
              <Search className="w-5 h-5 group-hover:text-red-400 transition-colors" />
            )}
          </motion.button>

          {/* Notifications */}
          <div className="hidden sm:block">
            <NotificationBell onClick={() => setShowNotifications(!showNotifications)} />
          </div>

          {/* Profile Menu */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-1 sm:space-x-2 text-slate-300 hover:text-white transition-all duration-300 p-2 rounded-full hover:bg-white/10"
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)'
              }}
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center shadow-lg">
                {isAuthenticated && userProfile?.avatar ? (
                  <img 
                    src={userProfile.avatar} 
                    alt={userProfile.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                )}
              </div>
              <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-300 ${showProfileMenu ? 'rotate-180' : ''}`} />
            </motion.button>

            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-2xl border border-white/10 overflow-hidden"
                style={{
                  background: 'rgba(0, 0, 0, 0.9)',
                  backdropFilter: 'blur(20px) saturate(1.5)',
                  WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
              >
                <div className="py-2">
                  {isAuthenticated && userProfile ? (
                    <>
                      {/* User Info Header */}
                      <div className="px-4 py-3 border-b border-slate-700/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center">
                            {userProfile.avatar ? (
                              <img 
                                src={userProfile.avatar} 
                                alt={userProfile.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">
                              {userProfile.name}
                            </p>
                            <p className="text-slate-400 text-xs truncate">
                              Local Profile
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Profile Actions */}
                      <motion.div
                        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        className="transition-colors duration-200"
                      >
                        <button 
                          onClick={() => handleProfileAction('profile')}
                          className="flex items-center gap-3 w-full px-4 py-3 text-left text-slate-300 hover:text-white transition-colors"
                        >
                          <User className="w-4 h-4" />
                          Profile
                        </button>
                      </motion.div>

                      {/* My List */}
                      <motion.div
                        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        className="transition-colors duration-200"
                      >
                        <Link
                          to="/watchlist"
                          className="flex items-center gap-3 w-full px-4 py-3 text-left text-slate-300 hover:text-white transition-colors"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          <Heart className="w-4 h-4" />
                          My List
                        </Link>
                      </motion.div>

                      {/* Settings */}
                      <motion.div
                        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        className="transition-colors duration-200"
                      >
                        <button 
                          onClick={() => handleProfileAction('settings')}
                          className="flex items-center gap-3 w-full px-4 py-3 text-left text-slate-300 hover:text-white transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </button>
                      </motion.div>
                      
                      <hr className="border-slate-700/50 my-2" />
                      
                      {/* Logout */}
                      <motion.button 
                        whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                        onClick={() => handleProfileAction('logout')}
                        className="w-full px-4 py-3 text-left text-slate-300 hover:text-red-400 transition-colors duration-200"
                      >
                        Sign Out
                      </motion.button>
                    </>
                  ) : (
                    <>
                      {/* Not authenticated - show login option */}
                      <motion.div
                        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        className="transition-colors duration-200"
                      >
                        <button 
                          onClick={() => handleProfileAction('login')}
                          className="flex items-center gap-3 w-full px-4 py-3 text-left text-slate-300 hover:text-white transition-colors"
                        >
                          <User className="w-4 h-4" />
                          Create Profile
                        </button>
                      </motion.div>

                      {/* Settings - Always available */}
                      <motion.div
                        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        className="transition-colors duration-200"
                      >
                        <button 
                          onClick={() => handleProfileAction('settings')}
                          className="flex items-center gap-3 w-full px-4 py-3 text-left text-slate-300 hover:text-white transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </button>
                      </motion.div>

                      {/* My List - Available even without profile */}
                      <motion.div
                        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        className="transition-colors duration-200"
                      >
                        <Link
                          to="/watchlist"
                          className="flex items-center gap-3 w-full px-4 py-3 text-left text-slate-300 hover:text-white transition-colors"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          <Heart className="w-4 h-4" />
                          My List
                        </Link>
                      </motion.div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="p-2 text-slate-300 hover:text-white transition-all duration-300 rounded-full hover:bg-white/10"
            style={{
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
          >
            <div className="w-6 h-6 flex flex-col justify-center space-y-1">
              <motion.div 
                className="w-full h-0.5 bg-current transition-all duration-300"
                animate={{ rotate: showProfileMenu ? 45 : 0, y: showProfileMenu ? 6 : 0 }}
              />
              <motion.div 
                className="w-full h-0.5 bg-current transition-all duration-300"
                animate={{ opacity: showProfileMenu ? 0 : 1 }}
              />
              <motion.div 
                className="w-full h-0.5 bg-current transition-all duration-300"
                animate={{ rotate: showProfileMenu ? -45 : 0, y: showProfileMenu ? -6 : 0 }}
              />
            </div>
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      {showProfileMenu && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden border-t border-white/10"
          style={{
            background: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(20px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.5)'
          }}
        >
          <div className="px-4 py-4 space-y-2">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const ItemIcon = item.icon;
              
              return (
                <motion.div
                  key={item.id}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                  className="rounded-lg overflow-hidden"
                >
                  <Link
                    to={item.path}
                    onClick={() => setShowProfileMenu(false)}
                    className={`block w-full text-left px-3 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                      active
                        ? 'text-white bg-red-600/20 border border-red-500/30'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {ItemIcon && <ItemIcon className="w-4 h-4" />}
                    {item.label}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
      
      {/* Inline Search Bar */}
      <AnimatePresence>
        {showInlineSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-t border-slate-700/50"
            style={{
              background: 'rgba(0, 0, 0, 0.95)',
              backdropFilter: 'blur(20px) saturate(1.5)',
              WebkitBackdropFilter: 'blur(20px) saturate(1.5)'
            }}
          >
            <div className="container mx-auto px-4 md:px-8 py-4 inline-search-container">
              <div className="max-w-2xl mx-auto">
                {/* Search Input */}
                <div className="relative">
                  <motion.input
                    ref={searchInputRef}
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search movies, TV shows, and more..."
                    className="w-full px-6 py-4 bg-slate-800/80 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg"
                    style={{
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)'
                    }}
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    {isSearching ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-slate-400 border-t-red-500 rounded-full"
                      />
                    ) : (
                      <Search className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Search Results */}
                <AnimatePresence>
                  {searchQuery && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-4 bg-slate-800/90 border border-slate-600 rounded-lg overflow-hidden"
                      style={{
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)'
                      }}
                    >
                      {searchResults.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto">
                          {searchResults.map((result, index) => (
                            <motion.div
                              key={result.tmdb_id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              onClick={() => handleSearchResultClick(result)}
                              className="px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors border-b border-slate-700 last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-white font-medium">{result.title}</h4>
                                                                      <p className="text-slate-400 text-sm">
                                      {result.type === 'movie' ? 'Movie' : 'TV Series'} • {result.year || 'N/A'}
                                    </p>
                                </div>
                                <div className="text-slate-500">
                                  <ChevronDown className="w-4 h-4 rotate-270" />
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : !isSearching && (
                        <div className="px-4 py-8 text-center text-slate-400">
                          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No results found for "{searchQuery}"</p>
                          <p className="text-sm mt-1">Try a different search term</p>
                        </div>
                      )}
                      
                      {/* Quick Actions */}
                      {searchQuery && (
                        <div className="px-4 py-3 bg-slate-900/50 border-t border-slate-700">
                          <button
                            onClick={() => {
                              navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                              setShowInlineSearch(false);
                              setSearchQuery('');
                              setSearchResults([]);
                            }}
                            className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                          >
                            View all results for "{searchQuery}" →
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Panel */}
      <Notifications 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />
    </motion.nav>
  );
} 