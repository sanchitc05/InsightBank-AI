import { useState, useEffect } from 'react';
import { useStatements } from '../hooks/useStatements';
import { useInsights, useGenerateInsights } from '../hooks/useInsights';
import { SkeletonCard } from '../components/Skeleton';
import PageWrapper from '../components/PageWrapper';
import InsightCard from '../components/InsightCard';

// ── Empty State Component ──────────────────────
function EmptyState({ onGenerateClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 glass-card border-dashed border-white/10 animate-fade-in">
      <div className="w-24 h-24 rounded-3xl bg-slate-900/50 flex items-center justify-center text-5xl mb-8 shadow-2xl border border-white/5 ring-1 ring-white/10">
        🔍
      </div>
      <h3 className="text-3xl font-black mb-4 text-white tracking-tight">
        No insights yet
      </h3>
      <p className="text-slate-400 mb-12 max-w-sm text-center leading-relaxed text-lg">
        Select a statement and click <span className="text-indigo-400 font-bold">Generate Insights</span> to analyze your spending with our AI engine.
      </p>
      <button
        onClick={onGenerateClick}
        className="premium-button px-10 py-4 flex items-center gap-3 group text-lg"
      >
        <span className="group-hover:rotate-12 transition-transform duration-300">⚡</span>
        Generate Insights
      </button>
    </div>
  );
}

// ── Insights Section Component ─────────────────
function InsightsSection({ title, emoji, count, insights, severityLevel }) {
  if (insights.length === 0) return null;

  return (
    <div className="mb-16 animate-fade-in">
      {/* Section header */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border shadow-lg ${
          severityLevel === 'alert' 
            ? 'bg-rose-500/10 border-rose-500/20 shadow-rose-500/5' 
            : severityLevel === 'warn'
            ? 'bg-amber-500/10 border-amber-500/20 shadow-amber-500/5'
            : 'bg-indigo-500/10 border-indigo-500/20 shadow-indigo-500/5'
        }`}>
          {emoji}
        </div>
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-white tracking-tight">
            {title}
          </h2>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {count} {count === 1 ? 'Significant Entry' : 'Pattern Matches'}
          </span>
        </div>
        <div className="ml-auto">
          <span
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ring-1 ring-inset ${
              severityLevel === 'alert'
                ? 'bg-rose-500/20 text-rose-400 ring-rose-500/30'
                : severityLevel === 'warn'
                ? 'bg-amber-500/20 text-amber-400 ring-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30'
            }`}
          >
            {severityLevel === 'alert' ? 'Priority' : severityLevel === 'warn' ? 'Careful' : 'Optimal'}
          </span>
        </div>
      </div>

      {/* Grid of insight cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {insights.map((insight, idx) => (
          <InsightCard
            key={insight.id}
            type={insight.type}
            title={insight.title}
            body={insight.body}
            severity={insight.severity}
            created_at={insight.created_at}
            index={idx}
          />
        ))}
      </div>
    </div>
  );
}

// ── Error Banner Component ─────────────────────
function ErrorBanner({ message, onRetry }) {
  return (
    <div className="glass-card p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 border-rose-500/20 bg-rose-500/5">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500">
          ⚠️
        </div>
        <div>
          <h4 className="font-bold text-white">Analysis Failed</h4>
          <p className="text-sm text-slate-400">{message}</p>
        </div>
      </div>
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-rose-500/20"
      >
        Retry Analysis
      </button>
    </div>
  );
}

// ── Main Insights Page ─────────────────────────
export default function Insights() {
  const [selectedId, setSelectedId] = useState(null);

  // Fetch statements
  const statementsQuery = useStatements();
  const statements = statementsQuery.data || [];

  useEffect(() => {
    if (statements.length > 0 && !selectedId) {
      setSelectedId(statements[0].id);
    }
  }, [statements, selectedId]);

  // Fetch insights
  const insightsQuery = useInsights(selectedId);
  const insights = insightsQuery.data || [];

  // Mutations
  const generateMutation = useGenerateInsights();

  // Format month
  const formatMonth = (stmt) => {
    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${stmt.bank_name} · ${months[stmt.month]} ${stmt.year}`;
  };

  // Handle generate click
  const handleGenerate = () => {
    if (!selectedId) return;
    generateMutation.mutate(selectedId);
  };

  const isGenerating = generateMutation.isPending;

  // Group insights by severity
  const groupedInsights = {
    alert: insights.filter((i) => i.severity === 'alert') || [],
    warn: insights.filter((i) => i.severity === 'warn') || [],
    info: insights.filter((i) => i.severity === 'info') || [],
  };

  const hasAnyInsights =
    groupedInsights.alert.length > 0 ||
    groupedInsights.warn.length > 0 ||
    groupedInsights.info.length > 0;

  return (
    <PageWrapper>
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Header Section */}
          <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="animate-slide-up">
              <h1 className="text-5xl font-black mb-4 tracking-tight">
                <span className="text-gradient">Financial AI</span>
              </h1>
              <p className="text-slate-400 text-xl max-w-xl leading-relaxed">
                Deep analysis of your spending habits, recurring patterns, and anomaly detection.
              </p>
            </div>

            {/* Statement Selector with fixed width and better styling */}
            <div className="relative group animate-slide-up" style={{ animationDelay: '100ms' }}>
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative">
                <select
                  value={selectedId || ''}
                  onChange={(e) => setSelectedId(parseInt(e.target.value))}
                  className="appearance-none bg-slate-900 text-white pl-6 pr-14 py-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-w-[280px] text-base font-bold shadow-2xl"
                >
                  {statements.map((stmt) => (
                    <option key={stmt.id} value={stmt.id} className="bg-slate-900 text-white">
                      {formatMonth(stmt)}
                    </option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400 text-xl">
                  ⌄
                </div>
              </div>
            </div>
          </div>

          <div className="mb-16 flex flex-wrap items-center gap-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedId}
              className={`premium-button px-10 py-5 flex items-center gap-4 text-lg font-black shadow-2xl shadow-indigo-500/20 ${isGenerating ? 'opacity-70 scale-95 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
            >
              {isGenerating ? (
                <>
                  <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Analyzing Data...</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">⚡</span>
                  <span>Analyze Statement</span>
                </>
              )}
            </button>
            
            {isGenerating && (
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                </div>
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                  Brewing insights
                </span>
              </div>
            )}
          </div>

          {/* ── Insights Display ────────────────── */}

          {/* Loading state */}
          {insightsQuery.isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Error state */}
          {insightsQuery.isError && !insightsQuery.isLoading && (
            <ErrorBanner
              message={
                insightsQuery.error.response?.data?.detail ||
                'Our AI engine encountered an issue while processing your request.'
              }
              onRetry={() => insightsQuery.refetch()}
            />
          )}

          {/* Empty state */}
          {!insightsQuery.isLoading &&
            !insightsQuery.isError &&
            !hasAnyInsights && (
              <EmptyState onGenerateClick={handleGenerate} />
            )}

          {/* Insights grouped by severity */}
          {!insightsQuery.isLoading && !insightsQuery.isError && hasAnyInsights && (
            <div className="space-y-4">
              <InsightsSection
                title="Critical Alerts"
                emoji="🚨"
                count={groupedInsights.alert.length}
                insights={groupedInsights.alert}
                severityLevel="alert"
              />
              <InsightsSection
                title="Behavioral Warnings"
                emoji="⚠️"
                count={groupedInsights.warn.length}
                insights={groupedInsights.warn}
                severityLevel="warn"
              />
              <InsightsSection
                title="Pattern Analysis"
                emoji="📈"
                count={groupedInsights.info.length}
                insights={groupedInsights.info}
                severityLevel="info"
              />
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
