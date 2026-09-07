'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Trophy, Users, Zap, Radio } from 'lucide-react';
import { connectSocket } from '@/lib/socket';
export default function PlayPage() {
 const router = useRouter();
 const [code, setCode] = useState(''); const [busy, setBusy] = useState(''); const [error, setError] = useState('');
 const enter = async (create: boolean) => {
  if (busy) return; setBusy(create ? 'create' : 'join'); setError('');
  try {
   const socket = await connectSocket();
   const result = await socket.timeout(10000).emitWithAck(create ? 'create-room' : 'join-room', { code });
   if (result.error) throw new Error(result.error);
   router.push('/play/' + result.code);
  } catch (e) { setError(e instanceof Error ? e.message : 'Could not enter the room. Please try again.'); setBusy(''); }
 };
 return <div className="page-wrap"><div className="page-heading"><span className="eyebrow"><span className="live-dot" /> THE COMPETITION HUB</span><h1>Ready, set, <em>certamen.</em></h1><p>Rally your rivals. Trust your knowledge. Own the buzzer.</p></div><div className="play-grid"><section className="panel host-card"><span className="icon-tile"><Trophy size={30} /></span><span className="eyebrow">TAKE THE LEAD</span><h2>Your room.<br />Your competition.</h2><p>Host a live match, invite players with a four-letter code, and call the shots from the moderator desk.</p><div className="host-facts"><span><Users size={16} /> 1 host + up to 23 players</span><span><Radio size={16} /> Live questions & scorekeeping</span></div><button className="btn btn-lime" disabled={!!busy} onClick={() => enter(true)}>{busy === 'create' ? 'Opening your arena…' : 'Create a competition'}<ArrowRight size={19} /></button></section><section className="panel join-card"><span className="icon-tile lavender"><Zap size={29} /></span><span className="eyebrow">CHALLENGE ACCEPTED</span><h2>Got a room code?</h2><p>Your seat at the buzzer is waiting. Enter the code shared by your host.</p><form onSubmit={e => { e.preventDefault(); enter(false); }}><label htmlFor="room-code">ROOM CODE</label><input id="room-code" className="room-code-input" placeholder="ABCD" autoComplete="off" spellCheck={false} maxLength={4} value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} /><button className="btn btn-primary" disabled={code.length !== 4 || !!busy}>{busy === 'join' ? 'Joining the action…' : 'Join competition'}<ArrowRight size={19} /></button></form><p className="small-note">Everyone joins on their own device.</p></section></div>{error && <div className="error-banner" role="alert">{error}</div>}<div className="how-to"><span className="eyebrow">THE GAME PLAN</span><div><b>01</b><span>Watch the question unfold.</span></div><div><b>02</b><span>Hit <kbd>space</kbd> when you know.</span></div><div><b>03</b><span>Answer. Score. Repeat.</span></div></div></div>;
}