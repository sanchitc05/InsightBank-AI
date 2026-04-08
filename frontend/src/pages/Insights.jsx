import { useState, useEffect } from 'react';
import * as api from '../services/api';
import { useAsync } from '../hooks/useAsync';
import InsightCard from '../components/InsightCard';

// ── Skeleton Loader Component ──────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-lg p-5 border-l-4 animate-pulse"
      style={{
        borderColor: '#cbd5e1',
        backgroundColor: 'rgba(203, 213, 225, 0.1)',
        height: '200px',
      }}
    />
  );
}

// ── Toast Notification System ──────────────────
function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, type === 'success' ? 3000 : 5000);
    return () => clearTimeout(timer);
  }, [onDismiss, type]);

  const bgColor = type === 'success' ? '#10b981' : '#ef4444';

  return (
    <div
      className="fixed bottom-6 right-6 px-4 py-3 rounded-lg text-white text-sm font-medium shadow-lg"
      style={{ backgroundColor: bgColor }}
    >
      {message}
    </div>
  );
}

// ── Toast Container ────────────────────────────
function ToastContainer({ toasts }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} />
      ))}
    </div>
  );
}

// ── Empty State Component ──────────────────────
function EmptyState({ onGenerateClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="text-6xl mb-4">🔍</div>
      <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        No insights yet
      </h3>
      <p
        className="text-sm mb-6"
        style={{ color: 'var(--text-secondary)', maxWidth: '300px', textAlign: 'center' }}
      >
        Select a statement and click Generate Insights to analyze your spending.
      </p>
      <button
        onClick={onGenerateClick}
        className="px-6 py-2 rounded-lg font-medium transition-all hover:shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: 'white',
          cursor: 'pointer',
        }}
      >
        ⚡ Generate Insights
      </button>
    </div>
  );
}

// ── Insights Section Component ─────────────────
function InsightsSection({ title, emoji, count, insights, severityLevel }) {
  if (insights.length === 0) return null;

  return (
    <div className="mb-8">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xl">{emoji}</span>
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        <span
          className="px-2 py-1 rounded-full text-xs font-bold"
          style={{
            backgroundColor:
              severityLevel === 'alert'
                ? 'rgba(239,68,68,0.15)'
                : severityLevel === 'warn'
                ? 'rgba(245,158,11,0.15)'
                : 'rgba(59,130,246,0.15)',
            color:
              severityLevel === 'alert'
                ? '#ef4444'
                : severityLevel === 'warn'
                ? '#f59e0b'
                : '#3b82f6',
          }}
        >
          {count}
        </span>
      </div>

      {/* Grid of insight cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    <div
      className="p-4 rounded-lg mb-6 flex items-center justify-between"
      style={{
        backgroundColor: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.3)',
      }}
    >
      <span style={{ color: '#ef4444', fontSize: '14px' }}>
        ⚠️ {message}
      </span>
      <button
        onClick={onRetry}
        className="px-3 py-1 rounded text-xs font-medium transition-all hover:opacity-80"
        style={{ background: '#ef4444', color: 'white', cursor: 'pointer' }}
      >
        Retry
      </button>
    </div>
  );
}

// ── Main Insights Page ─────────────────────────
export default function Insights() {
  const [selectedId, setSelectedId] = useState(null);
  const [statements, setStatements] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Fetch statements
  const stmtsResult = useAsync(() => api.getStatements(), []);

  useEffect(() => {
    if (stmtsResult.data?.data && stmtsResult.data.data.length > 0) {
      setStatements(stmtsResult.data.data);
      setSelectedId(stmtsResult.data.data[0].id);
    }
  }, [stmtsResult.data]);

  // Fetch insights
  const insightsResult = useAsync(
    () => (selectedId ? api.getInsights(selectedId) : null),
    [selectedId]
  );

  // Format month
  const formatMonth = (stmt) => {
    const months = [
      '',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${stmt.bank_name} · ${months[stmt.month]} ${stmt.year}`;
  };

  // Add toast
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    const newToast = { id, message, type, onDismiss: () => removeToast(id) };
    setToasts((prev) => [...prev, newToast]);
  };

  // Remove toast
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Handle generate click
  const handleGenerate = async () => {
    if (!selectedId) return;

    setIsGenerating(true);
    try {
      const response = await api.generateInsights(selectedId);
      const count = response.data.generated;
      addToast(`✓ ${count} ${count === 1 ? 'insight' : 'insights'} generated`, 'success');

      // Reload insights
      insightsResult.retry();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to generate insights';
      addToast(`Error: ${message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Group insights by severity
  const groupedInsights = {
    alert: insightsResult.data?.filter((i) => i.severity === 'alert') || [],
    warn: insightsResult.data?.filter((i) => i.severity === 'warn') || [],
    info: insightsResult.data?.filter((i) => i.severity === 'info') || [],
  };

  const hasAnyInsights =
    groupedInsights.alert.length > 0 ||
    groupedInsights.warn.length > 0 ||
    groupedInsights.info.length > 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ── SECTION 1: Header Row ──────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Insights
              </h1>
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                AI-generated financial context
              </p>
            </div>

            {/* Statement Selector */}
            <select
              value={selectedId || ''}
              onChange={(e) => setSelectedId(parseInt(e.target.value))}
              className="px-4 py-2 rounded-lg border"
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              {statements.map((stmt) => (
                <option key={stmt.id} value={stmt.id}>
                  {formatMonth(stmt)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── SECTION 2: Generate Button Row ───────────────── */}
        <div className="mb-8">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedId}
            className="px-6 py-2 rounded-lg font-medium transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isGenerating
                ? '#9ca3af'
                : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
            }}
          >
            {isGenerating ? '⏳ Generating...' : '⚡ Generate Insights'}
          </button>
        </div>

        {/* ── SECTION 3: Insights Display ────────────────── */}

        {/* Loading state */}
        {insightsResult.loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {insightsResult.error && !insightsResult.loading && (
          <ErrorBanner
            message={
              insightsResult.error.response?.data?.detail ||
              'Failed to load insights'
            }
            onRetry={insightsResult.retry}
          />
        )}

        {/* Empty state */}
        {!insightsResult.loading &&
          !insightsResult.error &&
          !hasAnyInsights && (
            <EmptyState onGenerateClick={handleGenerate} />
          )}

        {/* Insights grouped by severity */}
        {!insightsResult.loading && !insightsResult.error && hasAnyInsights && (
          <div>
            <InsightsSection
              title="Alerts"
              emoji="🚨"
              count={groupedInsights.alert.length}
              insights={groupedInsights.alert}
              severityLevel="alert"
            />
            <InsightsSection
              title="Warnings"
              emoji="⚠️"
              count={groupedInsights.warn.length}
              insights={groupedInsights.warn}
              severityLevel="warn"
            />
            <InsightsSection
              title="Info"
              emoji="ℹ️"
              count={groupedInsights.info.length}
              insights={groupedInsights.info}
              severityLevel="info"
            />
          </div>
        )}
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
