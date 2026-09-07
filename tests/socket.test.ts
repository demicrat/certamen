import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as connect, type Socket } from 'socket.io-client';
import { attachCompetitionServer } from '../lib/competition-server';
import type { GameView } from '../lib/competition';

function state(socket: Socket, predicate: (view: GameView) => boolean): Promise<GameView> {
 return new Promise((resolve, reject) => {
  const timer = setTimeout(() => { socket.off('room-state', listener); reject(new Error('Timed out waiting for game state')); }, 5000);
  const listener = (view: GameView) => { if (predicate(view)) { clearTimeout(timer); socket.off('room-state', listener); resolve(view); } };
  socket.on('room-state', listener);
 });
}
test('real sockets synchronize first buzz, resume, scores, reconnection and room close', async () => {
 const http = createServer(); const io = new Server(http); const clients: Socket[] = [];
 // Identity injection is confined to this isolated test server, never the app.
 io.use((socket, next) => { socket.data.userId = socket.handshake.auth.id; socket.data.name = socket.handshake.auth.id; next(); });
 const cleanup = attachCompetitionServer(io);
 await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
 const address = http.address(); assert.ok(address && typeof address !== 'string');
 const createClient = async (id: string) => {
  const client = connect('http://127.0.0.1:' + address.port, { auth: { id }, transports: ['websocket'], forceNew: true }); clients.push(client);
  await new Promise<void>((resolve, reject) => { client.once('connect', resolve); client.once('connect_error', reject); }); return client;
 };
 try {
  const host = await createClient('host'); const a = await createClient('a'); const b = await createClient('b');
  const room = await host.emitWithAck('create-room', {}); assert.match(room.code, /^[A-Z]{4}$/);
  assert.equal((await a.emitWithAck('join-room', { code: room.code })).error, undefined);
  assert.equal((await b.emitWithAck('join-room', { code: room.code })).error, undefined);
  const configured = state(host, g => g.settings.questions === 1); host.emit('game-action', { type: 'settings', settings: { questions: 1, wordMs: 700, answerTime: 5 } }); await configured;
  const reading = state(a, g => g.phase === 'reading'); host.emit('game-action', { type: 'start' }); assert.equal((await reading).answer, null);
  const buzzedA = state(a, g => g.phase === 'buzzed'); const buzzedB = state(b, g => g.phase === 'buzzed'); a.emit('game-action', { type: 'buzz' });
  assert.equal((await buzzedA).buzzedId, 'a'); assert.equal((await buzzedB).buzzedId, 'a');
  const rejection = new Promise<string>(resolve => b.once('game-error', resolve)); b.emit('game-action', { type: 'judge', correct: true }); assert.match(await rejection, /Only the host/);
  const resumed = state(b, g => g.phase === 'reading'); host.emit('game-action', { type: 'judge', correct: false }); assert.deepEqual((await resumed).attempted, ['a']);
  const nextBuzz = state(b, g => g.buzzedId === 'b'); b.emit('game-action', { type: 'buzz' }); await nextBuzz;
  const submitted = state(host, g => g.phase === 'judging'); b.emit('game-action', { type: 'answer', answer: 'My answer' }); assert.equal((await submitted).submission, 'My answer');
  const scored = state(a, g => g.phase === 'revealed'); host.emit('game-action', { type: 'judge', correct: true }); const scores = await scored; assert.equal(scores.players.find(p => p.id === 'b')?.score, 10); assert.ok(scores.answer);
  b.disconnect(); const reconnected = await createClient('b'); const recovered = state(reconnected, g => g.phase === 'revealed'); await reconnected.emitWithAck('join-room', { code: room.code }); assert.equal((await recovered).players.find(p => p.id === 'b')?.score, 10);
  for (let bonus = 1; bonus <= 2; bonus++) {
   const nextBonus = state(a, g => g.phase === 'reading' && g.bonusNumber === bonus); host.emit('game-action', { type: 'next' });
   const view = await nextBonus; assert.equal(view.points, 5); assert.deepEqual(view.eligibleIds, ['b']);
   const passed = state(a, g => g.phase === 'revealed'); host.emit('game-action', { type: 'skip' }); await passed;
  }
  const finished = state(a, g => g.phase === 'finished'); host.emit('game-action', { type: 'next' }); await finished;
  const closed = new Promise<void>(resolve => a.once('room-closed', resolve)); host.emit('leave-room'); await closed;
  assert.match((await a.emitWithAck('join-room', { code: room.code })).error, /Room not found/);
 } finally { clients.forEach(client => client.disconnect()); cleanup(); await new Promise<void>(resolve => io.close(() => resolve())); http.close(); }
});
