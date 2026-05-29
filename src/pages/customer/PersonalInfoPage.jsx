import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { PH_LOCATIONS, VALID_PROVINCES } from '../../constants/phLocations';
import { ArrowLeft, Loader, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Capitalises the first letter of every word. */
const toTitleCase = (str) =>
  str.replace(/\b\w/g, (char) => char.toUpperCase());

/**
 * Strict Philippine mobile number validation.
 *  - Required field
 *  - Numbers only
 *  - Must start with 09
 *  - Must be exactly 11 digits
 */
const validatePhone = (phone) => {
  const val = (phone || '').trim();
  if (!val) return 'Mobile number is required.';
  if (!/^\d+$/.test(val)) return 'Mobile number must contain numbers only.';
  if (!val.startsWith('09')) return 'Mobile number must start with 09.';
  if (val.length !== 11) return `Mobile number must be exactly 11 digits (${val.length}/11).`;
  return null; // valid
};

// ─────────────────────────────────────────────────────────────────────────────

const PersonalInfoPage = () => {
  const { user, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Seed form from profiles table data (via AuthContext → userProfile)
  const [form, setForm] = useState({
    name:              userProfile?.name              || '',
    facebook_name:     userProfile?.facebook_name     || '',
    phone:             userProfile?.phone             || '',
    address_province:  userProfile?.address_province  || '',
    address_city:      userProfile?.address_city      || '',
    address_barangay:  userProfile?.address_barangay  || '',
    address_street:    userProfile?.address_street    || '',
    address_lot_block: userProfile?.address_lot_block || '',
  });

  const [loading,     setLoading]     = useState(false);
  const [saveStatus,  setSaveStatus]  = useState(null);  // null | 'success' | 'error'
  const [saveMessage, setSaveMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const cities = form.address_province
    ? PH_LOCATIONS[form.address_province] || []
    : [];

  // ── Field updaters ──────────────────────────────────────────────────────────

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  /** Title-case on every keystroke; clears per-field error on change. */
  const handleTitleCase = (key) => (e) => {
    setField(key, toTitleCase(e.target.value));
    if (fieldErrors[key]) setFieldErrors(prev => ({ ...prev, [key]: null }));
  };

  /** Phone: strip non-digits, cap at 11 chars, real-time validate. */
  const handlePhone = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    setField('phone', digits);
    const err = validatePhone(digits);
    setFieldErrors(prev => ({ ...prev, phone: err }));
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) {
      errors.name = 'Full name is required.';
    }
    if (!form.facebook_name?.trim()) {
      errors.facebook_name = 'Facebook name is required.';
    }
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) errors.phone = phoneErr;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  /**
   * handleSave — directly calls supabase.from('profiles').update()
   *
   * Why we bypass updateProfile() from database.js and call supabase directly:
   *   The supabase.js lock bug (lock: 'no-op' as a string) previously crashed
   *   ALL Supabase calls including the update. Now that supabase.js is fixed
   *   (lock is a proper async no-op function), the call works.
   *   We use supabase directly here so errors are crystal-clear in the console.
   *
   * Flow: validate → setLoading → update profiles → refreshProfile → show banner
   */
  const handleSave = async () => {
    setSaveStatus(null);
    setSaveMessage('');

    // 1. Client-side validation
    if (!validate()) return;

    // 2. Guard: user must be authenticated
    if (!user?.id) {
      setSaveStatus('error');
      setSaveMessage('You are not logged in. Please sign in and try again.');
      return;
    }

    setLoading(true);
    try {
      // 3. Update ONLY the profiles table — do not touch Supabase Auth
      const combinedAddress = [
        form.address_lot_block,
        form.address_street,
        form.address_barangay,
        form.address_city,
        form.address_province
      ].filter(Boolean).join(', ');

      const updates = {
        name:              form.name.trim(),
        facebook_name:     form.facebook_name.trim(),
        phone:             form.phone || null,
        address:           combinedAddress || null,
        address_province:  form.address_province  || null,
        address_city:      form.address_city      || null,
        address_barangay:  form.address_barangay  || null,
        address_street:    form.address_street    || null,
        address_lot_block: form.address_lot_block || null,
        updated_at:        new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // 4. Re-fetch profile to sync AuthContext state and refresh the navbar name
      await refreshProfile();

      setSaveStatus('success');
      setSaveMessage('Profile updated successfully!');
      // Auto-clear success banner after 4 seconds
      setTimeout(() => setSaveStatus(null), 4000);

    } catch (err) {
      // Error state set below

      // Provide a useful message based on the error type
      let msg = 'Failed to save changes. Please try again.';
      if (err?.code === 'PGRST301' || err?.message?.includes('JWT')) {
        msg = 'Your session has expired. Please sign out and sign back in.';
      } else if (err?.message?.includes('violates')) {
        msg = 'Invalid data. Check your inputs and try again.';
      } else if (err?.message?.includes('not a function')) {
        msg = 'Supabase configuration error. Contact support. (lock misconfiguration)';
      } else if (err?.message) {
        msg = err.message;
      }

      setSaveStatus('error');
      setSaveMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="animate-slide-up">
      <button
        onClick={() => navigate(-1)}
        className="btn btn-ghost"
        style={{ marginBottom: 16 }}
      >
        <ArrowLeft size={18} /> Back
      </button>
      <h2 style={{ fontWeight: 800, marginBottom: 20 }}>Personal Information</h2>

      {/* ── Success Banner ── */}
      {saveStatus === 'success' && (
        <div className="alert-banner alert-banner-success animate-scale-in">
          <CheckCircle size={18} /> {saveMessage}
        </div>
      )}

      {/* ── Error Banner ── */}
      {saveStatus === 'error' && (
        <div className="alert-banner alert-banner-error animate-scale-in">
          <AlertCircle size={18} /> {saveMessage}
        </div>
      )}

      <div className="card">
        <div className="card-body">

          {/* Full Name */}
          <div className="form-group">
            <label className="form-label">
              Full Name <span className="required">*</span>
            </label>
            <input
              className="form-input"
              placeholder="Juan Dela Cruz"
              value={form.name}
              onChange={handleTitleCase('name')}
              style={fieldErrors.name ? { borderColor: 'var(--error)' } : {}}
            />
            {fieldErrors.name && (
              <p className="form-error">{fieldErrors.name}</p>
            )}
          </div>

          {/* Facebook Name */}
          <div className="form-group">
            <label className="form-label">
              Facebook Name <span className="required">*</span>
            </label>
            <input
              className="form-input"
              placeholder="Juan Dela Cruz on FB"
              value={form.facebook_name}
              onChange={e => setField('facebook_name', e.target.value)}
              style={fieldErrors.facebook_name ? { borderColor: 'var(--error)' } : {}}
            />
            {fieldErrors.facebook_name && (
              <p className="form-error">{fieldErrors.facebook_name}</p>
            )}
          </div>

          {/* Mobile Number */}
          <div className="form-group">
            <label className="form-label">
              Mobile Number <span className="required">*</span>
            </label>
            <input
              className="form-input"
              placeholder="09xxxxxxxxx"
              value={form.phone}
              onChange={handlePhone}
              inputMode="numeric"
              maxLength={11}
              style={fieldErrors.phone ? { borderColor: 'var(--error)' } : {}}
            />
            {fieldErrors.phone ? (
              <p className="form-error">{fieldErrors.phone}</p>
            ) : (
              <p className="form-helper">
                Must start with 09 and be exactly 11 digits
              </p>
            )}
          </div>

          {/* Province */}
          <div className="form-group">
            <label className="form-label">Province</label>
            <select
              className="form-select"
              value={form.address_province}
              onChange={e => {
                setField('address_province', e.target.value);
                setField('address_city', ''); // reset city when province changes
              }}
            >
              <option value="">Select Province</option>
              {VALID_PROVINCES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* City / Municipality */}
          <div className="form-group">
            <label className="form-label">City / Municipality</label>
            <select
              className="form-select"
              value={form.address_city}
              onChange={e => setField('address_city', e.target.value)}
            >
              <option value="">Select City</option>
              {cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Barangay */}
          <div className="form-group">
            <label className="form-label">Barangay</label>
            <input
              className="form-input"
              placeholder="Barangay name"
              value={form.address_barangay}
              onChange={handleTitleCase('address_barangay')}
            />
          </div>

          {/* Street */}
          <div className="form-group">
            <label className="form-label">Street</label>
            <input
              className="form-input"
              placeholder="Street name"
              value={form.address_street}
              onChange={handleTitleCase('address_street')}
            />
          </div>

          {/* Lot / Block / Unit */}
          <div className="form-group">
            <label className="form-label">Lot / Block / Unit</label>
            <input
              className="form-input"
              placeholder="Lot/Block/Unit No."
              value={form.address_lot_block}
              onChange={handleTitleCase('address_lot_block')}
            />
          </div>

          {/* Save Button */}
          <button
            className="btn btn-primary btn-lg w-full"
            onClick={handleSave}
            disabled={loading}
            style={{ justifyContent: 'center', marginTop: 8 }}
          >
            {loading
              ? <><Loader size={18} className="animate-spin" /> Saving...</>
              : <><Save size={18} /> Save Changes</>
            }
          </button>

        </div>
      </div>
    </div>
  );
};

export default PersonalInfoPage;
