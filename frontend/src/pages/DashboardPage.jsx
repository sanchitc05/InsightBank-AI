import { useState, useEffect } from 'react';
import useStatements from '../hooks/useStatements';
import MonthPicker from '../components/MonthPicker';
import CategoryPieChart from '../charts/CategoryPieChart';
import TrendChart from '../charts/TrendChart';
import { getAnalyticsSummary, getCategories, getTrend } from '../services/api';

function StatCard({ label, value, icon, color, delay = 0 }) {
  return (
    <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-2xl font-extrabold tabular-nums" style={{ color: color || 'var(--text-primary)' }}>
        {value}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { statements, loading } = useStatements();
  const [selectedId, setSelectedId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [trend, setTrend] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Auto-select first statement
  useEffect(() => {
    if (statements.length > 0 && !selectedId) {
      setSelectedId(statements[0].id);
    }
  }, [statements, selectedId]);

  // Fetch analytics when selected statement changes
  useEffect(() => {
    if (!selectedId) return;
    setSummaryLoading(true);
    Promise.all([
      getAnalyticsSummary(selectedId),
      getCategories(selectedId),
      getTrend(),
    ]).then(([summaryRes, catRes, trendRes]) => {
      setSummary(summaryRes.data);
      setCategories(catRes.data);
      setTrend(trendRes.data);
    }).catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, [selectedId]);

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Your financial overview at a glance
          </p>
        </div>
        <MonthPicker statements={statements} selectedId={selectedId} onSelect={setSelectedId} loading={loading} />
      </div>

      {/* Empty State */}
      {!loading && statements.length === 0 && (
        <div className="glass-card p-16 text-center">
          <div className="text-6xl mb-4">🏦</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Welcome to InsightBank</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Upload your first bank statement to see your financial dashboard</p>
          <a href="/upload" className="inline-block px-6 py-3 rounded-xl font-semibold text-white no-underline"
             style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
            📤 Upload Statement
          </a>
        </div>
      )}

      {/* Stat Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Income" value={fmt(summary.total_income)} icon="💰" color="#10b981" delay={0} />
          <StatCard label="Total Expense" value={fmt(summary.total_expense)} icon="💸" color="#ef4444" delay={60} />
          <StatCard label="Savings" value={fmt(summary.savings)} icon="🏦"
                    color={summary.savings >= 0 ? '#10b981' : '#ef4444'} delay={120} />
          <StatCard label="Savings Rate" value={`${summary.savings_rate}%`} icon="📊"
                    color={summary.savings_rate >= 20 ? '#10b981' : summary.savings_rate >= 10 ? '#f59e0b' : '#ef4444'} delay={180} />
        </div>
      )}

      {/* Secondary Stats */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Top Category" value={summary.top_category} icon="🎯" delay={240} />
          <StatCard label="Daily Avg Spend" value={fmt(summary.daily_avg_spend)} icon="📅" color="#f59e0b" delay={300} />
          <StatCard label="Transactions" value={summary.transaction_count} icon="📝" delay={360} />
          <StatCard label="Closing Balance" value={fmt(summary.closing_balance)} icon="🏧" delay={420} />
        </div>
      )}

      {/* Loading skeleton for stats */}
      {summaryLoading && !summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-24 w-full rounded-2xl" />)}
        </div>
      )}

      {/* Charts */}
      {selectedId && (
        <div className="grid lg:grid-cols-2 gap-6">
          <CategoryPieChart data={categories} />
          <TrendChart data={trend} />
        </div>
      )}
    </div>
  );
}
