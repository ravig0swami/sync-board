'use client';

import { useState, useEffect } from "react";

/**
 * ZoomControls
 *
 * Floating bottom-left panel with zoom in/out buttons,
 * a percentage label, and a reset button.
 *
 * Props:
 *   zoom       - current zoom level (0.5 – 4.0)
 *   onZoomChange - (newZoom) => void
 */
export default function ZoomControls({ zoom, onZoomChange }) {
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 4.0;
  const STEP = 0.25;

  const percentage = Math.round(zoom * 100);

  const handleZoomIn = () => {
    const next = Math.min(zoom + STEP, MAX_ZOOM);
    onZoomChange(next);
  };

  const handleZoomOut = () => {
    const next = Math.max(zoom - STEP, MIN_ZOOM);
    onZoomChange(next);
  };

  const handleReset = () => {
    onZoomChange(1);
  };

  // ── Fullscreen toggle ────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Keep the icon in sync with the browser's actual fullscreen state (covers
  // exiting via the Esc key as well).
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  return (
    <div
      id="zoom-controls"
      className="fixed bottom-5 left-5 flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-xl px-2 py-1.5 z-50"
    >
      {/* Zoom Out */}
      <button
        id="btn-zoom-out"
        title="Zoom out"
        onClick={handleZoomOut}
        disabled={zoom <= MIN_ZOOM}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
        </svg>
      </button>

      {/* Percentage display */}
      <span
        id="zoom-level"
        className="min-w-[3.5rem] text-center text-xs font-semibold text-gray-700 tabular-nums select-none"
      >
        {percentage}%
      </span>

      {/* Zoom In */}
      <button
        id="btn-zoom-in"
        title="Zoom in"
        onClick={handleZoomIn}
        disabled={zoom >= MAX_ZOOM}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      {/* Reset button */}
      <button
        id="btn-zoom-reset"
        title="Reset zoom to 100%"
        onClick={handleReset}
        disabled={zoom === 1}
        className="flex items-center justify-center px-2 h-8 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
        </svg>
        Reset
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      {/* Fullscreen toggle (icon only) */}
      <button
        id="btn-fullscreen"
        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        onClick={handleToggleFullscreen}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors"
      >
        {isFullscreen ? (
          /* Collapse / exit-fullscreen icon */
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L4.5 4.5M15 15v4.5m0-4.5h4.5m-4.5 0l4.5 4.5" />
          </svg>
        ) : (
          /* Expand / enter-fullscreen icon */
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 20.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
          </svg>
        )}
      </button>
    </div>
  );
}
