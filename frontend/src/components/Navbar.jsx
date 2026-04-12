import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { to: '/',             label: 'Dashboard',    icon: '📊' },
  { to: '/upload',       label: 'Upload',       icon: '📤' },
  { to: '/transactions', label: 'Transactions', icon: '💳' },
  { to: '/insights',     label: 'Insights',     icon: '💡' },
  { to: '/compare',      label: 'Compare',      icon: '⚖️' },
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

    if (mobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileOpen]);

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(6, 14, 32, 0.75)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(186, 158, 255, 0.1)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 no-underline">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-glow"
              style={{ background: 'var(--gradient-primary)' }}
            >
              🏦
            </div>
            <span
              className="text-lg font-bold display-font"
              style={{
                background: 'var(--gradient-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              InsightBank
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {isAuthenticated && NAV_LINKS.map((link) => {
              const isActive =
                location.pathname === link.to ||
                (link.to !== '/' && location.pathname.startsWith(link.to));
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="px-4 py-2 rounded-lg text-sm font-medium no-underline transition-all duration-300 flex items-center gap-2 hover:bg-white/5"
                  style={{
                    color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                    background: isActive ? 'rgba(186, 158, 255, 0.1)' : 'transparent',
                    border: isActive ? '1px solid rgba(186, 158, 255, 0.2)' : '1px solid transparent',
                  }}
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}

            {isAuthenticated ? (
              <div className="ml-4 flex items-center gap-4 pl-4 border-l border-white/10">
                <span className="text-xs font-medium text-text-muted hidden lg:block">
                  {user?.email}
                </span>
                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-red-500/10 hover:text-red-400"
                  style={{
                    color: 'var(--text-secondary)',
                    border: '1px solid transparent',
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium no-underline"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="premium-button py-2 text-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2 rounded-lg"
            style={{
              color: 'var(--text-secondary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
            }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div
            className="md:hidden pb-4 animate-fade-in"
            style={{ borderTop: '1px solid var(--border-color)' }}
          >
            {isAuthenticated ? (
              <>
                <div className="px-4 py-3 border-b border-white/5 mb-2">
                  <p className="text-xs text-text-muted">Signed in as</p>
                  <p className="text-sm font-medium overflow-hidden text-ellipsis">{user?.email}</p>
                </div>
                {NAV_LINKS.map((link) => {
                  const isActive = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-3 rounded-lg text-sm font-medium no-underline mt-1"
                      style={{
                        color: isActive ? '#e0e7ff' : 'var(--text-secondary)',
                        background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      }}
                    >
                      <span className="mr-2">{link.icon}</span>
                      {link.label}
                    </Link>
                  );
                })}
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium mt-1 text-red-400"
                >
                  <span className="mr-2">🚪</span>
                  Logout
                </button>
              </>
            ) : (
              <div className="p-4 space-y-2">
                 <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center px-4 py-3 rounded-lg text-sm font-medium no-underline"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center premium-button py-3 text-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
