import type { Participant, RoomPhase } from "../../shared/types";

interface ParticipantsListProps {
  participants: Participant[];
  phase: RoomPhase;
}

export function ParticipantsList({ participants, phase }: ParticipantsListProps) {
  return (
    <aside className="panel participants-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Team</p>
          <h2>{participants.length} joined</h2>
        </div>
      </div>

      <div className="participant-list">
        {participants.map((participant) => (
          <article key={participant.id} className="participant-row">
            <div className="avatar" aria-hidden="true">
              {participant.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <strong>{participant.name}</strong>
              <p>
                {participant.isFacilitator ? "Facilitator" : participant.role === "observer" ? "Observer" : "Voter"}
              </p>
            </div>
            <span className={`status-dot ${participant.hasVoted ? "ready" : ""}`} title={statusLabel(participant, phase)}>
              {phase === "revealed" && participant.vote ? participant.vote : participant.hasVoted ? "✓" : "·"}
            </span>
          </article>
        ))}
      </div>
    </aside>
  );
}

function statusLabel(participant: Participant, phase: RoomPhase): string {
  if (participant.role === "observer") {
    return "Observer";
  }

  if (phase === "revealed" && participant.vote) {
    return `Voted ${participant.vote}`;
  }

  return participant.hasVoted ? "Voted" : "Waiting";
}
