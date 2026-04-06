import { useState, useEffect, useCallback } from 'react';
import useStatements from '../hooks/useStatements';
import MonthPicker from '../components/MonthPicker';
import TransactionTable from '../components/TransactionTable';
import { getTransactions } from '../services/api';

const ALL_CATEGORIES = [
  'All', 'Food', 'Rent', 'Utilities', 'Shopping', 'EMI', 'Salary',
  'Transport', 'Entertainment', 'Healthcare', 'Education', 'Uncategorized',
];

export default function TransactionsPage() {
  const { statements, loading: stmtLoading } = useStatements();
  const [selectedId, setSelectedId] = useState(null);
  const [category, setCategory] = useState('All');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ total: 0, data: [] });
  const [loading, setLoading] = useState(false);
  const pageSize = 50;

  useEffect(() => {
    if (statements.length > 0 && !selectedId) setSelectedId(statements[0].id);
  }, [statements, selectedId]);

  const fetchTxns = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const params = { statement_id: selectedId, page, page_size: pageSize };
      if (category !== 'All') params.category = category;
      if (type) params.type = type;
      if (search) params.search = search;
      const res = await getTransactions(params);
      setData(res.data);
    } catch (err) {}
    finally { setLoading(false); }
  }, [selectedId, category, type, search, page]);

  useEffect(() => { fetchTxns(); }, [fetchTxns]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [selectedId, category, type, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-extrabold mb-6"
          style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Transactions
      </h1>

      {/* Filters */}
      <div className="glass-card p-5 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker statements={statements} selectedId={selectedId} onSelect={setSelectedId} loading={stmtLoading} />

          <select value={category} onChange={e => setCategory(e.target.value)}
                  className="px-3 py-2.5 rounded-xl text-sm border-none outline-none cursor-pointer"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
            {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={type} onChange={e => setType(e.target.value)}
                  className="px-3 py-2.5 rounded-xl text-sm border-none outline-none cursor-pointer"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
            <option value="">All Types</option>
            <option value="debit">Debits Only</option>
            <option value="credit">Credits Only</option>
          </select>

          <input type="text" placeholder="🔍 Search transactions..." value={search}
                 onChange={e => setSearch(e.target.value)}
                 className="flex-1 min-w-48 px-4 py-2.5 rounded-xl text-sm outline-none"
                 style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
        </div>
      </div>

      {/* Table */}
      <TransactionTable
        transactions={data.data}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={data.total}
        onPageChange={setPage}
      />
    </div>
  );
}
