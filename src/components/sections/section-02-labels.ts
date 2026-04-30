/**
 * Greedy 8-anchor label placement for the Section 02 scatter.
 *
 * Tries each label at right / left / top / bottom / NE / NW / SE / SW around
 * its bubble in priority order, rejecting any candidate that overlaps another
 * bubble, an already-placed label, a reserved rectangle (editorial callouts +
 * leader lines), or the plot bounds. Falls back to the lowest-overlap
 * candidate clamped to the plot if every primary anchor fails — labels never
 * disappear.
 *
 * Pure, deterministic, no dependency. ~72 placement tests per render at 9
 * labels.
 */

export type Anchor = "start" | "middle" | "end";

export interface Bubble {
  id: string;
  cx: number;
  cy: number;
  r: number;
}

export interface LabelInput {
  id: string;
  text: string;
  priority: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Reservation {
  bbox: Rect;
}

export interface PlacedLabel {
  id: string;
  x: number;
  y: number;
  anchor: Anchor;
  bbox: Rect;
}

interface PlaceOpts {
  bubbles: Bubble[];
  labels: LabelInput[];
  reserved: Reservation[];
  fontPx: number;
  charPx: number;
  plot: { x0: number; y0: number; x1: number; y1: number };
}

interface Candidate {
  x: number;
  y: number;
  anchor: Anchor;
  bbox: Rect;
}

const ANCHOR_OFFSETS: Array<{
  dx: number;
  dy: number;
  anchor: Anchor;
  side: "right" | "left" | "top" | "bottom" | "ne" | "nw" | "se" | "sw";
}> = [
  { dx: +14, dy: +4, anchor: "start", side: "right" },
  { dx: -14, dy: +4, anchor: "end", side: "left" },
  { dx: 0, dy: -14, anchor: "middle", side: "top" },
  { dx: 0, dy: +18, anchor: "middle", side: "bottom" },
  { dx: +12, dy: -12, anchor: "start", side: "ne" },
  { dx: -12, dy: -12, anchor: "end", side: "nw" },
  { dx: +12, dy: +18, anchor: "start", side: "se" },
  { dx: -12, dy: +18, anchor: "end", side: "sw" },
];

function rectFromAnchor(
  x: number,
  y: number,
  anchor: Anchor,
  textW: number,
  textH: number,
): Rect {
  const ascent = textH * 0.8;
  let left: number;
  if (anchor === "start") left = x;
  else if (anchor === "end") left = x - textW;
  else left = x - textW / 2;
  return { x: left, y: y - ascent, w: textW, h: textH };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function rectCircleOverlap(rect: Rect, c: Bubble): boolean {
  const cx = Math.max(rect.x, Math.min(c.cx, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(c.cy, rect.y + rect.h));
  const dx = c.cx - cx;
  const dy = c.cy - cy;
  return dx * dx + dy * dy < c.r * c.r;
}

function rectInsidePlot(
  rect: Rect,
  plot: { x0: number; y0: number; x1: number; y1: number },
): boolean {
  return (
    rect.x >= plot.x0 &&
    rect.y >= plot.y0 &&
    rect.x + rect.w <= plot.x1 &&
    rect.y + rect.h <= plot.y1
  );
}

function overlapArea(a: Rect, b: Rect): number {
  const ow = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const oh = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return ow * oh;
}

function clampToPlot(
  rect: Rect,
  plot: { x0: number; y0: number; x1: number; y1: number },
): Rect {
  const x = Math.max(plot.x0, Math.min(rect.x, plot.x1 - rect.w));
  const y = Math.max(plot.y0, Math.min(rect.y, plot.y1 - rect.h));
  return { x, y, w: rect.w, h: rect.h };
}

export function placeLabels(opts: PlaceOpts): PlacedLabel[] {
  const { bubbles, labels, reserved, fontPx, charPx, plot } = opts;
  const bubbleById = new Map(bubbles.map((b) => [b.id, b] as const));
  const textH = fontPx * 1.2;

  const sorted = [...labels].sort((a, b) => b.priority - a.priority);
  const placed: PlacedLabel[] = [];

  for (const label of sorted) {
    const bubble = bubbleById.get(label.id);
    if (!bubble) continue;
    const textW = label.text.length * charPx;

    const candidates: Candidate[] = ANCHOR_OFFSETS.map((off) => {
      const x = bubble.cx + Math.sign(off.dx) * (bubble.r + Math.abs(off.dx));
      const y = bubble.cy + Math.sign(off.dy) * (bubble.r + Math.abs(off.dy));
      return {
        x,
        y,
        anchor: off.anchor,
        bbox: rectFromAnchor(x, y, off.anchor, textW, textH),
      };
    });

    let chosen: Candidate | undefined;
    for (const c of candidates) {
      if (!rectInsidePlot(c.bbox, plot)) continue;
      if (bubbles.some((b) => b.id !== label.id && rectCircleOverlap(c.bbox, b))) {
        continue;
      }
      if (placed.some((p) => rectsOverlap(c.bbox, p.bbox))) continue;
      if (reserved.some((r) => rectsOverlap(c.bbox, r.bbox))) continue;
      chosen = c;
      break;
    }

    if (!chosen) {
      let bestPenalty = Infinity;
      for (const c of candidates) {
        const clamped = clampToPlot(c.bbox, plot);
        let penalty = 0;
        for (const b of bubbles) {
          if (b.id !== label.id && rectCircleOverlap(clamped, b)) {
            penalty += b.r * b.r;
          }
        }
        for (const p of placed) penalty += overlapArea(clamped, p.bbox);
        for (const r of reserved) penalty += overlapArea(clamped, r.bbox);
        if (penalty < bestPenalty) {
          bestPenalty = penalty;
          chosen = { ...c, bbox: clamped };
        }
      }
    }

    if (!chosen) continue;

    placed.push({
      id: label.id,
      x: chosen.x,
      y: chosen.y,
      anchor: chosen.anchor,
      bbox: chosen.bbox,
    });
  }

  return placed;
}
