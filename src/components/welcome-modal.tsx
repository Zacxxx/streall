import React, { useState } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Play, ExternalLink, Eye, EyeOff, Check, AlertCircle, Loader2 } from 'lucide-react';
import { settingsService } from '../services/settings-service';

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
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    error?: string;
  } | null>(null);

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setValidationResult(null);
  };

  const validateAndSave = async () => {
    if (!apiKey.trim()) {
      setValidationResult({ valid: false, error: 'Please enter your API key' });
      return;
    }

    setIsValidating(true);
    try {
      const result = await settingsService.testApiKey(apiKey.trim());
      setValidationResult(result);
      
      if (result.valid) {
        // Save the API key and complete setup
        settingsService.setTmdbApiKey(apiKey.trim());
        settingsService.completeSetup();
        
        // Show success briefly then reload
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      setValidationResult({ 
        valid: false, 
        error: 'Failed to validate API key. Please try again.' 
      });
    } finally {
      setIsValidating(false);
    }
  };

  const openTMDBSettings = () => {
    window.open('https://www.themoviedb.org/settings/api', '_blank');
  };

  const openTMDBSignup = () => {
    window.open('https://www.themoviedb.org/signup', '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] bg-neutral-900 border-0 text-white p-0 overflow-hidden flex flex-col">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-r from-red-600 via-red-700 to-red-800 px-8 py-6 flex-shrink-0">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-black/30 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Play className="w-7 h-7 text-white" fill="white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Welcome to Streall</h1>
                <p className="text-red-100 text-lg">Your premium streaming experience</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto modal-scrollbar smooth-scroll">
          <div className="px-8 py-6 space-y-6">
            {/* Quick Setup Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Quick Setup Required</h2>
              <p className="text-neutral-300 leading-relaxed">
                To access our vast library of movies and TV shows, you'll need a free TMDB API key. 
                This takes just 2 minutes and gives you access to millions of titles.
              </p>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-200 text-sm">
                  <strong>Why do I need this?</strong> We use The Movie Database (TMDB) to provide 
                  accurate movie and TV show information. Your API key ensures reliable access to 
                  our content library and is completely free for personal use.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={openTMDBSignup}
                className="h-12 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-500 justify-start"
                variant="outline"
              >
                <ExternalLink className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">New to TMDB?</div>
                  <div className="text-sm text-neutral-300">Create free account</div>
                </div>
              </Button>

              <Button
                onClick={openTMDBSettings}
                className="h-12 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-500 justify-start"
                variant="outline"
              >
                <ExternalLink className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Have an account?</div>
                  <div className="text-sm text-neutral-300">Get your API key</div>
                </div>
              </Button>
            </div>

            {/* API Key Input Section */}
            <div className="space-y-4 bg-neutral-800/50 rounded-lg p-6">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <h3 className="text-lg font-medium text-white">Enter Your API Key</h3>
              </div>
              
              <div className="space-y-3">
                <div className="relative">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="Paste your TMDB API key here..."
                    className="bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400 pr-20 h-12 text-base"
                  />
                  
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-12 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                  >
                    {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>

                  {validationResult && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {validationResult.valid ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>

                {validationResult && !validationResult.valid && (
                  <div className="flex items-center space-x-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{validationResult.error}</span>
                  </div>
                )}

                {validationResult?.valid && (
                  <div className="flex items-center space-x-2 text-green-400 text-sm">
                    <Check className="w-4 h-4" />
                    <span>API key validated successfully! Reloading app...</span>
                  </div>
                )}

                <Button
                  onClick={validateAndSave}
                  disabled={!apiKey.trim() || isValidating || validationResult?.valid}
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium text-base"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : validationResult?.valid ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Setup Complete
                    </>
                  ) : (
                    'Validate & Start Streaming'
                  )}
                </Button>
              </div>
            </div>

            {/* What You Get Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">What you get with Streall:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-white">Massive Library</div>
                    <div className="text-sm text-neutral-400">Millions of movies and TV shows</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-white">High Quality</div>
                    <div className="text-sm text-neutral-400">HD streaming with multiple sources</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-white">Always Updated</div>
                    <div className="text-sm text-neutral-400">Latest releases and trending content</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 border-t border-neutral-700 bg-neutral-900">
          <div className="px-8 py-4 space-y-4">
            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={onOpenSettings}
                variant="outline"
                className="flex-1 h-11 bg-neutral-800 border-neutral-500 text-white hover:bg-neutral-700 hover:border-neutral-400"
              >
                Advanced Settings
              </Button>
              
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 h-11 bg-neutral-800 border-neutral-500 text-white hover:bg-neutral-700 hover:border-neutral-400"
              >
                Skip Setup
              </Button>
            </div>

            {/* Fine Print */}
            <div className="text-center">
              <p className="text-xs text-neutral-500">
                TMDB API key is free for personal use • Your key is stored securely {settingsService.isDesktopApp ? 'on your device' : 'in your browser'}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 