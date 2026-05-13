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

export interface StoredParticipant extends Participant {
  vote?: VoteValue;
}

export interface StoredRoom {
  id: string;
  phase: Room["phase"];
  participants: StoredParticipant[];
}

export interface RoomRepository {
  get(roomId: string): Promise<StoredRoom | undefined>;
  set(room: StoredRoom): Promise<void>;
  delete(roomId: string): Promise<void>;
  has(roomId: string): Promise<boolean>;
}

interface PersistentRoomsServiceOptions {
  id?: () => string;
}

const DEFAULT_ID_LENGTH = 6;

export function createMemoryRoomRepository(): RoomRepository {
  const rooms = new Map<string, StoredRoom>();

  return {
    async get(roomId) {
      const room = rooms.get(roomId);
      return room ? cloneRoom(room) : undefined;
    },
    async set(room) {
      rooms.set(room.id, cloneRoom(room));
    },
    async delete(roomId) {
      rooms.delete(roomId);
    },
    async has(roomId) {
      return rooms.has(roomId);
    },
  };
}

export function createPersistentRoomsService(repository: RoomRepository, options: PersistentRoomsServiceOptions = {}) {
  const makeId = options.id ?? createRoomId;

  async function createRoom(input: CreateRoomInput): Promise<JoinRoomResult> {
    let id = makeId();
    while (await repository.has(id)) {
      id = makeId();
    }

    const participant = createParticipant(input, {
      isFacilitator: true,
      existingNames: [],
    });
    const storedRoom: StoredRoom = {
      id,
      phase: "voting",
      participants: [participant],
    };
    await repository.set(storedRoom);

    const room = toPublicRoom(storedRoom);
    return { ok: true, room, self: room.participants[0] as Participant };
  }

  async function joinRoom(input: JoinRoomInput): Promise<JoinRoomResult> {
    const room = await repository.get(input.roomId);
    if (!room) {
      return { ok: false, error: "Room not found." };
    }

    const existing = room.participants.find((participant) => participant.id === input.participantId);
    if (!existing) {
      room.participants.push(
        createParticipant(input, {
          isFacilitator: room.participants.length === 0,
          existingNames: room.participants.map((participant) => participant.name),
        }),
      );
      await repository.set(room);
    }

    const publicRoom = toPublicRoom(room);
    return {
      ok: true,
      room: publicRoom,
      self: publicRoom.participants.find((participant) => participant.id === input.participantId) as Participant,
    };
  }

  async function getRoom(roomId: string): Promise<RoomActionResult> {
    const room = await repository.get(roomId);
    if (!room) {
      return { ok: false, error: "Room not found." };
    }

    return { ok: true, room: toPublicRoom(room) };
  }

  async function castVote(input: VoteInput): Promise<RoomActionResult> {
    const room = await repository.get(input.roomId);
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
    await repository.set(room);
    return { ok: true, room: toPublicRoom(room) };
  }

  async function revealRoom(input: FacilitatorActionInput): Promise<RoomActionResult> {
    const room = await repository.get(input.roomId);
    if (!room) {
      return { ok: false, error: "Room not found." };
    }

    const permission = ensureFacilitator(room, input.participantId);
    if (!permission.ok) {
      return permission;
    }

    room.phase = "revealed";
    await repository.set(room);
    return { ok: true, room: toPublicRoom(room) };
  }

  async function resetRound(input: FacilitatorActionInput): Promise<RoomActionResult> {
    const room = await repository.get(input.roomId);
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
    await repository.set(room);
    return { ok: true, room: toPublicRoom(room) };
  }

  return {
    createRoom,
    joinRoom,
    getRoom,
    castVote,
    revealRoom,
    resetRound,
  };
}

export type PersistentRoomsService = ReturnType<typeof createPersistentRoomsService>;

function createRoomId(): string {
  return randomUUID().replaceAll("-", "").slice(0, DEFAULT_ID_LENGTH).toUpperCase();
}

function createParticipant(
  input: CreateRoomInput,
  options: { isFacilitator: boolean; existingNames: string[] },
): StoredParticipant {
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

function ensureFacilitator(room: StoredRoom, participantId: string): RoomActionResult {
  const participant = room.participants.find((current) => current.id === participantId);
  if (!participant) {
    return { ok: false, error: "Participant not found.", room: toPublicRoom(room) };
  }

  if (!participant.isFacilitator) {
    return { ok: false, error: "Only the facilitator can do that.", room: toPublicRoom(room) };
  }

  return { ok: true, room: toPublicRoom(room) };
}

function toPublicRoom(room: StoredRoom): Room {
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

function summarizeVotes(participants: StoredParticipant[]): VoteSummary {
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

function cloneRoom(room: StoredRoom): StoredRoom {
  return {
    ...room,
    participants: room.participants.map((participant) => ({ ...participant })),
  };
}
