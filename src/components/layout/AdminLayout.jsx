import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ErrorBoundary from '../ui/ErrorBoundary';
import PageTransition from '../ui/PageTransition';
import CommandPalette from '../ui/CommandPalette';
import { Menu, Container, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const COLLAPSE_KEY = 'sidebar_collapsed';
const DRAWER_QUERY = '(max-width: 1024px)';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const { userProfile } = useAuth();

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const toggleCollapse = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    const drawerQuery = window.matchMedia(DRAWER_QUERY);
    const handleViewportChange = () => {
      if (!drawerQuery.matches) {
        setSidebarOpen(false);
      }
    };

    handleViewportChange();

    if (drawerQuery.addEventListener) {
      drawerQuery.addEventListener('change', handleViewportChange);
      return () => drawerQuery.removeEventListener('change', handleViewportChange);
    }

    drawerQuery.addListener(handleViewportChange);
    return () => drawerQuery.removeListener(handleViewportChange);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return undefined;

    const drawerQuery = window.matchMedia(DRAWER_QUERY);
    if (!drawerQuery.matches) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [sidebarOpen]);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdPaletteOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`app-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}${sidebarOpen ? ' sidebar-drawer-open' : ''}`}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn-icon btn-ghost mobile-menu-toggle"
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open admin navigation"
              aria-controls="admin-sidebar"
              aria-expanded={sidebarOpen}
            >
              <Menu size={20} />
            </button>
            <div className="topbar-title">
              <Container size={22} color="var(--primary)" className="topbar-logo-icon" />
              <span>
                <span style={{ color: 'var(--accent)' }}>CARGO</span>
                <span style={{ color: 'var(--primary)' }}>EXPRESS</span>
              </span>
            </div>
          </div>
          <div className="topbar-actions">
            {/* Command Palette Trigger */}
            <button
              className="btn-icon btn-ghost"
              type="button"
              onClick={() => setCmdPaletteOpen(true)}
              title="Search (Ctrl+K)"
              aria-label="Open command palette"
              style={{ gap: 6, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}
            >
              <Search size={17} />
              <kbd style={{
                fontSize: '0.625rem', fontWeight: 600,
                background: 'var(--bg-secondary)',
                padding: '1px 5px', borderRadius: 3,
                border: '1px solid var(--border-light)',
                fontFamily: 'inherit', color: 'var(--text-tertiary)',
              }}>
                Ctrl K
              </kbd>
            </button>
            <div className="sidebar-user-avatar" style={{ width: 36, height: 36, fontSize: '0.875rem' }}>
              {(userProfile?.name || 'A')[0].toUpperCase()}
            </div>
          </div>
        </header>
        <PageTransition as="main" className="page-content">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </PageTransition>
      </div>

      {/* Command Palette */}
      <CommandPalette isOpen={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />

      <style>{`
        .mobile-menu-toggle { display: none; }
        .topbar-logo-icon { display: none; }
        @media (max-width: 1024px) {
          .mobile-menu-toggle { display: flex !important; }
          .topbar-logo-icon { display: block !important; }
          .sidebar-collapse-btn { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;
