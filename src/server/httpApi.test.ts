import { describe, expect, it } from "vitest";

import { createMemoryRoomRepository, createPersistentRoomsService } from "./persistentRooms";
import { handleRoomApiRequest } from "./httpApi";

describe("Vercel-compatible room API", () => {
  it("creates a persisted room that can be fetched by room id", async () => {
    const service = createPersistentRoomsService(createMemoryRoomRepository(), { id: () => "ROOM42" });

    const created = await handleRoomApiRequest(service, {
      method: "POST",
      query: {},
      body: { action: "create", participantId: "alice", name: "Alex", role: "voter" },
    });
    const fetched = await handleRoomApiRequest(service, {
      method: "GET",
      query: { roomId: "ROOM42" },
    });

    expect(created.status).toBe(200);
    expect(fetched.status).toBe(200);
    expect(fetched.body).toMatchObject({
      ok: true,
      room: {
        id: "ROOM42",
        phase: "voting",
        participants: [{ id: "alice", name: "Alex", isFacilitator: true }],
      },
    });
  });

  it("keeps votes hidden over HTTP polling until the facilitator reveals", async () => {
    const service = createPersistentRoomsService(createMemoryRoomRepository(), { id: () => "ROOM42" });
    await handleRoomApiRequest(service, {
      method: "POST",
      query: {},
      body: { action: "create", participantId: "alice", name: "Alex", role: "voter" },
    });
    await handleRoomApiRequest(service, {
      method: "POST",
      query: {},
      body: { action: "join", roomId: "ROOM42", participantId: "bob", name: "Blair", role: "voter" },
    });
    await handleRoomApiRequest(service, {
      method: "POST",
      query: {},
      body: { action: "vote", roomId: "ROOM42", participantId: "alice", value: "5" },
    });

    const hidden = await handleRoomApiRequest(service, {
      method: "GET",
      query: { roomId: "ROOM42" },
    });
    const hiddenAlice = hidden.body.ok
      ? hidden.body.room.participants.find((participant) => participant.id === "alice")
      : undefined;
    expect(hiddenAlice).toMatchObject({ hasVoted: true });
    expect(hiddenAlice?.vote).toBeUndefined();

    const revealed = await handleRoomApiRequest(service, {
      method: "POST",
      query: {},
      body: { action: "reveal", roomId: "ROOM42", participantId: "alice" },
    });
    const revealedAlice = revealed.body.ok
      ? revealed.body.room.participants.find((participant) => participant.id === "alice")
      : undefined;
    expect(revealed.status).toBe(200);
    expect(revealedAlice?.vote).toBe("5");
  });

  it("rejects malformed API actions with a 400 response", async () => {
    const service = createPersistentRoomsService(createMemoryRoomRepository());

    const response = await handleRoomApiRequest(service, {
      method: "POST",
      query: {},
      body: { action: "dance" },
    });

    expect(response).toEqual({
      status: 400,
      body: { ok: false, error: "Unsupported room action." },
    });
  });
});
