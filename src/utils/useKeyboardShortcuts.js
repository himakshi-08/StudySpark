import { useEffect } from "react";

/**
 * App-wide keyboard shortcuts (separate from the flashcard-deck-specific
 * ones in FlashcardDeck.jsx, which only apply while that deck is focused).
 *
 *   1        switch to Flashcards tab   (only once a study set exists)
 *   2        switch to Quiz tab         (only once a study set exists)
 *   d        toggle dark mode
 *   n        start a new study set      (only once a study set exists)
 *   ?        toggle the shortcuts help panel
 *
 * Always ignored while the user is typing in a text input/textarea, so
 * shortcuts never fight with normal typing.
 */
export function useKeyboardShortcuts({
  hasStudySet,
  onFlashcardsTab,
  onQuizTab,
  onToggleTheme,
  onNewSet,
  onToggleHelp,
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      const tag = document.activeElement?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "d") {
        onToggleTheme();
      } else if (e.key === "?") {
        onToggleHelp();
      } else if (hasStudySet && e.key === "1") {
        onFlashcardsTab();
      } else if (hasStudySet && e.key === "2") {
        onQuizTab();
      } else if (hasStudySet && e.key === "n") {
        onNewSet();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasStudySet, onFlashcardsTab, onQuizTab, onToggleTheme, onNewSet, onToggleHelp]);
}
