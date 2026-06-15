import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createContactInquiry, getAdminProfile } from '../../lib/database';
import {
  Container, ArrowLeft, Phone, MapPin, Globe, Loader, AlertCircle, Send, User,
  Package, Truck, Shield, Clock, ExternalLink
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import usePageTitle from '../../hooks/usePageTitle';

const FEATURES = [
  { icon: Package, title: 'Door-to-Door', desc: 'Complete pickup and delivery service' },
  { icon: Truck, title: 'Two Routes', desc: 'Bohol-Manila cargo shipping' },
  { icon: Shield, title: 'Safe & Secure', desc: 'Your cargo is in good hands' },
  { icon: Clock, title: 'Real-Time Tracking', desc: 'Track your package anytime' },
];

const AboutPage = () => {
  usePageTitle('About Us');
  const toast = useToast();
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);
  const [fetchingAdmin, setFetchingAdmin] = useState(true);

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        setFetchingAdmin(true);
        const profile = await getAdminProfile();
        if (profile) setAdminProfile(profile);
      } catch (err) {
        // Failed to fetch admin profile; use defaults.
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
    if (!form.name.trim()) { toast.error('Name is required.'); return; }
    if (!form.phone || !form.phone.startsWith('09') || form.phone.length !== 11) {
      toast.error('Phone must be exactly 11 digits and start with 09.'); return;
    }
    if (!form.message.trim()) { toast.error('Message is required.'); return; }

    setLoading(true);
    try {
      await createContactInquiry({ name: form.name.trim(), phone: form.phone, message: form.message.trim() });
      toast.success('Message sent! We will contact you soon.');
      setForm({ name: '', phone: '', message: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="public-about-page">
      {/* Header */}
      <header className="public-about-header">
        <div className="public-about-header-inner">
          <div className="public-about-brand">
            <Container size={28} color="var(--primary-light)" />
            <h1>
              <span>CARGO</span><span className="public-about-brand-accent">EXPRESS PH</span>
            </h1>
          </div>
          <Link to="/login" className="public-about-back">
            <ArrowLeft size={16} /> Back to Login
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="public-about-hero animate-fade-in">
        <h2>About CargoExpress PH</h2>
        <p>Fast & Reliable Cargo Delivery connecting Bohol and Manila<br />with safe, affordable sea cargo shipping.</p>
      </div>

      {/* Feature Cards */}
      <div className="public-about-feature-wrap">
        <div className="public-about-feature-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="card card-body stagger-item text-center p-20" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="rounded-md flex items-center justify-center text-primary mx-auto mb-10" style={{ width: 44, height: 44, background: 'var(--primary-bg)' }}>
                <f.icon size={22} />
              </div>
              <h4 className="fw-700 text-sm mb-4">{f.title}</h4>
              <p className="text-secondary" style={{ fontSize: '0.8125rem' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="public-about-content-grid">
        {/* Left Side: About & Contact Info */}
        <div>
          <div className="card animate-slide-up mb-20">
            <div className="card-body">
              <h3 className="fw-800 mb-12" style={{ color: 'var(--text)' }}>About Us</h3>
              <p className="text-secondary mb-16" style={{ lineHeight: 1.7, fontSize: '0.9375rem' }}>
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
              <h3 className="fw-800 mb-16" style={{ color: 'var(--text)' }}>Business Information</h3>
              {fetchingAdmin ? (
                <div className="flex items-center gap-8 text-tertiary py-20">
                  <Loader size={16} className="animate-spin" /> Loading details...
                </div>
              ) : !adminProfile ? (
                <div className="alert-banner alert-banner-warning">
                  <AlertCircle size={16} /> Business information is currently unavailable.
                </div>
              ) : (
                <div className="flex flex-col gap-20">
                  {adminProfile.name && (
                    <div className="flex gap-12 items-start">
                      <div className="w-36 h-36 rounded-sm flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-bg)' }}><User size={18} color="var(--primary)" /></div>
                      <div>
                        <div className="fw-700 text-secondary mb-2" style={{ fontSize: '0.8125rem' }}>Business Owner</div>
                        <div className="fw-600" style={{ fontSize: '0.9375rem', color: 'var(--text)' }}>{adminProfile.name}</div>
                      </div>
                    </div>
                  )}
                  {(adminProfile.facebook_link || adminProfile.name) && (
                    <div className="flex gap-12 items-start">
                      <div className="w-36 h-36 rounded-sm flex items-center justify-center flex-shrink-0" style={{ background: 'var(--info-bg)' }}><Globe size={18} color="var(--info)" /></div>
                      <div>
                        <div className="fw-700 text-secondary mb-2" style={{ fontSize: '0.8125rem' }}>Facebook Page</div>
                        {adminProfile.facebook_link ? (
                          <a href={adminProfile.facebook_link} target="_blank" rel="noopener noreferrer" className="public-about-contact-link">
                            Visit Facebook page <ExternalLink size={14} aria-hidden="true" />
                          </a>
                        ) : (
                          <div className="text-secondary text-sm">See Facebook for updated link.</div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-12 items-start">
                    <div className="w-36 h-36 rounded-sm flex items-center justify-center flex-shrink-0" style={{ background: 'var(--success-bg)' }}><Phone size={18} color="var(--success)" /></div>
                    <div>
                      <div className="fw-700 text-secondary mb-2" style={{ fontSize: '0.8125rem' }}>Contact Numbers</div>
                      <div className="text-secondary text-sm flex flex-col" style={{ gap: 3 }}>
                        {adminProfile.smart_phone && <div><strong>Smart:</strong> {adminProfile.smart_phone}</div>}
                        {adminProfile.globe_phone && <div><strong>Globe:</strong> {adminProfile.globe_phone}</div>}
                        {!adminProfile.smart_phone && !adminProfile.globe_phone && 'See Facebook for numbers.'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-12 items-start">
                    <div className="w-36 h-36 rounded-sm flex items-center justify-center flex-shrink-0" style={{ background: 'var(--error-bg)' }}><MapPin size={18} color="var(--error)" /></div>
                    <div>
                      <div className="fw-700 text-secondary mb-2" style={{ fontSize: '0.8125rem' }}>Service Locations</div>
                      <div className="text-secondary text-sm flex flex-col gap-6">
                        {adminProfile.manila_address && <div><strong style={{ color: 'var(--text)' }}>Manila Hub:</strong><br /><span className="text-capitalize">{adminProfile.manila_address}</span></div>}
                        {adminProfile.bohol_address && <div><strong style={{ color: 'var(--text)' }}>Bohol Hub:</strong><br /><span className="text-capitalize">{adminProfile.bohol_address}</span></div>}
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
          <div className="card animate-slide-up public-about-contact-card" style={{ position: 'sticky', top: 24, animationDelay: '200ms' }}>
            <div className="card-body">
              <h3 className="fw-800 mb-6" style={{ color: 'var(--text)' }}>Contact Us</h3>
              <p className="text-sm text-secondary mb-24">
                Have a question or want to request a pickup? Send us a message.
              </p>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="contact-name">Name <span className="required">*</span></label>
                  <input id="contact-name" className="form-input" placeholder="Your full name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoComplete="name" required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="contact-phone">Mobile Number <span className="required">*</span></label>
                  <input id="contact-phone" className="form-input" placeholder="09xxxxxxxxx" inputMode="numeric" maxLength={11} value={form.phone} onChange={handlePhone} autoComplete="tel" required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="contact-message">Message <span className="required">*</span></label>
                  <textarea id="contact-message" className="form-textarea" rows={4} placeholder="How can we help you?" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} required />
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
      <footer className="text-center p-24 text-tertiary text-sm" style={{ marginTop: 'auto', borderTop: '1px solid var(--border-light)' }}>
        Copyright {new Date().getFullYear()} CargoExpress PH. All rights reserved.
      </footer>
    </div>
  );
};

export default AboutPage;
