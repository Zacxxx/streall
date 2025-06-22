import { motion } from 'framer-motion';
import { 
  Play, 
  Heart, 
  Star, 
  Download, 
  Settings, 
  User, 
  LogOut, 
  Shield, 
  HelpCircle, 
  Mail, 
  Github, 
  Twitter, 
  Instagram,
  Sparkles,
  Crown,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FooterProps {
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
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
  onLogoutClick, 
  isAuthenticated = false,
  userProfile
}: FooterProps) {
  return (
    <footer className="relative bg-gradient-to-t from-slate-950 via-slate-900 to-slate-800 border-t border-slate-700/50">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-transparent to-orange-900/10" />
      
      <div className="relative max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-orange-500 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-current" />
              </div>
              <span className="text-2xl font-bold text-white">Streall</span>
            </div>
            
            <p className="text-slate-400 text-sm leading-relaxed">
              Votre plateforme de streaming ultime. Découvrez des milliers de films et séries en haute qualité.
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-3">
              <button className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <Twitter className="w-4 h-4" />
              </button>
              <button className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <Instagram className="w-4 h-4" />
              </button>
              <button className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <Github className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Navigation</h3>
            <ul className="space-y-2">
              <li>
                <button className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Accueil
                </button>
              </li>
              <li>
                <button className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Tendances
                </button>
              </li>
              <li>
                <button className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Ma Liste
                </button>
              </li>
              <li>
                <button className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Téléchargements
                </button>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Support</h3>
            <ul className="space-y-2">
              <li>
                <button className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  Centre d'aide
                </button>
              </li>
              <li>
                <button className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Contact
                </button>
              </li>
              <li>
                <button className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Confidentialité
                </button>
              </li>
              <li>
                <button className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Conditions
                </button>
              </li>
            </ul>
          </div>

          {/* User Profile / Authentication */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Compte</h3>
            
            {isAuthenticated && userProfile ? (
              <div className="space-y-4">
                {/* User Info */}
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-orange-500 rounded-full flex items-center justify-center">
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
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm truncate">
                        {userProfile.name}
                      </p>
                      {userProfile.isPremium && (
                        <Crown className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                    <p className="text-slate-400 text-xs truncate">
                      {userProfile.email}
                    </p>
                  </div>
                </div>

                {/* Premium Badge */}
                {userProfile.isPremium && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 p-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30"
                  >
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400 text-xs font-medium">
                      Membre Premium
                    </span>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={onProfileClick}
                    variant="outline"
                    size="sm"
                    className="w-full bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Mon Profil
                  </Button>
                  
                  <Button
                    onClick={onSettingsClick}
                    variant="outline"
                    size="sm"
                    className="w-full bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Paramètres
                  </Button>
                  
                  <Button
                    onClick={onLogoutClick}
                    variant="outline"
                    size="sm"
                    className="w-full bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-red-600/20 hover:text-red-400 hover:border-red-500/50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnexion
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-slate-400 text-sm">
                  Connectez-vous pour accéder à vos favoris et recommandations personnalisées.
                </p>
                
                <div className="space-y-2">
                  <Button
                    onClick={onLoginClick}
                    className="w-full bg-gradient-to-r from-blue-600 to-orange-600 hover:from-blue-700 hover:to-orange-700 text-white font-medium"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Se connecter
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                  >
                    Créer un compte
                  </Button>
                </div>

                {/* Premium Teaser */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20 cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400 font-medium text-sm">
                      Streall Premium
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Accès illimité, qualité 4K, pas de publicité
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <span className="text-yellow-400 text-xs font-medium">
                      Essai gratuit 7 jours
                    </span>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-700/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <span>© 2024 Streall. Tous droits réservés.</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">Version 2.1.0</span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <button className="hover:text-white transition-colors">
                Politique de confidentialité
              </button>
              <span>•</span>
              <button className="hover:text-white transition-colors">
                Conditions d'utilisation
              </button>
              <span>•</span>
              <button className="hover:text-white transition-colors">
                Cookies
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/20 rounded-full"
            style={{
              left: `${10 + i * 12}%`,
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