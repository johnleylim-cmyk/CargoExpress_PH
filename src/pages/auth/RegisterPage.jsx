import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Container, Eye, EyeOff, Loader, Check, ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import { PH_LOCATIONS, VALID_PROVINCES } from '../../constants/phLocations';

const toTitleCase = (str) =>
  str.replace(/\b\w/g, (char) => char.toUpperCase());

const isPhoneValid = (phone) =>
  /^09\d{9}$/.test(phone);

const getPasswordStrength = (pw) => {
  if (!pw) return { level: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Weak', color: 'var(--error)' };
  if (score <= 2) return { level: 2, label: 'Fair', color: 'var(--warning)' };
  if (score <= 3) return { level: 3, label: 'Good', color: 'var(--info)' };
  return { level: 4, label: 'Strong', color: 'var(--success)' };
};

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '', facebook_name: '',
    address_province: '', address_city: '', address_barangay: '',
    address_street: '', address_lot_block: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const cities = form.address_province ? PH_LOCATIONS[form.address_province] || [] : [];
  const pwStrength = getPasswordStrength(form.password);

  const handleTitleCase = (key) => (e) => {
    update(key, toTitleCase(e.target.value));
  };

  const handlePhone = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    update('phone', digits);
    if (digits.length === 0) setPhoneError('');
    else if (!digits.startsWith('09')) setPhoneError('Must start with 09');
    else if (digits.length < 11) setPhoneError('Must be 11 digits');
    else setPhoneError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    if (!/[A-Z]/.test(form.password)) return setError('Password must include an uppercase letter');
    if (!/[a-z]/.test(form.password)) return setError('Password must include a lowercase letter');
    if (!/[0-9]/.test(form.password)) return setError('Password must include a number');
    setError(''); setLoading(true);
    try {
      const result = await register(form.email, form.password, {
        name: form.name, phone: form.phone, facebook_name: form.facebook_name,
        address_province: form.address_province, address_city: form.address_city,
        address_barangay: form.address_barangay, address_street: form.address_street,
        address_lot_block: form.address_lot_block,
      });
      setLoading(false);
      if (result.success) navigate('/');
      else setError(result.error);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-brand">
          <Container size={40} color="var(--primary)" style={{ marginBottom: 8 }} />
          <h1><span>CARGO</span><span>EXPRESS PH</span></h1>
          <p>Create your account</p>
        </div>

        {/* Step Progress */}
        <div className="step-progress" style={{ marginBottom: 24 }}>
          {[1, 2].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div className={`step ${step >= s ? 'active' : ''} ${step > s ? 'completed' : ''}`}>
                <div className="step-number">
                  {step > s ? <Check size={14} strokeWidth={3} /> : s}
                </div>
                <span className="step-label">{s === 1 ? 'Account' : 'Address'}</span>
              </div>
              {s < 2 && (
                <div className="step-connector" style={{ background: step > 1 ? 'var(--success)' : 'var(--border)' }} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="alert-banner alert-banner-error animate-shake">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="animate-fade-in">
              <div className="form-group">
                <label className="form-label" htmlFor="reg-name">Full Name <span className="required">*</span></label>
                <input id="reg-name" className="form-input" placeholder="Juan Dela Cruz" value={form.name} onChange={handleTitleCase('name')} required autoComplete="name" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-facebook">Facebook Name</label>
                <input id="reg-facebook" className="form-input" placeholder="Juan Dela Cruz on FB" value={form.facebook_name} onChange={e => update('facebook_name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">Email Address <span className="required">*</span></label>
                <input id="reg-email" type="email" className="form-input" placeholder="you@email.com" value={form.email} onChange={e => update('email', e.target.value)} required autoComplete="email" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-phone">Mobile Number</label>
                <input
                  id="reg-phone"
                  className={`form-input ${phoneError ? 'error' : form.phone.length === 11 && !phoneError ? 'success' : ''}`}
                  placeholder="09xxxxxxxxx"
                  value={form.phone}
                  onChange={handlePhone}
                  inputMode="numeric"
                  maxLength={11}
                  autoComplete="tel"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  {phoneError ? (
                    <span className="form-error">{phoneError}</span>
                  ) : <span />}
                  <span className="form-helper">{form.phone.length}/11</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-password">Password <span className="required">*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    id="reg-password"
                    className="form-input"
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                    required
                    style={{ paddingRight: 44 }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer',
                    }}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {/* Password Strength Meter */}
                {form.password && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{
                          flex: 1, height: 3, borderRadius: 2,
                          background: i <= pwStrength.level ? pwStrength.color : 'var(--border)',
                          transition: 'all 0.3s ease',
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: pwStrength.color, fontWeight: 600 }}>
                      {pwStrength.label}
                    </span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-confirm-password">Confirm Password <span className="required">*</span></label>
                <input
                  id="reg-confirm-password"
                  type="password"
                  className={`form-input ${form.confirmPassword && form.confirmPassword === form.password ? 'success' : form.confirmPassword && form.confirmPassword !== form.password ? 'error' : ''}`}
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={e => update('confirmPassword', e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <button
                type="button"
                className="btn btn-primary btn-lg btn-block"
                onClick={() => {
                  if (!form.name || !form.email || !form.password) return setError('Please fill in all required fields');
                  if (form.phone && !isPhoneValid(form.phone)) return setError('Mobile number must be 11 digits and start with 09');
                  setError(''); setStep(2);
                }}
              >
                Continue <ArrowRight size={18} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <div className="form-group">
                <label className="form-label" htmlFor="reg-province">Province</label>
                <select id="reg-province" className="form-select" value={form.address_province} onChange={e => { update('address_province', e.target.value); update('address_city', ''); }} autoComplete="address-level1">
                  <option value="">Select Province</option>
                  {VALID_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-city">City / Municipality</label>
                <select id="reg-city" className="form-select" value={form.address_city} onChange={e => update('address_city', e.target.value)} autoComplete="address-level2">
                  <option value="">Select City</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-barangay">Barangay</label>
                <input id="reg-barangay" className="form-input" placeholder="Barangay" value={form.address_barangay} onChange={handleTitleCase('address_barangay')} autoComplete="address-level3" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-street">Street</label>
                <input id="reg-street" className="form-input" placeholder="Street name" value={form.address_street} onChange={handleTitleCase('address_street')} autoComplete="street-address" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-lot">Lot / Block / Unit</label>
                <input id="reg-lot" className="form-input" placeholder="Lot/Block/Unit No." value={form.address_lot_block} onChange={handleTitleCase('address_lot_block')} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-outline btn-lg" onClick={() => setStep(1)} style={{ flex: 1, justifyContent: 'center' }}>
                  <ArrowLeft size={18} /> Back
                </button>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
                  {loading ? <Loader size={18} className="animate-spin" /> : 'Create Account'}
                </button>
              </div>
            </div>
          )}
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
