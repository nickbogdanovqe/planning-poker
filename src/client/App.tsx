import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { JoinPanel } from "./components/JoinPanel";
import { ParticipantsList } from "./components/ParticipantsList";
import { RevealBoard } from "./components/RevealBoard";
import { RoomHeader } from "./components/RoomHeader";
import { VoteDeck } from "./components/VoteDeck";
import type {
  ClientToServerEvents,
  JoinRoomResult,
  Participant,
  ParticipantRole,
  Room,
  RoomActionResult,
  ServerToClientEvents,
  VoteValue,
} from "../shared/types";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const socket: AppSocket = io();

export function App() {
  const [room, setRoom] = useState<Room | undefined>();
  const [self, setSelf] = useState<Participant | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const invitedRoomId = useMemo(() => getRoomIdFromPath(), []);

  useEffect(() => {
    function handleRoomUpdated(updatedRoom: Room) {
      setRoom(updatedRoom);
      setSelf((currentSelf) => {
        if (!currentSelf) {
          return currentSelf;
        }

        return updatedRoom.participants.find((participant) => participant.id === currentSelf.id) ?? currentSelf;
      });
    }

    socket.on("room:updated", handleRoomUpdated);
    socket.on("room:error", setError);

    return () => {
      socket.off("room:updated", handleRoomUpdated);
      socket.off("room:error", setError);
    };
  }, []);

  function applyJoinResult(result: JoinRoomResult) {
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setRoom(result.room);
    setSelf(result.self);
    setError(undefined);
    window.history.replaceState(null, "", `/room/${result.room.id}`);
  }

  function createRoom(name: string, role: ParticipantRole) {
    setBusy(true);
    socket.emit("room:create", { name, role }, (result) => {
      setBusy(false);
      applyJoinResult(result);
    });
  }

  function joinRoom(roomId: string, name: string, role: ParticipantRole) {
    setBusy(true);
    socket.emit("room:join", { roomId, name, role }, (result) => {
      setBusy(false);
      applyJoinResult(result);
    });
  }

  function handleAction(result: RoomActionResult) {
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(undefined);
    setRoom(result.room);
  }

  function castVote(value: VoteValue) {
    if (!room) {
      return;
    }

    socket.emit("room:vote", { roomId: room.id, value }, handleAction);
  }

  function revealRoom() {
    if (!room) {
      return;
    }

    socket.emit("room:reveal", { roomId: room.id }, handleAction);
  }

  function resetRoom() {
    if (!room) {
      return;
    }

    socket.emit("room:reset", { roomId: room.id }, handleAction);
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
