import { io } from 'socket.io-client';

// autoConnect: false → we connect manually when a game starts
export const socket = io('http://localhost:3000', {
  autoConnect: false,
});
