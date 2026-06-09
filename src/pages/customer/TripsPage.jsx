import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrips } from '../../lib/database';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonOrderCard } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import { Calendar, Truck, AlertCircle, ChevronRight } from 'lucide-react';

const formatTripDate = (value) => {
  if (!value) return { month: 'TBD', day: '--', full: 'Date not set' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { month: 'TBD', day: '--', full: 'Date not set' };
  return {
    month: date.toLocaleDateString('en-PH', { month: 'short' }).toUpperCase(),
    day: date.toLocaleDateString('en-PH', { day: 'numeric' }),
    full: date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }),
  };
};

const TripsPage = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getTrips('active')
      .then(setTrips)
      .catch(err => {
        // Failed to load — error shown via empty state
        setError(err.message || 'Failed to load trips.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-transition customer-trips-page">
      <div className="customer-page-heading">
        <div>
          <h2 className="fw-800 mb-4">Available Trips</h2>
          <p className="text-sm text-secondary">Choose a route and reserve cargo space fast.</p>
        </div>
        {!loading && <span className="badge badge-success">{trips.length} active</span>}
      </div>

      {loading ? (
        <div>
          {[0, 1, 2].map(i => (
            <div key={i} className="stagger-item mb-12" style={{ animationDelay: `${i * 60}ms` }}>
              <SkeletonOrderCard />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card animate-scale-in text-center" style={{ padding: 40 }}>
          <div className="flex items-center justify-center mx-auto mb-16" style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--error-bg)' }}>
            <AlertCircle size={28} color="var(--error)" />
          </div>
          <h3 className="mb-8" style={{ color: 'var(--error-dark)' }}>Error Loading Trips</h3>
          <p className="text-secondary text-sm mb-20">{error}</p>
          <button className="btn btn-primary" onClick={() => { setError(null); setLoading(true); getTrips('active').then(setTrips).catch(err => setError(err.message || 'Failed to load trips.')).finally(() => setLoading(false)); }}>Retry</button>
        </div>
      ) : trips.length === 0 ? (
        <div className="animate-scale-in">
          <EmptyState
            icon={Truck}
            title="No Active Trips"
            description="There are no scheduled trips at the moment. Check back later for available trips."
          />
        </div>
      ) : (
        trips.map((trip, index) => {
          const tripDate = formatTripDate(trip.departure_date);
          return (
            <button
              key={trip.id}
              type="button"
              className="customer-trip-list-card card card-interactive stagger-item mb-12"
              style={{ animationDelay: `${index * 60}ms` }}
              onClick={() => navigate('/customer/book', { state: { preselectedRoute: `${trip.origin} → ${trip.destination}`, preselectedTripId: trip.id } })}
            >
              <div className="card-body p-16">
                <div className="customer-trip-row">
                  <div className="customer-trip-date-badge">
                    <span>{tripDate.month}</span>
                    <strong>{tripDate.day}</strong>
                  </div>
                  <div>
                    <div className="customer-list-card-top mb-6">
                      <span className="customer-list-card-title">{trip.origin} to {trip.destination}</span>
                      <StatusBadge status={trip.status} size="sm" />
                    </div>
                    <div className="customer-list-card-meta mb-4">
                      <Truck size={14} />
                      <span>{trip.trip_number}</span>
                    </div>
                    <div className="customer-list-card-route">
                      <Calendar size={14} />
                      <span>{tripDate.full}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="customer-card-chevron" />
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
};

export default TripsPage;
