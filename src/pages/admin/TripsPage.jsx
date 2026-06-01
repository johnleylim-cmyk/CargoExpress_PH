import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTrips, withTimeout } from '../../lib/database';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import { Plus, Truck, Calendar, MapPin } from 'lucide-react';

const tabs = ['All', 'scheduled', 'in_progress', 'arrived', 'completed', 'cancelled'];

const AdminTripsPage = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const navigate = useNavigate();

  useEffect(() => { loadTrips(); }, []);
  const loadTrips = async () => {
    setError(null);
    setLoading(true);
    try { 
      const data = await withTimeout(getTrips());
      setTrips(data || []); 
    } catch (e) { 
      setError(e.message || 'Failed to load trips.');
    } finally { 
      setLoading(false); 
    }
  };

  const filtered = activeTab === 'All' ? trips : trips.filter(t => t.status === activeTab);

  return (
    <div className="page-transition">
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <h1 style={{ fontWeight: 800, fontSize: '1.5rem' }}>Trips</h1>
        <button className="btn btn-primary" onClick={() => navigate('/admin/trips/create')}><Plus size={16} /> Create Trip</button>
      </div>
      <div className="tabs admin-mobile-tabs" style={{ marginBottom: 16 }}>
        {tabs.map((t, i) => (
          <button
            key={t}
            className={`tab stagger-item ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {t === 'All' ? 'All' : t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 3 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="card text-center" style={{ padding: 40, color: '#EF4444' }}>
          <h3>Error</h3>
          <p>{error}</p>
          <button className="btn btn-primary mt-md" onClick={loadTrips}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No trips found"
          description={activeTab === 'All' ? 'Create your first trip to start managing deliveries.' : `No trips with status "${activeTab.replace(/_/g, ' ')}".`}
          actionLabel={activeTab === 'All' ? 'Create Trip' : undefined}
          onAction={activeTab === 'All' ? () => navigate('/admin/trips/create') : undefined}
        />
      ) : (
        filtered.map((trip, i) => (
          <Link
            key={trip.id}
            to={`/admin/trips/${trip.id}`}
            className="card card-interactive stagger-item"
            style={{ marginBottom: 12, display: 'block', textDecoration: 'none', color: 'inherit', animationDelay: `${i * 60}ms` }}
          >
            <div className="card-body" style={{ padding: 16 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{trip.trip_number}</span>
                <StatusBadge status={trip.status} size="sm" />
              </div>
              <div className="flex items-center gap-sm text-sm"><MapPin size={14} className="text-primary" />{trip.origin} → {trip.destination}</div>
              <div className="flex items-center gap-sm text-xs text-secondary" style={{ marginTop: 4 }}>
                <Calendar size={14} />{new Date(trip.departure_date).toLocaleDateString()}
                {trip.vehicle_info && <> • {trip.vehicle_info}</>}
              </div>
              {trip.capacity > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div className="capacity-bar"><div className={`capacity-fill ${(trip.current_weight || 0) / trip.capacity > 0.8 ? 'warning' : ''}`} style={{ width: `${Math.min(100, ((trip.current_weight || 0) / trip.capacity) * 100)}%` }} /></div>
                  <div className="text-xs text-tertiary" style={{ marginTop: 4 }}>{(trip.current_weight || 0).toFixed(1)} / {trip.capacity} kg</div>
                </div>
              )}
            </div>
          </Link>
        ))
      )}
    </div>
  );
};

export default AdminTripsPage;
