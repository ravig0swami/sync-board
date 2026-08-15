"use client";

import { useState } from "react";

/**
 * Whiteboard Toolbar
 *
 * Renders the top bar with:
 *  - Tool buttons (Pencil / Eraser)
 *  - Color picker
 *  - Brush size slider
 *  - Download all pages as a PDF button
 *  - Clear board button
 *  - Room code display + copy button
 *  - Connected users count
 *
 * Layout:
 *  - Mobile (< sm): a 4-column grid that fills the full toolbar width
 *  - Desktop (>= sm): the original single-row flex layout
 */

// Curated palette shown in the custom color picker (includes the default).
const PRESET_COLORS = [
  "#000000",
  "#ffffff",
  "#6b7280",
  "#374151",
  "#1a1a2e",
  "#4338ca",
  "#4f46e5",
  "#6366f1",
  "#2563eb",
  "#0ea5e9",
  "#06b6d4",
  "#14b8a6",
  "#10b981",
  "#22c55e",
  "#84cc16",
  "#a3e635",
  "#facc15",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#e11d48",
  "#ec4899",
  "#d946ef",
  "#a855f7",
];

export default function Toolbar({
  tool, // 'pencil' | 'eraser'
  color,
  brushSize,
  roomCode,
  userCount,
  onToolChange,
  onColorChange,
  onBrushSizeChange,
  onUndo,
  onRedo,
  onClearBoard,
  onDownloadPdf,
  downloading,
  onLeaveRoom,
}) {
  // ── Color picker popup state ─────────────────────────────────────────────
  // We use a custom popup (preset swatches + hex field) instead of the native
  // <input type="color"> dialog, which flashes a black box before it opens on
  // Chrome/Edge.
  const [showColorPicker, setShowColorPicker] = useState(false);
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode).catch(() => {
      // Fallback for environments without clipboard API
      const el = document.createElement("textarea");
      el.value = roomCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    });
  };

  // Slider max depends on the active tool: eraser goes up to 80px, pencil to 50px.
  const sliderMax = tool === "eraser" ? 80 : 50;

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          MOBILE TOOLBAR — 4-column grid that fills the whole width
          ═══════════════════════════════════════════════════════════════════ */}
      <header className="sm:hidden grid grid-cols-4 gap-1.5 px-2 py-2 bg-white border-b border-gray-200 shadow-sm">
        {/* ── Row 1: Pencil | Eraser | Color | Size ─────────────────────── */}
        <ToolButton
          id="tool-pencil"
          active={tool === "pencil"}
          title="Pencil"
          onClick={() => onToolChange("pencil")}
          className="justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z"
            />
          </svg>
          <span className="text-xs ml-1">Pencil</span>
        </ToolButton>

        <ToolButton
          id="tool-eraser"
          active={tool === "eraser"}
          title="Eraser"
          onClick={() => onToolChange("eraser")}
          className="justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M22 21H7" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 11 9 9" />
          </svg>
          <span className="text-xs ml-1">Eraser</span>
        </ToolButton>

        {/* Color swatch */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => setShowColorPicker((v) => !v)}
            disabled={tool === "eraser"}
            title="Pick color"
            className="w-8 h-8 rounded-lg border-2 border-gray-300 hover:border-indigo-400 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: tool === "eraser" ? "#ffffff" : color }}
          />
        </div>

        {/* Brush size slider (compact vertical stack) */}
        <div className="flex flex-col items-center justify-center gap-0.5 min-w-0">
          <span className="text-[10px] text-gray-500 font-medium leading-none">
            {brushSize}px
          </span>
          <input
            id="brush-size-mobile"
            type="range"
            min="1"
            max={sliderMax}
            value={brushSize}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            className="w-full h-1.5 accent-indigo-600 cursor-pointer"
            title={`Brush size: ${brushSize}px`}
          />
        </div>

        {/* ── Row 2: Undo + Redo | Clear | PDF ───────────────────────────── */}
        <div className="col-span-2 flex items-center gap-1">
          <button
            id="btn-undo"
            onClick={onUndo}
            title="Undo last stroke"
            className="flex-1 flex items-center justify-center h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors border border-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </button>
          <button
            id="btn-redo"
            onClick={onRedo}
            title="Redo last undo"
            className="flex-1 flex items-center justify-center h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors border border-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
            </svg>
          </button>
        </div>

        <button
          id="btn-clear-board"
          onClick={onClearBoard}
          title="Clear board for everyone"
          className="flex items-center justify-center gap-1 px-1 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 border border-gray-300 hover:border-red-200 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
          <span>Clear</span>
        </button>

        <button
          id="btn-download-pdf"
          onClick={onDownloadPdf}
          disabled={downloading}
          title="Download all pages as a landscape PDF"
          className="flex items-center justify-center gap-1 px-1 py-1.5 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50 border border-gray-300 hover:border-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          <span>{downloading ? "…" : "PDF"}</span>
        </button>

        {/* ── Row 3: Users | Room code + copy | Leave (full width) ───────── */}
        <div className="col-span-4 flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-100 rounded-lg border border-gray-200">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            <span className="text-xs font-medium text-gray-700">
              {userCount}
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 rounded-lg px-2 py-1.5 border border-gray-200 min-w-0">
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
              className="text-gray-400 hover:text-indigo-600 transition-colors flex-shrink-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                />
              </svg>
            </button>
          </div>

          <button
            id="btn-leave-room-mobile"
            onClick={onLeaveRoom}
            title="Leave room"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 border border-gray-300 transition-colors flex-shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          DESKTOP TOOLBAR — original single-row flex layout (>= sm)
          ═══════════════════════════════════════════════════════════════════ */}
      <header className="hidden sm:flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-white border-b border-gray-200 shadow-sm flex-wrap">
        {/* ── App logo / name ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mr-2">
          <img src="/favicon.svg" alt="Sync Board" className="w-7 h-7" />
          <span className="font-semibold text-gray-800 text-sm hidden sm:block">
            Sync Board
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 hidden sm:block" />

        {/* ── Tool buttons ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1">
          <ToolButton
            id="tool-pencil"
            active={tool === "pencil"}
            title="Pencil"
            onClick={() => onToolChange("pencil")}
          >
            {/* Pencil icon */}
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
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z"
              />
            </svg>
            <span className="text-xs hidden sm:inline ml-1">Pencil</span>
          </ToolButton>

          <ToolButton
            id="tool-eraser"
            active={tool === "eraser"}
            title="Eraser"
            onClick={() => onToolChange("eraser")}
          >
            {/* Eraser icon */}
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
                d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M22 21H7" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m5 11 9 9" />
            </svg>
            <span className="text-xs hidden sm:inline ml-1">Eraser</span>
          </ToolButton>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" />

        {/* ── Color picker ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 hidden sm:block">Color</label>
          <div className="relative">
            {/* Swatch button — toggles the custom color popup */}
            <button
              type="button"
              onClick={() => setShowColorPicker((v) => !v)}
              disabled={tool === "eraser"}
              title="Pick color"
              className="w-8 h-8 rounded-lg border-2 border-gray-300 hover:border-indigo-400 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: tool === "eraser" ? "#ffffff" : color }}
            />

            {showColorPicker && (
              <>
                {/* Click-outside backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowColorPicker(false)}
                />

                {/* Custom picker popup (no native dialog → no black flash) */}
                <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-44">
                  <div className="grid grid-cols-6 gap-1.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        title={c}
                        onClick={() => {
                          onColorChange(c);
                          setShowColorPicker(false);
                        }}
                        className={`w-5 h-5 rounded-full transition transform hover:scale-110 ${
                          color.toLowerCase() === c.toLowerCase()
                            ? "border border-indigo-500 ring-2 ring-indigo-200"
                            : "border border-gray-300"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Brush size slider ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="brush-size"
            className="text-xs text-gray-500 hidden sm:block whitespace-nowrap"
          >
            Size&nbsp;
            <span className="font-medium text-gray-700 inline-block min-w-[2rem] text-right">
              {brushSize}px
            </span>
          </label>
          <input
            id="brush-size"
            type="range"
            min="1"
            max={sliderMax}
            value={brushSize}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            className="w-20 sm:w-24 h-1.5 accent-indigo-600 cursor-pointer"
            title={`Brush size: ${brushSize}px`}
          />
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" />

        {/* ── Undo / Redo ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1">
          <button
            id="btn-undo"
            onClick={onUndo}
            title="Undo last stroke"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors border border-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </button>
          <button
            id="btn-redo"
            onClick={onRedo}
            title="Redo last undo"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors border border-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" />

        {/* ── Clear board ──────────────────────────────────────────────────── */}
        <button
          id="btn-clear-board"
          onClick={onClearBoard}
          title="Clear board for everyone"
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 border border-gray-300 hover:border-red-200 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
          <span className="hidden sm:inline">Clear</span>
        </button>

        {/* Spacer pushes room info to the right (desktop only — on mobile the
            toolbar wraps naturally) */}
        <div className="flex-1 hidden sm:block" />

        {/* ── Users online badge ───────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-200">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          <span className="text-xs font-medium text-gray-700">
            {userCount} {userCount === 1 ? "User" : "Users"}
          </span>
        </div>

        {/* ── Room code + copy ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 border border-gray-200">
          <span className="text-xs text-gray-500 hidden sm:block">Room Code</span>
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
              />
            </svg>
          </button>
        </div>
        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" />

        {/* ── Download PDF (top-right corner) ──────────────────────────────── */}
        <button
          id="btn-download-pdf"
          onClick={onDownloadPdf}
          disabled={downloading}
          title="Download all pages as a landscape PDF"
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 border border-gray-300 hover:border-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          <span className="hidden sm:inline">
            {downloading ? "Preparing…" : "PDF"}
          </span>
        </button>

        {/* Leave room (mobile only — desktop keeps the floating bottom button) */}
        <button
          id="btn-leave-room-mobile"
          onClick={onLeaveRoom}
          title="Leave room"
          className="sm:hidden flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 border border-gray-300 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
            />
          </svg>
        </button>
      </header>
    </>
  );
}

/** Reusable icon-button for tool selection */
function ToolButton({ id, active, title, onClick, children, className = "" }) {
  return (
    <button
      id={id}
      title={title}
      onClick={onClick}
      className={`flex items-center px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${className} ${
        active
          ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
          : "text-gray-600 hover:bg-gray-100 border border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}