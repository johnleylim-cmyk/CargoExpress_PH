import { useState, useEffect } from 'react';
import { getSettings, updateSettings, withTimeout } from '../../lib/database';
import { SkeletonText } from '../../components/ui/SkeletonLoader';
import { Settings, Loader, Save, User, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';
import AdminPersonalInfoPage from './PersonalInfoPage';
import { useToast } from '../../hooks/useToast';
import usePageTitle from '../../hooks/usePageTitle';

const SettingsPage = () => {
  usePageTitle('Settings');
  const [activeTab,    setActiveTab]    = useState('profile');
  const [pricePerKilo, setPricePerKilo] = useState('70');
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [saving,       setSaving]       = useState(false);
  const toast = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const s = await withTimeout(getSettings());
      if (s?.price_per_kilo) setPricePerKilo(s.price_per_kilo);
    } catch (e) {
      setError(e.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await withTimeout(updateSettings('price_per_kilo', pricePerKilo));
      toast.success('Pricing saved successfully!');
    } catch (e) {
      toast.error(e.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const tabItems = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'pricing', label: 'Pricing', icon: DollarSign },
  ];

  return (
    <div className="page-transition">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Settings</h1>
          <p className="admin-page-subtitle">Manage business profile details and shipment pricing.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-24" role="tablist" aria-label="Settings sections">
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
          >
            <tab.icon size={18} aria-hidden="true" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <AdminPersonalInfoPage />}

      {activeTab === 'pricing' && (
        <>
          {loading ? (
            <div className="card animate-fade-in">
              <div className="card-body"><SkeletonText lines={3} /></div>
            </div>
          ) : error ? (
            <div className="card text-center p-32 text-error">
              <h3>Error</h3>
              <p>{error}</p>
              <button type="button" className="btn btn-primary mt-md" onClick={load}>Retry</button>
            </div>
          ) : (
            <div className="card animate-fade-in">
              <div className="card-header">
                <h3 className="flex items-center gap-8">
                  <Settings size={16} aria-hidden="true" /> Pricing
                </h3>
              </div>
              <div className="card-body">

                <div className="form-group">
                  <label className="form-label" htmlFor="settings-price-per-kilo">Price per Kilogram (₱)</label>
                  <div className="form-input-wrapper" style={{ maxWidth: 220 }}>
                    <DollarSign size={15} className="form-input-icon" />
                    <input
                      id="settings-price-per-kilo"
                      type="number"
                      className="form-input form-input-icon-left"
                      value={pricePerKilo}
                      onChange={e => setPricePerKilo(e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="70.00"
                    />
                  </div>
                  <p className="form-helper mt-6">
                    Used to calculate shipping costs for all orders.
                  </p>
                </div>

                <div className="admin-form-actions">
                  <button
                    type="button"
                    className="btn btn-primary admin-form-submit"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving
                      ? <><Loader size={16} className="animate-spin" aria-hidden="true" /> Saving...</>
                      : <><Save size={16} aria-hidden="true" /> Save Settings</>
                    }
                  </button>
                </div>

              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SettingsPage;
