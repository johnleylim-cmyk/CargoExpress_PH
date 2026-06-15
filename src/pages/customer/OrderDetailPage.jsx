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
import usePageTitle from '../../hooks/usePageTitle';

const OrderDetailPage = () => {
  usePageTitle('Order Details');
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
    <div className="page-transition customer-order-detail-page">
      <div className="stagger-item mb-16" style={{ animationDelay: '0ms' }}>
        <div className="skeleton skeleton-text" style={{ width: '30%', height: 20 }} />
      </div>
      <div className="stagger-item mb-16" style={{ animationDelay: '60ms' }}><SkeletonOrderCard /></div>
      <div className="stagger-item mb-16" style={{ animationDelay: '120ms' }}><SkeletonText lines={4} /></div>
      <div className="stagger-item" style={{ animationDelay: '180ms' }}><SkeletonOrderCard /></div>
    </div>
  );

  if (error) return (
    <div className="card animate-scale-in text-center" role="alert" style={{ padding: 40 }}>
      <div className="flex items-center justify-center mx-auto mb-16" style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--error-bg)' }}>
        <AlertTriangle size={28} color="var(--error)" aria-hidden="true" />
      </div>
      <h3 className="mb-8" style={{ color: 'var(--error-dark)' }}>Error Loading Order</h3>
      <p className="text-secondary text-sm mb-20">{error}</p>
      <button className="btn btn-primary" onClick={() => loadOrder()}>Retry</button>
    </div>
  );
  if (!order) return <div className="empty-state"><h3>Order not found</h3></div>;

  const isCancelled = order.status === 'Cancelled';
  const canCancel = order.status === 'Pending';
  const hasPhotos = resolvedPickupPhotos.length > 0;

  return (
    <div className="page-transition customer-order-detail-screen">
      <button onClick={() => navigate(-1)} className="btn btn-ghost customer-back-action mb-16">
        <ArrowLeft size={18} /> Back
      </button>

      {/* Header */}
      <div className="customer-order-detail-header flex items-center justify-between animate-slide-up mb-20">
        <div>
          <h2 className="fw-800">{order.tracking_number}</h2>
          <p className="text-sm text-secondary">{order.origin} → {order.destination}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Cancel button for Pending orders */}
      {canCancel && (
        <button className="btn btn-danger btn-sm animate-slide-up mb-16" onClick={() => setShowCancelModal(true)} disabled={cancelling}>
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
        <div className="customer-detail-card customer-detail-timeline-card card stagger-item mb-16" style={{ animationDelay: '0ms' }}>
          <div className="card-body">
            <h4 className="fw-700 mb-16">Tracking Timeline</h4>
            <TrackingTimeline currentStatus={order.status} compact />
          </div>
        </div>
      )}

      {/* Cancelled status display — permanent state indicator, not a notification */}
      {isCancelled && (
        <div className="alert-banner alert-banner-error animate-scale-in mb-16 text-center" style={{ padding: '20px 24px' }}>
          <div className="flex flex-col items-center gap-8">
            <XCircle size={32} />
            <div className="fw-700 text-base">Order Cancelled</div>
            <p className="text-sm m-0" style={{ opacity: 0.8 }}>This order has been cancelled and cannot be modified.</p>
          </div>
        </div>
      )}

      {/* Trip Info */}
      {order.trip_id && order.trips && (
        <div className="customer-detail-card customer-detail-trip-card card stagger-item mb-16" style={{ animationDelay: '60ms' }}>
          <div className="card-body flex items-center gap-12" style={{ padding: 14 }}>
            <div className="w-40 h-40 flex items-center justify-center flex-shrink-0" style={{ borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', color: 'white' }}>
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
      <div className="customer-contact-grid stagger-item mb-16" style={{ animationDelay: '120ms' }}>
        <div className="customer-detail-card customer-contact-card card"><div className="card-body p-16">
          <div className="text-xs text-tertiary font-bold text-uppercase flex items-center gap-4 mb-8"><User size={12} /> Sender</div>
          <div className="text-sm font-bold" style={{ marginBottom: 2 }}>{order.sender_name}</div>
          <div className="text-sm text-secondary flex items-center gap-4" style={{ marginBottom: 2 }}><Phone size={12} /> {order.sender_phone}</div>
          <div className="text-xs text-secondary"><MapPin size={12} className="inline mr-4" />{order.sender_address}</div>
        </div></div>
        <div className="customer-detail-card customer-contact-card card"><div className="card-body p-16">
          <div className="text-xs text-tertiary font-bold text-uppercase flex items-center gap-4 mb-8"><User size={12} /> Receiver</div>
          <div className="text-sm font-bold" style={{ marginBottom: 2 }}>{order.receiver_name}</div>
          <div className="text-sm text-secondary flex items-center gap-4" style={{ marginBottom: 2 }}><Phone size={12} /> {order.receiver_phone}</div>
          <div className="text-xs text-secondary"><MapPin size={12} className="inline mr-4" />{order.receiver_address}</div>
        </div></div>
      </div>

      {/* Package Details */}
      <div className="customer-detail-card customer-package-card card stagger-item mb-16" style={{ animationDelay: '180ms' }}>
        <div className="card-body p-16">
          <h4 className="fw-700 mb-12"><Package size={16} className="inline mr-8" />Package Details</h4>
          <div className="grid grid-2 gap-12">
            <div><span className="text-xs text-tertiary">Description</span><div className="text-sm">{order.package_description || '—'}</div></div>
            <div><span className="text-xs text-tertiary">Est. Weight</span><div className="text-sm">{order.package_weight} kg</div></div>
            {order.actual_weight && <div><span className="text-xs text-tertiary">Actual Weight</span><div className="text-sm font-bold text-success">{order.actual_weight} kg</div></div>}
            <div><span className="text-xs text-tertiary">Dimensions</span><div className="text-sm">{order.package_dimensions || '—'}</div></div>
          </div>
        </div>
      </div>

      {/* Pickup Proof Photos */}
      {hasPhotos && (
        <div className="customer-detail-card customer-proof-card card stagger-item mb-16" style={{ animationDelay: '240ms' }}>
          <div className="card-body p-16">
            <h4 className="fw-700 mb-12"><Camera size={16} className="inline mr-8" />Pickup Proof</h4>
            <div className="flex gap-10 flex-wrap">
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
      <div className="customer-detail-card customer-payment-card card stagger-item" style={{ animationDelay: '300ms' }}>
        <div className="card-body p-16">
          <h4 className="fw-700 mb-12"><CreditCard size={16} className="inline mr-8" />Payment</h4>
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
          <div className="grid grid-2 gap-8">
            <div>
              <span className="text-xs text-tertiary">Method</span>
              <div className="text-sm text-capitalize">
                {order.payment_method === 'gcash' ? 'GCash' : order.payment_method === 'paylater' ? 'Pay Later' : order.payment_method || '—'}
              </div>
            </div>
            <div>
              <span className="text-xs text-tertiary">Status</span>
              <div className="text-sm">
                <span className={`badge ${order.payment_status === 'paid' ? 'badge-success' : order.payment_status === 'partial' ? 'badge-warning' : 'badge-error text-capitalize'}`}>
                  {order.payment_status || 'unpaid'}
                </span>
              </div>
            </div>
          </div>
          {/* Payment due date — informational display */}
          {order.promised_payment_date && (
            <div className="alert-banner alert-banner-warning mt-12 py-8 px-12" style={{ fontSize: '0.8125rem' }}>
              <AlertTriangle size={14} /> Payment due: {new Date(order.promised_payment_date).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Timestamps */}
      <div className="customer-detail-timestamps flex justify-between mt-16 text-xs text-tertiary">
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
