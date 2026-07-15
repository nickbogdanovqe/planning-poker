import { describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();

class MockBlobNotFoundError extends Error {}

vi.mock("@vercel/blob", () => {
  return {
    BlobNotFoundError: MockBlobNotFoundError,
    async put(pathname: string, body: string) {
      store.set(pathname, body);
      return { pathname, url: `https://example.test/${pathname}` };
    },
    async get(pathname: string) {
      const body = store.get(pathname);
      if (body === undefined) {
        return null;
      }

      return {
        statusCode: 200 as const,
        stream: new Response(body).body,
        headers: new Headers(),
        blob: { contentType: "application/json", size: body.length },
      };
    },
    async head(pathname: string) {
      if (!store.has(pathname)) {
        throw new MockBlobNotFoundError();
      }

      return { pathname };
    },
    async del(pathname: string) {
      store.delete(pathname);
    },
  };
});

const { createBlobRoomRepository } = await import("./blobRoomRepository.js");

function sampleRoom(id: string) {
  return {
    id,
    phase: "voting" as const,
    participants: [{ id: "alice", name: "Alex", role: "voter" as const, isFacilitator: true, hasVoted: false }],
  };
}

describe("blob room repository", () => {
  it("round-trips a room through set/get", async () => {
    const repository = createBlobRoomRepository();
    await repository.set(sampleRoom("ROOM01"));

    const fetched = await repository.get("ROOM01");

    expect(fetched).toMatchObject({ id: "ROOM01", phase: "voting" });
    expect(fetched?.participants).toHaveLength(1);
  });

  it("reports has() as false before a room exists and true afterwards", async () => {
    const repository = createBlobRoomRepository();

    expect(await repository.has("ROOM02")).toBe(false);

    await repository.set(sampleRoom("ROOM02"));

    expect(await repository.has("ROOM02")).toBe(true);
  });

  it("deletes a room so it can no longer be fetched", async () => {
    const repository = createBlobRoomRepository();
    await repository.set(sampleRoom("ROOM03"));

    await repository.delete("ROOM03");

    expect(await repository.get("ROOM03")).toBeUndefined();
    expect(await repository.has("ROOM03")).toBe(false);
  });

  it("treats rooms older than the TTL as expired and cleans them up", async () => {
    const repository = createBlobRoomRepository();
    const staleRoom = { ...sampleRoom("ROOM04"), updatedAt: Date.now() - 1000 * 60 * 60 * 13 };
    store.set("rooms/ROOM04.json", JSON.stringify(staleRoom));

    const fetched = await repository.get("ROOM04");

    expect(fetched).toBeUndefined();
    expect(await repository.has("ROOM04")).toBe(false);
  });
});
