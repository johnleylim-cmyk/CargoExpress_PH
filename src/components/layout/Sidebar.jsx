import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Package, Truck, Users, BarChart3,
  Megaphone, MessageSquare, Settings, LogOut, Container, FileText
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
  { to: '/admin/inbox', icon: MessageSquare, label: 'Inbox' },
];

const systemNav = [
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { logout, userProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderLinks = (items) =>
    items.map(item => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        onClick={onClose}
      >
        <item.icon size={18} />
        <span>{item.label}</span>
      </NavLink>
    ));

  return (
    <>
      {isOpen && <div className="modal-overlay" style={{ zIndex: 99, background: 'rgba(15,23,42,0.5)' }} onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Container size={28} color="var(--primary)" />
          <h1>CARGO<span>EXPRESS</span></h1>
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
          <button className="sidebar-link" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
