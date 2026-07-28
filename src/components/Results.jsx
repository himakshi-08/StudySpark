export default function Results({ score, total, wrongCount, onRetest, retestLabel }) {
  const pct = Math.round((score / total) * 100);

  return (
    <div className="results-panel">
      <p className="results-score">
        {score} / {total} <span className="results-pct">({pct}%)</span>
      </p>
      {wrongCount === 0 ? (
        <p className="results-message results-perfect">Perfect score. Nice work.</p>
      ) : (
        <p className="results-message">
          {wrongCount} question{wrongCount === 1 ? "" : "s"} to review.
        </p>
      )}
      {onRetest && (
        <button className="btn btn-primary" onClick={onRetest}>
          {retestLabel || `Retest ${wrongCount} incorrect answer${wrongCount === 1 ? "" : "s"}`}
        </button>
      )}
    </div>
  );
}
