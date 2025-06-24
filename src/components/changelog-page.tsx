import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Calendar, CheckCircle, AlertCircle, Shield, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notificationService, type PlatformUpdate } from '@/services/notification-service';

export function ChangelogPage() {
  const { version } = useParams<{ version?: string }>();
  const navigate = useNavigate();
  const [update, setUpdate] = useState<PlatformUpdate | null>(null);
  const [allUpdates, setAllUpdates] = useState<PlatformUpdate[]>([]);

  useEffect(() => {
    if (version) {
      const updateData = notificationService.getChangelog(version);
      setUpdate(updateData);
      // Mark as read when viewing
      if (updateData) {
        notificationService.markAsRead(`platform_${updateData.id}`);
      }
    } else {
      const allChangelogData = notificationService.getAllChangelogs();
      setAllUpdates(allChangelogData);
    }
  }, [version]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'major':
        return <Star className="w-5 h-5 text-yellow-500" />;
      case 'feature':
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'bugfix':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'security':
        return <Shield className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'major':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'feature':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'bugfix':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'security':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (version && update) {
    // Single version view
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button
              onClick={() => navigate('/changelog')}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to All Updates
            </Button>

            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0">
                {getTypeIcon(update.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">
                    Version {update.version}
                  </h1>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(update.type)}`}>
                    {update.type.charAt(0).toUpperCase() + update.type.slice(1)}
                  </span>
                </div>
                <h2 className="text-xl text-slate-300 mb-2">{update.title}</h2>
                <p className="text-slate-400 mb-4">{update.description}</p>
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar className="w-4 h-4" />
                  <span>Released {formatDate(update.date)}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Changes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900/50 rounded-lg border border-slate-700 p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              What's New
            </h3>
            <ul className="space-y-3">
              {update.changes.map((change, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-start gap-3 text-slate-300"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                  <span>{change}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center"
          >
            <Button
              onClick={() => navigate('/')}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3"
            >
              Back to App
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // All versions view
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to App
          </Button>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Changelog</h1>
            <p className="text-slate-400 text-lg">
              See what's new in Streall
            </p>
          </div>
        </motion.div>

        {/* Updates List */}
        <div className="space-y-6">
          {allUpdates.map((update, index) => (
            <motion.div
              key={update.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-900/50 rounded-lg border border-slate-700 p-6 hover:border-slate-600 transition-colors cursor-pointer"
              onClick={() => navigate(`/changelog/${update.version}`)}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getTypeIcon(update.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">
                      Version {update.version}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(update.type)}`}>
                      {update.type.charAt(0).toUpperCase() + update.type.slice(1)}
                    </span>
                  </div>
                  <h4 className="text-lg text-slate-300 mb-2">{update.title}</h4>
                  <p className="text-slate-400 mb-4">{update.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(update.date)}</span>
                    </div>
                    <span className="text-slate-500 text-sm">
                      {update.changes.length} changes
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
} 