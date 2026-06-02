import { useState, useEffect } from 'react';
import { getTrips } from '../../lib/database';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonOrderCard } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import { MapPin, Calendar, Truck, AlertCircle } from 'lucide-react';

const TripsPage = () => {
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
    <div className="page-transition">
      <h2 className="fw-800 mb-20">Available Trips</h2>

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
          <div className="flex items-center justify-center mx-auto mb-16" style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEF2F2' }}>
            <AlertCircle size={28} color="#EF4444" />
          </div>
          <h3 className="mb-8" style={{ color: '#DC2626' }}>Error Loading Trips</h3>
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
        trips.map((trip, index) => (
          <div key={trip.id} className="card card-interactive stagger-item mb-12" style={{ animationDelay: `${index * 60}ms` }}>
            <div className="card-body p-16">
              <div className="flex items-center justify-between mb-8">
                <span className="fw-700 text-accent">{trip.trip_number}</span>
                <StatusBadge status={trip.status} size="sm" />
              </div>
              <div className="flex items-center gap-sm text-sm mb-4">
                <MapPin size={14} className="text-primary" />{trip.origin} → {trip.destination}
              </div>
              <div className="flex items-center gap-sm text-xs text-secondary">
                <Calendar size={14} />{new Date(trip.departure_date).toLocaleDateString()}
              </div>

            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default TripsPage;
