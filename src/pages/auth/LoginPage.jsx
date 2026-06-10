import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Container, Eye, EyeOff,
  MessageCircle, Send, X, Bot, Package,
  DollarSign, Ship, Search, Zap, AlertTriangle,
  Mail, Lock, RefreshCw,
  Sparkles,
} from 'lucide-react';

// ── Error mapper ─────────────────────────────────────────────────────────────
const INVALID_CREDENTIALS_ERROR = 'Incorrect password or email.';

const getFriendlyError = (msg) => {
  if (!msg) return 'An unexpected error occurred. Please try again.';
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials'))
    return INVALID_CREDENTIALS_ERROR;
  if (m.includes('incorrect password') || m.includes('no account'))
    return INVALID_CREDENTIALS_ERROR;
  if (m.includes('email not confirmed'))
    return 'Your email is not confirmed. Please check your inbox.';
  if (m.includes('too many') || m.includes('rate limit'))
    return 'Too many failed attempts. Please wait a few minutes.';
  if (m.includes('network') || m.includes('fetch'))
    return 'Network error. Please check your connection.';
  if (m.includes('invalid'))
    return INVALID_CREDENTIALS_ERROR;
  return msg;
};

const isEmailValid = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const getLoginErrorPlacement = (msg) => {
  const friendly = getFriendlyError(msg);
  const lower = friendly.toLowerCase();

  if (friendly === INVALID_CREDENTIALS_ERROR) {
    return {
      fieldErrors: { email: '', password: '' },
      loginError: INVALID_CREDENTIALS_ERROR,
      credentialError: true,
    };
  }

  if (lower.includes('email is not confirmed')) {
    return {
      fieldErrors: { email: friendly, password: '' },
      loginError: friendly,
      credentialError: false,
    };
  }

  return {
    fieldErrors: { email: '', password: '' },
    loginError: friendly,
    credentialError: false,
  };
};

// ── Chatbot engine ────────────────────────────────────────────────────────────
const FAQ_TRIGGERS = [
  {
    patterns: ['book', 'how to book', 'booking', 'ship', 'send', 'order'],
    answer: `To book a shipment:\n1. Create a free account (Sign Up)\n2. Go to "Place Order"\n3. Fill in sender and receiver details\n4. Select your route (Bohol to Manila or Manila to Bohol)\n5. Enter package weight\n6. Submit. Your tracking number will be generated.\n\nNeed help? Message us on Facebook.`,
  },
  {
    patterns: ['route', 'routes', 'where', 'destination', 'bohol', 'manila'],
    answer: `We serve two routes:\n\n🚢 Bohol to Manila\n🚢 Manila to Bohol\n\nContact us on Facebook for trip schedules.`,
  },
  {
    patterns: ['price', 'fee', 'cost', 'rate', 'how much', 'charge', 'shipping fee'],
    answer: `Shipping fees are per kilogram:\n\n💰 Final price = weight × rate per kg\n✅ You'll see the exact cost before confirming your order.\n\nFor current rates, message us on Facebook.`,
  },
  {
    patterns: ['track', 'tracking', 'where is', 'status', 'locate', 'check order'],
    answer: `To track your package:\n\n📦 Visit our Track page — no login needed.\n🔢 Enter your tracking number (CE-XXXXXXXX-XXXX).\n📡 See real-time status updates.\n\nOr log in and open Orders to view all shipments.`,
  },
  {
    patterns: ['schedule', 'when', 'depart', 'trip', 'departure', 'date'],
    answer: `Trip schedules vary. For the latest dates, message us on Facebook.\n\nWe'll confirm pickup and estimated delivery once your order is booked.`,
  },
  {
    patterns: ['contact', 'reach', 'call', 'message', 'facebook', 'fb'],
    answer: `Contact us:\n\n📘 Facebook: facebook.com/marlon.sarong.cargodeliveryservice\n\nWe respond Mon–Sat during business hours.`,
  },
  {
    patterns: ['register', 'sign up', 'create account', 'signup'],
    answer: `Creating an account is free!\n\n🆓 Click "Sign Up" below and fill in:\n• Full name\n• Email and password\n• Mobile number (09xxxxxxxxx)\n• Address\n\nThen you can book and track shipments.`,
  },
  {
    patterns: ['cancel', 'cancellation'],
    answer: `To cancel an order:\n\n🔄 Log in → Open Orders → Select the order → Choose Cancel.\n\nOrders can only be cancelled before pickup. For urgent cases, message us on Facebook.`,
  },
  {
    patterns: ['payment', 'pay', 'gcash', 'cash'],
    answer: `Payment options:\n\n💵 Cash on pickup or delivery\n📱 GCash — contact us for details\n⏳ Pay Later option available\n\nMessage us on Facebook for instructions.`,
  },
];

const QUICK_QUESTIONS = [
  { label: '📦 How to book?', query: 'how to book', shortLabel: 'How to book?' },
  { label: '🚢 Routes?', query: 'what routes are available', shortLabel: 'Routes?' },
  { label: '💰 Shipping fee?', query: 'how much is the shipping fee', shortLabel: 'Shipping fee?' },
  { label: '🔍 Track package?', query: 'how to track my order', shortLabel: 'Track package?' },
];

const getBotReply = (input) => {
  const lower = input.toLowerCase().trim();
  for (const faq of FAQ_TRIGGERS) {
    if (faq.patterns.some(p => lower.includes(p))) return faq.answer;
  }
  return `I'm not sure about that yet. 🤔\n\nContact us directly:\n📘 Facebook: facebook.com/marlon.sarong.cargodeliveryservice\n\nOur team will be happy to help!`;
};

const formatTime = (ts) => {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ════════════════════════════════════════════════════════════════════════════
// LoginPage
// ════════════════════════════════════════════════════════════════════════════
const LoginPage = () => {
  // ── Login state ──────────────────────────────────────────────────────────
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError]     = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [fieldErrors, setFieldErrors]   = useState({ email: '', password: '' });
  const [credentialErrorActive, setCredentialErrorActive] = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  // ── Chat state ───────────────────────────────────────────────────────────
  const [chatOpen,    setChatOpen]    = useState(false);
  const [chatName,    setChatName]    = useState('');
  const [chatStarted, setChatStarted] = useState(false);
  const [chatInput,   setChatInput]   = useState('');
  const [messages,    setMessages]    = useState([]);
  const [isTyping,    setIsTyping]    = useState(false);
  const [chatClosing, setChatClosing] = useState(false);
  const messagesEndRef                = useRef(null);
  const liveRegionRef                 = useRef(null);
  const loginErrorTimerRef            = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => () => {
    if (loginErrorTimerRef.current) clearTimeout(loginErrorTimerRef.current);
  }, []);

  // ── Login handler ────────────────────────────────────────────────────────
  const clearLoginErrorTimer = () => {
    if (loginErrorTimerRef.current) {
      clearTimeout(loginErrorTimerRef.current);
      loginErrorTimerRef.current = null;
    }
  };

  const showLoginAlert = (message, isCredentialError = false) => {
    clearLoginErrorTimer();
    setLoginError(message);
    setCredentialErrorActive(isCredentialError);

    if (message) {
      loginErrorTimerRef.current = setTimeout(() => {
        setLoginError('');
        setCredentialErrorActive(false);
        loginErrorTimerRef.current = null;
      }, 5000);
    }
  };

  const clearLoginFieldError = (field) => {
    clearLoginErrorTimer();
    setLoginError('');
    setCredentialErrorActive(false);
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: '' };
    });
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    clearLoginFieldError('email');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    clearLoginFieldError('password');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    clearLoginErrorTimer();
    setLoginError('');
    setCredentialErrorActive(false);
    setFieldErrors({ email: '', password: '' });

    const nextFieldErrors = { email: '', password: '' };
    if (!email.trim()) {
      nextFieldErrors.email = 'Email address is required.';
    } else if (!isEmailValid(email)) {
      nextFieldErrors.email = 'Please enter a valid email address.';
    }

    if (!password.trim()) {
      nextFieldErrors.password = 'Password is required.';
    }

    if (nextFieldErrors.email || nextFieldErrors.password) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setLoginLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        navigate('/');
      } else {
        const nextError = getLoginErrorPlacement(result.error);
        setFieldErrors(nextError.fieldErrors);
        showLoginAlert(nextError.loginError, nextError.credentialError);
      }
    } catch (err) {
      const nextError = getLoginErrorPlacement(err?.message);
      setFieldErrors(nextError.fieldErrors);
      showLoginAlert(nextError.loginError, nextError.credentialError);
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Chat handlers ────────────────────────────────────────────────────────
  const startChat = () => {
    const name = chatName.trim() || 'Guest';
    setChatName(name);
    const greeting = `Hi ${name}! 👋 I'm the CargoExpress PH assistant.\n\nHow can I help you today?`;
    setMessages([{ from: 'bot', text: greeting, ts: Date.now() }]);
    setChatStarted(true);
  };

  const sendMessage = useCallback((text) => {
    const userText = (text || chatInput).trim();
    if (!userText) return;
    setChatInput('');
    const now = Date.now();
    const userMsg = { from: 'user', text: userText, ts: now };
    setMessages(prev => [...prev, userMsg]);

    // Announce to screen reader
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = `You said: ${userText}`;
    }

    // Typing indicator
    setIsTyping(true);
    setTimeout(() => {
      const botReply = getBotReply(userText);
      const botMsg   = { from: 'bot', text: botReply, ts: Date.now() };
      setIsTyping(false);
      setMessages(prev => [...prev, botMsg]);
      // Announce bot reply
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `CargoExpress assistant: ${botReply}`;
      }
    }, 700 + Math.random() * 400);
  }, [chatInput]);

  const resetChat = () => {
    setChatStarted(false);
    setMessages([]);
    setChatName('');
    setIsTyping(false);
  };

  const closeChat = () => {
    setChatClosing(true);
    setTimeout(() => {
      setChatOpen(false);
      setChatClosing(false);
    }, 200);
  };

  const toggleChat = () => {
    if (chatOpen) {
      closeChat();
    } else {
      setChatOpen(true);
    }
  };

  const emailHasError = !!fieldErrors.email || credentialErrorActive;
  const passwordHasError = !!fieldErrors.password || credentialErrorActive;

  return (
    <div className="login-split-page">

      {/* ════════════════════════════════════════════════════════════
          ARIA Live Region (screen readers)
      ════════════════════════════════════════════════════════════ */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      {/* ════════════════════════════════════════════════════════════
          LEFT PANEL — Branding
      ════════════════════════════════════════════════════════════ */}
      <div className="login-left-panel" aria-hidden="true">
        <div className="login-left-content">
          {/* Logo */}
          <div className="login-brand">
            <div className="login-brand-icon">
              <Container size={28} color="white" />
            </div>
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
              <Ship size={14} /> Bohol → Manila
            </div>
            <div className="login-route-pill">
              <Ship size={14} /> Manila → Bohol
            </div>
          </div>

          {/* Features */}
          <div className="login-features">
            {[
              { icon: Package,    text: 'Door-to-door delivery' },
              { icon: Search,     text: 'Real-time tracking' },
              { icon: DollarSign, text: 'Affordable per-kilo rates' },
              { icon: Zap,        text: 'Fast and reliable service' },
            ].map((f, i) => (
              <div key={i} className="login-feature-item">
                <div className="login-feature-icon-wrap"><f.icon size={14} /></div>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom attribution */}
        <div className="login-left-footer">
          <div>© {new Date().getFullYear()} CargoExpress PH. All rights reserved.</div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          RIGHT PANEL — Login Form
      ════════════════════════════════════════════════════════════ */}
      <div className="login-right-panel">
        <div className="login-right-bg-orb login-right-bg-orb-1" aria-hidden="true" />
        <div className="login-right-bg-orb login-right-bg-orb-2" aria-hidden="true" />

        <div className="login-form-container">

          {/* Brand (mobile only) */}
          <div className="login-mobile-brand">
            <div className="login-mobile-brand-icon">
              <Container size={20} color="white" />
            </div>
            <span>
              <span className="text-accent">CARGO</span>
              <span className="text-primary">EXPRESS PH</span>
            </span>
          </div>

          <div className="login-form-header">
            <h2 className="login-form-title">Welcome back</h2>
            <p className="login-form-sub">Sign in to manage your shipments &amp; track orders.</p>
          </div>

          {loginError && (
            <div className="login-error-box" role="alert">
              <AlertTriangle size={15} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} noValidate>
            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <div className="form-input-wrapper">
                <Mail size={16} className="form-input-icon" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  className={`form-input form-input-icon-left ${emailHasError ? 'error' : ''}`}
                  placeholder="your@email.com"
                  value={email}
                  onChange={handleEmailChange}
                  required
                  autoComplete="email"
                  aria-required="true"
                  aria-invalid={emailHasError}
                  aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                />
              </div>
              {fieldErrors.email && (
                <p className="form-error" id="login-email-error">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="form-group">
              <div className="login-pw-header">
                <label className="form-label" htmlFor="login-password">Password</label>
                <Link to="/forgot-password" className="login-forgot-link" tabIndex={0}>
                  Forgot password?
                </Link>
              </div>
              <div className="form-input-wrapper">
                <Lock size={16} className="form-input-icon" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input form-input-icon-left form-input-icon-right ${passwordHasError ? 'error' : ''}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  autoComplete="current-password"
                  aria-required="true"
                  aria-invalid={passwordHasError}
                  aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="form-pw-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="form-error" id="login-password-error">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loginLoading}
              aria-busy={loginLoading}
            >
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="login-divider">
            <span>Don't have an account?</span>
          </div>

          {/* Sign up */}
          <Link to="/register" className="login-signup-btn">
            Create account
          </Link>



          {/* Footer links */}
          <div className="login-footer-links">
            <Link to="/about" className="login-footer-btn">About Us</Link>
            <span className="login-footer-sep" aria-hidden="true">·</span>
            <Link to="/track" className="login-footer-btn">Track Package</Link>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          FLOATING CHATBOT
      ════════════════════════════════════════════════════════════ */}
      <div className="chat-fab-container">

        {/* Chat Window */}
        {(chatOpen || chatClosing) && (
          <div
            className={`chat-window ${chatClosing ? 'chat-window-closing' : 'animate-chat-open'}`}
            role="dialog"
            aria-modal="true"
            aria-label="CargoExpress PH chat assistant"
          >
            {!chatStarted ? (
              /* ── Name Entry Screen ── */
              <div className="chat-intro">
                <div className="chat-window-header">
                  <div className="chat-header-left">
                    <div className="chat-header-avatar">
                      <Bot size={16} />
                    </div>
                    <div>
                      <div className="chat-header-name">CargoExpress PH</div>
                      <div className="chat-header-status">
                        <span className="chat-status-dot" aria-label="Online" />
                        <span>Online · Replies instantly</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={closeChat}
                    className="chat-close-btn"
                    aria-label="Close chat"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="chat-intro-body">
                  <div className="chat-intro-hero">
                    <div className="chat-intro-bot-ring">
                      <div className="chat-intro-bot-icon">
                        <Sparkles size={28} />
                      </div>
                    </div>
                    <h3 className="chat-intro-title">Chat with Us</h3>
                    <p className="chat-intro-subtitle">
                      Get instant answers — no login needed!
                    </p>
                  </div>

                  <div className="chat-intro-form">
                    <label htmlFor="chat-name-input" className="chat-intro-label">
                      Your name <span className="chat-intro-optional">(optional)</span>
                    </label>
                    <input
                      id="chat-name-input"
                      className="chat-name-input"
                      placeholder="e.g. Maria"
                      value={chatName}
                      onChange={e => setChatName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && startChat()}
                      autoComplete="given-name"
                    />
                    <button
                      className="chat-start-btn"
                      onClick={startChat}
                    >
                      <MessageCircle size={15} />
                      Start Chatting
                    </button>
                  </div>

                  <div className="chat-intro-quick">
                    <p className="chat-intro-quick-label">Or ask directly:</p>
                    <div className="chat-intro-quick-grid">
                      {QUICK_QUESTIONS.map(q => (
                        <button
                          key={q.query}
                          className="chat-intro-quick-btn"
                          onClick={() => {
                            const name = chatName.trim() || 'Guest';
                            setChatName(name);
                            const greeting = `Hi ${name}! 👋 How can I help you?`;
                            setMessages([
                              { from: 'bot',  text: greeting,        ts: Date.now() },
                              { from: 'user', text: q.shortLabel,    ts: Date.now() + 1 },
                              { from: 'bot',  text: getBotReply(q.query), ts: Date.now() + 2 },
                            ]);
                            setChatStarted(true);
                          }}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="chat-window-powered">
                  <Bot size={11} />
                  <span>Powered by CargoExpress AI</span>
                </div>
              </div>
            ) : (
              /* ── Active Chat ── */
              <div className="chat-active flex flex-col h-full">
                {/* Header */}
                <div className="chat-window-header">
                  <div className="chat-header-left">
                    <div className="chat-header-avatar">
                      <Bot size={16} />
                    </div>
                    <div>
                      <div className="chat-header-name">CargoExpress PH</div>
                      <div className="chat-header-status">
                        <span className="chat-status-dot" aria-label="Online" />
                        <span>Online · Replies instantly</span>
                      </div>
                    </div>
                  </div>
                  <div className="chat-header-actions">
                    <button
                      onClick={resetChat}
                      className="chat-action-btn"
                      title="New chat"
                      aria-label="Start a new chat"
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      onClick={closeChat}
                      className="chat-close-btn"
                      aria-label="Close chat"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="chat-window-messages" role="log" aria-label="Chat messages">
                  {messages.map((msg, i) => (
                    <div key={i} className={`chat-bubble-wrap ${msg.from}`}>
                      {msg.from === 'bot' && (
                        <div className="chat-avatar bot-avatar" aria-hidden="true">
                          <Bot size={11} />
                        </div>
                      )}
                      <div className="chat-msg-col">
                        <div className={`chat-bubble ${msg.from === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                          {msg.text.split('\n').map((line, j) => (
                            <span key={j}>{line}{j < msg.text.split('\n').length - 1 && <br />}</span>
                          ))}
                        </div>
                        <div className={`chat-ts ${msg.from}`}>
                          {formatTime(msg.ts)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="chat-bubble-wrap bot" role="status" aria-label="Assistant is typing">
                      <div className="chat-avatar bot-avatar" aria-hidden="true">
                        <Bot size={11} />
                      </div>
                      <div className="chat-typing-indicator">
                        <span /><span /><span />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick replies */}
                <div className="chatbox-quick" role="group" aria-label="Quick reply suggestions">
                  {QUICK_QUESTIONS.map(q => (
                    <button
                      key={q.query}
                      className="quick-reply-btn"
                      onClick={() => sendMessage(q.query)}
                    >
                      {q.shortLabel}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="chatbox-input">
                  <input
                    className="chat-input"
                    placeholder="Type a message…"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    aria-label="Type your message"
                    maxLength={300}
                  />
                  <button
                    className="chat-send-btn"
                    onClick={() => sendMessage()}
                    disabled={!chatInput.trim() || isTyping}
                    aria-label="Send message"
                  >
                    <Send size={14} />
                  </button>
                </div>

                <div className="chat-window-powered">
                  <Bot size={11} />
                  <span>Powered by CargoExpress AI</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FAB Button */}
        <div className="chat-fab-wrap">
          {!chatOpen && (
            <div className="chat-fab-tooltip" role="tooltip" id="chat-fab-tooltip">
              Chat with us · Replies instantly
            </div>
          )}
          <button
            className={`chat-fab-btn ${chatOpen ? 'chat-fab-open' : ''}`}
            onClick={toggleChat}
            aria-label={chatOpen ? 'Close chat' : 'Chat with us'}
            aria-expanded={chatOpen}
            aria-controls="chat-fab-tooltip"
          >
            <span className="chat-fab-icon">
              {chatOpen ? <X size={22} /> : <MessageCircle size={22} />}
            </span>
            {!chatOpen && <span className="chat-fab-pulse" aria-hidden="true" />}
            {!chatOpen && <span className="chat-fab-badge" aria-label="Help available">?</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
