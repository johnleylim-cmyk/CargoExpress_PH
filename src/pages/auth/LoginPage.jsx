import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getSettings } from '../../lib/database';
import {
  getReply, detectTrackingNumber, DEFAULT_QUICK_QUESTIONS,
  saveChat, loadChat, clearChat,
} from '../../lib/chatEngine';
import {
  Container, Eye, EyeOff,
  MessageCircle, Send, X, Bot, Package,
  DollarSign, Ship, Search, Zap, AlertTriangle,
  Mail, Lock, RefreshCw, ExternalLink, ArrowDown,
  Sparkles, MapPin, Truck, Loader, Clock, CheckCircle, XCircle,
  HelpCircle, ChevronRight,
} from 'lucide-react';
import usePageTitle from '../../hooks/usePageTitle';

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

// ── Chatbot helpers ───────────────────────────────────────────────────────────
const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const MAX_CHAT_LENGTH = 300;

// Parse text for URLs and phone numbers, return React elements
const parseLinks = (text) => {
  // Match URLs
  const urlRegex = /(https?:\/\/[^\s]+|(?:www\.)?facebook\.com\/[^\s]+)/gi;
  // Match PH phone numbers
  const phoneRegex = /\b(09\d{9})\b/g;

  const parts = [];
  let lastIndex = 0;
  const combined = new RegExp(`(${urlRegex.source})|(${phoneRegex.source})`, 'gi');
  let m;

  while ((m = combined.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push(text.slice(lastIndex, m.index));
    }
    const matched = m[0];
    if (matched.match(/facebook|http/i)) {
      const href = matched.startsWith('http') ? matched : `https://${matched}`;
      parts.push(
        { type: 'link', href, text: matched.replace(/^https?:\/\//, ''), key: m.index }
      );
    } else {
      parts.push(
        { type: 'phone', href: `tel:${matched}`, text: matched, key: m.index }
      );
    }
    lastIndex = m.index + matched.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
};

// Render a single chat message line with clickable links
const RichTextLine = ({ text }) => {
  const parts = parseLinks(text);
  return parts.map((part, i) => {
    if (typeof part === 'string') return <span key={i}>{part}</span>;
    return (
      <a
        key={part.key}
        href={part.href}
        target="_blank"
        rel="noopener noreferrer"
        className="chat-inline-link"
        onClick={e => e.stopPropagation()}
      >
        {part.text}
        <ExternalLink size={10} className="chat-link-icon" />
      </a>
    );
  });
};

// Status icon map for tracking cards
const TRACKING_ICONS = {
  Pending: Clock,
  Assigned: Package,
  'Picked Up': Package,
  'In Transit': Truck,
  'Arrived at Hub': MapPin,
  'Out for Delivery': Truck,
  Delivered: CheckCircle,
  Cancelled: XCircle,
};

const TRACKING_COLORS = {
  Pending: 'var(--warning)',
  Assigned: 'var(--info)',
  'Picked Up': 'var(--success)',
  'In Transit': 'var(--info)',
  'Arrived at Hub': 'var(--success)',
  'Out for Delivery': 'var(--primary)',
  Delivered: 'var(--success)',
  Cancelled: 'var(--error)',
};

// ════════════════════════════════════════════════════════════════════════════
// LoginPage
// ════════════════════════════════════════════════════════════════════════════
const LoginPage = () => {
  usePageTitle('Login');
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
  const [lastTopic,   setLastTopic]   = useState(null);
  const [suggestions, setSuggestions] = useState(DEFAULT_QUICK_QUESTIONS);
  const [pricePerKilo, setPricePerKilo] = useState(null);
  const [showScrollPill, setShowScrollPill] = useState(false);
  const messagesEndRef   = useRef(null);
  const messagesBoxRef   = useRef(null);
  const liveRegionRef    = useRef(null);
  const loginErrorTimerRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Scroll detection for "new messages" pill
  useEffect(() => {
    const box = messagesBoxRef.current;
    if (!box) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = box;
      setShowScrollPill(scrollHeight - scrollTop - clientHeight > 100);
    };
    box.addEventListener('scroll', handleScroll, { passive: true });
    return () => box.removeEventListener('scroll', handleScroll);
  }, [chatStarted]);

  // Restore chat from sessionStorage on mount
  useEffect(() => {
    const saved = loadChat();
    if (saved && saved.messages?.length > 0) {
      setChatName(saved.name || '');
      setMessages(saved.messages);
      setChatStarted(true);
      setLastTopic(saved.lastTopic || null);
      setSuggestions(saved.suggestions || DEFAULT_QUICK_QUESTIONS);
    }
  }, []);

  // Save chat to sessionStorage whenever it changes
  useEffect(() => {
    if (chatStarted && messages.length > 0) {
      saveChat({
        name: chatName,
        messages,
        lastTopic,
        suggestions,
      });
    }
  }, [messages, chatStarted, chatName, lastTopic, suggestions]);

  // Fetch price_per_kilo from settings once
  useEffect(() => {
    let cancelled = false;
    getSettings().then(s => {
      if (!cancelled && s?.price_per_kilo) {
        setPricePerKilo(Number(s.price_per_kilo));
      }
    }).catch(() => { /* non-critical */ });
    return () => { cancelled = true; };
  }, []);

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

  // Live tracking lookup via public RPC
  const trackOrder = async (trackingNumber) => {
    try {
      const { data, error: fetchError } = await supabase
        .rpc('track_order_public', { p_tracking_number: trackingNumber })
        .maybeSingle();
      if (fetchError || !data) {
        return { success: false, message: `No shipment found for ${trackingNumber}. Please double-check and try again.` };
      }
      return { success: true, data };
    } catch {
      return { success: false, message: 'Something went wrong looking up that order. Please try again.' };
    }
  };

  const addBotMessage = useCallback((text, type = 'text', data = null, followUps = null) => {
    const botMsg = { from: 'bot', text, ts: Date.now(), type, data };
    setIsTyping(false);
    setMessages(prev => [...prev, botMsg]);
    if (followUps) setSuggestions(followUps);
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = `CargoExpress assistant: ${typeof text === 'string' ? text : 'sent a response'}`;
    }
  }, []);

  const startChat = () => {
    const name = chatName.trim() || 'Guest';
    setChatName(name);
    const greeting = `Hi ${name}! 👋 I'm the CargoExpress PH assistant.\n\nI can help with booking, tracking, pricing, routes, and more. What can I do for you?`;
    const msgs = [{ from: 'bot', text: greeting, ts: Date.now(), type: 'text' }];
    setMessages(msgs);
    setChatStarted(true);
    setSuggestions(DEFAULT_QUICK_QUESTIONS);
  };

  const sendMessage = useCallback(async (text) => {
    const userText = (text || chatInput).trim();
    if (!userText || isTyping) return;
    setChatInput('');
    const userMsg = { from: 'user', text: userText, ts: Date.now(), type: 'text' };
    setMessages(prev => [...prev, userMsg]);

    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = `You said: ${userText}`;
    }

    setIsTyping(true);

    // Get reply from engine
    const context = { lastTopic, userName: chatName, pricePerKilo };
    const reply = getReply(userText, context);

    // Handle tracking lookup
    if (reply.type === 'tracking_lookup') {
      const trackingNum = reply.text;
      // Show "looking up" message first
      setTimeout(async () => {
        addBotMessage(`🔍 Looking up ${trackingNum}...`, 'text');
        setIsTyping(true);

        const result = await trackOrder(trackingNum);
        setTimeout(() => {
          if (result.success) {
            addBotMessage(trackingNum, 'tracking_card', result.data, reply.followUps);
          } else {
            addBotMessage(result.message, 'text', null, reply.followUps);
          }
          setLastTopic('tracking');
        }, 400);
      }, 600);
      return;
    }

    // Normal reply with typing delay
    const delay = 600 + Math.random() * 400;
    setTimeout(() => {
      addBotMessage(reply.text, reply.type, null, reply.followUps);
      if (reply.topicId) setLastTopic(reply.topicId);
    }, delay);
  }, [chatInput, isTyping, lastTopic, chatName, pricePerKilo, addBotMessage]);

  const resetChat = () => {
    setChatStarted(false);
    setMessages([]);
    setChatName('');
    setIsTyping(false);
    setLastTopic(null);
    setSuggestions(DEFAULT_QUICK_QUESTIONS);
    clearChat();
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
                      {DEFAULT_QUICK_QUESTIONS.map(q => (
                        <button
                          key={q.query}
                          className="chat-intro-quick-btn"
                          onClick={() => {
                            const name = chatName.trim() || 'Guest';
                            setChatName(name);
                            const context = { userName: name, pricePerKilo };
                            const reply = getReply(q.query, context);
                            const greeting = `Hi ${name}! 👋 How can I help you?`;
                            setMessages([
                              { from: 'bot',  text: greeting,    ts: Date.now(),     type: 'text' },
                              { from: 'user', text: q.label,     ts: Date.now() + 1, type: 'text' },
                              { from: 'bot',  text: reply.text,  ts: Date.now() + 2, type: reply.type || 'text' },
                            ]);
                            setChatStarted(true);
                            if (reply.followUps) setSuggestions(reply.followUps);
                            if (reply.topicId) setLastTopic(reply.topicId);
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
                <div className="chat-window-messages" ref={messagesBoxRef} role="log" aria-label="Chat messages">
                  {messages.map((msg, i) => {
                    const prevMsg = messages[i - 1];
                    const isGrouped = prevMsg && prevMsg.from === msg.from;

                    return (
                      <div key={msg.ts + '-' + i} className={`chat-bubble-wrap ${msg.from} ${isGrouped ? 'chat-grouped' : ''}`}>
                        {msg.from === 'bot' && !isGrouped && (
                          <div className="chat-avatar bot-avatar" aria-hidden="true">
                            <Bot size={11} />
                          </div>
                        )}
                        {msg.from === 'bot' && isGrouped && (
                          <div className="chat-avatar-spacer" aria-hidden="true" />
                        )}
                        <div className="chat-msg-col">
                          {/* Tracking Card */}
                          {msg.type === 'tracking_card' && msg.data ? (
                            <div className="chat-tracking-card">
                              <div className="chat-tracking-header">
                                <Package size={14} />
                                <span className="chat-tracking-num">{msg.data.tracking_number}</span>
                              </div>
                              <div className="chat-tracking-status" style={{
                                '--tracking-color': TRACKING_COLORS[msg.data.status] || 'var(--primary)',
                              }}>
                                {(() => {
                                  const StatusIcon = TRACKING_ICONS[msg.data.status] || Package;
                                  return <StatusIcon size={14} />;
                                })()}
                                <span>{msg.data.status}</span>
                              </div>
                              <div className="chat-tracking-details">
                                <div className="chat-tracking-row">
                                  <MapPin size={12} />
                                  <span>{msg.data.origin} → {msg.data.destination}</span>
                                </div>
                                {msg.data.sender_name && (
                                  <div className="chat-tracking-row">
                                    <Send size={12} />
                                    <span>{msg.data.sender_name} → {msg.data.receiver_name}</span>
                                  </div>
                                )}
                                {msg.data.package_weight && (
                                  <div className="chat-tracking-row">
                                    <Package size={12} />
                                    <span>{msg.data.actual_weight || msg.data.package_weight} kg</span>
                                  </div>
                                )}
                              </div>
                              <Link to={`/track?q=${msg.data.tracking_number}`} className="chat-tracking-link">
                                View full details <ChevronRight size={13} />
                              </Link>
                            </div>
                          ) : (
                            /* Normal text bubble */
                            <div className={`chat-bubble ${msg.from === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                              {msg.text.split('\n').map((line, j, arr) => (
                                <span key={j}>
                                  <RichTextLine text={line} />
                                  {j < arr.length - 1 && <br />}
                                </span>
                              ))}
                            </div>
                          )}
                          {!isGrouped && (
                            <div className={`chat-ts ${msg.from}`}>
                              {formatTime(msg.ts)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

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

                {/* Scroll to bottom pill */}
                {showScrollPill && (
                  <button
                    className="chat-scroll-pill"
                    onClick={scrollToBottom}
                    aria-label="Scroll to latest messages"
                  >
                    <ArrowDown size={13} /> New messages
                  </button>
                )}

                {/* Contextual quick replies */}
                <div className="chatbox-quick" role="group" aria-label="Quick reply suggestions">
                  {suggestions.map(q => (
                    <button
                      key={q.query}
                      className="quick-reply-btn"
                      onClick={() => sendMessage(q.query)}
                      disabled={isTyping}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="chatbox-input">
                  <input
                    className="chat-input"
                    placeholder="Type a message or tracking #…"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value.slice(0, MAX_CHAT_LENGTH))}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    aria-label="Type your message"
                    maxLength={MAX_CHAT_LENGTH}
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

                {/* Character counter + powered by */}
                <div className="chat-window-footer">
                  {chatInput.length > 0 && (
                    <span className={`chat-char-count ${chatInput.length > MAX_CHAT_LENGTH - 30 ? 'chat-char-warn' : ''}`}>
                      {chatInput.length}/{MAX_CHAT_LENGTH}
                    </span>
                  )}
                  <div className="chat-window-powered">
                    <Bot size={11} />
                    <span>Powered by CargoExpress AI</span>
                  </div>
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
