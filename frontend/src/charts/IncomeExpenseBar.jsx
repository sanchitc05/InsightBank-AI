import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatINR } from '../utils/format';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ fontSize: '12px', color: p.color, marginBottom: '2px' }}>
            {p.name}: {formatINR(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function IncomeExpenseBar({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-8 text-center" style={{ height: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>No trend data available</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        📊 Income vs Expense
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border-color)' }} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border-color)' }}
                 tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{value}</span>} />
          <Bar dataKey="total_income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="total_expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
