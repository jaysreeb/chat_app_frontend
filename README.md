# Chat App Frontend

Minimal real-time chat frontend built with vanilla JavaScript, HTML, and CSS.  
The application connects to a Node.js + WebSocket backend and supports authentication, user discovery, and live messaging.

---

## Features

- User registration and login
- JWT-based authentication
- Real-time messaging using WebSockets
- Online/offline connection indicator
- User discovery sidebar
- Offline message delivery support
- Minimal terminal-inspired UI
- Auto-scrolling message view
- XSS-safe message rendering using HTML escaping

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Transport | WebSocket |
| Authentication | JWT |
| Backend API | Express.js |
| Database | PostgreSQL |

---

## Project Structure

```text
chat_app_frontend/
│
├── index.html
├── index.js
├── styles.css
└── README.md
```

---

## Authentication Flow

### Registration

Frontend sends:

```http
POST /api/auth/register
```

with:

```json
{
  "email": "user@example.com",
  "username": "alice",
  "password": "password123"
}
```

---

### Login

Frontend sends:

```http
POST /api/auth/login
```

with:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Backend returns:
- JWT token
- user id
- username
- email

The frontend stores these values in runtime session state.

---

## WebSocket Flow

After login:

```text
Frontend
   ↓
JWT token received
   ↓
WebSocket connection established
   ↓
Realtime messaging begins
```

WebSocket connection:

```js
ws://localhost:3000?token=JWT_TOKEN
```

Supported WebSocket event types:

| Type | Description |
|---|---|
| connected | Connection established |
| message | Incoming message |
| queued | Recipient offline |
| delivered | Delivery acknowledgement |
| info | System information |
| error | Protocol or validation error |

---

## Running Locally

### 1. Clone frontend repository

```bash
git clone https://github.com/jaysreeb/chat_app_frontend
cd chat_app_frontend
```

---

### 2. Start local static server

Using `serve`:

```bash
npm install -g serve
serve .
```

OR use the VS Code Live Server extension.

---

### 3. Ensure backend is running

Backend must be available at:

```text
http://localhost:3000
```

---

### 4. Open frontend

```text
http://localhost:5173
```

or your Live Server URL.

---

## Core Frontend Concepts

### Session State

Frontend maintains runtime session state:

```js
token
currentUserId
currentUsername
recipientId
```

---

### Message Rendering

Messages are dynamically rendered into the DOM using:

```js
addMessage()
```

Messages are HTML-escaped before rendering to prevent XSS injection.

---

### User Discovery

Users are loaded from:

```http
GET /api/users
```

and dynamically populated into the sidebar `<select>` dropdown.

---

## Security Considerations

- Passwords are never stored on frontend
- JWT used for authentication
- HTML escaping prevents XSS injection
- Generic login errors prevent user enumeration
- Protected routes require Bearer token

---

## Planned Improvements

```text
TODO:
- Improve message delivery acknowledgements
```

---

## UI Overview

### Authentication Screen
- Login
- Registration
- Validation feedback

### Chat Screen
- User discovery sidebar
- Real-time message area
- WebSocket status
- Active chat messaging

---

## Notes

This frontend was intentionally built without frameworks to better understand:
- browser networking
- WebSocket lifecycle
- DOM manipulation
- async request flow
- authentication state propagation
- realtime event-driven architecture