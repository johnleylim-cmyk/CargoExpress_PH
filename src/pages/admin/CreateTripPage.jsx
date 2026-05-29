import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTrip } from '../../lib/database';
import { ROUTES } from '../../constants/phLocations';
import { ArrowLeft, Loader, Truck, DollarSign, Package, FileText } from 'lucide-react';

const CreateTripPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [form, setForm] = useState({
    origin: '', destination: '',
    departure_date: '', arrival_date: '',
    capacity:     1000,
    price_per_kg: 70,
    notes: '',
  });

  const u = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleRouteSelect = (route) => {
    u('origin', route.origin);
    u('destination', route.destination);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!form.origin || !form.destination) { setError('Please select a route.'); return; }
    if (!form.departure_date) { setError('Departure date is required.'); return; }
    if (!form.capacity || isNaN(Number(form.capacity)) || Number(form.capacity) <= 0) {
      setError('Capacity must be a positive number.'); return;
    }
    if (!form.price_per_kg || isNaN(Number(form.price_per_kg)) || Number(form.price_per_kg) <= 0) {
      setError('Amount per kilo must be a positive number.'); return;
    }

    setLoading(true);
    try {
      const result = await createTrip({
        ...form,
        capacity:     Number(form.capacity),
        price_per_kg: Number(form.price_per_kg),
      });
      navigate(`/admin/trips/${result.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const routeSelected = form.origin && form.destination;

  return (
    <div className="page-transition">
      <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ marginBottom: 16 }}>
        <ArrowLeft size={18} /> Back
      </button>
      <h1 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: 24 }}>Create New Trip</h1>

      {error && (
        <div className="alert-banner alert-banner-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* ── Route ─────────────────────────────────────── */}
        <div className="card stagger-item" style={{ marginBottom: 16, animationDelay: '0ms' }}>
          <div className="card-body">
            <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Truck size={18} color="var(--primary)" /> Route *
            </h3>
            <div style={{ display: 'flex', gap: 12 }}>
              {ROUTES.map(r => (
                <button
                  type="button" key={r.label}
                  onClick={() => handleRouteSelect(r)}
                  className={`card-interactive ${form.origin === r.origin ? '' : ''}`}
                  style={{
                    flex: 1, padding: 20, borderRadius: 12,
                    border: form.origin === r.origin ? '2px solid var(--primary)' : '1.5px solid #E2E8F0',
                    background: form.origin === r.origin ? '#FFF7F0' : 'white',
                    cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  <Truck size={22} color={form.origin === r.origin ? 'var(--primary)' : '#94A3B8'} style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{r.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 4 }}>
                    {r.origin} → {r.destination}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Schedule ──────────────────────────────────── */}
        <div className="card stagger-item" style={{ marginBottom: 16, animationDelay: '60ms' }}>
          <div className="card-body">
            <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              📅 Schedule *
            </h3>
            <div className="grid grid-2" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Departure Date & Time *</label>
                <input
                  type="datetime-local" className="form-input"
                  value={form.departure_date}
                  onChange={e => u('departure_date', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Estimated Arrival Date & Time</label>
                <input
                  type="datetime-local" className="form-input"
                  value={form.arrival_date}
                  onChange={e => u('arrival_date', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Capacity & Pricing ────────────────────────── */}
        <div className="card stagger-item" style={{ marginBottom: 16, animationDelay: '120ms' }}>
          <div className="card-body">
            <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={18} color="var(--primary)" /> Capacity & Pricing *
            </h3>
            <div className="grid grid-2" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Capacity (kg) *</label>
                <input
                  type="number" className="form-input"
                  value={form.capacity}
                  onChange={e => u('capacity', e.target.value)}
                  placeholder="e.g. 1000"
                  min="1" step="1"
                  required
                />
                <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 4 }}>
                  Maximum total cargo weight for this trip.
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Amount per Kilo (₱) *</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={16} style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: '#94A3B8', pointerEvents: 'none',
                  }} />
                  <input
                    type="number" className="form-input"
                    value={form.price_per_kg}
                    onChange={e => u('price_per_kg', e.target.value)}
                    placeholder="e.g. 70"
                    min="0.01" step="0.01"
                    style={{ paddingLeft: 34 }}
                    required
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 4 }}>
                  Cost per kilogram for bookings on this trip.
                </p>
              </div>
            </div>

            {/* Live preview */}
            {form.capacity && form.price_per_kg && (
              <div className="alert-banner" style={{
                marginTop: 8,
                background: 'linear-gradient(135deg, #FFF7F0, #FFF3E8)',
                border: '1.5px solid var(--primary-light)',
                color: '#92400E',
              }}>
                💡 At ₱{parseFloat(form.price_per_kg).toFixed(2)}/kg, a full trip of {Number(form.capacity).toLocaleString()} kg
                = <strong>₱{(Number(form.capacity) * Number(form.price_per_kg)).toLocaleString()} max revenue</strong>
              </div>
            )}
          </div>
        </div>

        {/* ── Notes ───────────────────────────────────── */}
        <div className="card stagger-item" style={{ marginBottom: 24, animationDelay: '180ms' }}>
          <div className="card-body">
            <h3 style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} color="#94A3B8" /> Notes <span style={{ fontWeight: 400, color: '#94A3B8', fontSize: '0.8125rem' }}>(Optional)</span>
            </h3>
            <textarea
              className="form-textarea"
              value={form.notes}
              onChange={e => u('notes', e.target.value)}
              placeholder="Any special instructions, remarks, or conditions for this trip..."
              rows={3}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={loading || !routeSelected}
          style={{ minWidth: 180 }}
        >
          {loading
            ? <><Loader size={18} className="animate-spin" /> Creating...</>
            : <><Truck size={18} /> Create Trip</>
          }
        </button>
      </form>
    </div>
  );
};

export default CreateTripPage;
