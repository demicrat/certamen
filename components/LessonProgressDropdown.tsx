'use client';
import axios from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/context/UserContext';
type Status = 'unstarted' | 'progress' | 'complete';
export default function LessonProgressDropdown({ userId, category, lesson, initialStatus }: { userId: string; category: string; lesson: string; initialStatus: Status }) {
 const client = useQueryClient(); const { fetchUserData } = useUser();
 const { mutate, isPending, error } = useMutation({
  mutationFn: async (status: Status) => { await axios.put('/api/user/' + userId + '/progress', { status, category, lesson }); },
  onSuccess: async () => { await client.invalidateQueries({ queryKey: ['lessonStatus', userId, category, lesson] }); fetchUserData(); }
 });
 return <div><label htmlFor="lesson-progress" className="sr-only">Lesson progress</label><select id="lesson-progress" value={initialStatus} disabled={isPending || !userId} onChange={e => mutate(e.target.value as Status)}><option value="unstarted">Ready to start</option><option value="progress">In progress</option><option value="complete">Completed ✓</option></select>{isPending && <span className="small-note ml-3">Saving…</span>}{error && <p className="text-red-600 mt-3" role="alert">Progress could not be saved. Please try again.</p>}</div>;
}