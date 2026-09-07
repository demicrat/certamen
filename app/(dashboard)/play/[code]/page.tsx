'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Copy, Crown, Radio, Trophy, Volume2, VolumeX, X, Zap } from 'lucide-react';
import socket, { connectSocket } from '@/lib/socket';
import type { GameView } from '@/lib/competition';
import GameSettings from '@/components/GameSettings';
import TeamManager from '@/components/TeamManager';

export default function GameRoom() {
 const { code } = useParams<{ code: string }>()!;
 const { data: session } = useSession();
 const router = useRouter();
 const [game, setGame] = useState<GameView | null>(null);
 const [connected, setConnected] = useState(false);
 const [error, setError] = useState('');
 const [closed, setClosed] = useState(false);
 const [answer, setAnswer] = useState('');
 const [voice, setVoice] = useState(false);
 const [voiceAvailable, setVoiceAvailable] = useState(false);
 const [copied, setCopied] = useState(false);
 const [remaining, setRemaining] = useState(0);
 const latest = useRef<GameView | null>(null);
 const answerInput = useRef<HTMLInputElement>(null);
 const userId = session?.user.id || '';
 const host = game?.hostId === userId;
 const moderator = host && game?.mode === 'teams';
 const action = useCallback((type: string, extra = {}) => { if (socket.connected) { setError(''); socket.emit('game-action', { type, ...extra }); } }, []);

 useEffect(() => {
  let active = true;
  const update = (state: GameView) => { if (state.code !== code.toUpperCase()) return; latest.current = state; setGame(state); setConnected(true); };
  const join = async () => {
   try {
    const result = await socket.timeout(10000).emitWithAck('join-room', { code });
    if (active && result.error) { setError(result.error); setClosed(true); }
    else if (active) { setConnected(true); setError(''); }
   } catch { if (active) setError('Could not join the room. Return to the arena and try again.'); }
  };
  const disconnected = () => { setConnected(false); window.speechSynthesis?.cancel(); };
  const roomClosed = () => { setClosed(true); setConnected(false); setError('The host closed this room. Ready for another match?'); window.speechSynthesis?.cancel(); };
  const replaced = () => { setClosed(true); setConnected(false); setError('This room is open in another tab. Continue playing there.'); window.speechSynthesis?.cancel(); };
  const onError = (message: string) => setError(message);
  socket.on('room-state', update); socket.on('disconnect', disconnected); socket.on('connect', join);
  socket.on('room-closed', roomClosed); socket.on('session-replaced', replaced); socket.on('game-error', onError);
  if (socket.connected) join();
  else connectSocket().catch(e => { if (active) setError(e.message); });
  setVoiceAvailable('speechSynthesis' in window);
  return () => { active = false; socket.off('room-state', update); socket.off('disconnect', disconnected); socket.off('connect', join); socket.off('room-closed', roomClosed); socket.off('session-replaced', replaced); socket.off('game-error', onError); socket.disconnect(); window.speechSynthesis?.cancel(); };
 }, [code]);

 const canBuzz = connected && !closed && !!game && !moderator && ['reading', 'open'].includes(game.phase) && game.eligibleIds.includes(userId);
 useEffect(() => {
  const key = (e: KeyboardEvent) => {
   const target = e.target as HTMLElement;
   if (e.code !== 'Space' || e.repeat || e.ctrlKey || e.altKey || e.metaKey || target.closest('input,textarea,select,button,a,[contenteditable="true"]')) return;
   if (canBuzz) { e.preventDefault(); action('buzz'); }
  };
  window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
 }, [canBuzz, action]);

 useEffect(() => {
  if (game?.phase === 'buzzed' && game.buzzedId === userId) { setAnswer(''); answerInput.current?.focus(); }
 }, [game?.phase, game?.buzzedId, userId]);
 // The server owns visible text pacing. Optional host audio reads from the current
 // position and is cancelled immediately on every pause, buzz, or disconnection.
 useEffect(() => {
  if (!voiceAvailable) return;
  window.speechSynthesis.cancel();
  if (voice && moderator && connected && !closed && game?.phase === 'reading') {
   const utterance = new SpeechSynthesisUtterance(latest.current?.readerText || '');
   utterance.rate = Math.min(1.6, Math.max(0.7, 340 / (game.settings.wordMs || 340)));
   utterance.lang = 'en-US';
   utterance.onerror = e => { if (e.error !== 'canceled' && e.error !== 'interrupted') { setVoice(false); setError('Spoken reading is unavailable. The on-screen reader will continue.'); } };
   window.speechSynthesis.speak(utterance);
  }
  return () => window.speechSynthesis.cancel();
 }, [voice, voiceAvailable, moderator, connected, closed, game?.phase, game?.index, game?.bonusNumber, game?.settings.wordMs]);

 useEffect(() => {
  const start = performance.now(); const initial = game?.remainingMs || 0;
  const update = () => setRemaining(Math.max(0, Math.ceil((initial - (performance.now() - start)) / 1000)));
  update(); if (!game?.deadline) return; const timer = setInterval(update, 100); return () => clearInterval(timer);
 }, [game?.remainingMs, game?.deadline]);

 const copy = async () => { try { await navigator.clipboard.writeText(code.toUpperCase()); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setError('Copy is unavailable. Share the four-letter room code above.'); } };
 const leave = () => { socket.emit('leave-room'); socket.disconnect(); router.push('/play'); };
 if (closed) return <div className="page-wrap"><section className="panel empty-state"><Trophy size={45} /><h1>See you next round.</h1><p role="status">{error}</p><Link className="btn btn-primary" href="/play">Back to the arena <ArrowRight size={18} /></Link></section></div>;
 if (!game) return <div className="page-wrap"><section className="panel empty-state"><Radio size={36} /><h1>Connecting to {code}...</h1><p role={error ? 'alert' : 'status'}>{error || 'Getting your seat at the arena ready.'}</p><Link className="btn" href="/play">Back to competitions</Link></section></div>;
 const competitors = game.players.filter(p => game.mode !== 'teams' || p.id !== game.hostId).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
 const buzzing = game.players.find(p => p.id === game.buzzedId);
 const hostOnline = game.players.find(p => p.id === game.hostId)?.connected;
 const standings = game.mode === 'teams' ? [...game.teams].sort((a, b) => b.score - a.score) : competitors;
 const winners = standings.filter(p => p.score === standings[0]?.score);
 const ready = game.mode === 'solo' || (game.mode === 'pvp' ? competitors.filter(p => p.connected).length >= 2 : new Set(competitors.filter(p => p.connected).map(p => p.teamId)).size >= 2);
 const isAnswering = game.buzzedId === userId && game.phase === 'buzzed';
 return <div className="page-wrap arena-page"><div className="arena-toolbar"><button className="text-button" onClick={leave}><ArrowLeft size={16} />{host ? 'Close room' : 'Leave room'}</button><span className="room-code-label">ROOM <b>{code}</b><button onClick={copy} aria-label="Copy room code">{copied ? <Check size={17} /> : <Copy size={17} />}</button></span><span className="pill"><span className={connected ? 'live-dot' : 'offline-dot'} />{connected ? moderator ? 'MODERATOR' : game.mode.toUpperCase() : 'RECONNECTING'}</span></div>
 {!connected && <div className="error-banner" role="status">Connection lost. Reconnecting automatically... Buzzing is disabled until you reconnect.</div>}
 {!hostOnline && <div className="error-banner" role="status">The host disconnected. Their seat is reserved for 60 seconds.</div>}
 {error && <div className="error-banner" role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError('')}><X size={16} /></button></div>}
 {game.phase === 'lobby' ? <><div className="page-heading compact"><span className="eyebrow">THE CALM BEFORE THE CLASSICS</span><h1>The arena is <em>yours.</em></h1><p>{host ? game.mode === 'solo' ? 'Set the pace and start your solo practice.' : 'Share the code, set the pace, and let the games begin.' : 'You’re in! Get comfortable. Your host will start the match.'}</p></div><div className="arena-grid"><section className="panel"><div className="panel-title"><h2>Meet the competition</h2><span className="pill">{competitors.length} PLAYERS</span></div><div className="lobby-players">{game.players.map((p, i) => <div className="lobby-player" key={p.id}><span className={'avatar avatar-' + i % 4}>{p.name.slice(0, 1).toUpperCase()}</span><strong>{p.name}{p.id === userId && <small> (you)</small>}</strong><span className="small-note">{p.id === game.hostId ? (game.mode === 'teams' ? 'Host - moderator' : 'Host - player') : p.connected ? 'Ready to compete' : 'Reconnecting'}</span>{p.id === game.hostId && <Crown size={16} />}</div>)}</div>{!competitors.length && <div className="invite-empty">Good rivalries need good rivals.<br />Share <b>{code}</b> to fill these seats.</div>}</section><section className="panel"><GameSettings mode={game.mode} settings={game.settings} disabled={!host || !connected} onChange={settings => action('settings', { settings })} />{host ? <><button className="btn btn-primary full-width" disabled={!ready || !connected} onClick={() => action('start')}>Start competition <Zap size={18} /></button><p className="small-note">{moderator ? 'You moderate. Players buzz from their own devices. At least two teams need players.' : game.mode === 'solo' ? 'You play first, then reveal the key and check your answer.' : 'You play too. Everyone must approve a correct answer.'}</p></> : <div className="waiting-message"><Radio size={18} /> Waiting for the host to start...</div>}</section></div>{game.mode === 'teams' && <TeamManager game={game} userId={userId} disabled={!connected} action={action} />}</> :
 game.phase === 'finished' ? <section className="panel results-panel"><span className="eyebrow">THE FINAL STANDINGS</span><Trophy size={68} /><h1>{winners.length > 1 ? 'A shared victory!' : 'Take a bow, ' + (winners[0]?.name || 'everyone') + '!'}</h1><p>{game.total} tossup sets. Plenty of quick thinking. One great match.</p><div className="results-list">{standings.map(p => <div key={p.id}><span className="rank">{standings.findIndex(other => other.score === p.score) + 1}</span><b>{p.name}</b><strong>{p.score}<small> PTS</small></strong></div>)}</div>{host ? <button className="btn btn-primary" onClick={() => action('reset')}>Run it back <ArrowRight size={18} /></button> : <p className="small-note">Waiting for your host to set up the next match.</p>}<button className="text-button" onClick={leave}>Back to competitions</button></section> :
 <><div className="match-heading"><div><span className="eyebrow">CLASSICS WARM-UP - ORIGINAL PRACTICE</span><h1>Make your <em>move.</em></h1></div><span className="round-counter"><b>{String(game.index + 1).padStart(2, '0')}</b> / {String(game.total).padStart(2, '0')}</span></div><div className="arena-grid live-grid"><div><section className={'question-panel ' + (['buzzed', 'judging'].includes(game.phase) ? 'question-paused' : '')}><div className="question-top"><span className="pill">{game.category}</span><span className="pill">{game.kind === 'bonus' ? `Bonus ${game.bonusNumber}/${game.bonusTotal}` : 'Tossup'} - {game.points} PTS</span><span className="eyebrow">{game.phase === 'reading' ? 'READING LIVE' : game.phase === 'open' ? 'BUZZER OPEN' : game.phase === 'revealed' ? 'QUESTION COMPLETE' : 'READER PAUSED'}</span>{game.deadline && <span className={'timer ' + (remaining <= 3 ? 'timer-urgent' : '')} aria-label={remaining + ' seconds remaining'}>{remaining}s</span>}</div><div className="question-text" aria-label="Question">{game.text || 'The first clue is on its way...'}{game.phase === 'reading' && <span className="reader-cursor" />}</div><div className="reading-progress" role="progressbar" aria-label="Question revealed" aria-valuenow={game.revealed} aria-valuemin={0} aria-valuemax={game.wordCount || 1}><span style={{ width: (game.wordCount ? game.revealed / game.wordCount * 100 : 0) + '%' }} /></div><div className="question-footer"><span>{game.revealed} / {game.wordCount} words</span>{moderator && <button className="text-button" disabled={!voiceAvailable} onClick={() => setVoice(v => !v)}>{voice ? <Volume2 size={16} /> : <VolumeX size={16} />}{voice ? 'Voice on' : 'Enable voice'}</button>}</div></section><div className={'match-notice ' + (game.phase === 'revealed' ? 'notice-success' : '')} role="status">{game.notice}</div>
 {game.phase === 'revealed' && <div className="answer-reveal"><span className="eyebrow">THE ANSWER</span><h2>{game.answer}</h2></div>}
 {!moderator && <><button className={'buzzer ' + (isAnswering ? 'buzzer-won' : '')} disabled={!canBuzz} onClick={() => action('buzz')}><Zap size={27} fill="currentColor" /><span>{isAnswering ? 'You’re on the buzzer!' : game.attempted.includes(userId) && game.phase !== 'revealed' ? 'Your attempt is complete' : 'BUZZ IN'}</span><kbd>SPACE</kbd></button>{isAnswering && <form className="answer-form panel" onSubmit={e => { e.preventDefault(); action('answer', { answer }); }}><label htmlFor="player-answer">Your answer</label><div className="button-row"><input ref={answerInput} id="player-answer" maxLength={300} autoComplete="off" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Type it, then press Enter..." /><button className="btn btn-primary" disabled={!answer.trim() || !connected}>Lock it in <ArrowRight size={17} /></button></div><p className="small-note">{moderator || game.mode === 'teams' ? 'Or answer aloud for the moderator to judge.' : 'Lock in your answer to reveal the key and check it.'}</p></form>}{game.submission && game.buzzedId === userId && <p className="submission">Your answer: <strong>{game.submission}</strong></p>}</>}

 {(moderator || game.mode !== 'teams' && game.phase === 'judging') && <section className="panel moderator-panel">
  <span className="eyebrow"><Crown size={15} /> {moderator ? 'MODERATOR DESK - ONLY YOU SEE THE ANSWER' : game.mode === 'solo' ? 'CHECK YOUR ANSWER' : 'SHARED ANSWER REVIEW'}</span>
  <h3>{game.answer}</h3>
  {buzzing && ['buzzed', 'judging'].includes(game.phase) && <><p><b>{buzzing.name}</b>{game.submission ? ' answered: “' + game.submission + '”' : ' is answering. Listen or wait for their typed answer.'}</p>
   {game.mode === 'pvp' && <><p className="small-note">Everyone must agree. An incorrect ruling ends this question without points.</p><ul className="review-votes">{game.reviewers.map(id => <li key={id}>{game.players.find(p => p.id === id)?.name}: {game.approvals.includes(id) ? 'Agreed' : 'Reviewing'}</li>)}</ul></>}
   <div className="button-row"><button className="btn btn-correct" disabled={!connected || !moderator && (game.approvals.includes(userId) || !game.reviewers.includes(userId))} onClick={() => action('judge', { correct: true })}><Check size={18} />{game.mode === 'pvp' ? game.approvals.includes(userId) ? 'Agreed' : 'Agree - correct' : 'Correct +' + game.points}</button><button className="btn" disabled={!connected || !moderator && !game.reviewers.includes(userId)} onClick={() => action('judge', { correct: false })}><X size={18} />{moderator ? game.kind === 'bonus' ? 'Incorrect - no points' : 'Incorrect - resume' : 'Incorrect - no points'}</button></div>
  </>}
 </section>}
 {host && <section className="panel moderator-panel">{game.phase === 'revealed' ? <button className="btn btn-primary" disabled={!connected} onClick={() => action('next')}>{!game.hasNext ? 'Show final standings' : 'Next question'}<ArrowRight size={18} /></button> : <button className="text-button" disabled={!connected || game.mode === 'pvp' && ['buzzed', 'judging'].includes(game.phase)} onClick={() => action('skip')}>Pass question &amp; reveal answer</button>}</section>}
 {game.mode === 'teams' && game.phase === 'revealed' && !(game.bonusNumber < game.bonusTotal && game.bonusTeamId) && <TeamManager game={game} userId={userId} disabled={!connected} action={action} />}

 </div><aside className="panel scoreboard"><div className="panel-title"><h2><Trophy size={20} /> Leaderboard</h2><span className="live-dot" /></div>{game.mode === 'teams' && standings.map((team, i) => <div className="score-row" key={team.id}><span className="rank">{i + 1}</span><b>{team.name}</b><strong>{team.score}</strong></div>)}{competitors.map((p, i) => <div key={p.id} className={'score-row ' + (game.buzzedId === p.id && ['buzzed', 'judging'].includes(game.phase) ? 'score-active' : '')}><span className="rank">{i + 1}</span><div><b>{p.name}{p.id === userId ? ' (you)' : ''}</b><small>{game.mode === 'teams' ? (game.teams.find(t => t.id === p.teamId)?.name || '') + ' - ' : ''}{!p.connected ? 'Disconnected' : game.buzzedId === p.id && ['buzzed', 'judging'].includes(game.phase) ? 'On the buzzer' : game.attempted.includes(p.id) ? 'Attempt used' : 'Ready'}</small></div><strong>{p.score}</strong></div>)}<div className="scoreboard-foot"><Zap size={19} /><p>Quick thinking.<br />A little courage.<br /><b>You’ve got this.</b></p></div></aside></div></>}
 </div>;
}
