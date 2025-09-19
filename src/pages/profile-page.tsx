import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, type UserProfile } from '@/services/auth-service';
import { watchlistService } from '@/services/watchlist-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Edit3, LogOut, Mail, Settings, UserCog } from 'lucide-react';

function initialsFromName(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2) || 'U';
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function ProfilePage() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState(authService.getCurrentAuthState());
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: authState.user?.name ?? '',
    email: authState.user?.email ?? '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = authService.addListener((state) => {
      setAuthState(state);
      if (state.user) {
        setForm({
          name: state.user.name,
          email: state.user.email ?? '',
        });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    watchlistService.setUserContext(authState.user?.id ?? null);
  }, [authState.user?.id]);

  const stats = useMemo(() => authService.getUserStats(), [authState.user?.id, authState.user?.lastLogin, form]);

  const handleSaveProfile = async () => {
    if (!form.name.trim()) {
      setFeedback('Name is required.');
      return;
    }

    try {
      setIsSaving(true);
      await authService.updateUserProfile({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
      });
      setFeedback('Profile updated successfully.');
      setIsEditing(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update your profile.';
      setFeedback(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      navigate('/auth', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign out. Please try again.';
      setFeedback(message);
    }
  };

  if (!authState.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center text-white">
        <Card className="bg-slate-900/80 border-slate-800 p-8 text-center max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">No profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-300">You need to be signed in to view this page.</p>
            <Button onClick={() => navigate('/auth')} className="w-full bg-red-600 hover:bg-red-700">
              Go to authentication
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const user: UserProfile = authState.user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-xl font-semibold">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-cover" />
              ) : (
                initialsFromName(user.name)
              )}
            </div>
            <div>
              <h1 className="text-3xl font-semibold">Profile</h1>
              <p className="text-slate-300">Manage your account details and preferences.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>

        {feedback && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-slate-900/70 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCog className="w-5 h-5" />
                Account details
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing((prev) => !prev)}
                className="text-slate-300 hover:text-white"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm text-slate-400">Full name</label>
                  {isEditing ? (
                    <Input
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  ) : (
                    <p className="text-white text-sm font-medium">{user.name}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm text-slate-400">Email</label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  ) : (
                    <p className="text-white text-sm font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      {user.email ?? 'Not provided'}
                    </p>
                  )}
                </div>
              </div>

              <div className="h-px w-full bg-slate-800" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Account created</span>
                  <p className="text-white font-medium">{formatDate(user.createdAt)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Last active</span>
                  <p className="text-white font-medium">{formatDate(user.lastLogin)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Watchlist items</span>
                  <p className="text-white font-medium">{stats.watchlistCount}</p>
                </div>
                <div>
                  <span className="text-slate-400">Account age</span>
                  <p className="text-white font-medium">{stats.accountAge} days</p>
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsEditing(false);
                      setForm({ name: user.name, email: user.email ?? '' });
                      setFeedback(null);
                    }}
                    className="text-slate-300 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isSaving ? 'Saving' : 'Save changes'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/70 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="w-5 h-5" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span>Theme</span>
                <span className="font-medium text-white capitalize">{user.preferences.theme}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Language</span>
                <span className="font-medium text-white uppercase">{user.preferences.language}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Autoplay</span>
                <span className="font-medium text-white">{user.preferences.autoplay ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Notifications</span>
                <span className="font-medium text-white">{user.preferences.notifications ? 'Enabled' : 'Disabled'}</span>
              </div>
              <p className="text-xs text-slate-500 pt-4">
                Preference editing will be available soon. These values currently reflect defaults stored with your account.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
