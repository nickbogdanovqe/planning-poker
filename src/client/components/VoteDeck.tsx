import type { Participant, Room, VoteValue } from "../../shared/types";

interface VoteDeckProps {
  room: Room;
  self: Participant;
  onVote: (value: VoteValue) => void;
}

export function VoteDeck({ room, self, onVote }: VoteDeckProps) {
  const disabled = self.role === "observer" || room.phase === "revealed";
  const selectedVote = room.phase === "revealed" ? self.vote : undefined;

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Your cards</p>
          <h2>Choose effort</h2>
        </div>
        <span className={`phase-pill ${room.phase}`}>{room.phase === "voting" ? "Voting" : "Revealed"}</span>
      </div>

      {self.role === "observer" ? (
        <div className="notice">You are observing this round. You can still follow the reveal live.</div>
      ) : null}

      <div className="deck-grid" aria-label="Planning poker cards">
        {room.deck.map((card) => (
          <button
            key={card.value}
            type="button"
            className={`vote-card ${card.tone} ${selectedVote === card.value ? "selected" : ""}`}
            onClick={() => onVote(card.value)}
            disabled={disabled}
            aria-pressed={selectedVote === card.value}
          >
            <span>{card.label}</span>
          </button>
        ))}
      </div>

      <p className="subtle">
        {room.phase === "revealed"
          ? "Start a new round to vote again."
          : self.hasVoted
            ? "Vote locked in. You can change it until reveal."
            : "Votes are hidden from the team until reveal."}
      </p>
    </section>
  );
}
