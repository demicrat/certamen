'use client';
import { useState } from 'react';
import type { GameView } from '@/lib/competition';

export default function TeamManager({ game, userId, disabled, action }: { game: GameView; userId: string; disabled: boolean; action: (type: string, extra?: object) => void }) {
 const [name, setName] = useState('');
 const host = game.hostId === userId;
 return <section className="panel team-manager"><h2>Teams</h2><p className="small-note">The moderator can assign anyone. Players can move themselves in the lobby or between tossup sets, after bonuses. Points stay with the team that earned them.</p>
  {game.teams.map(team => <div className="team-roster" key={team.id}><h3>{team.name} <span>{team.score} pts</span></h3>{game.players.filter(p => p.teamId === team.id).map(p => <label key={p.id}>{p.name}{p.id === userId ? ' (you)' : ''}<select aria-label={'Team for ' + p.name} value={p.teamId || ''} disabled={disabled || !host && p.id !== userId} onChange={e => action('move-team', { playerId: p.id, teamId: e.target.value })}>{game.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>)}{!game.players.some(p => p.teamId === team.id) && <p className="small-note">No players yet</p>}</div>)}
  {host && <form className="button-row" onSubmit={e => { e.preventDefault(); if (name.trim()) { action('add-team', { name }); setName(''); } }}><input aria-label="New team name" placeholder="New team name" maxLength={30} value={name} onChange={e => setName(e.target.value)} disabled={disabled} /><button className="btn" disabled={disabled || !name.trim() || game.teams.length >= 12}>Add team</button></form>}
 </section>;
}
