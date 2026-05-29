import { useState, useEffect } from 'react';
import { getSettings, updateSettings, withTimeout } from '../../lib/database';
import { SkeletonText } from '../../components/ui/SkeletonLoader';
import { Settings, Loader, Save, User, DollarSign, CheckCircle } from 'lucide-react';
import AdminPersonalInfoPage from './PersonalInfoPage';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [pricePerKilo, setPricePerKilo] = useState('70');
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false); 
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await withTimeout(getSettings());
      if(s?.price_per_kilo) setPricePerKilo(s.price_per_kilo);
    } catch(e) {
      setError(e.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try { 
      await withTimeout(updateSettings('price_per_kilo', pricePerKilo)); 
      setSaved(true); 
      setTimeout(()=>setSaved(false), 2000); 
    } catch(e) {
      setSaveError(e.message || 'Failed to save settings.');
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
      <h1 style={{fontWeight:800,fontSize:'1.5rem',marginBottom:24}}>Settings</h1>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <AdminPersonalInfoPage />}

      {activeTab === 'pricing' && (
        <>
          {loading ? (
            <div className="card animate-fade-in">
              <div className="card-body">
                <SkeletonText lines={3} />
              </div>
            </div>
          ) : error ? (
            <div className="card text-center" style={{ padding: 40, color: '#EF4444' }}>
              <h3>Error</h3>
              <p>{error}</p>
              <button className="btn btn-primary mt-md" onClick={load}>Retry</button>
            </div>
          ) : (
            <div className="card animate-fade-in">
              <div className="card-header">
                <h3><Settings size={16} style={{display:'inline',marginRight:8}}/>Pricing</h3>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Price per Kilogram (₱)</label>
                  <input type="number" className="form-input" value={pricePerKilo} onChange={e=>setPricePerKilo(e.target.value)} style={{maxWidth:200}}/>
                  <p className="text-xs text-secondary" style={{marginTop:4}}>Used to calculate shipping costs for all orders.</p>
                </div>

                {saved && (
                  <div className="alert-banner alert-banner-success" style={{ marginBottom: 16 }}>
                    <CheckCircle size={16} /> Settings saved successfully!
                  </div>
                )}

                {saveError && (
                  <div className="alert-banner alert-banner-error" style={{ marginBottom: 16 }}>
                    <span>⚠</span> {saveError}
                  </div>
                )}

                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader size={16} className="animate-spin"/> : <><Save size={16}/> Save Settings</>}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
export default SettingsPage;
