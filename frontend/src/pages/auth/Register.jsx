import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck, UserPlus, Fingerprint } from 'lucide-react';
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
      return showToast('Access key must be at least 12 characters', 'error');
    }

    setLoading(true);
    try {
      await register({ email, password });
      showToast('Registration successful. Authorized.', 'success');
      navigate('/');
    } catch (error) {
      let message = 'Registration failed. System rejected entry.';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        message = Array.isArray(detail) ? detail.map(err => err.msg).join('. ') : detail;
      }
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#020617]">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <div className="max-w-xl w-full relative z-10">
        <div className="text-center mb-10 animate-fade-in-up">
           <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest mb-6">
              <Fingerprint className="w-3 h-3 text-cyan-400" />
              New Identity Registration
           </div>
           <h1 className="text-5xl font-black text-white tracking-tighter mb-4 display-font uppercase">
             Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Account</span>
           </h1>
           <p className="text-slate-400 font-medium">Join the next generation of financial intelligence.</p>
        </div>

        <div className="glass-card p-10 md:p-12 shadow-2xl border-white/5 relative bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Identity (Email)</label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all"
                    placeholder="Enter your authorized email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">New Access Key</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all"
                    placeholder="Min. 12 characters"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Verify Key</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all"
                    placeholder="Repeat Access Key"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`premium-button w-full py-5 flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest shadow-2xl transition-all ${loading ? 'opacity-70 cursor-not-allowed scale-[0.98]' : 'hover:scale-[1.02] active:scale-95 hover:shadow-cyan-500/10'}`}
              style={{ background: 'linear-gradient(135deg, #06b6d4, #6366f1)' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Create Authorized Account</span>
                  <UserPlus className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-white hover:text-cyan-400 transition-colors ml-1"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-8 opacity-40">
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-cyan-500" />
             <span className="text-[8px] font-black uppercase tracking-widest text-white">Encrypted at rest</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-indigo-500" />
             <span className="text-[8px] font-black uppercase tracking-widest text-white">AES-256 Protocol</span>
           </div>
        </div>
      </div>
    </div>
  );
}
