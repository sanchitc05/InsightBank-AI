import { useState, useEffect } from 'react';
import useStatements from '../hooks/useStatements';
import { getCompare } from '../services/api';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function CompareStatCard({ label, val1, val2, fmt, diffColor }) {
  const diff = val1 - val2;
  const pct = val2 !== 0 ? ((diff / val2) * 100).toFixed(1) : '—';
  return (
    <div className="glass-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(val1)}</p>
        <span className="text-xs">vs</span>
        <p className="text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>{fmt(val2)}</p>
      </div>
      <p className="text-xs mt-1.5 text-right" style={{ color: diff > 0 ? (diffColor || '#10b981') : '#ef4444' }}>
        {diff > 0 ? '▲' : '▼'} {Math.abs(diff).toLocaleString('en-IN')} ({pct}%)
      </p>
    </div>
  );
}

export default function ComparePage() {
  const { statements, loading: stmtLoading } = useStatements();
  const [id1, setId1] = useState(null);
  const [id2, setId2] = useState(null);
  const [result, setResult] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    if (statements.length >= 2) {
      if (!id1) setId1(statements[0].id);
      if (!id2) setId2(statements[1].id);
    }
  }, [statements, id1, id2]);

  const handleCompare = async () => {
    if (!id1 || !id2) return;
    setCompareLoading(true);
    try {
      const res = await getCompare(id1, id2);
      setResult(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to compare');
    } finally {
      setCompareLoading(false);
    }
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  const makeLabel = (stmt) => `${stmt.bank_name} — ${MONTH_NAMES[stmt.month]} ${stmt.year}`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-extrabold mb-6"
          style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Compare Statements
      </h1>

      {/* Selectors */}
      <div className="glass-card p-5 mb-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-48">
            <label className="text-xs font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Statement A</label>
            <select value={id1 || ''} onChange={e => setId1(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border-none outline-none"
                    style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
              <option value="">Select...</option>
              {statements.map(s => <option key={s.id} value={s.id}>{makeLabel(s)}</option>)}
            </select>
          </div>

          <span className="text-2xl mt-5" style={{ color: 'var(--text-muted)' }}>⚖️</span>

          <div className="flex-1 min-w-48">
            <label className="text-xs font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Statement B</label>
            <select value={id2 || ''} onChange={e => setId2(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border-none outline-none"
                    style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
              <option value="">Select...</option>
              {statements.map(s => <option key={s.id} value={s.id}>{makeLabel(s)}</option>)}
            </select>
          </div>

          <button onClick={handleCompare} disabled={!id1 || !id2 || id1 === id2 || compareLoading}
                  className="mt-5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white border-none cursor-pointer disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
            {compareLoading ? '⏳ Comparing...' : '📊 Compare'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && result.summary.length >= 2 && (
        <div className="animate-fade-in-up">
          <div className="flex items-center gap-3 mb-5">
            <span className="px-3 py-1 rounded-lg text-xs font-bold text-white" style={{ background: '#6366f1' }}>
              {makeLabel(result.statements[0])}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>vs</span>
            <span className="px-3 py-1 rounded-lg text-xs font-bold text-white" style={{ background: '#06b6d4' }}>
              {makeLabel(result.statements[1])}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CompareStatCard label="Income" val1={result.summary[0].total_income} val2={result.summary[1].total_income} fmt={fmt} />
            <CompareStatCard label="Expense" val1={result.summary[0].total_expense} val2={result.summary[1].total_expense} fmt={fmt} diffColor="#ef4444" />
            <CompareStatCard label="Savings" val1={result.summary[0].savings} val2={result.summary[1].savings} fmt={fmt} />
            <CompareStatCard label="Savings Rate" val1={result.summary[0].savings_rate} val2={result.summary[1].savings_rate}
                             fmt={(v) => `${v}%`} />
          </div>
        </div>
      )}

      {/* Prompt */}
      {!result && !compareLoading && statements.length < 2 && (
        <div className="glass-card p-16 text-center">
          <div className="text-5xl mb-4">⚖️</div>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Need 2+ Statements</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Upload at least 2 statements to compare</p>
        </div>
      )}
    </div>
  );
}
