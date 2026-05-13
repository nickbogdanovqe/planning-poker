import { useEffect, useMemo, useState } from "react";

import { JoinPanel } from "./components/JoinPanel";
import { ParticipantsList } from "./components/ParticipantsList";
import { RevealBoard } from "./components/RevealBoard";
import { RoomHeader } from "./components/RoomHeader";
import { VoteDeck } from "./components/VoteDeck";
import * as roomApi from "./roomApi";
import type {
  JoinRoomResult,
  Participant,
  ParticipantRole,
  Room,
  RoomActionResult,
  VoteValue,
} from "../shared/types";

export function App() {
  const [room, setRoom] = useState<Room | undefined>();
  const [self, setSelf] = useState<Participant | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const invitedRoomId = useMemo(() => getRoomIdFromPath(), []);
  const participantId = useMemo(() => roomApi.getParticipantId(), []);

  useEffect(() => {
    if (!room || !self) {
      return undefined;
    }

    const interval = window.setInterval(async () => {
      const result = await roomApi.getRoom(room.id);
      if (result.ok) {
        syncRoom(result.room, participantId);
      }
    }, 1200);
    return () => {
      window.clearInterval(interval);
    };
  }, [participantId, room?.id, self?.id]);

  function syncRoom(updatedRoom: Room, currentParticipantId = participantId) {
    setRoom(updatedRoom);
    setSelf((currentSelf) => {
      const fallbackId = currentSelf?.id ?? currentParticipantId;
      return updatedRoom.participants.find((participant) => participant.id === fallbackId) ?? currentSelf;
    });
  }

  function applyJoinResult(result: JoinRoomResult) {
    if (!result.ok) {
      setError(result.error);
      return;
    }

    syncRoom(result.room, result.self.id);
    setSelf(result.self);
    setError(undefined);
    window.history.replaceState(null, "", `/room/${result.room.id}`);
  }

  async function createRoom(name: string, role: ParticipantRole) {
    setBusy(true);
    try {
      applyJoinResult(await roomApi.createRoom(participantId, name, role));
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom(roomId: string, name: string, role: ParticipantRole) {
    setBusy(true);
    try {
      applyJoinResult(await roomApi.joinRoom(participantId, roomId, name, role));
    } finally {
      setBusy(false);
    }
  }

  function handleAction(result: RoomActionResult) {
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(undefined);
    syncRoom(result.room);
  }

  async function castVote(value: VoteValue) {
    if (!room) {
      return;
    }

    handleAction(await roomApi.castVote(participantId, room.id, value));
  }

  async function revealRoom() {
    if (!room) {
      return;
    }

    handleAction(await roomApi.revealRoom(participantId, room.id));
  }

  async function resetRoom() {
    if (!room) {
      return;
    }

    handleAction(await roomApi.resetRoom(participantId, room.id));
  }

  if (!room || !self) {
    return (
      <main className="app-shell">
        <JoinPanel
          busy={busy}
          error={error}
          initialRoomId={invitedRoomId}
          onCreate={createRoom}
          onJoin={joinRoom}
        />
      </main>
    );
  }

  const selfInRoom = room.participants.find((participant) => participant.id === self.id) ?? self;

  return (
    <main className="app-shell room-shell">
      <RoomHeader room={room} self={selfInRoom} onReveal={revealRoom} onReset={resetRoom} />

      {error ? <div className="notice error-notice">{error}</div> : null}

      <section className="room-grid">
        <div className="primary-column">
          <VoteDeck room={room} self={selfInRoom} onVote={castVote} />
          <RevealBoard room={room} />
        </div>

        <ParticipantsList participants={room.participants} phase={room.phase} />
      </section>
    </main>
  );
}

function getRoomIdFromPath(): string {
  const match = window.location.pathname.match(/^\/room\/([^/]+)$/);
  return match?.[1] ?? "";
}
