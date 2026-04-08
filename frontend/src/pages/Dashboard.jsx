import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStatementsQuery, useAnalyticsSummaryQuery, useCategoriesQuery, useTrendQuery, useTransactionsQuery } from '../hooks/useQueries';
import { formatINR } from '../utils/format';
import { SkeletonBox, SkeletonCard } from '../components/Skeleton';
import ErrorBanner from '../components/ErrorBanner';
import PageWrapper from '../components/PageWrapper';
import IncomeExpenseBar from '../charts/IncomeExpenseBar';
import CategoryPie from '../charts/CategoryPie';
import BalanceLine from '../charts/BalanceLine';
import SpendHeatmap from '../charts/SpendHeatmap';

// ── Skeleton Loader Component ──────────────────
function SkeletonLoader({ width = '100%', height = '60px', className = '' }) {
  return <SkeletonBox width={width} height={height} />;
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

  // Fetch statements using React Query
  const statementsQuery = useStatementsQuery();
  const statements = statementsQuery.data || [];

  // Set default selection
  useEffect(() => {
    if (statements.length > 0 && selectedId === null) {
      setSelectedId(statements[0].id);
    }
  }, [statements]);

  // Fetch analytics data
  const summaryQuery = useAnalyticsSummaryQuery(selectedId);
  const categoriesQuery = useCategoriesQuery(selectedId);
  const trendQuery = useTrendQuery();
  const transactionsQuery = useTransactionsQuery(
    selectedId ? { statement_id: selectedId, page_size: 500 } : null,
    !!selectedId
  );

  // Memoize balance data
  const balanceData = useMemo(() => {
    if (!transactionsQuery.data?.data) return [];
    const txns = transactionsQuery.data.data;
    const byDate = {};
    txns.forEach(txn => {
      if (txn.txn_date) byDate[txn.txn_date] = txn.balance;
    });
    return Object.entries(byDate).map(([date, balance]) => ({
      date,
      dateLabel: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      balance: Number(balance),
    }));
  }, [transactionsQuery.data]);

  // Memoize spending by weekday
  const spendByWeekday = useMemo(() => {
    if (!transactionsQuery.data?.data) return null;
    const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
    const weekdayCount = [0, 0, 0, 0, 0, 0, 0];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    transactionsQuery.data.data.forEach(txn => {
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
  }, [transactionsQuery.data]);

  // Memoize top merchants
  const topMerchants = useMemo(() => {
    if (!transactionsQuery.data?.data) return [];
    const merchantTotals = {};
    transactionsQuery.data.data.forEach(txn => {
      if (txn.debit > 0 && txn.merchant && txn.merchant.trim() && txn.merchant !== 'Unknown') {
        merchantTotals[txn.merchant] = (merchantTotals[txn.merchant] || 0) + txn.debit;
      }
    });
    return Object.entries(merchantTotals)
      .map(([merchant, total]) => ({ merchant, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [transactionsQuery.data]);

  const maxMerchantAmount = topMerchants.length > 0 ? Math.max(...topMerchants.map(m => m.total)) : 1;

  // Empty state
  if (!statementsQuery.isLoading && statements.length === 0) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <div className="text-center">
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>
              No statements uploaded yet
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Upload your first bank statement to see detailed analytics and insights.
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="px-6 py-3 rounded-lg font-medium text-white"
              style={{ background: 'var(--color-primary)', cursor: 'pointer' }}
            >
              Upload your first statement →
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (statementsQuery.isLoading) {
    return (
      <PageWrapper>
        <div className="p-8 animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-48 mb-6"></div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="p-8" style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* ── HEADER ────────────────────────────────────── */}
          <div className="mb-8">
            <h1 style={{ color: 'var(--text-primary)', fontSize: '32px', fontWeight: 'bold', marginBottom: '24px' }}>
              📊 Financial Dashboard
            </h1>
            <div className="flex gap-2 flex-wrap">
              {statements.map((stmt) => (
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
              ))}
            </div>
          </div>

          {/* ── SECTION 2: Summary Cards Row ────────────── */}
          <div className="mb-8">
            <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
              Summary
            </h2>
            {summaryQuery.isError && <ErrorBanner error={summaryQuery.error} onRetry={summaryQuery.refetch} label="summary" />}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {summaryQuery.isLoading ? (
                <>
                  <SkeletonLoader />
                  <SkeletonLoader />
                  <SkeletonLoader />
                  <SkeletonLoader />
                </>
              ) : summaryQuery.data?.data ? (
                <>
                  <SummaryCard
                    label="Total Income"
                    value={formatINR(summaryQuery.data.data.total_income)}
                    icon="↑"
                    accentColor="#10b981"
                  />
                  <SummaryCard
                    label="Total Expense"
                    value={formatINR(summaryQuery.data.data.total_expense)}
                    icon="↓"
                    accentColor="#ef4444"
                  />
                  <SummaryCard
                    label="Savings"
                    value={formatINR(summaryQuery.data.data.savings)}
                    sublabel={`${summaryQuery.data.data.savings_rate.toFixed(1)}% saved`}
                    icon="💰"
                    accentColor="#3b82f6"
                  />
                  <SummaryCard
                    label="Top Category"
                    value={summaryQuery.data.data.top_category}
                    sublabel={`${formatINR(summaryQuery.data.data.daily_avg_spend)} avg/day`}
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
              {trendQuery.isError && <ErrorBanner error={trendQuery.error} onRetry={trendQuery.refetch} label="trend" />}
              {trendQuery.isLoading ? <SkeletonLoader height="340px" /> : <IncomeExpenseBar data={trendQuery.data?.data || []} />}

              {categoriesQuery.isError && <ErrorBanner error={categoriesQuery.error} onRetry={categoriesQuery.refetch} label="categories" />}
              {categoriesQuery.isLoading ? <SkeletonLoader height="340px" /> : <CategoryPie data={categoriesQuery.data?.data || []} />}
            </div>
          </div>

          {/* ── SECTION 4: Secondary Charts Row (2 columns) ─ */}
          <div className="mb-8">
            <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
              Trends
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {transactionsQuery.isError && <ErrorBanner error={transactionsQuery.error} onRetry={transactionsQuery.refetch} label="balance" />}
              {transactionsQuery.isLoading ? <SkeletonLoader height="320px" /> : <BalanceLine data={balanceData} />}

              {transactionsQuery.isError && <ErrorBanner error={transactionsQuery.error} onRetry={transactionsQuery.refetch} label="spending" />}
              {transactionsQuery.isLoading ? <SkeletonLoader height="320px" /> : <SpendHeatmap data={spendByWeekday || []} />}
            </div>
          </div>

          {/* ── SECTION 5: Top Merchants ───────────────── */}
          {(topMerchants.length > 0 || transactionsQuery.isLoading) && (
            <div>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
                Top Merchants
              </h2>
              {transactionsQuery.isError && <ErrorBanner error={transactionsQuery.error} onRetry={transactionsQuery.refetch} label="merchants" />}
              <div className="glass-card p-6">
                {transactionsQuery.isLoading ? (
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
    </PageWrapper>
  );
}
