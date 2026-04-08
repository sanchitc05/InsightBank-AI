import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStatements } from '../hooks/useStatements';
import { useDashboardSummary, useCategoryBreakdown, useMonthlyTrends } from '../hooks/useAnalytics';
import { useTransactions } from '../hooks/useTransactions';
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
      className="glass-card p-6"
      style={{
        borderLeft: `4px solid ${accentColor}`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-wider uppercase opacity-60">{label}</span>
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
          style={{ background: `${accentColor}15`, color: accentColor }}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight mb-1" style={{ color: '#f8fafc' }}>{value}</p>
      {sublabel && (
        <p className="text-xs opacity-50 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
          {sublabel}
        </p>
      )}
    </div>
  );
}

// ── Main Dashboard Page ────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(null);

  // Fetch statements using React Query
  const statementsQuery = useStatements();
  const statements = statementsQuery.data || [];

  // Set default selection
  useEffect(() => {
    if (statements.length > 0 && selectedId === null) {
      setSelectedId(statements[0].id);
    }
  }, [statements]);

  // Fetch analytics data
  const summaryQuery = useDashboardSummary(selectedId);
  const categoriesQuery = useCategoryBreakdown(selectedId);
  const trendQuery = useMonthlyTrends();
  const transactionsQuery = useTransactions(
    selectedId ? { statement_id: selectedId, page_size: 500 } : null
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
        <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
          <div className="w-24 h-24 rounded-3xl bg-slate-800/50 flex items-center justify-center text-5xl mb-8 border border-white/10 shadow-2xl animate-bounce">
            📊
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
            No statements uploaded yet
          </h2>
          <p className="text-slate-400 max-w-md mb-10 leading-relaxed text-lg">
            Upload your first bank statement to see detailed analytics and insights. Let's get started!
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="premium-button text-lg px-8 py-4"
          >
            Upload your first statement <span className="ml-2">→</span>
          </button>
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
          <div className="mb-10">
            <h1 className="text-4xl font-extrabold mb-8 tracking-tight flex items-center gap-3">
              <span className="text-gradient">Financial Dashboard</span>
            </h1>
            
            <div className="flex gap-2 flex-wrap bg-slate-900/40 p-2 rounded-2xl border border-white/5 w-fit">
              {statements.map((stmt) => (
                <button
                  key={stmt.id}
                  onClick={() => setSelectedId(stmt.id)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    selectedId === stmt.id 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  style={{
                    cursor: 'pointer',
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
              <div className="glass-card p-8">
                {transactionsQuery.isLoading ? (
                  <div className="space-y-6">
                    <SkeletonLoader height="40px" />
                    <SkeletonLoader height="40px" />
                    <SkeletonLoader height="40px" />
                    <SkeletonLoader height="40px" />
                    <SkeletonLoader height="40px" />
                  </div>
                ) : topMerchants.length > 0 ? (
                  <div className="space-y-6">
                    {topMerchants.map((merchant, idx) => {
                      const barWidth = (merchant.total / maxMerchantAmount) * 100;
                      // Use a few distinct colors for merchants
                      const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
                      const activeColor = colors[idx % colors.length];
                      
                      return (
                        <div key={idx} className="group flex flex-col gap-2">
                          <div className="flex justify-between items-end px-1">
                            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors capitalize">
                              {merchant.merchant.toLowerCase()}
                            </span>
                            <span className="text-sm font-bold text-white">
                              {formatINR(merchant.total)}
                            </span>
                          </div>
                          <div className="h-2.5 bg-slate-800/50 rounded-full w-full overflow-hidden border border-white/5">
                            <div
                              className="h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end px-2"
                              style={{
                                background: `linear-gradient(90deg, ${activeColor}dd 0%, ${activeColor} 100%)`,
                                width: `${barWidth}%`,
                                boxShadow: `0 0 10px ${activeColor}40`
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">No merchant data available</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
