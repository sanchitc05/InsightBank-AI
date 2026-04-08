export function SkeletonBox({ width = '100%', height = '16px', borderRadius = '6px' }) {
  return (
    <div
      style={{ width, height, borderRadius }}
      className="animate-pulse bg-slate-700"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card p-5 space-y-3">
      <SkeletonBox height="20px" width="60%" />
      <SkeletonBox height="14px" />
      <SkeletonBox height="14px" width="80%" />
    </div>
  );
}
