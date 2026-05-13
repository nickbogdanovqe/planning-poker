# Planning-Poker

A polished real-time Planning Poker app for agile teams. Create an estimation room, share the invite link, let teammates vote privately, then reveal everyone’s cards with a smooth animated result board.

## Features

- Ephemeral rooms with shareable invite links
- Display-name based joining with duplicate-name handling
- Voter and observer modes
- Hidden votes until the facilitator reveals the round
- Animated reveal board and summary stats
- One-click reset for the next story

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and create a room. Open the invite link in another tab or browser to simulate teammates.

## Scripts

- `npm run dev` starts the Express, Socket.IO, and Vite dev server.
- `npm test` runs unit tests.
- `npm run typecheck` verifies TypeScript.
- `npm run lint` runs ESLint.
- `npm run build` creates a production client and server build.
- `npm start` runs the production server from `dist/server`.

## Deployment Notes

Rooms are stored in memory for version 1. This keeps setup simple, but room state resets when the server restarts. For multi-instance hosting, add a shared store and Socket.IO adapter such as Redis.
