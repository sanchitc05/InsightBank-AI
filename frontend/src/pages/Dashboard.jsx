import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { formatINR } from '../utils/format';
import IncomeExpenseBar from '../charts/IncomeExpenseBar';
import CategoryPie from '../charts/CategoryPie';
import BalanceLine from '../charts/BalanceLine';
import SpendHeatmap from '../charts/SpendHeatmap';

// ── Skeleton Loader Component ──────────────────
function SkeletonLoader({ width = '100%', height = '60px', className = '' }) {
  return (
    <div
      className={`skeleton rounded-lg animate-pulse ${className}`}
      style={{ width, height, background: 'var(--bg-card)' }}
    />
  );
}

// ── Error Banner Component ─────────────────────
function ErrorBanner({ error, onRetry, label }) {
  if (!error) return null;
  return (
    <div
      className="p-4 rounded-lg mb-4 flex items-center justify-between"
      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--border-color)' }}
    >
      <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
        ⚠️ Failed to load {label}
      </span>
      <button
        onClick={onRetry}
        className="px-3 py-1 rounded text-xs font-medium"
        style={{ background: '#ef4444', color: 'white', cursor: 'pointer' }}
      >
        Retry
      </button>
    </div>
  );
}

// ── Summary Card Component ─────────────────────
function SummaryCard({ label, value, sublabel, icon, accentColor }) {
  return (
    <div
      className="glass-card p-6 rounded-xl"
      style={{
        background: 'rgba(30, 41, 59, 0.6)',
        border: `1px solid ${accentColor}20`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{label}</span>
        <span style={{ fontSize: '24px' }}>{icon}</span>
      </div>
      <p style={{ color: accentColor, fontSize: '24px', fontWeight: 'bold' }}>{value}</p>
      {sublabel && (
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>{sublabel}</p>
      )}
    </div>
  );
}

// ── Main Dashboard Page ────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(null);
  const [statements, setStatements] = useState([]);

  // Fetch statements on mount
  const stmtsResult = useAsync(() => api.getStatements(), []);

  useEffect(() => {
    if (stmtsResult.data?.data && stmtsResult.data.data.length > 0) {
      setStatements(stmtsResult.data.data);
      setSelectedId(stmtsResult.data.data[0].id);
    }
  }, [stmtsResult.data]);

  // Fetch analytics data with dependencies on selectedId
  const summaryResult = useAsync(
    () => selectedId ? api.getAnalyticsSummary(selectedId) : null,
    [selectedId]
  );

  const categoriesResult = useAsync(
    () => selectedId ? api.getCategories(selectedId) : null,
    [selectedId]
  );

  const trendResult = useAsync(() => api.getTrend(), []);

  const transactionsResult = useAsync(
    () => selectedId ? api.getTransactions({ statement_id: selectedId, page_size: 500 }) : null,
    [selectedId]
  );

  // Process balance data for BalanceLine
  const balanceData = (() => {
    if (!transactionsResult.data?.data) return [];
    const txns = transactionsResult.data.data;
    const byDate = {};
    txns.forEach(txn => {
      if (txn.txn_date) {
        byDate[txn.txn_date] = txn.balance;
      }
    });
    return Object.entries(byDate).map(([date, balance]) => ({
      date,
      dateLabel: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      balance: Number(balance),
    }));
  })();

  // Process spending by weekday for SpendHeatmap
  const spendByWeekday = (() => {
    if (!transactionsResult.data?.data) return null;
    const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
    const weekdayCount = [0, 0, 0, 0, 0, 0, 0];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    transactionsResult.data.data.forEach(txn => {
      if (txn.txn_date && txn.debit > 0) {
        const date = new Date(txn.txn_date);
        const dayIdx = date.getDay();
        weekdayTotals[dayIdx] += Number(txn.debit);
        weekdayCount[dayIdx] += 1;
      }
    });

    return days.map((day, idx) => ({
      day,
      avg_spend: weekdayCount[idx] > 0 ? weekdayTotals[idx] / weekdayCount[idx] : 0,
    }));
  })();

  // Process top merchants
  const topMerchants = (() => {
    if (!transactionsResult.data?.data) return [];
    const merchantTotals = {};
    transactionsResult.data.data.forEach(txn => {
      if (txn.debit > 0 && txn.merchant && txn.merchant.trim() && txn.merchant !== 'Unknown') {
        merchantTotals[txn.merchant] = (merchantTotals[txn.merchant] || 0) + txn.debit;
      }
    });
    return Object.entries(merchantTotals)
      .map(([merchant, total]) => ({ merchant, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  })();

  const maxMerchantAmount = topMerchants.length > 0 ? Math.max(...topMerchants.map(m => m.total)) : 1;

  // Empty state
  if (!stmtsResult.loading && statements.length === 0) {
    return (
      <div className="p-8 text-center" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>
          No statements uploaded yet
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          Upload your first bank statement to see detailed analytics and insights.
        </p>
        <button
          onClick={() => navigate('/upload')}
          className="px-6 py-3 rounded-lg font-medium"
          style={{ background: 'var(--color-primary)', color: 'white', cursor: 'pointer' }}
        >
          Upload your first statement →
        </button>
      </div>
    );
  }

  return (
    <div className="p-8" style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* ── HEADER ────────────────────────────────────── */}
        <div className="mb-8">
          <h1 style={{ color: 'var(--text-primary)', fontSize: '32px', fontWeight: 'bold', marginBottom: '24px' }}>
            📊 Financial Dashboard
          </h1>

          {/* SECTION 1: Statement Selector (Chips) ──── */}
          <div className="flex gap-2 flex-wrap">
            {stmtsResult.loading ? (
              <SkeletonLoader width="240px" height="40px" />
            ) : statements.length > 0 ? (
              statements.map((stmt) => (
                <button
                  key={stmt.id}
                  onClick={() => setSelectedId(stmt.id)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: selectedId === stmt.id ? 'var(--color-primary)' : 'var(--bg-card)',
                    color: selectedId === stmt.id ? 'white' : 'var(--text-secondary)',
                    border: selectedId === stmt.id ? 'none' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    boxShadow: selectedId === stmt.id ? '0 0 20px rgba(99, 102, 241, 0.3)' : 'none',
                  }}
                >
                  {stmt.bank_name} · {new Date(stmt.year, stmt.month - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </button>
              ))
            ) : null}
          </div>
        </div>

        {/* ── SECTION 2: Summary Cards Row ────────────── */}
        <div className="mb-8">
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
            Summary
          </h2>
          {summaryResult.error && <ErrorBanner error={summaryResult.error} onRetry={summaryResult.retry} label="summary" />}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryResult.loading ? (
              <>
                <SkeletonLoader />
                <SkeletonLoader />
                <SkeletonLoader />
                <SkeletonLoader />
              </>
            ) : summaryResult.data?.data ? (
              <>
                <SummaryCard
                  label="Total Income"
                  value={formatINR(summaryResult.data.data.total_income)}
                  icon="↑"
                  accentColor="#10b981"
                />
                <SummaryCard
                  label="Total Expense"
                  value={formatINR(summaryResult.data.data.total_expense)}
                  icon="↓"
                  accentColor="#ef4444"
                />
                <SummaryCard
                  label="Savings"
                  value={formatINR(summaryResult.data.data.savings)}
                  sublabel={`${summaryResult.data.data.savings_rate.toFixed(1)}% saved`}
                  icon="💰"
                  accentColor="#3b82f6"
                />
                <SummaryCard
                  label="Top Category"
                  value={summaryResult.data.data.top_category}
                  sublabel={`${formatINR(summaryResult.data.data.daily_avg_spend)} avg/day`}
                  icon="📊"
                  accentColor="#8b5cf6"
                />
              </>
            ) : null}
          </div>
        </div>

        {/* ── SECTION 3: Main Charts Row (2 columns) ──– */}
        <div className="mb-8">
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
            Analysis
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: Income vs Expense Bar Chart */}
            {trendResult.error && <ErrorBanner error={trendResult.error} onRetry={trendResult.retry} label="trend" />}
            {trendResult.loading ? <SkeletonLoader height="340px" /> : <IncomeExpenseBar data={trendResult.data?.data || []} />}

            {/* RIGHT: Category Pie Chart */}
            {categoriesResult.error && <ErrorBanner error={categoriesResult.error} onRetry={categoriesResult.retry} label="categories" />}
            {categoriesResult.loading ? <SkeletonLoader height="340px" /> : <CategoryPie data={categoriesResult.data?.data || []} />}
          </div>
        </div>

        {/* ── SECTION 4: Secondary Charts Row (2 columns) ─ */}
        <div className="mb-8">
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
            Trends
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: Balance Line Chart */}
            {transactionsResult.error && <ErrorBanner error={transactionsResult.error} onRetry={transactionsResult.retry} label="balance" />}
            {transactionsResult.loading ? <SkeletonLoader height="320px" /> : <BalanceLine data={balanceData} />}

            {/* RIGHT: Spend Heatmap */}
            {transactionsResult.error && <ErrorBanner error={transactionsResult.error} onRetry={transactionsResult.retry} label="spending" />}
            {transactionsResult.loading ? <SkeletonLoader height="320px" /> : <SpendHeatmap data={spendByWeekday || []} />}
          </div>
        </div>

        {/* ── SECTION 5: Top Merchants ───────────────── */}
        {(topMerchants.length > 0 || transactionsResult.loading) && (
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
              Top Merchants
            </h2>
            {transactionsResult.error && <ErrorBanner error={transactionsResult.error} onRetry={transactionsResult.retry} label="merchants" />}
            <div className="glass-card p-6">
              {transactionsResult.loading ? (
                <>
                  <SkeletonLoader height="40px" style={{ marginBottom: '12px' }} />
                  <SkeletonLoader height="40px" style={{ marginBottom: '12px' }} />
                  <SkeletonLoader height="40px" style={{ marginBottom: '12px' }} />
                  <SkeletonLoader height="40px" style={{ marginBottom: '12px' }} />
                  <SkeletonLoader height="40px" />
                </>
              ) : topMerchants.length > 0 ? (
                <div className="space-y-4">
                  {topMerchants.map((merchant, idx) => {
                    const barWidth = (merchant.total / maxMerchantAmount) * 100;
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px', flex: '0 0 180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {merchant.merchant}
                        </span>
                        <div
                          className="h-1.5 rounded-full flex-1"
                          style={{
                            background: '#00d4ff',
                            width: `${barWidth}%`,
                            minWidth: '20px',
                          }}
                        />
                        <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 'bold', flex: '0 0 120px', textAlign: 'right' }}>
                          {formatINR(merchant.total)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No merchant data available</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
