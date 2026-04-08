import { useState, useEffect } from 'react';
import { useStatements } from '../hooks/useStatements';
import { useTransactions } from '../hooks/useTransactions';
import useDebounce from '../hooks/useDebounce';
import PageWrapper from '../components/PageWrapper';
import MonthPicker from '../components/MonthPicker';
import TransactionTable from '../components/TransactionTable';
import { useCategoryMeta } from '../hooks/useCategoryMeta';

const ALL_CATEGORIES = [
  'All', 'Food', 'Rent', 'Utilities', 'Shopping', 'EMI', 'Salary',
  'Transport', 'Entertainment', 'Healthcare', 'Education', 'Uncategorized',
];

export default function TransactionsPage() {
  const [selectedId, setSelectedId] = useState(null);
  const [category, setCategory] = useState('All');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Fetch statements
  const statementsQuery = useStatements();
  const statements = statementsQuery.data || [];

  // Set default selection
  useEffect(() => {
    if (statements.length > 0 && !selectedId) {
      setSelectedId(statements[0].id);
    }
  }, [statements, selectedId]);

  // Build query params
  const queryParams = {
    statement_id: selectedId,
    page,
    page_size: pageSize,
    ...(category !== 'All' && { category }),
    ...(type && { type }),
    ...(debouncedSearch && { search: debouncedSearch })
  };

  // Fetch transactions
  const transactionsQuery = useTransactions(
    queryParams
  );


  const data = transactionsQuery.data?.data || { total: 0, data: [] };
  const loading = transactionsQuery.isLoading;

  // Fetch category meta for color/icon badges
  const { data: categoryMeta = {}, isLoading: metaLoading } = useCategoryMeta(selectedId);

  useEffect(() => { setPage(1); }, [selectedId, category, type, debouncedSearch]);

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-black mb-8">
          <span className="text-gradient">Transactions</span>
        </h1>

        {/* Filters */}
        <div className="glass-card mb-8 p-1 border-none bg-slate-900/40">
          <div className="flex flex-wrap items-center gap-3 p-4">
            <MonthPicker statements={statements} selectedId={selectedId} onSelect={setSelectedId} loading={statementsQuery.isLoading} />

            <div className="flex items-center gap-3 bg-slate-800/40 p-1.5 rounded-2xl border border-white/5">
              <select value={category} onChange={e => setCategory(e.target.value)}
                      className="px-4 py-2 rounded-xl text-sm border-none outline-none cursor-pointer bg-slate-900 text-slate-300 font-medium hover:bg-slate-950 transition-colors">
                {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select value={type} onChange={e => setType(e.target.value)}
                      className="px-4 py-2 rounded-xl text-sm border-none outline-none cursor-pointer bg-slate-900 text-slate-300 font-medium hover:bg-slate-950 transition-colors">
                <option value="">All Types</option>
                <option value="debit">Debits Only</option>
                <option value="credit">Credits Only</option>
              </select>
            </div>

            <div className="flex-1 min-w-[300px] relative transition-all duration-300 focus-within:shadow-[0_0_30px_-10px_rgba(99,102,241,0.2)]">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
              <input type="text" placeholder="Search by merchant, description..." value={search}
                     onChange={e => setSearch(e.target.value)}
                     className="w-full pl-11 pr-5 py-3.5 rounded-2xl text-sm outline-none bg-slate-900 border border-white/5 text-white placeholder-slate-500 focus:border-indigo-500/50 transition-all font-medium" />
            </div>
          </div>
        </div>

        {/* Empty State */}
        {!loading && data.data.length === 0 && selectedId && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No transactions found</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Try adjusting your filters or search term</p>
            <button
              onClick={() => { setCategory('All'); setType(''); setSearch(''); }}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', color: 'white' }}
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Table */}
        {(loading || data.data.length > 0) && (
          <TransactionTable
            transactions={data.data}
            loading={loading || metaLoading}
            page={page}
            pageSize={pageSize}
            total={data.total}
            onPageChange={setPage}
            categoryMeta={categoryMeta}
          />
        )}
      </div>
    </PageWrapper>
  );
}
