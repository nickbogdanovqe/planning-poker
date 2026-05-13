import { randomUUID } from "node:crypto";

import { DEFAULT_DECK } from "../shared/deck.js";
import type {
  CreateRoomInput,
  FacilitatorActionInput,
  JoinRoomInput,
  JoinRoomResult,
  Participant,
  Room,
  RoomActionResult,
  VoteInput,
  VoteSummary,
  VoteValue,
} from "../shared/types.js";

interface InternalParticipant extends Participant {
  vote?: VoteValue;
}

interface InternalRoom {
  id: string;
  phase: Room["phase"];
  participants: InternalParticipant[];
}

interface RoomsServiceOptions {
  id?: () => string;
}

const DEFAULT_ID_LENGTH = 6;

export function createRoomsService(options: RoomsServiceOptions = {}) {
  const rooms = new Map<string, InternalRoom>();
  const makeId = options.id ?? createRoomId;

  function createRoom(input: CreateRoomInput): JoinRoomResult {
    let id = makeId();
    while (rooms.has(id)) {
      id = makeId();
    }

    const participant = createParticipant(input, {
      isFacilitator: true,
      existingNames: [],
    });
    const internalRoom: InternalRoom = {
      id,
      phase: "voting",
      participants: [participant],
    };
    rooms.set(id, internalRoom);

    const room = toPublicRoom(internalRoom);
    return { ok: true, room, self: room.participants[0] as Participant };
  }

  function joinRoom(input: JoinRoomInput): JoinRoomResult {
    const room = rooms.get(input.roomId);
    if (!room) {
      return { ok: false, error: "Room not found." };
    }

    const existing = room.participants.find((participant) => participant.id === input.participantId);
    if (existing) {
      const publicRoom = toPublicRoom(room);
      return {
        ok: true,
        room: publicRoom,
        self: publicRoom.participants.find((participant) => participant.id === input.participantId) as Participant,
      };
    }

    const participant = createParticipant(input, {
      isFacilitator: room.participants.length === 0,
      existingNames: room.participants.map((current) => current.name),
    });
    room.participants.push(participant);

    const publicRoom = toPublicRoom(room);
    return {
      ok: true,
      room: publicRoom,
      self: publicRoom.participants.find((current) => current.id === participant.id) as Participant,
    };
  }

  function getRoom(roomId: string): Room | undefined {
    const room = rooms.get(roomId);
    return room ? toPublicRoom(room) : undefined;
  }

  function castVote(input: VoteInput): RoomActionResult {
    const room = rooms.get(input.roomId);
    if (!room) {
      return { ok: false, error: "Room not found." };
    }

    const participant = room.participants.find((current) => current.id === input.participantId);
    if (!participant) {
      return { ok: false, error: "Participant not found.", room: toPublicRoom(room) };
    }

    if (participant.role === "observer") {
      return { ok: false, error: "Observers cannot vote." };
    }

    if (room.phase === "revealed") {
      return { ok: false, error: "Start a new round before voting again.", room: toPublicRoom(room) };
    }

    if (!DEFAULT_DECK.some((card) => card.value === input.value)) {
      return { ok: false, error: "That card is not in this room's deck.", room: toPublicRoom(room) };
    }

    participant.vote = input.value;
    participant.hasVoted = true;
    return { ok: true, room: toPublicRoom(room) };
  }

  function revealRoom(input: FacilitatorActionInput): RoomActionResult {
    const room = rooms.get(input.roomId);
    if (!room) {
      return { ok: false, error: "Room not found." };
    }

    const permission = ensureFacilitator(room, input.participantId);
    if (!permission.ok) {
      return permission;
    }

    room.phase = "revealed";
    return { ok: true, room: toPublicRoom(room) };
  }

  function resetRound(input: FacilitatorActionInput): RoomActionResult {
    const room = rooms.get(input.roomId);
    if (!room) {
      return { ok: false, error: "Room not found." };
    }

    const permission = ensureFacilitator(room, input.participantId);
    if (!permission.ok) {
      return permission;
    }

    room.phase = "voting";
    room.participants = room.participants.map((participant) => ({
      ...participant,
      hasVoted: false,
      vote: undefined,
    }));
    return { ok: true, room: toPublicRoom(room) };
  }

  function removeParticipant(roomId: string, participantId: string): Room | undefined {
    const room = rooms.get(roomId);
    if (!room) {
      return undefined;
    }

    const leaving = room.participants.find((participant) => participant.id === participantId);
    room.participants = room.participants.filter((participant) => participant.id !== participantId);

    if (room.participants.length === 0) {
      rooms.delete(roomId);
      return undefined;
    }

    if (leaving?.isFacilitator && !room.participants.some((participant) => participant.isFacilitator)) {
      room.participants[0].isFacilitator = true;
    }

    return toPublicRoom(room);
  }

  return {
    createRoom,
    joinRoom,
    getRoom,
    castVote,
    revealRoom,
    resetRound,
    removeParticipant,
  };
}

function createRoomId(): string {
  return randomUUID().replaceAll("-", "").slice(0, DEFAULT_ID_LENGTH).toUpperCase();
}

function createParticipant(
  input: CreateRoomInput,
  options: { isFacilitator: boolean; existingNames: string[] },
): InternalParticipant {
  return {
    id: input.participantId,
    name: uniqueName(input.name, options.existingNames),
    role: input.role,
    isFacilitator: options.isFacilitator,
    hasVoted: false,
  };
}

function uniqueName(name: string, existingNames: string[]): string {
  const baseName = name.trim() || "Teammate";
  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  let suffix = 2;
  while (existingNames.includes(`${baseName} ${suffix}`)) {
    suffix += 1;
  }

  return `${baseName} ${suffix}`;
}

function ensureFacilitator(room: InternalRoom, participantId: string): RoomActionResult {
  const participant = room.participants.find((current) => current.id === participantId);
  if (!participant) {
    return { ok: false, error: "Participant not found.", room: toPublicRoom(room) };
  }

  if (!participant.isFacilitator) {
    return { ok: false, error: "Only the facilitator can do that.", room: toPublicRoom(room) };
  }

  return { ok: true, room: toPublicRoom(room) };
}

function toPublicRoom(room: InternalRoom): Room {
  const shouldReveal = room.phase === "revealed";
  return {
    id: room.id,
    phase: room.phase,
    deck: DEFAULT_DECK,
    participants: room.participants.map((participant) => {
      const visibleParticipant: Participant = {
        id: participant.id,
        name: participant.name,
        role: participant.role,
        isFacilitator: participant.isFacilitator,
        hasVoted: participant.hasVoted,
      };

      if (shouldReveal && participant.vote !== undefined) {
        visibleParticipant.vote = participant.vote;
      }

      return visibleParticipant;
    }),
    summary: shouldReveal ? summarizeVotes(room.participants) : undefined,
  };
}

function summarizeVotes(participants: InternalParticipant[]): VoteSummary {
  const votes = participants
    .filter((participant) => participant.role === "voter" && participant.vote !== undefined)
    .map((participant) => participant.vote as VoteValue);

  const counts = votes.reduce<Map<VoteValue, number>>((accumulator, vote) => {
    accumulator.set(vote, (accumulator.get(vote) ?? 0) + 1);
    return accumulator;
  }, new Map());

  const numericVotes = votes.map(Number).filter((vote) => Number.isFinite(vote));
  const sortedNumericVotes = [...numericVotes].sort((left, right) => left - right);

  return {
    average: numericVotes.length ? roundToOneDecimal(average(numericVotes)) : undefined,
    low: sortedNumericVotes.length ? String(sortedNumericVotes[0]) : undefined,
    high: sortedNumericVotes.length ? String(sortedNumericVotes.at(-1)) : undefined,
    consensus: votes.length > 0 && new Set(votes).size === 1,
    votes: [...counts.entries()].map(([label, count]) => ({ label, count })),
  };
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}
