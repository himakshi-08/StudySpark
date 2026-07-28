export default function ErrorState({ message, onRetry }) {
  return (
    <div className="state-panel error-panel" role="alert">
      <div className="state-icon" aria-hidden="true">⚠️</div>
      <p className="state-title">Couldn't generate your study set</p>
      <p className="state-subtitle">{message}</p>
      <button className="btn btn-primary" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
