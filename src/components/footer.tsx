import { motion } from 'framer-motion';
import { 
  Play, 
  Heart, 
  Star, 
  Settings, 
  User, 
  HelpCircle, 
  Github,
  Code,
  Globe,
  Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { settingsService } from '@/services/settings-service';

interface FooterProps {
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onLoginClick?: () => void;
  isAuthenticated?: boolean;
  userProfile?: {
    name: string;
    email: string;
    avatar?: string;
    isPremium?: boolean;
  };
}

export function Footer({ 
  onProfileClick, 
  onSettingsClick, 
  onLoginClick, 
  isAuthenticated = false,
  userProfile
}: FooterProps) {
  const isDesktop = settingsService.isDesktopApp;
  
  return (
    <footer className="relative bg-gradient-to-t from-slate-950 via-slate-900 to-slate-800 border-t border-slate-700/50">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-transparent to-red-900/10" />
      
      <div className="relative max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-current" />
              </div>
              <span className="text-2xl font-bold text-white">Streall</span>
            </div>
            
            <p className="text-slate-400 text-sm leading-relaxed">
              Free, open-source streaming content browser. Discover movies and TV shows from multiple sources.
            </p>
            
            {/* Platform Info */}
            <div className="flex items-center gap-2 text-sm text-slate-400">
              {isDesktop ? (
                <>
                  <Monitor className="w-4 h-4" />
                  <span>Desktop Application</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span>Web Application</span>
                </>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Navigation</h3>
            <ul className="space-y-2">
              <li>
                <button className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Home
                </button>
              </li>
              <li>
                <button className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Browse
                </button>
              </li>
              <li>
                <button className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  My List
                </button>
              </li>
              <li>
                <button className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Features</h3>
            <ul className="space-y-2">
              <li>
                <span className="text-slate-400 text-sm flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Open Source
                </span>
              </li>
              <li>
                <span className="text-slate-400 text-sm flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Personal Watchlist
                </span>
              </li>
              <li>
                <span className="text-slate-400 text-sm flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  TMDB Integration
                </span>
              </li>
              {isDesktop && (
                <li>
                  <span className="text-slate-400 text-sm flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Built-in Ad Blocker
                  </span>
                </li>
              )}
            </ul>
          </div>

          {/* User Profile / Authentication */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Account</h3>
            
            {isAuthenticated && userProfile ? (
              <div className="space-y-4">
                {/* User Info */}
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
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

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={onProfileClick}
                    variant="outline"
                    size="sm"
                    className="w-full bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Button>
                  
                  <Button
                    onClick={onSettingsClick}
                    variant="outline"
                    size="sm"
                    className="w-full bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-slate-400 text-sm">
                  Create a local profile to save your watchlist and preferences.
                </p>
                
                <div className="space-y-2">
                  <Button
                    onClick={onLoginClick}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Create Profile
                  </Button>
                </div>

                <div className="text-xs text-slate-500">
                  <p>✨ No registration required</p>
                  <p>🔒 All data stored locally</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-700/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <span>© 2024 Streall - Open Source Project</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">Version {settingsService.appVersion}</span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <a 
                href="https://github.com/streall/streall" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-white transition-colors flex items-center gap-1"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
              <span>•</span>
              <button className="hover:text-white transition-colors flex items-center gap-1">
                <HelpCircle className="w-4 h-4" />
                Help
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-red-400/20 rounded-full"
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 20}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>
    </footer>
  );
} 