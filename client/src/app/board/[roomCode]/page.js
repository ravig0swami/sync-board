'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import Toolbar from '@/components/Toolbar';
import WhiteboardCanvas from '@/components/WhiteboardCanvas';

/**
 * /board/[roomCode] — the main collaborative whiteboard page.
 *
 * Responsibilities:
 *  1. Verify the room is valid (redirect home if not).
 *  2. Replay historic strokes for late joiners.
 *  3. Forward local drawing strokes to the server via socket.
 *  4. Receive remote strokes and render them on canvas.
 *  5. Handle clear-board events from any user in the room.
 *  6. Clean up the socket listeners on unmount.
 */
export default function BoardPage() {
  const router = useRouter();
  const params = useParams();
  const roomCode = params?.roomCode?.toUpperCase();

  // ── Drawing state ──────────────────────────────────────────────────────
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#1a1a2e');
  const [brushSize, setBrushSize] = useState(4);
  const [userCount, setUserCount] = useState(1);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  // Ref to the canvas imperative API
  const canvasRef = useRef(null);

  // ── Socket setup ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomCode) return;

    const socket = getSocket();

    // Connect if needed (may already be connected from the landing page)
    if (!socket.connected) {
      socket.connect();

      // If we load directly via URL (not from home page), we need to join the room ourselves
      socket.once('connect', () => {
        joinRoom(socket);
      });
    } else {
      // Already connected — check if we need to re-join (e.g., direct URL load)
      joinRoom(socket);
    }

    function joinRoom(s) {
      // Ask the server to add us to the room.
      // The server responds with existing strokes so we can replay them.
      s.emit('join-room', { roomCode }, (res) => {
        if (!res.success) {
          setError(res.error || 'Could not join room. Please go back and try again.');
          return;
        }

        setConnected(true);
        setUserCount(res.userCount || 1);

        // Replay any existing strokes so late joiners see what was drawn
        if (res.strokes?.length) {
          // Small delay to ensure the canvas has fully rendered
          setTimeout(() => {
            canvasRef.current?.replayStrokes(res.strokes);
          }, 100);
        }
      });
    }

    // ── Incoming events ──────────────────────────────────────────────────

    // Another user drew something — render it on our canvas
    const onDrawing = (stroke) => {
      canvasRef.current?.drawStroke(stroke);
    };

    // Someone cleared the board — clear ours too
    const onClearBoard = () => {
      canvasRef.current?.clearCanvas();
    };

    // User joined or left — update the count
    const onUserCount = (count) => {
      setUserCount(count);
    };

    // Handle unexpected disconnection
    const onDisconnect = () => {
      setConnected(false);
    };

    const onReconnect = () => {
      setConnected(true);
      // Re-join the room on reconnect
      joinRoom(socket);
    };

    socket.on('drawing', onDrawing);
    socket.on('clear-board', onClearBoard);
    socket.on('user-count', onUserCount);
    socket.on('disconnect', onDisconnect);
    socket.on('connect', onReconnect);

    // ── Cleanup on unmount ───────────────────────────────────────────────
    return () => {
      socket.off('drawing', onDrawing);
      socket.off('clear-board', onClearBoard);
      socket.off('user-count', onUserCount);
      socket.off('disconnect', onDisconnect);
      socket.off('connect', onReconnect);

      // Tell the server we're leaving
      socket.emit('leave-room', { roomCode });
    };
  }, [roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ────────────────────────────────────────────────────────────

  /**
   * Called by the canvas when the user finishes a stroke.
   * We emit the stroke to the server which forwards it to other users.
   */
  const handleDrawEnd = useCallback(
    (stroke) => {
      const socket = getSocket();
      socket.emit('drawing', { roomCode, stroke });
    },
    [roomCode]
  );

  /**
   * Clear the board for everyone in the room.
   */
  const handleClearBoard = useCallback(() => {
    const socket = getSocket();
    socket.emit('clear-board', { roomCode });
    // The server will emit clear-board back to ALL users including us,
    // so we don't clear locally here — the socket event handler will do it.
  }, [roomCode]);

  const handleLeave = () => {
    const socket = getSocket();
    socket.emit('leave-room', { roomCode });
    router.push('/');
  };

  // ── Error state ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center max-w-sm w-full">
          <div className="flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Room Not Found</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            Go to Home
          </button>
        </div>
      </main>
    );
  }

  // ── Main board UI ────────────────────────────────────────────────────────
  return (
    <main className="flex flex-col h-screen overflow-hidden bg-white">
      {/* Connection status banner */}
      {!connected && !error && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-xs text-yellow-700 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          Connecting to server…
        </div>
      )}

      {/* Toolbar */}
      <Toolbar
        tool={tool}
        color={color}
        brushSize={brushSize}
        roomCode={roomCode}
        userCount={userCount}
        onToolChange={setTool}
        onColorChange={setColor}
        onBrushSizeChange={setBrushSize}
        onClearBoard={handleClearBoard}
      />

      {/* Canvas fills remaining height */}
      <WhiteboardCanvas
        ref={canvasRef}
        tool={tool}
        color={color}
        brushSize={brushSize}
        onDrawEnd={handleDrawEnd}
      />

      {/* Leave room button — fixed bottom-right */}
      <button
        id="btn-leave-room"
        onClick={handleLeave}
        title="Leave room"
        className="fixed bottom-5 right-5 flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 shadow-md text-gray-600 hover:text-red-600 font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
        </svg>
        Leave Room
      </button>
    </main>
  );
}
