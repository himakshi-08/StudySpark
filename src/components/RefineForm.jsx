import { useState } from "react";

const SUGGESTIONS = [
  "Add 3 more flashcards",
  "Make the quiz easier",
  "Add a flashcard about edge cases",
];

export default function RefineForm({ onSubmit, isLoading, error }) {
  const [value, setValue] = useState("");

  function submit(instruction) {
    const trimmed = instruction.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setValue("");
  }

  function handleSubmit(e) {
    e.preventDefault();
    submit(value);
  }

  return (
    <div className="refine-panel">
      <p className="refine-label">Not quite right? Ask for a change instead of starting over.</p>
      <form className="refine-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="refine-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. add 3 more flashcards about subnetting"
          disabled={isLoading}
        />
        <button type="submit" className="btn btn-secondary" disabled={!value.trim() || isLoading}>
          {isLoading ? "Applying…" : "Apply"}
        </button>
      </form>
      <div className="refine-suggestions">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="chip"
            onClick={() => submit(s)}
            disabled={isLoading}
          >
            {s}
          </button>
        ))}
      </div>
      {error && <p className="refine-error">{error}</p>}
    </div>
  );
}
