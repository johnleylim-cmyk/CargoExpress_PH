import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getOrders } from '../../lib/database';
import { useToast } from '../../hooks/useToast';
import { User, LogOut, ChevronRight, Package, Truck, Bell, MessageCircle } from 'lucide-react';
import ConfirmModal from '../../components/ui/ConfirmModal';
import usePageTitle from '../../hooks/usePageTitle';

const ProfilePage = () => {
  usePageTitle('Profile');
  const { user, userProfile, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [orderStats, setOrderStats] = useState({ total: 0, active: 0, delivered: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setLoading(true);
      getOrders(user.id, false).then(orders => {
        const data = orders || [];
        setOrderStats({
          total: data.length,
          active: data.filter(o => !['Delivered', 'Cancelled'].includes(o.status)).length,
          delivered: data.filter(o => o.status === 'Delivered').length,
        });
      }).catch(() => { toast.error('Failed to load profile stats.'); }).finally(() => setLoading(false));
    }
  }, [user]);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => { setShowLogoutConfirm(false); await logout(); navigate('/login'); };

  const menuItems = [
    { icon: User, color: 'var(--primary)', bg: 'var(--primary-glow)', label: 'Personal Information', desc: 'Edit your profile details', path: '/customer/personal-info' },
    { icon: Bell, color: 'var(--accent)', bg: 'var(--info-bg)', label: 'Notifications', desc: 'View your notifications', path: '/customer/notifications' },
    { icon: MessageCircle, color: 'var(--info)', bg: 'var(--info-bg)', label: 'Support Chat', desc: 'Get help with your shipments', path: '/customer/support' },
  ];

  return (
    <>
    <div className="page-transition profile-page">
      {/* Profile Card */}
      <div className="profile-card-premium animate-slide-up">
        <div className="profile-card-banner" />
        <div style={{ padding: '0 24px 24px', marginTop: -40 }}>
          <div className="profile-card-avatar">
            {(userProfile?.name || 'U')[0].toUpperCase()}
          </div>
          <div className="profile-card-info">
            <h2 className="fw-800 mt-12">{userProfile?.name || 'User'}</h2>
            <p className="text-secondary text-sm">{userProfile?.email}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="profile-quick-stats stagger-item" style={{ animationDelay: '60ms' }}>
        <div className="profile-stat-item">
          <div className="flex items-center justify-center mb-8" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--info-bg)' }}>
            <Package size={18} color="var(--info)" />
          </div>
          <div className="text-xl fw-800 text-accent">{loading ? '—' : orderStats.total}</div>
          <div className="text-xs text-tertiary">Total Orders</div>
        </div>
        <div className="profile-stat-item">
          <div className="flex items-center justify-center mb-8" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-bg)' }}>
            <Truck size={18} color="var(--primary)" />
          </div>
          <div className="text-xl fw-800 text-accent">{loading ? '—' : orderStats.active}</div>
          <div className="text-xs text-tertiary">Active</div>
        </div>
        <div className="profile-stat-item">
          <div className="flex items-center justify-center mb-8" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--success-bg)' }}>
            <Package size={18} color="var(--success)" />
          </div>
          <div className="text-xl fw-800 text-accent">{loading ? '—' : orderStats.delivered}</div>
          <div className="text-xs text-tertiary">Delivered</div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="card stagger-item mb-16 profile-menu-card" style={{ animationDelay: '120ms' }}>
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="profile-menu-item"
              style={{ borderBottom: index < menuItems.length - 1 ? '1px solid var(--border-light)' : 'none' }}
            >
              <div className="flex items-center justify-center flex-shrink-0" style={{
                width: 40, height: 40, borderRadius: 10,
                background: item.bg,
              }}>
                <Icon size={18} color={item.color} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold">{item.label}</div>
                <div className="text-xs text-secondary">{item.desc}</div>
              </div>
              <ChevronRight size={16} color="var(--text-tertiary)" />
            </button>
          );
        })}
      </div>

      {/* Sign Out */}
      <button
        className="btn btn-outline w-full stagger-item justify-center profile-signout"
        onClick={() => setShowLogoutConfirm(true)}
        style={{ color: 'var(--error)', borderColor: 'var(--error-glow)', animationDelay: '180ms' }}
      >
        <LogOut size={18} /> Sign Out
      </button>
    </div>

    <ConfirmModal
      isOpen={showLogoutConfirm}
      onClose={() => setShowLogoutConfirm(false)}
      onConfirm={handleLogout}
      title="Sign Out"
      message="Are you sure you want to sign out?"
      confirmLabel="Sign Out"
      variant="warning"
    />
    </>
  );
};

export default ProfilePage;
