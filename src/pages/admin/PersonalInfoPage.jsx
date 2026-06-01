import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { updateProfile, withTimeout } from '../../lib/database';
import {
  ArrowLeft, Loader, Save, CheckCircle, AlertCircle,
  User, Phone, Globe, MapPin, ExternalLink,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────

const toTitleCase = (str) =>
  str.replace(/\b\w/g, c => c.toUpperCase());

const validatePhone = (v) => {
  if (!v) return null; // optional
  const d = v.trim();
  if (!d) return null;
  if (!/^\d+$/.test(d)) return 'Must contain numbers only.';
  if (!d.startsWith('09')) return 'Must start with 09.';
  if (d.length !== 11) return `Must be exactly 11 digits (${d.length}/11).`;
  return null;
};

const validateFB = (v) => {
  if (!v) return null; // optional
  const u = v.trim();
  if (!u) return null;
  if (!u.startsWith('https://www.facebook.com/') && !u.startsWith('https://facebook.com/') && !u.startsWith('http://')) {
    return 'Must be a valid Facebook URL starting with https://www.facebook.com/';
  }
  return null;
};

// ── Component ──────────────────────────────────────────────────────────────

const AdminPersonalInfoPage = () => {
  const { user, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name:            userProfile?.name            || '',
    phone:           userProfile?.phone           || '',
    smart_phone:     userProfile?.smart_phone     || '',
    globe_phone:     userProfile?.globe_phone     || '',
    facebook_link:   userProfile?.facebook_link   || '',
    manila_address:  userProfile?.manila_address  || '',
    bohol_address:   userProfile?.bohol_address   || '',
  });

  const [loading,     setLoading]     = useState(false);
  const [saveStatus,  setSaveStatus]  = useState(null);  // null | 'success' | 'error'
  const [saveMessage, setSaveMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePhone = (key) => (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    setField(key, digits);
    const err = validatePhone(digits);
    setFieldErrors(p => ({ ...p, [key]: err }));
  };

  const handleTitleCase = (key) => (e) => {
    setField(key, toTitleCase(e.target.value));
    setFieldErrors(p => ({ ...p, [key]: null }));
  };

  const handleFB = (e) => {
    setField('facebook_link', e.target.value);
    const err = validateFB(e.target.value);
    setFieldErrors(p => ({ ...p, facebook_link: err }));
  };

  // ── Validate ─────────────────────────────────────────────────────────────

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Full name is required.';
    ['smart_phone', 'globe_phone', 'phone'].forEach(k => {
      const err = validatePhone(form[k]);
      if (err) errors[k] = err;
    });
    const fbErr = validateFB(form.facebook_link);
    if (fbErr) errors.facebook_link = fbErr;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaveStatus(null);
    setSaveMessage('');
    if (!validate()) return;
    if (!user?.id) { setSaveStatus('error'); setSaveMessage('Not logged in.'); return; }

    setLoading(true);
    try {
      const payload = {
        name:           form.name.trim(),
        phone:          form.phone          || null,
        smart_phone:    form.smart_phone    || null,
        globe_phone:    form.globe_phone    || null,
        facebook_link:  form.facebook_link  || null,
        manila_address: form.manila_address || null,
        bohol_address:  form.bohol_address  || null,
        updated_at:     new Date().toISOString(),
      };

      const { error: updateError } = await withTimeout(
        supabase
          .from('profiles')
          .update(payload)
          .eq('id', user.id)
          .select()
          .single()
      );

      if (updateError) throw updateError;
      
      await refreshProfile();

      setSaveStatus('success');
      setSaveMessage('Profile updated successfully!');
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err) {
      setSaveStatus('error');
      setSaveMessage(err?.message || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">
      {/* Banners */}
      {saveStatus === 'success' && (
        <div className="alert-banner alert-banner-success animate-scale-in">
          <CheckCircle size={18} /> {saveMessage}
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="alert-banner alert-banner-error animate-scale-in">
          <AlertCircle size={18} /> {saveMessage}
        </div>
      )}

      {/* ── Basic Info ───────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={18} color="var(--primary)" /> Basic Information
          </h3>

          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              className="form-input"
              placeholder="Admin Name"
              value={form.name}
              onChange={handleTitleCase('name')}
              style={fieldErrors.name ? { borderColor: 'var(--error)' } : {}}
            />
            {fieldErrors.name && <p className="form-error">{fieldErrors.name}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Primary Mobile Number</label>
            <input
              className="form-input"
              placeholder="09xxxxxxxxx"
              value={form.phone}
              onChange={handlePhone('phone')}
              inputMode="numeric" maxLength={11}
              style={fieldErrors.phone ? { borderColor: 'var(--error)' } : {}}
            />
            {fieldErrors.phone
              ? <p className="form-error">{fieldErrors.phone}</p>
              : <p className="form-helper">Must start with 09, exactly 11 digits</p>
            }
          </div>
        </div>
      </div>

      {/* ── Business Contact ─────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <h3 style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Phone size={18} color="var(--primary)" /> Business Contact Numbers
          </h3>
          <p className="form-helper" style={{ marginBottom: 16 }}>
            These numbers will be shown in the Contact Us section of the app.
          </p>

          <div className="grid grid-2" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Smart / TNT Number</label>
              <input
                className="form-input"
                placeholder="09xxxxxxxxx"
                value={form.smart_phone}
                onChange={handlePhone('smart_phone')}
                inputMode="numeric" maxLength={11}
                style={fieldErrors.smart_phone ? { borderColor: 'var(--error)' } : {}}
              />
              {fieldErrors.smart_phone && <p className="form-error">{fieldErrors.smart_phone}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Globe / TM Number</label>
              <input
                className="form-input"
                placeholder="09xxxxxxxxx"
                value={form.globe_phone}
                onChange={handlePhone('globe_phone')}
                inputMode="numeric" maxLength={11}
                style={fieldErrors.globe_phone ? { borderColor: 'var(--error)' } : {}}
              />
              {fieldErrors.globe_phone && <p className="form-error">{fieldErrors.globe_phone}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Social Media ─────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <h3 style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={18} color="var(--primary)" /> Social Media
          </h3>
          <p className="form-helper" style={{ marginBottom: 16 }}>
            Paste the full URL of your Facebook page.
          </p>

          <div className="form-group">
            <label className="form-label">Facebook Page Link</label>
            <input
              className="form-input"
              placeholder="https://www.facebook.com/your-page"
              value={form.facebook_link}
              onChange={handleFB}
              style={fieldErrors.facebook_link ? { borderColor: 'var(--error)' } : {}}
            />
            {fieldErrors.facebook_link
              ? <p className="form-error">{fieldErrors.facebook_link}</p>
              : form.facebook_link && !fieldErrors.facebook_link && (
                <a
                  href={form.facebook_link} target="_blank" rel="noopener noreferrer"
                  className="admin-external-link"
                >
                  <ExternalLink size={12} /> Open page
                </a>
              )
            }
          </div>
        </div>
      </div>

      {/* ── Business Addresses ───────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <h3 style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} color="var(--primary)" /> Business Addresses
          </h3>
          <p className="form-helper" style={{ marginBottom: 16 }}>
            These addresses will be shown to customers for pickup and delivery reference.
          </p>

          <div className="form-group">
            <label className="form-label">Manila Address</label>
            <textarea
              className="form-textarea"
              placeholder="Complete Manila office/depot address"
              value={form.manila_address}
              onChange={e => setField('manila_address', toTitleCase(e.target.value))}
              rows={2}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Bohol Address</label>
            <textarea
              className="form-textarea"
              placeholder="Complete Bohol office/depot address"
              value={form.bohol_address}
              onChange={e => setField('bohol_address', toTitleCase(e.target.value))}
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="admin-form-actions">
        <button
          className="btn btn-primary btn-lg admin-form-submit"
          onClick={handleSave}
          disabled={loading}
          style={{ minWidth: 180 }}
        >
          {loading
            ? <><Loader size={18} className="animate-spin" /> Saving...</>
            : <><Save size={18} /> Save Changes</>
          }
        </button>
      </div>
    </div>
  );
};

export default AdminPersonalInfoPage;
