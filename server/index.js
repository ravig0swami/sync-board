const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Allow cross-origin requests from the Next.js client
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// In-memory store for rooms
// rooms = { roomCode: { strokes: [], users: Set<socketId> } }
const rooms = {};

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Generate a random 6-character alphanumeric room code (uppercase).
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
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

// ─── Health Check ──────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Whiteboard server is running',
    rooms: Object.keys(rooms).length,
  });
});

// ─── Socket.IO Events ──────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Track which room this socket is currently in
  let currentRoom = null;

  // ── create-room ──────────────────────────────────────────────────────────
  // Client asks server to create a new room.
  // Server generates a unique code, stores it, and returns it to the client.
  socket.on('create-room', (callback) => {
    let code;

    // Keep generating until we get a unique code
    do {
      code = generateRoomCode();
    } while (rooms[code]);

    rooms[code] = {
      strokes: [],   // array of drawing stroke objects
      users: new Set(),
    };

    console.log(`Room created: ${code}`);
    callback({ success: true, roomCode: code });
  });

  // ── join-room ─────────────────────────────────────────────────────────────
  // Client joins an existing room using its code.
  // On success, the server sends back the current canvas state (all prior strokes).
  socket.on('join-room', ({ roomCode }, callback) => {
    const room = rooms[roomCode];

    if (!room) {
      return callback({ success: false, error: 'Room not found. Please check the code.' });
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
    console.log(`Socket ${socket.id} joined room ${roomCode} (${userCount} users)`);

    // Notify others in the room about the new user count
    socket.to(roomCode).emit('user-count', userCount);

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
  socket.on('leave-room', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (room) {
      room.users.delete(socket.id);
      socket.leave(roomCode);
      const userCount = room.users.size;
      io.to(roomCode).emit('user-count', userCount);
      cleanUpRoom(roomCode);
      console.log(`Socket ${socket.id} left room ${roomCode}`);
    }
    currentRoom = null;
  });

  // ── drawing ───────────────────────────────────────────────────────────────
  // Client sends a drawing stroke segment.
  // Server saves it to the room history and broadcasts it to all OTHER users in the room.
  socket.on('drawing', ({ roomCode, stroke }) => {
    const room = rooms[roomCode];
    if (!room) return;

    // Persist the stroke so late-joining users can replay the full board
    room.strokes.push(stroke);

    // Broadcast to everyone else in the room (not the sender)
    socket.to(roomCode).emit('drawing', stroke);
  });

  // ── clear-board ───────────────────────────────────────────────────────────
  // Client requests the board to be cleared for everyone in the room.
  socket.on('clear-board', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    // Wipe the stored strokes
    room.strokes = [];

    // Tell everyone in the room (including sender) to clear their canvas
    io.to(roomCode).emit('clear-board');
    console.log(`Board cleared in room ${roomCode}`);
  });

  // ── disconnect ────────────────────────────────────────────────────────────
  // Fired automatically when a socket loses connection (tab closed, etc.).
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].users.delete(socket.id);
      const userCount = rooms[currentRoom].users.size;
      io.to(currentRoom).emit('user-count', userCount);
      cleanUpRoom(currentRoom);
    }
  });
});

// ─── Start Server ──────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Whiteboard server listening on http://localhost:${PORT}`);
});
