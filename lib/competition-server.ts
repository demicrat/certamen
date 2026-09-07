import type { Server, Socket } from 'socket.io';
import { randomInt } from 'node:crypto';
import { Competition, type GameMode } from './competition';
import { practicePack } from './question-pack';

export function attachCompetitionServer(io: Server) {
  const rooms = new Map<string, Competition>();
  const sockets = new Map<string, Socket>();
  const cleanup = new Map<string, ReturnType<typeof setTimeout>>();
  const publish = (room: Competition) => {
    const now = Date.now();
    for (const socketId of io.sockets.adapter.rooms.get(room.code) || []) {
      const socket = sockets.get(socketId);
      if (socket) socket.emit('room-state', room.view(socket.data.userId, now));
    }
  };
  const destroy = (code: string) => {
    for (const socket of sockets.values()) if (socket.data.room === code) { socket.emit('room-closed'); socket.leave(code); socket.data.room = undefined; }
    rooms.delete(code); const timer = cleanup.get(code); if (timer) clearTimeout(timer); cleanup.delete(code);
  };
  io.on('connection', socket => {
    sockets.set(socket.id, socket);
    const id = socket.data.userId as string;
    const name = socket.data.name as string;
    const roomFor = () => { const room = rooms.get(socket.data.room); if (!room) throw new Error('Join a room first.'); return room; };
    const leave = (explicit: boolean) => {
      const code = socket.data.room; const room = rooms.get(code); if (!room) return;
      socket.leave(code); socket.data.room = undefined;
      if ([...sockets.values()].some(s => s.id !== socket.id && s.data.room === code && s.data.userId === id)) return;
      room.disconnect(id, Date.now());
      if (room.hostId === id) {
        if (explicit) { destroy(code); return; }
        cleanup.set(code, setTimeout(() => destroy(code), 60000));
      } else if (explicit && room.phase === 'lobby') room.players = room.players.filter(p => p.id !== id);
      publish(room);
    };
    const enter = (room: Competition) => {
      if (socket.data.room && socket.data.room !== room.code) leave(true);
      // A player has a single controlling connection; reconnects replace old tabs.
      for (const other of sockets.values()) if (other.id !== socket.id && other.data.userId === id && other.data.room === room.code) { other.emit('session-replaced'); other.leave(room.code); other.data.room = undefined; }
      room.join(id, name); socket.join(room.code); socket.data.room = room.code;
      if (room.hostId === id) { const timer = cleanup.get(room.code); if (timer) clearTimeout(timer); cleanup.delete(room.code); }
      publish(room);
    };
    socket.on('create-room', (payload, reply) => {
      try {
        if (rooms.size >= 500) throw new Error('The arena is busy. Please try again later.');
        let code: string; do { code = Array.from({ length: 4 }, () => String.fromCharCode(65 + randomInt(26))).join(''); } while (rooms.has(code));
        const mode = payload?.mode ?? 'teams';
        if (!['solo', 'pvp', 'teams'].includes(mode)) throw new Error('Choose Solo, PvP, or Teams.');
        const room = new Competition(code, id, practicePack, mode as GameMode); rooms.set(code, room); enter(room);
        if (typeof reply === 'function') reply({ code });
      } catch (e) { if (typeof reply === 'function') reply({ error: (e as Error).message }); }
    });
    socket.on('join-room', (payload, reply) => {
      try {
        const code = typeof payload?.code === 'string' ? payload.code.toUpperCase() : '';
        const room = rooms.get(code); if (!room) throw new Error('Room not found. Check the code with your host.');
        enter(room); if (typeof reply === 'function') reply({ code });
      } catch (e) { if (typeof reply === 'function') reply({ error: (e as Error).message }); }
    });
    socket.on('game-action', (payload) => {
      try {
        const room = roomFor(); const now = Date.now();
        switch (payload?.type) {
          case 'settings': room.configure(id, payload.settings || {}); break;
          case 'add-team': room.addTeam(id, payload.name); break;
          case 'move-team': room.moveTeam(id, payload.playerId, payload.teamId); break;
          case 'start': room.start(id, now); break;
          case 'buzz': room.buzz(id, now); break;
          case 'answer': room.submit(id, payload.answer, now); break;
          case 'judge': if (typeof payload.correct !== 'boolean') throw new Error('Invalid ruling.'); room.judge(id, payload.correct, now); break;
          case 'skip': room.skip(id); break;
          case 'next': room.next(id, now); break;
          case 'reset': room.reset(id); break;
          default: throw new Error('Unknown game action.');
        }
        publish(room);
      } catch (e) { socket.emit('game-error', (e as Error).message); }
    });
    socket.on('leave-room', () => leave(true));
    socket.on('disconnect', () => { sockets.delete(socket.id); leave(false); });
  });
  const tick = setInterval(() => { for (const room of rooms.values()) if (room.tick(Date.now())) publish(room); }, 50);
  tick.unref();
  return () => { clearInterval(tick); cleanup.forEach(clearTimeout); };
}
