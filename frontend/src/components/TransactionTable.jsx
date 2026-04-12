import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ListFilter, MoveLeft, MoveRight, Calendar, Building2, Tag, ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react';

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
      <div className="glass-card overflow-hidden border-none bg-slate-950/40">
        <div className="p-1 space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 w-full card-gradient animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!sorted.length) {
    return (
      <div className="glass-card p-16 text-center border-dashed border-white/5">
        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-2xl">
          <ListFilter className="w-8 h-8 text-slate-600" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No Transactions Found</h3>
        <p className="text-sm text-slate-500 max-w-xs mx-auto">No records match your current filter settings. Try relaxing your search criteria.</p>
      </div>
    );
  }

  const columns = [
    { key: 'txn_date', label: 'Date', icon: Calendar },
    { key: 'merchant', label: 'Merchant', icon: Building2 },
    { key: 'category', label: 'Category', icon: Tag },
    { key: 'debit', label: 'Debit', icon: ArrowDownRight },
    { key: 'credit', label: 'Credit', icon: ArrowUpRight },
    { key: 'balance', label: 'Balance', icon: Wallet },
  ];

  return (
    <div className="space-y-8">
      <div className="glass-card overflow-hidden border-none bg-slate-950/40 shadow-2xl rounded-3xl">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-900/50">
                {columns.map(({ key, label, icon: Icon }) => (
                  <th key={key}
                      onClick={() => handleSort(key)}
                      className="px-6 py-5 text-left cursor-pointer group select-none border-b border-white/5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-white transition-colors">
                        {label}
                      </span>
                      <div className="flex flex-col">
                        <ChevronUp className={`w-3 h-3 -mb-1 transition-colors ${sortField === key && sortDir === 'asc' ? 'text-indigo-400' : 'text-slate-700'}`} />
                        <ChevronDown className={`w-3 h-3 transition-colors ${sortField === key && sortDir === 'desc' ? 'text-indigo-400' : 'text-slate-700'}`} />
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {sorted.map((txn, idx) => {
                const meta = categoryMeta[txn.category] || {};
                const color = meta.color || '#94a3b8';
                const icon = meta.icon || '🏷️';
                return (
                  <tr key={txn.id || idx}
                      className="group hover:bg-white/[0.03] transition-all duration-300">
                    <td className="px-6 py-5 text-xs font-bold text-slate-400 font-mono">
                      {txn.txn_date || '—'}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {txn.merchant || 'Unknown Merchant'}
                        </span>
                        {txn.description && (
                          <span className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">
                            {txn.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-transform group-hover:scale-105"
                            style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                        <span>{icon}</span>
                        {txn.category}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      {txn.debit > 0 ? (
                        <span className="text-sm font-black tabular-nums text-rose-400">
                          -₹{Number(txn.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      ) : <span className="text-slate-800">—</span>}
                    </td>
                    <td className="px-6 py-5">
                      {txn.credit > 0 ? (
                        <span className="text-sm font-black tabular-nums text-emerald-400">
                          +₹{Number(txn.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      ) : <span className="text-slate-800">—</span>}
                    </td>
                    <td className="px-6 py-5 text-sm font-black tabular-nums text-indigo-100">
                      ₹{Number(txn.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-8 py-8 glass-card border-none bg-slate-950/40 rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500 border border-white/5">
              <ListFilter className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 leading-none mb-1">Data Range</p>
              <p className="text-xs font-bold text-white">
                {(page - 1) * pageSize + 1} – {Math.min(page * pageSize, total)} <span className="text-slate-600 mx-1">of</span> {total}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onPageChange(page - 1)} 
              disabled={page <= 1}
              className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-900 border border-white/5 text-slate-400 hover:text-white hover:border-indigo-500/50 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <MoveLeft className="w-5 h-5" />
            </button>
            
            <div className="h-12 px-6 rounded-2xl flex items-center justify-center bg-slate-900 border border-white/5 text-xs font-black tracking-widest text-indigo-400">
              {page} / {totalPages}
            </div>

            <button 
              onClick={() => onPageChange(page + 1)} 
              disabled={page >= totalPages}
              className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-900 border border-white/5 text-slate-400 hover:text-white hover:border-indigo-500/50 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <MoveRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
