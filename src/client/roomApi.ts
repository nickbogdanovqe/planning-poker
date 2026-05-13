import type { JoinRoomResult, ParticipantRole, RoomActionResult, VoteValue } from "../shared/types";

const PARTICIPANT_ID_KEY = "planning-poker-participant-id";

export function getParticipantId(): string {
  const existing = window.localStorage.getItem(PARTICIPANT_ID_KEY);
  if (existing) {
    return existing;
  }

  const participantId = window.crypto.randomUUID();
  window.localStorage.setItem(PARTICIPANT_ID_KEY, participantId);
  return participantId;
}

export async function createRoom(participantId: string, name: string, role: ParticipantRole): Promise<JoinRoomResult> {
  return postRoomAction({ action: "create", participantId, name, role });
}

export async function joinRoom(
  participantId: string,
  roomId: string,
  name: string,
  role: ParticipantRole,
): Promise<JoinRoomResult> {
  return postRoomAction({ action: "join", participantId, roomId, name, role });
}

export async function getRoom(roomId: string): Promise<RoomActionResult> {
  const response = await fetch(`/api/rooms?roomId=${encodeURIComponent(roomId)}`);
  return response.json() as Promise<RoomActionResult>;
}

export async function castVote(participantId: string, roomId: string, value: VoteValue): Promise<RoomActionResult> {
  return postRoomAction({ action: "vote", participantId, roomId, value });
}

export async function revealRoom(participantId: string, roomId: string): Promise<RoomActionResult> {
  return postRoomAction({ action: "reveal", participantId, roomId });
}

export async function resetRoom(participantId: string, roomId: string): Promise<RoomActionResult> {
  return postRoomAction({ action: "reset", participantId, roomId });
}

async function postRoomAction<T extends JoinRoomResult | RoomActionResult>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return response.json() as Promise<T>;
}
