import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ErrorBoundary from '../ui/ErrorBoundary';
import { Menu, Container } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userProfile } = useAuth();

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn-icon btn-ghost mobile-menu-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
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
            <div className="sidebar-user-avatar" style={{ width: 36, height: 36, fontSize: '0.875rem' }}>
              {(userProfile?.name || 'A')[0].toUpperCase()}
            </div>
          </div>
        </header>
        <main className="page-content page-transition">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <style>{`
        .mobile-menu-toggle { display: none; }
        .topbar-logo-icon { display: none; }
        @media (max-width: 1024px) {
          .mobile-menu-toggle { display: flex !important; }
          .topbar-logo-icon { display: block !important; }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;
