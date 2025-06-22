import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Bell, User, ChevronDown, Grid, Heart, Settings } from 'lucide-react';

type View = 'home' | 'search' | 'player' | 'movies' | 'series' | 'trending' | 'watchlist';

interface NetflixNavbarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onSearch: () => void;
  onHome: () => void;
  onSettings?: () => void;
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

export function NetflixNavbar({ onSearch, onHome, onSettings }: NetflixNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const location = useLocation();
  
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

  const navItems = [
    { id: 'home', label: 'Home', path: '/', view: 'home' as View },
    { id: 'browse', label: 'Browse All', path: '/browse', icon: Grid },
    { id: 'search', label: 'Search', path: '/search', icon: Search },
    { id: 'watchlist', label: 'My List', path: '/watchlist', icon: Heart, view: 'watchlist' as View },
    { id: 'movies', label: 'Movies', path: '/browse/movies', view: 'movies' as View },
    { id: 'series', label: 'TV Shows', path: '/browse/tv', view: 'series' as View }
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
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
          ? `1px solid rgba(255, 255, 255, ${0.1 + scrollProgress * 0.1})` 
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
          className="cursor-pointer"
          onClick={onHome}
        >
          <motion.h1 
            className="text-2xl md:text-3xl font-black"
            style={{
              background: isScrolled 
                ? 'linear-gradient(135deg, #ef4444, #dc2626, #b91c1c)' 
                : '#ef4444',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: isScrolled ? 'transparent' : '#ef4444',
              filter: isScrolled ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.3))' : 'none'
            }}
          >
            STREALL
          </motion.h1>
        </motion.div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const ItemIcon = item.icon;
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`relative px-3 py-2 text-sm font-medium transition-all duration-300 flex items-center gap-2 group ${
                  active
                    ? 'text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {ItemIcon && (
                  <ItemIcon className={`w-4 h-4 transition-all duration-300 ${
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
        <div className="flex items-center space-x-4">
          {/* Search Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onSearch}
            className="p-2 text-slate-300 hover:text-white transition-all duration-300 rounded-full hover:bg-white/10 group"
            style={{
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
          >
            <Search className="w-5 h-5 group-hover:text-red-400 transition-colors" />
          </motion.button>

          {/* Settings Button - Desktop Only */}
          {onSettings && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onSettings}
              className="p-2 text-slate-300 hover:text-white transition-all duration-300 rounded-full hover:bg-white/10 group"
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)'
              }}
              title="Settings"
            >
              <Settings className="w-5 h-5 group-hover:text-red-400 transition-colors" />
            </motion.button>
          )}

          {/* Notifications */}
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 text-slate-300 hover:text-white transition-all duration-300 rounded-full hover:bg-white/10 group relative"
            style={{
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
          >
            <Bell className="w-5 h-5 group-hover:text-red-400 transition-colors" />
            {/* Notification indicator */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-black"
              style={{
                boxShadow: '0 0 6px rgba(239, 68, 68, 0.8)'
              }}
            />
          </motion.button>

          {/* Profile Menu */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-2 text-slate-300 hover:text-white transition-all duration-300 p-2 rounded-full hover:bg-white/10"
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)'
              }}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showProfileMenu ? 'rotate-180' : ''}`} />
            </motion.button>

            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-2xl border border-white/10 overflow-hidden"
                style={{
                  background: 'rgba(0, 0, 0, 0.9)',
                  backdropFilter: 'blur(20px) saturate(1.5)',
                  WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
              >
                <div className="py-2">
                  {[
                    { label: 'Profile', icon: User },
                    { label: 'Settings', icon: null },
                    { label: 'My List', icon: Heart, path: '/watchlist' }
                  ].map((menuItem) => (
                    <motion.div
                      key={menuItem.label}
                      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                      className="transition-colors duration-200"
                    >
                      {menuItem.path ? (
                        <Link
                          to={menuItem.path}
                          className="flex items-center gap-3 w-full px-4 py-3 text-left text-slate-300 hover:text-white transition-colors"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          {menuItem.icon && <menuItem.icon className="w-4 h-4" />}
                          {menuItem.label}
                        </Link>
                      ) : (
                        <button className="flex items-center gap-3 w-full px-4 py-3 text-left text-slate-300 hover:text-white transition-colors">
                          {menuItem.icon && <menuItem.icon className="w-4 h-4" />}
                          {menuItem.label}
                        </button>
                      )}
                    </motion.div>
                  ))}
                  
                  <hr className="border-slate-700/50 my-2" />
                  
                  <motion.button 
                    whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                    className="w-full px-4 py-3 text-left text-slate-300 hover:text-red-400 transition-colors duration-200"
                  >
                    Sign Out
                  </motion.button>
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
    </motion.nav>
  );
} 