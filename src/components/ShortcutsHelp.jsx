const SHORTCUTS = [
  { keys: "1 / 2", desc: "Switch Flashcards / Quiz tab" },
  { keys: "← / →", desc: "Navigate flashcards" },
  { keys: "Space", desc: "Flip current flashcard" },
  { keys: "D", desc: "Toggle dark mode" },
  { keys: "N", desc: "Start a new study set" },
  { keys: "?", desc: "Toggle this panel" },
];

export default function ShortcutsHelp({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div
        className="shortcuts-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Keyboard shortcuts"
      >
        <div className="shortcuts-header">
          <span>Keyboard shortcuts</span>
          <button className="shortcuts-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <ul className="shortcuts-list">
          {SHORTCUTS.map((s) => (
            <li key={s.keys}>
              <kbd>{s.keys}</kbd>
              <span>{s.desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
