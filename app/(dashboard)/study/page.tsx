'use client';
import Link from 'next/link';
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useUser } from '@/context/UserContext';
const subjects = [
 ['history', 'Roman history', 'From the kings of Rome to the fall of an empire. Know the moments that mattered.'],
 ['myth', 'Mythology', 'Gods, monsters, heroes, and the stories that refuse to get old.'],
 ['literature', 'Literature', 'Meet the poets, playwrights, and epic storytellers of the ancient world.'],
 ['vocab', 'Latin vocabulary', 'Small words. Big advantages. Build a vocabulary that travels through time.'],
 ['grammar', 'Latin grammar', 'Cases, clauses, and conjugations. Put every piece in its place.'],
 ['culture', 'Roman culture', 'Step into the homes, forums, and everyday lives of the Romans.'],
 ['pmaq', 'Phrases & mottos', 'The little Latin expressions that leave a lasting impression.'],
];
export default function StudyPage() {
 const { data: session } = useSession(); const { userData } = useUser();
 const completed = (userData?.lessons || []).filter((l: string) => l.endsWith('-complete')).length;
 return <div className="page-wrap"><section className="training-hero"><div><span className="eyebrow"><Sparkles size={15} /> THE TRAINING GROUND</span><h1>Hey, {session?.user.username || 'scholar'}.<br />Let’s build your edge.</h1><p>Every great buzz starts with a little curiosity.<br />Pick a subject and make your next round count.</p></div><BookOpen size={105} strokeWidth={1.1} /></section><div className="panel-title"><h2>Choose your discipline</h2><span className="pill">{completed} LESSON{completed === 1 ? '' : 'S'} COMPLETE</span></div><div className="study-grid">{subjects.map(([id, title, description], i) => <Link href={'/study/' + id} className="study-card" key={id}><span className="study-number">DISCIPLINE {String(i + 1).padStart(2, '0')}{userData?.specialties?.includes(id) ? ' · YOUR SPECIALTY' : ''}</span><h3>{title}</h3><p>{description}</p><span className="study-link">{id === 'history' ? 'Explore lessons' : 'Explore discipline'}<ArrowRight size={17} /></span></Link>)}</div><section className="practice-strip"><div><h3>Put that knowledge to the test.</h3><p>Your next great “I knew that!” moment is waiting in the arena.</p></div><Link className="btn btn-primary" href="/play">Time to compete <ArrowRight size={18} /></Link></section></div>;
}