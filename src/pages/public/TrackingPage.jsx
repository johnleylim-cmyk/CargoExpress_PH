import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Container, Search, Loader, Package, MapPin, ArrowRight, Check, Clock, Weight, User, DollarSign } from 'lucide-react';
import { STATUS_TIMELINE, STATUS_COLORS } from '../../constants/status';
import TrackingTimeline from '../../components/ui/TrackingTimeline';

const TrackingPage = () => {
  const [searchParams] = useSearchParams();
  const [trackingNumber, setTrackingNumber] = useState(searchParams.get('q') || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  // Auto-search if query param provided
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q.trim()) {
      setTrackingNumber(q.trim().toUpperCase());
      doSearch(q.trim().toUpperCase());
    }
  }, []);

  const doSearch = async (tn) => {
    setLoading(true);
    setError('');
    setOrder(null);
    setSearched(true);
    try {
      const { data, error: fetchError } = await supabase
        .rpc('track_order_public', { p_tracking_number: tn })
        .maybeSingle();
      if (fetchError || !data) {
        setError('No shipment found with this tracking number. Please check and try again.');
      } else {
        setOrder(data);
      }
    } catch (err) {
      setError('Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;
    doSearch(trackingNumber.trim().toUpperCase());
  };

  return (
    <div className="tracking-page">
      {/* Header */}
      <div className="tracking-header animate-fade-in">
        <Link to="/login" className="tracking-brand">
          <Container size={32} color="var(--primary)" />
          <h1>CARGO<span>EXPRESS PH</span></h1>
        </Link>
        <p className="tracking-subtitle">Track your shipment in real-time</p>
      </div>

      {/* Search */}
      <form className="tracking-search-form" onSubmit={handleSearch}>
        <div className="tracking-search-wrapper">
          <Search size={20} className="tracking-search-icon" />
          <input
            id="tracking-input"
            type="text"
            className="tracking-search-input"
            placeholder="Enter tracking number (e.g., CE-20260430-1234)"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
            autoFocus
          />
          <button type="submit" className="tracking-search-btn" disabled={loading || !trackingNumber.trim()}>
            {loading ? <Loader size={18} className="animate-spin" /> : 'Track'}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="tracking-error animate-slide-up">
          <Package size={48} style={{ opacity: 0.3 }} />
          <p>{error}</p>
        </div>
      )}

      {/* Result */}
      {order && (
        <div className="tracking-result">
          {/* Status Header */}
          <div className="tracking-status-header" style={{
            background: STATUS_COLORS[order.status]?.bg || 'var(--bg)',
            borderColor: STATUS_COLORS[order.status]?.border || 'var(--border)',
          }}>
            <div className="tracking-status-label" style={{ color: STATUS_COLORS[order.status]?.text }}>
              {order.status === 'Delivered' ? '🎉' : order.status === 'Cancelled' ? '❌' : '📦'} {order.status}
            </div>
            <div className="tracking-number-display">{order.tracking_number}</div>
          </div>

          {/* Timeline - use the premium TrackingTimeline component */}
          <div style={{ padding: '16px 24px' }}>
            <TrackingTimeline currentStatus={order.status} />
          </div>

          {/* Shipment Info */}
          <div className="tracking-info-grid">
            <div className="tracking-info-card">
              <h4><MapPin size={14} /> Route</h4>
              <p>{order.origin || '—'} <ArrowRight size={14} style={{ verticalAlign: 'middle' }} /> {order.destination || '—'}</p>
            </div>
            <div className="tracking-info-card">
              <h4><Package size={14} /> Package</h4>
              <p>{order.package_description || 'No description'}</p>
              <span className="tracking-info-meta">
                <Weight size={12} style={{ verticalAlign: 'middle' }} /> {order.actual_weight || order.package_weight || '—'} kg
              </span>
            </div>
            <div className="tracking-info-card">
              <h4><User size={14} /> Sender</h4>
              <p>{order.sender_name}</p>
            </div>
            <div className="tracking-info-card">
              <h4><User size={14} /> Receiver</h4>
              <p>{order.receiver_name}</p>
            </div>
          </div>

          {/* Shipping Cost */}
          {order.shipping_cost && (
            <div style={{ padding: '0 24px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={14} color="var(--text-tertiary)" />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Shipping Cost:</span>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>₱{parseFloat(order.shipping_cost).toFixed(2)}</span>
            </div>
          )}

          {/* Timestamps */}
          <div className="tracking-timestamps">
            <span><Clock size={12} style={{ verticalAlign: 'middle' }} /> Booked: {new Date(order.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            <span>Last Updated: {new Date(order.updated_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      )}

      {/* Empty state when no search */}
      {!searched && !order && (
        <div className="tracking-empty animate-float">
          <Package size={64} style={{ opacity: 0.15, color: 'var(--primary)' }} />
          <p>Enter your tracking number above to check your shipment status</p>
        </div>
      )}

      {/* Footer */}
      <div className="tracking-footer">
        <p>Have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign In</Link></p>
      </div>
    </div>
  );
};

export default TrackingPage;
