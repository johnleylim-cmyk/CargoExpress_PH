import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { PH_LOCATIONS, VALID_PROVINCES } from '../../constants/phLocations';
import {
  ArrowLeft, Loader, Save, CheckCircle, AlertCircle,
  User, Phone, MapPin, Home, Hash, MessageSquare, Map, Building,
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';

const toTitleCase = (str) => str.replace(/\b\w/g, (c) => c.toUpperCase());

const validatePhone = (phone) => {
  const val = (phone || '').trim();
  if (!val) return 'Mobile number is required.';
  if (!/^\d+$/.test(val)) return 'Mobile number must contain numbers only.';
  if (!val.startsWith('09')) return 'Mobile number must start with 09.';
  if (val.length !== 11) return `Mobile number must be exactly 11 digits (${val.length}/11).`;
  return null;
};

const PersonalInfoPage = () => {
  const { user, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

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
  const [saveStatus,  setSaveStatus]  = useState(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const cities = form.address_province ? PH_LOCATIONS[form.address_province] || [] : [];

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleTitleCase = (key) => (e) => {
    setField(key, toTitleCase(e.target.value));
    if (fieldErrors[key]) setFieldErrors(prev => ({ ...prev, [key]: null }));
  };

  const handlePhone = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    setField('phone', digits);
    setFieldErrors(prev => ({ ...prev, phone: validatePhone(digits) }));
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Full name is required.';
    if (!form.facebook_name?.trim()) errors.facebook_name = 'Facebook name is required.';
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) errors.phone = phoneErr;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    setSaveStatus(null); setSaveMessage('');
    if (!validate()) return;
    if (!user?.id) { setSaveStatus('error'); setSaveMessage('You are not logged in.'); return; }
    setLoading(true);
    try {
      const combinedAddress = [
        form.address_lot_block, form.address_street,
        form.address_barangay,  form.address_city, form.address_province,
      ].filter(Boolean).join(', ');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
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
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      await refreshProfile();
      toast.success('Profile updated successfully!');
      setTimeout(() => navigate(-1), 1200);
    } catch (err) {
      let msg = 'Failed to save changes. Please try again.';
      if (err?.code === 'PGRST301' || err?.message?.includes('JWT')) msg = 'Session expired. Please sign in again.';
      else if (err?.message?.includes('violates')) msg = 'Invalid data. Check your inputs and try again.';
      else if (err?.message) msg = err.message;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <button type="button" onClick={() => navigate(-1)} className="btn btn-ghost mb-16">
        <ArrowLeft size={18} /> Back
      </button>
      <h2 className="fw-800 mb-20">Personal Information</h2>

      <div className="card">
        <div className="card-body">

          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="profile-name">Full Name <span className="required">*</span></label>
            <div className="form-input-wrapper">
              <User size={15} className="form-input-icon" />
              <input
                id="profile-name"
                className={`form-input form-input-icon-left ${fieldErrors.name ? 'error' : ''}`}
                placeholder="Juan Dela Cruz"
                value={form.name}
                onChange={handleTitleCase('name')}
              />
            </div>
            {fieldErrors.name && <p className="form-error">{fieldErrors.name}</p>}
          </div>

          {/* Facebook Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="profile-facebook-name">Facebook Name <span className="required">*</span></label>
            <div className="form-input-wrapper">
              <MessageSquare size={15} className="form-input-icon" />
              <input
                id="profile-facebook-name"
                className={`form-input form-input-icon-left ${fieldErrors.facebook_name ? 'error' : ''}`}
                placeholder="Juan Dela Cruz on FB"
                value={form.facebook_name}
                onChange={e => setField('facebook_name', e.target.value)}
              />
            </div>
            {fieldErrors.facebook_name && <p className="form-error">{fieldErrors.facebook_name}</p>}
          </div>

          {/* Mobile Number */}
          <div className="form-group">
            <label className="form-label" htmlFor="profile-phone">Mobile Number <span className="required">*</span></label>
            <div className="form-input-wrapper">
              <Phone size={15} className="form-input-icon" />
              <input
                id="profile-phone"
                className={`form-input form-input-icon-left ${fieldErrors.phone ? 'error' : ''}`}
                placeholder="09xxxxxxxxx"
                value={form.phone}
                onChange={handlePhone}
                inputMode="numeric"
                maxLength={11}
              />
            </div>
            {fieldErrors.phone
              ? <p className="form-error">{fieldErrors.phone}</p>
              : <p className="form-helper">Must start with 09 and be exactly 11 digits</p>
            }
          </div>

          {/* Province */}
          <div className="form-group">
            <label className="form-label" htmlFor="profile-province">Province</label>
            <div className="form-input-wrapper">
              <Map size={15} className="form-input-icon" />
              <select
                id="profile-province"
                className="form-select form-input-icon-left"
                value={form.address_province}
                onChange={e => { setField('address_province', e.target.value); setField('address_city', ''); }}
              >
                <option value="">Select Province</option>
                {VALID_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* City / Municipality */}
          <div className="form-group">
            <label className="form-label" htmlFor="profile-city">City / Municipality</label>
            <div className="form-input-wrapper">
              <Building size={15} className="form-input-icon" />
              <select
                id="profile-city"
                className="form-select form-input-icon-left"
                value={form.address_city}
                onChange={e => setField('address_city', e.target.value)}
              >
                <option value="">Select City</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Barangay */}
          <div className="form-group">
            <label className="form-label" htmlFor="profile-barangay">Barangay</label>
            <div className="form-input-wrapper">
              <MapPin size={15} className="form-input-icon" />
              <input
                id="profile-barangay"
                className="form-input form-input-icon-left"
                placeholder="Barangay name"
                value={form.address_barangay}
                onChange={handleTitleCase('address_barangay')}
              />
            </div>
          </div>

          {/* Street */}
          <div className="form-group">
            <label className="form-label" htmlFor="profile-street">Street</label>
            <div className="form-input-wrapper">
              <Home size={15} className="form-input-icon" />
              <input
                id="profile-street"
                className="form-input form-input-icon-left"
                placeholder="Street name"
                value={form.address_street}
                onChange={handleTitleCase('address_street')}
              />
            </div>
          </div>

          {/* Lot / Block / Unit */}
          <div className="form-group">
            <label className="form-label" htmlFor="profile-lot-block">Lot / Block / Unit</label>
            <div className="form-input-wrapper">
              <Hash size={15} className="form-input-icon" />
              <input
                id="profile-lot-block"
                className="form-input form-input-icon-left"
                placeholder="Lot/Block/Unit No."
                value={form.address_lot_block}
                onChange={handleTitleCase('address_lot_block')}
              />
            </div>
          </div>

          {/* Save */}
          <button
            type="button"
            className="btn btn-primary btn-lg w-full justify-center mt-8"
            onClick={handleSave}
            disabled={loading}
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
