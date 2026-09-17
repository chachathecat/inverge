/** Move only the learner-selected range. Never infer an answer or replace one. */
export function moveCaptureSelectionToAnswer(input: {
  questionText: string; answerText: string; selectedFrom: string; start: number; end: number;
}) {
  const { questionText, answerText, selectedFrom, start, end } = input;
  if (selectedFrom !== questionText || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
      start < 0 || end > questionText.length || start >= end) return null;
  const selected = questionText.slice(start, end);
  if (!selected.trim()) return null;
  return {
    questionText: questionText.slice(0, start) + questionText.slice(end),
    answerText: answerText + (answerText && !answerText.endsWith("\n") ? "\n\n" : "") + selected,
  };
}
