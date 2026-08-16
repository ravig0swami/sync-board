# 🎨 Real-Time Collaborative Whiteboard
<img width="935" height="751" alt="{4FE3CF14-44F4-46C0-8045-1232996BC5D7}" src="https://github.com/user-attachments/assets/8f89c325-bf7c-4fbd-87de-748700406b98" /></br>

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
│   │   │       └── [token]/
│   │   │           └── page.js    Whiteboard room page
│   │   ├── components/
│   │   │   ├── Toolbar.js         Top toolbar (tools, color, size, room info)
│   │   │   ├── WhiteboardCanvas.js  HTML5 Canvas drawing component
│   │   │   ├── ZoomControls.js    Zoom / fullscreen controls
│   │   │   └── PageNavigator.js   Multi-page navigation bar
│   │   └── lib/
│   │       ├── socket.js          Socket.IO singleton client
│   │       ├── session.js         Session-based room access control
│   │       └── exportPdf.js       PDF export utility
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

### Drawing Tools
| Feature              | Details                                     |
|----------------------|---------------------------------------------|
| ✏️ Pencil tool       | Freehand drawing with smooth curves         |
| 🩹 Eraser tool       | Erases with a visual size ring indicator    |
| 🎨 Color picker      | 24 preset colors in a custom popup          |
| 📏 Brush size slider | 1–50px pencil, 1–80px eraser                |
| ↩️ Undo / Redo       | Synced across all users in the room         |

### Collaboration
| Feature              | Details                                     |
|----------------------|---------------------------------------------|
| 👥 User count        | Live count of connected collaborators       |
| 🔄 Late join support | New users see what was drawn before joining |
| 🧹 Clear board       | Clears canvas for ALL users in the room     |
| 📋 Copy room code    | One-click clipboard copy                    |
| 🚪 Leave room        | Gracefully leaves and auto-cleans empty rooms |
| 🔐 Opaque URL tokens | Room code never exposed in the address bar  |
| 🛡️ Access control    | Only users who joined with the code can access |

### Multi-Page
| Feature              | Details                                     |
|----------------------|---------------------------------------------|
| 📄 Multiple pages    | Add unlimited pages to a room               |
| ⬅️➡️ Page navigation | Previous / next page controls               |
| 🗑️ Delete page       | Remove pages (first page is protected)      |
| 📥 PDF export        | Download all pages as a landscape A4 PDF    |

### View & Navigation
| Feature              | Details                                     |
|----------------------|---------------------------------------------|
| 🔍 Zoom controls     | 50%–400% zoom with buttons or Ctrl+wheel    |
| 🔄 Reset zoom        | One-click reset to 100%                     |
| 🖐️ Pan support       | Right-click drag or two-finger touch to pan  |
| 🖥️ Fullscreen mode   | Toggle fullscreen with icon button          |
| 📱 Touch support     | Works on tablets and touch screens          |
| 📱 Responsive design | Dedicated mobile and desktop toolbars       |

### Reliability
| Feature              | Details                                     |
|----------------------|---------------------------------------------|
| 🔌 Auto-reconnect    | Reconnects with up to 5 attempts            |
| ⏱️ Connection timeout| 10s timeout with clear error messages       |
| 📡 Connection banner | Shows connecting status while connecting    |
| 🏥 Health check API  | `GET /api/health` endpoint                  |

---

## Socket.IO Events Reference

| Event            | Direction        | Description                               |
|------------------|------------------|-------------------------------------------|
| `create-room`    | Client → Server  | Request a new room code                   |
| `join-room`      | Client → Server  | Join an existing room by code             |
| `leave-room`     | Client → Server  | Leave the current room                    |
| `drawing`        | Bidirectional    | Broadcast a drawing stroke                |
| `clear-board`    | Bidirectional    | Clear the board for all users             |
| `undo`           | Client → Server  | Undo the last stroke on a page            |
| `redo`           | Client → Server  | Redo the most recently undone stroke      |
| `strokes-changed`| Server → Client  | Full page redraw after undo/redo          |
| `change-page`    | Client → Server  | Switch to a different page                |
| `delete-page`    | Client → Server  | Delete a page and shift remaining pages   |
| `page-update`    | Server → Client  | Update total page count                   |
| `page-deleted`   | Server → Client  | Notify all users a page was deleted       |
| `get-all-pages`  | Client → Server  | Fetch all pages (for PDF export)          |
| `user-count`     | Server → Client  | Update the count of connected users       |
| `disconnect`     | Automatic        | Socket cleanup on tab close / navigation  |

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
- **Session-based access control** uses `sessionStorage` — opening a shared board URL in a new tab/incognito window will not grant access.
- Works best in a modern browser (Chrome, Firefox, Safari, Edge).
---

Developed with ❤️ Feel free to check out the source code and contribute!