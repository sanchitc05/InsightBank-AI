import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, Wallet, LogOut, LayoutDashboard, Upload, BarChart3, MessageSquare, Layers, Settings } from 'lucide-react';

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload', label: 'Upload', icon: Upload },
  { to: '/transactions', label: 'Transactions', icon: BarChart3 },
  { to: '/insights', label: 'Insights', icon: MessageSquare },
  { to: '/compare', label: 'Compare', icon: Layers },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);
  const { isAuthenticated, logout, user } = useAuth();

  // Close mobile menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setMobileOpen(false);
      }
    }
    if (mobileOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileOpen]);

  // Handle mobile menu on public/auth pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <nav
      ref={navRef}
      className={`md:hidden sticky top-0 z-[60] w-full px-4 py-3 bg-black/40 backdrop-blur-xl border-b border-white/5`}
    >
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white display-font tracking-tight">
            InsightBank
          </span>
        </Link>

        {/* Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="absolute top-full left-0 w-full bg-black/90 backdrop-blur-2xl border-b border-white/5 py-6 px-4 space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
          {isAuthenticated ? (
            <>
              <div className="px-4 py-3 bg-white/5 rounded-xl mb-4">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Signed in as</p>
                <p className="text-sm font-medium text-slate-200 truncate">{user?.email}</p>
              </div>
              
              {NAV_LINKS.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive ? 'bg-violet-500/10 text-violet-400' : 'text-slate-400'
                    }`}
                  >
                    <link.icon className="w-5 h-5" />
                    <span className="font-medium">{link.label}</span>
                  </Link>
                );
              })}

              <button
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-400/5 transition-all mt-4"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </>
          ) : (
            <div className="space-y-3 pt-2">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center px-4 py-3 rounded-xl text-slate-300 bg-white/5 border border-white/10 font-medium"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center px-4 py-3 rounded-xl bg-violet-600 text-white font-medium shadow-lg shadow-violet-600/20"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
