const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// Determine if we're in production mode
const isProduction = process.env.NODE_ENV === "production";

// Resolve path to client build (Next.js output)
const clientBuildPath = isProduction
  ? path.join(__dirname, "../client/.next")
  : path.join(__dirname, "../client");

// Allow cross-origin requests from the Next.js client
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
});

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  }),
);
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─── Serve static files in production ────────────────────────────────────────
if (isProduction) {
  // Serve the Next.js static output (standalone or export mode)
  const staticDir = path.join(clientBuildPath, "standalone", "client");
  if (require("fs").existsSync(staticDir)) {
    app.use(express.static(staticDir));
    console.log(`Serving static files from: ${staticDir}`);
  } else {
    console.warn(`Static directory not found: ${staticDir}`);
  }

  // Also serve the _next static chunks
  const nextStaticDir = path.join(clientBuildPath, "static");
  if (require("fs").existsSync(nextStaticDir)) {
    app.use("/_next/static", express.static(nextStaticDir));
  }
}

// In-memory store for rooms
// rooms = { roomCode: { strokes: [], users: Set<socketId> } }
const rooms = {};

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Generate a random 6-character alphanumeric room code (uppercase).
 */
function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Clean up a room if it is empty (no connected users).
 */
function cleanUpRoom(roomCode) {
  const room = rooms[roomCode];
  if (room && room.users.size === 0) {
    delete rooms[roomCode];
    console.log(`Room ${roomCode} deleted (empty).`);
  }
}

// ─── API Routes ─────────────────────────────────────────────────────────────

// Health check - the primary health endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Whiteboard server is running",
    rooms: Object.keys(rooms).length,
  });
});

// ─── SPA Fallback (only in production) ───────────────────────────────────────
// In production, the Express server serves the Next.js build.
// For any non-API route, serve the main HTML file so client-side routing works.
if (isProduction) {
  app.get("*", (req, res, next) => {
    // Skip Socket.IO and API routes
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
      // Try the default Next.js standalone HTML
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

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  // Don't handle non-HTTP paths (e.g., WebSocket upgrade)
  if (req.url.startsWith("/socket.io")) {
    return;
  }

  // For API routes, return JSON
  if (req.url.startsWith("/api/")) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: `Route ${req.method} ${req.url} not found`,
    });
  }

  // For everything else in production, return a simple HTML page
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

// ─── Error Handling Middleware ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message || err}`);
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: "INTERNAL_ERROR",
    message: isProduction ? "Internal server error" : err.message,
  });
});

// ─── Socket.IO Events ──────────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Track which room this socket is currently in
  let currentRoom = null;

  // ── create-room ──────────────────────────────────────────────────────────
  // Client asks server to create a new room.
  // Server generates a unique code, stores it, and returns it to the client.
  socket.on("create-room", (callback) => {
    let code;

    // Keep generating until we get a unique code
    do {
      code = generateRoomCode();
    } while (rooms[code]);

    rooms[code] = {
      strokes: [], // array of drawing stroke objects
      users: new Set(),
    };

    console.log(`Room created: ${code}`);
    callback({ success: true, roomCode: code });
  });

  // ── join-room ─────────────────────────────────────────────────────────────
  // Client joins an existing room using its code.
  // On success, the server sends back the current canvas state (all prior strokes).
  socket.on("join-room", ({ roomCode }, callback) => {
    const room = rooms[roomCode];

    if (!room) {
      return callback({
        success: false,
        error: "Room not found. Please check the code.",
      });
    }

    // Leave any previous room cleanly
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

    // Notify others in the room about the new user count
    socket.to(roomCode).emit("user-count", userCount);

    // Send the new user the full canvas history so they see what was drawn before
    callback({
      success: true,
      roomCode,
      strokes: room.strokes,
      userCount,
    });
  });

  // ── leave-room ────────────────────────────────────────────────────────────
  // Client explicitly leaves the room (e.g., navigating back to home).
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

  // ── drawing ───────────────────────────────────────────────────────────────
  // Client sends a drawing stroke segment.
  // Server saves it to the room history and broadcasts it to all OTHER users in the room.
  socket.on("drawing", ({ roomCode, stroke }) => {
    const room = rooms[roomCode];
    if (!room) return;

    // Persist the stroke so late-joining users can replay the full board
    room.strokes.push(stroke);

    // Broadcast to everyone else in the room (not the sender)
    socket.to(roomCode).emit("drawing", stroke);
  });

  // ── clear-board ───────────────────────────────────────────────────────────
  // Client requests the board to be cleared for everyone in the room.
  socket.on("clear-board", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    // Wipe the stored strokes
    room.strokes = [];

    // Tell everyone in the room (including sender) to clear their canvas
    io.to(roomCode).emit("clear-board");
    console.log(`Board cleared in room ${roomCode}`);
  });

  // ── disconnect ────────────────────────────────────────────────────────────
  // Fired automatically when a socket loses connection (tab closed, etc.).
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

// ─── Start Server ──────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Whiteboard server listening on http://localhost:${PORT}`);
});
