'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { dueCards, isCorrect, parseReviews, scheduleReview, type PracticeCard, type ReviewState } from '@/lib/practice';

export default function LessonPractice({ cards, userId, reviewOnly = false }: { cards: PracticeCard[]; userId: string; reviewOnly?: boolean }) {
  const [reviews, setReviews] = useState<ReviewState>({});
  const [loaded, setLoaded] = useState(false);
  const [warning, setWarning] = useState('');
  const [queue, setQueue] = useState<PracticeCard[]>([]);
  const [started, setStarted] = useState(false);
  const [position, setPosition] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<'correct' | 'incorrect' | 'shown' | null>(null);
  const [now, setNow] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const storageKey = 'certamen:review:v1:' + userId;
  useEffect(() => {
    try { setReviews(parseReviews(localStorage.getItem(storageKey))); }
    catch { setWarning('Saved review could not load. Practice still works for this session.'); }
    setNow(Date.now()); setLoaded(true);
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [storageKey]);
  useEffect(() => { if (started && !result) input.current?.focus(); }, [started, position, result]);
  const due = dueCards(cards, reviews, now);
  const introduced = cards.filter(c => reviews[c.id]);
  const nextDue = introduced.length ? Math.min(...introduced.map(c => reviews[c.id].due)) : null;
  const card = queue[position];
  const begin = () => {
    setQueue(reviewOnly ? dueCards(cards, reviews, Date.now()) : cards);
    setStarted(true); setPosition(0); setResult(null); setAnswer('');
  };
  const grade = (correct: boolean) => {
    // Merge the latest storage so another tab's completed cards are preserved.
    let current = reviews;
    try { current = { ...reviews, ...parseReviews(localStorage.getItem(storageKey)) }; } catch { /* use session state */ }
    const updated = { ...current, [card.id]: scheduleReview(current[card.id], correct, Date.now()) };
    setReviews(updated); setNow(Date.now());
    try { localStorage.setItem(storageKey, JSON.stringify(updated)); }
    catch { setWarning('Review could not be saved. Your answers are kept for this session only.'); }
    setPosition(p => p + 1); setAnswer(''); setResult(null);
  };
  return <section className="lesson-practice" aria-labelledby="practice-heading">
    <span className="eyebrow">RECALL, THEN RETURN</span>
    <h2 id="practice-heading">{reviewOnly ? 'Review what you have learned' : 'Practice this lesson'}</h2>
    <p>Fill in the blank from memory. Missed cards return in one minute; correct cards return after 1, 3, 7, 14, 30, then 60 days.</p>
    <p className="small-note">Cards join your review when you finish an answer below. Progress is saved for your account in this browser.</p>
    {warning && <p role="alert">{warning}</p>}
    {!loaded || !userId ? <p role="status">Loading your practice...</p> : !started ? <>
      <p>{reviewOnly ? `${due.length} due · ${introduced.length} practiced cards` : `${cards.length} questions · ${due.length} due for review`}</p>
      {reviewOnly && !due.length ? <p role="status">{introduced.length ? `You are caught up. Next review: ${new Date(nextDue!).toLocaleString()}.` : 'Complete some lesson practice to build your review queue.'}</p> : <button className="btn btn-primary" onClick={begin}>{reviewOnly ? 'Start due review' : 'Start lesson practice'}</button>}
    </> : card ? <div className="recall-card">
      <span className="eyebrow">QUESTION {position + 1} OF {queue.length}</span>
      {reviewOnly && card.lesson && <Link className="lesson-back" href={'/study/history/' + card.lesson}>{card.lessonTitle}</Link>}
      <h3>{card.prompt}</h3>
      <form onSubmit={e => { e.preventDefault(); if (!result && answer.trim()) setResult(isCorrect(card, answer) ? 'correct' : 'incorrect'); }}>
        <label htmlFor="recall-answer">Fill in the blank</label>
        <input id="recall-answer" ref={input} value={answer} onChange={e => setAnswer(e.target.value)} disabled={!!result} autoComplete="off" maxLength={300} />
        {!result && <div className="button-row"><button className="btn btn-primary" disabled={!answer.trim()}>Check answer</button><button className="btn" type="button" onClick={() => setResult('shown')}>Show answer</button></div>}
      </form>
      {result && <div className="recall-feedback" role="status">
        <strong>{result === 'correct' ? 'Correct!' : result === 'shown' ? 'Answer revealed' : 'Not quite.'}</strong>
        <p className="recall-key">{card.answer}</p><p>{card.explanation}</p>
        <div className="button-row"><button className="btn btn-primary" onClick={() => grade(result === 'correct')}>{result === 'correct' ? 'Remembered - continue' : 'Review soon - continue'}</button>
        {result === 'incorrect' && <button className="btn" onClick={() => grade(true)}>My wording was equivalent</button>}</div>
      </div>}
    </div> : <div role="status"><h3>Practice complete</h3><p>Your reviewed cards have been scheduled. Return here for another lesson session or open due review when they are ready.</p><button className="btn" onClick={() => { setStarted(false); setNow(Date.now()); }}>Back to practice overview</button></div>}
    <Link className="lesson-back" href={reviewOnly ? '/study/history' : '/study/history/practice'}>{reviewOnly ? 'Explore history lessons' : 'Review practiced history'}</Link>
  </section>;
}
