'use client';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import Markdown from 'markdown-to-jsx';
import LessonPractice from '@/components/LessonPractice';
import TableOfContents from '@/components/TableOfContents';
import LessonProgressDropdown from '@/components/LessonProgressDropdown';
export default function StudyLessonPage() {
 const { category, lesson } = useParams<{ category: string; lesson: string }>()!;
 const { data: session } = useSession(); const userId = session?.user.id || '';
 const { data, isPending, error, refetch } = useQuery({ queryKey: ['lesson', category, lesson], queryFn: async () => {
  const res = await fetch('/api/lessons/' + encodeURIComponent(category) + '/' + encodeURIComponent(lesson));
  if (!res.ok) throw new Error(res.status === 404 ? 'This lesson is not available.' : 'Could not load the lesson. Please try again.');
  return res.json();
 } });
 const { data: progress, isPending: progressPending, error: progressError } = useQuery({ queryKey: ['lessonStatus', userId, category, lesson], enabled: !!userId, queryFn: async () => {
  const res = await fetch('/api/user/' + userId + '/progress?' + new URLSearchParams({ category, lesson }));
  if (!res.ok) throw new Error('Progress could not load. Refresh before changing your status.');
  return res.json();
 } });
 return <div className="page-wrap"><Link className="lesson-back" href={'/study/' + category}><ArrowLeft size={16} /> Back to lessons</Link>{isPending ? <div className="panel" role="status">Opening the books...</div> : error ? <div className="panel empty-state"><BookOpen size={40} /><h2>Let’s get you back on track.</h2><p role="alert">{error.message}</p><button className="btn" onClick={() => refetch()}>Try again</button></div> : <div className="lesson-page"><aside className="panel lesson-toc"><span className="eyebrow">IN THIS LESSON</span><TableOfContents content={data.content || ''} /></aside><article className="panel lesson-article"><span className="eyebrow">THE TRAINING GROUND - LESSON {lesson}</span><h1>{data.title}</h1><p className="description">{data.description}</p>{data.author && <p className="small-note">By {data.author}</p>}<div className="my-6">{progressError ? <p role="alert">{progressError.message}</p> : progressPending ? <p className="small-note">Loading your progress...</p> : <LessonProgressDropdown key={category + lesson + progress?.status} userId={userId} category={category} lesson={lesson} initialStatus={progress?.status || 'unstarted'} />}</div><div className="lesson-content"><Markdown options={{ slugify: text => text.toLowerCase().replace(/[^a-z0-9]+/g, "-") }}>{data.content || ''}</Markdown></div><div className="lesson-pagination">{Number(lesson) > 1 && <Link className="btn" href={'/study/' + category + '/' + (Number(lesson) - 1)}>Previous lesson</Link>}<Link className="btn" href={'/study/' + category}>Back to your learning path</Link>{data.nextLesson && <Link className="btn btn-primary" href={'/study/' + category + '/' + data.nextLesson}>Next lesson</Link>}</div>{data.practice?.length > 0 && userId && <LessonPractice key={userId + category + lesson} cards={data.practice} userId={userId} />}</article></div>}</div>;
}