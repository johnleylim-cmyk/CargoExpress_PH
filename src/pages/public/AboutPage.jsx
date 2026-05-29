import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createContactInquiry, getAdminProfile } from '../../lib/database';
import {
  Container, ArrowLeft, Phone, MapPin, Globe, Loader, CheckCircle, AlertCircle, Send, User,
  Package, Truck, Shield, Clock
} from 'lucide-react';

const FEATURES = [
  { icon: Package, title: 'Door-to-Door', desc: 'Complete pickup and delivery service' },
  { icon: Truck, title: 'Two Routes', desc: 'Bohol ↔ Manila cargo shipping' },
  { icon: Shield, title: 'Safe & Secure', desc: 'Your cargo is in good hands' },
  { icon: Clock, title: 'Real-Time Tracking', desc: 'Track your package anytime' },
];

const AboutPage = () => {
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [adminProfile, setAdminProfile] = useState(null);
  const [fetchingAdmin, setFetchingAdmin] = useState(true);

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        setFetchingAdmin(true);
        const profile = await getAdminProfile();
        if (profile) setAdminProfile(profile);
      } catch (err) {
        // Failed to fetch admin profile — use defaults
      } finally {
        setFetchingAdmin(false);
      }
    };
    fetchAdmin();
  }, []);

  const handlePhone = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
    setForm(p => ({ ...p, phone: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setStatusMsg('');
    if (!form.name.trim()) { setStatus('error'); setStatusMsg('Name is required.'); return; }
    if (!form.phone || !form.phone.startsWith('09') || form.phone.length !== 11) {
      setStatus('error'); setStatusMsg('Phone must be exactly 11 digits and start with 09.'); return;
    }
    if (!form.message.trim()) { setStatus('error'); setStatusMsg('Message is required.'); return; }

    setLoading(true);
    try {
      await createContactInquiry({
        name: form.name.trim(),
        phone: form.phone,
        message: form.message.trim(),
      });
      setStatus('success');
      setStatusMsg('Your message has been sent successfully. We will contact you soon.');
      setForm({ name: '', phone: '', message: '' });
    } catch (err) {
      setStatus('error');
      setStatusMsg(err.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #0B1929, var(--accent), #2D5A8A)',
        padding: '20px 24px', color: 'white',
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Container size={28} color="var(--primary-light)" />
            <h1 style={{ fontSize: '1.125rem', fontWeight: 900, margin: 0 }}>
              <span>CARGO</span><span style={{ color: 'var(--primary-light)' }}>EXPRESS PH</span>
            </h1>
          </div>
          <Link to="/login" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', fontWeight: 600, opacity: 0.9 }}>
            <ArrowLeft size={16} /> Back to Login
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="hero animate-fade-in" style={{
        borderRadius: 0, padding: '56px 24px', textAlign: 'center',
        background: 'linear-gradient(135deg, #0F172A, var(--accent), var(--primary))',
      }}>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 900, marginBottom: 12, position: 'relative', letterSpacing: '-0.02em' }}>
          About CargoExpress PH
        </h1>
        <p style={{ fontSize: '1.0625rem', opacity: 0.85, maxWidth: 600, margin: '0 auto', lineHeight: 1.65, position: 'relative' }}>
          Fast & Reliable Cargo Delivery connecting Bohol and Manila<br />
          with safe, affordable sea cargo shipping.
        </p>
      </div>

      {/* Feature Cards */}
      <div style={{
        maxWidth: 960, margin: '-32px auto 0', padding: '0 20px', width: '100%',
        position: 'relative', zIndex: 2,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="card card-body stagger-item" style={{ animationDelay: `${i * 80}ms`, textAlign: 'center', padding: 20 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--radius-md)',
                background: 'var(--primary-bg)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary)', margin: '0 auto 10px',
              }}>
                <f.icon size={22} />
              </div>
              <h4 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 4 }}>{f.title}</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28 }}>
        {/* Left Side: About & Contact Info */}
        <div>
          <div className="card animate-slide-up" style={{ marginBottom: 20 }}>
            <div className="card-body">
              <h3 style={{ fontWeight: 800, marginBottom: 12, color: 'var(--text)' }}>About Us</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem', marginBottom: 16 }}>
                CargoExpress PH is a real and reliable cargo delivery service connecting <strong>Bohol</strong> and <strong>Manila</strong>.
                We provide safe, affordable, and secure sea cargo shipping for individuals and businesses who need to transport goods between these key locations.
              </p>
              <div className="about-mission">
                <p>"To provide the most reliable and affordable cargo shipping between Bohol and Manila, ensuring every package arrives safely and on time."</p>
              </div>
            </div>
          </div>

          <div className="card animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="card-body">
              <h3 style={{ fontWeight: 800, marginBottom: 16, color: 'var(--text)' }}>Business Information</h3>

              {fetchingAdmin ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-tertiary)', padding: '20px 0' }}>
                  <Loader size={16} className="animate-spin" /> Loading details...
                </div>
              ) : !adminProfile ? (
                <div className="alert-banner alert-banner-warning">
                  <AlertCircle size={16} /> Business information is currently unavailable.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {adminProfile.name && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={18} color="var(--primary)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Business Owner</div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)' }}>{adminProfile.name}</div>
                      </div>
                    </div>
                  )}

                  {(adminProfile.facebook_link || adminProfile.name) && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Globe size={18} color="var(--info)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Facebook Page</div>
                        {adminProfile.facebook_link ? (
                          <a href={adminProfile.facebook_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)', fontSize: '0.875rem', fontWeight: 500 }}>
                            Visit our Facebook page ↗
                          </a>
                        ) : (
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>See Facebook for updated link.</div>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Phone size={18} color="var(--success)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Contact Numbers</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {adminProfile.smart_phone && <div><strong>Smart:</strong> {adminProfile.smart_phone}</div>}
                        {adminProfile.globe_phone && <div><strong>Globe:</strong> {adminProfile.globe_phone}</div>}
                        {!adminProfile.smart_phone && !adminProfile.globe_phone && 'See Facebook for numbers.'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MapPin size={18} color="var(--error)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Service Locations</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {adminProfile.manila_address && (
                          <div><strong style={{ color: 'var(--text)' }}>Manila Hub:</strong><br /><span style={{ textTransform: 'capitalize' }}>{adminProfile.manila_address}</span></div>
                        )}
                        {adminProfile.bohol_address && (
                          <div><strong style={{ color: 'var(--text)' }}>Bohol Hub:</strong><br /><span style={{ textTransform: 'capitalize' }}>{adminProfile.bohol_address}</span></div>
                        )}
                        {!adminProfile.manila_address && !adminProfile.bohol_address && 'Metro Manila and Bohol'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Contact Form */}
        <div>
          <div className="card animate-slide-up" style={{ position: 'sticky', top: 24, animationDelay: '200ms' }}>
            <div className="card-body">
              <h3 style={{ fontWeight: 800, marginBottom: 6, color: 'var(--text)' }}>Contact Us</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 24 }}>
                Have a question or want to request a pickup? Send us a message.
              </p>

              {status === 'success' && (
                <div className="alert-banner alert-banner-success animate-scale-in">
                  <CheckCircle size={18} /> {statusMsg}
                </div>
              )}
              {status === 'error' && (
                <div className="alert-banner alert-banner-error animate-scale-in">
                  <AlertCircle size={18} /> {statusMsg}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Name <span className="required">*</span></label>
                  <input
                    className="form-input"
                    placeholder="Your full name"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number <span className="required">*</span></label>
                  <input
                    className="form-input"
                    placeholder="09xxxxxxxxx"
                    inputMode="numeric"
                    maxLength={11}
                    value={form.phone}
                    onChange={handlePhone}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Message <span className="required">*</span></label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="How can we help you?"
                    value={form.message}
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
                  {loading ? <Loader size={18} className="animate-spin" /> : <><Send size={16} /> Send Message</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)', fontSize: '0.875rem', borderTop: '1px solid var(--border-light)' }}>
        © {new Date().getFullYear()} CargoExpress PH. All rights reserved.
      </footer>
    </div>
  );
};

export default AboutPage;
