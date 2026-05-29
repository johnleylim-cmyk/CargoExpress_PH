import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Container, Eye, EyeOff, Loader, ArrowRight,
  MessageCircle, Send, X, Bot, Package,
  MapPin, DollarSign, Clock, HelpCircle, ExternalLink, ChevronRight,
} from 'lucide-react';

// ── Error mapper ───────────────────────────────────────────────────────────
const getFriendlyError = (msg) => {
  if (!msg) return 'An unexpected error occurred. Please try again.';
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials'))
    return 'Incorrect password or no account found with this email.';
  if (m.includes('email not confirmed'))
    return 'Your email is not confirmed. Please check your inbox.';
  if (m.includes('too many') || m.includes('rate limit'))
    return 'Too many failed attempts. Please wait a few minutes.';
  if (m.includes('network') || m.includes('fetch'))
    return 'Network error. Please check your connection.';
  if (m.includes('invalid'))
    return 'Incorrect password or no account found with this email.';
  return msg;
};

// ── Chatbot engine ─────────────────────────────────────────────────────────
const FAQ_TRIGGERS = [
  {
    patterns: ['book', 'how to book', 'booking', 'ship', 'send', 'order'],
    answer: `📦 To book a shipment:\n1. Create a free account (Sign Up)\n2. Go to "Place Order"\n3. Fill in sender & receiver details\n4. Select your route (Bohol→Manila or Manila→Bohol)\n5. Enter package weight\n6. Submit — your tracking number will be generated!\n\nNeed help? Message us on Facebook. 😊`,
  },
  {
    patterns: ['route', 'routes', 'where', 'destination', 'bohol', 'manila'],
    answer: `🗺️ We serve TWO routes:\n\n🚢 Bohol → Manila\n🚢 Manila → Bohol\n\nContact us on Facebook for trip schedules!`,
  },
  {
    patterns: ['price', 'fee', 'cost', 'rate', 'how much', 'charge', 'shipping fee'],
    answer: `💰 Shipping fees are per kilogram:\n\n• Final price = Weight × Rate/kg\n• You'll see the exact cost before confirming your order.\n\nFor current rates, message us on Facebook!`,
  },
  {
    patterns: ['track', 'tracking', 'where is', 'status', 'locate', 'check order'],
    answer: `🔍 To track your package:\n\n• Visit our Track page (no login needed!)\n• Enter your tracking number (CE-XXXXXXXX-XXXX)\n• See real-time status updates\n\nOr log in → Orders to view all shipments.`,
  },
  {
    patterns: ['schedule', 'when', 'depart', 'trip', 'departure', 'date'],
    answer: `📅 Trip schedules vary. For the latest dates:\n\n• Message us on Facebook for current schedule.\n\nWe'll confirm pickup and estimated delivery once your order is booked!`,
  },
  {
    patterns: ['contact', 'reach', 'call', 'message', 'facebook', 'fb'],
    answer: `📞 Contact us:\n\n• 💬 Facebook: facebook.com/marlon.sarong.cargodeliveryservice\n\nWe respond Mon–Sat during business hours. 😊`,
  },
  {
    patterns: ['register', 'sign up', 'create account', 'signup'],
    answer: `✅ Creating an account is FREE!\n\nClick "Sign Up" below and fill in:\n• Full Name\n• Email & Password\n• Mobile number (09xxxxxxxxx)\n• Address\n\nThen you can book and track shipments!`,
  },
  {
    patterns: ['cancel', 'cancellation'],
    answer: `❌ To cancel an order:\n\nLog in → Orders → Select the order → Cancel.\n\nOrders can only be cancelled before pickup. For urgent cases, message us on Facebook!`,
  },
  {
    patterns: ['payment', 'pay', 'gcash', 'cash'],
    answer: `💳 Payment options:\n\n• Cash on pickup/delivery\n• GCash (contact us for details)\n• Pay Later option available\n\nMessage us on Facebook for payment instructions!`,
  },
];

const QUICK_QUESTIONS = [
  { label: '📦 How to book?', query: 'how to book' },
  { label: '🗺️ Routes?', query: 'what routes are available' },
  { label: '💰 Shipping fee?', query: 'how much is the shipping fee' },
  { label: '🔍 Track package?', query: 'how to track my order' },
];

const getBotReply = (input) => {
  const lower = input.toLowerCase().trim();
  for (const faq of FAQ_TRIGGERS) {
    if (faq.patterns.some(p => lower.includes(p))) return faq.answer;
  }
  return `🤔 I'm not sure about that yet.\n\nContact us directly:\n• 💬 Facebook: facebook.com/marlon.sarong.cargodeliveryservice\n\nOur team will be happy to help! 😊`;
};

// ══════════════════════════════════════════════════════════════════════════
// LoginPage
// ══════════════════════════════════════════════════════════════════════════
const LoginPage = () => {
  // ── Login state ────────────────────────────────────────────────────────
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError]     = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  // ── Chat state ─────────────────────────────────────────────────────────
  const [chatOpen,    setChatOpen]    = useState(false);
  const [chatName,    setChatName]    = useState('');
  const [chatStarted, setChatStarted] = useState(false);
  const [chatInput,   setChatInput]   = useState('');
  const [messages,    setMessages]    = useState([]);
  const messagesEndRef                = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Login handler ────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!email.trim() || !password.trim()) {
      setLoginError('Please enter a valid email and password.');
      return;
    }
    setLoginLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        navigate('/');
      } else {
        setLoginError(getFriendlyError(result.error));
      }
    } catch (err) {
      setLoginError(getFriendlyError(err?.message));
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Chat handlers ────────────────────────────────────────────────────
  const startChat = () => {
    const name = chatName.trim() || 'Guest';
    setChatName(name);
    setMessages([{
      from: 'bot',
      text: `Hi ${name}! 👋 I'm the CargoExpress PH assistant.\n\nHow can I help you today?`,
      ts: Date.now(),
    }]);
    setChatStarted(true);
  };

  const sendMessage = (text) => {
    const userText = (text || chatInput).trim();
    if (!userText) return;
    setChatInput('');
    const userMsg = { from: 'user', text: userText, ts: Date.now() };
    const botMsg  = { from: 'bot',  text: getBotReply(userText), ts: Date.now() + 1 };
    setMessages(prev => [...prev, userMsg, botMsg]);
  };

  const resetChat = () => {
    setChatStarted(false);
    setMessages([]);
    setChatName('');
  };

  return (
    <div className="login-split-page">

      {/* ════════════════════════════════════════════════════════════
          LEFT PANEL — Branding
      ════════════════════════════════════════════════════════════ */}
      <div className="login-left-panel">
        <div className="login-left-content">
          {/* Logo */}
          <div className="login-brand">
            <Container size={48} color="white" />
            <h1><span>CARGO</span><span style={{ color: 'var(--primary-light)' }}>EXPRESS PH</span></h1>
          </div>

          {/* Tagline */}
          <h2 className="login-tagline">
            Fast &amp; Reliable<br />Cargo Delivery
          </h2>
          <p className="login-tagline-sub">
            Connecting Bohol and Manila with safe,<br />
            affordable sea cargo shipping.
          </p>

          {/* Route pills */}
          <div className="login-route-pills">
            <div className="login-route-pill">
              🚢 Bohol → Manila
            </div>
            <div className="login-route-pill">
              🚢 Manila → Bohol
            </div>
          </div>

          {/* Features */}
          <div className="login-features">
            {[
              { icon: '📦', text: 'Door-to-door delivery' },
              { icon: '🔍', text: 'Real-time tracking' },
              { icon: '💰', text: 'Affordable per-kilo rates' },
              { icon: '⚡', text: 'Fast & reliable service' },
            ].map((f, i) => (
              <div key={i} className="login-feature-item">
                <span>{f.icon}</span> {f.text}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom attribution */}
        <div className="login-left-footer">
          © {new Date().getFullYear()} CargoExpress PH. All rights reserved.
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          RIGHT PANEL — Login Form
      ════════════════════════════════════════════════════════════ */}
      <div className="login-right-panel">
        <div className="login-form-container">

          {/* Brand (shown on mobile only, hidden on desktop) */}
          <div className="login-mobile-brand">
            <Container size={36} color="var(--primary)" />
            <span><span style={{ color: 'var(--accent)' }}>CARGO</span><span style={{ color: 'var(--primary)' }}>EXPRESS PH</span></span>
          </div>

          <h2 className="login-form-title">Sign In</h2>
          <p className="login-form-sub">Welcome back! Enter your credentials to continue.</p>

          {loginError && (
            <div className="login-error-box">⚠️ {loginError}</div>
          )}

          <form onSubmit={handleLogin} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                type="email" className="form-input"
                placeholder="your@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'} className="form-input"
                  placeholder="Enter your password"
                  value={password} onChange={e => setPassword(e.target.value)} required
                  style={{ paddingRight: 44 }}
                  autoComplete="current-password"
                />
                <button
                  type="button" onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: 24 }}>
              <Link to="/forgot-password" style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 500 }}>
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit" className="login-submit-btn"
              disabled={loginLoading}
            >
              {loginLoading
                ? <Loader size={18} className="animate-spin" />
                : <><ArrowRight size={18} /> Sign In</>
              }
            </button>
          </form>

          {/* Sign up link */}
          <p className="login-signup-link">
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700 }}>Sign Up</Link>
          </p>

          {/* Footer links */}
          <div className="login-footer-links">
            <Link to="/about" className="login-footer-btn">
              About Us / Contact
            </Link>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <Link to="/track" className="login-footer-btn">Track Package</Link>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          FLOATING CHATBOT
      ════════════════════════════════════════════════════════════ */}
      <div className="chat-fab-container">

        {/* Chat Window */}
        {chatOpen && (
          <div className="chat-window animate-slide-up">
            {!chatStarted ? (
              /* Name Entry */
              <div>
                <div className="chat-window-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bot size={18} />
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>CargoExpress PH</span>
                  </div>
                  <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)' }}>
                    <X size={16} />
                  </button>
                </div>
                <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px', color: 'white',
                  }}>
                    <Bot size={26} />
                  </div>
                  <h4 style={{ fontWeight: 700, marginBottom: 4 }}>Chat with Us</h4>
                  <p style={{ fontSize: '0.8125rem', color: '#64748B', marginBottom: 16 }}>
                    Get quick answers — no login needed!
                  </p>
                  <input
                    className="form-input"
                    placeholder="Your name (optional)"
                    value={chatName}
                    onChange={e => setChatName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && startChat()}
                    style={{ marginBottom: 10 }}
                    autoFocus
                  />
                  <button className="btn btn-primary w-full" onClick={startChat} style={{ justifyContent: 'center' }}>
                    <MessageCircle size={16} /> Start Chatting
                  </button>
                  <div style={{ marginTop: 14 }}>
                    <p style={{ fontSize: '0.7rem', color: '#94A3B8', marginBottom: 8 }}>Quick questions:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                      {QUICK_QUESTIONS.map(q => (
                        <button
                          key={q.query}
                          onClick={() => {
                            const name = chatName.trim() || 'Guest';
                            setChatName(name);
                            setMessages([
                              { from: 'bot', text: `Hi ${name}! 👋 How can I help you?`, ts: Date.now() },
                              { from: 'user', text: q.label, ts: Date.now() + 1 },
                              { from: 'bot', text: getBotReply(q.query), ts: Date.now() + 2 },
                            ]);
                            setChatStarted(true);
                          }}
                          style={{
                            padding: '5px 10px', borderRadius: 16, border: '1px solid #E2E8F0',
                            background: '#F8FAFC', fontSize: '0.7rem', cursor: 'pointer', color: '#475569',
                          }}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Chat active */
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header */}
                <div className="chat-window-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bot size={16} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>CargoExpress PH</div>
                      <div style={{ fontSize: '0.65rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, background: '#10B981', borderRadius: '50%', display: 'inline-block' }} />
                        Online
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={resetChat} title="New chat" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem' }}>
                      New
                    </button>
                    <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)' }}>
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="chat-window-messages">
                  {messages.map((msg, i) => (
                    <div key={i} className={`chat-bubble-wrap ${msg.from}`}>
                      {msg.from === 'bot' && (
                        <div className="chat-avatar bot-avatar"><Bot size={12} /></div>
                      )}
                      <div className={`chat-bubble ${msg.from === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                        {msg.text.split('\n').map((line, j) => (
                          <span key={j}>{line}{j < msg.text.split('\n').length - 1 && <br />}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick replies */}
                <div className="chatbox-quick">
                  {QUICK_QUESTIONS.map(q => (
                    <button key={q.query} className="quick-reply-btn" onClick={() => sendMessage(q.query)}>
                      {q.label}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="chatbox-input">
                  <input
                    className="chat-input"
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  />
                  <button className="chat-send-btn" onClick={() => sendMessage()} disabled={!chatInput.trim()}>
                    <Send size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FAB Button */}
        <button
          className="chat-fab-btn"
          onClick={() => setChatOpen(!chatOpen)}
          title="Chat with us"
        >
          {chatOpen ? <X size={24} /> : <MessageCircle size={24} />}
          {!chatOpen && <span className="chat-fab-badge">?</span>}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
