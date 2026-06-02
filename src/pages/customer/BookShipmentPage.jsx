import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createOrder, getTrips, getSettings } from '../../lib/database';
import { ROUTES, PH_LOCATIONS, VALID_PROVINCES, detectPickupLocation, validateRouteProvinces } from '../../constants/phLocations';
import { ArrowLeft, Loader, CheckCircle, Package, MapPin, User, Truck, AlertTriangle, ArrowRight } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

// ── Helpers ──────────────────────────────────────────────────────────────────
const toTitleCase = (str) => str.replace(/\b\w/g, (char) => char.toUpperCase());

const validatePhone = (phone) => {
  const val = (phone || '').trim();
  if (!val) return 'Phone number is required.';
  if (!/^\d+$/.test(val)) return 'Phone number must contain numbers only.';
  if (!val.startsWith('09')) return 'Phone number must start with 09.';
  if (val.length !== 11) return 'Phone number must be exactly 11 digits.';
  return null;
};

const buildFullAddress = ({ lotBlock, street, barangay, city, province, landmark }) => {
  const parts = [lotBlock, street, barangay, city, province].filter(Boolean);
  let addr = parts.join(', ');
  if (landmark) addr += ` (Landmark: ${landmark})`;
  return addr;
};

const BookShipmentPage = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const preRoute  = location.state?.preselectedRoute  || '';
  const preTripId = location.state?.preselectedTripId || '';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [success, setSuccess] = useState(null);
  const [trips, setTrips] = useState([]);
  const [pricePerKilo, setPricePerKilo] = useState(70);

  const [form, setForm] = useState({
    route: preRoute, trip_id: preTripId,
    sender_name: '', sender_phone: '', sender_facebook: '',
    sender_lot_block: '', sender_street: '', sender_barangay: '',
    sender_city: '', sender_province: '', sender_landmark: '',
    receiver_name: '', receiver_phone: '', receiver_facebook: '',
    receiver_lot_block: '', receiver_street: '', receiver_barangay: '',
    receiver_city: '', receiver_province: '', receiver_landmark: '',
    package_description: '', package_weight: '',
    payer_type: 'sender', notes: '',
  });

  const [useRegisteredSender, setUseRegisteredSender] = useState(false);
  const [useRegisteredReceiver, setUseRegisteredReceiver] = useState(false);

  const u = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleTextChange = (key) => (e) => u(key, toTitleCase(e.target.value));
  const handlePhoneChange = (key) => (e) => u(key, e.target.value.replace(/\D/g, '').slice(0, 11));

  useEffect(() => {
    setInitialLoading(true);
    Promise.all([
      getTrips('active').then(setTrips).catch(() => {}),
      getSettings().then(s => { if (s.price_per_kilo) setPricePerKilo(parseFloat(s.price_per_kilo)); }).catch(() => {}),
    ]).finally(() => setInitialLoading(false));
  }, []);

  const selectedRoute = ROUTES.find(r => r.label === form.route);
  const filteredTrips = trips.filter(t => selectedRoute && t.origin === selectedRoute.origin && t.destination === selectedRoute.destination);
  const selectedTrip = filteredTrips.find(t => t.id === form.trip_id);
  const effectivePricePerKilo = parseFloat(selectedTrip?.price_per_kg || 0) > 0 ? parseFloat(selectedTrip.price_per_kg) : pricePerKilo;
  const cost = (parseFloat(form.package_weight) || 0) * effectivePricePerKilo;

  const getSenderProvinces = () => {
    if (!selectedRoute) return VALID_PROVINCES;
    if (selectedRoute.origin === 'Bohol') return ['Bohol'];
    return ['Metro Manila', 'Cavite', 'Batangas', 'Laguna', 'Bulacan'];
  };
  const getReceiverProvinces = () => {
    if (!selectedRoute) return VALID_PROVINCES;
    if (selectedRoute.destination === 'Bohol') return ['Bohol'];
    return ['Metro Manila', 'Cavite', 'Batangas', 'Laguna', 'Bulacan'];
  };

  const senderCities = form.sender_province ? PH_LOCATIONS[form.sender_province] || [] : [];
  const receiverCities = form.receiver_province ? PH_LOCATIONS[form.receiver_province] || [] : [];

  const handleRouteChange = (label) => {
    u('route', label);
    const route = ROUTES.find(r => r.label === label);
    if (route) {
      const senderSide = detectPickupLocation(form.sender_province);
      const expectedSender = route.origin === 'Bohol' ? 'bohol' : 'manila';
      if (form.sender_province && senderSide !== expectedSender) { u('sender_province', ''); u('sender_city', ''); }
      u('receiver_province', ''); u('receiver_city', '');
      setUseRegisteredSender(false); setUseRegisteredReceiver(false);
    }
  };

  const userProfileLocation = userProfile?.address_province ? detectPickupLocation(userProfile.address_province) : null;
  const showSenderCheckbox = selectedRoute && userProfileLocation === (selectedRoute.origin === 'Bohol' ? 'bohol' : 'manila');
  const showReceiverCheckbox = selectedRoute && userProfileLocation === (selectedRoute.destination === 'Bohol' ? 'bohol' : 'manila');

  useEffect(() => {
    if (useRegisteredSender && userProfile) {
      setForm(p => ({
        ...p,
        sender_name: userProfile.name || '', sender_phone: userProfile.phone || '', sender_facebook: userProfile.facebook_name || '',
        sender_lot_block: userProfile.address_lot_block || '', sender_street: userProfile.address_street || '',
        sender_barangay: userProfile.address_barangay || '', sender_city: userProfile.address_city || '',
        sender_province: userProfile.address_province || '', sender_landmark: userProfile.address_landmark || '',
      }));
    } else if (!useRegisteredSender && showSenderCheckbox) {
      setForm(p => ({ ...p, sender_name: '', sender_phone: '', sender_facebook: '', sender_lot_block: '', sender_street: '', sender_barangay: '', sender_city: '', sender_province: '', sender_landmark: '' }));
    }
  }, [useRegisteredSender, userProfile, showSenderCheckbox]);

  useEffect(() => {
    if (useRegisteredReceiver && userProfile) {
      setForm(p => ({
        ...p,
        receiver_name: userProfile.name || '', receiver_phone: userProfile.phone || '', receiver_facebook: userProfile.facebook_name || '',
        receiver_lot_block: userProfile.address_lot_block || '', receiver_street: userProfile.address_street || '',
        receiver_barangay: userProfile.address_barangay || '', receiver_city: userProfile.address_city || '',
        receiver_province: userProfile.address_province || '', receiver_landmark: userProfile.address_landmark || '',
      }));
    } else if (!useRegisteredReceiver && showReceiverCheckbox) {
      setForm(p => ({ ...p, receiver_name: '', receiver_phone: '', receiver_facebook: '', receiver_lot_block: '', receiver_street: '', receiver_barangay: '', receiver_city: '', receiver_province: '', receiver_landmark: '' }));
    }
  }, [useRegisteredReceiver, userProfile, showReceiverCheckbox]);

  const validateSender = () => {
    if (!form.sender_name) return 'Sender Full Name is required.';
    if (!form.sender_facebook) return 'Sender Facebook Name is required.';
    if (!form.sender_province) return 'Sender Province is required.';
    if (!form.sender_city) return 'Sender City is required.';
    if (!form.sender_barangay) return 'Sender Barangay is required.';
    if (!form.sender_street) return 'Sender Street is required.';
    const phoneErr = validatePhone(form.sender_phone);
    if (phoneErr) return 'Sender ' + phoneErr;
    return null;
  };

  const validateReceiver = () => {
    if (!form.receiver_name) return 'Receiver Full Name is required.';
    if (!form.receiver_facebook) return 'Receiver Facebook Name is required.';
    if (!form.receiver_province) return 'Receiver Province is required.';
    if (!form.receiver_city) return 'Receiver City is required.';
    if (!form.receiver_barangay) return 'Receiver Barangay is required.';
    if (!form.receiver_street) return 'Receiver Street is required.';
    const phoneErr = validatePhone(form.receiver_phone);
    if (phoneErr) return 'Receiver ' + phoneErr;
    return null;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!selectedRoute) throw new Error('Please select a route.');
      const sErr = validateSender(); if (sErr) throw new Error(sErr);
      const rErr = validateReceiver(); if (rErr) throw new Error(rErr);
      const validation = validateRouteProvinces(form.sender_province, form.receiver_province, selectedRoute);
      if (!validation.valid) throw new Error(validation.error);
      const packageWeight = parseFloat(form.package_weight);
      if (!Number.isFinite(packageWeight) || packageWeight <= 0) throw new Error('Package weight must be greater than 0 kg.');

      const fullSenderAddress = buildFullAddress({ lotBlock: form.sender_lot_block, street: form.sender_street, barangay: form.sender_barangay, city: form.sender_city, province: form.sender_province, landmark: form.sender_landmark });
      const fullReceiverAddress = buildFullAddress({ lotBlock: form.receiver_lot_block, street: form.receiver_street, barangay: form.receiver_barangay, city: form.receiver_city, province: form.receiver_province, landmark: form.receiver_landmark });

      const payload = {
        user_id: user.id,
        origin: selectedRoute.origin, destination: selectedRoute.destination, trip_id: form.trip_id || null,
        sender_name: form.sender_name, sender_phone: form.sender_phone, sender_address: fullSenderAddress,
        sender_facebook: form.sender_facebook, sender_city: form.sender_city, sender_province: form.sender_province,
        receiver_name: form.receiver_name, receiver_phone: form.receiver_phone, receiver_address: fullReceiverAddress,
        receiver_facebook: form.receiver_facebook, receiver_city: form.receiver_city, receiver_province: form.receiver_province,
        package_description: form.package_description, package_weight: form.package_weight,
        payer_type: form.payer_type, notes: form.notes,
      };
      const data = await createOrder(payload);
      setSuccess(data);
    } catch (err) {
      toast.error(err.message || 'An unexpected error occurred while saving the booking.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally { setLoading(false); }
  };

  const renderAddressFields = (prefix) => {
    const isSender = prefix === 'sender';
    const cities = isSender ? senderCities : receiverCities;
    const getProvinces = isSender ? getSenderProvinces : getReceiverProvinces;
    const id = (field) => `${prefix}-${field}`;
    return (
      <div className="grid grid-2 gap-16">
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label" htmlFor={id('name')}>Full Name *</label><input id={id('name')} className="form-input" value={form[`${prefix}_name`]} onChange={handleTextChange(`${prefix}_name`)} required /></div>
        <div className="form-group"><label className="form-label" htmlFor={id('phone')}>Mobile Number *</label><input id={id('phone')} className="form-input" value={form[`${prefix}_phone`]} onChange={handlePhoneChange(`${prefix}_phone`)} inputMode="numeric" maxLength={11} placeholder="09xxxxxxxxx" required /></div>
        <div className="form-group"><label className="form-label" htmlFor={id('facebook')}>Facebook Name *</label><input id={id('facebook')} className="form-input" value={form[`${prefix}_facebook`]} onChange={handleTextChange(`${prefix}_facebook`)} placeholder="Your name on Facebook" required /></div>
        <div className="form-group"><label className="form-label" htmlFor={id('province')}>Province *</label>
          <select id={id('province')} className="form-select" value={form[`${prefix}_province`]} onChange={e => { u(`${prefix}_province`, e.target.value); u(`${prefix}_city`, ''); }}>
            <option value="">Select Province</option>
            {getProvinces().map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label" htmlFor={id('city')}>City / Municipality *</label>
          <select id={id('city')} className="form-select" value={form[`${prefix}_city`]} onChange={e => u(`${prefix}_city`, e.target.value)} disabled={!form[`${prefix}_province`]}>
            <option value="">Select City</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label" htmlFor={id('barangay')}>Barangay *</label><input id={id('barangay')} className="form-input" value={form[`${prefix}_barangay`]} onChange={handleTextChange(`${prefix}_barangay`)} required /></div>
        <div className="form-group"><label className="form-label" htmlFor={id('street')}>Street *</label><input id={id('street')} className="form-input" value={form[`${prefix}_street`]} onChange={handleTextChange(`${prefix}_street`)} required /></div>
        <div className="form-group"><label className="form-label" htmlFor={id('lot-block')}>Lot / Block / Purok</label><input id={id('lot-block')} className="form-input" value={form[`${prefix}_lot_block`]} onChange={handleTextChange(`${prefix}_lot_block`)} /></div>
        <div className="form-group"><label className="form-label" htmlFor={id('landmark')}>Landmark</label><input id={id('landmark')} className="form-input" value={form[`${prefix}_landmark`]} onChange={handleTextChange(`${prefix}_landmark`)} placeholder="Near what building/place?" /></div>
      </div>
    );
  };

  if (success) return (
    <div className="page-transition" style={{ padding: '40px 20px' }}>
      <div className="animate-scale-in text-center">
        <div className="w-88 rounded-full flex items-center justify-center mb-24" style={{ height: 88, background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', margin: '0 auto', boxShadow: '0 8px 32px rgba(16,185,129,0.2)' }}>
          <CheckCircle size={44} color="#10B981" strokeWidth={2} />
        </div>
        <h2 className="fw-800 mb-4 text-2xl">Booking Confirmed</h2>
        <p className="text-secondary mb-20">Your shipment has been booked successfully.</p>
        <div className="card mb-20 overflow-hidden">
          <div className="px-20 py-16 text-inverse" style={{ background: 'linear-gradient(135deg, var(--accent), #2D5A8A)' }}>
            <div className="text-xs fw-600 mb-4" style={{ opacity: 0.7 }}>TRACKING NUMBER</div>
            <div className="text-2xl fw-800" style={{ letterSpacing: '0.02em' }}>{success.tracking_number}</div>
          </div>
          <div className="card-body p-16">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-tertiary">Estimated Cost</div>
                <div className="fw-700 text-primary text-lg">₱{parseFloat(success.shipping_cost || 0).toFixed(2)}</div>
              </div>
              <div className="text-xs text-tertiary">{form.route}</div>
            </div>
          </div>
        </div>
        <div className="flex gap-12 justify-center">
          <button type="button" className="btn btn-outline flex-1" onClick={() => navigate('/customer/orders')}><Package size={16} /> View Orders</button>
          <button type="button" className="btn btn-primary flex-1" onClick={() => { setSuccess(null); setStep(1); setForm(p => ({ ...p, package_description: '', package_weight: '', trip_id: '' })); setUseRegisteredReceiver(false); setUseRegisteredSender(false); }}><ArrowRight size={16} /> Book Another</button>
        </div>
      </div>
    </div>
  );

  const steps = ['Route', 'Sender', 'Receiver', 'Package', 'Review'];

  return (
    <div className="page-transition">
      <button type="button" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} className="btn btn-ghost mb-16">
        <ArrowLeft size={18} /> {step > 1 ? 'Back' : 'Cancel'}
      </button>
      <h2 className="fw-800 mb-8">Book Shipment</h2>

      {/* Step Progress */}
      <div className="step-progress" role="list" aria-label="Booking progress">
        {steps.map((s, i) => (
          <div key={s} role="listitem" className="flex items-center flex-1">
            <div className={`step ${step > i + 1 ? 'completed' : step === i + 1 ? 'active' : ''}`}>
              <div className="step-number" aria-current={step === i + 1 ? 'step' : undefined}>{i + 1}</div>
              <span className="step-label">{s}</span>
            </div>
            {i < steps.length - 1 && <div className="step-connector" style={{ background: step > i + 1 ? '#10B981' : '#E2E8F0' }} />}
          </div>
        ))}
      </div>

      {/* Step 1: Route */}
      {step === 1 && (
        <div className="card animate-fade-in"><div className="card-body">
          <h3 className="fw-700 mb-16"><MapPin size={18} className="inline mr-8" />Select Route</h3>
          {preTripId && (
            <div className="alert-banner alert-banner-success mb-16">
              <CheckCircle size={16} /> Route & trip pre-selected from home page. You may change below if needed.
            </div>
          )}
          <div className="customer-route-options">
            {ROUTES.map(r => (
              <button key={r.label} type="button" className="customer-route-option card card-interactive" onClick={() => handleRouteChange(r.label)}
                aria-pressed={form.route === r.label}
                style={{ border: form.route === r.label ? '2px solid var(--primary)' : '1.5px solid var(--border)', background: form.route === r.label ? 'var(--primary-bg)' : 'var(--surface)' }}>
                <Truck size={24} color={form.route === r.label ? 'var(--primary)' : 'var(--text-tertiary)'} style={{ margin: '0 auto 8px' }} />
                <div className="customer-route-option-label">{r.label}</div>
              </button>
            ))}
          </div>
          {form.route && (
            <div className="alert-banner alert-banner-warning mt-16" style={{ fontSize: '0.8125rem' }}>
              <AlertTriangle size={14} />
              {selectedRoute?.origin === 'Bohol'
                ? 'Sender must be from Bohol. Receiver must be from Metro Manila, Cavite, Batangas, Laguna, or Bulacan.'
                : 'Sender must be from Metro Manila, Cavite, Batangas, Laguna, or Bulacan. Receiver must be from Bohol.'}
            </div>
          )}
          {form.route && filteredTrips.length > 0 && (
            <div className="mt-16">
              <label className="form-label" htmlFor="booking-trip">Select Trip (Optional)</label>
              <select id="booking-trip" className="form-select" value={form.trip_id} onChange={e => u('trip_id', e.target.value)}>
                <option value="">No specific trip</option>
                {filteredTrips.map(t => <option key={t.id} value={t.id}>{t.trip_number} - {new Date(t.departure_date).toLocaleDateString()} - PHP {parseFloat(t.price_per_kg || pricePerKilo).toFixed(2)}/kg</option>)}
              </select>
            </div>
          )}
          <button type="button" className="btn btn-primary btn-lg w-full mt-lg justify-center" disabled={!form.route} onClick={() => setStep(2)}>Continue</button>
        </div></div>
      )}

      {/* Step 2: Sender */}
      {step === 2 && (
        <div className="card animate-fade-in"><div className="card-body">
          <h3 className="fw-700 mb-16"><User size={18} className="inline mr-8" />Sender Details</h3>
          {showSenderCheckbox && (
            <div className="mb-20 p-12 flex items-center gap-10 rounded-sm" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <input type="checkbox" id="useRegSender" checked={useRegisteredSender} onChange={e => setUseRegisteredSender(e.target.checked)} className="w-18" style={{ height: 18 }} />
              <label htmlFor="useRegSender" className="text-sm fw-600 cursor-pointer" style={{ color: 'var(--text)' }}>Use my registered address for sender details</label>
            </div>
          )}
          {renderAddressFields('sender')}
          <button type="button" className="btn btn-primary btn-lg w-full mt-20 justify-center" onClick={() => {
            const err = validateSender();
            if (err) { toast.error(err); return; }
            setStep(3);
          }}>Continue</button>
        </div></div>
      )}

      {/* Step 3: Receiver */}
      {step === 3 && (
        <div className="card animate-fade-in"><div className="card-body">
          <h3 className="fw-700 mb-16"><User size={18} className="inline mr-8" />Receiver Details</h3>
          {showReceiverCheckbox && (
            <div className="mb-20 p-12 flex items-center gap-10 rounded-sm" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <input type="checkbox" id="useRegReceiver" checked={useRegisteredReceiver} onChange={e => setUseRegisteredReceiver(e.target.checked)} className="w-18" style={{ height: 18 }} />
              <label htmlFor="useRegReceiver" className="text-sm fw-600 cursor-pointer" style={{ color: 'var(--text)' }}>Use my registered address for receiver details</label>
            </div>
          )}
          {renderAddressFields('receiver')}
          <button type="button" className="btn btn-primary btn-lg w-full mt-20 justify-center" onClick={() => {
            const err = validateReceiver();
            if (err) { toast.error(err); return; }
            const v = validateRouteProvinces(form.sender_province, form.receiver_province, selectedRoute);
            if (!v.valid) { toast.error(v.error); return; }
            setStep(4);
          }}>Continue</button>
        </div></div>
      )}

      {/* Step 4: Package */}
      {step === 4 && (
        <div className="card animate-fade-in"><div className="card-body">
          <h3 className="fw-700 mb-16"><Package size={18} className="inline mr-8" />Package Details</h3>
          <div className="form-group"><label className="form-label" htmlFor="package-description">Description (Optional)</label><input id="package-description" className="form-input" value={form.package_description} onChange={e => u('package_description', e.target.value)} placeholder="e.g. Documents, Clothes, etc." /></div>
          <div className="form-group">
            <label className="form-label" htmlFor="package-weight">Estimated Weight (kg) *</label>
            <input id="package-weight" type="number" className="form-input" value={form.package_weight} onChange={e => u('package_weight', e.target.value)} placeholder="0.0" min="0.1" step="0.1" required aria-describedby="package-weight-helper" />
            <p id="package-weight-helper" className="text-xs text-secondary mt-4">Note: This is an estimate. Final weight may be updated by the admin during weighing.</p>
          </div>
          <div className="form-group"><label className="form-label" htmlFor="payer-type">Who Pays?</label>
            <select id="payer-type" className="form-select" value={form.payer_type} onChange={e => u('payer_type', e.target.value)}>
              <option value="sender">Sender</option><option value="receiver">Receiver</option>
            </select>
          </div>
          {form.package_weight && (
            <div className="rounded-md p-16 mb-16 text-center" style={{ background: 'var(--primary-bg)', border: '1px solid rgba(240,127,46,0.25)' }}>
              <div className="text-sm text-secondary">Estimated Cost</div>
              <div className="text-2xl fw-800 text-primary">₱{cost.toFixed(2)}</div>
              <div className="text-xs text-tertiary">{form.package_weight} kg x PHP {effectivePricePerKilo}/kg</div>
            </div>
          )}
          <button type="button" className="btn btn-primary btn-lg w-full justify-center" onClick={() => {
            const packageWeight = parseFloat(form.package_weight);
            if (!Number.isFinite(packageWeight) || packageWeight <= 0) { toast.error('Package weight must be greater than 0 kg.'); return; }
            setStep(5);
          }} disabled={!form.package_weight || parseFloat(form.package_weight) <= 0}>Review Booking</button>
        </div></div>
      )}

      {/* Step 5: Review */}
      {step === 5 && (
        <div className="card animate-fade-in"><div className="card-body">
          <h3 className="fw-700 mb-16">Review & Confirm</h3>
          <div className="rounded-md p-16 mb-16" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs text-tertiary font-bold mb-8">ROUTE</div>
            <div className="font-bold">{form.route}</div>
          </div>
          <div className="grid grid-2 gap-12 mb-16">
            <div className="rounded-md p-16" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-xs text-tertiary font-bold mb-8">SENDER</div>
              <div className="text-sm font-bold">{form.sender_name}</div>
              <div className="text-xs text-secondary">{form.sender_phone}</div>
              <div className="text-xs text-secondary mt-4">{form.sender_street}, {form.sender_barangay}, {form.sender_city}, {form.sender_province}</div>
            </div>
            <div className="rounded-md p-16" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-xs text-tertiary font-bold mb-8">RECEIVER</div>
              <div className="text-sm font-bold">{form.receiver_name}</div>
              <div className="text-xs text-secondary">{form.receiver_phone}</div>
              <div className="text-xs text-secondary mt-4">{form.receiver_street}, {form.receiver_barangay}, {form.receiver_city}, {form.receiver_province}</div>
            </div>
          </div>
          <div className="rounded-md p-20 text-center mb-16" style={{ background: 'var(--primary-bg)', border: '1px solid rgba(240,127,46,0.25)' }}>
            <div className="text-sm text-secondary">Estimated Cost</div>
            <div className="fw-800 text-primary" style={{ fontSize: '2rem' }}>₱{cost.toFixed(2)}</div>
          </div>
          <button type="button" className="btn btn-primary btn-lg w-full justify-center" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader size={18} className="animate-spin" /> : 'Confirm Booking'}
          </button>
        </div></div>
      )}
    </div>
  );
};

export default BookShipmentPage;
