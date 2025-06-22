import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Crown, Settings, LogOut, Bell, Heart, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProfileButtonProps {
  isAuthenticated: boolean;
  userProfile?: {
    name: string;
    email: string;
    avatar?: string;
    isPremium?: boolean;
  };
  onLogin: () => void;
  onLogout: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
}

export function ProfileButton({
  isAuthenticated,
  userProfile,
  onLogin,
  onLogout,
  onProfileClick,
  onSettingsClick
}: ProfileButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <Button
        onClick={onLogin}
        className="bg-gradient-to-r from-blue-600 to-orange-600 hover:from-blue-700 hover:to-orange-700 text-white font-medium px-6"
      >
        <User className="w-4 h-4 mr-2" />
        Se connecter
      </Button>
    );
  }

  return (
    <div className="relative">
      {/* Profile Avatar/Button */}
      <motion.button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Avatar */}
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-orange-500 rounded-full flex items-center justify-center relative">
          {userProfile?.avatar ? (
            <img 
              src={userProfile.avatar} 
              alt={userProfile.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-4 h-4 text-white" />
          )}
          
          {/* Premium Badge */}
          {userProfile?.isPremium && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
              <Crown className="w-2.5 h-2.5 text-black" />
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="hidden md:block text-left">
          <p className="text-white text-sm font-medium truncate max-w-24">
            {userProfile?.name || 'Utilisateur'}
          </p>
          {userProfile?.isPremium && (
            <p className="text-yellow-400 text-xs">Premium</p>
          )}
        </div>
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isDropdownOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsDropdownOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden"
            >
              {/* User Header */}
              <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800 to-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-orange-500 rounded-full flex items-center justify-center relative">
                    {userProfile?.avatar ? (
                      <img 
                        src={userProfile.avatar} 
                        alt={userProfile.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                    
                    {userProfile?.isPremium && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                        <Crown className="w-3 h-3 text-black" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">
                      {userProfile?.name || 'Utilisateur'}
                    </h3>
                    <p className="text-slate-400 text-sm truncate">
                      {userProfile?.email || 'email@example.com'}
                    </p>
                    {userProfile?.isPremium && (
                      <div className="flex items-center gap-1 mt-1">
                        <Crown className="w-3 h-3 text-yellow-400" />
                        <span className="text-yellow-400 text-xs font-medium">
                          Membre Premium
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <button
                  onClick={() => {
                    onProfileClick?.();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors text-left"
                >
                  <User className="w-4 h-4" />
                  <span>Mon Profil</span>
                </button>

                <button
                  onClick={() => setIsDropdownOpen(false)}
                  className="w-full flex items-center gap-3 p-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors text-left"
                >
                  <Heart className="w-4 h-4" />
                  <span>Ma Liste</span>
                </button>

                <button
                  onClick={() => setIsDropdownOpen(false)}
                  className="w-full flex items-center gap-3 p-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors text-left"
                >
                  <Download className="w-4 h-4" />
                  <span>Téléchargements</span>
                </button>

                <button
                  onClick={() => setIsDropdownOpen(false)}
                  className="w-full flex items-center gap-3 p-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors text-left"
                >
                  <Bell className="w-4 h-4" />
                  <span>Notifications</span>
                </button>

                <div className="border-t border-slate-700/50 my-2" />

                <button
                  onClick={() => {
                    onSettingsClick?.();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors text-left"
                >
                  <Settings className="w-4 h-4" />
                  <span>Paramètres</span>
                </button>

                <button
                  onClick={() => {
                    onLogout();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-slate-300 hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Déconnexion</span>
                </button>
              </div>

              {/* Premium Upgrade (if not premium) */}
              {!userProfile?.isPremium && (
                <div className="p-4 border-t border-slate-700/50 bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400 font-medium text-sm">
                      Passer à Premium
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs mb-3">
                    Accès illimité, qualité 4K, sans publicité
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-medium"
                  >
                    Essai gratuit 7 jours
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
} 