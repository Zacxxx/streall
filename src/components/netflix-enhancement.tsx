import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLastWatchedProgress } from '@/hooks/use-watch-progress';


// Toast notification system
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
}

export function NetflixToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const navigate = useNavigate();
  const lastWatched = useLastWatchedProgress();
  const [resumeDismissed, setResumeDismissed] = useState(false);

  useEffect(() => {
    if (lastWatched) {
      setResumeDismissed(false);
    }
  }, [lastWatched?.tmdbId, lastWatched?.updatedAt]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, toast.duration || 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Expose addToast globally for easy use
  useEffect(() => {
    (window as any).showNetflixToast = addToast;
    return () => {
      delete (window as any).showNetflixToast;
    };
  }, []);

  const getToastIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error': return <X className="w-5 h-5 text-red-400" />;
      case 'warning': return <Bell className="w-5 h-5 text-yellow-400" />;
      default: return <Bell className="w-5 h-5 text-blue-400" />;
    }
  };

  const getToastStyles = (type: Toast['type']) => {
    const baseStyles = "border-l-4 bg-slate-900/95 backdrop-blur-md";
    switch (type) {
      case 'success': return `${baseStyles} border-green-400`;
      case 'error': return `${baseStyles} border-red-400`;
      case 'warning': return `${baseStyles} border-yellow-400`;
      default: return `${baseStyles} border-blue-400`;
    }
  };

  const resumeDetails = useMemo(() => {
    if (!lastWatched || lastWatched.positionSeconds < 5) {
      return null;
    }

    const totalSeconds = Math.floor(lastWatched.positionSeconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const timeParts: string[] = [];
    if (hours > 0) {
      timeParts.push(`${hours}h`);
    }
    if (minutes > 0 || hours === 0) {
      timeParts.push(`${minutes}m`);
    }
    if (hours === 0 && minutes === 0) {
      timeParts.push(`${seconds}s`);
    }

    const episodeLabel = lastWatched.mediaType === 'tv'
      ? [
          lastWatched.season ? `S${lastWatched.season}` : null,
          lastWatched.episode ? `E${lastWatched.episode}` : null,
        ]
          .filter(Boolean)
          .join('') || 'Episode'
      : null;

    const progressPercent = lastWatched.durationSeconds && lastWatched.durationSeconds > 0
      ? Math.min(100, Math.round((lastWatched.positionSeconds / lastWatched.durationSeconds) * 100))
      : null;

    return {
      timeLabel: timeParts.join(' '),
      episodeLabel,
      progressPercent,
    };
  }, [lastWatched]);

  const handleResume = () => {
    if (!lastWatched) {
      return;
    }

    const params = new URLSearchParams();
    if (lastWatched.mediaType === 'tv') {
      if (lastWatched.season) {
        params.set('s', lastWatched.season.toString());
      }
      if (lastWatched.episode) {
        params.set('e', lastWatched.episode.toString());
      }
    }

    if (lastWatched.positionSeconds) {
      params.set('t', Math.floor(lastWatched.positionSeconds).toString());
    }

    const path = `/watch/${lastWatched.mediaType}/${lastWatched.tmdbId}`;
    const query = params.toString();
    navigate(query ? `${path}?${query}` : path);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-3">
      <AnimatePresence>
        {resumeDetails && lastWatched && !resumeDismissed && (
          <motion.div
            key="resume-toast"
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            className="w-72 rounded-xl bg-slate-900/95 backdrop-blur-md shadow-2xl border border-red-500/40 overflow-hidden"
          >
            <div className="flex">
              {lastWatched.poster && (
                <img
                  src={lastWatched.poster}
                  alt={lastWatched.title}
                  className="w-20 h-24 object-cover"
                />
              )}
              <div className="flex-1 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase text-red-400 tracking-wide">Continue Watching</p>
                    <h4 className="text-sm font-semibold text-white line-clamp-2">{lastWatched.title}</h4>
                    {resumeDetails.episodeLabel && (
                      <p className="text-[10px] text-slate-300 mt-1">{resumeDetails.episodeLabel}</p>
                    )}
                    {resumeDetails.timeLabel && (
                      <p className="text-[10px] text-slate-400 mt-1">Paused at {resumeDetails.timeLabel}</p>
                    )}
                  </div>
                  <button
                    className="text-slate-400 hover:text-white transition-colors"
                    onClick={() => setResumeDismissed(true)}
                    aria-label="Dismiss resume suggestion"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <Button size="sm" className="bg-red-600 hover:bg-red-500 text-white px-3" onClick={handleResume}>
                    Resume
                  </Button>
                  {resumeDetails.progressPercent !== null && (
                    <div className="flex-1 ml-2">
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${resumeDetails.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className={`${getToastStyles(toast.type)} rounded-lg p-4 max-w-sm shadow-xl`}
          >
            <div className="flex items-start gap-3">
              {getToastIcon(toast.type)}
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium text-sm">{toast.title}</h4>
                <p className="text-gray-300 text-xs mt-1">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Scroll to top button
export function NetflixScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.pageYOffset > 300);
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center font-bold text-lg"
        >
          ↑
        </motion.button>
      )}
    </AnimatePresence>
  );
} 