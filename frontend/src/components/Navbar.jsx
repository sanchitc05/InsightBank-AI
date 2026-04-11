import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

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
            {NAV_LINKS.map((link) => {
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
          </div>
        )}
      </div>
    </nav>
  );
}
