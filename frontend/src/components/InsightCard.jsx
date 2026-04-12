import { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, Lightbulb, Info, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

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

const markdownSchema = {
  ...defaultSchema,
  tagNames: Array.from(new Set([
    ...(defaultSchema.tagNames || []),
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ])),
  attributes: {
    ...defaultSchema.attributes,
    table: ['className'],
    th: ['align'],
    td: ['align'],
    code: ['className'],
  },
};

const markdownComponents = {
  p: ({ ...props }) => (
    <p className="text-sm leading-relaxed text-slate-400 font-medium mb-3" {...props} />
  ),
  ul: ({ ...props }) => (
    <ul className="list-disc ml-5 space-y-1 text-sm text-slate-400 font-medium mb-3" {...props} />
  ),
  ol: ({ ...props }) => (
    <ol className="list-decimal ml-5 space-y-1 text-sm text-slate-400 font-medium mb-3" {...props} />
  ),
  li: ({ ...props }) => (
    <li className="leading-relaxed" {...props} />
  ),
  strong: ({ ...props }) => (
    <strong className="text-slate-100 font-semibold" {...props} />
  ),
  em: ({ ...props }) => (
    <em className="text-slate-200" {...props} />
  ),
  a: ({ ...props }) => (
    <a className="text-indigo-300 underline underline-offset-2" rel="noreferrer" target="_blank" {...props} />
  ),
  code: ({ inline, ...props }) => (
    inline ? (
      <code className="px-1 py-0.5 rounded bg-slate-900/70 text-slate-200 text-xs font-mono" {...props} />
    ) : (
      <code className="text-slate-200 text-xs font-mono" {...props} />
    )
  ),
  pre: ({ ...props }) => (
    <pre className="bg-slate-900/70 border border-white/5 rounded-xl p-4 overflow-x-auto text-xs text-slate-200 mb-3" {...props} />
  ),
  table: ({ ...props }) => (
    <table className="w-full text-sm text-slate-300 border border-white/10 mb-3" {...props} />
  ),
  thead: ({ ...props }) => (
    <thead className="bg-slate-900/60" {...props} />
  ),
  th: ({ ...props }) => (
    <th className="px-3 py-2 text-left text-[11px] uppercase tracking-widest text-slate-400 border-b border-white/10" {...props} />
  ),
  td: ({ ...props }) => (
    <td className="px-3 py-2 border-b border-white/5" {...props} />
  ),
};

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

      {body && (
        <div className="mb-6">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[[rehypeSanitize, markdownSchema]]}
            components={markdownComponents}
          >
            {body}
          </ReactMarkdown>
        </div>
      )}

      {created_at && (
        <div className="flex items-center gap-2 mt-auto pt-4 border-t border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <Calendar className="w-3 h-3" />
          {formatTimestamp(created_at)}
        </div>
      )}
    </div>
  );
}
