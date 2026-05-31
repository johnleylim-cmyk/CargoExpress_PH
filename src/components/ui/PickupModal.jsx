import { useState, useRef, useEffect } from 'react';
import { X, Camera, Loader, Scale, CreditCard, Calendar, Upload, Trash2 } from 'lucide-react';
import FocusTrap from './FocusTrap';
import { uploadMultiplePhotos } from '../../lib/storage';
import { createGCashSource, checkPaymentStatus, createPayment } from '../../lib/paymongo';
import { createPaymentAttempt } from '../../lib/database';
import { PAYMENT_METHODS } from '../../constants/status';

/**
 * PickupModal — Admin pickup processing modal
 * Captures: actual weight, payment method, payment amount, photos (1-3), pay later options
 */
const PickupModal = ({ order, onClose, onSave, pricePerKilo = 70 }) => {
  const [form, setForm] = useState({
    actual_weight: order?.actual_weight || order?.package_weight || '',
    payment_method: order?.payment_method || '',
    amount_paid: order?.amount_paid || '',
    payer_type: order?.payer_type || 'sender',
    promised_payment_date: order?.promised_payment_date || '',
  });
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // QR Polling States
  const [qrData, setQrData] = useState(null); // { sourceId, url, photoUrls }
  const [pollStatus, setPollStatus] = useState('');

  const isPayLater = form.payment_method === 'paylater';

  // Calculate shipping cost based on actual weight
  const estimatedCost = parseFloat(form.actual_weight || 0) * pricePerKilo;
  const amountPaid = parseFloat(form.amount_paid || 0);
  const remainingBalance = Math.max(0, estimatedCost - amountPaid);

  // ── Polling Effect for GCash ────────────────────────────────────────────────
  useEffect(() => {
    let interval;
    if (qrData) {
      interval = setInterval(async () => {
        try {
          setPollStatus('Waiting for customer to scan and pay...');
          const { status } = await checkPaymentStatus(qrData.sourceId);
          
          if (status === 'chargeable') {
            clearInterval(interval);
            setPollStatus('Payment Authorized! Capturing funds...');
            
            const description = `CargoExpress PH - Order ${order.tracking_number}`;

            // Pass order details so the Edge Function can atomically
            // update the order server-side after capturing payment.
            // This prevents orphaned payments if the browser closes.
            const orderUpdate = {
              orderId: order.id,
              actualWeight: parseFloat(form.actual_weight),
              payerType: form.payer_type,
              pickupPhotos: qrData.photoUrls,
            };

            const payment = await createPayment(qrData.sourceId, estimatedCost, description, orderUpdate);
            
            setPollStatus('Payment Successful! Saving order...');
            
            const updates = {
              actual_weight: parseFloat(form.actual_weight),
              payment_method: 'gcash',
              payer_type: form.payer_type,
              amount_paid: estimatedCost,
              remaining_balance: 0,
              payment_status: 'paid',
              payment_reference: payment.paymentId,
              pickup_photos: qrData.photoUrls,
              promised_payment_date: null,
              status: 'Picked Up',
            };

            // If the server already reconciled the order, onSave is just
            // a UI refresh — it will read the already-updated row.
            // If not, retry onSave client-side as a fallback.
            let saveAttempts = 0;
            const maxRetries = payment.orderReconciled ? 1 : 3;
            while (saveAttempts < maxRetries) {
              try {
                await onSave(updates);
                return; // Success — modal will close via parent
              } catch (saveErr) {
                saveAttempts++;
                if (saveAttempts < maxRetries) {
                  setPollStatus(`Save failed, retrying (${saveAttempts}/${maxRetries})...`);
                  await new Promise(r => setTimeout(r, 1500));
                } else if (payment.orderReconciled) {
                  // Server already saved it — force-close the modal.
                  // The parent's order list will pick up the DB change on next refresh.
                  setQrData(null);
                  setSaving(false);
                  onClose();
                  return;
                } else {
                  // All retries exhausted — show payment reference for manual reconciliation
                  setError(
                    `⚠️ Payment captured (Ref: ${payment.paymentId}) but failed to save to the order. ` +
                    `Please go to Order Detail and manually update: Payment Method = GCash, ` +
                    `Amount Paid = ₱${estimatedCost.toFixed(2)}, Payment Status = Paid.`
                  );
                  setQrData(null);
                  setSaving(false);
                }
              }
            }
          } else if (status === 'expired' || status === 'cancelled') {
            clearInterval(interval);
            setError(`GCash payment was ${status}. Please try again or use Cash.`);
            setQrData(null);
            setSaving(false);
          }
        } catch (err) {
          // Payment polling error — silently retry on next interval
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [qrData, estimatedCost, form.actual_weight, form.payer_type, order.tracking_number, onSave]);


  const handlePhotoAdd = (e) => {
    const newFiles = Array.from(e.target.files || []);
    const total = photos.length + newFiles.length;
    if (total > 3) {
      setError('Maximum 3 photos allowed');
      return;
    }

    const validFiles = newFiles.filter(f => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        setError('Only JPG, PNG, and WebP images allowed');
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        setError('Each photo must be under 5MB');
        return false;
      }
      return true;
    });

    setPhotos(prev => [...prev, ...validFiles]);

    // Generate previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setPhotoPreviews(prev => [...prev, evt.target.result]);
      };
      reader.readAsDataURL(file);
    });

    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError('');

    // Validations
    if (!form.actual_weight || parseFloat(form.actual_weight) <= 0) {
      setError('Please enter the actual weight');
      return;
    }
    if (!form.payment_method) {
      setError('Please select a payment method');
      return;
    }
    if (photos.length === 0) {
      setError('At least 1 pickup proof photo is required');
      return;
    }
    if (isPayLater && !form.promised_payment_date) {
      setError('Please set a promised payment date for Pay Later');
      return;
    }

    setSaving(true);

    try {
      // Upload photos to Supabase Storage, with Firestore base64 as emergency fallback.
      setUploadProgress('Uploading photos...');
      const photoUrls = await uploadMultiplePhotos(
        photos,
        'pickup',
        order.id,
        (current, total) => setUploadProgress(`Uploading ${current}/${total}...`)
      );

      setUploadProgress('Processing Payment...');

      // ── Handle GCash PayMongo POS Flow ────────────────────────────────────────
      if (form.payment_method === 'gcash') {
        setUploadProgress('Generating QR Code...');
        try {
          const customerData = {
            name: order.sender_name || 'Customer',
            phone: order.sender_phone || '',
            email: order.profiles?.email || ''
          };
          const description = `CargoExpress PH - Order ${order.tracking_number}`;
          const { sourceId, checkoutUrl } = await createGCashSource(estimatedCost, description, customerData, true);

          await createPaymentAttempt({
            source_id: sourceId,
            order_id: order.id,
            amount: estimatedCost,
            description,
            actual_weight: parseFloat(form.actual_weight),
            payer_type: form.payer_type,
            pickup_photos: photoUrls,
          });
          
          setQrData({ sourceId, url: checkoutUrl, photoUrls });
          return; // Stop and wait for customer to scan QR code
        } catch (pmErr) {
          throw new Error('PayMongo Error: ' + pmErr.message);
        }
      }

      // ── Handle Cash & Pay Later Flow ────────────────────────────────────────
      let paymentStatus = 'paid';
      let finalAmountPaid = parseFloat(form.amount_paid || 0);
      
      if (isPayLater) {
        paymentStatus = finalAmountPaid > 0 ? 'partial' : 'unpaid';
      } else if (form.payment_method === 'cash') {
        // If Cash and empty input, assume exact amount
        if (!form.amount_paid) {
          finalAmountPaid = estimatedCost;
          paymentStatus = 'paid';
        } else {
          paymentStatus = estimatedCost > finalAmountPaid ? 'partial' : 'paid';
        }
      }

      const finalRemaining = Math.max(0, estimatedCost - finalAmountPaid);

      const updates = {
        actual_weight: parseFloat(form.actual_weight),
        payment_method: form.payment_method,
        payer_type: form.payer_type,
        amount_paid: finalAmountPaid,
        remaining_balance: finalRemaining,
        payment_status: paymentStatus,
        payment_reference: null,
        pickup_photos: photoUrls,
        promised_payment_date: isPayLater ? form.promised_payment_date : null,
        status: 'Picked Up',
      };

      await onSave(updates);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  // ── QR Code View Render ───────────────────────────────────────────────────
  if (qrData) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData.url)}`;
    
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ maxWidth: 400, textAlign: 'center' }}>
          <div className="modal-header">
            <h3>📱 GCash Payment</h3>
            <button className="btn-icon btn-ghost" onClick={() => { setQrData(null); setSaving(false); }}><X size={20} /></button>
          </div>
          <div className="modal-body" style={{ padding: '30px 20px' }}>
            <h4 style={{ marginBottom: 16 }}>Please ask customer to scan this QR</h4>
            <div style={{ background: '#F8FAFC', padding: 20, borderRadius: 16, display: 'inline-block', border: '2px solid #E2E8F0', marginBottom: 20 }}>
              <img src={qrUrl} alt="GCash QR" style={{ width: 250, height: 250 }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10B981', marginBottom: 12 }}>
              ₱{estimatedCost.toFixed(2)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#64748B', fontSize: '0.875rem' }}>
              <Loader size={16} className="animate-spin" />
              {pollStatus || 'Waiting for payment...'}
            </div>
            {error && (
              <div style={{ color: '#EF4444', marginTop: 16, fontSize: '0.875rem' }}>{error}</div>
            )}
          </div>
          <div className="modal-footer" style={{ justifyContent: 'center' }}>
            <button className="btn btn-outline" onClick={() => { setQrData(null); setSaving(false); }}>Cancel & Try Another Method</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main View Render ──────────────────────────────────────────────────────
  return (
    <FocusTrap active>
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3>📦 Pickup Processing</h3>
          <button className="btn-icon btn-ghost" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {/* Order summary */}
          <div style={{
            background: '#F8FAFC', borderRadius: 8, padding: 14, marginBottom: 20,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{order.tracking_number}</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>
                {order.sender_name} → {order.receiver_name}
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
              Est. {order.package_weight} kg
            </div>
          </div>

          {error && (
            <div style={{
              background: '#FEF2F2', color: '#DC2626', padding: '10px 14px',
              borderRadius: 8, fontSize: '0.8125rem', marginBottom: 16,
              border: '1px solid #FCA5A5',
            }}>
              {error}
            </div>
          )}

          {/* Actual Weight */}
          <div className="form-group">
            <label className="form-label">
              <Scale size={14} style={{ display: 'inline', marginRight: 6 }} />
              Actual Weight (kg) *
            </label>
            <input
              type="number"
              className="form-input"
              placeholder="Enter actual weight after weighing"
              value={form.actual_weight}
              onChange={e => setForm(p => ({ ...p, actual_weight: e.target.value }))}
              step="0.1"
              min="0.1"
            />
            {form.actual_weight && (
              <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: 4 }}>
                Estimated cost: ₱{estimatedCost.toFixed(2)}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="form-group">
            <label className="form-label">
              <CreditCard size={14} style={{ display: 'inline', marginRight: 6 }} />
              Payment Method *
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m}
                  type="button"
                  className={`btn ${form.payment_method === m ? 'btn-primary' : 'btn-outline'} btn-sm`}
                  onClick={() => setForm(p => ({ ...p, payment_method: m }))}
                  style={{ flex: 1, justifyContent: 'center', textTransform: 'capitalize' }}
                >
                  {m === 'gcash' ? 'GCash' : m === 'paylater' ? 'Pay Later' : 'Cash'}
                </button>
              ))}
            </div>
          </div>

          {/* Payer Type */}
          <div className="form-group">
            <label className="form-label">Who Pays?</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['sender', 'receiver'].map(t => (
                <button
                  key={t}
                  type="button"
                  className={`btn ${form.payer_type === t ? 'btn-secondary' : 'btn-outline'} btn-sm`}
                  onClick={() => setForm(p => ({ ...p, payer_type: t }))}
                  style={{ flex: 1, justifyContent: 'center', textTransform: 'capitalize' }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Pay Later Options */}
          {isPayLater && (
            <div style={{ background: '#FFFBEB', borderRadius: 8, padding: 14, marginBottom: 16, border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400E', marginBottom: 8 }}>
                ⚠️ Pay Later Details
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Downpayment (₱)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0.00 (optional)"
                  value={form.amount_paid}
                  onChange={e => setForm(p => ({ ...p, amount_paid: e.target.value }))}
                  min="0"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  <Calendar size={14} style={{ display: 'inline', marginRight: 6 }} />
                  Promised Payment Date *
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={form.promised_payment_date}
                  onChange={e => setForm(p => ({ ...p, promised_payment_date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#92400E', marginTop: 8 }}>
                Balance: ₱{remainingBalance.toFixed(2)}
              </div>
            </div>
          )}

          {/* Non-PayLater amount */}
          {!isPayLater && form.payment_method && (
            <div className="form-group">
              <label className="form-label">Amount Received (₱)</label>
              <input
                type="number"
                className="form-input"
                placeholder={estimatedCost.toFixed(2)}
                value={form.amount_paid}
                onChange={e => setForm(p => ({ ...p, amount_paid: e.target.value }))}
              />
            </div>
          )}

          {/* Photo Upload */}
          <div className="form-group">
            <label className="form-label">
              <Camera size={14} style={{ display: 'inline', marginRight: 6 }} />
              Pickup Proof Photos * (1-3)
            </label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              {photoPreviews.map((preview, i) => (
                <div key={i} style={{ position: 'relative', width: 90, height: 90, borderRadius: 8, overflow: 'hidden', border: '2px solid #E2E8F0' }}>
                  <img src={preview} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    style={{
                      position: 'absolute', top: 4, right: 4, width: 22, height: 22,
                      borderRadius: '50%', background: '#EF4444', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: 'none', cursor: 'pointer', fontSize: '0.625rem',
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {photos.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 90, height: 90, borderRadius: 8, border: '2px dashed #CBD5E1',
                    background: '#F8FAFC', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 4,
                    cursor: 'pointer', color: '#94A3B8', fontSize: '0.6875rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Upload size={20} />
                  Add Photo
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handlePhotoAdd}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader size={16} className="animate-spin" />
                {uploadProgress || 'Processing...'}
              </>
            ) : (
              '✓ Confirm Pickup'
            )}
          </button>
        </div>
      </div>
    </div>
    </FocusTrap>
  );
};

export default PickupModal;
