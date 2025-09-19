import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, LogIn, UserPlus } from 'lucide-react';

interface LocationState {
  redirectTo?: string;
}

type AuthMode = 'login' | 'register';

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || {};

  const [mode, setMode] = useState<AuthMode>('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: 'name' | 'email' | 'password', value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    setError(null);
    setInfo(null);
  };

  const redirectAfterAuth = () => {
    const target = state.redirectTo && state.redirectTo !== '/auth' ? state.redirectTo : '/';
    navigate(target, { replace: true });
  };

  useEffect(() => {
    const unsubscribe = authService.addListener((authState) => {
      if (authState.isAuthenticated) {
        redirectAfterAuth();
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await authService.signIn(form.email.trim(), form.password);
        redirectAfterAuth();
      } else {
        if (!form.name.trim()) {
          throw new Error('Please provide your name.');
        }
        const result = await authService.signUp(form.name.trim(), form.email.trim(), form.password);
        if (result.needsConfirmation) {
          setInfo('Registration successful! Please check your email to confirm your account.');
        } else {
          redirectAfterAuth();
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white flex items-center justify-center px-4 py-12">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h1 className="text-4xl font-bold tracking-tight">Welcome to Streall</h1>
          <p className="text-slate-300 text-base leading-relaxed max-w-md">
            Sign in to access your personalised streaming dashboard, watchlist, and preferences. New here? Create an account in seconds and start exploring instantly.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-300">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Why create an account?</h3>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Synchronise your watchlist securely</li>
                <li>Keep settings across devices</li>
                <li>Get quick access to VIP streaming</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Security first</h3>
              <p className="text-slate-400">
                Accounts are powered by Supabase Authentication. Your credentials are encrypted and protected with industry-standard security.
              </p>
            </div>
          </div>
        </div>

        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="text-sm text-slate-300" htmlFor="name">
                    Full Name
                  </label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(event) => handleInputChange('name', event.target.value)}
                    placeholder="Jane Doe"
                    required
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm text-slate-300" htmlFor="email">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => handleInputChange('email', event.target.value)}
                  placeholder="you@example.com"
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-slate-300" htmlFor="password">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(event) => handleInputChange('password', event.target.value)}
                  placeholder=""
                  required
                  minLength={6}
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-500">Must be at least 6 characters long.</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-red-600/60 bg-red-900/20 px-3 py-2 text-sm text-red-200">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {info && (
                <div className="flex items-start gap-2 rounded-md border border-emerald-600/60 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 mt-0.5" />
                  <span>{info}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-red-600 hover:bg-red-700 text-white transition"
              >
                {isSubmitting ? 'Please wait' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-400">
              {mode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={toggleMode}
                    className="text-red-400 hover:text-red-300 font-medium"
                    type="button"
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <button
                    onClick={toggleMode}
                    className="text-red-400 hover:text-red-300 font-medium"
                    type="button"
                  >
                    Sign in instead
                  </button>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              className="mt-4 w-full border border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => navigate('/')}
              type="button"
            >
              Back to home
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
