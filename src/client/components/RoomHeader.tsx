import type { Participant, Room } from "../../shared/types";

interface RoomHeaderProps {
  room: Room;
  self: Participant;
  onReveal: () => void;
  onReset: () => void;
}

export function RoomHeader({ room, self, onReveal, onReset }: RoomHeaderProps) {
  const inviteUrl = `${window.location.origin}/room/${room.id}`;
  const voters = room.participants.filter((participant) => participant.role === "voter");
  const voted = voters.filter((participant) => participant.hasVoted);
  const canReveal = self.isFacilitator && room.phase === "voting" && voted.length > 0;
  const canReset = self.isFacilitator && room.phase === "revealed";

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
  }

  return (
    <header className="room-header">
      <div>
        <p className="eyebrow">Room {room.id}</p>
        <h1>Estimate the next story</h1>
        <p className="subtle">
          {voted.length} of {voters.length} voters ready
          {self.isFacilitator ? " · You are facilitator" : ""}
        </p>
      </div>

      <div className="room-actions">
        <button className="ghost-button" type="button" onClick={copyInvite}>
          Copy invite
        </button>
        {canReveal ? (
          <button className="primary-button" type="button" onClick={onReveal}>
            Reveal cards
          </button>
        ) : null}
        {canReset ? (
          <button className="primary-button" type="button" onClick={onReset}>
            New round
          </button>
        ) : null}
      </div>
    </header>
  );
}
