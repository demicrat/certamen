export type Phase = 'lobby' | 'reading' | 'open' | 'buzzed' | 'judging' | 'revealed' | 'finished';
export interface Question { text: string; answer: string; category: string }
export interface Player { id: string; name: string; score: number; connected: boolean }
export interface Settings { questions: number; answerTime: number; wordMs: number }
export interface GameView {
  code: string; hostId: string; players: Player[]; phase: Phase; settings: Settings;
  index: number; total: number; text: string; wordCount: number; revealed: number;
  category: string; answer: string | null; buzzedId: string | null; attempted: string[];
  submission: string; deadline: number | null; remainingMs: number; notice: string;
  readerText: string | null;
}

/** All game decisions happen here, on the server. Client clocks never decide buzz order. */
export class Competition {
  players: Player[] = [];
  phase: Phase = 'lobby';
  settings: Settings = { questions: 10, answerTime: 10, wordMs: 340 };
  index = 0;
  revealed = 0;
  buzzedId: string | null = null;
  attempted: string[] = [];
  submission = '';
  deadline: number | null = null;
  nextWordAt = 0;
  notice = 'Invite your rivals. Your arena is ready.';
  deck: Question[] = [];
  constructor(public code: string, public hostId: string, private pack: Question[]) {}
  get question() { return this.deck[this.index]; }
  get words() { return this.question?.text.split(/\s+/) || []; }
  join(id: string, name: string) {
    const existing = this.players.find(p => p.id === id);
    if (existing) { existing.connected = true; return; }
    if (this.phase !== 'lobby') throw new Error('This round has started. Join the next match.');
    if (this.players.length >= 24) throw new Error('This room is full.');
    this.players.push({ id, name: name.slice(0, 30), score: 0, connected: true });
  }
  configure(id: string, input: Partial<Settings>) {
    this.hostOnly(id);
    if (this.phase !== 'lobby') throw new Error('Settings are locked during a match.');
    const finite = (n: unknown, low: number, high: number, fallback: number) => typeof n === 'number' && Number.isFinite(n) ? Math.max(low, Math.min(high, Math.round(n))) : fallback;
    this.settings = { questions: finite(input.questions, 1, this.pack.length, 10), answerTime: finite(input.answerTime, 5, 30, 10), wordMs: finite(input.wordMs, 180, 700, 340) };
  }
  start(id: string, now: number) {
    this.hostOnly(id);
    if (this.phase !== 'lobby') throw new Error('The match has already started.');
    if (!this.players.some(p => p.id !== id && p.connected)) throw new Error('Invite at least one player before starting.');
    this.deck = [...this.pack];
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
    this.deck = this.deck.slice(0, this.settings.questions);
    this.index = 0;
    this.beginQuestion(now);
  }
  beginQuestion(now: number) {
    this.phase = 'reading'; this.revealed = 0; this.buzzedId = null; this.attempted = [];
    this.submission = ''; this.deadline = null; this.nextWordAt = now + this.settings.wordMs;
    this.notice = 'Listen closely. Buzz when you know it.';
  }
  tick(now: number) {
    let changed = false;
    if (this.phase === 'reading' && now >= this.nextWordAt) {
      this.revealed = Math.min(this.words.length, this.revealed + 1 + Math.floor((now - this.nextWordAt) / this.settings.wordMs));
      this.nextWordAt = now + this.settings.wordMs;
      if (this.revealed === this.words.length) { this.phase = 'open'; this.deadline = now + this.settings.answerTime * 1000; }
      changed = true;
    }
    if (this.deadline !== null && now >= this.deadline) {
      if (this.phase === 'buzzed') this.reject(now, 'Time ran out.');
      else if (this.phase === 'open') this.reveal('No buzz this time. On to the next one!');
      changed = true;
    }
    return changed;
  }
  buzz(id: string, now: number) {
    this.tick(now);
    if (!this.players.some(p => p.id === id && p.connected) || id === this.hostId) return false;
    if (!['reading', 'open'].includes(this.phase) || this.attempted.includes(id)) return false;
    this.buzzedId = id; this.attempted.push(id); this.phase = 'buzzed'; this.submission = '';
    this.deadline = now + this.settings.answerTime * 1000;
    this.notice = `${this.players.find(p => p.id === id)?.name} is on the buzzer!`;
    return true;
  }
  submit(id: string, answer: string, now: number) {
    this.tick(now);
    if (id !== this.buzzedId || this.phase !== 'buzzed') throw new Error('You do not have the buzzer.');
    if (typeof answer !== 'string' || !answer.trim() || answer.length > 300) throw new Error('Enter an answer (up to 300 characters).');
    this.submission = answer.trim(); this.phase = 'judging'; this.deadline = null;
    this.notice = 'Answer locked in. Waiting for the host’s ruling.';
  }
  judge(id: string, correct: boolean, now: number) {
    this.hostOnly(id); this.tick(now);
    if (!['buzzed', 'judging'].includes(this.phase) || !this.buzzedId) throw new Error('There is no answer to judge.');
    if (correct) {
      const player = this.players.find(p => p.id === this.buzzedId)!;
      player.score += 10; this.reveal(`${player.name} gets 10 points. Nicely played!`);
    } else this.reject(now, 'Not quite.');
  }
  reject(now: number, message: string) {
    this.buzzedId = null; this.submission = ''; this.deadline = null;
    const eligible = this.players.some(p => p.id !== this.hostId && !this.attempted.includes(p.id) && p.connected);
    if (!eligible) { this.reveal(`${message} No eligible players remain.`); return; }
    this.phase = this.revealed < this.words.length ? 'reading' : 'open';
    this.nextWordAt = now + this.settings.wordMs;
    if (this.phase === 'open') this.deadline = now + this.settings.answerTime * 1000;
    this.notice = `${message} The buzzer is open for the remaining players.`;
  }
  reveal(message: string) { this.phase = 'revealed'; this.deadline = null; this.revealed = this.words.length; this.notice = message; }
  skip(id: string) { this.hostOnly(id); if (['lobby', 'revealed', 'finished'].includes(this.phase)) return; this.reveal('Question passed by the host. No points awarded.'); }
  next(id: string, now: number) {
    this.hostOnly(id);
    if (this.phase !== 'revealed') throw new Error('Finish this question first.');
    if (this.index + 1 >= this.deck.length) { this.phase = 'finished'; this.notice = 'That’s a wrap. Well played, everyone!'; }
    else { this.index++; this.beginQuestion(now); }
  }
  reset(id: string) {
    this.hostOnly(id);
    if (this.phase !== 'finished') throw new Error('Finish the match before playing again.');
    this.phase = 'lobby'; this.deck = []; this.index = 0; this.revealed = 0; this.buzzedId = null; this.attempted = []; this.submission = ''; this.deadline = null;
    this.players.forEach(p => { p.score = 0; }); this.notice = 'New match. Fresh start. Same rivals.';
  }
  disconnect(id: string, now: number) {
    const player = this.players.find(p => p.id === id); if (player) player.connected = false;
    if (this.buzzedId === id && this.phase === 'buzzed') this.reject(now, 'The player disconnected.');
  }
  hostOnly(id: string) { if (id !== this.hostId) throw new Error('Only the host can do that.'); }
  view(id: string, now: number): GameView {
    const complete = ['revealed', 'finished'].includes(this.phase);
    return { code: this.code, hostId: this.hostId, players: this.players.map(p => ({ ...p })), phase: this.phase, settings: { ...this.settings }, index: this.index, total: this.deck.length || this.settings.questions, text: this.words.slice(0, this.revealed).join(' '), wordCount: this.words.length, revealed: this.revealed, category: this.question?.category || '', answer: complete || id === this.hostId ? this.question?.answer || null : null, buzzedId: this.buzzedId, attempted: [...this.attempted], submission: this.submission, deadline: this.deadline, remainingMs: this.deadline ? Math.max(0, this.deadline - now) : 0, notice: this.notice, readerText: id === this.hostId ? this.words.slice(this.revealed).join(' ') : null };
  }
}
