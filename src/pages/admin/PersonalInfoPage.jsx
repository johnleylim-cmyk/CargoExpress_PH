import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { updateProfile, withTimeout } from '../../lib/database';
import {
  ArrowLeft, Loader, Save, CheckCircle, AlertCircle,
  User, Phone, Globe, MapPin, ExternalLink, Link2,
  Smartphone, Building,
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import usePageTitle from '../../hooks/usePageTitle';

const toTitleCase = (str) => str.replace(/\b\w/g, c => c.toUpperCase());

const validatePhone = (v) => {
  if (!v) return null;
  const d = v.trim();
  if (!d) return null;
  if (!/^\d+$/.test(d)) return 'Must contain numbers only.';
  if (!d.startsWith('09')) return 'Must start with 09.';
  if (d.length !== 11) return `Must be exactly 11 digits (${d.length}/11).`;
  return null;
};

const validateFB = (v) => {
  if (!v) return null;
  const u = v.trim();
  if (!u) return null;
  if (!u.startsWith('https://www.facebook.com/') && !u.startsWith('https://facebook.com/') && !u.startsWith('http://')) {
    return 'Must be a valid Facebook URL starting with https://www.facebook.com/';
  }
  return null;
};

const AdminPersonalInfoPage = () => {
  usePageTitle('Personal Info');
  const { user, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

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
  const [saveStatus,  setSaveStatus]  = useState(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePhone = (key) => (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    setField(key, digits);
    setFieldErrors(p => ({ ...p, [key]: validatePhone(digits) }));
  };

  const handleTitleCase = (key) => (e) => {
    setField(key, toTitleCase(e.target.value));
    setFieldErrors(p => ({ ...p, [key]: null }));
  };

  const handleFB = (e) => {
    setField('facebook_link', e.target.value);
    setFieldErrors(p => ({ ...p, facebook_link: validateFB(e.target.value) }));
  };

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

  const handleSave = async () => {
    setSaveStatus(null); setSaveMessage('');
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
        supabase.from('profiles').update(payload).eq('id', user.id).select().single()
      );
      if (updateError) throw updateError;
      await refreshProfile();
      toast.success('Profile updated successfully!');
      setTimeout(() => navigate(-1), 1200);
    } catch (err) {
      toast.error(err?.message || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">

      {/* ── Basic Info ─────────────────────────────────────────────── */}
      <div className="card mb-16">
        <div className="card-body">
          <h3 className="fw-700 mb-16 flex items-center gap-8">
            <User size={18} color="var(--primary)" /> Basic Information
          </h3>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-profile-name">Full Name *</label>
            <div className="form-input-wrapper">
              <User size={15} className="form-input-icon" />
              <input
                id="admin-profile-name"
                className={`form-input form-input-icon-left ${fieldErrors.name ? 'error' : ''}`}
                placeholder="Admin Name"
                value={form.name}
                onChange={handleTitleCase('name')}
              />
            </div>
            {fieldErrors.name && <p className="form-error">{fieldErrors.name}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-profile-phone">Primary Mobile Number</label>
            <div className="form-input-wrapper">
              <Phone size={15} className="form-input-icon" />
              <input
                id="admin-profile-phone"
                className={`form-input form-input-icon-left ${fieldErrors.phone ? 'error' : ''}`}
                placeholder="09xxxxxxxxx"
                value={form.phone}
                onChange={handlePhone('phone')}
                inputMode="numeric" maxLength={11}
              />
            </div>
            {fieldErrors.phone
              ? <p className="form-error">{fieldErrors.phone}</p>
              : <p className="form-helper">Must start with 09, exactly 11 digits</p>
            }
          </div>
        </div>
      </div>

      {/* ── Business Contact ───────────────────────────────────────── */}
      <div className="card mb-16">
        <div className="card-body">
          <h3 className="fw-700 mb-4 flex items-center gap-8">
            <Phone size={18} color="var(--primary)" /> Business Contact Numbers
          </h3>
          <p className="form-helper mb-16">
            These numbers will be shown in the Contact Us section of the app.
          </p>

          <div className="grid grid-2 gap-16">
            <div className="form-group">
              <label className="form-label" htmlFor="admin-smart-phone">Smart / TNT Number</label>
              <div className="form-input-wrapper">
                <Smartphone size={15} className="form-input-icon" />
                <input
                  id="admin-smart-phone"
                  className={`form-input form-input-icon-left ${fieldErrors.smart_phone ? 'error' : ''}`}
                  placeholder="09xxxxxxxxx"
                  value={form.smart_phone}
                  onChange={handlePhone('smart_phone')}
                  inputMode="numeric" maxLength={11}
                />
              </div>
              {fieldErrors.smart_phone && <p className="form-error">{fieldErrors.smart_phone}</p>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-globe-phone">Globe / TM Number</label>
              <div className="form-input-wrapper">
                <Globe size={15} className="form-input-icon" />
                <input
                  id="admin-globe-phone"
                  className={`form-input form-input-icon-left ${fieldErrors.globe_phone ? 'error' : ''}`}
                  placeholder="09xxxxxxxxx"
                  value={form.globe_phone}
                  onChange={handlePhone('globe_phone')}
                  inputMode="numeric" maxLength={11}
                />
              </div>
              {fieldErrors.globe_phone && <p className="form-error">{fieldErrors.globe_phone}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Social Media ───────────────────────────────────────────── */}
      <div className="card mb-16">
        <div className="card-body">
          <h3 className="fw-700 mb-4 flex items-center gap-8">
            <Globe size={18} color="var(--primary)" /> Social Media
          </h3>
          <p className="form-helper mb-16">
            Paste the full URL of your Facebook page.
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-facebook-link">Facebook Page Link</label>
            <div className="form-input-wrapper">
              <Link2 size={15} className="form-input-icon" />
              <input
                id="admin-facebook-link"
                className={`form-input form-input-icon-left ${fieldErrors.facebook_link ? 'error' : ''}`}
                placeholder="https://www.facebook.com/your-page"
                value={form.facebook_link}
                onChange={handleFB}
              />
            </div>
            {fieldErrors.facebook_link
              ? <p className="form-error">{fieldErrors.facebook_link}</p>
              : form.facebook_link && !fieldErrors.facebook_link && (
                <a href={form.facebook_link} target="_blank" rel="noopener noreferrer" className="admin-external-link">
                  <ExternalLink size={12} /> Open page
                </a>
              )
            }
          </div>
        </div>
      </div>

      {/* ── Business Addresses ─────────────────────────────────────── */}
      <div className="card mb-24">
        <div className="card-body">
          <h3 className="fw-700 mb-4 flex items-center gap-8">
            <MapPin size={18} color="var(--primary)" /> Business Addresses
          </h3>
          <p className="form-helper mb-16">
            These addresses will be shown to customers for pickup and delivery reference.
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-manila-address">Manila Address</label>
            <div className="form-input-wrapper items-start">
              <Building size={15} className="form-input-icon" />
              <textarea
                id="admin-manila-address"
                className="form-textarea form-input-icon-left"
                placeholder="Complete Manila office/depot address"
                value={form.manila_address}
                onChange={e => setField('manila_address', toTitleCase(e.target.value))}
                rows={2}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-bohol-address">Bohol Address</label>
            <div className="form-input-wrapper items-start">
              <MapPin size={15} className="form-input-icon" />
              <textarea
                id="admin-bohol-address"
                className="form-textarea form-input-icon-left"
                placeholder="Complete Bohol office/depot address"
                value={form.bohol_address}
                onChange={e => setField('bohol_address', toTitleCase(e.target.value))}
                rows={2}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="admin-form-actions">
        <button
          type="button"
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
