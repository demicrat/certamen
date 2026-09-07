import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { getToken } from 'next-auth/jwt';
type Context = { params: Promise<{ id: string }> };
const validPath = (value: unknown) => typeof value === 'string' && /^[a-z0-9-]+$/i.test(value);
const statuses = ['unstarted', 'progress', 'complete'];
export async function GET(req: NextRequest, { params }: Context) {
 const token = await getToken({ req }); const { id } = await params;
 if (!token || token.id !== id) return NextResponse.json({ message: 'Not authorized' }, { status: 403 });
 const category = req.nextUrl.searchParams.get('category'); const lesson = req.nextUrl.searchParams.get('lesson');
 if (!validPath(category) || !validPath(lesson)) return NextResponse.json({ message: 'Invalid lesson' }, { status: 400 });
 try {
  const doc = await db.collection('users').doc(id).get();
  if (!doc.exists) return NextResponse.json({ message: 'User not found' }, { status: 404 });
  const lessons: string[] = doc.data()?.lessons || [];
  const suffix = category + '/' + lesson + '-';
  const saved = lessons.find(l => typeof l === 'string' && l.startsWith(suffix)) || lessons.find(l => typeof l === 'string' && l.includes('/' + suffix));
  const status = saved?.slice(saved.lastIndexOf('-') + 1);
  return NextResponse.json({ status: status && statuses.includes(status) ? status : 'unstarted' });
 } catch { return NextResponse.json({ message: 'Could not load progress' }, { status: 500 }); }
}
export async function PUT(req: NextRequest, { params }: Context) {
 const token = await getToken({ req }); const { id } = await params;
 if (!token || token.id !== id) return NextResponse.json({ message: 'Not authorized' }, { status: 403 });
 let body; try { body = await req.json(); } catch { return NextResponse.json({ message: 'Invalid request' }, { status: 400 }); }
 const { category, lesson, status } = body;
 if (!validPath(category) || !validPath(lesson) || !statuses.includes(status)) return NextResponse.json({ message: 'Invalid progress' }, { status: 400 });
 try {
  const ref = db.collection('users').doc(id);
  await db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
   const doc = await transaction.get(ref); if (!doc.exists) throw new Error('Missing user');
   const prefix = category + '/' + lesson + '-';
   const lessons = (doc.data()?.lessons || []).filter((l: unknown) => typeof l === 'string' && !l.startsWith(prefix) && !l.includes('/' + prefix));
   lessons.push(prefix + status); transaction.update(ref, { lessons });
  });
  return NextResponse.json({ status });
 } catch { return NextResponse.json({ message: 'Could not save progress' }, { status: 500 }); }
}