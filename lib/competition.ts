export type Phase = 'lobby' | 'reading' | 'open' | 'buzzed' | 'judging' | 'revealed' | 'finished';
export type GameMode = 'solo' | 'pvp' | 'teams';
export interface Team { id: string; name: string; score: number }
export interface Question { text: string; answer: string; category: string; bonuses?: Question[] }
export interface Player { id: string; name: string; score: number; connected: boolean; teamId: string | null }
export interface Settings { questions: number; answerTime: number; wordMs: number }
export interface GameView {
  mode: GameMode; teams: Team[]; approvals: string[]; reviewers: string[];
  code: string; hostId: string; players: Player[]; phase: Phase; settings: Settings;
  index: number; total: number; text: string; wordCount: number; revealed: number;
  category: string; answer: string | null; buzzedId: string | null; attempted: string[];
  submission: string; deadline: number | null; remainingMs: number; notice: string;
  readerText: string | null;
  kind: 'tossup' | 'bonus'; points: number; bonusNumber: number; bonusTotal: number;
  bonusTeamId: string | null; eligibleIds: string[]; hasNext: boolean;
}

/** All game decisions happen here, on the server. Client clocks never decide buzz order. */
export class Competition {
  teams: Team[] = [{ id: 'team-1', name: 'Team 1', score: 0 }, { id: 'team-2', name: 'Team 2', score: 0 }];
  approvals: string[] = [];
  reviewers: string[] = [];
  attemptedTeams: string[] = [];
  private questionWords: string[] = [];
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
  bonusIndex = -1;
  bonusTeamId: string | null = null;
  tossupCorrect = false;
  constructor(public code: string, public hostId: string, private pack: Question[], public mode: GameMode = 'teams') {}
  get tossup() { return this.deck[this.index]; }
  get question() { return this.bonusIndex < 0 ? this.tossup : this.tossup?.bonuses?.[this.bonusIndex]; }
  get points() { return this.bonusIndex < 0 ? 10 : 5; }
  get hasBonus() { return (this.mode === 'pvp' || this.tossupCorrect) && this.bonusIndex + 1 < (this.tossup?.bonuses?.length || 0); }
  get hasNext() { return this.hasBonus || this.index + 1 < this.deck.length; }
  get words() { return this.questionWords; }
  isCompetitor(id: string) { return this.mode !== 'teams' || id !== this.hostId; }
  eligible(p: Player) { return p.connected && this.isCompetitor(p.id) && !this.attempted.includes(p.id) && (this.mode !== 'teams' || !!p.teamId && !this.attemptedTeams.includes(p.teamId) && (this.bonusIndex < 0 || p.teamId === this.bonusTeamId)); }
  join(id: string, name: string) {
    const existing = this.players.find(p => p.id === id);
    if (existing) { existing.connected = true; return; }
    if (this.mode === 'solo' && id !== this.hostId) throw new Error('This is a solo room. Create your own game to practice.');
    if (this.phase !== 'lobby') throw new Error('This round has started. Join the next match.');
    if (this.players.length >= 24) throw new Error('This room is full.');
    const team = this.mode === 'teams' && id !== this.hostId ? [...this.teams].sort((a, b) => this.players.filter(p => p.teamId === a.id).length - this.players.filter(p => p.teamId === b.id).length)[0] : null;
    this.players.push({ id, name: name.slice(0, 30), score: 0, connected: true, teamId: team?.id || null });
  }
  addTeam(id: string, name: unknown) {
    this.hostOnly(id);
    if (this.mode !== 'teams' || (!['lobby', 'revealed'].includes(this.phase) || this.phase === 'revealed' && this.hasBonus)) throw new Error('Add teams in the lobby or between tossup sets.');
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 30) throw new Error('Use a team name between 1 and 30 characters.');
    if (this.teams.length >= 12) throw new Error('A room can have up to 12 teams.');
    this.teams.push({ id: `team-${this.teams.length + 1}`, name: name.trim(), score: 0 });
  }
  moveTeam(id: string, playerId: string, teamId: string) {
    if (id !== this.hostId && id !== playerId) throw new Error('You can only move yourself.');
    if (this.mode !== 'teams' || (!['lobby', 'revealed'].includes(this.phase) || this.phase === 'revealed' && this.hasBonus)) throw new Error('Move teams in the lobby or between tossup sets.');
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.id === this.hostId || !this.teams.some(t => t.id === teamId)) throw new Error('Choose a player and an existing team.');
    player.teamId = teamId;
  }
  configure(id: string, input: Partial<Settings>) {
    this.hostOnly(id);
    if (this.phase !== 'lobby') throw new Error('Settings are locked during a match.');
    const finite = (n: unknown, low: number, high: number, fallback: number) => typeof n === 'number' && Number.isFinite(n) ? Math.max(low, Math.min(high, Math.round(n))) : fallback;
    this.settings = { questions: finite(input.questions, 1, this.pack.length, Math.min(this.settings.questions, this.pack.length)), answerTime: finite(input.answerTime, 5, 30, this.settings.answerTime), wordMs: finite(input.wordMs, 180, 700, this.settings.wordMs) };
  }
  start(id: string, now: number) {
    this.hostOnly(id);
    if (this.phase !== 'lobby') throw new Error('The match has already started.');
    if (!this.pack.length) throw new Error('This question pack is empty.');
    if (this.mode !== 'solo' && !this.players.some(p => p.id !== id && p.connected)) throw new Error('Invite at least one player before starting.');
    if (this.mode === 'teams' && new Set(this.players.filter(p => p.connected && p.teamId).map(p => p.teamId)).size < 2) throw new Error('Place players on at least two teams before starting.');
    this.deck = [...this.pack];
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
    this.deck = this.deck.slice(0, this.settings.questions);
    this.index = 0; this.bonusIndex = -1; this.bonusTeamId = null; this.tossupCorrect = false;
    this.beginQuestion(now);
  }
  beginQuestion(now: number) {
    this.questionWords = this.question?.text.split(/\s+/) || [];
    this.approvals = []; this.reviewers = []; this.attemptedTeams = [];
    this.phase = 'reading'; this.revealed = 0; this.buzzedId = null; this.attempted = [];
    this.submission = ''; this.deadline = null; this.nextWordAt = now + this.settings.wordMs;
    this.notice = this.bonusIndex < 0 ? 'Listen closely. Buzz when you know it.' : this.mode === 'teams' ? `Bonus for ${this.teams.find(t => t.id === this.bonusTeamId)?.name}. Confer, then have one teammate buzz to answer. Worth 5 points.` : 'Bonus question: buzz to answer for 5 points.';
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
    const player = this.players.find(p => p.id === id);
    if (!player || !this.eligible(player)) return false;
    if (!['reading', 'open'].includes(this.phase) || this.attempted.includes(id)) return false;
    this.buzzedId = id; this.attempted.push(id); this.phase = 'buzzed'; this.submission = '';
    if (this.mode === 'teams' && player.teamId) {
      this.attemptedTeams.push(player.teamId);
      this.attempted = this.players.filter(p => p.teamId && this.attemptedTeams.includes(p.teamId)).map(p => p.id);
    }
    this.deadline = now + this.settings.answerTime * 1000;
    this.notice = `${this.players.find(p => p.id === id)?.name} is on the buzzer!`;
    return true;
  }
  submit(id: string, answer: string, now: number) {
    this.tick(now);
    if (id !== this.buzzedId || this.phase !== 'buzzed') throw new Error('You do not have the buzzer.');
    if (typeof answer !== 'string' || !answer.trim() || answer.length > 300) throw new Error('Enter an answer (up to 300 characters).');
    this.submission = answer.trim(); this.phase = 'judging'; this.deadline = null;
    this.reviewers = this.players.filter(p => p.connected && this.isCompetitor(p.id)).map(p => p.id);
    this.notice = this.mode === 'teams' ? 'Answer locked in. Waiting for the moderator ruling.' : this.mode === 'solo' ? 'Compare your answer with the key, then mark it correct or incorrect.' : 'Everyone can see the answer. All reviewers must agree to award points.';
  }
  judge(id: string, correct: boolean, now: number) {
    if (this.mode === 'teams') this.hostOnly(id);
    else if (!this.players.some(p => p.id === id && p.connected) || !this.reviewers.includes(id)) throw new Error('Only a reviewer can check this answer.');
    this.tick(now);
    if (!['buzzed', 'judging'].includes(this.phase) || !this.buzzedId) throw new Error('There is no answer to judge.');
    if (this.mode !== 'teams') {
      if (this.phase !== 'judging') throw new Error('Submit an answer before checking it.');
      if (!correct) { this.reveal('Answer marked incorrect. No points awarded.'); return; }
      if (!this.approvals.includes(id)) this.approvals.push(id);
      if (!this.reviewers.every(reviewer => this.approvals.includes(reviewer))) { this.notice = `${this.approvals.length} of ${this.reviewers.length} reviewers agree. Waiting for everyone.`; return; }
    }
    if (correct) {
      const player = this.players.find(p => p.id === this.buzzedId)!;
      const team = this.mode === 'teams' ? this.teams.find(t => t.id === player.teamId) : null;
      if (this.bonusIndex < 0) { this.tossupCorrect = true; this.bonusTeamId = team?.id || null; }
      if (team) team.score += this.points;
      player.score += this.points; this.reveal(`${player.name} gets ${this.points} points. Nicely played!`);
    } else this.reject(now, 'Not quite.');
  }
  reject(now: number, message: string) {
    this.buzzedId = null; this.submission = ''; this.deadline = null;
    const eligible = this.players.some(p => this.eligible(p));
    if (!eligible) { this.reveal(`${message} No eligible players remain.`); return; }
    this.phase = this.revealed < this.words.length ? 'reading' : 'open';
    this.nextWordAt = now + this.settings.wordMs;
    if (this.phase === 'open') this.deadline = now + this.settings.answerTime * 1000;
    this.notice = `${message} The buzzer is open for the remaining players.`;
  }
  reveal(message: string) { this.phase = 'revealed'; this.deadline = null; this.revealed = this.words.length; this.notice = message; }
  skip(id: string) { this.hostOnly(id); if (['lobby', 'revealed', 'finished'].includes(this.phase)) return; if (this.mode === 'pvp' && ['buzzed', 'judging'].includes(this.phase)) throw new Error('Finish the shared answer review first.'); this.reveal('Question passed by the host. No points awarded.'); }
  next(id: string, now: number) {
    this.hostOnly(id);
    if (this.phase !== 'revealed') throw new Error('Finish this question first.');
    if (this.hasBonus) { this.bonusIndex++; this.beginQuestion(now); }
    else if (this.index + 1 >= this.deck.length) { this.phase = 'finished'; this.notice = 'That is a wrap. Well played, everyone!'; }
    else { this.index++; this.bonusIndex = -1; this.bonusTeamId = null; this.tossupCorrect = false; this.beginQuestion(now); }
  }
  reset(id: string) {
    this.hostOnly(id);
    if (this.phase !== 'finished') throw new Error('Finish the match before playing again.');
    this.phase = 'lobby'; this.deck = []; this.index = 0; this.revealed = 0; this.buzzedId = null; this.attempted = []; this.submission = ''; this.deadline = null;
    this.questionWords = []; this.approvals = []; this.reviewers = []; this.attemptedTeams = []; this.teams.forEach(t => { t.score = 0; });
    this.bonusIndex = -1; this.bonusTeamId = null; this.tossupCorrect = false;
    this.players.forEach(p => { p.score = 0; }); this.notice = 'New match. Fresh start. Same rivals.';
  }
  disconnect(id: string, now: number) {
    const player = this.players.find(p => p.id === id); if (player) player.connected = false;
    if (this.buzzedId === id && this.phase === 'buzzed') this.reject(now, 'The player disconnected.');
    if (this.mode === 'pvp' && this.phase === 'judging' && this.reviewers.includes(id) && !this.approvals.includes(id)) this.reveal('A reviewer disconnected before agreeing. No points awarded.');
  }
  hostOnly(id: string) { if (id !== this.hostId) throw new Error('Only the host can do that.'); }
  view(id: string, now: number): GameView {
    const complete = ['revealed', 'finished'].includes(this.phase);
    const moderator = this.mode === 'teams' && id === this.hostId;
    return { kind: this.bonusIndex < 0 ? 'tossup' : 'bonus', points: this.points, bonusNumber: this.bonusIndex + 1, bonusTotal: this.tossup?.bonuses?.length || 0, bonusTeamId: this.bonusTeamId, eligibleIds: this.players.filter(p => this.eligible(p)).map(p => p.id), hasNext: this.hasNext, mode: this.mode, teams: this.teams.map(t => ({ ...t })), approvals: [...this.approvals], reviewers: [...this.reviewers], code: this.code, hostId: this.hostId, players: this.players.map(p => ({ ...p })), phase: this.phase, settings: { ...this.settings }, index: this.index, total: this.deck.length || this.settings.questions, text: this.words.slice(0, this.revealed).join(' '), wordCount: this.words.length, revealed: this.revealed, category: this.question?.category || '', answer: complete || moderator || this.mode !== 'teams' && this.phase === 'judging' ? this.question?.answer || null : null, buzzedId: this.buzzedId, attempted: [...this.attempted], submission: this.submission, deadline: this.deadline, remainingMs: this.deadline ? Math.max(0, this.deadline - now) : 0, notice: this.notice, readerText: moderator ? this.words.slice(this.revealed).join(' ') : null };
  }
}
