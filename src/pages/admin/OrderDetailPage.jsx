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
import Breadcrumb from '../../components/ui/Breadcrumb';
import { SkeletonText } from '../../components/ui/SkeletonLoader';
import ErrorBoundarySection from '../../components/ui/ErrorBoundarySection';
import CustomSelect from '../../components/ui/CustomSelect';
import {
  STATUS_FLOW, STATUS_TIMELINE, validateStatusTransition,
  PAYMENT_METHODS, PAYMENT_STATUSES, ORDER_STATUS
} from '../../constants/status';
import {
  ArrowLeft, Check, Package, CreditCard, User, Phone, MapPin,
  Truck, Loader, Save, Camera, AlertTriangle, X, Image
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';

const AdminOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [payForm, setPayForm] = useState({
    payment_method: '', payment_status: '', amount_paid: '', actual_weight: '', notes: ''
  });
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
      if (isMounted) setError(e.message || 'Failed to load order.');
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  const handleStatusAdvance = async () => {
    const next = STATUS_FLOW[order.status];
    if (!next) return;
    if (next === ORDER_STATUS.PICKED_UP) { setShowPickupModal(true); return; }
    const validation = validateStatusTransition(order.status, next, order.trip_id);
    if (!validation.valid) { toast.error(validation.error); return; }
    setSaving(true);
    try {
      await updateOrder(id, { status: next });
      await createNotification(order.user_id, 'Order Updated', `Order ${order.tracking_number}: ${next}`, 'order_update', order.id);
      await loadOrder();
      toast.success(`Status updated to "${next}"`);
    } catch (e) { toast.error(e.message || 'Failed to update status'); }
    finally { setSaving(false); }
  };

  const handlePickupSave = async (pickupData) => {
    try {
      await updateOrder(id, pickupData);
      await createNotification(order.user_id, 'Pickup Complete', `Order ${order.tracking_number} has been picked up`, 'order_update', order.id);
      setShowPickupModal(false);
      await loadOrder();
      toast.success('Pickup processed successfully!');
    } catch (e) { throw e; }
  };

  const handleTripAssign = async (tripId) => {
    try {
      await updateOrder(id, { trip_id: tripId, status: 'Assigned' });
      await createNotification(order.user_id, 'Order Assigned', `Order ${order.tracking_number} assigned to a trip`, 'order_update', order.id);
      setShowTripModal(false);
      await loadOrder();
      toast.success('Order assigned to trip!');
    } catch (e) { toast.error(e.message || 'Failed to assign trip'); }
  };

  const handleCancel = async () => {
    setSaving(true);
    try {
      await updateOrder(id, { status: 'Cancelled' });
      await createNotification(order.user_id, 'Order Cancelled', `Order ${order.tracking_number} has been cancelled`, 'order_update', order.id);
      setShowCancelConfirm(false);
      await loadOrder();
      toast.warning('Order has been cancelled.');
    } catch (e) { toast.error(e.message || 'Failed to cancel order'); }
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
      toast.success('Details saved successfully!');
    } catch (e) { toast.error(e.message || 'Failed to save details'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="page-transition">
      <div className="skeleton skeleton-text w-80 mb-16" />
      <div className="skeleton skeleton-text mb-8" style={{ width: '200px', height: 28 }} />
      <div className="skeleton skeleton-text mb-20" style={{ width: '300px' }} />
      <div className="card mb-16"><div className="card-body"><SkeletonText lines={3} /></div></div>
      <div className="card mb-16"><div className="card-body"><SkeletonText lines={4} /></div></div>
    </div>
  );
  if (error) return (
    <div className="page-transition">
      <div className="card text-center text-error" style={{ padding: 40 }}>
        <h3>Error Loading Order</h3>
        <p className="mt-8 mb-20">{error}</p>
        <button type="button" className="btn btn-primary" onClick={() => loadOrder()}>Retry</button>
      </div>
    </div>
  );
  if (!order) return <div className="empty-state"><h3>Order not found</h3></div>;

  const nextStatus = STATUS_FLOW[order.status];
  const isTerminal = order.status === 'Delivered' || order.status === 'Cancelled';
  const needsTrip = order.status === 'Pending' && !order.trip_id;
  const hasPhotos = resolvedPickupPhotos.length > 0;

  const ratePerKg = parseFloat(order.trips?.price_per_kg || 0) > 0
    ? parseFloat(order.trips.price_per_kg)
    : parseFloat(order.package_weight || 0) > 0
      ? parseFloat(order.shipping_cost || 0) / parseFloat(order.package_weight)
      : 70;

  const currentWeight = payForm.actual_weight !== ''
    ? parseFloat(payForm.actual_weight) || 0
    : parseFloat(order.actual_weight) || parseFloat(order.package_weight) || 0;
  const computedShippingCost = currentWeight * ratePerKg;
  const computedAmountPaid = payForm.amount_paid !== '' ? parseFloat(payForm.amount_paid) || 0 : parseFloat(order.amount_paid || 0);
  const computedRemainingBalance = computedShippingCost - computedAmountPaid;
  const isOverpaid = computedRemainingBalance < 0;
  const pickupPricePerKilo = ratePerKg;

  const estimatedWeight = parseFloat(order.package_weight) || 0;
  const actualWeightVal = parseFloat(payForm.actual_weight) || 0;
  const showsWeightWarning = estimatedWeight > 0 && actualWeightVal > 0 && 
    (actualWeightVal > estimatedWeight * 2 || actualWeightVal < estimatedWeight * 0.25);

  return (
    <div className="page-transition">
      <Breadcrumb items={[
        { label: 'Dashboard', to: '/admin' },
        { label: 'Orders', to: '/admin/orders' },
        { label: order.tracking_number },
      ]} />

      <ErrorBoundarySection message="Order info failed to load.">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="fw-800 text-2xl">{order.tracking_number}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="text-secondary text-sm mb-20">
        {order.origin} → {order.destination} • {order.profiles?.name}
      </p>

      {/* Status Action Bar */}
      {!isTerminal && (
        <div className="card admin-section-card admin-action-card stagger-item mb-16" style={{ animationDelay: '60ms' }}>
          <div className="card-body">
            <div className="admin-action-group">
            {needsTrip && (
              <button type="button" className="btn btn-secondary" onClick={() => setShowTripModal(true)}>
                <Truck size={16} /> Assign to Trip
              </button>
            )}
            {nextStatus && (
              <button type="button" className="btn btn-primary" onClick={handleStatusAdvance} disabled={saving}>
                {saving ? <Loader size={16} className="animate-spin" /> : <Check size={16} />}
                {nextStatus === 'Picked Up' ? 'Process Pickup' : `Advance to "${nextStatus}"`}
              </button>
            )}
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setShowCancelConfirm(true)} disabled={saving}>
              Cancel Order
            </button>
            </div>
          </div>
        </div>
      )}

      {/* Trip Warning */}
      {needsTrip && (
        <div className="alert-banner alert-banner-error" style={{ background: 'var(--warning-bg)', color: 'var(--warning-dark)', borderColor: 'var(--warning)' }}>
          <span className="flex items-center gap-10">
            <AlertTriangle size={18} />
            This order has not been assigned to a trip yet. Assign it before advancing status.
          </span>
        </div>
      )}

      {/* Timeline */}
      <ErrorBoundarySection message="Tracking timeline failed to load.">
      <div className="card admin-section-card stagger-item mb-16" style={{ animationDelay: '120ms' }}>
        <div className="card-header"><h3>Status Timeline</h3></div>
        <div className="card-body"><TrackingTimeline currentStatus={order.status} compact /></div>
      </div>
      </ErrorBoundarySection>

      {/* Sender / Receiver */}
      <div className="grid grid-2 mb-16">
        <div className="card stagger-item" style={{ animationDelay: '180ms' }}><div className="card-body p-16">
          <div className="text-xs text-tertiary font-bold text-uppercase flex items-center gap-6" style={{ marginBottom: 10 }}><User size={12} /> Sender</div>
          <div className="text-sm font-bold">{order.sender_name}</div>
          <div className="text-sm text-secondary flex items-center gap-4" style={{ marginTop: 2 }}><Phone size={12} /> {order.sender_phone}</div>
          <div className="text-xs text-secondary" style={{ marginTop: 6 }}><MapPin size={12} className="inline mr-4" />{order.sender_address}</div>
        </div></div>
        <div className="card stagger-item" style={{ animationDelay: '240ms' }}><div className="card-body p-16">
          <div className="text-xs text-tertiary font-bold text-uppercase flex items-center gap-6" style={{ marginBottom: 10 }}><User size={12} /> Receiver</div>
          <div className="text-sm font-bold">{order.receiver_name}</div>
          <div className="text-sm text-secondary flex items-center gap-4" style={{ marginTop: 2 }}><Phone size={12} /> {order.receiver_phone}</div>
          <div className="text-xs text-secondary" style={{ marginTop: 6 }}><MapPin size={12} className="inline mr-4" />{order.receiver_address}</div>
        </div></div>
      </div>
      </ErrorBoundarySection>

      {/* Package Details */}
      <div className="card stagger-item mb-16" style={{ animationDelay: '300ms' }}>
        <div className="card-header"><h3><Package size={16} className="inline mr-8" />Package Details</h3></div>
        <div className="card-body p-16">
          <div className="grid grid-3 gap-16">
            <div><div className="text-xs text-tertiary" style={{ marginBottom: 2 }}>Description</div><div className="text-sm font-bold">{order.package_description || '—'}</div></div>
            <div><div className="text-xs text-tertiary" style={{ marginBottom: 2 }}>Est. Weight</div><div className="text-sm font-bold">{order.package_weight || '—'} kg</div></div>
            <div><div className="text-xs text-tertiary" style={{ marginBottom: 2 }}>Actual Weight</div>
              <div className={`text-sm font-bold ${order.actual_weight ? 'text-success' : 'text-tertiary'}`}>
                {order.actual_weight ? `${order.actual_weight} kg` : 'Not weighed'}
              </div>
            </div>
          </div>
          {order.trip_id && order.trips && (
            <div className="trip-info-box mt-12 px-12 py-8">
              <Truck size={14} className="inline mr-6" />
              Trip: <strong>{order.trips.trip_number}</strong> ({order.trips.origin} → {order.trips.destination})
            </div>
          )}
        </div>
      </div>

      {/* Pickup Proof Photos */}
      {hasPhotos && (
      <ErrorBoundarySection message="Pickup photos failed to load.">
        <div className="card stagger-item mb-16" style={{ animationDelay: '360ms' }}>
          <div className="card-header"><h3><Camera size={16} className="inline mr-8" />Pickup Proof Photos</h3></div>
          <div className="card-body">
            <div className="gap-12" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
              {resolvedPickupPhotos.map((url, i) => {
                const loadState = photoLoadState[i] || 'loading';
                const canOpen = loadState === 'loaded';
                return (
                  <button key={i} onClick={() => canOpen && setLightboxIndex(i)} className="customer-proof-photo-btn" type="button" disabled={!canOpen}>
                    <div className="customer-proof-photo-fallback">
                      <Image size={20} />
                      <span>{loadState === 'failed' ? 'Image unavailable' : `Photo ${i + 1}`}</span>
                    </div>
                    {canOpen && <div className="customer-proof-photo-preview" style={{ backgroundImage: `url("${url}")` }} />}
                    {canOpen && <div className="customer-proof-photo-overlay"><Image size={12} color="white" /></div>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </ErrorBoundarySection>
      )}

      {/* Payment & Weight Management */}
      <div className="card admin-section-card stagger-item" style={{ animationDelay: '420ms' }}>
        <div className="card-header"><h3><CreditCard size={16} className="inline mr-8" />Payment & Details</h3></div>
        <div className="card-body">
          <div className="admin-payment-summary">
            <div className="text-center">
              <div className="text-xs text-tertiary" style={{ marginBottom: 2 }}>Shipping Cost</div>
              <div className="text-lg fw-800 text-primary">₱{computedShippingCost.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-tertiary" style={{ marginBottom: 2 }}>Amount Paid</div>
              <div className="text-lg fw-800 text-success">₱{computedAmountPaid.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-tertiary" style={{ marginBottom: 2 }}>{isOverpaid ? 'Overpaid' : 'Balance'}</div>
              <div className={`text-lg fw-800 ${isOverpaid ? 'text-warning' : computedRemainingBalance > 0 ? 'text-error' : 'text-success'}`}>
                {isOverpaid ? `+₱${Math.abs(computedRemainingBalance).toFixed(2)}` : `₱${computedRemainingBalance.toFixed(2)}`}
              </div>
            </div>
          </div>

          <div className="flex gap-8 flex-wrap mb-16">
            {order.payment_method && <span className="badge badge-info text-capitalize">{order.payment_method === 'gcash' ? 'GCash' : order.payment_method === 'paylater' ? 'Pay Later' : 'Cash'}</span>}
            {order.payer_type && <span className="badge badge-info text-capitalize">Payer: {order.payer_type}</span>}
            {order.payment_status && <span className={`badge ${order.payment_status === 'paid' ? 'badge-success' : order.payment_status === 'partial' ? 'badge-warning' : 'badge-error'} text-capitalize`}>{order.payment_status}</span>}
            {order.promised_payment_date && <span className="badge badge-warning">Due: {new Date(order.promised_payment_date).toLocaleDateString()}</span>}
          </div>

          <div className="grid grid-2 gap-16">
            <div className="form-group">
              <label className="form-label" htmlFor="admin-order-actual-weight">Actual Weight (kg)</label>
              <input id="admin-order-actual-weight" type="number" min="0" step="0.1" className="form-input" value={payForm.actual_weight}
                onChange={e => { const val = e.target.value; if (val === '' || (Number(val) >= 0 && !isNaN(val))) setPayForm(p => ({ ...p, actual_weight: val })); }} />
              {showsWeightWarning && (
                <div className="text-warning text-xs flex items-center gap-4 mt-6">
                  <AlertTriangle size={14} /> Deviates significantly from estimate ({estimatedWeight} kg)
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-order-payment-method">Payment Method</label>
              <CustomSelect id="admin-order-payment-method" className="form-select" value={payForm.payment_method} onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))}>
                <option value="">Select</option>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m === 'gcash' ? 'GCash' : m === 'paylater' ? 'Pay Later' : 'Cash'}</option>)}
              </CustomSelect>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-order-payment-status">Payment Status</label>
              <CustomSelect id="admin-order-payment-status" className="form-select" value={payForm.payment_status} onChange={e => setPayForm(p => ({ ...p, payment_status: e.target.value }))}>
                <option value="">Select</option>
                {PAYMENT_STATUSES.map(s => <option key={s} value={s} className="text-capitalize">{s}</option>)}
              </CustomSelect>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-order-amount-paid">Amount Paid (₱)</label>
              <input id="admin-order-amount-paid" type="number" min="0" step="0.01" className="form-input" value={payForm.amount_paid}
                onChange={e => { const val = e.target.value; if (val === '' || (Number(val) >= 0 && !isNaN(val))) setPayForm(p => ({ ...p, amount_paid: val })); }} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-order-notes">Notes</label>
            <textarea id="admin-order-notes" className="form-textarea" value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
          </div>
          <button type="button" className="btn btn-primary" onClick={handleSaveDetails} disabled={saving}>
            {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />} Save Details
          </button>
        </div>
      </div>

      {/* Timestamps */}
      <div className="flex justify-between mt-16 text-xs text-tertiary" style={{ padding: '0 4px' }}>
        <span>Created: {new Date(order.created_at).toLocaleString()}</span>
        <span>Updated: {new Date(order.updated_at).toLocaleString()}</span>
      </div>

      {/* Modals */}
      {showPickupModal && (
        <PickupModal order={order} onClose={() => setShowPickupModal(false)} onSave={handlePickupSave} pricePerKilo={pickupPricePerKilo} />
      )}
      {showTripModal && (
        <TripAssignModal order={order} onClose={() => setShowTripModal(false)} onAssign={handleTripAssign} />
      )}
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
      {lightboxIndex >= 0 && hasPhotos && (
        <ImageLightbox images={resolvedPickupPhotos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(-1)} />
      )}
    </div>
  );
};

export default AdminOrderDetailPage;
