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
import { STATUS_TIMELINE, ORDER_STATUS } from '../../constants/status';
import { ArrowLeft, MapPin, User, Phone, Package, CreditCard, Truck, Camera, Image, XCircle, Loader, AlertTriangle, CheckCircle } from 'lucide-react';

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('error'); // 'error' | 'success'
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [resolvedPickupPhotos, setResolvedPickupPhotos] = useState([]);

  useEffect(() => {
    let isMounted = true;
    loadOrder(isMounted);
    return () => { isMounted = false; };
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    const photos = Array.isArray(order?.pickup_photos) ? order.pickup_photos : [];
    if (photos.length === 0) {
      setResolvedPickupPhotos([]);
      return () => { isMounted = false; };
    }

    resolvePhotoUrls(photos)
      .then(urls => { if (isMounted) setResolvedPickupPhotos(urls); })
      .catch(() => { if (isMounted) setResolvedPickupPhotos([]); });

    return () => { isMounted = false; };
  }, [order?.pickup_photos]);

  const loadOrder = async (isMounted = true) => {
    setError(null);
    setLoading(true);
    try {
      const data = await getOrderById(id);
      if (isMounted) setOrder(data);
    } catch (err) {
      setError(err.message || 'Failed to load order details.');
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
      setMsgType('success');
      setMsg('Order cancelled successfully');
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      setMsgType('error');
      setMsg(err.message);
    }
    finally { setCancelling(false); }
  };

  if (loading) return (
    <div className="page-transition">
      <div className="stagger-item" style={{ animationDelay: '0ms', marginBottom: 16 }}>
        <div className="skeleton skeleton-text" style={{ width: '30%', height: 20 }} />
      </div>
      <div className="stagger-item" style={{ animationDelay: '60ms', marginBottom: 16 }}>
        <SkeletonOrderCard />
      </div>
      <div className="stagger-item" style={{ animationDelay: '120ms', marginBottom: 16 }}>
        <SkeletonText lines={4} />
      </div>
      <div className="stagger-item" style={{ animationDelay: '180ms' }}>
        <SkeletonOrderCard />
      </div>
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
      <div className="flex items-center justify-between animate-slide-up" style={{ marginBottom: 20 }}>
        <div>
          <h2 style={{ fontWeight: 800 }}>{order.tracking_number}</h2>
          <p className="text-sm text-secondary">{order.origin} → {order.destination}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {msg && (
        <div className={`alert-banner ${msgType === 'success' ? 'alert-banner-success' : 'alert-banner-error'} animate-slide-up`} style={{ marginBottom: 16 }}>
          {msgType === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {msg}
        </div>
      )}

      {/* Cancel button for Pending orders */}
      {canCancel && (
        <button
          className="btn btn-danger btn-sm animate-slide-up"
          onClick={() => setShowCancelModal(true)}
          disabled={cancelling}
          style={{ marginBottom: 16 }}
        >
          {cancelling ? <Loader size={14} className="animate-spin" /> : <XCircle size={14} />}
          Cancel Booking
        </button>
      )}

      {/* Cancel Confirmation Modal */}
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

      {/* Cancelled banner */}
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
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), #2D5A8A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0,
            }}>
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
      <div className="stagger-item" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, animationDelay: '120ms' }}>
        <div className="card">
          <div className="card-body" style={{ padding: 16 }}>
            <div className="text-xs text-tertiary font-bold" style={{ textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <User size={12} /> Sender
            </div>
            <div className="text-sm font-bold" style={{ marginBottom: 2 }}>{order.sender_name}</div>
            <div className="text-sm text-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <Phone size={12} /> {order.sender_phone}
            </div>
            <div className="text-xs text-secondary">
              <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
              {order.sender_address}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ padding: 16 }}>
            <div className="text-xs text-tertiary font-bold" style={{ textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <User size={12} /> Receiver
            </div>
            <div className="text-sm font-bold" style={{ marginBottom: 2 }}>{order.receiver_name}</div>
            <div className="text-sm text-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <Phone size={12} /> {order.receiver_phone}
            </div>
            <div className="text-xs text-secondary">
              <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
              {order.receiver_address}
            </div>
          </div>
        </div>
      </div>

      {/* Package Details */}
      <div className="card stagger-item" style={{ marginBottom: 16, animationDelay: '180ms' }}>
        <div className="card-body" style={{ padding: 16 }}>
          <h4 style={{ fontWeight: 700, marginBottom: 12 }}>
            <Package size={16} style={{ display: 'inline', marginRight: 8 }} />Package Details
          </h4>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div><span className="text-xs text-tertiary">Description</span><div className="text-sm">{order.package_description || '—'}</div></div>
            <div><span className="text-xs text-tertiary">Est. Weight</span><div className="text-sm">{order.package_weight} kg</div></div>
            {order.actual_weight && (
              <div><span className="text-xs text-tertiary">Actual Weight</span><div className="text-sm font-bold" style={{ color: '#10B981' }}>{order.actual_weight} kg</div></div>
            )}
            <div><span className="text-xs text-tertiary">Dimensions</span><div className="text-sm">{order.package_dimensions || '—'}</div></div>
          </div>
        </div>
      </div>

      {/* Pickup Proof Photos */}
      {hasPhotos && (
        <div className="card stagger-item" style={{ marginBottom: 16, animationDelay: '240ms' }}>
          <div className="card-body" style={{ padding: 16 }}>
            <h4 style={{ fontWeight: 700, marginBottom: 12 }}>
              <Camera size={16} style={{ display: 'inline', marginRight: 8 }} />Pickup Proof
            </h4>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {resolvedPickupPhotos.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  type="button"
                  style={{
                    border: '2px solid #E2E8F0',
                    borderRadius: 8,
                    overflow: 'hidden',
                    padding: 0,
                    cursor: 'zoom-in',
                    background: 'none',
                    position: 'relative',
                  }}
                >
                  <img
                    src={url}
                    alt={`Proof ${i + 1}`}
                    style={{
                      width: 100, height: 100, objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
                    padding: '8px 6px 4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Image size={12} color="white" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payment */}
      <div className="card stagger-item" style={{ animationDelay: '300ms' }}>
        <div className="card-body" style={{ padding: 16 }}>
          <h4 style={{ fontWeight: 700, marginBottom: 12 }}>
            <CreditCard size={16} style={{ display: 'inline', marginRight: 8 }} />Payment
          </h4>
          <div style={{
            background: '#F8FAFC', borderRadius: 8, padding: 14,
            display: 'flex', justifyContent: 'space-around', marginBottom: 12,
          }}>
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
          {order.promised_payment_date && (
            <div className="alert-banner alert-banner-warning" style={{ marginTop: 12, padding: '8px 12px', fontSize: '0.8125rem' }}>
              <AlertTriangle size={14} />
              Payment due: {new Date(order.promised_payment_date).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Timestamps */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginTop: 16,
        fontSize: '0.75rem', color: '#94A3B8',
      }}>
        <span>Booked: {new Date(order.created_at).toLocaleDateString()}</span>
        <span>Updated: {new Date(order.updated_at).toLocaleString()}</span>
      </div>

      {/* Image Lightbox */}
      {lightboxIndex >= 0 && hasPhotos && (
        <ImageLightbox
          images={resolvedPickupPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(-1)}
        />
      )}
    </div>
  );
};

export default OrderDetailPage;
