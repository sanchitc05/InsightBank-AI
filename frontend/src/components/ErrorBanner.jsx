export default function ErrorBanner({ message, onRetry }) {
  return (
    <div
      className="flex items-center justify-between p-4 rounded-lg mb-4"
      style={{
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
      }}
    >
      <div className="flex items-center gap-3">
        <span style={{ color: '#ef4444' }}>✗</span>
        <span style={{ color: '#fca5a5', fontSize: '14px' }}>{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium px-3 py-1 rounded"
          style={{ color: '#ef4444', cursor: 'pointer' }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
