import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderById, updateOrder, createNotification } from '../../lib/database';
import { resolvePhotoUrls } from '../../lib/storage';
import StatusBadge from '../../components/ui/StatusBadge';
import TrackingTimeline from '../../components/ui/TrackingTimeline';
import PickupModal from '../../components/ui/PickupModal';
import TripAssignModal from '../../components/ui/TripAssignModal';
import ConfirmModal from '../../components/ui/ConfirmModal';
import ImageLightbox from '../../components/ui/ImageLightbox';
import { SkeletonText } from '../../components/ui/SkeletonLoader';
import {
  STATUS_FLOW, STATUS_TIMELINE, validateStatusTransition,
  PAYMENT_METHODS, PAYMENT_STATUSES, ORDER_STATUS
} from '../../constants/status';
import {
  ArrowLeft, Check, Package, CreditCard, User, Phone, MapPin,
  Truck, Loader, Save, Camera, Scale, AlertTriangle, ExternalLink,
  X, Image
} from 'lucide-react';

const AdminOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: 'success' });
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [payForm, setPayForm] = useState({
    payment_method: '', payment_status: '', amount_paid: '', actual_weight: '', notes: ''
  });
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
      if (!isMounted) return;
      setOrder(data);
      setPayForm({
        payment_method: data.payment_method || '',
        payment_status: data.payment_status || '',
        amount_paid: data.amount_paid || '',
        actual_weight: data.actual_weight || '',
        notes: data.notes || '',
      });
    } catch (e) {
      setError(e.message || 'Failed to load order details.');
      if (isMounted) setError(e.message || 'Failed to load order.');
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    if (type === 'success') setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const handleStatusAdvance = async () => {
    const next = STATUS_FLOW[order.status];
    if (!next) return;

    // Special handling: if advancing to "Picked Up", open PickupModal instead
    if (next === ORDER_STATUS.PICKED_UP) {
      setShowPickupModal(true);
      return;
    }

    const validation = validateStatusTransition(order.status, next, order.trip_id);
    if (!validation.valid) { showMsg(validation.error, 'error'); return; }

    setSaving(true);
    try {
      await updateOrder(id, { status: next });
      await createNotification(order.user_id, 'Order Updated', `Order ${order.tracking_number}: ${next}`, 'order_update', order.id);
      await loadOrder();
      showMsg(`Status updated to "${next}"`);
    } catch (e) { showMsg(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handlePickupSave = async (pickupData) => {
    try {
      await updateOrder(id, pickupData);
      await createNotification(order.user_id, 'Pickup Complete', `Order ${order.tracking_number} has been picked up`, 'order_update', order.id);
      setShowPickupModal(false);
      await loadOrder();
      showMsg('Pickup processed successfully!');
    } catch (e) {
      throw e; // Let modal handle the error
    }
  };

  const handleTripAssign = async (tripId) => {
    try {
      await updateOrder(id, { trip_id: tripId, status: 'Assigned' });
      await createNotification(order.user_id, 'Order Assigned', `Order ${order.tracking_number} assigned to a trip`, 'order_update', order.id);
      setShowTripModal(false);
      await loadOrder();
      showMsg('Order assigned to trip!');
    } catch (e) { showMsg(e.message, 'error'); }
  };

  const handleCancel = async () => {
    setSaving(true);
    try {
      await updateOrder(id, { status: 'Cancelled' });
      await createNotification(order.user_id, 'Order Cancelled', `Order ${order.tracking_number} has been cancelled`, 'order_update', order.id);
      setShowCancelConfirm(false);
      await loadOrder();
      showMsg('Order cancelled');
    } catch (e) { showMsg(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      const updates = {};
      if (payForm.payment_method) updates.payment_method = payForm.payment_method;
      if (payForm.payment_status) updates.payment_status = payForm.payment_status;
      if (payForm.amount_paid !== '') updates.amount_paid = parseFloat(payForm.amount_paid) || 0;
      if (payForm.actual_weight !== '') updates.actual_weight = parseFloat(payForm.actual_weight) || null;
      if (payForm.notes !== undefined) updates.notes = payForm.notes;
      
      await updateOrder(id, updates);
      await loadOrder();
      showMsg('Details saved');
    } catch (e) { showMsg(e.message, 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="page-transition">
      <div className="skeleton skeleton-text" style={{ width: '80px', marginBottom: 16 }} />
      <div className="skeleton skeleton-text" style={{ width: '200px', height: 28, marginBottom: 8 }} />
      <div className="skeleton skeleton-text" style={{ width: '300px', marginBottom: 20 }} />
      <div className="card" style={{ marginBottom: 16 }}><div className="card-body"><SkeletonText lines={3} /></div></div>
      <div className="card" style={{ marginBottom: 16 }}><div className="card-body"><SkeletonText lines={4} /></div></div>
    </div>
  );
  if (error) return (
    <div className="page-transition">
      <div className="card text-center" style={{ padding: 40, color: '#EF4444' }}>
        <h3>Error Loading Order</h3>
        <p style={{ margin: '8px 0 20px' }}>{error}</p>
        <button className="btn btn-primary" onClick={() => loadOrder()}>Retry</button>
      </div>
    </div>
  );
  if (!order) return <div className="empty-state"><h3>Order not found</h3></div>;

  const nextStatus = STATUS_FLOW[order.status];
  const isTerminal = order.status === 'Delivered' || order.status === 'Cancelled';
  const needsTrip = order.status === 'Pending' && !order.trip_id;
  const hasPhotos = resolvedPickupPhotos.length > 0;
  
  // Real-time calculations
  const ratePerKg = parseFloat(order.trips?.price_per_kg || 0) > 0
    ? parseFloat(order.trips.price_per_kg)
    : parseFloat(order.package_weight || 0) > 0
      ? parseFloat(order.shipping_cost || 0) / parseFloat(order.package_weight)
      : 70; // 70 is the default global setting

  const currentWeight = payForm.actual_weight !== '' 
    ? parseFloat(payForm.actual_weight) || 0 
    : parseFloat(order.actual_weight) || parseFloat(order.package_weight) || 0;
    
  const computedShippingCost = currentWeight * ratePerKg;
  
  const computedAmountPaid = payForm.amount_paid !== '' 
    ? parseFloat(payForm.amount_paid) || 0 
    : parseFloat(order.amount_paid || 0);
    
  const computedRemainingBalance = computedShippingCost - computedAmountPaid;
  const isOverpaid = computedRemainingBalance < 0;

  const pickupPricePerKilo = ratePerKg;

  return (
    <div className="page-transition">
      <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ marginBottom: 16 }}>
        <ArrowLeft size={18} /> Back
      </button>

      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <h1 style={{ fontWeight: 800, fontSize: '1.5rem' }}>{order.tracking_number}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="text-secondary text-sm" style={{ marginBottom: 20 }}>
        {order.origin} → {order.destination} • {order.profiles?.name}
      </p>

      {/* Message Banner */}
      {msg.text && (
        <div className={`alert-banner ${msg.type === 'error' ? 'alert-banner-error' : 'alert-banner-success'}`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg({ text: '', type: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Status Action Bar */}
      {!isTerminal && (
        <div className="card stagger-item" style={{ marginBottom: 16, animationDelay: '60ms' }}>
          <div className="card-body" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {needsTrip && (
              <button className="btn btn-secondary" onClick={() => setShowTripModal(true)}>
                <Truck size={16} /> Assign to Trip
              </button>
            )}
            {nextStatus && (
              <button className="btn btn-primary" onClick={handleStatusAdvance} disabled={saving}>
                {saving ? <Loader size={16} className="animate-spin" /> : <Check size={16} />}
                {nextStatus === 'Picked Up' ? '📦 Process Pickup' : `Advance to "${nextStatus}"`}
              </button>
            )}
            <button className="btn btn-danger btn-sm" onClick={() => setShowCancelConfirm(true)} disabled={saving}>
              Cancel Order
            </button>
          </div>
        </div>
      )}

      {/* Trip Warning */}
      {needsTrip && (
        <div className="alert-banner alert-banner-error" style={{ background: '#FFFBEB', color: '#92400E', borderColor: '#FDE68A' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={18} />
            This order has not been assigned to a trip yet. Assign it before advancing status.
          </span>
        </div>
      )}

      {/* Timeline */}
      <div className="card stagger-item" style={{ marginBottom: 16, animationDelay: '120ms' }}>
        <div className="card-header"><h3>Status Timeline</h3></div>
        <div className="card-body">
          <TrackingTimeline currentStatus={order.status} compact />
        </div>
      </div>

      {/* Sender / Receiver */}
      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card stagger-item" style={{ animationDelay: '180ms' }}><div className="card-body" style={{ padding: 16 }}>
          <div className="text-xs text-tertiary font-bold" style={{ textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={12} /> Sender
          </div>
          <div className="text-sm font-bold">{order.sender_name}</div>
          <div className="text-sm text-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Phone size={12} /> {order.sender_phone}
          </div>
          <div className="text-xs text-secondary" style={{ marginTop: 6 }}>
            <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
            {order.sender_address}
          </div>
        </div></div>
        <div className="card stagger-item" style={{ animationDelay: '240ms' }}><div className="card-body" style={{ padding: 16 }}>
          <div className="text-xs text-tertiary font-bold" style={{ textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={12} /> Receiver
          </div>
          <div className="text-sm font-bold">{order.receiver_name}</div>
          <div className="text-sm text-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Phone size={12} /> {order.receiver_phone}
          </div>
          <div className="text-xs text-secondary" style={{ marginTop: 6 }}>
            <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
            {order.receiver_address}
          </div>
        </div></div>
      </div>

      {/* Package Details */}
      <div className="card stagger-item" style={{ marginBottom: 16, animationDelay: '300ms' }}>
        <div className="card-header"><h3><Package size={16} style={{ display: 'inline', marginRight: 8 }} />Package Details</h3></div>
        <div className="card-body" style={{ padding: 16 }}>
          <div className="grid grid-3" style={{ gap: 16 }}>
            <div>
              <div className="text-xs text-tertiary" style={{ marginBottom: 2 }}>Description</div>
              <div className="text-sm font-bold">{order.package_description || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-tertiary" style={{ marginBottom: 2 }}>Est. Weight</div>
              <div className="text-sm font-bold">{order.package_weight || '—'} kg</div>
            </div>
            <div>
              <div className="text-xs text-tertiary" style={{ marginBottom: 2 }}>Actual Weight</div>
              <div className="text-sm font-bold" style={{ color: order.actual_weight ? '#10B981' : '#94A3B8' }}>
                {order.actual_weight ? `${order.actual_weight} kg` : 'Not weighed'}
              </div>
            </div>
          </div>
          {order.trip_id && order.trips && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: '#EFF6FF', borderRadius: 6, fontSize: '0.8125rem' }}>
              <Truck size={14} style={{ display: 'inline', marginRight: 6, color: '#1D4ED8' }} />
              Trip: <strong>{order.trips.trip_number}</strong> ({order.trips.origin} → {order.trips.destination})
            </div>
          )}
        </div>
      </div>

      {/* Pickup Proof Photos */}
      {hasPhotos && (
        <div className="card stagger-item" style={{ marginBottom: 16, animationDelay: '360ms' }}>
          <div className="card-header"><h3><Camera size={16} style={{ display: 'inline', marginRight: 8 }} />Pickup Proof Photos</h3></div>
          <div className="card-body">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 12,
            }}>
              {resolvedPickupPhotos.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className="card-interactive"
                  type="button"
                  style={{
                    position: 'relative',
                    display: 'block',
                    borderRadius: 10,
                    overflow: 'hidden',
                    aspectRatio: '1',
                    border: 'none',
                    padding: 0,
                    cursor: 'zoom-in',
                    width: '100%',
                  }}
                >
                  <img
                    src={url}
                    alt={`Proof ${i + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                    padding: '16px 8px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span style={{ color: 'white', fontSize: '0.6875rem', fontWeight: 600 }}>Photo {i + 1}</span>
                    <Image size={12} color="white" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payment & Weight Management */}
      <div className="card stagger-item" style={{ animationDelay: '420ms' }}>
        <div className="card-header">
          <h3><CreditCard size={16} style={{ display: 'inline', marginRight: 8 }} />Payment & Details</h3>
        </div>
        <div className="card-body">
          {/* Financial Summary Bar */}
          <div style={{
            background: 'linear-gradient(135deg, #0F172A, var(--accent))', borderRadius: 10,
            padding: 18, marginBottom: 20, display: 'flex', justifyContent: 'space-around',
          }}>
            <div className="text-center">
              <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginBottom: 2 }}>Shipping Cost</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary)' }}>
                ₱{computedShippingCost.toFixed(2)}
              </div>
            </div>
            <div className="text-center">
              <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginBottom: 2 }}>Amount Paid</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#10B981' }}>
                ₱{computedAmountPaid.toFixed(2)}
              </div>
            </div>
            <div className="text-center">
              <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginBottom: 2 }}>
                {isOverpaid ? 'Overpaid' : 'Balance'}
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: isOverpaid ? '#F59E0B' : (computedRemainingBalance > 0 ? '#EF4444' : '#10B981') }}>
                {isOverpaid ? `+₱${Math.abs(computedRemainingBalance).toFixed(2)}` : `₱${computedRemainingBalance.toFixed(2)}`}
              </div>
            </div>
          </div>

          {/* Payment info badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {order.payment_method && (
              <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                {order.payment_method === 'gcash' ? 'GCash' : order.payment_method === 'paylater' ? 'Pay Later' : 'Cash'}
              </span>
            )}
            {order.payer_type && (
              <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                Payer: {order.payer_type}
              </span>
            )}
            {order.payment_status && (
              <span className={`badge ${order.payment_status === 'paid' ? 'badge-success' : order.payment_status === 'partial' ? 'badge-warning' : 'badge-error'}`} style={{ textTransform: 'capitalize' }}>
                {order.payment_status}
              </span>
            )}
            {order.promised_payment_date && (
              <span className="badge badge-warning">
                Due: {new Date(order.promised_payment_date).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Editable Fields */}
          <div className="grid grid-2" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Actual Weight (kg)</label>
              <input type="number" min="0" step="0.1" className="form-input" value={payForm.actual_weight}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || (Number(val) >= 0 && !isNaN(val))) {
                    setPayForm(p => ({ ...p, actual_weight: val }));
                  }
                }} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="form-select" value={payForm.payment_method}
                onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))}>
                <option value="">Select</option>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m === 'gcash' ? 'GCash' : m === 'paylater' ? 'Pay Later' : 'Cash'}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Status</label>
              <select className="form-select" value={payForm.payment_status}
                onChange={e => setPayForm(p => ({ ...p, payment_status: e.target.value }))}>
                <option value="">Select</option>
                {PAYMENT_STATUSES.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount Paid (₱)</label>
              <input type="number" min="0" step="0.01" className="form-input" value={payForm.amount_paid}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || (Number(val) >= 0 && !isNaN(val))) {
                    setPayForm(p => ({ ...p, amount_paid: val }));
                  }
                }} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={payForm.notes}
              onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
          </div>
          <button className="btn btn-primary" onClick={handleSaveDetails} disabled={saving}>
            {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />} Save Details
          </button>
        </div>
      </div>

      {/* Timestamps */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginTop: 16,
        fontSize: '0.75rem', color: '#94A3B8', padding: '0 4px',
      }}>
        <span>Created: {new Date(order.created_at).toLocaleString()}</span>
        <span>Updated: {new Date(order.updated_at).toLocaleString()}</span>
      </div>

      {/* Modals */}
      {showPickupModal && (
        <PickupModal
          order={order}
          onClose={() => setShowPickupModal(false)}
          onSave={handlePickupSave}
          pricePerKilo={pickupPricePerKilo}
        />
      )}
      {showTripModal && (
        <TripAssignModal order={order} onClose={() => setShowTripModal(false)} onAssign={handleTripAssign} />
      )}

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancel}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmLabel="Cancel Order"
        cancelLabel="Keep Order"
        variant="danger"
        loading={saving}
      />

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

export default AdminOrderDetailPage;
