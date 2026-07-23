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
  { tool, color, brushSize, onDrawEnd },
  ref
) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef(null);
  // Accumulate points for the current stroke before emitting
  const currentStroke = useRef(null);

  // ── Canvas resize ───────────────────────────────────────────────────────
  // Use ResizeObserver so the canvas pixel dimensions always match the
  // element's actual layout size — even on first render before window events fire.
  // We save & restore the image bitmap so a resize doesn't wipe the board.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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

    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // ── Drawing helpers ─────────────────────────────────────────────────────

  /**
   * Get mouse/touch coordinates relative to the canvas element.
   */
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

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

  // ── Pointer event handlers ──────────────────────────────────────────────

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
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
  }, [tool, color, brushSize, drawSegment]);

  const handlePointerMove = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    const last = lastPoint.current;
    const strokeColor = tool === 'eraser' ? '#ffffff' : color;

    drawSegment(ctx, last.x, last.y, pos.x, pos.y, strokeColor, brushSize);

    lastPoint.current = pos;
    currentStroke.current.points.push(pos);
  }, [tool, color, brushSize, drawSegment]);

  const handlePointerUp = useCallback((e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    isDrawing.current = false;

    // Emit the completed stroke to the parent (which will send it via socket)
    if (currentStroke.current && onDrawEnd) {
      onDrawEnd(currentStroke.current);
    }
    currentStroke.current = null;
    lastPoint.current = null;
  }, [onDrawEnd]);

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
    <canvas
      ref={canvasRef}
      id="whiteboard-canvas"
      className="flex-1 w-full"
      style={{
        cursor: tool === 'eraser' ? 'cell' : 'crosshair',
        background: '#ffffff',
        touchAction: 'none',
      }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    />
  );
});

export default WhiteboardCanvas;
