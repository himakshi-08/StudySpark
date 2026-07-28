/**
 * Turns raw text from the model into validated study data, or throws a
 * ValidationError with a message that's safe to show the user.
 *
 * This is the single place that decides whether AI output is trustworthy
 * enough to enter application state. Nothing downstream should have to
 * re-check shape.
 */

export class ValidationError extends Error {}

function stripCodeFences(text) {
  // Some models wrap JSON in ```json ... ``` even when told not to.
  // Strip that defensively rather than failing on an easy case.
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateFlashcard(card, index) {
  if (typeof card !== "object" || card === null) {
    throw new ValidationError(`Flashcard ${index + 1} is not a valid object.`);
  }
  if (!isNonEmptyString(card.question) || !isNonEmptyString(card.answer)) {
    throw new ValidationError(`Flashcard ${index + 1} is missing a question or answer.`);
  }
  return { question: card.question.trim(), answer: card.answer.trim() };
}

function validateQuizQuestion(q, index) {
  if (typeof q !== "object" || q === null) {
    throw new ValidationError(`Quiz question ${index + 1} is not a valid object.`);
  }
  if (!isNonEmptyString(q.question)) {
    throw new ValidationError(`Quiz question ${index + 1} is missing question text.`);
  }
  if (!Array.isArray(q.options) || q.options.length < 2) {
    throw new ValidationError(`Quiz question ${index + 1} needs at least 2 options.`);
  }
  if (!q.options.every(isNonEmptyString)) {
    throw new ValidationError(`Quiz question ${index + 1} has an empty option.`);
  }
  const correctAnswer = Number(q.correctAnswer);
  if (
    !Number.isInteger(correctAnswer) ||
    correctAnswer < 0 ||
    correctAnswer >= q.options.length
  ) {
    throw new ValidationError(`Quiz question ${index + 1} has an invalid correctAnswer index.`);
  }
  return {
    question: q.question.trim(),
    options: q.options.map((o) => o.trim()),
    correctAnswer,
  };
}

/**
 * @param {string} rawText - raw text returned by the model (may include
 *   stray code fences or whitespace, but should be JSON underneath)
 * @returns {{ title: string, flashcards: Array, quiz: Array }}
 * @throws {ValidationError}
 */
export function validateStudyData(rawText) {
  if (!isNonEmptyString(rawText)) {
    throw new ValidationError("The AI returned an empty response.");
  }

  const candidate = stripCodeFences(rawText);

  let data;
  try {
    data = JSON.parse(candidate);
  } catch {
    throw new ValidationError("The AI returned malformed JSON that couldn't be parsed.");
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new ValidationError("The AI response wasn't a JSON object.");
  }

  if (!isNonEmptyString(data.title)) {
    throw new ValidationError("The AI response is missing a title.");
  }

  if (!Array.isArray(data.flashcards) || data.flashcards.length === 0) {
    throw new ValidationError("The AI response has no flashcards.");
  }

  if (!Array.isArray(data.quiz) || data.quiz.length === 0) {
    throw new ValidationError("The AI response has no quiz questions.");
  }

  const flashcards = data.flashcards.map(validateFlashcard);
  const quiz = data.quiz.map(validateQuizQuestion);

  return { title: data.title.trim(), flashcards, quiz };
}
