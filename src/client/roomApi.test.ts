import { afterEach, describe, expect, it } from "vitest";

import { getParticipantId } from "./roomApi";

function createFakeStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    key: (index) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
}

function openNewBrowserTab(sharedLocalStorage: Storage, nextUuid: () => string): void {
  // Each browser tab gets its own sessionStorage, but shares localStorage with every
  // other tab in the same browser - that's the real-world condition this test models.
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: sharedLocalStorage,
    sessionStorage: createFakeStorage(),
    crypto: { randomUUID: nextUuid },
  };
}

describe("getParticipantId", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("gives two different browser tabs of the same browser distinct participant ids", () => {
    const sharedLocalStorage = createFakeStorage();
    let uuidCounter = 0;
    const nextUuid = () => `uuid-${++uuidCounter}`;

    openNewBrowserTab(sharedLocalStorage, nextUuid);
    const firstTabId = getParticipantId();

    openNewBrowserTab(sharedLocalStorage, nextUuid);
    const secondTabId = getParticipantId();

    expect(secondTabId).not.toBe(firstTabId);
  });

  it("keeps the same participant id across reloads within one tab", () => {
    const sharedLocalStorage = createFakeStorage();
    let uuidCounter = 0;
    const nextUuid = () => `uuid-${++uuidCounter}`;

    openNewBrowserTab(sharedLocalStorage, nextUuid);
    const firstCall = getParticipantId();
    const secondCallSameTab = getParticipantId();

    expect(secondCallSameTab).toBe(firstCall);
  });
});
