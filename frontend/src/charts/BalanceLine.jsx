import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatINR, formatDate } from '../utils/format';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          {data.dateLabel}
        </p>
        <p style={{ fontSize: '12px', color: '#00d4ff' }}>
          Balance: {formatINR(data.balance)}
        </p>
      </div>
    );
  }
  return null;
};

export default function BalanceLine({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-8 text-center" style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>No balance data available</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        💳 Balance Trend
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border-color)' }}
            interval={Math.max(0, Math.floor(data.length / 8) - 1)}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border-color)' }}
            tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="balance"
            name="Balance"
            stroke="#00d4ff"
            dot={false}
            strokeWidth={2.5}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
