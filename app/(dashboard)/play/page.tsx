'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Trophy, Zap } from 'lucide-react';
import { connectSocket } from '@/lib/socket';
import type { GameMode } from '@/lib/competition';

const modes: { id: GameMode; title: string; description: string }[] = [
 { id: 'solo', title: 'Solo', description: 'Play at your own pace. Submit your answer, reveal the key, and check it yourself.' },
 { id: 'pvp', title: 'PvP', description: 'Everyone plays. Everyone sees the answer and must agree before points are awarded.' },
 { id: 'teams', title: 'Teams', description: 'A moderator runs the match. Add teams, assign players, and switch teams between questions.' },
];
export default function PlayPage() {
 const router = useRouter();
 const [mode, setMode] = useState<GameMode>('solo');
 const [code, setCode] = useState(''); const [busy, setBusy] = useState(''); const [error, setError] = useState('');
 const enter = async (create: boolean) => {
  if (busy) return; setBusy(create ? 'create' : 'join'); setError('');
  try {
   const socket = await connectSocket();
   const result = await socket.timeout(10000).emitWithAck(create ? 'create-room' : 'join-room', { code, mode });
   if (result.error) throw new Error(result.error);
   router.push('/play/' + result.code);
  } catch (e) { setError(e instanceof Error ? e.message : 'Could not enter the room. Please try again.'); setBusy(''); }
 };
 return <div className="page-wrap">
  <div className="page-heading"><span className="eyebrow"><span className="live-dot" /> THE COMPETITION HUB</span><h1>Ready, set, <em>certamen.</em></h1><p>Practice solo, challenge friends, or bring your team.</p></div>
  <div className="play-grid"><section className="panel host-card"><span className="icon-tile"><Trophy size={30} /></span><h2>Choose your game.</h2>
   <fieldset className="mode-options" disabled={!!busy}><legend className="eyebrow">HOW DO YOU WANT TO PLAY?</legend>{modes.map(option => <label key={option.id} className={'mode-option ' + (mode === option.id ? 'mode-selected' : '')}><input type="radio" name="mode" value={option.id} checked={mode === option.id} onChange={() => setMode(option.id)} /><span><strong>{option.title}</strong><small>{option.description}</small></span></label>)}</fieldset>
   <button className="btn btn-lime full-width" disabled={!!busy} onClick={() => enter(true)}>{busy === 'create' ? 'Opening your arena...' : 'Create a competition'}<ArrowRight size={19} /></button>
  </section><section className="panel join-card"><span className="icon-tile lavender"><Zap size={29} /></span><span className="eyebrow">CHALLENGE ACCEPTED</span><h2>Got a room code?</h2><p>Join a PvP or Teams game with the code shared by your host.</p><form onSubmit={e => { e.preventDefault(); enter(false); }}><label htmlFor="room-code">ROOM CODE</label><input id="room-code" className="room-code-input" placeholder="ABCD" autoComplete="off" spellCheck={false} maxLength={4} value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} /><button className="btn btn-primary" disabled={code.length !== 4 || !!busy}>{busy === 'join' ? 'Joining the action...' : 'Join competition'}<ArrowRight size={19} /></button></form><p className="small-note">Everyone joins on their own device.</p></section></div>
  {error && <div className="error-banner" role="alert">{error}</div>}
  <div className="how-to"><span className="eyebrow">THE GAME PLAN</span><div><b>01</b><span>Watch the question unfold.</span></div><div><b>02</b><span>Hit <kbd>space</kbd> when you know.</span></div><div><b>03</b><span>Answer. Check. Repeat.</span></div></div>
 </div>;
}
