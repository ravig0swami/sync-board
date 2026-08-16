import { jsPDF } from "jspdf";

/**
 * exportPdf.js
 *
 * Renders every board page (an array of strokes) onto an offscreen canvas and
 * assembles them into a single landscape A4 PDF that the browser downloads.
 *
 * A stroke has the shape: { points: [{x, y}, ...], color: string, size: number }.
 * Pages are an array where `pages[i]` is the array of strokes for page i.
 *
 * Because the live board is full-screen (its logical coordinate space depends on
 * each drawer's window size), we compute the bounding box of each page's strokes
 * and fit them onto the PDF page with a uniform scale (no distortion), centered
 * with padding. Blank pages are exported as blank white pages.
 */

// A4 landscape page dimensions in millimetres (297 x 210 mm).
const PAGE_W_MM = 297;
const PAGE_H_MM = 210;

// Resolution of the offscreen render canvas (A4 landscape aspect ratio).
// Higher = crisper output, larger PNG data.
const CANVAS_W = 1600;
const CANVAS_H = Math.round((CANVAS_W * PAGE_H_MM) / PAGE_W_MM); // ≈ 1131

// Padding (in canvas pixels) left around the content inside the page.
const PAD = 60;

/**
 * Compute the smallest axis-aligned rectangle that contains every stroke's
 * points. Returns null when there are no points.
 */
function getBounds(strokes) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const stroke of strokes) {
    if (!stroke?.points) continue;
    for (const p of stroke.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }

  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}

/**
 * Work out the uniform scale and the top-left offset needed to fit a page's
 * strokes inside the canvas with padding, preserving aspect ratio.
 */
function computePlacement(strokes) {
  const bounds = getBounds(strokes);
  if (!bounds) return { scale: 1, offsetX: 0, offsetY: 0 };

  const { minX, minY, maxX, maxY } = bounds;
  const contentW = maxX - minX;
  const contentH = maxY - minY;

  let scale = 1;
  if (contentW > 0 && contentH > 0) {
    const availableW = CANVAS_W - PAD * 2;
    const availableH = CANVAS_H - PAD * 2;
    scale = Math.min(availableW / contentW, availableH / contentH);
  }

  // Center the scaled content within the canvas.
  const scaledW = contentW * scale;
  const scaledH = contentH * scale;
  const offsetX = (CANVAS_W - scaledW) / 2 - minX * scale;
  const offsetY = (CANVAS_H - scaledH) / 2 - minY * scale;

  return { scale, offsetX, offsetY };
}

/**
 * Draw an array of strokes onto a 2D canvas context.
 * Mirrors the drawing logic in WhiteboardCanvas so exports match the board.
 */
function drawStrokes(ctx, strokes, offsetX = 0, offsetY = 0, scale = 1) {
  if (!strokes?.length) return;

  for (const stroke of strokes) {
    const { points, color, size } = stroke;
    if (!points?.length) continue;

    ctx.beginPath();
    ctx.strokeStyle = color || "#1a1a2e";
    ctx.lineWidth = Math.max(1, (size || 2) * scale);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const sx = points[0].x * scale + offsetX;
    const sy = points[0].y * scale + offsetY;
    ctx.moveTo(sx, sy);

    if (points.length === 1) {
      // A single point → tiny segment (round cap renders it as a dot).
      ctx.lineTo(sx + 0.01, sy + 0.01);
    } else {
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x * scale + offsetX, points[i].y * scale + offsetY);
      }
    }

    ctx.stroke();
  }
}

/**
 * Build and download a landscape A4 PDF containing every page.
 *
 * @param {Array<Array<object>>} pages  pages[i] = strokes for page i.
 * @param {string} filename             Name used for the downloaded file.
 */
export function exportPagesToPdf(pages, filename) {
  const pageCount = Math.max(pages?.length || 0, 1);

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");

  for (let i = 0; i < pageCount; i++) {
    if (i > 0) doc.addPage();

    // Reset to a clean white page.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const strokes = pages[i] || [];
    const placement = computePlacement(strokes);
    drawStrokes(ctx, strokes, placement.offsetX, placement.offsetY, placement.scale);

    const imgData = canvas.toDataURL("image/png");
    doc.addImage(imgData, "PNG", 0, 0, PAGE_W_MM, PAGE_H_MM);
  }

  doc.save(filename || "sync-board.pdf");
}