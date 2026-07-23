# 🎨 Real-Time Collaborative Whiteboard

A lightweight, real-time collaborative whiteboard where multiple users can draw together using a shared room code — **no sign-up, no database, no login required**.

## Tech Stack

| Layer     | Technology                  |
|-----------|-----------------------------|
| Frontend  | Next.js 14 (App Router, JS) |
| Styling   | Tailwind CSS                |
| Backend   | Node.js + Express           |
| Real-time | Socket.IO                   |

---

## Project Structure

```
/
├── client/          ← Next.js frontend (port 3000)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.js          Root layout
│   │   │   ├── page.js            Landing page (Create / Join)
│   │   │   ├── globals.css        Tailwind base styles
│   │   │   └── board/
│   │   │       └── [roomCode]/
│   │   │           └── page.js    Whiteboard room page
│   │   ├── components/
│   │   │   ├── Toolbar.js         Top toolbar (tools, color, size, room info)
│   │   │   └── WhiteboardCanvas.js  HTML5 Canvas drawing component
│   │   └── lib/
│   │       └── socket.js          Socket.IO singleton client
│   ├── .env.local                 NEXT_PUBLIC_SERVER_URL
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── server/          ← Express + Socket.IO backend (port 4000)
    ├── index.js     Main server file
    └── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher

---

### 1. Start the Backend Server

```bash
cd server
npm install
npm start
```

The server will start at **http://localhost:4000**.

> For development with auto-reload:
> ```bash
> npm run dev
> ```

---

### 2. Start the Frontend Client

Open a **second terminal**:

```bash
cd client
npm install
npm run dev
```

The app will be available at **http://localhost:3000**.

---

## Usage

1. Open **http://localhost:3000** in your browser.
2. Click **Create Room** — a 6-character room code is generated automatically.
3. Share the room code with collaborators.
4. Others open the app and click **Join Room**, then enter the code.
5. Everyone in the room draws on the same canvas in real-time!

---

## Features

| Feature              | Details                                     |
|----------------------|---------------------------------------------|
| ✏️ Pencil tool       | Freehand drawing with smooth curves         |
| 🩹 Eraser tool       | Erases by drawing in white                  |
| 🎨 Color picker      | Full color spectrum                         |
| 📏 Brush size slider | 1–50px adjustable brush                     |
| 🧹 Clear board       | Clears canvas for ALL users in the room     |
| 📋 Copy room code    | One-click clipboard copy                    |
| 👥 User count        | Live count of connected collaborators       |
| 🔄 Late join support | New users see what was drawn before they joined |
| 📱 Touch support     | Works on tablets and touch screens          |
| 🚪 Leave room        | Gracefully leaves and auto-cleans empty rooms |

---

## Socket.IO Events Reference

| Event        | Direction        | Description                               |
|--------------|------------------|-------------------------------------------|
| `create-room`| Client → Server  | Request a new room code                   |
| `join-room`  | Client → Server  | Join an existing room by code             |
| `leave-room` | Client → Server  | Leave the current room                    |
| `drawing`    | Bidirectional    | Broadcast a drawing stroke                |
| `clear-board`| Bidirectional    | Clear the board for all users             |
| `user-count` | Server → Client  | Update the count of connected users       |
| `disconnect` | Automatic        | Socket cleanup on tab close / navigation  |

---

## Configuration

### Backend port

Edit `server/index.js`:

```js
const PORT = process.env.PORT || 4000;
```

### Frontend server URL

Edit `client/.env.local`:

```env
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
```

---

## Notes

- **All room data is in-memory only.** Rooms are automatically deleted when the last user leaves.
- **No database**, no authentication, no user accounts.
- Works best in a modern browser (Chrome, Firefox, Safari, Edge).
