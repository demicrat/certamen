'use client';
import { io } from 'socket.io-client';
const socket = io({ path: '/api/socket/io', autoConnect: false });
let connecting: Promise<typeof socket> | null = null;
export async function connectSocket() {
 if (socket.connected) return socket;
 if (!connecting) connecting = (async () => {
  const response = await fetch('/api/socket');
  if (!response.ok) throw new Error(response.status === 401 ? 'Please sign in to play.' : 'The arena could not connect. Try again.');
  return new Promise<typeof socket>((resolve, reject) => {
   const clear = () => { clearTimeout(timer); socket.off('connect', success); socket.off('connect_error', failure); };
   const success = () => { clear(); resolve(socket); };
   const failure = (error: Error) => { clear(); socket.disconnect(); reject(error); };
   const timer = setTimeout(() => failure(new Error('Connection timed out. Please try again.')), 12000);
   socket.once('connect', success); socket.once('connect_error', failure); socket.connect();
  });
 })().finally(() => { connecting = null; });
 return connecting;
}
export default socket;