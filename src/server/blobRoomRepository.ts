import { BlobNotFoundError, del, get, head, put } from "@vercel/blob";

import type { RoomRepository, StoredRoom } from "./persistentRooms.js";

const ROOM_PATH_PREFIX = "rooms/";
const ROOM_TTL_MS = 1000 * 60 * 60 * 12;

interface StoredRoomRecord extends StoredRoom {
  updatedAt: number;
}

export function createBlobRoomRepository(): RoomRepository {
  return {
    async get(roomId) {
      const result = await get(roomPathname(roomId), { access: "private", useCache: false });
      if (!result || result.statusCode !== 200) {
        return undefined;
      }

      const record = JSON.parse(await new Response(result.stream).text()) as StoredRoomRecord;
      if (Date.now() - record.updatedAt > ROOM_TTL_MS) {
        await del(roomPathname(roomId)).catch(() => undefined);
        return undefined;
      }

      return toStoredRoom(record);
    },

    async set(room) {
      const record: StoredRoomRecord = { ...room, updatedAt: Date.now() };
      await put(roomPathname(room.id), JSON.stringify(record), {
        access: "private",
        allowOverwrite: true,
        contentType: "application/json",
      });
    },

    async delete(roomId) {
      await del(roomPathname(roomId));
    },

    async has(roomId) {
      try {
        await head(roomPathname(roomId));
        return true;
      } catch (error) {
        if (error instanceof BlobNotFoundError) {
          return false;
        }

        throw error;
      }
    },
  };
}

function roomPathname(roomId: string): string {
  return `${ROOM_PATH_PREFIX}${roomId}.json`;
}

function toStoredRoom(record: StoredRoomRecord): StoredRoom {
  return { id: record.id, phase: record.phase, participants: record.participants };
}
