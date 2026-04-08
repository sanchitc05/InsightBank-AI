import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatINR } from '../utils/format';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          {data.day}
        </p>
        <p style={{ fontSize: '12px', color: '#7c3aed' }}>
          Avg Spend: {formatINR(data.avg_spend)}
        </p>
      </div>
    );
  }
  return null;
};

export default function SpendHeatmap({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-8 text-center" style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>No spending data available</p>
      </div>
    );
  }

  // Find max spend for highlighting
  const maxSpend = Math.max(...data.map(d => d.avg_spend));

  return (
    <div className="glass-card p-6">
      <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        🔥 Spending by Day of Week
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border-color)' }} />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border-color)' }}
            tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="avg_spend" name="Avg Spend" radius={[4, 4, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.avg_spend === maxSpend ? '#f59e0b' : '#7c3aed'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
