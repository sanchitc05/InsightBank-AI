const SEVERITY_STYLES = {
  alert: { border: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: '⚠️', color: '#fca5a5' },
  warn:  { border: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: '💡', color: '#fcd34d' },
  info:  { border: '#3b82f6', bg: 'rgba(59,130,246,0.08)', icon: 'ℹ️', color: '#93c5fd' },
};

const TYPE_LABELS = { anomaly: 'Anomaly', pattern: 'Pattern', tip: 'Tip' };

export default function InsightCard({ type, title, body, severity, index = 0 }) {
  const style = SEVERITY_STYLES[severity] || SEVERITY_STYLES.info;

  return (
    <div className="glass-card p-5 animate-fade-in-up"
         style={{
           borderLeft: `4px solid ${style.border}`,
           background: style.bg,
           animationDelay: `${index * 80}ms`,
         }}>
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: `${style.border}20`, color: style.border }}>
              {TYPE_LABELS[type] || type}
            </span>
            <h3 className="text-sm font-bold" style={{ color: style.color }}>{title}</h3>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
        </div>
      </div>
    </div>
  );
}
