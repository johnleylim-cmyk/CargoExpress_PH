import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  LayoutDashboard, Package, Truck, Users, BarChart3,
  Megaphone, MessageSquare, Settings, LogOut, Container, FileText, Mail,
  ChevronsLeft, ArrowLeft
} from 'lucide-react';

const mainNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/orders', icon: Package, label: 'Orders' },
  { to: '/admin/trips', icon: Truck, label: 'Trips' },
  { to: '/admin/customers', icon: Users, label: 'Customers' },
];

const toolsNav = [
  { to: '/admin/sales', icon: BarChart3, label: 'Sales' },
  { to: '/admin/reports', icon: FileText, label: 'Reports' },
  { to: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
  { to: '/admin/inbox', icon: MessageSquare, label: 'Inbox', badgeKey: 'inbox' },
  { to: '/admin/contact-inquiries', icon: Mail, label: 'Inquiries', badgeKey: 'inquiries' },
];

const systemNav = [
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

const Sidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const { logout, userProfile } = useAuth();
  const navigate = useNavigate();
  const [badges, setBadges] = useState({ inbox: 0, inquiries: 0 });

  useEffect(() => {
    if (userProfile?.role !== 'admin') return;

    let isMounted = true;

    const loadBadges = async () => {
      const [inboxResult, inquiriesResult] = await Promise.allSettled([
        supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('sender_role', 'customer')
          .eq('is_read', false),
        supabase
          .from('contact_inquiries')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new'),
      ]);

      if (!isMounted) return;

      setBadges({
        inbox: inboxResult.status === 'fulfilled' ? inboxResult.value.count || 0 : 0,
        inquiries: inquiriesResult.status === 'fulfilled' ? inquiriesResult.value.count || 0 : 0,
      });
    };

    loadBadges();

    const channel = supabase.channel('admin_sidebar_badges')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
      }, loadBadges)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contact_inquiries',
      }, loadBadges)
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userProfile?.role]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatBadge = (count) => count > 99 ? '99+' : String(count);

  const renderLinks = (items) =>
    items.map(item => {
      const badgeCount = item.badgeKey ? badges[item.badgeKey] || 0 : 0;
      return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        onClick={onClose}
        data-tooltip={item.label}
      >
        <item.icon size={18} />
        <span className="sidebar-link-label">{item.label}</span>
        {badgeCount > 0 && (
          <span className="sidebar-count-badge" aria-label={`${badgeCount} unread`}>
            {formatBadge(badgeCount)}
          </span>
        )}
      </NavLink>
      );
    });

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside
        id="admin-sidebar"
        className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
        aria-label="Admin navigation"
      >
        {/* Collapse toggle (desktop only) */}
        <button
          className="sidebar-collapse-btn"
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronsLeft size={16} />
        </button>

        <div className="sidebar-brand">
          <Container size={28} color="var(--primary)" />
          <h1>CARGO<span>EXPRESS</span></h1>
          <button
            className="sidebar-drawer-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close admin navigation"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main</div>
          {renderLinks(mainNav)}

          <div className="sidebar-section-label">Management</div>
          {renderLinks(toolsNav)}

          <div className="sidebar-section-label">System</div>
          {renderLinks(systemNav)}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">
              {(userProfile?.name || 'A')[0].toUpperCase()}
            </div>
            <div>
              <div className="sidebar-user-name">{userProfile?.name || 'Admin'}</div>
              <div className="sidebar-user-role">Administrator</div>
            </div>
          </div>
          <button className="sidebar-link danger" type="button" onClick={handleLogout} data-tooltip="Sign Out">
            <LogOut size={18} />
            <span className="sidebar-link-label">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
