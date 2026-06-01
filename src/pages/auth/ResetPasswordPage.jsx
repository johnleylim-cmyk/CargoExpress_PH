import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Container, Lock, Loader, CheckCircle, Eye, EyeOff, ShieldCheck, AlertTriangle, Circle } from 'lucide-react';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const { changePassword } = useAuth();
  const navigate = useNavigate();

  // Wait for Supabase to process the recovery token from the URL hash
  useEffect(() => {
    // Supabase JS client auto-detects the recovery token in the URL hash
    // and signs the user in with PASSWORD_RECOVERY event.
    // Give it a moment to process.
    const timer = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Password strength checks
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const allChecks = Object.values(checks).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!allChecks) {
      setError('Password does not meet all requirements');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await changePassword(password);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to update password');
    }
    setLoading(false);
  };

  // Loading state while Supabase processes the recovery token
  if (!ready) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: 440, textAlign: 'center' }}>
          <div className="auth-brand">
            <Container size={40} color="var(--primary)" style={{ marginBottom: 8 }} />
            <h1><span>CARGO</span><span>EXPRESS PH</span></h1>
          </div>
          <div style={{ padding: '40px 0' }}>
            <Loader size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: 16 }} />
            <p style={{ color: 'var(--text-secondary)' }}>Verifying your reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div className="auth-brand">
          <Container size={40} color="var(--primary)" style={{ marginBottom: 8 }} />
          <h1><span>CARGO</span><span>EXPRESS PH</span></h1>
        </div>

        {!success ? (
          <div className="animate-fade-in">
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--primary-bg)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px', color: 'var(--primary)',
              }}>
                <Lock size={24} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>Set New Password</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Enter your new password below
              </p>
            </div>

            {error && (
              <div className="alert-banner alert-banner-error">
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="reset-password">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Enter new password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    style={{ paddingRight: 44 }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-secondary)', padding: 4,
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Password strength indicators */}
              {password.length > 0 && (
                <div style={{
                  background: 'var(--card-bg)', borderRadius: 12, padding: '12px 16px',
                  marginBottom: 16, border: '1px solid var(--border)',
                }}>
                  {[
                    { key: 'length', label: 'At least 8 characters' },
                    { key: 'uppercase', label: 'One uppercase letter' },
                    { key: 'lowercase', label: 'One lowercase letter' },
                    { key: 'number', label: 'One number' },
                  ].map(({ key, label }) => (
                    <div key={key} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: '0.8125rem', marginBottom: 4,
                      color: checks[key] ? 'var(--success)' : 'var(--text-secondary)',
                    }}>
                      {checks[key] ? <CheckCircle size={14} /> : <Circle size={14} />}
                      {label}
                    </div>
                  ))}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="reset-confirm-password">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reset-confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    style={{ paddingRight: 44 }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-secondary)', padding: 4,
                    }}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <span style={{ color: 'var(--danger)', fontSize: '0.8125rem', marginTop: 4, display: 'block' }}>
                    Passwords do not match
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-block"
                disabled={loading || !allChecks || password !== confirmPassword}
              >
                {loading ? <Loader size={18} className="animate-spin" /> : <><ShieldCheck size={16} /> Update Password</>}
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
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: 8 }}>Password Updated!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 24 }}>
              Your password has been successfully changed. Redirecting to login...
            </p>
            <Link to="/login" className="btn btn-primary btn-lg btn-block">
              Go to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
