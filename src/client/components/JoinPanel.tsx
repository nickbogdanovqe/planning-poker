import { useState } from "react";

import type { ParticipantRole } from "../../shared/types";

interface JoinPanelProps {
  busy: boolean;
  error?: string;
  initialRoomId: string;
  onCreate: (name: string, role: ParticipantRole) => void;
  onJoin: (roomId: string, name: string, role: ParticipantRole) => void;
}

export function JoinPanel({ busy, error, initialRoomId, onCreate, onJoin }: JoinPanelProps) {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState(initialRoomId);
  const [role, setRole] = useState<ParticipantRole>("voter");
  const [mode, setMode] = useState<"create" | "join">(initialRoomId ? "join" : "create");

  const canSubmit = name.trim().length > 0 && (mode === "create" || roomId.trim().length > 0);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    if (mode === "create") {
      onCreate(name, role);
      return;
    }

    onJoin(roomId.trim().toUpperCase(), name, role);
  }

  return (
    <section className="hero-card">
      <div className="hero-copy">
        <p className="eyebrow">Agile estimation, made playful</p>
        <h1>Planning Poker for focused teams</h1>
        <p className="hero-text">
          Create a room, invite teammates, vote privately, and reveal the whole table at once with a
          polished card flip.
        </p>
      </div>

      <form className="join-card" onSubmit={submit}>
        <div className="mode-switch" role="tablist" aria-label="Choose how to start">
          <button
            type="button"
            className={mode === "create" ? "active" : ""}
            onClick={() => setMode("create")}
            role="tab"
            aria-selected={mode === "create"}
          >
            Create room
          </button>
          <button
            type="button"
            className={mode === "join" ? "active" : ""}
            onClick={() => setMode("join")}
            role="tab"
            aria-selected={mode === "join"}
          >
            Join room
          </button>
        </div>

        <label>
          Your name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex" autoFocus />
        </label>

        {mode === "join" ? (
          <label>
            Room code
            <input value={roomId} onChange={(event) => setRoomId(event.target.value)} placeholder="ROOM42" />
          </label>
        ) : null}

        <fieldset className="role-options">
          <legend>Participation</legend>
          <label>
            <input
              type="radio"
              checked={role === "voter"}
              onChange={() => setRole("voter")}
              name="role"
            />
            I will vote
          </label>
          <label>
            <input
              type="radio"
              checked={role === "observer"}
              onChange={() => setRole("observer")}
              name="role"
            />
            Observe only
          </label>
        </fieldset>

        {error ? <div className="notice error-notice">{error}</div> : null}

        <button className="primary-button" type="submit" disabled={!canSubmit || busy}>
          {busy ? "Connecting..." : mode === "create" ? "Start estimation" : "Join team room"}
        </button>
      </form>
    </section>
  );
}
