import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PieChart as PieChartIcon, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp as TrendingUpIcon,
  ShoppingBag,
  Calendar,
  IndianRupee,
  Plus
} from 'lucide-react';
import { useStatements } from '../hooks/useStatements';
import { useDashboardSummary, useCategoryBreakdown, useMonthlyTrends } from '../hooks/useAnalytics';
import { useTransactions } from '../hooks/useTransactions';
import { formatINR } from '../utils/format';
import { SkeletonBox } from '../components/Skeleton';
import ErrorBanner from '../components/ErrorBanner';
import PageWrapper from '../components/PageWrapper';
import ScrollReveal from '../components/ScrollReveal';
import IncomeExpenseBar from '../charts/IncomeExpenseBar';
import CategoryPie from '../charts/CategoryPie';
import BalanceLine from '../charts/BalanceLine';
import SpendHeatmap from '../charts/SpendHeatmap';

// ── Skeleton Loader Component ──────────────────
function SkeletonLoader({ height = '140px', className = "" }) {
  return <SkeletonBox className={`rounded-3xl ${className}`} height={height} />;
}

// ── Summary Card Component ─────────────────────
function SummaryCard({ label, value, sublabel, icon: Icon, trend, colorClass }) {
  return (
    <div className="glass-card relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
      <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 opacity-[0.03] rotate-12 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6`}>
        <Icon className="w-full h-full" />
      </div>
      
      <div className="relative p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${colorClass} bg-opacity-10 shadow-sm border border-black/5`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        </div>
        
        <div className="flex items-end gap-2 mb-1">
          <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
          {trend && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md mb-1.5 ${
              trend > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
        
        {sublabel && (
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <span className={`w-1 h-1 rounded-full ${colorClass.replace('text-', 'bg-')}`} />
            {sublabel}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Merchant Bar ───────────────────────────────
function MerchantItem({ name, total, percentage, color, maxAmount }) {
  return (
    <div className="group space-y-2">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium text-slate-400 group-hover:text-slate-200 transition-colors truncate max-w-[120px]">
            {name}
          </span>
        </div>
        <span className="text-sm font-bold text-white font-mono">{formatINR(total)}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ 
            width: `${(total / maxAmount) * 100}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}40`
          }}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(null);

  const statementsQuery = useStatements();
  const statements = statementsQuery.data || [];

  useEffect(() => {
    if (statements.length > 0 && selectedId === null) {
      setSelectedId(statements[0].id);
    }
  }, [statements]);

  const summaryQuery = useDashboardSummary(selectedId);
  const categoriesQuery = useCategoryBreakdown(selectedId);
  const trendQuery = useMonthlyTrends();
  const transactionsQuery = useTransactions(
    selectedId ? { statement_id: selectedId, page_size: 500 } : null
  );

  const summary = summaryQuery.data || {};
  const categoryData = categoriesQuery.data || [];
  const trendData = trendQuery.data || [];
  const transactions = transactionsQuery.data?.data || [];

  // Data Memos
  const balanceData = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    const byDate = {};
    transactions.forEach(txn => {
      if (txn.txn_date) byDate[txn.txn_date] = txn.balance;
    });
    return Object.entries(byDate).map(([date, balance]) => ({
      date,
      dateLabel: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      balance: Number(balance),
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [transactions]);

  const spendByWeekday = useMemo(() => {
    if (!Array.isArray(transactions)) return null;
    const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
    const weekdayCount = [0, 0, 0, 0, 0, 0, 0];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    transactions.forEach(txn => {
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
  }, [transactions]);

  const topMerchants = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    const counts = {};
    transactions.forEach(txn => {
      const desc = txn.description || '';
      const debit = Number(txn.debit) || 0;
      if (desc && debit > 0) {
        const merchant = desc.split(' ')[0].split('*')[0].substring(0, 15).toUpperCase();
        counts[merchant] = (counts[merchant] || 0) + debit;
      }
    });
    return Object.entries(counts)
      .map(([merchant, total]) => ({ merchant, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [transactions]);

  const maxMerchantAmount = topMerchants.length > 0 ? Math.max(...topMerchants.map(m => m.total)) : 1;

  if (!statementsQuery.isLoading && statements.length === 0) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-violet-500/20 blur-3xl rounded-full" />
            <div className="relative w-24 h-24 rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center text-5xl shadow-2xl">
              📊
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight display-font">
            Ready to gain insights?
          </h2>
          <p className="text-slate-400 max-w-md mb-10 leading-relaxed font-medium">
            Upload your first bank statement to unlock real-time financial tracking and AI-powered insights.
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="premium-button group flex items-center gap-3 px-8 py-4 text-lg"
          >
            Start Analyzing <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          </button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <p className="text-xs font-bold text-violet-400 uppercase tracking-widest px-1">Overview</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight display-font">
              Financial <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-500">Dashboard</span>
            </h1>
          </div>
          
          <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
            {statements.map((stmt) => (
              <button
                key={stmt.id}
                onClick={() => setSelectedId(stmt.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                  selectedId === stmt.id 
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                {new Date(stmt.year, stmt.month - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {summaryQuery.isLoading ? (
            Array(4).fill(0).map((_, i) => <SkeletonLoader key={i} />)
          ) : (
            <>
              <ScrollReveal delay={100} className="h-full">
                <SummaryCard
                  label="Total Income"
                  value={formatINR(summary.total_income)}
                  icon={ArrowUpRight}
                  colorClass="text-emerald-400"
                  sublabel="Direct Deposits & Transfers"
                />
              </ScrollReveal>
              <ScrollReveal delay={200} className="h-full">
                <SummaryCard
                  label="Total Expense"
                  value={formatINR(summary.total_expense)}
                  icon={ArrowDownRight}
                  colorClass="text-rose-400"
                  sublabel="Monthly Spending Flow"
                />
              </ScrollReveal>
              <ScrollReveal delay={300} className="h-full">
                <SummaryCard
                  label="Net Savings"
                  value={formatINR(summary.savings)}
                  icon={Wallet}
                  colorClass="text-indigo-400"
                  sublabel={`${summary.savings_rate?.toFixed(1) || '0'}% Savings Rate`}
                />
              </ScrollReveal>
              <ScrollReveal delay={400} className="h-full">
                <SummaryCard
                  label="Avg. Daily"
                  value={formatINR(summary.daily_avg_spend)}
                  icon={Calendar}
                  colorClass="text-amber-400"
                  sublabel={`Top: ${summary.top_category || 'N/A'}`}
                />
              </ScrollReveal>
            </>
          )}
        </div>

        {/* Main Charts & Top Merchants */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trend Chart */}
          <div className="lg:col-span-2 space-y-8">
            <ScrollReveal delay={500}>
              <div className="glass-card p-6 min-h-[400px]">
                <div className="flex items-center justify-between mb-8 px-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
                      <TrendingUpIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">Spending Trends</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Historical Flow Analysis</p>
                    </div>
                  </div>
                </div>
                {trendQuery.isLoading ? <SkeletonLoader height="300px" /> : <IncomeExpenseBar data={trendData} />}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={600}>
              <div className="glass-card p-6 min-h-[400px]">
                <div className="flex items-center justify-between mb-8 px-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                      <IndianRupee className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">Account Balance</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Liquidity over time</p>
                    </div>
                  </div>
                </div>
                {transactionsQuery.isLoading ? <SkeletonLoader height="300px" /> : <BalanceLine data={balanceData} />}
              </div>
            </ScrollReveal>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
             {/* Category Chart */}
             <ScrollReveal delay={550}>
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-8 px-2">
                  <div className="p-2.5 rounded-xl bg-fuchsia-500/10 text-fuchsia-400">
                    <PieChartIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Categories</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Spending Distribution</p>
                  </div>
                </div>
                {categoriesQuery.isLoading ? <SkeletonLoader height="250px" /> : <CategoryPie data={categoryData} />}
              </div>
            </ScrollReveal>

            {/* Top Merchants */}
            <ScrollReveal delay={650}>
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-8 px-2">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Top Destinations</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Frequent Merchants</p>
                  </div>
                </div>
                <div className="space-y-6">
                  {transactionsQuery.isLoading ? (
                    Array(5).fill(0).map((_, i) => <SkeletonLoader key={i} height="40px" />)
                  ) : topMerchants.length > 0 ? (
                    topMerchants.map((merchant, i) => (
                      <MerchantItem
                        key={i}
                        name={merchant.merchant.toLowerCase()}
                        total={merchant.total}
                        maxAmount={maxMerchantAmount}
                        color={['#A78BFA', '#818CF8', '#F472B6', '#FBBF24', '#34D399'][i % 5]}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8">
                       <p className="text-sm text-slate-500 font-medium italic">No detailed insights yet...</p>
                    </div>
                  )}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>

        {/* Heatmap Row */}
        <ScrollReveal delay={750}>
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-8 px-2">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Weekly Habits</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Daily Average Spending Pattern</p>
              </div>
            </div>
            {transactionsQuery.isLoading ? <SkeletonLoader height="120px" /> : <SpendHeatmap data={spendByWeekday || []} />}
          </div>
        </ScrollReveal>
      </div>
    </PageWrapper>
  );
}
