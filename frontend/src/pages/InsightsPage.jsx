import { useState, useEffect } from 'react';
import useStatements from '../hooks/useStatements';
import useInsights from '../hooks/useInsights';
import MonthPicker from '../components/MonthPicker';
import InsightCard from '../components/InsightCard';
import { generateInsights } from '../services/api';

export default function InsightsPage() {
  const { statements, loading: stmtLoading } = useStatements();
  const [selectedId, setSelectedId] = useState(null);
  const { insights, loading, refetch } = useInsights(selectedId);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (statements.length > 0 && !selectedId) setSelectedId(statements[0].id);
  }, [statements, selectedId]);

  const handleGenerate = async () => {
    if (!selectedId) return;
    setGenerating(true);
    try {
      await generateInsights(selectedId);
      refetch();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to generate insights');
    } finally {
      setGenerating(false);
    }
  };

  const alerts = insights.filter(i => i.severity === 'alert');
  const warnings = insights.filter(i => i.severity === 'warn');
  const infos = insights.filter(i => i.severity === 'info');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold"
              style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AI Insights
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Smart analysis of your spending patterns</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthPicker statements={statements} selectedId={selectedId} onSelect={setSelectedId} loading={stmtLoading} />
          <button onClick={handleGenerate} disabled={generating || !selectedId}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white border-none cursor-pointer transition-all duration-200 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', whiteSpace: 'nowrap' }}>
            {generating ? '⏳ Generating...' : '🤖 Generate Insights'}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 w-full rounded-2xl" />)}
        </div>
      )}

      {/* Empty State */}
      {!loading && insights.length === 0 && selectedId && (
        <div className="glass-card p-16 text-center">
          <div className="text-5xl mb-4">🤖</div>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No Insights Yet</h2>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            Click "Generate Insights" to analyze this statement
          </p>
        </div>
      )}

      {/* Insights grouped by severity */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#ef4444' }}>⚠️ Alerts ({alerts.length})</h2>
          <div className="space-y-3">
            {alerts.map((ins, i) => <InsightCard key={ins.id} {...ins} index={i} />)}
          </div>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#f59e0b' }}>💡 Warnings ({warnings.length})</h2>
          <div className="space-y-3">
            {warnings.map((ins, i) => <InsightCard key={ins.id} {...ins} index={i} />)}
          </div>
        </div>
      )}
      {infos.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#3b82f6' }}>ℹ️ Info ({infos.length})</h2>
          <div className="space-y-3">
            {infos.map((ins, i) => <InsightCard key={ins.id} {...ins} index={i} />)}
          </div>
        </div>
      )}
    </div>
  );
}
