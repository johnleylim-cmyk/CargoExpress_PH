import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { User, LogOut, ChevronRight, Shield } from 'lucide-react';

const AdminProfilePage = () => {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="page-transition" style={{ maxWidth: 520 }}>
      <h1 className="fw-800 text-2xl mb-24">Profile</h1>

      {/* Profile Card */}
      <div className="profile-card-premium mb-20">
        <div className="profile-card-banner" />
        <div className="profile-card-avatar">
          {(userProfile?.name || 'A')[0].toUpperCase()}
        </div>
        <div className="profile-card-info">
          <div className="profile-card-name">{userProfile?.name || 'Admin'}</div>
          <div className="profile-card-email">{userProfile?.email}</div>
          <span className="profile-card-badge">
            <Shield size={12} /> Administrator
          </span>
        </div>
      </div>

      {/* Menu Items */}
      <div className="card mb-20">
        <button className="profile-menu-item" onClick={() => navigate('/admin/personal-info')}>
          <User size={18} />
          <div className="flex-1">
            <div className="font-semibold text-sm">Personal Information</div>
            <div className="text-xs text-tertiary">Edit your profile details</div>
          </div>
          <ChevronRight size={16} className="menu-arrow" />
        </button>
      </div>

      {/* Sign Out */}
      <button className="btn btn-outline btn-block btn-lg justify-center" onClick={handleLogout} style={{ color: 'var(--error)', borderColor: 'var(--error-glow)' }}>
        <LogOut size={18} /> Sign Out
      </button>
    </div>
  );
};

export default AdminProfilePage;
