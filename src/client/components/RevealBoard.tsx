import type { Room } from "../../shared/types";

interface RevealBoardProps {
  room: Room;
}

export function RevealBoard({ room }: RevealBoardProps) {
  const voters = room.participants.filter((participant) => participant.role === "voter");

  if (room.phase === "voting") {
    return (
      <section className="panel reveal-panel waiting-reveal">
        <p className="eyebrow">Reveal stage</p>
        <h2>Cards are face down</h2>
        <p className="subtle">When the facilitator reveals, the whole table flips at once.</p>
        <div className="face-down-row" aria-hidden="true">
          {voters.slice(0, 6).map((participant) => (
            <div key={participant.id} className={`mini-card ${participant.hasVoted ? "ready" : ""}`} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="panel reveal-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Results</p>
          <h2>{room.summary?.consensus ? "Consensus reached" : "Discuss the spread"}</h2>
        </div>
        {room.summary?.average !== undefined ? (
          <span className="average-badge">Avg {room.summary.average}</span>
        ) : null}
      </div>

      <div className="revealed-grid">
        {voters.map((participant, index) => (
          <article key={participant.id} className="result-card" style={{ animationDelay: `${index * 80}ms` }}>
            <div className="result-card-inner">
              <span className="result-value">{participant.vote ?? "—"}</span>
              <strong>{participant.name}</strong>
            </div>
          </article>
        ))}
      </div>

      {room.summary ? (
        <div className="summary-strip">
          <span>Low: {room.summary.low ?? "n/a"}</span>
          <span>High: {room.summary.high ?? "n/a"}</span>
          <span>
            Votes: {room.summary.votes.map((vote) => `${vote.label} × ${vote.count}`).join(", ") || "none"}
          </span>
        </div>
      ) : null}
    </section>
  );
}
