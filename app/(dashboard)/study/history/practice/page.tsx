'use client';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import LessonPractice from '@/components/LessonPractice';
import type { PracticeCard } from '@/lib/practice';

export default function HistoryPracticePage() {
  const { data: session } = useSession();
  const userId = session?.user.id || '';
  const { data, isPending, error, refetch } = useQuery({ queryKey: ['historyPractice'], queryFn: async (): Promise<{ cards: PracticeCard[] }> => {
    const response = await fetch('/api/lessons/history/practice');
    if (!response.ok) throw new Error('Practice could not load. Please try again.');
    return response.json();
  } });
  return <div className="page-wrap"><Link className="lesson-back" href="/study/history">Back to history lessons</Link>
    <div className="page-heading"><span className="eyebrow">A LITTLE EVERY DAY</span><h1>History recall<em>.</em></h1><p>A spaced review of the history questions you have practiced.</p></div>
    <div className="panel">{isPending ? <p role="status">Loading your cards...</p> : error ? <><p role="alert">{error.message}</p><button className="btn" onClick={() => refetch()}>Try again</button></> : userId && <LessonPractice key={userId} cards={data.cards} userId={userId} reviewOnly />}</div>
  </div>;
}
