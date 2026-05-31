import { useState, useEffect } from 'react';
import { getTrips } from '../../lib/database';
import { X, Truck, Loader, MapPin, AlertTriangle } from 'lucide-react';
import FocusTrap from './FocusTrap';

/**
 * TripAssignModal — Assign an order to an available trip
 * Only shows trips that match the order's route (origin → destination)
 */
const TripAssignModal = ({ order, onClose, onAssign }) => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const data = await getTrips('active');
      // Filter trips matching this order's route
      const matching = (data || []).filter(t =>
        t.origin === order.origin && t.destination === order.destination
      );
      setTrips(matching);
    } catch (err) {
      // Trip loading failed silently — empty list shown
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedTrip) return;
    setSaving(true);
    try {
      await onAssign(selectedTrip.id);
    } catch (err) {
      // Assignment error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <FocusTrap active>
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3><Truck size={18} style={{ display: 'inline', marginRight: 8 }} />Assign to Trip</h3>
          <button className="btn-icon btn-ghost" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div style={{
            background: '#F8FAFC', borderRadius: 8, padding: 12, marginBottom: 16,
            fontSize: '0.8125rem', color: '#64748B',
          }}>
            <MapPin size={14} style={{ display: 'inline', marginRight: 6 }} />
            Route: <strong>{order.origin} → {order.destination}</strong>
          </div>

          {loading ? (
            <div className="text-center" style={{ padding: 30 }}>
              <Loader size={24} className="animate-spin" style={{ margin: '0 auto' }} />
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center" style={{ padding: 30, color: '#94A3B8' }}>
              <Truck size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
              <p>No active trips for this route</p>
              <p style={{ fontSize: '0.75rem', marginTop: 4 }}>Create a trip with matching origin/destination first</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {trips.map(trip => {
                const isSelected = selectedTrip?.id === trip.id;
                const capPct = trip.capacity > 0 ? (trip.current_weight / trip.capacity) * 100 : 0;
                const orderWeight = parseFloat(order.actual_weight || order.package_weight || 0);
                const availableWeight = trip.capacity > 0 ? Number(trip.capacity) - Number(trip.current_weight || 0) : Infinity;
                const exceedsCapacity = trip.capacity > 0 && orderWeight > availableWeight;
                const overloadWeight = Math.max(0, orderWeight - availableWeight);

                return (
                  <div
                    key={trip.id}
                    onClick={() => setSelectedTrip(trip)}
                    style={{
                      padding: 14, borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${isSelected ? 'var(--primary)' : '#E2E8F0'}`,
                      background: isSelected ? 'var(--primary-glow)' : 'white',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{trip.trip_number}</span>
                      <span style={{
                        fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px',
                        borderRadius: 4,
                        background: trip.status === 'scheduled' ? '#EFF6FF' : '#FFF7ED',
                        color: trip.status === 'scheduled' ? '#1D4ED8' : '#C2410C',
                      }}>
                        {trip.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748B', marginBottom: 6 }}>
                      {trip.origin} → {trip.destination}
                    </div>
                    <div className="capacity-bar" style={{ height: 6, borderRadius: 3 }}>
                      <div
                        className={`capacity-fill ${capPct > 80 ? 'warning' : ''}`}
                        style={{ width: `${Math.min(100, capPct)}%` }}
                      />
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: 4 }}>
                      {(trip.current_weight || 0).toFixed(1)} / {trip.capacity} kg
                    </div>
                    {exceedsCapacity && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.6875rem', color: '#B45309', marginTop: 6 }}>
                        <AlertTriangle size={12} />
                        Exceeds capacity by {overloadWeight.toFixed(1)} kg. Admin override allowed.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleAssign}
            disabled={!selectedTrip || saving}
          >
            {saving ? <Loader size={16} className="animate-spin" /> : null}
            Assign to {selectedTrip?.trip_number || 'Trip'}
          </button>
        </div>
      </div>
    </div>
    </FocusTrap>
  );
};

export default TripAssignModal;
