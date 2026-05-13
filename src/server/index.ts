import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";

import { createRoomsService } from "./rooms.js";
import type { ClientToServerEvents, ServerToClientEvents } from "../shared/types.js";

const port = Number(process.env.PORT ?? 3000);
const isProduction = process.env.NODE_ENV === "production";
const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: isProduction ? false : ["http://localhost:3000", "http://127.0.0.1:3000"],
  },
});
const rooms = createRoomsService();
const socketRooms = new Map<string, string>();

io.on("connection", (socket) => {
  socket.on("room:create", (input, callback) => {
    const result = rooms.createRoom({ ...input, participantId: socket.id });
    if (result.ok) {
      socket.join(result.room.id);
      socketRooms.set(socket.id, result.room.id);
      callback(result);
      io.to(result.room.id).emit("room:updated", result.room);
      return;
    }

    callback(result);
  });

  socket.on("room:join", (input, callback) => {
    const result = rooms.joinRoom({ ...input, participantId: socket.id });
    if (result.ok) {
      socket.join(result.room.id);
      socketRooms.set(socket.id, result.room.id);
      callback(result);
      io.to(result.room.id).emit("room:updated", result.room);
      return;
    }

    callback(result);
    socket.emit("room:error", result.error);
  });

  socket.on("room:vote", (input, callback) => {
    const result = rooms.castVote({ ...input, participantId: socket.id });
    callback?.(result);
    publishResult(input.roomId, result);
  });

  socket.on("room:reveal", (input, callback) => {
    const result = rooms.revealRoom({ ...input, participantId: socket.id });
    callback?.(result);
    publishResult(input.roomId, result);
  });

  socket.on("room:reset", (input, callback) => {
    const result = rooms.resetRound({ ...input, participantId: socket.id });
    callback?.(result);
    publishResult(input.roomId, result);
  });

  socket.on("disconnect", () => {
    const roomId = socketRooms.get(socket.id);
    if (!roomId) {
      return;
    }

    socketRooms.delete(socket.id);
    const room = rooms.removeParticipant(roomId, socket.id);
    if (room) {
      io.to(roomId).emit("room:updated", room);
    }
  });
});

await configureClientServing(app);

httpServer.listen(port, () => {
  console.log(`Planning Poker is running at http://localhost:${port}`);
});

function publishResult(roomId: string, result: ReturnType<typeof rooms.castVote>): void {
  if (result.ok) {
    io.to(roomId).emit("room:updated", result.room);
    return;
  }

  io.to(roomId).emit("room:error", result.error);
}

async function configureClientServing(expressApp: express.Express): Promise<void> {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    expressApp.use(vite.middlewares);
    return;
  }

  const serverDir = dirname(fileURLToPath(import.meta.url));
  const clientDir = resolve(serverDir, "../client");
  expressApp.use(express.static(clientDir));
  expressApp.get(/.*/, (_request, response) => {
    response.sendFile(resolve(clientDir, "index.html"));
  });
}
