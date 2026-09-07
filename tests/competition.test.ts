import test from 'node:test';
import assert from 'node:assert/strict';
import { Competition } from '../lib/competition';

const pack = [{ text: 'One two three four five', answer: 'Athena', category: 'Myth' }, { text: 'Six seven eight', answer: 'Rome', category: 'History' }];
function setup() { const game = new Competition('TEST', 'host', pack); game.join('host', 'Host'); game.join('a', 'Athena'); game.join('b', 'Apollo'); game.configure('host', { questions: 2, answerTime: 5, wordMs: 200 }); game.start('host', 0); return game; }
test('first buzz wins; reading freezes and answers stay private', () => {
 const game = setup(); game.tick(400); const words = game.revealed;
 assert.equal(game.buzz('a', 401), true); assert.equal(game.buzz('b', 401), false);
 game.tick(1000); assert.equal(game.revealed, words); assert.equal(game.buzzedId, 'a');
 assert.equal(game.view('a', 1000).answer, null); assert.equal(game.view('a', 1000).readerText, null);
 assert.ok(game.view('host', 1000).answer);
});
test('incorrect answer locks out player and resumes from the paused word', () => {
 const game = setup(); game.tick(200); game.buzz('a', 201); const revealed = game.revealed;
 game.submit('a', 'wrong', 210); game.judge('host', false, 220);
 assert.equal(game.phase, 'reading'); assert.equal(game.revealed, revealed); assert.equal(game.buzz('a', 230), false);
 game.tick(420); assert.equal(game.revealed, revealed + 1); assert.equal(game.buzz('b', 421), true);
});
test('correct scoring happens once and next question clears lockouts', () => {
 const game = setup(); game.buzz('a', 1); game.submit('a', 'Athena', 2); game.judge('host', true, 3);
 assert.equal(game.players.find(p => p.id === 'a')?.score, 10); assert.equal(game.phase, 'revealed');
 assert.throws(() => game.judge('host', true, 4)); assert.ok(game.view('b', 4).answer);
 game.next('host', 5); assert.equal(game.index, 1); assert.deepEqual(game.attempted, []); assert.equal(game.buzzedId, null);
});
test('answer deadline rejects late submissions and permits remaining players', () => {
 const game = setup(); game.buzz('a', 1); assert.throws(() => game.submit('a', 'late', 5001));
 assert.equal(game.buzzedId, null); assert.equal(game.buzz('b', 5002), true);
 game.tick(10002); assert.equal(game.phase, 'revealed');
});
test('no buzz deadline reveals the answer and closes the buzzer', () => {
 const game = setup(); game.tick(10000); assert.equal(game.phase, 'open');
 game.tick(15000); assert.equal(game.phase, 'revealed'); assert.equal(game.buzz('a', 15001), false);
});
test('host and nonmembers cannot buzz, and players cannot control a match', () => {
 const game = setup(); assert.equal(game.buzz('host', 1), false); assert.equal(game.buzz('stranger', 1), false);
 for (const action of [() => game.skip('a'), () => game.next('a', 1), () => game.judge('a', true, 1), () => game.configure('a', {})]) assert.throws(action);
 assert.throws(() => game.join('c', 'Late player')); assert.throws(() => game.start('host', 1));
});
test('disconnect clears active buzz, reconnection preserves score and lockout', () => {
 const game = setup(); game.buzz('a', 1); game.disconnect('a', 2); assert.equal(game.buzzedId, null);
 game.join('a', 'Athena'); assert.equal(game.players.filter(p => p.id === 'a').length, 1); assert.equal(game.buzz('a', 3), false);
});
test('submission stops answer timer while host deliberates', () => {
 const game = setup(); game.buzz('a', 1); game.submit('a', 'answer', 20); game.tick(100000);
 assert.equal(game.phase, 'judging'); assert.equal(game.deadline, null); assert.throws(() => game.submit('b', 'steal', 100001));
});
test('final standings and rematch reset all match state', () => {
 const game = setup(); game.skip('host'); game.next('host', 1); game.buzz('b', 2); game.judge('host', true, 3); game.next('host', 4);
 assert.equal(game.phase, 'finished'); assert.equal(game.players.find(p => p.id === 'b')?.score, 10);
 game.reset('host'); assert.equal(game.phase, 'lobby'); assert.equal(game.players.every(p => p.score === 0), true);
 assert.equal(game.view('a', 5).answer, null); assert.equal(game.view('a', 5).text, '');
});
test('invalid numeric settings are bounded and host needs a competitor', () => {
 const game = new Competition('TEST', 'host', pack); game.join('host', 'Host');
 game.configure('host', { questions: 9999, answerTime: NaN, wordMs: -1 });
 assert.deepEqual(game.settings, { questions: 2, answerTime: 10, wordMs: 180 }); assert.throws(() => game.start('host', 0));
});
