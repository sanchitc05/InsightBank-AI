import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="text-center">
        <h1
          className="text-7xl font-extrabold mb-4"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          404
        </h1>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          This page doesn't exist.
        </h2>
        <p className="text-base mb-8" style={{ color: 'var(--text-secondary)' }}>
          The page you're looking for has wandered off.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-lg font-medium text-white transition-all hover:shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            cursor: 'pointer',
          }}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
