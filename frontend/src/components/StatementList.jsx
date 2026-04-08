import { useDeleteStatement } from '../hooks/useStatements';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const BANK_COLORS = {
  SBI: '#1a5276', HDFC: '#004b87', ICICI: '#f58220', AXIS: '#97144d', KOTAK: '#ed1c24', GENERIC: '#64748b',
};

export default function StatementList({ statements, loading }) {
  const deleteMutation = useDeleteStatement();

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this statement and all its transactions?')) return;
    deleteMutation.mutate(id);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!statements || statements.length === 0) {
    return (
      <div className="glass-card p-10 text-center">
        <div className="text-4xl mb-3">📭</div>
        <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No statements uploaded yet</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Upload your first bank statement to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {statements.map((stmt, idx) => (
        <div key={stmt.id}
             className="glass-card p-5 flex items-center justify-between animate-fade-in-up border-none group bg-slate-800/30 hover:bg-slate-800/50 transition-all duration-300"
             style={{ animationDelay: `${idx * 60}ms` }}>
          <div className="flex items-center gap-4">
            {/* Bank badge */}
            <div className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                 style={{ background: BANK_COLORS[stmt.bank_name] || BANK_COLORS.GENERIC }}>
              {stmt.bank_name}
            </div>
            <div>
              <p className="font-bold text-white mb-0.5">
                {MONTH_NAMES[stmt.month]} {stmt.year}
                {stmt.account_number && (
                  <span className="ml-2 text-[10px] font-mono text-slate-500 bg-slate-900/50 px-2 py-0.5 rounded border border-white/5">
                    {stmt.account_number}
                  </span>
                )}
              </p>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                Uploaded {new Date(stmt.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="text-right hidden sm:block font-mono leading-tight">
              <p className="text-xs font-bold text-emerald-400">
                +₹{Number(stmt.total_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs font-bold text-rose-400 mt-1">
                -₹{Number(stmt.total_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <button onClick={() => handleDelete(stmt.id)}
                    disabled={deleteMutation.isPending && deleteMutation.variables === stmt.id}
                    className="p-3 rounded-xl bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 hover:shadow-lg hover:shadow-rose-500/5 transition-all duration-300 border border-transparent hover:border-rose-500/20 active:scale-95 group-hover:opacity-100 sm:opacity-0">
              {deleteMutation.isPending && deleteMutation.variables === stmt.id ? (
                <div className="w-4 h-4 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
              ) : '🗑️'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
