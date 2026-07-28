export default function QuizQuestion({
  question,
  options,
  correctAnswer,
  questionNumber,
  selected,
  submitted,
  onSelect,
}) {
  return (
    <fieldset className="quiz-question" disabled={submitted}>
      <legend className="quiz-question-text">
        <span className="quiz-question-number">Q{questionNumber}</span> {question}
      </legend>
      <div className="quiz-options">
        {options.map((option, i) => {
          const isSelected = selected === i;
          const isCorrectOption = submitted && i === correctAnswer;
          const isWrongSelected = submitted && isSelected && i !== correctAnswer;

          return (
            <label
              key={i}
              className={[
                "quiz-option",
                isSelected && !submitted ? "quiz-option-selected" : "",
                isCorrectOption ? "quiz-option-correct" : "",
                isWrongSelected ? "quiz-option-wrong" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <input
                type="radio"
                name={`question-${questionNumber}`}
                checked={isSelected}
                onChange={() => onSelect(i)}
              />
              <span>{option}</span>
              {isCorrectOption && <span className="quiz-badge">Correct</span>}
              {isWrongSelected && <span className="quiz-badge quiz-badge-wrong">Your answer</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
