import { useState, useEffect, useCallback, useRef } from "react";
import Flashcard from "./Flashcard";

export default function FlashcardDeck({ cards }) {
  const [index, setIndex] = useState(0);
  const flipSignalRef = useRef(0);
  const [flipSignal, setFlipSignal] = useState(0);

  const isFirst = index === 0;
  const isLast = cards && index === cards.length - 1;

  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(
    () => setIndex((i) => (cards ? Math.min(cards.length - 1, i + 1) : i)),
    [cards]
  );
  const flip = useCallback(() => {
    flipSignalRef.current += 1;
    setFlipSignal(flipSignalRef.current);
  }, []);

  // Keyboard navigation: <- / -> to move between cards, Space to flip.
  // Only active while the deck is on screen; ignores keystrokes while the
  // user is typing in a text field elsewhere on the page.
  useEffect(() => {
    function handleKeyDown(e) {
      const tag = document.activeElement?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === " ") {
        e.preventDefault();
        flip();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goPrev, goNext, flip]);

  if (!cards || cards.length === 0) {
    return <p className="empty-note">No flashcards to show.</p>;
  }

  const current = cards[index];

  return (
    <div className="flashcard-deck">
      <p className="deck-progress">
        Card {index + 1} of {cards.length}
        <span className="deck-hint"> · use ← → to navigate, space to flip</span>
      </p>

      <Flashcard
        cardKey={index}
        question={current.question}
        answer={current.answer}
        externalFlipSignal={flipSignal}
      />

      <div className="deck-nav">
        <button className="btn btn-secondary" onClick={goPrev} disabled={isFirst}>
          ← Previous
        </button>
        <button className="btn btn-secondary" onClick={goNext} disabled={isLast}>
          Next →
        </button>
      </div>
    </div>
  );
}
