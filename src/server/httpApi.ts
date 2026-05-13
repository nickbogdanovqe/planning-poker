import type { PersistentRoomsService } from "./persistentRooms.js";
import type { JoinRoomResult, ParticipantRole, RoomActionResult } from "../shared/types.js";

type RoomApiBody = Record<string, unknown> | undefined;

export interface RoomApiRequest {
  method: string;
  query: Record<string, string | string[] | undefined>;
  body?: RoomApiBody;
}

export type RoomApiResponse = {
  status: number;
  body: JoinRoomResult | RoomActionResult;
};

export async function handleRoomApiRequest(
  service: PersistentRoomsService,
  request: RoomApiRequest,
): Promise<RoomApiResponse> {
  if (request.method === "GET") {
    const roomId = readQueryString(request.query.roomId);
    if (!roomId) {
      return errorResponse(400, "Room id is required.");
    }

    return resultResponse(await service.getRoom(roomId));
  }

  if (request.method !== "POST") {
    return errorResponse(405, "Method not allowed.");
  }

  const action = readBodyString(request.body, "action");
  switch (action) {
    case "create":
      return resultResponse(
        await service.createRoom({
          participantId: requiredBodyString(request.body, "participantId"),
          name: requiredBodyString(request.body, "name"),
          role: requiredRole(request.body),
        }),
      );
    case "join":
      return resultResponse(
        await service.joinRoom({
          roomId: requiredBodyString(request.body, "roomId"),
          participantId: requiredBodyString(request.body, "participantId"),
          name: requiredBodyString(request.body, "name"),
          role: requiredRole(request.body),
        }),
      );
    case "vote":
      return resultResponse(
        await service.castVote({
          roomId: requiredBodyString(request.body, "roomId"),
          participantId: requiredBodyString(request.body, "participantId"),
          value: requiredBodyString(request.body, "value"),
        }),
      );
    case "reveal":
      return resultResponse(
        await service.revealRoom({
          roomId: requiredBodyString(request.body, "roomId"),
          participantId: requiredBodyString(request.body, "participantId"),
        }),
      );
    case "reset":
      return resultResponse(
        await service.resetRound({
          roomId: requiredBodyString(request.body, "roomId"),
          participantId: requiredBodyString(request.body, "participantId"),
        }),
      );
    default:
      return errorResponse(400, "Unsupported room action.");
  }
}

function resultResponse(result: JoinRoomResult | RoomActionResult): RoomApiResponse {
  return {
    status: result.ok ? 200 : 400,
    body: result,
  };
}

function errorResponse(status: number, error: string): RoomApiResponse {
  return {
    status,
    body: { ok: false, error },
  };
}

function readQueryString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function readBodyString(body: RoomApiBody, key: string): string | undefined {
  const value = body?.[key];
  return typeof value === "string" ? value : undefined;
}

function requiredBodyString(body: RoomApiBody, key: string): string {
  const value = readBodyString(body, key);
  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function requiredRole(body: RoomApiBody): ParticipantRole {
  const role = readBodyString(body, "role");
  if (role === "voter" || role === "observer") {
    return role;
  }

  throw new Error("role must be voter or observer.");
}
