import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const RADIAN = Math.PI / 180;

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {(percent * 100).toFixed(0)}%
    </text>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: data.color, marginBottom: '4px' }}>
          {data.icon} {data.category}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          ₹{Number(data.total).toLocaleString('en-IN')} • {data.count} txns • {data.percentage}%
        </p>
      </div>
    );
  }
  return null;
};

export default function CategoryPieChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p style={{ color: 'var(--text-muted)' }}>No category data available</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        🎯 Spending by Category
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="category" cx="50%" cy="50%"
               outerRadius={110} innerRadius={55} paddingAngle={3} labelLine={false}
               label={renderCustomLabel} animationBegin={0} animationDuration={800}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color || '#6366f1'} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            layout="horizontal" align="center" verticalAlign="bottom"
            formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
