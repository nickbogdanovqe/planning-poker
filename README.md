# Planning-Poker

A polished Planning Poker app for agile teams. Create an estimation room, share the invite link, let teammates vote privately, then reveal everyone’s cards with a smooth animated result board.

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
- `npm run vercel-build` creates the static client build used by Vercel.
- `npm start` runs the production server from `dist/server`.

## Vercel Deployment

This project is Vercel-ready. Vercel hosts the Vite client from `dist/client` and serves room actions through the serverless function at `/api/rooms`.

Vercel serverless functions do not keep a persistent Socket.IO process alive, so the deployed app uses HTTP actions with lightweight polling and stores room state in Redis.

1. Import the repository in Vercel.
2. Add Vercel KV or an Upstash Redis database.
3. Set these environment variables:
   - `KV_REST_API_URL` and `KV_REST_API_TOKEN` for Vercel KV, or
   - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for Upstash Redis.
4. Deploy with the included `vercel.json`.

Rooms expire from Redis after 12 hours of inactivity. Local development stores API rooms in memory, so local room state resets when the dev server restarts.
