import { Server as SocketServer } from "socket.io";

let io: SocketServer | null = null;

export function setIO(server: SocketServer) {
  io = server;
}

export function getIO(): SocketServer | null {
  return io;
}
