const express = require("express");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

const isProduction = process.env.NODE_ENV === "production";

const clientBuildPath = isProduction
  ? path.join(__dirname, "../client/.next")
  : path.join(__dirname, "../client");

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  }),
);
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

if (isProduction) {
  const staticDir = path.join(clientBuildPath, "standalone", "client");
  if (require("fs").existsSync(staticDir)) {
    app.use(express.static(staticDir));
    console.log(`Serving static files from: ${staticDir}`);
  } else {
    console.warn(`Static directory not found: ${staticDir}`);
  }

  const nextStaticDir = path.join(clientBuildPath, "static");
  if (require("fs").existsSync(nextStaticDir)) {
    app.use("/_next/static", express.static(nextStaticDir));
  }
}

// In-memory store: rooms = { roomCode: { pages, redoPages, totalPages, users } }
const rooms = {};

// Maps opaque board URL token -> room code (keeps room code out of the URL)
const boardTokens = {};

function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateBoardToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function cleanUpRoom(roomCode) {
  const room = rooms[roomCode];
  if (room && room.users.size === 0) {
    delete rooms[roomCode];

    for (const token of Object.keys(boardTokens)) {
      if (boardTokens[token] === roomCode) delete boardTokens[token];
    }

    console.log(`Room ${roomCode} deleted (empty).`);
  }
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Whiteboard server is running",
    rooms: Object.keys(rooms).length,
  });
});

if (isProduction) {
  app.get("*", (req, res, next) => {
    if (req.url.startsWith("/socket.io") || req.url.startsWith("/api/")) {
      return next();
    }

    const indexPath = path.join(
      clientBuildPath,
      "standalone",
      "client",
      "index.html",
    );
    if (require("fs").existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      const fallbackPath = path.join(
        clientBuildPath,
        "standalone",
        "client",
        "html",
        req.path,
      );
      if (require("fs").existsSync(fallbackPath)) {
        res.sendFile(fallbackPath);
      } else {
        next();
      }
    }
  });
}

app.use((req, res) => {
  if (req.url.startsWith("/socket.io")) {
    return;
  }

  if (req.url.startsWith("/api/")) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: `Route ${req.method} ${req.url} not found`,
    });
  }

  if (isProduction) {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Page Not Found</title></head>
        <body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb">
          <div style="text-align:center">
            <h1 style="font-size:3rem;color:#1a1a2e;margin:0">404</h1>
            <p style="color:#6b7280;margin:0.5rem 0 1.5rem">Page not found</p>
            <a href="/" style="color:#4f46e5;text-decoration:underline">Go to Home</a>
          </div>
        </body>
      </html>
    `);
  } else {
    res.status(404).json({ error: "NOT_FOUND", message: "Route not found" });
  }
});

app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message || err}`);
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: "INTERNAL_ERROR",
    message: isProduction ? "Internal server error" : err.message,
  });
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  let currentRoom = null;

  socket.on("create-room", (callback) => {
    let code;

    do {
      code = generateRoomCode();
    } while (rooms[code]);

    rooms[code] = {
      pages: { 0: [] },
      redoPages: {},
      totalPages: 1,
      users: new Set(),
    };

    console.log(`Room created: ${code}`);
    callback({ success: true, roomCode: code });
  });

  socket.on("join-room", ({ roomCode }, callback) => {
    const room = rooms[roomCode];

    if (!room) {
      return callback({
        success: false,
        error: "Room not found. Please check the code.",
      });
    }

    if (currentRoom && currentRoom !== roomCode) {
      socket.leave(currentRoom);
      rooms[currentRoom]?.users.delete(socket.id);
      cleanUpRoom(currentRoom);
    }

    currentRoom = roomCode;
    room.users.add(socket.id);
    socket.join(roomCode);

    const userCount = room.users.size;
    console.log(
      `Socket ${socket.id} joined room ${roomCode} (${userCount} users)`,
    );

    socket.to(roomCode).emit("user-count", userCount);

    const token = generateBoardToken();
    boardTokens[token] = roomCode;

    callback({
      success: true,
      roomCode,
      token,
      strokes: room.pages[0],
      totalPages: room.totalPages,
      userCount,
    });
  });

  socket.on("get-all-pages", ({ roomCode }, callback) => {
    const room = rooms[roomCode];
    if (!room) {
      return callback?.({ success: false, error: "Room not found." });
    }

    const pages = [];
    for (let i = 0; i < room.totalPages; i++) {
      pages.push(room.pages[i] || []);
    }

    callback?.({ success: true, pages, totalPages: room.totalPages });
  });

  socket.on("change-page", ({ roomCode, pageIndex }, callback) => {
    const room = rooms[roomCode];
    if (!room) {
      return callback({ success: false, error: "Room not found." });
    }

    if (!room.pages[pageIndex]) {
      room.pages[pageIndex] = [];
      if (pageIndex >= room.totalPages) {
        room.totalPages = pageIndex + 1;
        io.to(roomCode).emit("page-update", room.totalPages);
      }
    }

    callback({
      success: true,
      strokes: room.pages[pageIndex],
      totalPages: room.totalPages,
    });
  });

  socket.on("delete-page", ({ roomCode, pageIndex }, callback) => {
    const room = rooms[roomCode];
    if (!room) {
      if (callback) callback({ success: false, error: "Room not found." });
      return;
    }

    if (pageIndex === 0) {
      if (callback) callback({ success: false, error: "Cannot delete the first page." });
      return;
    }

    // Shift all pages down
    for (let i = pageIndex; i < room.totalPages - 1; i++) {
      room.pages[i] = room.pages[i + 1] || [];
    }
    // Shift redo stacks down as well so they stay aligned with pages
    room.redoPages = room.redoPages || {};
    for (let i = pageIndex; i < room.totalPages - 1; i++) {
      room.redoPages[i] = room.redoPages[i + 1] || [];
    }
    // Delete the last page
    delete room.pages[room.totalPages - 1];
    delete room.redoPages[room.totalPages - 1];

    room.totalPages = Math.max(1, room.totalPages - 1);

    // Notify everyone
    io.to(roomCode).emit("page-deleted", { deletedIndex: pageIndex, totalPages: room.totalPages });
    if (callback) callback({ success: true });
  });

  socket.on("leave-room", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (room) {
      room.users.delete(socket.id);
      socket.leave(roomCode);
      const userCount = room.users.size;
      io.to(roomCode).emit("user-count", userCount);
      cleanUpRoom(roomCode);
      console.log(`Socket ${socket.id} left room ${roomCode}`);
    }
    currentRoom = null;
  });

  socket.on("drawing", ({ roomCode, pageIndex, stroke }) => {
    const room = rooms[roomCode];
    if (!room) return;

    if (!room.pages[pageIndex]) {
      room.pages[pageIndex] = [];
      if (pageIndex >= room.totalPages) {
        room.totalPages = pageIndex + 1;
        io.to(roomCode).emit("page-update", room.totalPages);
      }
    }

    // Persist the stroke so late-joining users can replay the full board
    room.pages[pageIndex].push(stroke);

    // A new stroke invalidates any redo history for this page
    room.redoPages = room.redoPages || {};
    room.redoPages[pageIndex] = [];

    // Broadcast to everyone else in the room (not the sender)
    socket.to(roomCode).emit("drawing", { pageIndex, stroke });
  });

  socket.on("clear-board", ({ roomCode, pageIndex }) => {
    const room = rooms[roomCode];
    if (!room) return;

    // Wipe the stored strokes for this page
    room.pages[pageIndex] = [];

    // Clearing also resets the redo history for this page
    room.redoPages = room.redoPages || {};
    room.redoPages[pageIndex] = [];

    // Tell everyone in the room (including sender) to clear their canvas
    io.to(roomCode).emit("clear-board", { pageIndex });
    console.log(`Board cleared in room ${roomCode}, page ${pageIndex}`);
  });

  socket.on("undo", ({ roomCode, pageIndex }, callback) => {
    const room = rooms[roomCode];
    if (!room) return callback?.({ success: false, error: "Room not found." });
    room.redoPages = room.redoPages || {};

    const strokes = room.pages[pageIndex] || [];
    if (strokes.length === 0) return callback?.({ success: false });

    const removed = strokes.pop();
    (room.redoPages[pageIndex] ||= []).push(removed);

    io.to(roomCode).emit("strokes-changed", { pageIndex, strokes });
    callback?.({ success: true, strokes });
  });

  socket.on("redo", ({ roomCode, pageIndex }, callback) => {
    const room = rooms[roomCode];
    if (!room) return callback?.({ success: false, error: "Room not found." });
    room.redoPages = room.redoPages || {};

    const redoStack = room.redoPages[pageIndex] || [];
    if (redoStack.length === 0) return callback?.({ success: false });

    const restored = redoStack.pop();
    room.pages[pageIndex] = room.pages[pageIndex] || [];
    room.pages[pageIndex].push(restored);

    const strokes = room.pages[pageIndex];
    io.to(roomCode).emit("strokes-changed", { pageIndex, strokes });
    callback?.({ success: true, strokes });
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].users.delete(socket.id);
      const userCount = rooms[currentRoom].users.size;
      io.to(currentRoom).emit("user-count", userCount);
      cleanUpRoom(currentRoom);
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Whiteboard server listening on http://localhost:${PORT}`);
});