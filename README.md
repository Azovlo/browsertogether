# 🌐 BrowserTogether

Browse the web together in real time. Share a Chromium browser session with up to 6 people.

## Features

- 🖥️ **Shared Chromium browser** — streamed via JPEG snapshots at ~15fps
- 🎮 **Control sharing** — host can grant/revoke browser control to any guest
- 💬 **Live chat** — with stickers, emoji reactions, and file sharing
- 📁 **File sharing** — images, PDFs, videos with inline preview
- 🔗 **Invite links** — share a link or 8-char code to join
- 👥 **Up to 6 users** per room

## Quick Start

### Docker (recommended)

```bash
cd browsertogether
docker-compose up --build
```

Then open http://localhost:3000

### Local Development

**Backend:**
```bash
cd server
cp .env.example .env
npm install
npx playwright install chromium
npm run dev
```

**Frontend:**
```bash
cd client
cp .env.example .env
npm install
npm start
```

## Architecture

```
browsertogether/
├── server/              # Node.js + Express + Socket.io backend
│   └── src/
│       ├── index.ts          # Server entry point
│       ├── services/
│       │   ├── browserService.ts   # Playwright Chromium control
│       │   ├── roomManager.ts      # Room state management
│       │   └── socketService.ts    # Socket.io event handlers
│       └── routes/
│           ├── rooms.ts       # REST room endpoints
│           └── files.ts       # File upload endpoint
│
└── client/              # React + TypeScript + Tailwind frontend
    └── src/
        ├── App.tsx
        ├── stores/roomStore.ts     # Zustand global state
        ├── hooks/useSocket.ts      # Socket.io client hook
        ├── types/index.ts          # Shared TypeScript types
        └── components/
            ├── browser/            # Browser view & toolbar
            ├── chat/               # Chat panel, messages, stickers
            ├── room/               # Room header, users panel
            └── ui/                 # Toast notifications
```

## How it works

1. Host creates a room → server spawns a Chromium page via Playwright
2. Server screenshots the page at ~15fps, sends JPEG frames via Socket.io
3. Client renders frames on an `<img>` tag
4. Mouse/keyboard events are mapped from client coordinates → server coordinates
5. Guests can request control; host approves/denies
6. Files upload to server `/uploads/` dir, shared via chat

## Environment Variables

**Server:**
- `PORT` — server port (default: 3001)
- `CLIENT_URL` — frontend URL for CORS (default: http://localhost:3000)
- `MAX_ROOMS` — max concurrent rooms (default: 50)
- `MAX_USERS_PER_ROOM` — max users per room (default: 6)

**Client:**
- `REACT_APP_SERVER_URL` — server URL (leave empty for proxy in dev)
