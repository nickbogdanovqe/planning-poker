import { Redis } from "@upstash/redis";

import type { RoomRepository, StoredRoom } from "./persistentRooms.js";

const ROOM_KEY_PREFIX = "planning-poker:room:";
const ROOM_TTL_SECONDS = 60 * 60 * 12;

export function createRedisRoomRepository(): RoomRepository {
  const redis = new Redis({
    url: requiredEnv("KV_REST_API_URL", "UPSTASH_REDIS_REST_URL"),
    token: requiredEnv("KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN"),
  });

  return {
    async get(roomId) {
      const room = await redis.get<StoredRoom>(roomKey(roomId));
      return room ?? undefined;
    },
    async set(room) {
      await redis.set(roomKey(room.id), room, { ex: ROOM_TTL_SECONDS });
    },
    async delete(roomId) {
      await redis.del(roomKey(roomId));
    },
    async has(roomId) {
      return (await redis.exists(roomKey(roomId))) === 1;
    },
  };
}

function roomKey(roomId: string): string {
  return `${ROOM_KEY_PREFIX}${roomId}`;
}

function requiredEnv(primaryName: string, fallbackName: string): string {
  const value = process.env[primaryName] ?? process.env[fallbackName];
  if (!value) {
    throw new Error(`Missing ${primaryName} or ${fallbackName}. Connect Vercel KV or Upstash Redis.`);
  }

  return value;
}
