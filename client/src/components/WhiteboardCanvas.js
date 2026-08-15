'use client';

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

/**
 * WhiteboardCanvas
 *
 * Full-screen HTML5 canvas component that handles:
 *  - Freehand drawing with mouse and touch events
 *  - Erasing (draws in white)
 *  - Emitting stroke data via onDrawEnd callback
 *  - Receiving and replaying remote strokes via the `ref` imperative handle
 *
 * Props:
 *   tool        - 'pencil' | 'eraser'
 *   color       - hex color string
 *   brushSize   - number (px)
 *   onDrawEnd   - (stroke) => void   called with a complete stroke object when the user lifts the mouse
 *
 * Exposed via ref (useImperativeHandle):
 *   drawStroke(stroke)  - replays a received remote stroke onto the canvas
 *   clearCanvas()       - wipes the entire canvas
 *   replayStrokes(strokes) - replays an array of historic strokes (for late joiners)
 */
const WhiteboardCanvas = forwardRef(function WhiteboardCanvas(
  { tool, color, brushSize, zoom = 1, onZoomChange, onDrawEnd },
  ref
) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef(null);
  // Accumulate points for the current stroke before emitting
  const currentStroke = useRef(null);

  // Panning & Zooming state
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const touchZoomStart = useRef({ distance: 0, zoom: 1 });

  // Ref to the eraser size ring indicator overlay
  const eraserRingRef = useRef(null);

  // ── Canvas resize ───────────────────────────────────────────────────────
  // Use ResizeObserver on the container so the canvas logical pixel dimensions
  // always match the container's actual layout size — even on first render.
  // We save & restore the image bitmap so a resize doesn't wipe the board.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let prevWidth = 0;
    let prevHeight = 0;

    const resizeCanvas = (width, height) => {
      // Avoid no-op resize loops
      if (width === prevWidth && height === prevHeight) return;

      // Save current drawing
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = canvas.width || 1;
      tempCanvas.height = canvas.height || 1;
      if (canvas.width > 0 && canvas.height > 0) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      prevWidth = width;
      prevHeight = height;

      // Set canvas internal resolution to match layout size
      canvas.width = width;
      canvas.height = height;

      // Fill white background first
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Restore previous drawing
      if (tempCanvas.width > 1 && tempCanvas.height > 1) {
        ctx.drawImage(tempCanvas, 0, 0);
      }
    };

    // ResizeObserver fires immediately with the initial size
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          resizeCanvas(Math.floor(width), Math.floor(height));
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ── Zooming (Trackpad/Wheel) ────────────────────────────────────────────

  const handleWheel = useCallback((e) => {
    if (e.ctrlKey && onZoomChange) {
      e.preventDefault();
      const zoomStep = e.deltaY > 0 ? -0.1 : 0.1;
      let nextZoom = zoom + zoomStep;
      nextZoom = Math.min(Math.max(nextZoom, 0.5), 4.0);
      onZoomChange(nextZoom);
    }
  }, [zoom, onZoomChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Attach passive: false so we can preventDefault on ctrl+wheel
    const onWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        handleWheel(e);
      }
    };
    
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [handleWheel]);

  // ── Drawing helpers ─────────────────────────────────────────────────────

  /**
   * Get mouse/touch coordinates relative to the canvas element.
   * Divide by zoom to get the logical coordinates.
   */
  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) / zoom,
        y: (e.touches[0].clientY - rect.top) / zoom,
      };
    }
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  }, [zoom]);

  /**
   * Draw a single line segment from (x0, y0) to (x1, y1) using the given style.
   */
  const drawSegment = useCallback((ctx, x0, y0, x1, y1, strokeColor, size) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }, []);

  /**
   * Hide the eraser size ring indicator.
   */
  const hideEraserRing = useCallback(() => {
    const ring = eraserRingRef.current;
    if (ring) ring.style.opacity = '0';
  }, []);

  /**
   * Move/resize the eraser size ring indicator to follow the pointer.
   * The ring's diameter matches the eraser (brush) size so the user can see
   * exactly how much area will be erased.
   */
  const updateEraserRing = useCallback((e) => {
    const ring = eraserRingRef.current;
    const container = containerRef.current;
    if (!ring || !container || tool !== 'eraser') return;

    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Position in the container's content coords (accounting for scroll).
    const x = clientX - rect.left + container.scrollLeft;
    const y = clientY - rect.top + container.scrollTop;
    // Visual diameter scales with zoom (brush size is in canvas/logical px).
    const size = brushSize * zoom;

    ring.style.opacity = '1';
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    ring.style.width = `${size}px`;
    ring.style.height = `${size}px`;
  }, [tool, brushSize, zoom]);

  // ── Pointer event handlers ──────────────────────────────────────────────

  const handlePointerDown = useCallback((e) => {
    // Right click pan
    if (e.button === 2) {
      isPanning.current = true;
      const container = containerRef.current;
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      };
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      return;
    }

    // Two finger touch
    if (e.touches && e.touches.length === 2) {
      isPanning.current = true;
      const container = containerRef.current;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;

      touchZoomStart.current = { distance: dist, zoom: zoom };
      panStart.current = {
        x: centerX,
        y: centerY,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      };
      return;
    }

    // Prevent drawing with multi-touch or right/middle click
    if (e.touches && e.touches.length > 1) return;
    if (e.button !== undefined && e.button !== 0) return;

    if (e.type !== 'touchstart') {
      e.preventDefault();
    }
    
    updateEraserRing(e);
    const pos = getPos(e);
    isDrawing.current = true;
    lastPoint.current = pos;

    const strokeColor = tool === 'eraser' ? '#ffffff' : color;

    // Start a new stroke object that we'll fill with points
    currentStroke.current = {
      points: [pos],
      color: strokeColor,
      size: brushSize,
    };

    // Draw a dot for single clicks
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    drawSegment(ctx, pos.x, pos.y, pos.x, pos.y, strokeColor, brushSize);
  }, [tool, color, brushSize, drawSegment, getPos, updateEraserRing]);

  const handlePointerMove = useCallback((e) => {
    if (isPanning.current) {
      const container = containerRef.current;
      if (e.touches && e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const centerX = (t1.clientX + t2.clientX) / 2;
        const centerY = (t1.clientY + t2.clientY) / 2;

        // Pan
        const dx = centerX - panStart.current.x;
        const dy = centerY - panStart.current.y;
        container.scrollLeft = panStart.current.scrollLeft - dx;
        container.scrollTop = panStart.current.scrollTop - dy;

        // Zoom
        if (onZoomChange && touchZoomStart.current.distance > 0) {
          const ratio = dist / touchZoomStart.current.distance;
          let nextZoom = touchZoomStart.current.zoom * ratio;
          nextZoom = Math.min(Math.max(nextZoom, 0.5), 4.0);
          onZoomChange(nextZoom);
        }
      } else if (e.type === 'mousemove') {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        container.scrollLeft = panStart.current.scrollLeft - dx;
        container.scrollTop = panStart.current.scrollTop - dy;
      }
      return;
    }

    updateEraserRing(e);
    if (!isDrawing.current) return;
    if (e.type !== 'touchmove') e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    const last = lastPoint.current;
    const strokeColor = tool === 'eraser' ? '#ffffff' : color;

    drawSegment(ctx, last.x, last.y, pos.x, pos.y, strokeColor, brushSize);

    lastPoint.current = pos;
    currentStroke.current.points.push(pos);
  }, [tool, color, brushSize, drawSegment, getPos, zoom, onZoomChange, updateEraserRing]);

  const handlePointerUp = useCallback((e) => {
    if (isPanning.current) {
      if (!e.touches || e.touches.length < 2) {
         isPanning.current = false;
         if (canvasRef.current) canvasRef.current.style.cursor = tool === 'eraser' ? 'none' : 'crosshair';
      }
      return;
    }

    if (!isDrawing.current) {
      if (e.type === 'mouseleave' || e.type === 'touchend') hideEraserRing();
      return;
    }
    if (e.type !== 'touchend') e.preventDefault();
    isDrawing.current = false;

    // Emit the completed stroke to the parent (which will send it via socket)
    if (currentStroke.current && onDrawEnd) {
      onDrawEnd(currentStroke.current);
    }
    currentStroke.current = null;
    lastPoint.current = null;

    if (e.type === 'mouseleave' || e.type === 'touchend') hideEraserRing();
  }, [onDrawEnd, hideEraserRing]);

  // ── Imperative API exposed to parent ────────────────────────────────────
  useImperativeHandle(ref, () => ({
    /**
     * Replay a single remote stroke onto the canvas.
     * @param {object} stroke - { points: [{x, y}], color: string, size: number }
     */
    drawStroke(stroke) {
      const canvas = canvasRef.current;
      if (!canvas || !stroke?.points?.length) return;
      const ctx = canvas.getContext('2d');
      const { points, color: strokeColor, size } = stroke;

      if (points.length === 1) {
        // Single point — draw a dot
        drawSegment(ctx, points[0].x, points[0].y, points[0].x, points[0].y, strokeColor, size);
        return;
      }

      for (let i = 1; i < points.length; i++) {
        drawSegment(
          ctx,
          points[i - 1].x, points[i - 1].y,
          points[i].x, points[i].y,
          strokeColor,
          size
        );
      }
    },

    /**
     * Clear the entire canvas (fill white).
     */
    clearCanvas() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },

    /**
     * Replay multiple historic strokes in order.
     * Used when a user joins a room that already has drawings.
     * @param {object[]} strokes
     */
    replayStrokes(strokes) {
      if (!strokes?.length) return;
      strokes.forEach((s) => this.drawStroke(s));
    },
  }), [drawSegment]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div 
      ref={containerRef} 
      className={`flex-1 w-full relative ${zoom === 1 ? 'overflow-hidden' : 'overflow-auto bg-gray-100'}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        id="whiteboard-canvas"
        className="block min-w-full min-h-full"
        style={{
          cursor: tool === 'eraser' ? 'none' : 'crosshair',
          background: '#ffffff',
          touchAction: 'none',
          transform: `scale(${zoom})`,
          transformOrigin: '0 0',
        }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />

      {/* Eraser size ring indicator — a circular border showing the erase area */}
      <div
        ref={eraserRingRef}
        className="pointer-events-none"
        style={{
          display: tool === 'eraser' ? 'block' : 'none',
          position: 'absolute',
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          borderRadius: '9999px',
          border: '2px solid #6b7280',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.8)',
          opacity: 0,
          zIndex: 10,
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  );
});

export default WhiteboardCanvas;
