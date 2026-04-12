import { useState, useEffect } from 'react';
import { Sparkles, BrainCircuit, ShieldAlert, AlertTriangle, Lightbulb, ChevronDown, Wand2, Loader2 } from 'lucide-react';
import { useStatements } from '../hooks/useStatements';
import { useInsights, useGenerateInsights } from '../hooks/useInsights';
import { SkeletonCard } from '../components/Skeleton';
import PageWrapper from '../components/PageWrapper';
import InsightCard from '../components/InsightCard';
import ScrollReveal from '../components/ScrollReveal';

// ── Empty State Component ──────────────────────
function EmptyState({ onGenerateClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 glass-card border-dashed border-white/10 text-center px-4">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-violet-500/20 blur-3xl rounded-full" />
        <div className="relative w-24 h-24 rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center text-5xl shadow-2xl">
          🧠
        </div>
      </div>
      <h3 className="text-3xl font-bold mb-4 text-white tracking-tight display-font">
        No Insights Yet
      </h3>
      <p className="text-slate-400 mb-12 max-w-sm leading-relaxed text-lg font-medium">
        Select a statement and let our AI engine analyze your spending patterns.
      </p>
      <button
        onClick={onGenerateClick}
        className="premium-button px-10 py-4 flex items-center gap-3 group text-lg"
      >
        <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        Generate Analysis
      </button>
    </div>
  );
}

// ── Insights Section Component ─────────────────
function InsightsSection({ title, icon: Icon, count, insights, severityLevel }) {
  if (insights.length === 0) return null;

  const colorConfig = {
    alert: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    warn: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    info: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
  };

  return (
    <div className="mb-16">
      <div className="flex items-center gap-4 mb-8">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg ${colorConfig[severityLevel]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-white tracking-tight display-font">
            {title}
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {count} {count === 1 ? 'Insight Found' : 'Patterns Detected'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {insights.map((insight, idx) => (
          <InsightCard
            key={insight.id}
            {...insight}
            index={idx}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Insights Page ─────────────────────────
export default function Insights() {
  const [selectedId, setSelectedId] = useState(null);
  const statementsQuery = useStatements();
  const statements = statementsQuery.data || [];

  useEffect(() => {
    if (statements.length > 0 && !selectedId) {
      setSelectedId(statements[0].id);
    }
  }, [statements, selectedId]);

  const insightsQuery = useInsights(selectedId);
  const insightsList = insightsQuery.data?.insights || [];
  const generateMutation = useGenerateInsights();

  const handleGenerate = () => {
    if (!selectedId) return;
    generateMutation.mutate(selectedId);
  };

  const isGenerating = generateMutation.isPending;

  const groupedInsights = {
    alert: insightsList.filter((i) => i.severity === 'alert'),
    warn: insightsList.filter((i) => i.severity === 'warn'),
    info: insightsList.filter((i) => i.severity === 'info'),
  };

  const hasAnyInsights = insightsList.length > 0;

  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              AI-Powered Forensics
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight display-font leading-tight">
              Intelligent <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-500">Financial Insights</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-xl font-medium leading-relaxed">
              Our neural engine analyzes every transaction to detect anomalies, recurring patterns, and optimization opportunities.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-auto min-w-[240px]">
              <select
                value={selectedId || ''}
                onChange={(e) => setSelectedId(parseInt(e.target.value))}
                className="w-full appearance-none bg-white/5 text-white pl-5 pr-12 py-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm font-bold shadow-xl"
              >
                {statements.map((stmt) => (
                  <option key={stmt.id} value={stmt.id} className="bg-slate-900 border-none">
                    {stmt.bank_name} · {new Date(stmt.year, stmt.month - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedId}
              className={`premium-button w-full sm:w-auto px-8 py-4 flex items-center justify-center gap-3 text-sm font-black shadow-2xl transition-all ${isGenerating ? 'opacity-70 scale-95 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <BrainCircuit className="w-5 h-5" />
                  <span>Execute Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Content ────────────────── */}

        {insightsQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card p-6 h-60 animate-pulse bg-white/5" />
            ))}
          </div>
        ) : !hasAnyInsights && !isGenerating ? (
          <ScrollReveal>
            <EmptyState onGenerateClick={handleGenerate} />
          </ScrollReveal>
        ) : (
          <div className="space-y-4">
            <InsightsSection
              title="Priority Alerts"
              icon={ShieldAlert}
              count={groupedInsights.alert.length}
              insights={groupedInsights.alert}
              severityLevel="alert"
            />
            <InsightsSection
              title="Activity Patterns"
              icon={AlertTriangle}
              count={groupedInsights.warn.length}
              insights={groupedInsights.warn}
              severityLevel="warn"
            />
            <InsightsSection
              title="Economic Intelligence"
              icon={Lightbulb}
              count={groupedInsights.info.length}
              insights={groupedInsights.info}
              severityLevel="info"
            />
          </div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
             <div className="w-16 h-16 relative mb-6">
                <div className="absolute inset-0 border-4 border-violet-500/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
             </div>
             <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Generating Forensic Report...</p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
