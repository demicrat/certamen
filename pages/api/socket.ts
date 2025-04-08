import { Server as NetServer } from 'http';
import { NextApiRequest } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import type { NextApiResponseServerIO } from '@/types/next';

let playerMap: Record<string, any[]> = {};
let roomOwnerMap: Record<string, string> = {};
let gameStartedMap: Record<string, boolean> = {};
let socketRoomMap: Record<string, string> = {}; // socket.id -> roomId

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket?.server.io) {
    const io = new SocketIOServer(res.socket.server as NetServer, {
      path: '/api/socket',
    });

    res.socket.server.io = io;

    io.on('connection', (socket) => {
      socket.on('join-room', ({ roomId, isOwner, ...playerData }) => {
        console.log(`[SERVER] join-room request. Room: ${roomId}, isOwner: ${isOwner}`);
        if (!playerMap[roomId] && !isOwner) {
          socket.emit('room-not-found');
          return;
        }

        socket.join(roomId);
        socketRoomMap[socket.id] = roomId;

        if (!playerMap[roomId]) {
          playerMap[roomId] = [];
        }

        if (isOwner) {
          roomOwnerMap[roomId] = playerData.name;
        }

        const alreadyIn = playerMap[roomId].find((p) => p.name === playerData.name);
        if (!alreadyIn) {
          playerMap[roomId].push({ ...playerData, socketId: socket.id });
        }

        io.to(roomId).emit('player-joined', {
          players: playerMap[roomId],
          owner: roomOwnerMap[roomId] || null,
        });

        console.log(`Player ${playerData.name} joined ${roomId} (${isOwner ? 'owner' : 'player'})`);
      });

      socket.on('check-game-status', ({ roomId }) => {
        const started = gameStartedMap[roomId] || false;
        socket.emit('game-status', { started });
      });

      socket.on('start-game', ({ roomId }) => {
        gameStartedMap[roomId] = true;
        io.to(roomId).emit('game-started');
        console.log(`Game started in ${roomId}`);
      });

      socket.on('leave-room', ({ roomId }) => {
        handleLeave(socket, roomId);
      });

      socket.on('disconnect', () => {
        const roomId = socketRoomMap[socket.id];
        if (roomId) {
          handleLeave(socket, roomId);
        }
      });

      socket.on('check-room-exists', ({ roomId }) => {
        const exists = !!playerMap[roomId];
        console.log(`[SERVER] check-room-exists for ${roomId}: ${exists}`);
        socket.emit('room-exists-result', { exists });
      });

      function handleLeave(socket: any, roomId: string) {
        const room = playerMap[roomId];
        if (!room) return;

        playerMap[roomId] = playerMap[roomId].filter((p) => p.socketId !== socket.id);
        delete socketRoomMap[socket.id];

        const isOwnerLeaving = socket.id === getOwnerSocketId(roomId);
        const isEmpty = playerMap[roomId].length === 0;

        if (isOwnerLeaving || isEmpty) {
          io.to(roomId).emit('room-destroyed');
          delete playerMap[roomId];
          delete roomOwnerMap[roomId];
          delete gameStartedMap[roomId];
          console.log(`Room ${roomId} destroyed`);
        } else {
          io.to(roomId).emit('player-joined', {
            players: playerMap[roomId],
            owner: roomOwnerMap[roomId],
          });
          console.log(`Player left ${roomId}, room still active`);
        }

        socket.leave(roomId);
      }

      function getOwnerSocketId(roomId: string) {
        const ownerName = roomOwnerMap[roomId];
        const owner = playerMap[roomId]?.find((p) => p.name === ownerName);
        return owner?.socketId;
      }
    });

    console.log('✅ Socket.IO server initialized');
  }

  res.end();
}
