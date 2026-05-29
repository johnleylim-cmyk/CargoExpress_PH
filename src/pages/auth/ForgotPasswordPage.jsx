import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Container, Mail, Loader, CheckCircle, ArrowLeft, Send } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { resetPassword } = useAuth();
  const timerRef = useRef(null);

  // Cleanup timer on unmount to prevent state updates on unmounted component
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await resetPassword(email);
      if (!result.success) throw new Error(result.error || 'Could not send reset email');
      setSent(true);
      startCountdown();
    } catch (err) {
      setError(err.message || 'Something went wrong');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const result = await resetPassword(email);
      if (!result.success) throw new Error(result.error || 'Could not send reset email');
      startCountdown();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div className="auth-brand">
          <Container size={40} color="var(--primary)" style={{ marginBottom: 8 }} />
          <h1><span>CARGO</span><span>EXPRESS PH</span></h1>
        </div>

        {!sent ? (
          <div className="animate-fade-in">
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--primary-bg)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px', color: 'var(--primary)',
              }}>
                <Mail size={24} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>Reset Password</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Enter your email and we'll send you a reset link
              </p>
            </div>

            {error && (
              <div className="alert-banner alert-banner-error">
                <span>⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="forgot-email">Email Address</label>
                <input
                  id="forgot-email"
                  type="email"
                  className="form-input"
                  placeholder="you@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
                {loading ? <Loader size={18} className="animate-spin" /> : <><Send size={16} /> Send Reset Link</>}
              </button>
            </form>
          </div>
        ) : (
          <div className="animate-scale-in" style={{ textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--success-bg)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', color: 'var(--success)',
            }}>
              <CheckCircle size={36} />
            </div>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: 8 }}>Email Sent!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 24 }}>
              Check your inbox at <strong style={{ color: 'var(--text)' }}>{email}</strong> for the password reset link.
            </p>

            {/* Resend button with countdown */}
            <button
              onClick={handleResend}
              className="btn btn-outline"
              disabled={countdown > 0 || loading}
              style={{ marginBottom: 16 }}
            >
              {loading ? <Loader size={16} className="animate-spin" /> : null}
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Email'}
            </button>

            <div>
              <Link to="/login" className="btn btn-primary btn-lg btn-block">
                <ArrowLeft size={16} /> Back to Sign In
              </Link>
            </div>
          </div>
        )}

        {!sent && (
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Remember your password? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign In</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
