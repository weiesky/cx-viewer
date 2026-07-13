/**
 * Parse request_user_input results into the question-text map consumed by the
 * conversation card. This is a projection-only adapter: callers pass the raw
 * tool result and tool input, and neither value is mutated.
 */

function answerText(value) {
  const values = Array.isArray(value?.answers)
    ? value.answers
    : (Array.isArray(value) ? value : null);
  if (values) return values.map(item => String(item ?? '')).join(', ');
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof value.answer === 'string') return value.answer;
  if (value == null) return '';
  return String(value);
}

function parseStructuredAnswers(text, questions) {
  if (typeof text !== 'string' || text.trim()[0] !== '{') return null;
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return null;
  }
  const source = payload?.answers;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;

  const questionById = new Map();
  for (const question of Array.isArray(questions) ? questions : []) {
    if (!question || typeof question !== 'object') continue;
    if (question.id) questionById.set(question.id, question);
    if (question.question) questionById.set(question.question, question);
  }

  const answers = {};
  for (const [id, value] of Object.entries(source)) {
    const question = questionById.get(id);
    answers[question?.question || id] = answerText(value);
  }
  return answers;
}

/**
 * Supports both historical `"question"="answer"` results and Codex's native
 * `{ answers: { questionId: { answers: [...] } } }` function-call output.
 */
export function parseAskAnswerText(text, questions = []) {
  const structured = parseStructuredAnswers(text, questions);
  if (structured) return structured;

  const answers = {};
  const re = /"([^"]+)"="([^"]*)"/g;
  let match;
  while ((match = re.exec(text || '')) !== null) {
    answers[match[1]] = match[2];
  }
  return answers;
}
