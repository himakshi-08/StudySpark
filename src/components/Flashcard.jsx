import { useState, useEffect } from "react";

export default function Flashcard({ question, answer, cardKey, externalFlipSignal }) {
  const [flipped, setFlipped] = useState(false);

  // Reset to the question side whenever we navigate to a different card.
  useEffect(() => setFlipped(false), [cardKey]);

  // Respond to the spacebar shortcut from FlashcardDeck (any change in the
  // signal value means "flip", regardless of direction).
  useEffect(() => {
    if (externalFlipSignal) setFlipped((f) => !f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalFlipSignal]);

  function toggle() {
    setFlipped((f) => !f);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      toggle();
    }
  }

  return (
    <div
      className={`flashcard ${flipped ? "flashcard-flipped" : ""}`}
      onClick={toggle}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label="Flip flashcard"
    >
      <div className="flashcard-inner">
        <div className="flashcard-face flashcard-front">
          <span className="flashcard-eyebrow">Question</span>
          <p>{question}</p>
          <span className="flashcard-hint">Tap to reveal answer</span>
        </div>
        <div className="flashcard-face flashcard-back">
          <span className="flashcard-eyebrow">Answer</span>
          <p>{answer}</p>
          <span className="flashcard-hint">Tap to see question</span>
        </div>
      </div>
    </div>
  );
}
