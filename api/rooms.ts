import { handleRoomApiRequest } from "../src/server/httpApi.js";
import { createBlobRoomRepository } from "../src/server/blobRoomRepository.js";
import { createPersistentRoomsService, type PersistentRoomsService } from "../src/server/persistentRooms.js";

interface VercelRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface VercelResponse {
  status: (statusCode: number) => {
    json: (body: unknown) => void;
  };
}

let service: PersistentRoomsService | undefined;

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    const result = await handleRoomApiRequest(getService(), {
      method: request.method ?? "GET",
      query: request.query,
      body: isRecord(request.body) ? request.body : undefined,
    });

    response.status(result.status).json(result.body);
  } catch (error) {
    response.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "Invalid room request.",
    });
  }
}

function getService(): PersistentRoomsService {
  service ??= createPersistentRoomsService(createBlobRoomRepository());
  return service;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
