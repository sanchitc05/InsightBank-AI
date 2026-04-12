import { useState, useEffect } from 'react';
import { Search, Filter, ArrowDownCircle, ArrowUpCircle, CreditCard, ChevronDown, ListFilter, X } from 'lucide-react';
import { useStatements } from '../hooks/useStatements';
import { useTransactions } from '../hooks/useTransactions';
import useDebounce from '../hooks/useDebounce';
import PageWrapper from '../components/PageWrapper';
import MonthPicker from '../components/MonthPicker';
import TransactionTable from '../components/TransactionTable';
import { useCategoryMeta } from '../hooks/useCategoryMeta';
import ScrollReveal from '../components/ScrollReveal';

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
  const transactionsQuery = useTransactions(queryParams);
  const data = transactionsQuery.data || { total: 0, data: [], summary: { total_debit: 0, total_credit: 0 } };
  const loading = transactionsQuery.isLoading;

  const { data: categoryMeta = {}, isLoading: metaLoading } = useCategoryMeta(selectedId);

  useEffect(() => { setPage(1); }, [selectedId, category, type, debouncedSearch]);

  const clearFilters = () => {
    setCategory('All');
    setType('');
    setSearch('');
  };

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter display-font mb-4 uppercase">
              Forensic <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Ledger</span>
            </h1>
            <p className="text-slate-400 font-medium max-w-lg leading-relaxed">
              Drill down into every transaction with multi-dimensional filtering and search capabilities.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="glass-card p-4 min-w-[160px] border-none bg-rose-500/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-500/60 mb-1">Total Debits</p>
                <p className="text-xl font-black text-rose-400 tabular-nums">₹{Number(data.summary?.total_debit || 0).toLocaleString('en-IN')}</p>
             </div>
             <div className="glass-card p-4 min-w-[160px] border-none bg-emerald-500/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 mb-1">Total Credits</p>
                <p className="text-xl font-black text-emerald-400 tabular-nums">₹{Number(data.summary?.total_credit || 0).toLocaleString('en-IN')}</p>
             </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-3">
               <MonthPicker statements={statements} selectedId={selectedId} onSelect={setSelectedId} loading={statementsQuery.isLoading} />
            </div>

            <div className="lg:col-span-6 flex items-center gap-3">
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search ledger..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all shadow-xl" 
                />
              </div>
            </div>

            <div className="lg:col-span-3 flex items-center gap-2">
               <div className="relative flex-1">
                 <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)}
                    className="w-full appearance-none bg-slate-900/80 border border-white/5 pl-4 pr-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-300 cursor-pointer hover:border-white/20 transition-all"
                 >
                   {ALL_CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                 </select>
                 <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
               </div>

               <div className="relative flex-1">
                 <select 
                    value={type} 
                    onChange={e => setType(e.target.value)}
                    className="w-full appearance-none bg-slate-900/80 border border-white/5 pl-4 pr-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-300 cursor-pointer hover:border-white/20 transition-all"
                 >
                   <option value="" className="bg-slate-900">Types</option>
                   <option value="debit" className="bg-slate-900">Debits</option>
                   <option value="credit" className="bg-slate-900">Credits</option>
                 </select>
                 <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
               </div>

               {(category !== 'All' || type || search) && (
                 <button 
                  onClick={clearFilters}
                  className="w-12 h-12 flex items-center justify-center bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/10"
                  title="Clear Filters"
                 >
                   <X className="w-5 h-5" />
                 </button>
               )}
            </div>
        </div>

        {/* Table Content */}
        <div className="relative">
          {loading ? (
             <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-16 w-full glass-card animate-pulse bg-white/5 border-none" />
                ))}
             </div>
          ) : (
            <ScrollReveal>
               <TransactionTable
                  transactions={data.data}
                  loading={loading || metaLoading}
                  page={page}
                  pageSize={pageSize}
                  total={data.total}
                  onPageChange={setPage}
                  categoryMeta={categoryMeta}
                />
            </ScrollReveal>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
