export interface PracticeCard {
  id: string;
  prompt: string;
  answer: string;
  aliases?: string[];
  explanation: string;
  lesson?: string;
  lessonTitle?: string;
}
export interface Review { due: number; streak: number }
export type ReviewState = Record<string, Review>;
const intervals = [1, 3, 7, 14, 30, 60];

export function normalizeAnswer(answer: string) {
  return answer.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[.,!?;:'"’“”]/g, '').replace(/[-\s]+/g, ' ').trim();
}
export function isCorrect(card: PracticeCard, answer: string) {
  const normalized = normalizeAnswer(answer);
  return !!normalized && [card.answer, ...(card.aliases || [])].some(a => normalizeAnswer(a) === normalized);
}
export function scheduleReview(previous: Review | undefined, correct: boolean, now: number): Review {
  const streak = correct ? Math.min((previous?.streak || 0) + 1, intervals.length) : 0;
  return { streak, due: now + (correct ? intervals[streak - 1] * 86400000 : 60000) };
}
export function parseReviews(raw: string | null): ReviewState {
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid review data');
  const result: ReviewState = {};
  for (const [id, value] of Object.entries(parsed)) {
    if (value && typeof value === 'object' && 'due' in value && 'streak' in value &&
      typeof value.due === 'number' && Number.isFinite(value.due) && value.due >= 0 &&
      typeof value.streak === 'number' && Number.isInteger(value.streak) && value.streak >= 0 && value.streak <= intervals.length) {
      result[id] = { due: value.due, streak: value.streak };
    }
  }
  return result;
}
export function dueCards(cards: PracticeCard[], reviews: ReviewState, now: number) {
  return cards.filter(c => reviews[c.id] && reviews[c.id].due <= now)
    .sort((a, b) => reviews[a.id].due - reviews[b.id].due);
}
