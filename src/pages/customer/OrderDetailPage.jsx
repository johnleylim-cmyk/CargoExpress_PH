import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderById, cancelOwnOrder, createNotification } from '../../lib/database';
import { resolvePhotoUrls } from '../../lib/storage';
import { useAuth } from '../../contexts/AuthContext';
import StatusBadge from '../../components/ui/StatusBadge';
import TrackingTimeline from '../../components/ui/TrackingTimeline';
import ConfirmModal from '../../components/ui/ConfirmModal';
import ImageLightbox from '../../components/ui/ImageLightbox';
import { SkeletonOrderCard, SkeletonText } from '../../components/ui/SkeletonLoader';
import { ArrowLeft, MapPin, User, Phone, Package, CreditCard, Truck, Camera, Image, XCircle, Loader, AlertTriangle } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [resolvedPickupPhotos, setResolvedPickupPhotos] = useState([]);
  const [photoLoadState, setPhotoLoadState] = useState({});

  useEffect(() => {
    let isMounted = true;
    loadOrder(isMounted);
    return () => { isMounted = false; };
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    const photos = Array.isArray(order?.pickup_photos) ? order.pickup_photos : [];
    if (photos.length === 0) { setResolvedPickupPhotos([]); return () => { isMounted = false; }; }
    resolvePhotoUrls(photos)
      .then(urls => { if (isMounted) setResolvedPickupPhotos(urls); })
      .catch(() => { if (isMounted) setResolvedPickupPhotos([]); });
    return () => { isMounted = false; };
  }, [order?.pickup_photos]);

  useEffect(() => {
    let cancelled = false;
    setPhotoLoadState({});
    resolvedPickupPhotos.forEach((url, index) => {
      const preview = new window.Image();
      preview.onload  = () => { if (!cancelled) setPhotoLoadState(prev => ({ ...prev, [index]: 'loaded' })); };
      preview.onerror = () => { if (!cancelled) setPhotoLoadState(prev => ({ ...prev, [index]: 'failed' })); };
      preview.src = url;
    });
    return () => { cancelled = true; };
  }, [resolvedPickupPhotos]);

  const loadOrder = async (isMounted = true) => {
    setError(null); setLoading(true);
    try {
      const data = await getOrderById(id);
      if (isMounted) setOrder(data);
    } catch (err) {
      if (isMounted) setError(err.message || 'Failed to load order.');
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  const handleCancel = async () => {
    setShowCancelModal(false);
    setCancelling(true);
    try {
      await cancelOwnOrder(id);
      await createNotification(user.id, 'Order Cancelled', `Your order ${order.tracking_number} has been cancelled`, 'order_update', order.id);
      await loadOrder();
      toast.warning('Your booking has been cancelled.');
    } catch (err) {
      toast.error(err.message || 'Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return (
    <div className="page-transition">
      <div className="stagger-item" style={{ animationDelay: '0ms', marginBottom: 16 }}>
        <div className="skeleton skeleton-text" style={{ width: '30%', height: 20 }} />
      </div>
      <div className="stagger-item" style={{ animationDelay: '60ms', marginBottom: 16 }}><SkeletonOrderCard /></div>
      <div className="stagger-item" style={{ animationDelay: '120ms', marginBottom: 16 }}><SkeletonText lines={4} /></div>
      <div className="stagger-item" style={{ animationDelay: '180ms' }}><SkeletonOrderCard /></div>
    </div>
  );

  if (error) return (
    <div className="card animate-scale-in text-center" style={{ padding: 40 }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <AlertTriangle size={28} color="#EF4444" />
      </div>
      <h3 style={{ color: '#DC2626', marginBottom: 8 }}>Error Loading Order</h3>
      <p className="text-secondary text-sm" style={{ marginBottom: 20 }}>{error}</p>
      <button className="btn btn-primary" onClick={() => loadOrder()}>Retry</button>
    </div>
  );
  if (!order) return <div className="empty-state"><h3>Order not found</h3></div>;

  const isCancelled = order.status === 'Cancelled';
  const canCancel = order.status === 'Pending';
  const hasPhotos = resolvedPickupPhotos.length > 0;

  return (
    <div className="page-transition">
      <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ marginBottom: 16 }}>
        <ArrowLeft size={18} /> Back
      </button>

      {/* Header */}
      <div className="customer-order-detail-header flex items-center justify-between animate-slide-up" style={{ marginBottom: 20 }}>
        <div>
          <h2 style={{ fontWeight: 800 }}>{order.tracking_number}</h2>
          <p className="text-sm text-secondary">{order.origin} → {order.destination}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Cancel button for Pending orders */}
      {canCancel && (
        <button className="btn btn-danger btn-sm animate-slide-up" onClick={() => setShowCancelModal(true)} disabled={cancelling} style={{ marginBottom: 16 }}>
          {cancelling ? <Loader size={14} className="animate-spin" /> : <XCircle size={14} />}
          Cancel Booking
        </button>
      )}

      <ConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        title="Cancel This Booking?"
        message="Are you sure you want to cancel this booking? This action cannot be undone and your shipment slot will be released."
        confirmLabel="Yes, Cancel Booking"
        cancelLabel="Keep Booking"
        variant="danger"
        loading={cancelling}
      />

      {/* Tracking Timeline */}
      {!isCancelled && (
        <div className="card stagger-item" style={{ marginBottom: 16, animationDelay: '0ms' }}>
          <div className="card-body">
            <h4 style={{ fontWeight: 700, marginBottom: 16 }}>Tracking Timeline</h4>
            <TrackingTimeline currentStatus={order.status} compact />
          </div>
        </div>
      )}

      {/* Cancelled status display — permanent state indicator, not a notification */}
      {isCancelled && (
        <div className="alert-banner alert-banner-error animate-scale-in" style={{ marginBottom: 16, textAlign: 'center', padding: '20px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <XCircle size={32} />
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Order Cancelled</div>
            <p className="text-sm" style={{ opacity: 0.8, margin: 0 }}>This order has been cancelled and cannot be modified.</p>
          </div>
        </div>
      )}

      {/* Trip Info */}
      {order.trip_id && order.trips && (
        <div className="card stagger-item" style={{ marginBottom: 16, animationDelay: '60ms' }}>
          <div className="card-body" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), #2D5A8A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
              <Truck size={20} />
            </div>
            <div>
              <div className="text-sm font-bold">Trip: {order.trips.trip_number}</div>
              <div className="text-xs text-secondary">{order.trips.origin} → {order.trips.destination}</div>
            </div>
          </div>
        </div>
      )}

      {/* Sender & Receiver */}
      <div className="customer-contact-grid stagger-item" style={{ marginBottom: 16, animationDelay: '120ms' }}>
        <div className="card"><div className="card-body" style={{ padding: 16 }}>
          <div className="text-xs text-tertiary font-bold" style={{ textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}><User size={12} /> Sender</div>
          <div className="text-sm font-bold" style={{ marginBottom: 2 }}>{order.sender_name}</div>
          <div className="text-sm text-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}><Phone size={12} /> {order.sender_phone}</div>
          <div className="text-xs text-secondary"><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />{order.sender_address}</div>
        </div></div>
        <div className="card"><div className="card-body" style={{ padding: 16 }}>
          <div className="text-xs text-tertiary font-bold" style={{ textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}><User size={12} /> Receiver</div>
          <div className="text-sm font-bold" style={{ marginBottom: 2 }}>{order.receiver_name}</div>
          <div className="text-sm text-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}><Phone size={12} /> {order.receiver_phone}</div>
          <div className="text-xs text-secondary"><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />{order.receiver_address}</div>
        </div></div>
      </div>

      {/* Package Details */}
      <div className="card stagger-item" style={{ marginBottom: 16, animationDelay: '180ms' }}>
        <div className="card-body" style={{ padding: 16 }}>
          <h4 style={{ fontWeight: 700, marginBottom: 12 }}><Package size={16} style={{ display: 'inline', marginRight: 8 }} />Package Details</h4>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div><span className="text-xs text-tertiary">Description</span><div className="text-sm">{order.package_description || '—'}</div></div>
            <div><span className="text-xs text-tertiary">Est. Weight</span><div className="text-sm">{order.package_weight} kg</div></div>
            {order.actual_weight && <div><span className="text-xs text-tertiary">Actual Weight</span><div className="text-sm font-bold" style={{ color: '#10B981' }}>{order.actual_weight} kg</div></div>}
            <div><span className="text-xs text-tertiary">Dimensions</span><div className="text-sm">{order.package_dimensions || '—'}</div></div>
          </div>
        </div>
      </div>

      {/* Pickup Proof Photos */}
      {hasPhotos && (
        <div className="card stagger-item" style={{ marginBottom: 16, animationDelay: '240ms' }}>
          <div className="card-body" style={{ padding: 16 }}>
            <h4 style={{ fontWeight: 700, marginBottom: 12 }}><Camera size={16} style={{ display: 'inline', marginRight: 8 }} />Pickup Proof</h4>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {resolvedPickupPhotos.map((url, i) => {
                const loadState = photoLoadState[i] || 'loading';
                const canOpen = loadState === 'loaded';
                return (
                  <button key={i} onClick={() => canOpen && setLightboxIndex(i)} type="button" className="customer-proof-photo-btn" disabled={!canOpen}>
                    <div className="customer-proof-photo-fallback">
                      <Image size={20} />
                      <span>{loadState === 'failed' ? 'Unavailable' : `Photo ${i + 1}`}</span>
                    </div>
                    {canOpen && <div className="customer-proof-photo-preview" style={{ backgroundImage: `url("${url}")` }} />}
                    {canOpen && <div className="customer-proof-photo-overlay"><Image size={12} color="white" /></div>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Payment */}
      <div className="card stagger-item" style={{ animationDelay: '300ms' }}>
        <div className="card-body" style={{ padding: 16 }}>
          <h4 style={{ fontWeight: 700, marginBottom: 12 }}><CreditCard size={16} style={{ display: 'inline', marginRight: 8 }} />Payment</h4>
          <div className="customer-payment-summary">
            <div className="text-center">
              <div className="text-xs text-tertiary">Shipping Cost</div>
              <div className="text-sm font-bold text-primary">₱{parseFloat(order.shipping_cost || 0).toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-tertiary">Paid</div>
              <div className="text-sm font-bold text-success">₱{parseFloat(order.amount_paid || 0).toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-tertiary">Balance</div>
              <div className={`text-sm font-bold ${parseFloat(order.remaining_balance || 0) > 0 ? 'text-error' : 'text-success'}`}>
                ₱{parseFloat(order.remaining_balance || 0).toFixed(2)}
              </div>
            </div>
          </div>
          <div className="grid grid-2" style={{ gap: 8 }}>
            <div>
              <span className="text-xs text-tertiary">Method</span>
              <div className="text-sm" style={{ textTransform: 'capitalize' }}>
                {order.payment_method === 'gcash' ? 'GCash' : order.payment_method === 'paylater' ? 'Pay Later' : order.payment_method || '—'}
              </div>
            </div>
            <div>
              <span className="text-xs text-tertiary">Status</span>
              <div className="text-sm">
                <span className={`badge ${order.payment_status === 'paid' ? 'badge-success' : order.payment_status === 'partial' ? 'badge-warning' : 'badge-error'}`} style={{ textTransform: 'capitalize' }}>
                  {order.payment_status || 'unpaid'}
                </span>
              </div>
            </div>
          </div>
          {/* Payment due date — informational display */}
          {order.promised_payment_date && (
            <div className="alert-banner alert-banner-warning" style={{ marginTop: 12, padding: '8px 12px', fontSize: '0.8125rem' }}>
              <AlertTriangle size={14} /> Payment due: {new Date(order.promised_payment_date).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Timestamps */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: '0.75rem', color: '#94A3B8' }}>
        <span>Booked: {new Date(order.created_at).toLocaleDateString()}</span>
        <span>Updated: {new Date(order.updated_at).toLocaleString()}</span>
      </div>

      {lightboxIndex >= 0 && hasPhotos && (
        <ImageLightbox images={resolvedPickupPhotos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(-1)} />
      )}
    </div>
  );
};

export default OrderDetailPage;
