# Video Progress Queue Challenge

## Overview

Welcome to the **Video Progress Queue** coding challenge!

Your task is to build a small **full-stack app** using **React** and **Bun + ElysiaJS** that plays a YouTube video and tracks the user’s watch progress.

This is intentionally scoped for about **60–90 minutes**.  
We’re not grading perfection — we want to see how you form solutions, structure code, and reason about tradeoffs.

You’re encouraged to **take creative liberties** to impress.  
**AI tools are allowed**, as long as you include a brief note or short video explaining how and why you used them.

---

## Goal

- A YouTube video plays in your React app via [`react-player`](https://www.npmjs.com/package/react-player).
- Every **3 seconds** while the video is playing, progress (current time) is sent to the backend **queue**.
- When the video is paused, one progress entry is enqueued.
- When the video **ends** or the user **leaves the page**, an endpoint is called to run a “cron job” that merges the queue into a **progress table** containing the **furthest watched time**.

---

## Stack

| Layer           | Requirements                                               |
| --------------- | ---------------------------------------------------------- |
| **Frontend**    | React 18+, `react-player`, Tailwind optional               |
| **Backend**     | [Bun](https://bun.sh/) + [ElysiaJS](https://elysiajs.com/) |
| **Persistence** | In-memory objects or JSON file                             |
| **Auth**        | None required                                              |

---

## Structure

You can organize your code like this (recommended):

```
/video-progress-queue
├── /frontend
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/VideoPlayer.tsx
│   │   └── api.ts
│   └── README.md
├── /backend
│   ├── index.ts
│   ├── data/
│   │   ├── queue.json
│   │   └── progress.json
│   └── README.md
└── README.md  ← (this file)
```

---

## Model

### Queue Table

Stores every progress event while the video is playing.

```ts
type QueueItem = {
  videoId: string
  userId: string
  progressSeconds: number
  createdAt: string
}
```

### Progress Table

Stores the furthest progress per user and video.

```ts
type Progress = {
  videoId: string
  userId: string
  furthestSeconds: number
  updatedAt: string
}
```

---

## Backend Specification

**Base URL:** `http://localhost:3000/api`

### 1. `GET /video`

Returns a video URL and ID.

```json
{ "videoId": "yt-abc123", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }
```

---

### 2. `POST /progress/queue`

Adds a progress sample to the queue.

**Body:**

```json
{ "videoId": "yt-abc123", "userId": "test-user-1", "progressSeconds": 42 }
```

**Response:**

```json
{ "ok": true }
```

---

### 3. `GET /progress/furthest?videoId=yt-abc123&userId=test-user-1`

Retrieves the furthest progress for a given user and video.

**Responses:**

```json
{ "furthestSeconds": 0 }
```

or

```json
{ "videoId": "yt-abc123", "userId": "test-user-1", "furthestSeconds": 137 }
```

---

### 4. `POST /progress/run-cron`

Simulates a 5-minute cron job:

- For each user/video pair, find the **highest** progress in the queue.
- If higher than the progress table value, update it.
- Clear processed queue entries.

**Response:**

```json
{ "updated": true }
```

---

## Frontend

- On load:

  - `GET /video` → load the YouTube URL.
  - `GET /progress/furthest` → show the user’s furthest progress.

- While **playing**:

  - Every 3 seconds → `POST /progress/queue`.

- When **paused**:

  - `POST /progress/queue` once.

- When the video **ends** or the user **leaves**:

  - `POST /progress/run-cron`.

- Clean up timers when pausing or unmounting.

**Recommended hooks & events:**

- `onPlay`, `onPause`, `onEnded` from `react-player`.
- `beforeunload` window listener to trigger cron.

---

## Acceptance

- Functional Bun + Elysia backend with all endpoints
- React frontend that:
  - Plays a YouTube video
  - Sends progress every 3 seconds while playing
  - Sends on pause and on end/unload
- Cron endpoint updates the progress table correctly
- No duplicate intervals or runaway timers
- **Commit history shows iterative work**
- **AI usage explanation included**

---

## Deliverables

Include the following in your repo:

1. **Frontend** folder with React app
2. **Backend** folder with Bun/Elysia server
3. **README** containing:
   - How to run both sides
   - Manual test steps (see below)
   - Your assumptions and design choices
   - AI usage note or link to short Loom/video

### Suggested Scripts

**Backend:**

```bash
bun install
bun run dev
```

**Frontend:**

```bash
npm install
npm run dev
```

---

## Example

### `/backend/index.ts`

```ts
import { Elysia } from 'elysia'

const app = new Elysia()

let queue: any[] = []
let progress: Record<string, number> = {}

app.get('/api/video', () => ({
  videoId: 'yt-abc123',
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
}))

app.post('/api/progress/queue', ({ body }) => {
  queue.push({ ...body, createdAt: new Date().toISOString() })
  return { ok: true }
})

app.get('/api/progress/furthest', ({ query }) => {
  const key = `${query.userId}-${query.videoId}`
  return { furthestSeconds: progress[key] || 0 }
})

app.post('/api/progress/run-cron', () => {
  const grouped = new Map()
  for (const item of queue) {
    const key = `${item.userId}-${item.videoId}`
    grouped.set(key, Math.max(grouped.get(key) || 0, item.progressSeconds))
  }
  for (const [key, val] of grouped) {
    progress[key] = Math.max(progress[key] || 0, val)
  }
  queue = []
  return { updated: true }
})

app.listen(3000)
console.log('Backend running on http://localhost:3000')
```

---

### `/frontend/src/App.tsx`

```tsx
import { useEffect, useRef, useState } from 'react'
import ReactPlayer from 'react-player'

const API = 'http://localhost:3000/api'
const USER_ID = 'test-user-1'

export default function App() {
  const playerRef = useRef<ReactPlayer | null>(null)
  const [video, setVideo] = useState<any>(null)
  const [furthest, setFurthest] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetch(`${API}/video`)
      .then((r) => r.json())
      .then(setVideo)
    fetch(`${API}/progress/furthest?userId=${USER_ID}&videoId=yt-abc123`)
      .then((r) => r.json())
      .then((d) => setFurthest(d.furthestSeconds || 0))

    const unload = () => fetch(`${API}/progress/run-cron`, { method: 'POST' })
    window.addEventListener('beforeunload', unload)
    return () => window.removeEventListener('beforeunload', unload)
  }, [])

  const enqueueProgress = async () => {
    const t = playerRef.current?.getCurrentTime?.() || 0
    await fetch(`${API}/progress/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId: 'yt-abc123',
        userId: USER_ID,
        progressSeconds: t,
      }),
    })
  }

  const startInterval = () => {
    intervalRef.current = setInterval(enqueueProgress, 3000)
  }

  const clearIntervalIfAny = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  if (!video) return <p>Loading...</p>

  return (
    <div className="flex flex-col items-center p-8">
      <h1 className="text-xl font-bold mb-4">Video Progress Queue</h1>
      <p className="mb-2">Furthest progress: {furthest.toFixed(1)}s</p>
      <ReactPlayer
        ref={playerRef}
        url={video.url}
        controls
        onPlay={startInterval}
        onPause={() => {
          clearIntervalIfAny()
          enqueueProgress()
        }}
        onEnded={() => {
          clearIntervalIfAny()
          fetch(`${API}/progress/run-cron`, { method: 'POST' })
        }}
        width="640px"
        height="360px"
      />
    </div>
  )
}
```


---

## Prettier (frontend + backend)

Prettier is configured at the repository root and targets both `./frontend` and `./backend`.

- Config file: `.prettierrc.json`
- Ignore file: `.prettierignore`
- Prettier version: defined in root `package.json`

### CLI usage

From the repository root:

```bash
# Write changes
npm run format

# Check only (CI-friendly)
npm run format:check
```

These scripts format files under `backend/` and `frontend/` with common extensions (ts, tsx, js, json, css, md, html, yml/yaml, etc.).

### WebStorm integration (format on save)

Use the project’s Prettier binary and enable “Run on Save”.

WebStorm 2024.2+
1) Open Settings/Preferences → Tools → Actions on Save.
2) Check “Run Prettier”.
3) Prettier package: select the project Prettier at `node_modules/prettier` (root).
4) Configuration file: it will auto-detect `.prettierrc.json` at the root.
5) Optionally restrict to paths: `{backend,frontend}/**/*`.

WebStorm 2023.x (older path)
1) Settings/Preferences → Languages & Frameworks → JavaScript → Prettier.
2) Prettier package: `node_modules/prettier` (root).
3) Configuration: leave empty to auto-detect or select `.prettierrc.json`.
4) Enable “On code reformat” and “On save”.
5) Optionally set “Run for files” to `{backend,frontend}/**/*`.

Notes
- Prettier will respect `.prettierignore` (dist, build, lockfiles, etc.).
- If you use Bun for the backend, that’s fine — Prettier runs via Node under your IDE/terminal. Use `npm` or `pnpm`/`yarn` at the repo root to invoke the scripts.
- If WebStorm doesn’t auto-detect, click the folder icon and choose the project’s `node_modules/prettier`.
