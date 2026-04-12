import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
      showToast('Logged in successfully', 'success');
      navigate('/');
    } catch (error) {
      const message = error.response?.data?.detail || 'Invalid email or password';
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
            🏦
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-2">Welcome Back</h1>
          <p className="text-text-secondary">Sign in to your InsightBank AI account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-medium text-text-secondary">Password</label>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="premium-input w-full"
              placeholder="••••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="premium-button w-full h-12 text-base"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="text-center text-sm">
          <span className="text-text-muted">Don't have an account? </span>
          <Link
            to="/register"
            className="text-color-primary font-semibold hover:underline transition-all"
          >
            Create one for free
          </Link>
        </div>
      </div>
    </div>
  );
}
