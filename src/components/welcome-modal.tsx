import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Play, Film, Settings, Download, Sparkles } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl bg-black/95 border-red-500/20 text-white backdrop-blur-md">
        <DialogHeader className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-600 to-red-800 rounded-full">
                <Play className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-2 -right-2">
                <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
              </div>
            </div>
          </div>
          
          <div>
            <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
              Welcome to Streall!
            </DialogTitle>
            <DialogDescription className="text-gray-300 text-lg mt-2">
              Your premium streaming experience starts here
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* App Introduction */}
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold text-red-400">
              🎬 What is Streall?
            </h3>
            <p className="text-gray-300 leading-relaxed">
              Streall is a powerful desktop streaming application that gives you access to millions of movies and TV shows. 
              Built with modern technology and designed for the ultimate viewing experience.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              <Film className="w-8 h-8 text-red-500 mb-2" />
              <h4 className="font-semibold text-white mb-1">Vast Library</h4>
              <p className="text-sm text-gray-400">
                Access millions of movies and TV shows powered by TMDB
              </p>
            </div>
            
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              <Download className="w-8 h-8 text-blue-500 mb-2" />
              <h4 className="font-semibold text-white mb-1">Desktop Native</h4>
              <p className="text-sm text-gray-400">
                Optimized desktop experience with offline capabilities
              </p>
            </div>
            
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              <Settings className="w-8 h-8 text-green-500 mb-2" />
              <h4 className="font-semibold text-white mb-1">Customizable</h4>
              <p className="text-sm text-gray-400">
                Personalize your experience with custom settings
              </p>
            </div>
          </div>

          {/* Setup Required Notice */}
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Settings className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-yellow-300 mb-1">
                  🔧 Quick Setup Required
                </h4>
                <p className="text-sm text-yellow-100 mb-3">
                  To get started, you'll need to configure your TMDB API key. 
                  This ensures you have access to the latest movie and TV show data.
                </p>
                <p className="text-xs text-yellow-200">
                  Don't have an API key? No worries! We'll guide you through getting one for free.
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-200">✨ What you'll get:</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                <span>Real-time access to the latest movies and TV shows</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                <span>High-quality streaming with multiple sources</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                <span>Advanced search and discovery features</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                <span>Personalized recommendations and watchlists</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-700">
          <Button
            onClick={onOpenSettings}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            Set Up API Key
          </Button>
          
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white py-3 transition-colors"
          >
            Skip for Now
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            Streall v1.0.0 • Built with ❤️ for movie lovers
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 