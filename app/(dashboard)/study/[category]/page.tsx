'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/context/UserContext';
const names: Record<string, string> = { history: 'Roman history', myth: 'Mythology', literature: 'Literature', vocab: 'Latin vocabulary', grammar: 'Latin grammar', culture: 'Roman culture', pmaq: 'Phrases & mottos' };
interface Lesson { number: string; title: string; description: string; frequency?: string }
export default function StudyCategoryPage() {
 const { category } = useParams<{ category: string }>()!; const { userData } = useUser();
 const { data: lessons, isPending, error, refetch } = useQuery({ queryKey: ['categoryLessons', category], queryFn: async (): Promise<Lesson[]> => {
  const response = await fetch('/api/lessons/' + encodeURIComponent(category));
  if (response.status === 404) return [];
  if (!response.ok) throw new Error('We could not load these lessons.');
  const data = await response.json();
  return Promise.all(data.lessonFiles.map(async (file: string) => {
   const number = file.replace('.md', ''); const res = await fetch('/api/lessons/' + encodeURIComponent(category) + '/' + number);
   if (!res.ok) throw new Error('A lesson could not load. Please try again.');
   return { ...await res.json(), number };
  }));
 } });
 return <div className="page-wrap"><Link className="lesson-back" href="/study"><ArrowLeft size={16} /> Back to training</Link><div className="page-heading"><span className="eyebrow">ONE LESSON CLOSER TO YOUR NEXT WIN</span><h1>{names[category] || 'Unknown discipline'}<em>.</em></h1><p>Follow your curiosity. Build your knowledge. Come back stronger.</p>{category === 'history' && <div className="button-row"><Link className="btn btn-primary" href="/study/history/practice">Review practiced history</Link><a className="btn" href="/ConnorHarrison.pdf">Full guide by Connor Harrison</a></div>}</div>{isPending ? <div className="panel" role="status">Getting your lessons ready...</div> : error ? <div className="panel"><p role="alert">{error.message}</p><button className="btn" onClick={() => refetch()}>Try again</button></div> : !lessons?.length ? <div className="panel empty-state"><BookOpen size={40} /><h2>{names[category] ? 'Good things are in the works.' : 'Discipline not found.'}</h2><p>{names[category] ? 'Lessons for this discipline aren’t available yet. Explore Roman history or try the mixed classics question pack in the arena.' : 'Choose a discipline from the training ground.'}</p><Link className="btn btn-primary" href="/study/history">Explore Roman history <ArrowRight size={17} /></Link></div> : <div className="lesson-list">{lessons.map(lesson => {
 const status = userData?.lessons?.includes(category + '/' + lesson.number + '-complete') ? 'COMPLETE' : userData?.lessons?.includes(category + '/' + lesson.number + '-progress') ? 'IN PROGRESS' : 'READY TO START';
 return <Link className="lesson-row" href={'/study/' + category + '/' + lesson.number} key={lesson.number}><span>{lesson.number.padStart(2, '0')}</span><div><span className="eyebrow">{status}</span><h2>{lesson.title}</h2><p>{lesson.description}</p></div><ArrowRight size={22} /></Link>;
 })}</div>}</div>;
}