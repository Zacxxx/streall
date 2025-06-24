import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, CheckCheck, Package, Tv, Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notificationService, type Notification, type PlatformUpdate, type SeriesUpdate } from '@/services/notification-service';
import { useNavigate } from 'react-router-dom';

interface NotificationsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Notifications({ isOpen, onClose }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = () => {
    const allNotifications = notificationService.getNotifications();
    const unread = notificationService.getUnreadCount();
    setNotifications(allNotifications);
    setUnreadCount(unread);
  };

  const handleMarkAsRead = (notificationId: string) => {
    notificationService.markAsRead(notificationId);
    loadNotifications();
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
    loadNotifications();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    if (notification.type === 'platform_update') {
      const update = notification.data as PlatformUpdate;
      navigate(`/changelog/${update.version}`);
      onClose();
    } else if (notification.type === 'series_update') {
      const update = notification.data as SeriesUpdate;
      navigate(`/watch/tv/${update.seriesId}`);
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'platform_update':
        return <Package className="w-5 h-5 text-blue-400" />;
      case 'series_update':
        return <Tv className="w-5 h-5 text-green-400" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Notifications Panel */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed top-20 right-4 w-96 max-w-[90vw] bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl z-50 max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    onClick={handleMarkAllAsRead}
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    <CheckCheck className="w-4 h-4 mr-1" />
                    Mark All Read
                  </Button>
                )}
                
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[60vh]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400">No notifications yet</p>
                  <p className="text-slate-500 text-sm mt-1">
                    We'll notify you about platform updates and series you're following
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                      className={`p-4 cursor-pointer transition-colors ${
                        !notification.isRead ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`font-medium text-sm ${
                              notification.isRead ? 'text-slate-300' : 'text-white'
                            }`}>
                              {notification.title}
                            </h4>
                            
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              )}
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification.id);
                                }}
                                variant="ghost"
                                size="sm"
                                className="text-slate-500 hover:text-white p-1 h-auto"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <p className="text-slate-400 text-sm mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1 text-slate-500 text-xs">
                              <Calendar className="w-3 h-3" />
                              {formatDate(notification.timestamp)}
                            </div>
                            
                            <ExternalLink className="w-3 h-3 text-slate-500" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-4 border-t border-slate-700 bg-slate-800/50">
                <Button
                  onClick={() => {
                    navigate('/notifications');
                    onClose();
                  }}
                  variant="ghost"
                  size="sm"
                  className="w-full text-slate-400 hover:text-white justify-center"
                >
                  View All Notifications
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Notification Bell Icon Component
interface NotificationBellProps {
  onClick: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setUnreadCount(notificationService.getUnreadCount());
    };

    updateCount();
    const interval = setInterval(updateCount, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="p-2 text-slate-300 hover:text-white transition-all duration-300 rounded-full hover:bg-white/10 group relative"
      style={{
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
    >
      <Bell className="w-5 h-5 group-hover:text-red-400 transition-colors" />
      
      {unreadCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-black"
          style={{
            boxShadow: '0 0 6px rgba(239, 68, 68, 0.8)'
          }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </motion.div>
      )}
    </motion.button>
  );
} 