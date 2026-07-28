function formatWhen(ts) {
  const diffMs = Date.now() - ts;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function SavedSessions({ sessions, onLoad, onDelete }) {
  if (!sessions.length) return null;

  return (
    <div className="saved-sessions">
      <p className="saved-sessions-title">Continue a saved session</p>
      <ul className="saved-sessions-list">
        {sessions.map((s) => (
          <li key={s.id} className="saved-session-item">
            <button className="saved-session-open" onClick={() => onLoad(s)}>
              <span className="saved-session-name">{s.data.title}</span>
              <span className="saved-session-meta">
                {s.data.flashcards.length} cards · {s.data.quiz.length} questions · {formatWhen(s.savedAt)}
              </span>
            </button>
            <button
              className="saved-session-delete"
              onClick={() => onDelete(s.id)}
              aria-label={`Delete ${s.data.title}`}
              title="Delete"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
