# Minimal Chat Frontend

React + TypeScript + Vite frontend for the Node.js / Express / PostgreSQL / `ws` chat backend.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173.

## Environment

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## Expected backend contract

- `POST /api/auth/register`: `{ email, username, password }`
- `POST /api/auth/login`: `{ email, password }`; returns `{ accessToken, user }`
- `POST /api/auth/refresh`: uses the HttpOnly refresh cookie; returns `{ accessToken, user }`
- `POST /api/auth/logout`: revokes refresh token and clears cookie
- `GET /api/users`: Bearer access token; returns an array of `{ id, username }` or `{ users: [...] }`
- WebSocket URL: `ws://localhost:3000/?token=<accessToken>`
- Outgoing message: `{ "type": "message", "to": <userId>, "content": "..." }`