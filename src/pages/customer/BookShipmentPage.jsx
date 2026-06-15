import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createOrder, getTrips, getSettings } from '../../lib/database';
import { buildFullAddress } from '../../lib/address';
import { ROUTES, PH_LOCATIONS, VALID_PROVINCES, detectPickupLocation, validateRouteProvinces } from '../../constants/phLocations';
import { ArrowLeft, Loader, CheckCircle, Copy, Check, Package, MapPin, User, Truck, AlertTriangle } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import CustomSelect from '../../components/ui/CustomSelect';
import { motion, useReducedMotion } from 'framer-motion';
import usePageTitle from '../../hooks/usePageTitle';
import { toTitleCase } from '../../utils/string';

const luxeEase = [0.22, 1, 0.36, 1];

function fallbackCopy(text) {
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;padding:0;border:none;outline:none;box-shadow:none;background:transparent;opacity:0';
  document.body.appendChild(el);
  el.focus();
  el.select();
  el.setSelectionRange(0, text.length);
  try { document.execCommand('copy'); } catch {}
  document.body.removeChild(el);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const validatePhone = (phone) => {
  const val = (phone || '').trim();
  if (!val) return 'Phone number is required.';
  if (!/^\d+$/.test(val)) return 'Phone number must contain numbers only.';
  if (!val.startsWith('09')) return 'Phone number must start with 09.';
  if (val.length !== 11) return 'Phone number must be exactly 11 digits.';
  return null;
};

const formatBookingTripDate = (value) => {
  if (!value) return 'Date not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not set';
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatBookingTripOption = (trip) => {
  const date = trip.departure_date ? new Date(trip.departure_date) : null;
  const dateLabel = date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    : 'Date TBD';
  return `${trip.trip_number} - ${dateLabel}`;
};

const BookShipmentPage = () => {
  usePageTitle('Book Shipment');
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
  const [fieldErrors, setFieldErrors] = useState({});

  const u = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    // Clear field error on edit
    if (fieldErrors[k]) setFieldErrors(p => { const n = { ...p }; delete n[k]; return n; });
    if (k.startsWith('sender_')) setUseRegisteredSender(false);
    if (k.startsWith('receiver_')) setUseRegisteredReceiver(false);
  };
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

  const handleUseRegisteredSenderChange = (checked) => {
    setUseRegisteredSender(checked);
    if (checked && userProfile) {
      setForm(p => ({
        ...p,
        sender_name: userProfile.name || '', sender_phone: userProfile.phone || '', sender_facebook: userProfile.facebook_name || '',
        sender_lot_block: userProfile.address_lot_block || '', sender_street: userProfile.address_street || '',
        sender_barangay: userProfile.address_barangay || '', sender_city: userProfile.address_city || '',
        sender_province: userProfile.address_province || '', sender_landmark: userProfile.address_landmark || '',
      }));
    } else {
      setForm(p => ({
        ...p,
        sender_name: '', sender_phone: '', sender_facebook: '',
        sender_lot_block: '', sender_street: '', sender_barangay: '',
        sender_city: '', sender_province: '', sender_landmark: '',
      }));
    }
  };

  const handleUseRegisteredReceiverChange = (checked) => {
    setUseRegisteredReceiver(checked);
    if (checked && userProfile) {
      setForm(p => ({
        ...p,
        receiver_name: userProfile.name || '', receiver_phone: userProfile.phone || '', receiver_facebook: userProfile.facebook_name || '',
        receiver_lot_block: userProfile.address_lot_block || '', receiver_street: userProfile.address_street || '',
        receiver_barangay: userProfile.address_barangay || '', receiver_city: userProfile.address_city || '',
        receiver_province: userProfile.address_province || '', receiver_landmark: userProfile.address_landmark || '',
      }));
    } else {
      setForm(p => ({
        ...p,
        receiver_name: '', receiver_phone: '', receiver_facebook: '',
        receiver_lot_block: '', receiver_street: '', receiver_barangay: '',
        receiver_city: '', receiver_province: '', receiver_landmark: '',
      }));
    }
  };

  const validateSender = () => {
    const errs = {};
    if (!form.sender_name) errs.sender_name = 'Full Name is required.';
    if (!form.sender_facebook) errs.sender_facebook = 'Facebook Name is required.';
    if (!form.sender_province) errs.sender_province = 'Province is required.';
    if (!form.sender_city) errs.sender_city = 'City is required.';
    if (!form.sender_barangay) errs.sender_barangay = 'Barangay is required.';
    if (!form.sender_street) errs.sender_street = 'Street is required.';
    const phoneErr = validatePhone(form.sender_phone);
    if (phoneErr) errs.sender_phone = phoneErr;
    return errs;
  };

  const validateReceiver = () => {
    const errs = {};
    if (!form.receiver_name) errs.receiver_name = 'Full Name is required.';
    if (!form.receiver_facebook) errs.receiver_facebook = 'Facebook Name is required.';
    if (!form.receiver_province) errs.receiver_province = 'Province is required.';
    if (!form.receiver_city) errs.receiver_city = 'City is required.';
    if (!form.receiver_barangay) errs.receiver_barangay = 'Barangay is required.';
    if (!form.receiver_street) errs.receiver_street = 'Street is required.';
    const phoneErr = validatePhone(form.receiver_phone);
    if (phoneErr) errs.receiver_phone = phoneErr;
    return errs;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!selectedRoute) throw new Error('Please select a route.');
      const sErrs = validateSender(); if (Object.keys(sErrs).length) { setFieldErrors(sErrs); throw new Error('Please fix sender details.'); }
      const rErrs = validateReceiver(); if (Object.keys(rErrs).length) { setFieldErrors(rErrs); throw new Error('Please fix receiver details.'); }
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
    const fe = (key) => fieldErrors[`${prefix}_${key}`];
    const fc = (key) => fe(key) ? 'field-invalid' : '';
    const errEl = (key) => fe(key) ? <div className="field-error-inline"><AlertTriangle size={12} />{fe(key)}</div> : null;
    return (
      <div className="grid grid-2 gap-16">
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label" htmlFor={id('name')}>Full Name *</label><input id={id('name')} className={`form-input ${fc('name')}`} value={form[`${prefix}_name`]} onChange={handleTextChange(`${prefix}_name`)} autoComplete={isSender ? 'name' : 'shipping name'} required />{errEl('name')}</div>
        <div className="form-group"><label className="form-label" htmlFor={id('phone')}>Mobile Number *</label><input id={id('phone')} className={`form-input ${fc('phone')}`} value={form[`${prefix}_phone`]} onChange={handlePhoneChange(`${prefix}_phone`)} inputMode="numeric" maxLength={11} placeholder="09xxxxxxxxx" autoComplete="tel" required />{errEl('phone')}</div>
        <div className="form-group"><label className="form-label" htmlFor={id('facebook')}>Facebook Name *</label><input id={id('facebook')} className={`form-input ${fc('facebook')}`} value={form[`${prefix}_facebook`]} onChange={handleTextChange(`${prefix}_facebook`)} placeholder="Your name on Facebook" required />{errEl('facebook')}</div>
        <div className="form-group"><label className="form-label" htmlFor={id('province')}>Province *</label>
          <CustomSelect id={id('province')} className={`form-select ${fc('province')}`} value={form[`${prefix}_province`]} onChange={e => { u(`${prefix}_province`, e.target.value); u(`${prefix}_city`, ''); }}>
            <option value="">Select Province</option>
            {getProvinces().map(p => <option key={p} value={p}>{p}</option>)}
          </CustomSelect>{errEl('province')}
        </div>
        <div className="form-group"><label className="form-label" htmlFor={id('city')}>City / Municipality *</label>
          <CustomSelect id={id('city')} className={`form-select ${fc('city')}`} value={form[`${prefix}_city`]} onChange={e => u(`${prefix}_city`, e.target.value)} disabled={!form[`${prefix}_province`]}>
            <option value="">Select City</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </CustomSelect>{errEl('city')}
        </div>
        <div className="form-group"><label className="form-label" htmlFor={id('barangay')}>Barangay *</label><input id={id('barangay')} className={`form-input ${fc('barangay')}`} value={form[`${prefix}_barangay`]} onChange={handleTextChange(`${prefix}_barangay`)} autoComplete="address-level3" required />{errEl('barangay')}</div>
        <div className="form-group"><label className="form-label" htmlFor={id('street')}>Street *</label><input id={id('street')} className={`form-input ${fc('street')}`} value={form[`${prefix}_street`]} onChange={handleTextChange(`${prefix}_street`)} autoComplete="address-line1" required />{errEl('street')}</div>
        <div className="form-group"><label className="form-label" htmlFor={id('lot-block')}>Lot / Block / Purok</label><input id={id('lot-block')} className="form-input" value={form[`${prefix}_lot_block`]} onChange={handleTextChange(`${prefix}_lot_block`)} autoComplete="address-line2" /></div>
        <div className="form-group"><label className="form-label" htmlFor={id('landmark')}>Landmark</label><input id={id('landmark')} className="form-input" value={form[`${prefix}_landmark`]} onChange={handleTextChange(`${prefix}_landmark`)} placeholder="Near what building/place?" /></div>
      </div>
    );
  };

  const [trackingCopied, setTrackingCopied] = useState(false);
  const reduceMotion = useReducedMotion();
  const particles = useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({
      id: i,
      angle: (i / 24) * Math.PI * 2,
      distance: 100 + Math.random() * 80,
      size: 3 + Math.random() * 5,
      delay: 0.6 + Math.random() * 0.3,
    })),
    []
  );

  if (success) {
    const orderPath = success.id ? `/customer/orders/${success.id}` : '/customer/orders';
    const routeLabel = `${success.origin} → ${success.destination}`;
    const statusLabel = success.status || 'Pending';
    const isAssigned = statusLabel === 'Assigned';

    return (
      <div className="booking-success-page" aria-labelledby="booking-success-title">
        {/* Ambient glow */}
        <motion.div
          className="booking-success-glow"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, ease: luxeEase }}
        />

        {/* Rising lines */}
        <div className="booking-success-lines" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              className="booking-success-line"
              style={{ left: `${15 + i * 14}%` }}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.2 + i * 0.08, ease: luxeEase }}
            />
          ))}
        </div>

        <div className="booking-success-content" role="status" aria-live="polite">
          {/* Checkmark with rings */}
          <div className="booking-success-visual">
            {/* Solid circle */}
            <motion.div
              className="booking-success-check-circle"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.2 }}
            />

            {/* Particle burst */}
            {!reduceMotion && particles.map((p) => (
              <motion.span
                key={p.id}
                className="booking-success-particle"
                style={{ width: p.size, height: p.size, marginLeft: -p.size / 2, marginTop: -p.size / 2 }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{
                  x: Math.cos(p.angle) * p.distance,
                  y: Math.sin(p.angle) * p.distance,
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0.3],
                }}
                transition={{ duration: 1.2, delay: p.delay, ease: luxeEase }}
              />
            ))}

            {/* SVG checkmark drawn in */}
            <svg viewBox="0 0 100 100" className="booking-success-checkmark-svg">
              <motion.path
                d="M28 52 L44 68 L74 36"
                fill="none"
                stroke="#fff"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.7, delay: 0.55, ease: luxeEase }}
              />
            </svg>
          </div>

          {/* Eyebrow */}
          <motion.div
            className="booking-success-eyebrow"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9, ease: luxeEase }}
          >
            {isAssigned ? 'Assigned' : 'Booked'}
          </motion.div>

          {/* Heading */}
          <motion.h1
            id="booking-success-title"
            className="booking-success-heading"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.0, ease: luxeEase }}
          >
            Shipment booked!
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="booking-success-subtitle"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.15, ease: luxeEase }}
          >
            Your package is on its way. Track it anytime from your orders.
          </motion.p>

          {/* Ticket card */}
          <motion.div
            className="booking-success-ticket"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.3, ease: luxeEase }}
          >
            <div className="booking-success-ticket-top">
              <div className="booking-success-ticket-cell">
                <span className="booking-success-ticket-label">Sender</span>
                <span className="booking-success-ticket-value">{success.sender_name}</span>
              </div>
              <div className="booking-success-ticket-divider" />
              <div className="booking-success-ticket-cell">
                <span className="booking-success-ticket-label">Route</span>
                <span className="booking-success-ticket-value">{routeLabel}</span>
              </div>
              <div className="booking-success-ticket-divider" />
              <div className="booking-success-ticket-cell">
                <span className="booking-success-ticket-label">Weight</span>
                <span className="booking-success-ticket-value">{success.package_weight} kg</span>
              </div>
            </div>

            <div className="booking-success-ticket-perforation">
              <span className="booking-success-ticket-hole booking-success-ticket-hole-left" />
              <span className="booking-success-ticket-hole booking-success-ticket-hole-right" />
              <div className="booking-success-ticket-dash" />
            </div>

            <div className="booking-success-ticket-bottom">
              <div>
                <span className="booking-success-ticket-label">Tracking Number</span>
                <div className="booking-success-tracking-row">
                  <span className="booking-success-ticket-tracking">{success.tracking_number}</span>
                  <button
                    type="button"
                    className={`booking-success-copy-btn${trackingCopied ? ' is-copied' : ''}`}
                    onClick={() => {
                      fallbackCopy(success.tracking_number);
                      setTrackingCopied(true);
                      setTimeout(() => setTrackingCopied(false), 2000);
                    }}
                    aria-label="Copy tracking number"
                  >
                    {trackingCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <span className={`booking-success-status-pill ${isAssigned ? 'is-assigned' : 'is-pending'}`}>
                {statusLabel}
              </span>
            </div>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            className="booking-success-actions"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.5, ease: luxeEase }}
          >
            <button type="button" className="btn booking-success-btn-primary" onClick={() => navigate(orderPath)}>
              View Order
            </button>
            <button
              type="button"
              className="btn booking-success-btn-outline"
              onClick={() => { setSuccess(null); setStep(1); setForm(prev => ({ ...prev, route: '', trip_id: '', sender_name: '', sender_phone: '', sender_facebook: '', sender_lot_block: '', sender_street: '', sender_barangay: '', sender_city: '', sender_province: '', sender_landmark: '', receiver_name: '', receiver_phone: '', receiver_facebook: '', receiver_lot_block: '', receiver_street: '', receiver_barangay: '', receiver_city: '', receiver_province: '', receiver_landmark: '', package_description: '', package_weight: '', payer_type: 'sender', notes: '' })); }}
            >
              Book Another
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const steps = ['Route', 'Sender', 'Receiver', 'Package', 'Review'];

  return (
    <div className="page-transition booking-page">
      <button type="button" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} className="btn btn-ghost customer-back-action mb-16">
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
            {i < steps.length - 1 && <div className="step-connector" style={{ background: step > i + 1 ? 'var(--success)' : 'var(--border)' }} />}
          </div>
        ))}
      </div>
      <div className="booking-current-step" aria-live="polite">Step {step} of {steps.length}: {steps[step - 1]}</div>

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
              <CustomSelect id="booking-trip" className="form-select booking-trip-select" value={form.trip_id} onChange={e => u('trip_id', e.target.value)}>
                <option value="">No specific trip</option>
                {filteredTrips.map(t => <option key={t.id} value={t.id}>{formatBookingTripOption(t)}</option>)}
              </CustomSelect>
              {selectedTrip && (
                <div className="booking-trip-preview">
                  <div>
                    <span>Selected trip</span>
                    <strong>{selectedTrip.trip_number}</strong>
                  </div>
                  <div>
                    <span>Departure</span>
                    <strong>{formatBookingTripDate(selectedTrip.departure_date)}</strong>
                  </div>
                  <div>
                    <span>Rate</span>
                    <strong>PHP {parseFloat(selectedTrip.price_per_kg || pricePerKilo).toFixed(2)}/kg</strong>
                  </div>
                </div>
              )}
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
              <input type="checkbox" id="useRegSender" checked={useRegisteredSender} onChange={e => handleUseRegisteredSenderChange(e.target.checked)} className="w-18" style={{ height: 18 }} />
              <label htmlFor="useRegSender" className="text-sm fw-600 cursor-pointer" style={{ color: 'var(--text)' }}>Use my registered address for sender details</label>
            </div>
          )}
          {renderAddressFields('sender')}
          <button type="button" className="btn btn-primary btn-lg w-full mt-20 justify-center" onClick={() => {
            const errs = validateSender();
            if (Object.keys(errs).length) { setFieldErrors(errs); toast.error('Please fill in all required sender fields.'); return; }
            setFieldErrors({});
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
              <input type="checkbox" id="useRegReceiver" checked={useRegisteredReceiver} onChange={e => handleUseRegisteredReceiverChange(e.target.checked)} className="w-18" style={{ height: 18 }} />
              <label htmlFor="useRegReceiver" className="text-sm fw-600 cursor-pointer" style={{ color: 'var(--text)' }}>Use my registered address for receiver details</label>
            </div>
          )}
          {renderAddressFields('receiver')}
          <button type="button" className="btn btn-primary btn-lg w-full mt-20 justify-center" onClick={() => {
            const errs = validateReceiver();
            if (Object.keys(errs).length) { setFieldErrors(errs); toast.error('Please fill in all required receiver fields.'); return; }
            const v = validateRouteProvinces(form.sender_province, form.receiver_province, selectedRoute);
            if (!v.valid) { toast.error(v.error); return; }
            setFieldErrors({});
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
            <CustomSelect id="payer-type" className="form-select" value={form.payer_type} onChange={e => u('payer_type', e.target.value)}>
              <option value="sender">Sender</option><option value="receiver">Receiver</option>
            </CustomSelect>
          </div>
          {form.package_weight && (
            <div className="booking-cost-card mb-16 text-center">
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
          <div className="booking-summary-card mb-16">
            <div className="booking-summary-label">Route</div>
            <div className="booking-summary-value">{form.route}</div>
          </div>
          <div className="grid grid-2 gap-12 mb-16">
            <div className="booking-summary-card">
              <div className="booking-summary-label">Sender</div>
              <div className="text-sm font-bold">{form.sender_name}</div>
              <div className="text-xs text-secondary">{form.sender_phone}</div>
              <div className="text-xs text-secondary mt-4">{form.sender_street}, {form.sender_barangay}, {form.sender_city}, {form.sender_province}</div>
            </div>
            <div className="booking-summary-card">
              <div className="booking-summary-label">Receiver</div>
              <div className="text-sm font-bold">{form.receiver_name}</div>
              <div className="text-xs text-secondary">{form.receiver_phone}</div>
              <div className="text-xs text-secondary mt-4">{form.receiver_street}, {form.receiver_barangay}, {form.receiver_city}, {form.receiver_province}</div>
            </div>
          </div>
          <div className="booking-cost-card text-center mb-16">
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
