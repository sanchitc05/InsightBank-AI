import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return showToast('Passwords do not match', 'error');
    }

    if (password.length < 12) {
      return showToast('Password must be at least 12 characters', 'error');
    }

    setLoading(true);
    try {
      await register({ email, password });
      showToast('Account created successfully', 'success');
      navigate('/');
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed. Try a different email.';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 animate-fade-in">
      <div className="glass-card max-w-md w-full p-8 md:p-10 space-y-8">
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-glow mx-auto mb-6"
            style={{ background: 'var(--gradient-primary)' }}
          >
            🚀
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-2">Get Started</h1>
          <p className="text-text-secondary">Create your secure InsightBank AI account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary ml-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="premium-input w-full"
              placeholder="name@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary ml-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="premium-input w-full"
              placeholder="Min. 12 characters"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary ml-1">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="premium-input w-full"
              placeholder="••••••••••••"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="premium-button w-full h-12 text-base"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-sm">
          <span className="text-text-muted">Already have an account? </span>
          <Link
            to="/login"
            className="text-color-primary font-semibold hover:underline transition-all"
          >
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
