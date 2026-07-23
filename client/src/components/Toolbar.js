'use client';

/**
 * Whiteboard Toolbar
 *
 * Renders the top bar with:
 *  - Tool buttons (Pencil / Eraser)
 *  - Color picker
 *  - Brush size slider
 *  - Clear board button
 *  - Room code display + copy button
 *  - Connected users count
 */
export default function Toolbar({
  tool,           // 'pencil' | 'eraser'
  color,
  brushSize,
  roomCode,
  userCount,
  onToolChange,
  onColorChange,
  onBrushSizeChange,
  onClearBoard,
}) {
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode).catch(() => {
      // Fallback for environments without clipboard API
      const el = document.createElement('textarea');
      el.value = roomCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
  };

  return (
    <header className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 shadow-sm flex-wrap">
      {/* ── App logo / name ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mr-2">
        <div className="flex items-center justify-center w-7 h-7 bg-indigo-600 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
            />
          </svg>
        </div>
        <span className="font-semibold text-gray-800 text-sm hidden sm:block">Whiteboard</span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200 hidden sm:block" />

      {/* ── Tool buttons ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        <ToolButton
          id="tool-pencil"
          active={tool === 'pencil'}
          title="Pencil"
          onClick={() => onToolChange('pencil')}
        >
          {/* Pencil icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
          </svg>
          <span className="text-xs hidden sm:inline ml-1">Pencil</span>
        </ToolButton>

        <ToolButton
          id="tool-eraser"
          active={tool === 'eraser'}
          title="Eraser"
          onClick={() => onToolChange('eraser')}
        >
          {/* Eraser icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
          </svg>
          <span className="text-xs hidden sm:inline ml-1">Eraser</span>
        </ToolButton>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200" />

      {/* ── Color picker ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <label htmlFor="color-picker" className="text-xs text-gray-500 hidden sm:block">
          Color
        </label>
        <div className="relative w-8 h-8 rounded-lg overflow-hidden border-2 border-gray-300 cursor-pointer hover:border-indigo-400 transition-colors">
          <input
            id="color-picker"
            type="color"
            value={tool === 'eraser' ? '#ffffff' : color}
            disabled={tool === 'eraser'}
            onChange={(e) => onColorChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            title="Pick color"
          />
          {/* Color swatch */}
          <div
            className="w-full h-full"
            style={{ backgroundColor: tool === 'eraser' ? '#ffffff' : color }}
          />
        </div>
      </div>

      {/* ── Brush size slider ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <label htmlFor="brush-size" className="text-xs text-gray-500 hidden sm:block whitespace-nowrap">
          Size&nbsp;
          <span className="font-medium text-gray-700">{brushSize}px</span>
        </label>
        <input
          id="brush-size"
          type="range"
          min="1"
          max="50"
          value={brushSize}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          className="w-24 h-1.5 accent-indigo-600 cursor-pointer"
          title={`Brush size: ${brushSize}px`}
        />
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200" />

      {/* ── Clear board ──────────────────────────────────────────────────── */}
      <button
        id="btn-clear-board"
        onClick={onClearBoard}
        title="Clear board for everyone"
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
        <span className="hidden sm:inline">Clear</span>
      </button>

      {/* Spacer pushes room info to the right */}
      <div className="flex-1" />

      {/* ── Users online badge ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-lg border border-green-200">
        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
        <span className="text-xs font-medium text-green-700">
          {userCount} {userCount === 1 ? 'user' : 'users'}
        </span>
      </div>

      {/* ── Room code + copy ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-1.5 border border-gray-200">
        <span className="text-xs text-gray-500 hidden sm:block">Room</span>
        <span
          id="room-code-display"
          className="font-mono font-bold text-sm tracking-widest text-indigo-700"
        >
          {roomCode}
        </span>
        <button
          id="btn-copy-code"
          onClick={handleCopyCode}
          title="Copy room code"
          className="text-gray-400 hover:text-indigo-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
        </button>
      </div>
    </header>
  );
}

/** Reusable icon-button for tool selection */
function ToolButton({ id, active, title, onClick, children }) {
  return (
    <button
      id={id}
      title={title}
      onClick={onClick}
      className={`flex items-center px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
          : 'text-gray-600 hover:bg-gray-100 border border-transparent'
      }`}
    >
      {children}
    </button>
  );
}
