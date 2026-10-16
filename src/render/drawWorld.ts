import { MAPS, SOLID } from "../game/data.js";
import type { MapId } from "../game/types.js";

export interface View {
  tile: number;
  ox: number;
  oy: number;
  cols: number;
  rows: number;
}

export interface DrawWorldInput {
  mapId: MapId;
  x: number;
  y: number;
  schoolId: string;
  path: { x: number; y: number }[];
  defeated: string[];
  hover: { x: number; y: number } | null;
  time: number;
}

interface Theme {
  skyTop: string;
  skyBot: string;
  grass: string;
  grass2: string;
  path: string;
  far: string;
  near: string;
  rock: string;
  rockLite: string;
}

const THEME: Record<MapId, Theme> = {
  qingshi: {
    skyTop: "#d7e7ee",
    skyBot: "#c5d6a4",
    grass: "#b7cf86",
    grass2: "#9fbe6d",
    path: "#e7d4a6",
    far: "#8eaaa2",
    near: "#3e5c50",
    rock: "#5d6a62",
    rockLite: "#8a9a92",
  },
  luoxia: {
    skyTop: "#f6d7ae",
    skyBot: "#e0b072",
    grass: "#c4a15a",
    grass2: "#a88745",
    path: "#f0e0b8",
    far: "#c48a62",
    near: "#8a4e32",
    rock: "#8a6248",
    rockLite: "#c49a72",
  },
  wangji: {
    skyTop: "#c5d6bc",
    skyBot: "#7f9a72",
    grass: "#5f8454",
    grass2: "#4d7044",
    path: "#dcc898",
    far: "#8eaa86",
    near: "#234232",
    rock: "#4e6654",
    rockLite: "#7d9a78",
  },
  cave: {
    skyTop: "#1a2434",
    skyBot: "#2c3a4c",
    grass: "#323c4a",
    grass2: "#2a3340",
    path: "#6e7c8c",
    far: "#4a5c70",
    near: "#141c28",
    rock: "#3a4656",
    rockLite: "#66788c",
  },
};

export function viewOf(cols: number, rows: number, width: number, height: number): View {
  const sky = Math.min(64, Math.max(28, Math.floor(height * 0.11)));
  const tile = Math.max(16, Math.floor(Math.min(width / cols, (height - sky - 10) / rows)));
  const mapH = tile * rows;
  const leftover = Math.max(0, height - mapH);
  const oy = leftover > sky ? Math.min(sky + Math.floor((leftover - sky) * 0.35), leftover) : Math.floor(leftover / 2);
  return {
    tile,
    ox: Math.floor((width - tile * cols) / 2),
    oy,
    cols,
    rows,
  };
}

function hash(x: number, y: number): number {
  return Math.abs((x * 374761393 + y * 668265263) % 1000) / 1000;
}

export function drawWorld(ctx: CanvasRenderingContext2D, width: number, height: number, input: DrawWorldInput): View {
  const map = MAPS[input.mapId];
  const rows = map.rows;
  const view = viewOf(rows[0].length, rows.length, width, height);
  const theme = THEME[input.mapId];
  ctx.clearRect(0, 0, width, height);
  paintSky(ctx, width, height, theme, input.mapId);
  paintMargins(ctx, width, height, view, theme, input.time);

  const pathSet = new Set(input.path.map((point) => `${point.x},${point.y}`));
  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) {
      const ch = rows[y][x];
      const px = view.ox + x * view.tile;
      const py = view.oy + y * view.tile;
      ctx.save();
      ctx.beginPath();
      ctx.rect(px, py, view.tile, view.tile);
      ctx.clip();
      drawTile(ctx, ch, px, py, view.tile, theme, hash(x, y), input.time, input.mapId);
      if (pathSet.has(`${x},${y}`)) drawFootstep(ctx, px, py, view.tile);
      ctx.restore();
    }
  }

  strokeMapFrame(ctx, view);
  for (const wisp of map.wisps) {
    if (input.defeated.includes(`${input.mapId}:${wisp.x}:${wisp.y}`)) continue;
    drawWisp(ctx, view.ox + wisp.x * view.tile, view.oy + wisp.y * view.tile, view.tile, input.time + wisp.x * 40);
  }
  drawHero(
    ctx,
    view.ox + input.x * view.tile,
    view.oy + input.y * view.tile + Math.sin(input.time / 220) * 1.2,
    view.tile,
    input.schoolId,
  );
  paintVignette(ctx, width, height);

  if (input.hover && input.hover.x >= 0 && input.hover.y >= 0 && input.hover.y < rows.length && input.hover.x < rows[0].length) {
    const ch = rows[input.hover.y][input.hover.x];
    ctx.strokeStyle = SOLID.has(ch) ? "rgba(154, 47, 42, 0.85)" : "rgba(243, 230, 200, 0.95)";
    ctx.lineWidth = 2;
    strokeBracket(
      ctx,
      view.ox + input.hover.x * view.tile + 2,
      view.oy + input.hover.y * view.tile + 2,
      view.tile - 4,
      view.tile - 4,
    );
  }
  return view;
}

function paintSky(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme, mapId: MapId): void {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, theme.skyTop);
  sky.addColorStop(1, theme.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  if (mapId === "cave") {
    ctx.fillStyle = "rgba(214, 228, 238, 0.9)";
    ctx.beginPath();
    ctx.arc(width * 0.8, 36, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(214, 228, 238, 0.18)";
    ctx.beginPath();
    ctx.arc(width * 0.8, 36, 26, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const sun = mapId === "luoxia" ? "#f0c48a" : "#f7f1e2";
  ctx.fillStyle = sun;
  ctx.globalAlpha = mapId === "luoxia" ? 0.95 : 0.8;
  ctx.beginPath();
  ctx.arc(width * 0.78, 42, mapId === "luoxia" ? 22 : 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.arc(width * 0.78, 42, mapId === "luoxia" ? 40 : 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function paintMargins(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  view: View,
  theme: Theme,
  time: number,
): void {
  const mapRight = view.ox + view.cols * view.tile;
  const mapBottom = view.oy + view.rows * view.tile;
  if (mapBottom < height) paintForeground(ctx, width, mapBottom, height, theme);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, Math.max(0, view.oy));
  ctx.clip();
  drawPeaks(ctx, width, view.oy + 6, theme.far, Math.max(18, view.oy * 0.72), [0.35, 0.7, 0.4, 0.9, 0.45, 0.75, 0.3, 0.6]);
  drawPeaks(ctx, width, view.oy + 2, theme.near, Math.max(12, view.oy * 0.42), [0.2, 0.5, 0.25, 0.55, 0.22]);
  const drift = (time / 35) % (width + 220);
  drawCloud(ctx, drift - 120, Math.max(12, view.oy * 0.38), 54, 0.78);
  drawCloud(ctx, (drift * 0.65 + width * 0.45) % (width + 180) - 90, Math.max(8, view.oy * 0.62), 36, 0.5);
  ctx.restore();

  if (view.ox > 24) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, view.ox, height);
    ctx.rect(mapRight, 0, width - mapRight, height);
    ctx.clip();
    drawPine(ctx, view.ox - 18, mapBottom - 8, 34);
    drawPine(ctx, mapRight + 16, mapBottom - 4, 40);
    ctx.restore();
  }
}

function drawPeaks(
  ctx: CanvasRenderingContext2D,
  width: number,
  baseline: number,
  color: string,
  amp: number,
  peaks: number[],
): void {
  ctx.beginPath();
  ctx.moveTo(0, baseline);
  peaks.forEach((peak, index) => {
    const x = (index / (peaks.length - 1)) * width;
    ctx.lineTo(x, baseline - peak * amp);
  });
  ctx.lineTo(width, baseline);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#f7f4ee";
  ctx.beginPath();
  ctx.ellipse(x, y, scale * 0.55, scale * 0.26, 0, 0, Math.PI * 2);
  ctx.ellipse(x - scale * 0.36, y + scale * 0.06, scale * 0.32, scale * 0.2, 0, 0, Math.PI * 2);
  ctx.ellipse(x + scale * 0.38, y + scale * 0.05, scale * 0.28, scale * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPine(ctx: CanvasRenderingContext2D, x: number, y: number, h: number): void {
  ctx.fillStyle = "#1d3b2e";
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x + h * 0.38, y);
  ctx.lineTo(x - h * 0.38, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#24543c";
  ctx.beginPath();
  ctx.moveTo(x + h * 0.08, y - h * 0.72);
  ctx.lineTo(x + h * 0.36, y - h * 0.2);
  ctx.lineTo(x - h * 0.16, y - h * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#3a2a1c";
  ctx.fillRect(x - 2, y, 4, h * 0.22);
}

function strokeMapFrame(ctx: CanvasRenderingContext2D, view: View): void {
  const x = view.ox - 3;
  const y = view.oy - 3;
  const w = view.cols * view.tile + 6;
  const h = view.rows * view.tile + 6;
  ctx.strokeStyle = "rgba(62, 38, 24, 0.85)";
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = "rgba(198, 161, 91, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(view.ox, view.oy, view.cols * view.tile, view.rows * view.tile);
}

function paintVignette(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const g = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.4, width / 2, height / 2, Math.max(width, height) * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(20, 14, 10, 0.16)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

function drawFootstep(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.fillStyle = "rgba(198, 161, 91, 0.55)";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.5, y + size * 0.28);
  ctx.lineTo(x + size * 0.68, y + size * 0.5);
  ctx.lineTo(x + size * 0.5, y + size * 0.72);
  ctx.lineTo(x + size * 0.32, y + size * 0.5);
  ctx.closePath();
  ctx.fill();
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  ch: string,
  x: number,
  y: number,
  size: number,
  theme: Theme,
  noise: number,
  time: number,
  mapId: MapId,
): void {
  ctx.fillStyle = noise > 0.5 ? theme.grass : theme.grass2;
  if (mapId === "cave" && ch !== "M") ctx.fillStyle = theme.grass;
  ctx.fillRect(x, y, size, size);

  if (ch === "." || ch === "p" || ch === "," || ch === "c") {
    ctx.fillStyle = ch === "p" || ch === "c" ? theme.path : noise > 0.5 ? theme.grass : theme.grass2;
    ctx.fillRect(x, y, size, size);
  }
  if (ch === "." || ch === ",") {
    ctx.strokeStyle = mapId === "cave" ? "rgba(180, 200, 210, 0.25)" : "rgba(36, 70, 28, 0.35)";
    ctx.lineWidth = 1.2;
    const blades = ch === "," ? 4 : 2;
    for (let i = 0; i < blades; i += 1) {
      const bx = x + size * (0.2 + ((i + noise) % 1) * 0.6);
      const sway = ch === "," ? Math.sin(time / 280 + i + x) * 2.4 : 0;
      ctx.beginPath();
      ctx.moveTo(bx, y + size - 3);
      ctx.quadraticCurveTo(bx + sway, y + size * 0.55, bx + sway * 0.4, y + size * (ch === "," ? 0.22 : 0.62));
      ctx.stroke();
    }
  }
  if (ch === "p" || ch === "c") {
    ctx.strokeStyle = ch === "c" ? "rgba(20, 28, 36, 0.28)" : "rgba(90, 58, 32, 0.28)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + size * 0.12, y + size * 0.18, size * 0.34, size * 0.22);
    ctx.strokeRect(x + size * 0.5, y + size * 0.52, size * 0.32, size * 0.2);
  }
  if (ch === "W") drawWater(ctx, x, y, size, time);
  if (ch === "T") drawTree(ctx, x, y, size, noise);
  if (ch === "M") drawMountain(ctx, x, y, size, theme, noise);
  if (ch === "#") drawWall(ctx, x, y, size);
  if ("v^><".includes(ch)) drawGate(ctx, x, y, size, ch, theme);
  if (ch === "H") drawPavilion(ctx, x, y, size, "栈", "#9a2f2a");
  if (ch === "S") drawPavilion(ctx, x, y, size, "铺", "#8a6234");
  if (ch === "L") drawPavilion(ctx, x, y, size, "兽", "#1f6b58");
  if (ch === "n") drawPavilion(ctx, x, y, size, "翁", "#6b4228");
  if (ch === "B") drawPavilion(ctx, x, y, size, "主", "#1d4e63");
  if (ch === "q") drawSpring(ctx, x, y, size, time);
}

function drawWater(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number): void {
  const wave = ctx.createLinearGradient(x, y, x, y + size);
  wave.addColorStop(0, "#9ecbe0");
  wave.addColorStop(1, "#2f6d90");
  ctx.fillStyle = wave;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.25;
  for (let i = 0; i < 3; i += 1) {
    const yy = y + size * (0.28 + i * 0.22) + Math.sin(time / 260 + x * 0.03 + i) * 1.6;
    ctx.beginPath();
    ctx.moveTo(x + 3, yy);
    ctx.bezierCurveTo(x + size * 0.3, yy - 3, x + size * 0.65, yy + 3, x + size - 3, yy);
    ctx.stroke();
  }
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, noise: number): void {
  const cx = x + size / 2;
  ctx.fillStyle = "#5a3a24";
  ctx.fillRect(cx - size * 0.06, y + size * 0.52, size * 0.12, size * 0.36);
  ctx.fillStyle = noise > 0.5 ? "#2f6b3a" : "#3e8148";
  ctx.beginPath();
  ctx.ellipse(cx, y + size * 0.46, size * 0.3, size * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = noise > 0.5 ? "#3f8a4e" : "#2c6438";
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.08, y + size * 0.36, size * 0.18, size * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(18, 40, 22, 0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, y + size * 0.46, size * 0.3, size * 0.24, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawMountain(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, theme: Theme, noise: number): void {
  const wash = ctx.createLinearGradient(x, y, x, y + size);
  wash.addColorStop(0, theme.rockLite);
  wash.addColorStop(1, theme.rock);
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, size, size);
  const crest = size * (0.08 + noise * 0.42);
  ctx.fillStyle = theme.rock;
  if (noise < 0.34) {
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.72);
    ctx.lineTo(x + size * 0.28, y + crest);
    ctx.lineTo(x + size * 0.55, y + size * 0.48);
    ctx.lineTo(x + size, y + size * 0.66);
    ctx.lineTo(x + size, y + size);
    ctx.lineTo(x, y + size);
    ctx.closePath();
    ctx.fill();
  } else if (noise < 0.67) {
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.55);
    ctx.quadraticCurveTo(x + size * 0.3, y + crest, x + size * 0.5, y + size * 0.4);
    ctx.quadraticCurveTo(x + size * 0.75, y + crest * 0.6, x + size, y + size * 0.5);
    ctx.lineTo(x + size, y + size);
    ctx.lineTo(x, y + size);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.42);
    ctx.lineTo(x + size * 0.5, y + crest);
    ctx.lineTo(x + size, y + size * 0.46);
    ctx.lineTo(x + size, y + size);
    ctx.lineTo(x, y + size);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(247, 241, 228, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + size * 0.12, y + size * 0.68);
  ctx.quadraticCurveTo(x + size * 0.5, y + size * 0.58, x + size * 0.88, y + size * 0.7);
  ctx.stroke();
  if (noise > 0.4) {
    ctx.fillStyle = "rgba(247, 241, 228, 0.82)";
    ctx.beginPath();
    ctx.moveTo(x + size * 0.5, y + crest);
    ctx.lineTo(x + size * 0.62, y + crest + size * 0.12);
    ctx.lineTo(x + size * 0.4, y + crest + size * 0.1);
    ctx.closePath();
    ctx.fill();
  }
}

function paintForeground(
  ctx: CanvasRenderingContext2D,
  width: number,
  y0: number,
  height: number,
  theme: Theme,
): void {
  const g = ctx.createLinearGradient(0, y0, 0, height);
  g.addColorStop(0, theme.grass);
  g.addColorStop(1, theme.near);
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, width, height - y0);
  ctx.fillStyle = theme.near;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, y0 + (height - y0) * 0.55);
  ctx.quadraticCurveTo(width * 0.28, y0 + (height - y0) * 0.15, width * 0.55, y0 + (height - y0) * 0.5);
  ctx.quadraticCurveTo(width * 0.8, y0 + (height - y0) * 0.75, width, y0 + (height - y0) * 0.35);
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(36, 58, 28, 0.28)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 14; i += 1) {
    const x = (i * 89 + 20) % width;
    ctx.beginPath();
    ctx.moveTo(x, height - 2);
    ctx.quadraticCurveTo(x + 6, y0 + (height - y0) * 0.45, x + 2, y0 + 6);
    ctx.stroke();
  }
}

function drawWall(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.fillStyle = "#8d6244";
  ctx.fillRect(x + 1, y + size * 0.32, size - 2, size * 0.66);
  ctx.fillStyle = "#9a2f2a";
  ctx.fillRect(x, y + size * 0.18, size, size * 0.16);
  ctx.fillStyle = "#e7d3a1";
  ctx.fillRect(x, y + size * 0.32, size, 2);
  ctx.fillStyle = "#5c3a28";
  ctx.fillRect(x + 3, y + size * 0.36, 3, size * 0.5);
  ctx.fillRect(x + size - 6, y + size * 0.36, 3, size * 0.5);
}

function drawGate(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, ch: string, theme: Theme): void {
  ctx.fillStyle = theme.path;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = "#6b4228";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.08, y + size * 0.4);
  ctx.quadraticCurveTo(x + size * 0.5, y + size * 0.16, x + size * 0.92, y + size * 0.4);
  ctx.lineTo(x + size * 0.82, y + size * 0.48);
  ctx.quadraticCurveTo(x + size * 0.5, y + size * 0.3, x + size * 0.18, y + size * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#5c3a28";
  ctx.fillRect(x + size * 0.16, y + size * 0.46, size * 0.1, size * 0.4);
  ctx.fillRect(x + size * 0.74, y + size * 0.46, size * 0.1, size * 0.4);
  inkLabel(ctx, x, y + size * 0.08, size, ch === "v" ? "南" : ch === "^" ? "北" : ch === ">" ? "东" : "西", "#1c140e");
}

function drawPavilion(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, label: string, accent: string): void {
  ctx.fillStyle = "rgba(28, 20, 14, 0.12)";
  ctx.fillRect(x + size * 0.16, y + size * 0.78, size * 0.68, size * 0.08);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(x + size * 0.06, y + size * 0.4);
  ctx.quadraticCurveTo(x + size * 0.5, y + size * 0.12, x + size * 0.94, y + size * 0.4);
  ctx.lineTo(x + size * 0.84, y + size * 0.48);
  ctx.quadraticCurveTo(x + size * 0.5, y + size * 0.26, x + size * 0.16, y + size * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(28, 20, 14, 0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#f7f1e4";
  ctx.fillRect(x + size * 0.22, y + size * 0.46, size * 0.1, size * 0.32);
  ctx.fillRect(x + size * 0.68, y + size * 0.46, size * 0.1, size * 0.32);
  ctx.fillStyle = "#fffaf2";
  ctx.fillRect(x + size * 0.32, y + size * 0.48, size * 0.36, size * 0.3);
  ctx.strokeStyle = accent;
  ctx.strokeRect(x + size * 0.32, y + size * 0.48, size * 0.36, size * 0.3);
  inkLabel(ctx, x, y + size * 0.04, size, label, accent);
}

function drawSpring(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.fillStyle = "#d7c4a0";
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  const pool = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.3);
  pool.addColorStop(0, "#d5eef8");
  pool.addColorStop(1, "#3a7ca5");
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, size * (0.1 + (Math.sin(time / 300) + 1) * 0.05), 0, Math.PI * 2);
  ctx.stroke();
  inkLabel(ctx, x, y, size, "泉", "#102433");
}

function inkLabel(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, text: string, color: string): void {
  ctx.fillStyle = color;
  ctx.font = `700 ${Math.max(10, Math.floor(size * 0.34))}px "Noto Serif SC", "Source Han Serif SC", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + size / 2, y + size / 2);
}

function drawWisp(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number): void {
  const bob = Math.sin(time / 200) * 3;
  const cx = x + size / 2;
  const cy = y + size / 2 + bob;
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.48);
  glow.addColorStop(0, "rgba(255, 236, 186, 0.95)");
  glow.addColorStop(0.45, "rgba(224, 122, 69, 0.45)");
  glow.addColorStop(1, "rgba(196, 81, 58, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff6df";
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.22);
  ctx.quadraticCurveTo(cx + size * 0.14, cy, cx, cy + size * 0.2);
  ctx.quadraticCurveTo(cx - size * 0.14, cy, cx, cy - size * 0.22);
  ctx.fill();
  for (let i = 0; i < 2; i += 1) {
    const ang = time / 400 + i * Math.PI;
    ctx.fillStyle = i === 0 ? "#f2d48a" : "#fffaf2";
    ctx.beginPath();
    ctx.arc(cx + Math.cos(ang) * size * 0.28, cy + Math.sin(ang) * size * 0.18, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function schoolAccent(schoolId: string): string {
  if (schoolId === "fire") return "#e07a45";
  if (schoolId === "water") return "#6eb0d4";
  if (schoolId === "earth") return "#c6a15b";
  if (schoolId === "wood") return "#7dae72";
  return "#d9d3c7";
}

function drawHero(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, schoolId: string): void {
  const scale = 1.18;
  const grown = size * scale;
  x -= (grown - size) / 2;
  y -= (grown - size) * 0.78;
  size = grown;
  const accent = schoolAccent(schoolId);
  const cx = x + size / 2;
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.arc(cx, y + size * 0.52, size * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(20, 16, 12, 0.28)";
  ctx.beginPath();
  ctx.ellipse(cx, y + size * 0.86, size * 0.22, size * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f6f1e6";
  ctx.beginPath();
  ctx.moveTo(cx, y + size * 0.4);
  ctx.lineTo(cx + size * 0.26, y + size * 0.84);
  ctx.lineTo(cx - size * 0.26, y + size * 0.84);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a2118";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(2, size * 0.055);
  ctx.beginPath();
  ctx.moveTo(cx, y + size * 0.5);
  ctx.lineTo(cx, y + size * 0.8);
  ctx.stroke();
  ctx.fillStyle = "#f3ddc4";
  ctx.beginPath();
  ctx.arc(cx, y + size * 0.32, size * 0.125, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a2118";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#1c1612";
  ctx.beginPath();
  ctx.arc(cx, y + size * 0.27, size * 0.09, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, y + size * 0.19, size * 0.042, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a2118";
  const eye = Math.max(1, size * 0.028);
  ctx.fillRect(cx - size * 0.06, y + size * 0.32, eye * 1.3, eye);
  ctx.fillRect(cx + size * 0.03, y + size * 0.32, eye * 1.3, eye);
  drawWeapon(ctx, x, y, size, schoolId, accent);
}

function drawWeapon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  schoolId: string,
  accent: string,
): void {
  const cx = x + size / 2;
  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  ctx.lineWidth = Math.max(1.5, size * 0.045);
  ctx.lineCap = "round";
  if (schoolId === "fire") {
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.16, y + size * 0.62);
    ctx.quadraticCurveTo(cx + size * 0.28, y + size * 0.5, cx + size * 0.18, y + size * 0.46);
    ctx.quadraticCurveTo(cx + size * 0.22, y + size * 0.58, cx + size * 0.12, y + size * 0.64);
    ctx.fill();
    return;
  }
  if (schoolId === "water") {
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.18, y + size * 0.48);
    ctx.quadraticCurveTo(cx + size * 0.28, y + size * 0.6, cx + size * 0.16, y + size * 0.7);
    ctx.quadraticCurveTo(cx + size * 0.12, y + size * 0.58, cx + size * 0.18, y + size * 0.48);
    ctx.fill();
    return;
  }
  if (schoolId === "earth") {
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.2, y + size * 0.42);
    ctx.lineTo(cx + size * 0.2, y + size * 0.78);
    ctx.stroke();
    return;
  }
  if (schoolId === "wood") {
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.2, y + size * 0.7);
    ctx.quadraticCurveTo(cx - size * 0.05, y + size * 0.5, cx + size * 0.16, y + size * 0.46);
    ctx.stroke();
    return;
  }
  ctx.strokeStyle = "#ece6dc";
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.2, y + size * 0.4);
  ctx.lineTo(cx + size * 0.2, y + size * 0.74);
  ctx.stroke();
  ctx.strokeStyle = "#c6a15b";
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.14, y + size * 0.46);
  ctx.lineTo(cx + size * 0.26, y + size * 0.46);
  ctx.stroke();
}

function strokeBracket(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const m = Math.max(5, Math.min(w, h) * 0.28);
  ctx.beginPath();
  ctx.moveTo(x, y + m);
  ctx.lineTo(x, y);
  ctx.lineTo(x + m, y);
  ctx.moveTo(x + w - m, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + m);
  ctx.moveTo(x, y + h - m);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + m, y + h);
  ctx.moveTo(x + w - m, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - m);
  ctx.stroke();
}

export function tileAt(view: View, localX: number, localY: number): { x: number; y: number } | null {
  const x = Math.floor((localX - view.ox) / view.tile);
  const y = Math.floor((localY - view.oy) / view.tile);
  if (x < 0 || y < 0 || x >= view.cols || y >= view.rows) return null;
  return { x, y };
}
