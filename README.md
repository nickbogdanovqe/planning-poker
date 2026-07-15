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
pnpm install
pnpm run dev
```

Open `http://localhost:3000` and create a room. Open the invite link in another tab or browser to simulate teammates.

## Scripts

- `pnpm run dev` starts the Express, Socket.IO, and Vite dev server.
- `pnpm test` runs unit tests.
- `pnpm run typecheck` verifies TypeScript.
- `pnpm run lint` runs ESLint.
- `pnpm run build` creates a production client and server build.
- `pnpm run vercel-build` creates the static client build used by Vercel.
- `pnpm start` runs the production server from `dist/server`.

## Vercel Deployment

This project is Vercel-ready. Vercel hosts the Vite client from `dist/client` and serves room actions through the serverless function at `/api/rooms`.

Vercel serverless functions do not keep a persistent Socket.IO process alive, so the deployed app uses HTTP actions with lightweight polling. Room state is stored in [Vercel Blob](https://vercel.com/docs/vercel-blob) as one JSON file per room, so rooms survive cold starts and are shared across every serverless instance.

1. Import the repository in Vercel.
2. In the project's **Storage** tab, select **Create Database** → **Blob**, and connect it to the project. Vercel automatically injects the credentials the app needs (`BLOB_READ_WRITE_TOKEN` / OIDC vars) — no manual environment variable setup is required.
3. Deploy with the included `vercel.json`.

Rooms are stored privately in the Blob store and expire after 12 hours of inactivity (checked lazily on read, so there's no background job to manage). Multiple rooms coexist independently, each as its own blob keyed by room code.

Local development (`pnpm run dev`) uses the Socket.IO-based Express server, which keeps rooms in memory for the lifetime of the dev process, so local room state resets when the dev server restarts.
