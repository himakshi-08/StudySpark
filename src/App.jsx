import { useState, useEffect, useCallback } from "react";
import InputForm from "./components/InputForm";
import LoadingState from "./components/LoadingState";
import ErrorState from "./components/ErrorState";
import FlashcardDeck from "./components/FlashcardDeck";
import Quiz from "./components/Quiz";
import RefineForm from "./components/RefineForm";
import SavedSessions from "./components/SavedSessions";
import ShortcutsHelp from "./components/ShortcutsHelp";
import { useGenerateStudySet } from "./utils/useGenerateStudySet";
import { useRefineStudySet } from "./utils/useRefineStudySet";
import { useTheme } from "./utils/useTheme";
import { useKeyboardShortcuts } from "./utils/useKeyboardShortcuts";
import { listSessions, saveSession, updateSession, deleteSession } from "./utils/sessionStorage";

export default function App() {
  const { status, data, error, generate, reset, setData } = useGenerateStudySet();
  const refineHook = useRefineStudySet();
  const { theme, toggleTheme } = useTheme();

  const [lastTopic, setLastTopic] = useState("");
  const [tab, setTab] = useState("flashcards");
  const [quizQuestions, setQuizQuestions] = useState(null);
  const [isRetest, setIsRetest] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState(() => listSessions());
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Whenever a fresh study set arrives, point the quiz at its full
  // question list, drop retest state, and persist it as a new session.
  useEffect(() => {
    if (data && !sessionId) {
      setQuizQuestions(data.quiz);
      setIsRetest(false);
      setTab("flashcards");
      const saved = saveSession(data, lastTopic);
      setSessionId(saved.id);
      setSessions(listSessions());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function handleGenerate(topic) {
    setLastTopic(topic);
    setSessionId(null);
    generate(topic);
  }

  function handleRetest(wrongQuestions) {
    setQuizQuestions(wrongQuestions);
    setIsRetest(true);
    setTab("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const handleStartOver = useCallback(() => {
    reset();
    setQuizQuestions(null);
    setIsRetest(false);
    setSessionId(null);
  }, [reset]);

  function handleLoadSession(session) {
    setData(session.data);
    setLastTopic(session.topic || "");
    setQuizQuestions(session.data.quiz);
    setIsRetest(false);
    setTab("flashcards");
    setSessionId(session.id);
  }

  function handleDeleteSession(id) {
    deleteSession(id);
    setSessions(listSessions());
  }

  // Refinement loop: send the current set + instruction, replace state with
  // the (validated) edited version, and keep the saved session in sync.
  const handleRefine = useCallback(
    (instruction) => {
      refineHook.refine(data, instruction, (updated) => {
        setData(updated);
        setQuizQuestions(updated.quiz);
        setIsRetest(false);
        if (sessionId) {
          updateSession(sessionId, updated);
          setSessions(listSessions());
        }
      });
    },
    [data, sessionId, refineHook, setData]
  );

  // Global keyboard shortcuts — see useKeyboardShortcuts.js for the full list.
  useKeyboardShortcuts({
    hasStudySet: status === "success",
    onFlashcardsTab: () => setTab("flashcards"),
    onQuizTab: () => setTab("quiz"),
    onToggleTheme: toggleTheme,
    onNewSet: handleStartOver,
    onToggleHelp: () => setShowShortcuts((v) => !v),
  });

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">✦</span>
          <span className="brand-name">StudySpark</span>
        </div>
        <div className="header-actions">
          <button
            className="theme-toggle"
            onClick={() => setShowShortcuts(true)}
            aria-label="Show keyboard shortcuts"
            title="Keyboard shortcuts (?)"
          >
            ⌨
          </button>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode (D)`}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          {status === "success" && (
            <button className="btn btn-ghost" onClick={handleStartOver} title="New study set (N)">
              New study set
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {status !== "success" && (
          <section className="hero fade-in">
            <h1>Turn any notes into a study set</h1>
            <p>Paste your notes or name a topic — get flashcards and a quiz you can actually use.</p>
          </section>
        )}

        {(status === "idle" || status === "error") && (
          <>
            <InputForm onSubmit={handleGenerate} isLoading={false} initialValue={lastTopic} />
            {status === "idle" && (
              <SavedSessions
                sessions={sessions}
                onLoad={handleLoadSession}
                onDelete={handleDeleteSession}
              />
            )}
          </>
        )}

        {status === "loading" && <LoadingState />}

        {status === "error" && (
          <ErrorState message={error} onRetry={() => generate(lastTopic)} />
        )}

        {status === "success" && data && (
          <section className="study-set fade-in">
            <h2 className="study-set-title">{data.title}</h2>

            <div className="tabs" role="tablist">
              <button
                role="tab"
                aria-selected={tab === "flashcards"}
                className={`tab ${tab === "flashcards" ? "tab-active" : ""}`}
                onClick={() => setTab("flashcards")}
              >
                Flashcards ({data.flashcards.length})
              </button>
              <button
                role="tab"
                aria-selected={tab === "quiz"}
                className={`tab ${tab === "quiz" ? "tab-active" : ""}`}
                onClick={() => setTab("quiz")}
              >
                Quiz {isRetest ? `(retest, ${quizQuestions?.length})` : `(${data.quiz.length})`}
              </button>
            </div>

            <div key={tab} className="tab-content fade-in">
              {tab === "flashcards" && <FlashcardDeck cards={data.flashcards} />}

              {tab === "quiz" && quizQuestions && (
                <>
                  {isRetest && (
                    <div className="retest-banner">
                      Retesting {quizQuestions.length} question{quizQuestions.length === 1 ? "" : "s"} you got wrong.{" "}
                      <button
                        className="link-btn"
                        onClick={() => {
                          setQuizQuestions(data.quiz);
                          setIsRetest(false);
                        }}
                      >
                        Back to full quiz
                      </button>
                    </div>
                  )}
                  <Quiz
                    key={isRetest ? "retest" : "full"}
                    questions={quizQuestions}
                    onRetest={handleRetest}
                  />
                </>
              )}
            </div>

            <RefineForm
              onSubmit={handleRefine}
              isLoading={refineHook.status === "loading"}
              error={refineHook.status === "error" ? refineHook.error : null}
            />
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>  Press <kbd>?</kbd> for keyboard shortcuts.</p>
      </footer>

      <ShortcutsHelp open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
