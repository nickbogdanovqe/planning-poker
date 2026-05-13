export type ParticipantRole = "voter" | "observer";

export type RoomPhase = "voting" | "revealed";

export type VoteValue = string;

export interface DeckCard {
  value: VoteValue;
  label: string;
  tone: "number" | "uncertain" | "break";
}

export interface Participant {
  id: string;
  name: string;
  role: ParticipantRole;
  isFacilitator: boolean;
  hasVoted: boolean;
  vote?: VoteValue;
}

export interface VoteCount {
  label: VoteValue;
  count: number;
}

export interface VoteSummary {
  average?: number;
  high?: VoteValue;
  low?: VoteValue;
  consensus: boolean;
  votes: VoteCount[];
}

export interface Room {
  id: string;
  phase: RoomPhase;
  deck: DeckCard[];
  participants: Participant[];
  summary?: VoteSummary;
}

export interface CreateRoomInput {
  participantId: string;
  name: string;
  role: ParticipantRole;
}

export interface JoinRoomInput extends CreateRoomInput {
  roomId: string;
}

export interface VoteInput {
  roomId: string;
  participantId: string;
  value: VoteValue;
}

export interface FacilitatorActionInput {
  roomId: string;
  participantId: string;
}

export type RoomActionResult =
  | {
      ok: true;
      room: Room;
    }
  | {
      ok: false;
      error: string;
      room?: Room;
    };

export type JoinRoomResult =
  | {
      ok: true;
      room: Room;
      self: Participant;
    }
  | {
      ok: false;
      error: string;
      room?: Room;
      self?: undefined;
    };

export interface ServerToClientEvents {
  "room:updated": (room: Room) => void;
  "room:error": (message: string) => void;
}

export interface ClientToServerEvents {
  "room:create": (input: Omit<CreateRoomInput, "participantId">, callback: (result: JoinRoomResult) => void) => void;
  "room:join": (input: Omit<JoinRoomInput, "participantId">, callback: (result: JoinRoomResult) => void) => void;
  "room:vote": (input: Pick<VoteInput, "roomId" | "value">, callback?: (result: RoomActionResult) => void) => void;
  "room:reveal": (input: Pick<FacilitatorActionInput, "roomId">, callback?: (result: RoomActionResult) => void) => void;
  "room:reset": (input: Pick<FacilitatorActionInput, "roomId">, callback?: (result: RoomActionResult) => void) => void;
}
