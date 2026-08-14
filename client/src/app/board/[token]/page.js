"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { getRoomCodeForToken, leaveRoom } from "@/lib/session";
import Toolbar from "@/components/Toolbar";
import WhiteboardCanvas from "@/components/WhiteboardCanvas";
import ZoomControls from "@/components/ZoomControls";
import PageNavigator from "@/components/PageNavigator";
import { exportPagesToPdf } from "@/lib/exportPdf";

/**
 * /board/[token] — the main collaborative whiteboard page.
 * The URL carries an opaque token (never the human-readable room code), so
 * only people who joined with the room code can access the board.
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
  // The URL carries an opaque board token — never the human-readable room code.
  // We recover the code from this tab's session, which is only populated when
  // the user explicitly joined with the room code on the home page.
  const token = params?.token;

  // ── Room code (hydrated after mount) ──────────────────────────────────────
  // The room code lives in sessionStorage, which is browser-only. Reading it
  // during render would make the server HTML (no sessionStorage → empty) differ
  // from the client's first render (actual code), causing a hydration mismatch.
  // So we start with `null`, read the code in an effect after mount, and let
  // both server + first client render agree on the initial (empty) value.
  const [roomCode, setRoomCode] = useState(null);
  useEffect(() => {
    if (token) setRoomCode(getRoomCodeForToken(token));
  }, [token]);

  // ── Drawing state ──────────────────────────────────────────────────────
  const [tool, setTool] = useState("pencil");
  const [color, setColor] = useState("#1a1a2e");
  const [brushSize, setBrushSize] = useState(2);
  const [userCount, setUserCount] = useState(1);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Keep a ref to currentPage for socket listeners without re-triggering useEffect
  const currentPageRef = useRef(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Ref to the canvas imperative API
  const canvasRef = useRef(null);

  // ── Socket setup ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    // Access gate: only allow entry if the user came through the proper
    // create/join flow on the home page (sessionStorage-based). The URL only
    // contains an opaque token, and a token -> room code pairing only exists
    // when the user explicitly joined with the room code. This blocks anyone
    // who just opens the shared board URL directly (new tab, incognito window,
    // another browser, etc.) without knowing the flow.
    // `roomCode` starts as `null` and is hydrated right after mount — wait for
    // it before deciding whether the user is allowed in (avoids a false gate).
    if (roomCode === null) return;
    if (!roomCode) {
      setError(
        "Please join this room using its room code from the home page.",
      );
      return;
    }

    const socket = getSocket();
    let joinTimeout = null;
    let mounted = true;

    // Connect if needed (may already be connected from the landing page)
    if (!socket.connected) {
      socket.connect();

      // If we load directly via URL (not from home page), we need to join the room ourselves
      socket.once("connect", () => {
        if (mounted) joinRoom(socket);
      });
    } else {
      // Already connected — check if we need to re-join (e.g., direct URL load)
      joinRoom(socket);
    }

    function joinRoom(s) {
      // Set a timeout for the join request
      joinTimeout = setTimeout(() => {
        if (mounted) {
          setError(
            "Connection timed out. Please check your internet connection and try again.",
          );
        }
      }, 15000);

      // Ask the server to add us to the room.
      // The server responds with existing strokes so we can replay them.
      s.emit("join-room", { roomCode }, (res) => {
        clearTimeout(joinTimeout);

        if (!mounted) return;

        if (!res.success) {
          setError(
            res.error || "Could not join room. Please go back and try again.",
          );
          return;
        }

        setConnected(true);
        setUserCount(res.userCount || 1);
        setTotalPages(res.totalPages || 1);

        // Replay any existing strokes so late joiners see what was drawn
        if (res.strokes?.length) {
          // Small delay to ensure the canvas has fully rendered
          setTimeout(() => {
            if (mounted) {
              canvasRef.current?.replayStrokes(res.strokes);
            }
          }, 100);
        }
      });
    }

    // ── Incoming events ──────────────────────────────────────────────────

    // Another user drew something — render it on our canvas
    const onDrawing = ({ pageIndex, stroke }) => {
      // Only draw if the stroke belongs to the page we're currently viewing
      if (pageIndex === currentPageRef.current) {
        canvasRef.current?.drawStroke(stroke);
      }
    };

    // Someone cleared the board — clear ours too
    const onClearBoard = ({ pageIndex }) => {
      if (pageIndex === currentPageRef.current) {
        canvasRef.current?.clearCanvas();
      }
    };

    // Someone undid/redid on this page — redraw the full page
    const onStrokesChanged = ({ pageIndex, strokes }) => {
      if (pageIndex === currentPageRef.current) {
        canvasRef.current?.clearCanvas();
        if (strokes?.length) {
          canvasRef.current?.replayStrokes(strokes);
        }
      }
    };

    // User joined or left — update the count
    const onUserCount = (count) => {
      setUserCount(count);
    };
    
    // Page count increased
    const onPageUpdate = (newTotal) => {
      setTotalPages(newTotal);
    };

    // A page was deleted
    const onPageDeleted = ({ deletedIndex, totalPages }) => {
      console.log("Received page-deleted event:", { deletedIndex, totalPages });
      setTotalPages(totalPages);
      // If we were on the deleted page or a page after it, shift down
      if (currentPageRef.current >= deletedIndex) {
        const newPage = Math.max(0, currentPageRef.current - 1);
        console.log("Shifting to new page after deletion:", newPage);
        setCurrentPage(newPage);
        
        // Request the new page's strokes
        socket.emit("change-page", { roomCode, pageIndex: newPage }, (res) => {
          if (res.success) {
            canvasRef.current?.clearCanvas();
            if (res.strokes?.length) {
              canvasRef.current?.replayStrokes(res.strokes);
            }
          }
        });
      }
    };

    // Handle unexpected disconnection
    const onDisconnect = () => {
      if (mounted) setConnected(false);
    };

    const onReconnect = () => {
      if (!mounted) return;
      setConnected(true);
      // Re-join the room on reconnect
      joinRoom(socket);
    };

    // Handle connection errors
    const onConnectError = (error) => {
      if (mounted) {
        setConnected(false);
        setError(
          `Connection error: ${error.message}. Make sure the server is running.`,
        );
      }
    };

    socket.on("drawing", onDrawing);
    socket.on("clear-board", onClearBoard);
    socket.on("strokes-changed", onStrokesChanged);
    socket.on("user-count", onUserCount);
    socket.on("page-update", onPageUpdate);
    socket.on("page-deleted", onPageDeleted);
    socket.on("disconnect", onDisconnect);
    socket.on("connect", onReconnect);
    socket.on("connect_error", onConnectError);

    // ── Cleanup on unmount ───────────────────────────────────────────────
    return () => {
      mounted = false;
      clearTimeout(joinTimeout);

      socket.off("drawing", onDrawing);
      socket.off("clear-board", onClearBoard);
      socket.off("strokes-changed", onStrokesChanged);
      socket.off("user-count", onUserCount);
      socket.off("page-update", onPageUpdate);
      socket.off("page-deleted", onPageDeleted);
      socket.off("disconnect", onDisconnect);
      socket.off("connect", onReconnect);
      socket.off("connect_error", onConnectError);

      // Tell the server we're leaving
      socket.emit("leave-room", { roomCode });
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
      socket.emit("drawing", { roomCode, pageIndex: currentPage, stroke });
    },
    [roomCode, currentPage],
  );

  /**
   * Clear the board for everyone in the room.
   */
  const handleClearBoard = useCallback(() => {
    const socket = getSocket();
    socket.emit("clear-board", { roomCode, pageIndex: currentPage });
    // The server will emit clear-board back to ALL users including us,
    // so we don't clear locally here — the socket event handler will do it.
  }, [roomCode, currentPage]);

  /**
   * Undo the last stroke on the current page (synced via the server).
   */
  const handleUndo = useCallback(() => {
    const socket = getSocket();
    socket.emit("undo", { roomCode, pageIndex: currentPage });
  }, [roomCode, currentPage]);

  /**
   * Redo the most recently undone stroke on the current page (synced).
   */
  const handleRedo = useCallback(() => {
    const socket = getSocket();
    socket.emit("redo", { roomCode, pageIndex: currentPage });
  }, [roomCode, currentPage]);

  /**
   * Download every page of the board as a landscape PDF.
   * Fetches the strokes for all pages from the server, then renders them into
   * a landscape A4 PDF and triggers a download.
   */
  const [downloading, setDownloading] = useState(false);
  const handleDownloadPdf = useCallback(() => {
    if (downloading) return;
    const socket = getSocket();
    setDownloading(true);
    socket.emit("get-all-pages", { roomCode }, (res) => {
      setDownloading(false);
      if (!res?.success) {
        alert(res?.error || "Could not download the PDF. Please try again.");
        return;
      }
      exportPagesToPdf(res.pages || [], `sync-board-${roomCode}.pdf`);
    });
  }, [roomCode, downloading]);

  /**
   * Switch drawing tool, also setting the matching default brush size:
   * pencil = 2px, eraser = 30px.
   */
  const handleToolChange = useCallback((newTool) => {
    setTool(newTool);
    setBrushSize(newTool === "eraser" ? 30 : 2);
  }, []);

  const handleLeave = () => {
    const socket = getSocket();
    socket.emit("leave-room", { roomCode });
    leaveRoom(token);
    router.push("/");
  };

  // ── Pagination Handlers ──────────────────────────────────────────────────

  const changePage = (newPageIndex) => {
    if (newPageIndex < 0) return;
    
    setCurrentPage(newPageIndex);
    canvasRef.current?.clearCanvas();
    
    const socket = getSocket();
    socket.emit("change-page", { roomCode, pageIndex: newPageIndex }, (res) => {
      if (res.success) {
        setTotalPages(res.totalPages);
        if (res.strokes?.length) {
          canvasRef.current?.replayStrokes(res.strokes);
        }
      }
    });
  };

  const handlePrevPage = () => changePage(currentPage - 1);
  const handleNextPage = () => changePage(currentPage + 1);
  const handleNewPage = () => changePage(totalPages);

  const handleDeletePage = () => {
    console.log("Delete page clicked, currentPage:", currentPage);
    if (currentPage === 0) return;
    
    const socket = getSocket();
    console.log("Emitting delete-page to server for room:", roomCode, "pageIndex:", currentPage);
    socket.emit("delete-page", { roomCode, pageIndex: currentPage }, (res) => {
      console.log("Received delete-page response from server:", res);
      if (res.success) {
        // The page-deleted event handles the state update and fetch
      } else if (res.error) {
        alert(res.error);
      }
    });
  };

  // ── Error state ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center max-w-sm w-full">
          <div className="flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7 text-red-500"
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
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">
            Room Not Found
          </h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
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
    <main className="flex flex-col h-dvh overflow-hidden bg-white">
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
        onToolChange={handleToolChange}
        onColorChange={setColor}
        onBrushSizeChange={setBrushSize}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearBoard={handleClearBoard}
        onDownloadPdf={handleDownloadPdf}
        downloading={downloading}
        onLeaveRoom={handleLeave}
      />

      {/* Canvas fills remaining height */}
      <WhiteboardCanvas
        ref={canvasRef}
        tool={tool}
        color={color}
        brushSize={brushSize}
        zoom={zoom}
        onZoomChange={setZoom}
        onDrawEnd={handleDrawEnd}
      />

      <ZoomControls zoom={zoom} onZoomChange={setZoom} />

      <PageNavigator
        currentPage={currentPage}
        totalPages={totalPages}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        onNewPage={handleNewPage}
        onDeletePage={handleDeletePage}
      />

      {/* Leave room button — fixed bottom-right */}
      <button
        id="btn-leave-room"
        onClick={handleLeave}
        title="Leave room"
        className="hidden sm:flex fixed bottom-4 sm:bottom-5 right-3 sm:right-5 items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 shadow-md text-gray-600 hover:text-red-600 font-medium text-sm px-2.5 sm:px-4 py-2.5 rounded-lg transition-colors"
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
        <span className="hidden sm:inline">Leave Room</span>
      </button>
    </main>
  );
}
