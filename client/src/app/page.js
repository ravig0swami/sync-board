'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';

/**
 * Landing page — lets users create a new room or join an existing one.
 */
export default function HomePage() {
  const router = useRouter();

  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Create Room ──────────────────────────────────────────────────────────
  const handleCreateRoom = () => {
    setError('');
    setLoading(true);

    const socket = getSocket();

    // Connect if not already connected
    if (!socket.connected) {
      socket.connect();
    }

    // Ask the server to create a new room and give us the code
    socket.emit('create-room', (res) => {
      if (res.success) {
        // Join the newly created room immediately
        socket.emit('join-room', { roomCode: res.roomCode }, (joinRes) => {
          setLoading(false);
          if (joinRes.success) {
            router.push(`/board/${res.roomCode}`);
          } else {
            setError(joinRes.error || 'Failed to join the created room.');
          }
        });
      } else {
        setLoading(false);
        setError('Failed to create room. Please try again.');
      }
    });
  };

  // ── Join Room ────────────────────────────────────────────────────────────
  const handleJoinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError('Please enter a room code.');
      return;
    }

    setError('');
    setLoading(true);

    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join-room', { roomCode: code }, (res) => {
      setLoading(false);
      if (res.success) {
        router.push(`/board/${code}`);
      } else {
        setError(res.error || 'Could not join room.');
      }
    });
  };

  // Allow pressing Enter to submit the join form
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleJoinRoom();
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="text-center mb-12">
        {/* Icon */}
        <div className="flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-2xl mx-auto mb-6 shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-10 h-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
            />
          </svg>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-3">
          Collaborative Whiteboard
        </h1>
        <p className="text-lg text-gray-500 max-w-md mx-auto">
          Draw together in real-time. Share a room code and collaborate
          instantly&nbsp;— no sign-up required.
        </p>
      </div>

      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        {/* Error message */}
        {error && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            {error}
          </div>
        )}

        {/* Create Room button */}
        <button
          id="btn-create-room"
          onClick={handleCreateRoom}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-150 mb-4 text-sm shadow-sm"
        >
          {loading && !showJoinInput ? (
            <Spinner />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          )}
          Create Room
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <hr className="flex-1 border-gray-200" />
          <span className="text-xs text-gray-400 uppercase tracking-wide">or</span>
          <hr className="flex-1 border-gray-200" />
        </div>

        {/* Join Room section */}
        {showJoinInput ? (
          <div className="space-y-3">
            <input
              id="input-room-code"
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit room code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none rounded-xl px-4 py-3 text-sm font-mono tracking-widest uppercase text-center transition"
            />
            <div className="flex gap-2">
              <button
                id="btn-cancel-join"
                onClick={() => {
                  setShowJoinInput(false);
                  setJoinCode('');
                  setError('');
                }}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl text-sm transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-join"
                onClick={handleJoinRoom}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors duration-150 shadow-sm"
              >
                {loading ? <Spinner /> : 'Join'}
              </button>
            </div>
          </div>
        ) : (
          <button
            id="btn-show-join"
            onClick={() => {
              setShowJoinInput(true);
              setError('');
            }}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors duration-150 text-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
              />
            </svg>
            Join Room
          </button>
        )}
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-gray-400">
        No account needed. Rooms are temporary and disappear when everyone leaves.
      </p>
    </main>
  );
}

/** Small inline spinner used on buttons while loading */
function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
