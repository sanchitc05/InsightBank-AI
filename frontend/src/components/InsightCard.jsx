import { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, Lightbulb, Info, Calendar } from 'lucide-react';

const SEVERITY_CONFIG = {
  alert: { 
    icon: ShieldAlert, 
    colorClass: 'text-rose-400',
    bgClass: 'bg-rose-500/10',
    borderClass: 'border-rose-500/20',
    badgeClass: 'bg-rose-500/20 text-rose-400'
  },
  warn:  { 
    icon: AlertTriangle, 
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/20',
    badgeClass: 'bg-amber-500/20 text-amber-400'
  },
  info:  { 
    icon: Info, 
    colorClass: 'text-indigo-400',
    bgClass: 'bg-indigo-500/10',
    borderClass: 'border-indigo-500/20',
    badgeClass: 'bg-indigo-500/20 text-indigo-400'
  },
};

const TYPE_LABELS = { anomaly: 'Anomaly', pattern: 'Pattern', tip: 'Tip' };

export default function InsightCard({ type, title, body, severity, created_at, index = 0 }) {
  const [isVisible, setIsVisible] = useState(false);
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 60);
    return () => clearTimeout(timer);
  }, [index]);

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      className={`glass-card p-6 border-l-4 transition-all duration-500 ease-out ${config.borderClass} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{
        borderLeftColor: 'currentColor',
        color: config.colorClass.split('-')[1] === 'rose' ? '#fb7185' : config.colorClass.split('-')[1] === 'amber' ? '#fbbf24' : '#818cf8'
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${config.bgClass} ${config.colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${config.badgeClass}`}>
          {TYPE_LABELS[type] || type}
        </span>
      </div>

      <h3 className={`font-bold text-lg mb-2 text-slate-100`}>
        {title}
      </h3>

      <p className="text-sm leading-relaxed mb-6 text-slate-400 font-medium">
        {body}
      </p>

      {created_at && (
        <div className="flex items-center gap-2 mt-auto pt-4 border-t border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <Calendar className="w-3 h-3" />
          {formatTimestamp(created_at)}
        </div>
      )}
    </div>
  );
}
