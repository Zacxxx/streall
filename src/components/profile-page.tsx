import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Edit, 
  Save, 
  X, 
  Calendar, 
  Heart, 
  Settings,
  Trash2,
  Camera,
  Mail,
  Globe,
  Monitor,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { authService, type UserProfile } from '@/services/auth-service';
import { settingsService } from '@/services/settings-service';

interface ProfilePageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfilePage({ isOpen, onClose }: ProfilePageProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: ''
  });
  const [userStats, setUserStats] = useState({
    accountAge: 0,
    watchlistCount: 0,
    lastActive: 'Never'
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUserData();
    }
  }, [isOpen]);

  const loadUserData = () => {
    const currentUser = authService.getCurrentUser();
    const stats = authService.getUserStats();
    
    setUser(currentUser);
    setUserStats(stats);
    
    if (currentUser) {
      setEditForm({
        name: currentUser.name,
        email: currentUser.email || ''
      });
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (user) {
      setEditForm({
        name: user.name,
        email: user.email || ''
      });
    }
  };

  const handleSaveEdit = () => {
    if (!user || !editForm.name.trim()) return;

    const success = authService.updateUserProfile({
      name: editForm.name.trim(),
      email: editForm.email.trim() || undefined
    });

    if (success) {
      setIsEditing(false);
      loadUserData();
    }
  };

  const handleDeleteProfile = () => {
    authService.deleteProfile();
    setShowDeleteConfirm(false);
    onClose();
    // Refresh the page to reset the app state
    window.location.reload();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return formatDate(dateString);
  };

  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              No Profile Found
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-6">
              You need to create a profile first to access this page.
            </p>
            <Button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <User className="w-6 h-6" />
              My Profile
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Profile Header */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-12 h-12 text-white" />
                      )}
                    </div>
                    <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors">
                      <Camera className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">Name</label>
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="Enter your name"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">Email (Optional)</label>
                          <Input
                            value={editForm.email}
                            onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="Enter your email"
                            type="email"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleSaveEdit}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Save
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:bg-gray-800"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                          <Button
                            onClick={handleStartEdit}
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:bg-gray-800"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                        {user.email && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Mail className="w-4 h-4" />
                            <span>{user.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-400">
                          {settingsService.isDesktopApp ? (
                            <>
                              <Monitor className="w-4 h-4" />
                              <span>Desktop User</span>
                            </>
                          ) : (
                            <>
                              <Globe className="w-4 h-4" />
                              <span>Web User</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-4 text-center">
                  <Calendar className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{userStats.accountAge}</div>
                  <div className="text-sm text-gray-400">Days Active</div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-4 text-center">
                  <Heart className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{userStats.watchlistCount}</div>
                  <div className="text-sm text-gray-400">Watchlist Items</div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-4 text-center">
                  <Clock className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <div className="text-sm font-bold text-white">{formatLastActive(userStats.lastActive)}</div>
                  <div className="text-sm text-gray-400">Last Active</div>
                </CardContent>
              </Card>
            </div>

            {/* Account Details */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Account Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Account Created</label>
                    <div className="text-white">{formatDate(user.createdAt)}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Last Login</label>
                    <div className="text-white">{formatDate(user.lastLogin)}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">User ID</label>
                    <div className="text-white font-mono text-sm">{user.id}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Platform</label>
                    <div className="text-white">
                      {settingsService.isDesktopApp ? 'Desktop Application' : 'Web Application'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Theme</label>
                    <div className="text-white capitalize">{user.preferences.theme}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Language</label>
                    <div className="text-white uppercase">{user.preferences.language}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Autoplay</label>
                    <div className="text-white">{user.preferences.autoplay ? 'Enabled' : 'Disabled'}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Notifications</label>
                    <div className="text-white">{user.preferences.notifications ? 'Enabled' : 'Disabled'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="bg-red-900/20 border-red-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <Trash2 className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">Delete Profile</h4>
                    <p className="text-gray-400 text-sm">
                      Permanently delete your profile and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="outline"
                    className="border-red-600 text-red-400 hover:bg-red-600/20 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              Delete Profile
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to delete your profile? This will permanently remove:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
              <li>Your profile information</li>
              <li>Your watchlist ({userStats.watchlistCount} items)</li>
              <li>Your preferences and settings</li>
              <li>All locally stored data</li>
            </ul>
            <p className="text-red-400 font-medium">This action cannot be undone.</p>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleDeleteProfile}
                className="bg-red-600 hover:bg-red-700 text-white flex-1"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Yes, Delete Profile
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800 flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 