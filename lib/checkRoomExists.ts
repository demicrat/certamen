// lib/checkRoomExists.ts
import { io } from 'socket.io-client';

export const checkRoomExists = (roomCode: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const tempSocket = io({
      path: '/api/socket',
      autoConnect: false,
    });

    tempSocket.connect();

    tempSocket.on('connect', () => {
      // ⏱ small delay to allow other client to emit join-room
      setTimeout(() => {
        tempSocket.emit('check-room-exists', { roomId: roomCode });
      }, 200); // adjust to 100–300ms as needed
    });

    tempSocket.on('room-exists-result', ({ exists }: { exists: boolean }) => {
      tempSocket.disconnect();
      resolve(exists);
    });

    tempSocket.on('connect_error', () => {
      tempSocket.disconnect();
      resolve(false);
    });

    setTimeout(() => {
      tempSocket.disconnect();
      resolve(false);
    }, 3000); // fallback timeout
  });
};
