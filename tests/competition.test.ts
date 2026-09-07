import test from 'node:test';
import assert from 'node:assert/strict';
import { Competition } from '../lib/competition';
import { practicePack } from '../lib/question-pack';

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

test('solo host plays without early answer access, self-checks and resets', () => {
 const game = new Competition('SOLO', 'host', pack, 'solo'); game.join('host', 'Me');
 assert.throws(() => game.join('a', 'Guest'), /solo room/);
 game.configure('host', { questions: 1 }); game.start('host', 0);
 assert.equal(game.view('host', 0).answer, null); assert.equal(game.view('host', 0).readerText, null);
 assert.equal(game.buzz('host', 1), true); assert.throws(() => game.judge('host', true, 2));
 game.submit('host', 'My answer', 3); assert.ok(game.view('host', 3).answer);
 game.judge('host', true, 4); assert.equal(game.players[0].score, 10);
 assert.throws(() => game.judge('host', true, 5)); game.next('host', 6); game.reset('host');
 assert.equal(game.players[0].score, 0); assert.equal(game.view('host', 7).answer, null);
});

function pvp() {
 const game = new Competition('PVP', 'host', pack, 'pvp');
 game.join('host', 'Host'); game.join('a', 'Athena'); game.join('b', 'Apollo'); game.start('host', 0);
 game.buzz('host', 1); game.submit('host', 'Answer', 2); return game;
}
test('PvP reveals to everyone only after submission and requires unanimous, unique votes', () => {
 const game = pvp();
 for (const id of ['host', 'a', 'b']) { assert.ok(game.view(id, 2).answer); assert.equal(game.view(id, 2).submission, 'Answer'); }
 assert.throws(() => game.judge('stranger', true, 3)); assert.throws(() => game.skip('host'));
 game.judge('host', true, 3); game.judge('host', true, 4); game.judge('a', true, 5);
 assert.equal(game.players[0].score, 0); assert.equal(game.phase, 'judging'); assert.equal(game.approvals.length, 2);
 game.judge('b', true, 6); assert.equal(game.players[0].score, 10); assert.equal(game.phase, 'revealed');
 game.next('host', 7); assert.equal(game.view('host', 7).answer, null); assert.deepEqual(game.approvals, []);
});
test('PvP disagreement or lost reviewer ends the exposed question without points', () => {
 const game = pvp(); game.judge('host', true, 3); game.judge('a', false, 4);
 assert.equal(game.phase, 'revealed'); assert.equal(game.players[0].score, 0); assert.equal(game.buzz('b', 5), false);
 const disconnected = pvp(); disconnected.disconnect('b', 3);
 assert.equal(disconnected.phase, 'revealed'); assert.equal(disconnected.players[0].score, 0);
});
test('teams allow assignments and self moves between questions, with team lockouts and durable scores', () => {
 const game = new Competition('TEAM', 'host', pack); game.join('host', 'Moderator');
 game.join('a', 'Athena'); game.join('b', 'Apollo'); game.join('c', 'Ceres');
 game.addTeam('host', 'Romans'); game.moveTeam('host', 'a', 'team-3'); game.moveTeam('c', 'c', 'team-3');
 assert.throws(() => game.moveTeam('b', 'a', 'team-2')); assert.throws(() => game.addTeam('a', 'Cheat'));
 game.start('host', 0); assert.throws(() => game.moveTeam('a', 'a', 'team-2'));
 game.buzz('a', 1); game.judge('host', false, 2); assert.equal(game.buzz('c', 3), false);
 game.buzz('b', 4); game.judge('host', true, 5); assert.equal(game.teams[1].score, 10);
 game.moveTeam('b', 'b', 'team-3'); assert.equal(game.teams[1].score, 10); assert.equal(game.teams[2].score, 0);
 game.next('host', 6); assert.equal(game.buzz('c', 7), true);
});

const bonusPack = [{ text: 'Tossup', answer: 'Rome', category: 'History', bonuses: [
 { text: 'First bonus', answer: 'Romulus', category: 'History' },
 { text: 'Second bonus', answer: '753', category: 'History' },
] }];
function bonusGame(mode: 'teams' | 'pvp' | 'solo' = 'teams') {
 const game = new Competition('BONI', 'host', bonusPack, mode);
 game.join('host', 'Host');
 if (mode !== 'solo') { game.join('a', 'A'); game.join('b', 'B'); game.join('c', 'C'); }
 game.start('host', 0); return game;
}
test('winning team alone gets each five-point bonus; teammate can answer the next bonus', () => {
 const game = bonusGame();
 game.buzz('a', 1); game.judge('host', true, 2);
 assert.equal(game.teams[0].score, 10); assert.equal(game.buzz('c', 3), false);
 assert.throws(() => game.moveTeam('b', 'b', 'team-1'));
 assert.equal(game.view('a', 3).hasNext, true);
 game.next('host', 4);
 assert.equal(game.view('a', 4).kind, 'bonus'); assert.equal(game.view('a', 4).points, 5);
 assert.deepEqual(game.view('b', 4).eligibleIds, ['a', 'c']);
 assert.equal(game.view('a', 4).answer, null); assert.equal(game.buzz('b', 5), false);
 assert.equal(game.buzz('c', 5), true); game.judge('host', true, 6);
 assert.equal(game.teams[0].score, 15); assert.equal(game.players.find(p => p.id === 'c')?.score, 5);
 game.next('host', 7); assert.equal(game.buzz('a', 8), true); game.judge('host', true, 9);
 assert.equal(game.teams[0].score, 20); assert.equal(game.view('a', 9).hasNext, false);
 assert.throws(() => game.judge('host', true, 10)); game.next('host', 11);
 assert.equal(game.phase, 'finished'); game.reset('host');
 assert.equal(game.bonusTeamId, null); assert.equal(game.bonusIndex, -1);
});
test('incorrect or timed-out team buzz locks out every teammate, including after reconnect', () => {
 for (const timeout of [false, true]) {
  const game = bonusGame(); game.buzz('a', 1);
  if (timeout) game.tick(10001); else game.judge('host', false, 2);
  game.disconnect('c', 10002); game.join('c', 'C');
  assert.equal(game.buzz('c', 10003), false); assert.equal(game.buzz('a', 10003), false);
  assert.equal(game.buzz('b', 10004), true);
 }
});
test('missed team bonuses cannot be stolen and do not cancel the second bonus', () => {
 const game = bonusGame(); game.buzz('a', 1); game.judge('host', true, 2); game.next('host', 3);
 game.buzz('a', 4); game.judge('host', false, 5);
 assert.equal(game.phase, 'revealed'); assert.equal(game.buzz('c', 6), false); assert.equal(game.buzz('b', 6), false);
 game.next('host', 7); assert.equal(game.bonusIndex, 1); assert.equal(game.buzz('c', 8), true);
 game.tick(10008); assert.equal(game.phase, 'revealed'); assert.equal(game.teams[0].score, 10);
});
test('unanswered or skipped tossups do not award team bonuses', () => {
 for (const skipped of [true, false]) {
  const game = bonusGame();
  if (skipped) game.skip('host'); else { game.tick(10000); game.tick(20000); }
  assert.equal(game.view('a', 20000).hasNext, false); game.next('host', 20001);
  assert.equal(game.phase, 'finished'); assert.equal(game.teams[0].score, 0);
 }
});
test('PvP bonuses stay open to everyone after a skipped tossup and award five points', () => {
 const game = bonusGame('pvp'); game.skip('host'); game.next('host', 1);
 assert.deepEqual(game.view('host', 1).eligibleIds, ['host', 'a', 'b', 'c']);
 game.buzz('b', 2); game.submit('b', 'Romulus', 3);
 for (const id of ['host', 'a', 'b', 'c']) game.judge(id, true, 4);
 assert.equal(game.players.find(p => p.id === 'b')?.score, 5);
 game.next('host', 5); assert.equal(game.buzz('b', 6), true);
 assert.equal(game.view('host', 6).bonusNumber, 2);
});
test('solo earns bonuses after a correct tossup and scores them at five points', () => {
 const game = bonusGame('solo'); game.buzz('host', 1); game.submit('host', 'Rome', 2); game.judge('host', true, 3);
 game.next('host', 4); game.buzz('host', 5); game.submit('host', 'Romulus', 6); game.judge('host', true, 7);
 assert.equal(game.players[0].score, 15);
});
test('the live warm-up pack includes two linked bonuses for every tossup', () => {
 assert.equal(practicePack.length, 12);
 assert.ok(practicePack.every(q => q.bonuses?.length === 2 && q.bonuses.every(b => b.text && b.answer)));
});
