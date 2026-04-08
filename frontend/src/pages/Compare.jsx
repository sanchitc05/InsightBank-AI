import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStatements } from '../hooks/useStatements';
import { useCategoryComparison } from '../hooks/useAnalytics';
import { useInsights } from '../hooks/useInsights';
import PageWrapper from '../components/PageWrapper';
import { formatINR } from '../utils/format';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Skeleton Loaders ──────────────────────────────
function TableSkeleton() {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex justify-between border-b border-white/5 pb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 bg-slate-800 rounded w-20 animate-pulse"></div>
        ))}
      </div>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex justify-between py-2">
          <div className="h-4 bg-slate-800 rounded w-32 animate-pulse"></div>
          <div className="h-4 bg-slate-800 rounded w-24 animate-pulse"></div>
          <div className="h-4 bg-slate-800 rounded w-24 animate-pulse"></div>
          <div className="h-4 bg-slate-800 rounded w-16 animate-pulse"></div>
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="glass-card p-8 h-[400px] flex items-end justify-between gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-slate-800 rounded-t-lg w-full animate-pulse" style={{ height: `${20 + Math.random() * 60}%` }}></div>
      ))}
    </div>
  );
}

// ── Summary Table Component ───────────────────────
function SummaryTable({ summaries, statements }) {
  if (!summaries || summaries.length < 2) return null;

  const s1 = summaries[0];
  const s2 = summaries[1];
  const stmt1 = statements[0];
  const stmt2 = statements[1];

  const computeChange = (a, b) => {
    if (a === 0) return null;
    return ((b - a) / a) * 100;
  };

  const formatChange = (pct, isInverseGood = false) => {
    if (pct === null) return '—';
    const isPositive = pct > 0;
    const isGood = isInverseGood ? isPositive === false : isPositive === true;
    const colorClass = isGood ? 'text-emerald-400' : 'text-rose-400';
    const arrow = isPositive ? '↑' : '↓';
    return (
      <span className={`inline-flex items-center gap-1 font-mono font-bold ${colorClass}`}>
        {isPositive ? '+' : ''}{pct.toFixed(1)}% {arrow}
      </span>
    );
  };

  const rows = [
    {
      label: 'Total Income',
      val1: s1.total_income,
      val2: s2.total_income,
      fmt: formatINR,
      inverseGood: false,
      icon: '💰',
    },
    {
      label: 'Total Expense',
      val1: s1.total_expense,
      val2: s2.total_expense,
      fmt: formatINR,
      inverseGood: true,
      icon: '💸',
    },
    {
      label: 'Savings',
      val1: s1.savings,
      val2: s2.savings,
      fmt: formatINR,
      inverseGood: false,
      icon: '🏦',
    },
    {
      label: 'Savings Rate',
      val1: s1.savings_rate,
      val2: s2.savings_rate,
      fmt: (v) => `${v.toFixed(1)}%`,
      inverseGood: false,
      icon: '📈',
    },
    {
      label: 'Avg Daily Spend',
      val1: s1.daily_avg_spend,
      val2: s2.daily_avg_spend,
      fmt: formatINR,
      inverseGood: true,
      icon: '📅',
    },
  ];

  return (
    <div className="glass-card overflow-hidden border border-white/5">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-slate-900/40">
              <th className="px-6 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Metric</th>
              <th className="px-6 py-5 text-right font-bold text-indigo-400 uppercase tracking-widest text-[10px]">
                {stmt1.bank_name}<br/>
                <span className="text-slate-500 font-normal normal-case tracking-normal">{MONTH_NAMES[stmt1.month]} {stmt1.year}</span>
              </th>
              <th className="px-6 py-5 text-right font-bold text-orange-400 uppercase tracking-widest text-[10px]">
                {stmt2.bank_name}<br/>
                <span className="text-slate-500 font-normal normal-case tracking-normal">{MONTH_NAMES[stmt2.month]} {stmt2.year}</span>
              </th>
              <th className="px-6 py-5 text-right font-bold text-slate-400 uppercase tracking-widest text-[10px]">Comparison</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row, idx) => {
              const change = computeChange(row.val1, row.val2);
              return (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <span className="text-xl group-hover:scale-110 transition-transform">{row.icon}</span>
                      <span className="text-white font-medium">{row.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right text-slate-300 font-medium">
                    {row.fmt(row.val1)}
                  </td>
                  <td className="px-6 py-5 text-right text-slate-100 font-bold">
                    {row.fmt(row.val2)}
                  </td>
                  <td className="px-6 py-5 text-right">
                    {formatChange(change, row.inverseGood)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Category Comparison Chart ─────────────────────
function CategoryChart({ categoryComparison, statements, chartData: preComputedChartData }) {
  if (!categoryComparison || categoryComparison.length === 0) {
    return (
      <div className="glass-card p-12 text-center border-dashed">
        <p className="text-slate-400">No category data available for comparison</p>
      </div>
    );
  }

  const stmt1 = statements[0];
  const stmt2 = statements[1];
  const formatLabel = (s) => `${s.bank_name} · ${MONTH_NAMES[s.month]} ${s.year}`;

  const chartData = preComputedChartData || categoryComparison.map((cat) => ({
    name: cat.category.length > 15 ? cat.category.substring(0, 15) + '...' : cat.category,
    fullName: cat.category,
    'Statement A': cat.amount_a,
    'Statement B': cat.amount_b,
    change_pct: cat.change_pct,
  }));

  return (
    <div className="h-[400px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <defs>
            <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={1}/>
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.8}/>
            </linearGradient>
            <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={1}/>
              <stop offset="95%" stopColor="#ea580c" stopOpacity={0.8}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#64748b" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-35}
            textAnchor="end"
            dy={10}
          />
          <YAxis 
            stroke="#64748b" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            contentStyle={{
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '12px 16px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
            }}
            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
            labelStyle={{ color: '#fff', marginBottom: '8px', fontSize: '13px' }}
            formatter={(value) => [formatINR(value), '']}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '30px' }}
            formatter={(value) => (
              <span className="text-xs font-bold text-slate-300 ml-1">
                {value === 'Statement A' ? formatLabel(stmt1) : formatLabel(stmt2)}
              </span>
            )}
          />
          <Bar dataKey="Statement A" fill="url(#colorA)" radius={[6, 6, 0, 0]} barSize={24} />
          <Bar dataKey="Statement B" fill="url(#colorB)" radius={[6, 6, 0, 0]} barSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Recurring Payments Section ────────────────────
function RecurringPayments({ statementId }) {
  const navigate = useNavigate();
  const { data: insightsResult = [], isLoading, isError, error } = useInsights(statementId);

  const recurringInsights = useMemo(() => {
    return Array.isArray(insightsResult) ? insightsResult.filter(
      (i) => i.type === 'pattern' && i.title.startsWith('Recurring Payment:')
    ) : [];
  }, [insightsResult]);

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-slate-800/40 rounded-2xl animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass-card p-8 text-center text-rose-400 text-sm">
        Error loading patterns: {error.message}
      </div>
    );
  }

  if (recurringInsights.length === 0) {
    return (
      <div className="glass-card p-12 text-center border-dashed border-2 border-white/5 bg-transparent">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/30 flex items-center justify-center text-3xl mx-auto mb-4 border border-white/5">
          📅
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Recurring Patterns Found</h3>
        <p className="text-slate-400 text-sm mb-8 max-w-xs mx-auto">
          We couldn't detect any automatic payment patterns in this statement yet.
        </p>
        <button
          onClick={() => navigate('/insights')}
          className="premium-button text-[11px] font-bold uppercase tracking-widest px-8 py-3"
        >
          View All Insights
        </button>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {recurringInsights.map((insight) => {
        // Parse body to extract details
        const bodyMatch = insight.body.match(/₹([\d,.]+)\s+detected in (\d+) months\s+\((.*?)\).\s+Likely a (\w+)\./);
        const merchant = insight.title.replace('Recurring Payment: ', '');
        const amount = bodyMatch ? parseFloat(bodyMatch[1].replace(/,/g, '')) : 0;
        const count = bodyMatch ? parseInt(bodyMatch[2]) : 0;
        const monthsStr = bodyMatch ? bodyMatch[3] : '';
        const type = bodyMatch ? bodyMatch[4] : 'subscription';
        const months = monthsStr.split(', ').map((m) => m.trim());

        const isSubscription = type.toLowerCase() === 'subscription';
        const typeColor = isSubscription ? '#6366f1' : '#f59e0b';
        const typeBg = isSubscription ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)';

        return (
          <div
            key={insight.id}
            className="glass-card p-6 border-none hover:bg-white/[0.04] transition-all group overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-4xl">{isSubscription ? '🔄' : '🗓️'}</span>
            </div>
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider"
                  style={{ background: typeBg, color: typeColor }}
                >
                  {type}
                </span>
              </div>
              
              <div>
                <h3 className="font-bold text-lg text-white group-hover:text-indigo-400 transition-colors">
                  {merchant}
                </h3>
                <p className="text-2xl font-black text-white mt-1">
                  {formatINR(amount)}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
                {months.map((month, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-medium"
                  >
                    {month}
                  </span>
                ))}
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Frequency
                </span>
                <span className="text-[10px] text-slate-300 font-bold">
                  {count} Month{count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Compare Page ─────────────────────────────
export default function Compare() {
  const navigate = useNavigate();

  // Fetch statements using React Query
  const { data: statements = [], isLoading: statementsLoading } = useStatements();

  const [statementAId, setStatementAId] = useState(null);
  const [statementBId, setStatementBId] = useState(null);

  // Initialize default selections
  useEffect(() => {
    if (statements.length >= 1 && statementAId === null) {
      setStatementAId(statements[0].id);
      if (statements.length >= 2) {
        setStatementBId(statements[1].id);
      } else {
        setStatementBId(statements[0].id);
      }
    }
  }, [statements, statementAId]);

  // Fetch comparison using React Query
  const { 
    data: compareData, 
    isLoading: compareLoading, 
    isError: isCompareError, 
    error: compareError,
    refetch: refetchCompare
  } = useCategoryComparison(statementAId, statementBId);

  const chartData = useMemo(() => {
    if (!compareData?.category_comparison) return [];
    return compareData.category_comparison.map((cat) => ({
      name: cat.category.length > 20 ? cat.category.substring(0, 20) + '...' : cat.category,
      'Statement A': cat.amount_a,
      'Statement B': cat.amount_b,
      change_pct: cat.change_pct,
    }));
  }, [compareData?.category_comparison]);

  const formatStmtLabel = (stmt) => `${stmt.bank_name} · ${MONTH_NAMES[stmt.month]} ${stmt.year}`;

  if (statementsLoading) {
    return (
      <PageWrapper>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="space-y-8">
            <div className="h-10 bg-slate-800 rounded-lg w-64 animate-pulse"></div>
            <div className="h-[200px] bg-slate-800/40 rounded-3xl animate-pulse"></div>
            <div className="h-[400px] bg-slate-800/40 rounded-3xl animate-pulse"></div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl font-black mb-3 tracking-tighter">
              <span className="text-gradient">Side-by-Side</span>
            </h1>
            <p className="text-slate-400 text-lg font-medium">Analyze how your finances vary between months</p>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-900/50 px-4 py-2 rounded-full border border-white/5">
            <span className="text-emerald-400">●</span> Live Comparison Mode
          </div>
        </div>

        {/* Statement Selectors */}
        <section className="mb-12">
          <div className="glass-card p-1 border-none bg-white/[0.02]">
            <div className="bg-slate-900/80 rounded-[22px] p-8">
              <div className="grid md:grid-cols-2 gap-10">
                {/* Selector A */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/80">
                      Primary Source (A)
                    </label>
                  </div>
                  <div className="relative group">
                    <select
                      value={statementAId || ''}
                      onChange={(e) => setStatementAId(Number(e.target.value))}
                      className="appearance-none w-full bg-slate-950 text-white pl-6 pr-14 py-5 rounded-2xl border border-white/10 group-hover:border-indigo-500/50 focus:border-indigo-500 transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-base font-bold"
                    >
                      <option value="">Select Statement...</option>
                      {statements.map((s) => (
                        <option key={s.id} value={s.id} disabled={s.id === statementBId}>
                          {formatStmtLabel(s)}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 transition-transform group-hover:translate-y-[2px]">
                      <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l5 5 5-5"/></svg>
                    </div>
                  </div>
                </div>

                {/* Selector B */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]"></div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400/80">
                      Comparison Source (B)
                    </label>
                  </div>
                  <div className="relative group">
                    <select
                      value={statementBId || ''}
                      onChange={(e) => setStatementBId(Number(e.target.value))}
                      className="appearance-none w-full bg-slate-950 text-white pl-6 pr-14 py-5 rounded-2xl border border-white/10 group-hover:border-orange-500/50 focus:border-orange-500 transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-orange-500/10 text-base font-bold"
                    >
                      <option value="">Select Statement...</option>
                      {statements.map((s) => (
                        <option key={s.id} value={s.id} disabled={s.id === statementAId}>
                          {formatStmtLabel(s)}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 transition-transform group-hover:translate-y-[2px]">
                      <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l5 5 5-5"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Error Banner */}
        {isCompareError && (
          <div className="glass-card mb-12 p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-500">⚠️</div>
              <p className="text-rose-200 font-medium">{compareError?.response?.data?.detail || compareError?.message || 'Failed to sync comparison'}</p>
            </div>
            <button
              onClick={() => refetchCompare()}
              className="px-6 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold uppercase tracking-wider hover:bg-rose-600 transition-colors"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* Content Tabs / Sections */}
        {compareLoading ? (
          <div className="space-y-12">
            <TableSkeleton />
            <ChartSkeleton />
          </div>
        ) : compareData ? (
          <div className="space-y-16 animate-in">
            {/* Summary Comparison */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight">Financial Delta</h2>
                <div className="flex-1 h-px bg-white/5"></div>
              </div>
              <SummaryTable summaries={compareData.summary} statements={compareData.statements} />
            </section>

            {/* Category Analysis */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight">Spending Variance</h2>
                <div className="flex-1 h-px bg-white/5"></div>
              </div>
              <div className="glass-card p-10 border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -mr-32 -mt-32"></div>
                <CategoryChart
                  categoryComparison={compareData.category_comparison}
                  statements={compareData.statements}
                  chartData={chartData}
                />
              </div>
            </section>

            {/* Recurring Payments */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight">Recurring Detected (A)</h2>
                <div className="flex-1 h-px bg-white/5"></div>
              </div>
              <RecurringPayments statementId={statementAId} />
            </section>
          </div>
        ) : (
          !statementsLoading && statements.length === 0 && (
            <div className="glass-card py-24 text-center max-w-2xl mx-auto border-dashed border-2 bg-transparent">
              <div className="w-24 h-24 rounded-3xl bg-slate-800/20 flex items-center justify-center text-5xl mx-auto mb-8 border border-white/5 shadow-inner">
                ⚖️
              </div>
              <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Nothing to compare yet</h2>
              <p className="text-slate-400 text-lg mb-10 max-w-sm mx-auto font-medium">
                Upload at least two bank statements to see side-by-side growth and spending patterns.
              </p>
              <button
                onClick={() => navigate('/upload')}
                className="premium-button px-10 py-4 font-black uppercase tracking-[0.15em] text-xs"
              >
                Upload Statements
              </button>
            </div>
          )
        )}
      </div>
    </PageWrapper>
  );
}
