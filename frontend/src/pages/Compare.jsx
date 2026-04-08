import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAsync } from '../hooks/useAsync';
import { getStatements, getCompare, getInsights } from '../services/api';
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
    <div className="glass-card p-6 space-y-3">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="flex justify-between animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-24"></div>
          <div className="h-4 bg-slate-700 rounded w-20"></div>
          <div className="h-4 bg-slate-700 rounded w-20"></div>
          <div className="h-4 bg-slate-700 rounded w-16"></div>
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="glass-card p-6 h-80 flex items-center justify-center">
      <div className="h-64 bg-slate-700 rounded w-full animate-pulse"></div>
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
    const color = isGood ? '#10b981' : '#ef4444';
    const arrow = isPositive ? '↑' : '↓';
    return <span style={{ color }}>{isPositive ? '+' : ''}{pct.toFixed(1)}% {arrow}</span>;
  };

  const rows = [
    {
      label: 'Total Income',
      val1: s1.total_income,
      val2: s2.total_income,
      fmt: formatINR,
      inverseGood: false,
    },
    {
      label: 'Total Expense',
      val1: s1.total_expense,
      val2: s2.total_expense,
      fmt: formatINR,
      inverseGood: true,
    },
    {
      label: 'Savings',
      val1: s1.savings,
      val2: s2.savings,
      fmt: formatINR,
      inverseGood: false,
    },
    {
      label: 'Savings Rate',
      val1: s1.savings_rate,
      val2: s2.savings_rate,
      fmt: (v) => `${v.toFixed(1)}%`,
      inverseGood: false,
    },
    {
      label: 'Top Category',
      val1: s1.top_category,
      val2: s2.top_category,
      fmt: (v) => v,
      noChange: true,
    },
    {
      label: 'Avg Daily Spend',
      val1: s1.daily_avg_spend,
      val2: s2.daily_avg_spend,
      fmt: formatINR,
      inverseGood: true,
    },
    {
      label: 'Transactions',
      val1: s1.transaction_count,
      val2: s2.transaction_count,
      fmt: (v) => v.toString(),
      noChange: true,
    },
  ];

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th className="px-6 py-3 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>Metric</th>
              <th className="px-6 py-3 text-right font-semibold" style={{ color: 'var(--text-muted)' }}>
                {stmt1.bank_name} · {MONTH_NAMES[stmt1.month]} {stmt1.year}
              </th>
              <th className="px-6 py-3 text-right font-semibold" style={{ color: 'var(--text-muted)' }}>
                {stmt2.bank_name} · {MONTH_NAMES[stmt2.month]} {stmt2.year}
              </th>
              <th className="px-6 py-3 text-right font-semibold" style={{ color: 'var(--text-muted)' }}>Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const change = row.noChange ? null : computeChange(row.val1, row.val2);
              return (
                <tr
                  key={idx}
                  style={{
                    borderBottom: idx < rows.length - 1 ? '1px solid var(--border-color)' : 'none',
                  }}
                >
                  <td className="px-6 py-4" style={{ color: 'var(--text-primary)' }}>
                    {row.label}
                  </td>
                  <td className="px-6 py-4 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {row.fmt(row.val1)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {row.fmt(row.val2)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {row.noChange ? '—' : formatChange(change, row.inverseGood)}
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
function CategoryChart({ categoryComparison, statements }) {
  if (!categoryComparison || categoryComparison.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p style={{ color: 'var(--text-secondary)' }}>No category data available</p>
      </div>
    );
  }

  const stmt1 = statements[0];
  const stmt2 = statements[1];
  const formatLabel = (s) => `${s.bank_name} · ${MONTH_NAMES[s.month]} ${s.year}`;

  const chartData = categoryComparison.map((cat) => ({
    name: cat.category.length > 10 ? cat.category.substring(0, 10) + '...' : cat.category,
    'Statement A': cat.amount_a,
    'Statement B': cat.amount_b,
    change_pct: cat.change_pct,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
        <XAxis dataKey="name" stroke="var(--text-muted)" style={{ fontSize: '12px' }} />
        <YAxis stroke="var(--text-muted)" style={{ fontSize: '12px' }} />
        <Tooltip
          contentStyle={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
          }}
          formatter={(value, name) => {
            if (name === 'Statement A') return formatINR(value);
            if (name === 'Statement B') return formatINR(value);
            return value;
          }}
          labelStyle={{ color: 'var(--text-primary)' }}
        />
        <Legend
          wrapperStyle={{ paddingTop: '16px' }}
          iconType="square"
          formatter={(value) =>
            value === 'Statement A' ? formatLabel(stmt1) : formatLabel(stmt2)
          }
        />
        <Bar dataKey="Statement A" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Statement B" fill="#f97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Recurring Payments Section ────────────────────
function RecurringPayments({ statementA, currentUser }) {
  const navigate = useNavigate();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!statementA) return;

    const fetchInsights = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getInsights(statementA);
        const recurring = res.data.filter(
          (i) => i.type === 'pattern' && i.title.startsWith('Recurring Payment:')
        );
        setInsights(recurring);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [statementA]);

  if (loading) {
    return (
      <div className="glass-card p-6 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-700 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-4xl mb-3">📅</div>
        <p style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>
          No recurring payments detected yet.
        </p>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
          Generate insights for this statement first.
        </p>
        <button
          onClick={() => navigate('/insights')}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:shadow-lg"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', cursor: 'pointer' }}
        >
          Generate Insights →
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {insights.map((insight) => {
        // Parse body to extract details
        const bodyMatch = insight.body.match(/₹([\d,.]+)\s+detected in (\d+) months\s+\((.*?)\).\s+Likely a (\w+)\./);
        const merchant = insight.title.replace('Recurring Payment: ', '');
        const amount = bodyMatch ? parseFloat(bodyMatch[1].replace(/,/g, '')) : 0;
        const count = bodyMatch ? parseInt(bodyMatch[2]) : 0;
        const monthsStr = bodyMatch ? bodyMatch[3] : '';
        const type = bodyMatch ? bodyMatch[4] : 'subscription';
        const months = monthsStr.split(', ').map((m) => m.trim());

        const typeColor = type === 'subscription' ? '#3b82f6' : '#f59e0b';
        const typeBg = type === 'subscription' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)';

        return (
          <div
            key={insight.id}
            className="glass-card p-5 space-y-4"
            style={{ borderLeft: `4px solid ${typeColor}` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  {merchant}
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {formatINR(amount)} per occurrence
                </p>
              </div>
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: typeBg, color: typeColor }}
              >
                {type}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {months.map((month, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: '#6366f1',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                  }}
                >
                  {month}
                </span>
              ))}
            </div>

            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Detected in {count} month{count !== 1 ? 's' : ''}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Compare Page ─────────────────────────────
export default function Compare() {
  const navigate = useNavigate();

  // Fetch statements
  const statementsResult = useAsync(() =>
    getStatements().then((res) => res.data || [])
  );

  const [statementAId, setStatementAId] = useState(null);
  const [statementBId, setStatementBId] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState(null);

  const statements = statementsResult.data || [];

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

  // Fetch comparison when selections change
  useEffect(() => {
    if (!statementAId || !statementBId) return;

    const fetchCompare = async () => {
      setCompareLoading(true);
      setCompareError(null);
      try {
        const res = await getCompare(statementAId, statementBId);
        setCompareData(res.data);
      } catch (err) {
        setCompareError(err.response?.data?.detail || 'Failed to load comparison');
      } finally {
        setCompareLoading(false);
      }
    };

    fetchCompare();
  }, [statementAId, statementBId]);

  const formatStmtLabel = (stmt) => `${stmt.bank_name} · ${MONTH_NAMES[stmt.month]} ${stmt.year}`;

  if (statementsResult.loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-700 rounded w-48"></div>
          <div className="h-16 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-3xl font-extrabold mb-2"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Compare Statements
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Side-by-side analysis of two statements</p>
      </div>

      {/* Statement Selectors */}
      <div className="glass-card p-6 mb-8">
        <div className="grid md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
              Statement A
            </label>
            <select
              value={statementAId || ''}
              onChange={(e) => setStatementAId(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg text-sm border"
              style={{
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-color)',
              }}
            >
              <option value="">Select...</option>
              {statements.map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === statementBId}>
                  {formatStmtLabel(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
              Statement B
            </label>
            <select
              value={statementBId || ''}
              onChange={(e) => setStatementBId(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg text-sm border"
              style={{
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-color)',
              }}
            >
              <option value="">Select...</option>
              {statements.map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === statementAId}>
                  {formatStmtLabel(s)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {compareError && (
        <div
          className="glass-card p-4 mb-8 flex items-center justify-between"
          style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444' }}
        >
          <span style={{ color: '#ef4444' }}>{compareError}</span>
          <button
            onClick={() => {
              setCompareAId(statementAId);
              setStatementBId(statementBId);
            }}
            className="text-sm font-medium px-3 py-1 rounded hover:bg-red-100"
            style={{ color: '#ef4444', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Table */}
      {compareLoading ? (
        <TableSkeleton />
      ) : compareData ? (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Summary Comparison
          </h2>
          <SummaryTable summaries={compareData.summary} statements={compareData.statements} />
        </div>
      ) : null}

      {/* Category Chart */}
      {compareLoading ? (
        <ChartSkeleton />
      ) : compareData ? (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Category Comparison
          </h2>
          <div className="glass-card p-6">
            <CategoryChart
              categoryComparison={compareData.category_comparison}
              statements={compareData.statements}
            />
          </div>
        </div>
      ) : null}

      {/* Recurring Payments */}
      {compareData ? (
        <div>
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Recurring Payments
          </h2>
          <RecurringPayments statementA={statementAId} />
        </div>
      ) : null}

      {/* No Statements State */}
      {statements.length === 0 && (
        <div className="glass-card p-16 text-center">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚖️</div>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Need Statements
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Upload at least 1 statement to get started
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', cursor: 'pointer' }}
          >
            Upload Statement →
          </button>
        </div>
      )}
    </div>
  );
}
