import { useState, useMemo } from 'react';

export default function TransactionTable({ transactions, loading, page, pageSize, total, onPageChange, categoryMeta = {} }) {
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const sorted = useMemo(() => {
    if (!sortField || !transactions) return transactions || [];
    return [...transactions].sort((a, b) => {
      let aVal = a[sortField], bVal = b[sortField];
      if (typeof aVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      aVal = String(aVal || ''); bVal = String(bVal || '');
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [transactions, sortField, sortDir]);

  const handleSort = (field) => {
    setSortDir(sortField === field && sortDir === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading) {
    return (
      <div className="glass-card overflow-hidden border-none bg-slate-900/40">
        <div className="p-1 space-y-1">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 w-full bg-slate-800/20 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!sorted.length) {
    return (
      <div className="glass-card p-10 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No transactions found</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Try adjusting your filters</p>
      </div>
    );
  }

  const columns = [
    { key: 'txn_date', label: 'Date' },
    { key: 'merchant', label: 'Merchant' },
    { key: 'description', label: 'Description' },
    { key: 'category', label: 'Category' },
    { key: 'debit', label: 'Debit' },
    { key: 'credit', label: 'Credit' },
    { key: 'balance', label: 'Balance' },
  ];

  return (
    <div>
      <div className="glass-card overflow-hidden border-none bg-slate-900/40 shadow-2xl">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-950/50">
              {columns.map(col => (
                <th key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-6 py-4 text-left text-[10px] sm:text-xs font-black uppercase tracking-widest cursor-pointer select-none border-b border-white/5 text-slate-400 hover:text-indigo-400 transition-colors">
                  <div className="flex items-center gap-2">
                    {col.label}
                    <span className="text-indigo-500/50">
                      {sortField === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '•'}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {sorted.map((txn, idx) => {
              const meta = categoryMeta[txn.category] || {};
              const color = meta.color || '#94a3b8';
              const icon = meta.icon || '';
              return (
                <tr key={txn.id || idx}
                    className="group hover:bg-slate-800/40 transition-all duration-300">
                  <td className="px-6 py-4 text-xs font-mono text-slate-400 group-hover:text-slate-300 transition-colors">
                    {txn.txn_date || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-white max-w-[200px] truncate group-hover:translate-x-1 transition-transform">
                    {txn.merchant || '—'}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 max-w-[250px] truncate italic">
                    {txn.description || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                          style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
                      {icon && <span>{icon}</span>}
                      {txn.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold tabular-nums">
                    {txn.debit > 0 ? (
                      <span className="text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                        -₹{Number(txn.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    ) : <span className="text-slate-700">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold tabular-nums">
                    {txn.credit > 0 ? (
                      <span className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                        +₹{Number(txn.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    ) : <span className="text-slate-700">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold tabular-nums text-indigo-300">
                    ₹{Number(txn.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 px-4 py-6 glass-card border-none bg-slate-900/20">
          <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">
            Showing <span className="text-white">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}</span> of <span className="text-white">{total}</span>
          </p>
          <div className="flex gap-4">
            <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
                    className="premium-button px-6 py-2.5 text-xs uppercase tracking-widest disabled:opacity-30 disabled:hover:scale-100">
              ← Prev
            </button>
            <div className="flex items-center px-4 rounded-xl bg-slate-900/80 border border-white/5 text-xs font-mono font-bold text-indigo-400 shadow-inner">
              {page} / {totalPages}
            </div>
            <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
                    className="premium-button px-6 py-2.5 text-xs uppercase tracking-widest disabled:opacity-30 disabled:hover:scale-100">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
