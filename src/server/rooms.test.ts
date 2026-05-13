import { describe, expect, it } from "vitest";

import { DEFAULT_DECK } from "../shared/deck";
import { createRoomsService } from "./rooms";

describe("rooms service", () => {
  it("creates a voting room with the creator as facilitator", () => {
    const rooms = createRoomsService({ id: () => "room-123" });

    const result = rooms.createRoom({
      participantId: "socket-a",
      name: "Nikita",
      role: "voter",
    });

    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.room.id).toBe("room-123");
    expect(result.room.phase).toBe("voting");
    expect(result.self.isFacilitator).toBe(true);
    expect(result.room.participants).toHaveLength(1);
    expect(result.room.participants[0]).toMatchObject({
      id: "socket-a",
      name: "Nikita",
      role: "voter",
      hasVoted: false,
      isFacilitator: true,
    });
  });

  it("keeps votes hidden until the facilitator reveals the round", () => {
    const rooms = createRoomsService({ id: () => "room-123" });
    rooms.createRoom({ participantId: "alice", name: "Alex", role: "voter" });
    rooms.joinRoom({ roomId: "room-123", participantId: "bob", name: "Blair", role: "voter" });

    rooms.castVote({ roomId: "room-123", participantId: "alice", value: "5" });

    const hiddenRoom = rooms.getRoom("room-123");
    const hiddenAlex = hiddenRoom?.participants.find((participant) => participant.id === "alice");
    expect(hiddenAlex).toMatchObject({ hasVoted: true });
    expect(hiddenAlex?.vote).toBeUndefined();

    const revealed = rooms.revealRoom({ roomId: "room-123", participantId: "alice" });
    const revealedAlex = revealed.room?.participants.find((participant) => participant.id === "alice");
    expect(revealed.ok).toBe(true);
    expect(revealed.room?.phase).toBe("revealed");
    expect(revealedAlex?.vote).toBe("5");
    expect(revealed.room?.summary).toEqual({
      average: 5,
      high: "5",
      low: "5",
      consensus: true,
      votes: [{ label: "5", count: 1 }],
    });
  });

  it("prevents observers from casting votes", () => {
    const rooms = createRoomsService({ id: () => "room-123" });
    rooms.createRoom({ participantId: "facilitator", name: "Nikita", role: "voter" });
    rooms.joinRoom({ roomId: "room-123", participantId: "observer", name: "Taylor", role: "observer" });

    const vote = rooms.castVote({ roomId: "room-123", participantId: "observer", value: "8" });

    expect(vote).toEqual({ ok: false, error: "Observers cannot vote." });
    expect(rooms.getRoom("room-123")?.participants.find((participant) => participant.id === "observer")).toMatchObject({
      hasVoted: false,
    });
  });

  it("resets a revealed round for the next story", () => {
    const rooms = createRoomsService({ id: () => "room-123" });
    rooms.createRoom({ participantId: "alice", name: "Alex", role: "voter" });
    rooms.joinRoom({ roomId: "room-123", participantId: "bob", name: "Blair", role: "voter" });
    rooms.castVote({ roomId: "room-123", participantId: "alice", value: "3" });
    rooms.castVote({ roomId: "room-123", participantId: "bob", value: "5" });
    rooms.revealRoom({ roomId: "room-123", participantId: "alice" });

    const reset = rooms.resetRound({ roomId: "room-123", participantId: "alice" });

    expect(reset.ok).toBe(true);
    expect(reset.room?.phase).toBe("voting");
    expect(reset.room?.summary).toBeUndefined();
    expect(reset.room?.participants.every((participant) => !participant.hasVoted && participant.vote === undefined)).toBe(true);
  });

  it("keeps duplicate display names readable", () => {
    const rooms = createRoomsService({ id: () => "room-123" });
    rooms.createRoom({ participantId: "alice", name: "Sam", role: "voter" });
    const joined = rooms.joinRoom({ roomId: "room-123", participantId: "bob", name: "Sam", role: "voter" });

    expect(joined.self?.name).toBe("Sam 2");
  });

  it("uses a Fibonacci-style default deck", () => {
    expect(DEFAULT_DECK.map((card) => card.value)).toEqual(["0", "1", "2", "3", "5", "8", "13", "21", "?", "coffee"]);
  });
});
