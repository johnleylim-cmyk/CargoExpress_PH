import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats, getVanCapacity, withTimeout } from '../../lib/database';
import StatusBadge from '../../components/ui/StatusBadge';
import CapacityTracker from '../../components/ui/CapacityTracker';
import { SkeletonStatCard, SkeletonTableRow } from '../../components/ui/SkeletonLoader';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import PageTransition, { StaggerItem } from '../../components/ui/PageTransition';
import ErrorBoundarySection from '../../components/ui/ErrorBoundarySection';
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
    <PageTransition>
      <div className="card text-center" style={{ padding: 40, color: 'var(--error)' }}>
        <h3>Error</h3>
        <p>{error}</p>
        <button type="button" className="btn btn-primary mt-md" onClick={loadData}>Retry</button>
      </div>
    </PageTransition>
  );

  const statCards = [
    { label: 'Total Orders', value: stats?.totalOrders || 0, icon: Package, tone: 'primary' },
    { label: 'Pending', value: stats?.pendingOrders || 0, icon: Clock, tone: 'warning' },
    { label: 'Active Trips', value: stats?.activeTrips || 0, icon: Truck, tone: 'info' },
    { label: 'Customers', value: stats?.totalCustomers || 0, icon: Users, tone: 'success' },
  ];

  return (
    <PageTransition>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">Live operations, trip capacity, and recent order movement.</p>
        </div>
      </div>

      {/* Stat Cards */}
      <ErrorBoundarySection message="Stats failed to load.">
        <div className="grid grid-4 mb-24">
          {loading ? (
            <>
              {Array.from({ length: 4 }, (_, i) => (
                <SkeletonStatCard key={i} />
              ))}
            </>
          ) : (
            statCards.map((s, i) => (
              <StaggerItem key={i} className={`stat-card stat-card-${s.tone}`} delay={i * 60}>
                <div className="stat-icon"><s.icon size={40} /></div>
                <div className="stat-value">
                  <AnimatedCounter value={s.value} duration={1200} />
                </div>
                <div className="stat-label">{s.label}</div>
              </StaggerItem>
            ))
          )}
        </div>
      </ErrorBoundarySection>

      <div className="grid grid-2 mb-24">
        {/* Van Capacity */}
        <ErrorBoundarySection message="Capacity info unavailable.">
          <StaggerItem className="card admin-section-card" delay={240}>
          <div className="card-header"><h3><Gauge size={16} className="inline mr-8" />Van Capacity</h3></div>
          <div className="card-body">
            {loading ? (
              <div className="p-20">
                <div className="skeleton skeleton-text mb-12" style={{ width: '60%' }} />
                <div className="skeleton" style={{ height: 14, borderRadius: 7 }} />
              </div>
            ) : capacity?.activeTrip ? (
              <>
                <div className="text-sm text-secondary mb-12">
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
              <div className="text-center text-secondary p-20">No active trip</div>
            )}
          </div>
        </StaggerItem>
        </ErrorBoundarySection>

        {/* Quick Stats */}
        <ErrorBoundarySection message="Quick stats unavailable.">
        <StaggerItem className="card admin-section-card" delay={300}>
          <div className="card-header"><h3><TrendingUp size={16} className="inline mr-8" />Quick Stats</h3></div>
          <div className="card-body">
            <div className="flex justify-between py-12" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <span className="text-secondary text-sm">In Transit</span>
              <span className="font-bold">{loading ? '—' : stats?.inTransit || 0}</span>
            </div>
            <div className="flex justify-between py-12" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <span className="text-secondary text-sm">Awaiting Pickup</span>
              <span className="font-bold">{loading ? '—' : stats?.awaitingPickup || 0}</span>
            </div>
            <div className="flex justify-between py-12">
              <span className="text-secondary text-sm">Total Customers</span>
              <span className="font-bold">{loading ? '—' : stats?.totalCustomers || 0}</span>
            </div>
          </div>
        </StaggerItem>
        </ErrorBoundarySection>
      </div>

      {/* Recent Orders */}
      <ErrorBoundarySection message="Recent orders failed to load.">
      <StaggerItem className="card admin-section-card admin-table-card" delay={360}>
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
                      <td data-label="Tracking"><Link to={`/admin/orders/${o.id}`} className="fw-600 text-accent">{o.tracking_number}</Link></td>
                      <td data-label="Customer">{o.profiles?.name || '—'}</td>
                      <td data-label="Status"><StatusBadge status={o.status} size="sm" /></td>
                      <td data-label="Date" className="text-sm text-secondary">{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {recent.length === 0 && <tr><td colSpan={4} className="text-center text-secondary" style={{ padding: 40 }}>No orders yet</td></tr>}
                </>
              )}
            </tbody>
          </table>
        </div>
      </StaggerItem>
      </ErrorBoundarySection>
    </PageTransition>
  );
};

export default DashboardPage;
