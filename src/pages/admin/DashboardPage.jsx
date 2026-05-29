import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats, getVanCapacity, withTimeout } from '../../lib/database';
import StatusBadge from '../../components/ui/StatusBadge';
import CapacityTracker from '../../components/ui/CapacityTracker';
import { SkeletonStatCard, SkeletonTableRow } from '../../components/ui/SkeletonLoader';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import { Package, Truck, Users, Clock, ArrowRight, TrendingUp, Gauge } from 'lucide-react';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    setError(null);
    setLoading(true);
    try {
      const [dashData, capData] = await Promise.all([
        withTimeout(getDashboardStats()), 
        withTimeout(getVanCapacity())
      ]);
      setStats(dashData.stats);
      setRecent(dashData.recentOrders || []);
      setCapacity(capData);
    } catch (e) { 
      setError(e.message || 'Failed to load dashboard data.');
    } finally { 
      setLoading(false); 
    }
  };

  if (error) return (
    <div className="page-transition">
      <div className="card text-center" style={{ padding: 40, color: '#EF4444' }}>
        <h3>Error</h3>
        <p>{error}</p>
        <button className="btn btn-primary mt-md" onClick={loadData}>Retry</button>
      </div>
    </div>
  );

  const statCards = [
    { label: 'Total Orders', value: stats?.totalOrders || 0, icon: Package, gradient: 'linear-gradient(135deg, var(--primary), var(--primary-light))' },
    { label: 'Pending', value: stats?.pendingOrders || 0, icon: Clock, gradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)' },
    { label: 'Active Trips', value: stats?.activeTrips || 0, icon: Truck, gradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)' },
    { label: 'Customers', value: stats?.totalCustomers || 0, icon: Users, gradient: 'linear-gradient(135deg, #10B981, #34D399)' },
  ];



  return (
    <div className="page-transition">
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: '1.5rem' }}>Dashboard</h1>
          <p className="text-secondary text-sm">Welcome back, Admin</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        {loading ? (
          <>
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </>
        ) : (
          statCards.map((s, i) => (
            <div key={i} className="stat-card stagger-item" style={{ background: s.gradient, animationDelay: `${i * 60}ms` }}>
              <div className="stat-icon"><s.icon size={40} /></div>
              <div className="stat-value">
                <AnimatedCounter value={s.value} duration={1200} />
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        {/* Van Capacity */}
        <div className="card stagger-item" style={{ animationDelay: '240ms' }}>
          <div className="card-header"><h3><Gauge size={16} style={{ display: 'inline', marginRight: 8 }} />Van Capacity</h3></div>
          <div className="card-body">
            {loading ? (
              <div style={{ padding: 20 }}>
                <div className="skeleton skeleton-text" style={{ width: '60%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 14, borderRadius: 7 }} />
              </div>
            ) : capacity?.activeTrip ? (
              <>
                <div className="text-sm text-secondary" style={{ marginBottom: 12 }}>
                  {capacity.activeTrip.trip_number} • {capacity.activeTrip.origin} → {capacity.activeTrip.destination}
                </div>
                <CapacityTracker
                  currentWeight={capacity.totalWeight}
                  maxCapacity={capacity.maxCapacity}
                  tripNumber={capacity.activeTrip.trip_number}
                  showLabel={false}
                />
              </>
            ) : (
              <div className="text-center text-secondary" style={{ padding: 20 }}>No active trip</div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card stagger-item" style={{ animationDelay: '300ms' }}>
          <div className="card-header"><h3><TrendingUp size={16} style={{ display: 'inline', marginRight: 8 }} />Quick Stats</h3></div>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
              <span className="text-secondary text-sm">In Transit</span>
              <span className="font-bold">{loading ? '—' : stats?.inTransit || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
              <span className="text-secondary text-sm">Awaiting Pickup</span>
              <span className="font-bold">{loading ? '—' : stats?.awaitingPickup || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
              <span className="text-secondary text-sm">Total Customers</span>
              <span className="font-bold">{loading ? '—' : stats?.totalCustomers || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card stagger-item" style={{ animationDelay: '360ms' }}>
        <div className="card-header">
          <h3>Recent Orders</h3>
          <Link to="/admin/orders" className="btn btn-ghost btn-sm">View All <ArrowRight size={14} /></Link>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Tracking</th><th>Customer</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }, (_, i) => <SkeletonTableRow key={i} cols={4} />)
              ) : (
                <>
                  {recent.map(o => (
                    <tr key={o.id}>
                      <td><Link to={`/admin/orders/${o.id}`} style={{ fontWeight: 600, color: 'var(--accent)' }}>{o.tracking_number}</Link></td>
                      <td>{o.profiles?.name || '—'}</td>
                      <td><StatusBadge status={o.status} size="sm" /></td>
                      <td className="text-sm text-secondary">{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {recent.length === 0 && <tr><td colSpan={4} className="text-center text-secondary" style={{ padding: 40 }}>No orders yet</td></tr>}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
