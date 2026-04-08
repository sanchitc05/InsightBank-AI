const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function MonthPicker({ statements, selectedId, onSelect, loading }) {
  console.log('DEBUG: MonthPicker rendering with statements:', statements);
  if (loading) return <div className="skeleton h-10 w-64" />;

  return (
    <select
      value={selectedId || ''}
      onChange={(e) => onSelect(Number(e.target.value))}
      className="px-4 py-2.5 rounded-xl text-sm font-medium border-none outline-none cursor-pointer"
      style={{
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-color)',
        minWidth: '240px',
      }}>
      <option value="">Select a statement...</option>
      {Array.isArray(statements) && statements.map(stmt => (
        <option key={stmt.id} value={stmt.id}>
          {stmt.bank_name} — {MONTH_NAMES[stmt.month]} {stmt.year}
          {stmt.account_number ? ` (${stmt.account_number})` : ''}
        </option>
      ))}
    </select>
  );
}
