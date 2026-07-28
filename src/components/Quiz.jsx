import { useState, useEffect } from "react";
import QuizQuestion from "./QuizQuestion";
import Results from "./Results";

export default function Quiz({ questions, onRetest, retestLabel }) {
  const [answers, setAnswers] = useState(() => Array(questions.length).fill(null));
  const [submitted, setSubmitted] = useState(false);

  // Whenever the question set changes (e.g. user starts a retest), reset
  // local answer state instead of carrying over stale selections.
  useEffect(() => {
    setAnswers(Array(questions.length).fill(null));
    setSubmitted(false);
  }, [questions]);

  const allAnswered = answers.every((a) => a !== null);

  function selectAnswer(questionIndex, optionIndex) {
    if (submitted) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = optionIndex;
      return next;
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!allAnswered) return;
    setSubmitted(true);
  }

  const wrongQuestions = questions.filter((q, i) => answers[i] !== q.correctAnswer);
  const score = questions.length - wrongQuestions.length;

  return (
    <div className="quiz">
      <form onSubmit={handleSubmit}>
        {questions.map((q, i) => (
          <QuizQuestion
            key={i}
            questionNumber={i + 1}
            question={q.question}
            options={q.options}
            correctAnswer={q.correctAnswer}
            selected={answers[i]}
            submitted={submitted}
            onSelect={(optionIndex) => selectAnswer(i, optionIndex)}
          />
        ))}

        {!submitted && (
          <button type="submit" className="btn btn-primary" disabled={!allAnswered}>
            {allAnswered ? "Submit quiz" : `Answer all ${questions.length} questions`}
          </button>
        )}
      </form>

      {submitted && (
        <Results
          score={score}
          total={questions.length}
          wrongCount={wrongQuestions.length}
          onRetest={wrongQuestions.length > 0 ? () => onRetest(wrongQuestions) : null}
          retestLabel={retestLabel}
        />
      )}
    </div>
  );
}
