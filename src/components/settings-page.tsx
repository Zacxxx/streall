import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { 
  Settings, 
  Key, 
  Check, 
  X, 
  Loader2, 
  ExternalLink, 
  Eye, 
  EyeOff,
  Info,
  Download,
  Upload,
  Shield,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { settingsService } from '../services/settings-service';

interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
  onSetupComplete?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  isOpen,
  onClose,
  onSetupComplete
}) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    error?: string;
  } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [adBlockerSettings, setAdBlockerSettings] = useState(settingsService.adBlockerSettings);

  useEffect(() => {
    if (isOpen) {
      // Load current API key when opening
      const currentKey = settingsService.tmdbApiKey;
      if (currentKey) {
        setApiKey(currentKey);
      }
      setValidationResult(null);
      setHasUnsavedChanges(false);
    }
  }, [isOpen]);

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setValidationResult(null);
    setHasUnsavedChanges(value !== settingsService.tmdbApiKey);
  };

  const validateApiKey = async () => {
    if (!apiKey.trim()) {
      setValidationResult({ valid: false, error: 'Please enter an API key' });
      return;
    }

    setIsValidating(true);
    try {
      const result = await settingsService.testApiKey(apiKey.trim());
      setValidationResult(result);
    } catch (error) {
      setValidationResult({ 
        valid: false, 
        error: 'Failed to validate API key. Please try again.' 
      });
    } finally {
      setIsValidating(false);
    }
  };

  const saveSettings = () => {
    if (validationResult?.valid) {
      settingsService.setTmdbApiKey(apiKey.trim());
      settingsService.completeSetup();
      setHasUnsavedChanges(false);
      onSetupComplete?.();
      
      // Reload the page to refresh content with new API key
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      );
      if (!confirm) return;
    }
    onClose();
  };

  const exportSettings = () => {
    const settings = settingsService.exportSettings();
    const blob = new Blob([settings], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'streall-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const settings = e.target?.result as string;
            const success = settingsService.importSettings(settings);
            if (success) {
              const newKey = settingsService.tmdbApiKey;
              if (newKey) setApiKey(newKey);
              alert('Settings imported successfully!');
            } else {
              alert('Failed to import settings. Please check the file format.');
            }
          } catch (error) {
            alert('Invalid settings file.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl w-[90vw] max-h-[90vh] bg-black/95 border-red-500/20 text-white backdrop-blur-md overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="flex items-center space-x-2 text-2xl">
            <Settings className="w-6 h-6 text-red-500" />
            <span>Streall Settings</span>
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto modal-scrollbar smooth-scroll pr-2">
          <div className="space-y-6">
            {/* TMDB API Configuration */}
            <Card className="bg-gray-900/50 border-gray-700 p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Key className="w-5 h-5 text-red-500" />
                    <h3 className="text-lg font-semibold">TMDB API Configuration</h3>
                  </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-blue-200 mb-2">
                        <strong>Need a TMDB API key?</strong> It's free and takes just a few minutes!
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-blue-100">
                        <li>Visit <a href="https://www.themoviedb.org/signup" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">TMDB.org</a> and create an account</li>
                        <li>Go to your account settings → API</li>
                        <li>Request an API key (it's free for personal use)</li>
                        <li>Copy your API key and paste it below</li>
                      </ol>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => window.open('https://www.themoviedb.org/signup', '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Sign Up
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-600 text-blue-300 hover:bg-blue-600"
                          onClick={() => window.open('https://www.themoviedb.org/settings/api', '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Get API Key
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-300">
                    TMDB API Key
                  </label>
                  
                  <div className="relative">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                      placeholder="Enter your TMDB API key..."
                      className="bg-gray-800 border-gray-600 text-white pr-20"
                    />
                    
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>

                    {validationResult && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {validationResult.valid ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>

                  {validationResult && !validationResult.valid && (
                    <p className="text-sm text-red-400">{validationResult.error}</p>
                  )}

                  <div className="flex space-x-3">
                    <Button
                      onClick={validateApiKey}
                      disabled={!apiKey.trim() || isValidating}
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      {isValidating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Test API Key
                    </Button>

                    {validationResult?.valid && (
                      <Button
                        onClick={saveSettings}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Save Settings
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Ad Blocker Settings - Desktop Only */}
            {settingsService.isDesktopApp && (
              <Card className="bg-gray-900/50 border-gray-700 p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-red-500" />
                    <h3 className="text-lg font-semibold">Ghostery Ad Blocker</h3>
                    <div className="flex items-center space-x-2 ml-auto">
                      <span className="text-sm text-gray-400">
                        {adBlockerSettings.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        onClick={() => {
                          const newSettings = { ...adBlockerSettings, enabled: !adBlockerSettings.enabled };
                          setAdBlockerSettings(newSettings);
                          settingsService.updateAdBlockerSettings(newSettings);
                        }}
                        className="text-red-500 hover:text-red-400"
                      >
                        {adBlockerSettings.enabled ? 
                          <ToggleRight className="w-6 h-6" /> : 
                          <ToggleLeft className="w-6 h-6" />
                        }
                      </button>
                    </div>
                  </div>

                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Shield className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="text-green-200 mb-2">
                          <strong>Built-in Ghostery Ad Blocker</strong> - Blocks ads, trackers, and malware automatically!
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-green-100">
                          <li>Uses the same filter lists as uBlock Origin</li>
                          <li>Blocks ads, trackers, and malicious content</li>
                          <li>Improves page loading speed and privacy</li>
                          <li>Works automatically in the background</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {adBlockerSettings.enabled && (
                    <div className="space-y-4">
                      <h4 className="text-md font-medium text-gray-300">Blocking Options</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                          <div>
                            <span className="text-sm font-medium text-white">Block Ads</span>
                            <p className="text-xs text-gray-400">Remove advertisements</p>
                          </div>
                          <button
                            onClick={() => {
                              const newSettings = { ...adBlockerSettings, blockAds: !adBlockerSettings.blockAds };
                              setAdBlockerSettings(newSettings);
                              settingsService.updateAdBlockerSettings(newSettings);
                            }}
                            className="text-red-500 hover:text-red-400"
                          >
                            {adBlockerSettings.blockAds ? 
                              <ToggleRight className="w-5 h-5" /> : 
                              <ToggleLeft className="w-5 h-5" />
                            }
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                          <div>
                            <span className="text-sm font-medium text-white">Block Trackers</span>
                            <p className="text-xs text-gray-400">Prevent tracking scripts</p>
                          </div>
                          <button
                            onClick={() => {
                              const newSettings = { ...adBlockerSettings, blockTrackers: !adBlockerSettings.blockTrackers };
                              setAdBlockerSettings(newSettings);
                              settingsService.updateAdBlockerSettings(newSettings);
                            }}
                            className="text-red-500 hover:text-red-400"
                          >
                            {adBlockerSettings.blockTrackers ? 
                              <ToggleRight className="w-5 h-5" /> : 
                              <ToggleLeft className="w-5 h-5" />
                            }
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                          <div>
                            <span className="text-sm font-medium text-white">Block Malware</span>
                            <p className="text-xs text-gray-400">Protect from malicious sites</p>
                          </div>
                          <button
                            onClick={() => {
                              const newSettings = { ...adBlockerSettings, blockMalware: !adBlockerSettings.blockMalware };
                              setAdBlockerSettings(newSettings);
                              settingsService.updateAdBlockerSettings(newSettings);
                            }}
                            className="text-red-500 hover:text-red-400"
                          >
                            {adBlockerSettings.blockMalware ? 
                              <ToggleRight className="w-5 h-5" /> : 
                              <ToggleLeft className="w-5 h-5" />
                            }
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                          <div>
                            <span className="text-sm font-medium text-white">Allow Social Media</span>
                            <p className="text-xs text-gray-400">Keep social widgets</p>
                          </div>
                          <button
                            onClick={() => {
                              const newSettings = { ...adBlockerSettings, allowSocialMedia: !adBlockerSettings.allowSocialMedia };
                              setAdBlockerSettings(newSettings);
                              settingsService.updateAdBlockerSettings(newSettings);
                            }}
                            className="text-red-500 hover:text-red-400"
                          >
                            {adBlockerSettings.allowSocialMedia ? 
                              <ToggleRight className="w-5 h-5" /> : 
                              <ToggleLeft className="w-5 h-5" />
                            }
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 mt-4">
                        <p>⚡ Changes take effect immediately. Restart the app if you experience any issues.</p>
                        <p>🔄 Filter lists are updated automatically to block new threats.</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* App Information */}
            <Card className="bg-gray-900/50 border-gray-700 p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">App Information</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Version:</span>
                    <span className="ml-2 text-white">{settingsService.appVersion}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Platform:</span>
                    <span className="ml-2 text-white">
                      {settingsService.isDesktopApp ? 'Desktop' : 'Web'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Setup Status:</span>
                    <span className={`ml-2 ${settingsService.isSetupCompleted ? 'text-green-400' : 'text-yellow-400'}`}>
                      {settingsService.isSetupCompleted ? 'Complete' : 'Pending'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">API Key:</span>
                    <span className={`ml-2 ${settingsService.tmdbApiKey ? 'text-green-400' : 'text-red-400'}`}>
                      {settingsService.tmdbApiKey ? 'Configured' : 'Not Set'}
                    </span>
                  </div>
                  {settingsService.isDesktopApp && (
                    <div>
                      <span className="text-gray-400">Ad Blocker:</span>
                      <span className={`ml-2 ${settingsService.isAdBlockerEnabled ? 'text-green-400' : 'text-yellow-400'}`}>
                        {settingsService.isAdBlockerEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Import/Export Settings */}
            <Card className="bg-gray-900/50 border-gray-700 p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Backup & Restore</h3>
                
                <div className="flex space-x-3">
                  <Button
                    onClick={exportSettings}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Settings
                  </Button>
                  
                  <Button
                    onClick={importSettings}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import Settings
                  </Button>
                </div>
                
                <p className="text-xs text-gray-500">
                  Export your settings to backup your configuration or transfer to another device.
                  {!settingsService.isDesktopApp && " Settings are stored in your browser's local storage."}
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 border-t border-gray-700 pt-4 mt-4">
          <div className="flex justify-end space-x-3">
            <Button
              onClick={handleClose}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              {hasUnsavedChanges ? 'Cancel' : 'Close'}
            </Button>
            
            {settingsService.isSetupCompleted && !hasUnsavedChanges && (
              <Button
                onClick={onClose}
                className="bg-red-600 hover:bg-red-700"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 