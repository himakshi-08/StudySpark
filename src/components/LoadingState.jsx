export default function LoadingState() {
  return (
    <div className="state-panel loading-panel" role="status" aria-live="polite">
      <div className="spark-spinner" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="state-title">Generating your study set…</p>
      <p className="state-subtitle">This usually takes a few seconds.</p>
      <div className="skeleton-row">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    </div>
  );
}
