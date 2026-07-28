import { useState } from "react";

const PLACEHOLDER =
  "Paste your notes, or just describe a topic — e.g. \"Operating systems: processes, threads, and scheduling algorithms\"";

export default function InputForm({ onSubmit, isLoading, initialValue = "" }) {
  const [value, setValue] = useState(initialValue);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
  }

  return (
    <form className="input-form" onSubmit={handleSubmit}>
      <label htmlFor="topic-input" className="input-label">
        What do you want to study?
      </label>
      <textarea
        id="topic-input"
        className="topic-textarea"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={5}
        disabled={isLoading}
      />
      <div className="input-form-footer">
        <span className="char-count">{value.length} characters</span>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!value.trim() || isLoading}
        >
          {isLoading ? "Generating…" : "Generate study set"}
        </button>
      </div>
    </form>
  );
}
