import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getOrders, getAnnouncements, getTrips } from '../../lib/database';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonOrderCard, SkeletonStatCard } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import {
  Package, Search, Plus, Megaphone, ArrowRight,
  Container, MapPin, Calendar, Weight, ChevronRight,
  Truck,
} from 'lucide-react';

const HomePage = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders]           = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [activeTrip, setActiveTrip]   = useState(null);  // nearest upcoming trip
  const [trackingSearch, setTrackingSearch] = useState('');
  const [loading, setLoading]         = useState(true);

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    try {
      const [ordersData, annData, tripsData] = await Promise.all([
        getOrders(user.id, false),
        getAnnouncements(),
        // Fetch scheduled + in_progress trips (both may still accept bookings)
        getTrips('active'),
      ]);
      setOrders(ordersData || []);
      setAnnouncements(annData || []);

      // Sort trips ascending by departure_date → pick the earliest upcoming one
      const upcoming = (tripsData || [])
        .filter(t => t.status === 'scheduled' || t.status === 'in_progress')
        .filter(t => t.departure_date && new Date(t.departure_date) > new Date(Date.now() - 86400000))
        .sort((a, b) => new Date(a.departure_date) - new Date(b.departure_date));

      setActiveTrip(upcoming[0] || null);
    } catch (err) {
      // Failed to load — user sees empty UI
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status));

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const fmtDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Track shipment — navigates to tracking page with query
  const handleTrack = (e) => {
    e.preventDefault();
    const q = trackingSearch.trim();
    if (q) navigate(`/track?q=${encodeURIComponent(q)}`);
  };

  // Book Cargo button click — pre-selects route + trip on BookShipmentPage
  const handleBookFromTrip = (trip) => {
    const routeLabel = trip.origin === 'Bohol' ? 'Bohol → Manila' : 'Manila → Bohol';
    navigate('/customer/book', {
      state: { preselectedRoute: routeLabel, preselectedTripId: trip.id },
    });
  };

  const availableSlots = activeTrip
    ? Math.max(0, (activeTrip.capacity || 0) - (activeTrip.current_weight || 0))
    : 0;

  return (
    <div className="page-transition">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="hero animate-slide-up" style={{ marginBottom: 24 }}>
        <p style={{ fontSize: '0.875rem', marginBottom: 4 }}>{greeting()},</p>
        <h2>{userProfile?.name || (user?.email?.split('@')[0]) || 'Welcome'}</h2>
        <p style={{ marginTop: 8 }}>Track and manage your shipments with ease.</p>
        <form onSubmit={handleTrack} style={{ display: 'flex', gap: 10, marginTop: 20, position: 'relative' }}>
          <div className="search-box" style={{ flex: 1 }}>
            <Search size={16} className="search-icon" />
            <input
              placeholder="Enter tracking number (CE-XXXXXXXX)"
              value={trackingSearch}
              onChange={e => setTrackingSearch(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!trackingSearch.trim()}
            style={{ flexShrink: 0, borderRadius: 10 }}
          >
            Track
          </button>
        </form>
      </div>

      {/* ── Loading Skeleton ─────────────────────────────────────── */}
      {loading && (
        <div>
          <div className="stagger-item" style={{ animationDelay: '0ms', marginBottom: 16 }}>
            <SkeletonStatCard />
          </div>
          {[0, 1, 2].map(i => (
            <div key={i} className="stagger-item" style={{ animationDelay: `${(i + 1) * 60}ms`, marginBottom: 12 }}>
              <SkeletonOrderCard />
            </div>
          ))}
        </div>
      )}

      {/* ── Nearest Active / Scheduled Trip Card ────────────────── */}
      {!loading && activeTrip && (
        <div className="stagger-item" style={{ animationDelay: '0ms', marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Truck size={18} color="var(--primary)" /> Next Available Trip
          </h3>
          <div style={{
            background: 'linear-gradient(135deg, var(--accent), #2D5A8A)',
            borderRadius: 16, padding: 20, color: 'white',
            boxShadow: '0 8px 24px rgba(27,58,92,0.25)',
          }}>
            {/* Trip badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{
                background: 'var(--primary-glow)', color: 'var(--primary-light)',
                fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px',
                borderRadius: 20, border: '1px solid rgba(232, 114, 42, 0.35)',
                letterSpacing: '0.04em',
              }}>
                {activeTrip.status === 'in_progress' ? '🚢 In Progress' : '📅 Scheduled'}
              </span>
              <span style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 600 }}>
                {activeTrip.trip_number}
              </span>
            </div>

            {/* Route */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--primary-glow)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <MapPin size={20} color="var(--primary-light)" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: 2 }}>Route</div>
                <div style={{ fontWeight: 800, fontSize: '1.0625rem' }}>
                  {activeTrip.origin} → {activeTrip.destination}
                </div>
              </div>
            </div>

            {/* Dates + Capacity row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Calendar size={13} opacity={0.7} />
                  <span style={{ fontSize: '0.65rem', opacity: 0.65, fontWeight: 600, textTransform: 'uppercase' }}>Departure</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{fmtDate(activeTrip.departure_date)}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Calendar size={13} opacity={0.7} />
                  <span style={{ fontSize: '0.65rem', opacity: 0.65, fontWeight: 600, textTransform: 'uppercase' }}>ETA</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{fmtDate(activeTrip.arrival_date)}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Weight size={13} opacity={0.7} />
                  <span style={{ fontSize: '0.65rem', opacity: 0.65, fontWeight: 600, textTransform: 'uppercase' }}>Avail.</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                  {availableSlots > 0 ? `${availableSlots.toFixed(0)} kg` : 'Full'}
                </div>
              </div>
            </div>

            {/* Price per kilo badge */}
            {activeTrip.price_per_kg && (
              <div style={{
                fontSize: '0.8125rem', opacity: 0.8, marginBottom: 12,
                fontWeight: 600,
              }}>
                ₱{parseFloat(activeTrip.price_per_kg).toFixed(2)} / kg
              </div>
            )}

            {/* Book Cargo CTA */}
            <button
              onClick={() => handleBookFromTrip(activeTrip)}
              style={{
                width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                color: 'white', fontWeight: 700, fontSize: '0.9375rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 16px var(--primary-glow)',
              }}
            >
              <Package size={18} /> Book Cargo for This Trip
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Active Shipments ─────────────────────────────────────── */}
      {!loading && activeOrders.length > 0 && (
        <div className="stagger-item" style={{ animationDelay: '60ms', marginBottom: 24 }}>
          <div className="flex items-center justify-between mb-md">
            <h3 style={{ fontWeight: 700 }}>Active Shipments</h3>
            <Link to="/customer/orders" className="text-sm text-primary font-medium" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>
          {activeOrders.slice(0, 3).map((order, index) => (
            <Link key={order.id} to={`/customer/orders/${order.id}`} className="card card-interactive stagger-item" style={{ display: 'block', marginBottom: 12, textDecoration: 'none', color: 'inherit', animationDelay: `${(index + 2) * 60}ms` }}>
              <div className="card-body" style={{ padding: 16 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--accent)' }}>{order.tracking_number}</span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="text-sm text-secondary">
                  {order.origin || '—'} → {order.destination || '—'}
                </div>
                <div className="text-xs text-tertiary" style={{ marginTop: 4 }}>
                  {order.receiver_name} • ₱{parseFloat(order.shipping_cost || 0).toFixed(2)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Announcements ────────────────────────────────────────── */}
      {!loading && announcements.length > 0 && (
        <div className="stagger-item" style={{ animationDelay: '120ms' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Megaphone size={18} style={{ color: 'var(--primary)' }} />
            Announcements
          </h3>
          {announcements.slice(0, 3).map((a, index) => (
            <div key={a.id} className="card stagger-item" style={{ marginBottom: 12, animationDelay: `${(index + 4) * 60}ms` }}>
              <div className="card-body" style={{ padding: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{a.title}</div>
                <div className="text-sm text-secondary">{a.content}</div>
                <div className="text-xs text-tertiary" style={{ marginTop: 8 }}>
                  {new Date(a.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && orders.length === 0 && !activeTrip && (
        <div className="stagger-item" style={{ animationDelay: '60ms' }}>
          <EmptyState
            icon={Container}
            title="No Shipments Yet"
            description="Start by booking your first shipment! We'll handle the rest."
            actionLabel="Book Shipment"
            onAction={() => navigate('/customer/book')}
          />
        </div>
      )}
    </div>
  );
};

export default HomePage;
