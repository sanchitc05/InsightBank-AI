import { useEffect, useState } from 'react';

const SEVERITY_STYLES = {
  alert: { 
    border: '#ef4444', 
    bg: 'rgba(239,68,68,0.05)',
    icon: '⚠️', 
    titleColor: '#ef4444',
    badgeBg: 'rgba(239,68,68,0.15)'
  },
  warn:  { 
    border: '#f59e0b', 
    bg: 'rgba(245,158,11,0.05)',
    icon: '💡', 
    titleColor: '#f59e0b',
    badgeBg: 'rgba(245,158,11,0.15)'
  },
  info:  { 
    border: '#3b82f6', 
    bg: 'rgba(59,130,246,0.05)',
    icon: 'ℹ️', 
    titleColor: '#3b82f6',
    badgeBg: 'rgba(59,130,246,0.15)'
  },
};

const TYPE_LABELS = { anomaly: 'Anomaly', pattern: 'Pattern', tip: 'Tip' };

export default function InsightCard({ type, title, body, severity, created_at, index = 0 }) {
  const [isVisible, setIsVisible] = useState(false);
  const style = SEVERITY_STYLES[severity] || SEVERITY_STYLES.info;

  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => setIsVisible(true), index * 60);
    return () => clearTimeout(timer);
  }, [index]);

  // Format timestamp as "DD MMM YYYY, HH:MM"
  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = date.toLocaleString('en-US', { month: 'short' });
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const mins = String(date.getMinutes()).padStart(2, '0');
      return `${day} ${month} ${year}, ${hours}:${mins}`;
    } catch {
      return '';
    }
  };

  return (
    <div
      className="rounded-lg p-5 border-l-4 transition-all duration-300"
      style={{
        borderColor: style.border,
        backgroundColor: style.bg,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(12px)',
      }}
    >
      {/* Top row: icon + type badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{style.icon}</span>
        <span
          className="px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider"
          style={{
            backgroundColor: style.badgeBg,
            color: style.border,
          }}
        >
          {TYPE_LABELS[type] || type}
        </span>
      </div>

      {/* Title */}
      <h3
        className="font-bold text-sm mb-2"
        style={{ color: style.titleColor }}
      >
        {title}
      </h3>

      {/* Body */}
      <p
        className="text-sm leading-relaxed mb-3"
        style={{ color: '#94a3b8' }}
      >
        {body}
      </p>

      {/* Timestamp */}
      {created_at && (
        <p
          className="text-xs"
          style={{ color: '#94a3b8' }}
        >
          {formatTimestamp(created_at)}
        </p>
      )}
    </div>
  );
}
