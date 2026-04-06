import { useState, useMemo } from 'react';

const CAT_COLORS = {
  Food: '#FF6B6B', Rent: '#4ECDC4', Utilities: '#45B7D1', Shopping: '#96CEB4',
  EMI: '#DDA0DD', Salary: '#98D8C8', Transport: '#F7DC6F', Entertainment: '#BB8FCE',
  Healthcare: '#82E0AA', Education: '#85C1E9', Uncategorized: '#999999',
};

export default function TransactionTable({ transactions, loading, page, pageSize, total, onPageChange }) {
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
    return <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="skeleton h-12 w-full" />)}</div>;
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
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-color)' }}>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              {columns.map(col => (
                <th key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none"
                    style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                  {col.label} {sortField === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((txn, idx) => (
              <tr key={txn.id || idx}
                  className="transition-colors duration-150"
                  style={{ borderBottom: '1px solid var(--border-color)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                  {txn.txn_date || '—'}
                </td>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {txn.merchant || '—'}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {txn.description || '—'}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: `${CAT_COLORS[txn.category] || '#999'}20`, color: CAT_COLORS[txn.category] || '#999' }}>
                    {txn.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-semibold tabular-nums" style={{ color: txn.debit > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                  {txn.debit > 0 ? `₹${Number(txn.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                </td>
                <td className="px-4 py-3 text-sm font-semibold tabular-nums" style={{ color: txn.credit > 0 ? '#10b981' : 'var(--text-muted)' }}>
                  {txn.credit > 0 ? `₹${Number(txn.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                </td>
                <td className="px-4 py-3 text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  ₹{Number(txn.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer disabled:opacity-40"
                    style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
              ← Prev
            </button>
            <span className="px-3 py-1.5 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              {page} / {totalPages}
            </span>
            <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer disabled:opacity-40"
                    style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
