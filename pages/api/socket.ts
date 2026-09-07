import type { NextApiRequest } from 'next';
import { Server } from 'socket.io';
import { getToken } from 'next-auth/jwt';
import type { NextApiResponseServerIO } from '@/types/next';
import { attachCompetitionServer } from '@/lib/competition-server';
export const config = { api: { bodyParser: false } };
export default async function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
 const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
 if (!token?.id) { res.status(401).json({ error: 'Sign in to enter the arena.' }); return; }
 if (!res.socket.server.io) {
  const io = new Server(res.socket.server, { path: '/api/socket/io', maxHttpBufferSize: 8192 });
  io.use(async (socket, next) => {
   try {
    const request = socket.request as NextApiRequest;
    request.cookies = Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map(part => { const i = part.indexOf('='); return [part.slice(0, i).trim(), decodeURIComponent(part.slice(i + 1))]; }));
    const user = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!user?.id) return next(new Error('Sign in to enter the arena.'));
    socket.data.userId = String(user.id); socket.data.name = String(user.username || 'Player');
    next();
   } catch { next(new Error('Could not verify your session. Please sign in again.')); }
  });
  attachCompetitionServer(io); res.socket.server.io = io;
 }
 res.status(200).json({ ready: true });
}