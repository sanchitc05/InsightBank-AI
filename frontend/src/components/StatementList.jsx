import { useState } from 'react';
import { deleteStatement } from '../services/api';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const BANK_COLORS = {
  SBI: '#1a5276', HDFC: '#004b87', ICICI: '#f58220', AXIS: '#97144d', KOTAK: '#ed1c24', GENERIC: '#64748b',
};

export default function StatementList({ statements, loading, onDeleted }) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this statement and all its transactions?')) return;
    setDeletingId(id);
    try {
      await deleteStatement(id);
      if (onDeleted) onDeleted();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
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
             className="glass-card p-5 flex items-center justify-between animate-fade-in-up"
             style={{ animationDelay: `${idx * 60}ms` }}>
          <div className="flex items-center gap-4">
            {/* Bank badge */}
            <div className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                 style={{ background: BANK_COLORS[stmt.bank_name] || BANK_COLORS.GENERIC }}>
              {stmt.bank_name}
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {MONTH_NAMES[stmt.month]} {stmt.year}
                {stmt.account_number && (
                  <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    • A/C {stmt.account_number}
                  </span>
                )}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Uploaded {new Date(stmt.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold" style={{ color: '#10b981' }}>
                +₹{Number(stmt.total_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>
                -₹{Number(stmt.total_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <button onClick={() => handleDelete(stmt.id)}
                    disabled={deletingId === stmt.id}
                    className="p-2 rounded-lg transition-all duration-200 border-none cursor-pointer"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '14px' }}
                    onMouseEnter={e => e.target.style.background = 'rgba(239, 68, 68, 0.2)'}
                    onMouseLeave={e => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}>
              {deletingId === stmt.id ? '⏳' : '🗑️'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
