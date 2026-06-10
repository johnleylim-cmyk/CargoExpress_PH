import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../lib/database';
import { Bell, Package, Truck, Megaphone, CheckCheck, Loader } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonText } from '../../components/ui/SkeletonLoader';

const iconMap = { order_update: Package, trip_update: Truck, announcement: Megaphone, general: Bell };

const groupByDate = (notifications) => {
  const groups = {};
  notifications.forEach(n => {
    const d = new Date(n.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label;
    if (d.toDateString() === today.toDateString()) label = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else label = d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });

    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });
  return groups;
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    try { setNotifications(await getNotifications(user.id)); } catch (e) { /* silently handled */ }
    finally { setLoading(false); }
  };

  // ── Supabase Realtime: listen for new notifications ──────────────────────
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`notifications_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => {
          // Prevent duplicates (same pattern as SupportChatPage)
          if (prev.some(n => n.id === payload.new.id)) return prev;
          return [payload.new, ...prev];
        });
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleRead = async (id) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      // Single batch DB call instead of N individual calls
      await markAllNotificationsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) { /* silently handled */ }
    finally { setMarkingAll(false); }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const groups = groupByDate(notifications);

  return (
    <div className="page-transition customer-notifications-page">
      <div className="section-header customer-mobile-heading mb-20">
        <div>
          <h2 className="fw-800 flex items-center gap-8">
            Notifications
            {unreadCount > 0 && (
              <span className="badge badge-pending text-xs">
                {unreadCount} new
              </span>
            )}
          </h2>
        </div>
        {unreadCount > 0 && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            {markingAll ? <Loader size={14} className="animate-spin" /> : <CheckCheck size={14} />}
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-12">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="card card-body stagger-item flex gap-12" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="skeleton skeleton-avatar w-40 h-40" />
              <div className="flex-1">
                <SkeletonText lines={2} />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No Notifications"
          description="You're all caught up! New notifications will appear here."
        />
      ) : (
        Object.entries(groups).map(([dateLabel, items]) => (
          <div key={dateLabel}>
            <div className="notification-date-separator">{dateLabel}</div>
            {items.map((n, index) => {
              const Icon = iconMap[n.type] || Bell;
              const isUnread = !n.is_read;
              const CardTag = isUnread ? 'button' : 'article';
              const cardProps = isUnread
                ? {
                    type: 'button',
                    onClick: () => handleRead(n.id),
                    'aria-label': `Mark notification as read: ${n.title}`,
                  }
                : {};

              return (
                <CardTag
                  key={n.id}
                  className={`notification-card stagger-item ${isUnread ? 'unread notification-card-action' : ''}`}
                  style={{ animationDelay: `${index * 40}ms` }}
                  {...cardProps}
                >
                  <div className="notification-icon-wrap">
                    <Icon size={18} />
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">
                      {n.title}
                      {isUnread && <span className="notification-unread-dot" />}
                    </div>
                    <div className="notification-body">{n.message}</div>
                    <div className="notification-time">
                      {new Date(n.created_at).toLocaleString('en-PH', {
                        hour: 'numeric', minute: '2-digit', hour12: true,
                      })}
                    </div>
                  </div>
                </CardTag>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
};

export default NotificationsPage;
