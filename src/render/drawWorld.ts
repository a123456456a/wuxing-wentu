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

const THEME: Record<MapId, { sky: string; ground: string; grass: string; grass2: string; path: string }> = {
  qingshi: { sky: "#d7ecf2", ground: "#c6d7a4", grass: "#b7cf86", grass2: "#9fbe6d", path: "#e6d3a4" },
  luoxia: { sky: "#f0c49a", ground: "#d7b56a", grass: "#c4a15a", grass2: "#a88745", path: "#efe0b8" },
  wangji: { sky: "#9bb89a", ground: "#6e8f62", grass: "#5f8454", grass2: "#4d7044", path: "#d9c391" },
  cave: { sky: "#243246", ground: "#3c4654", grass: "#33404c", grass2: "#2a3642", path: "#6e7c8c" },
};

export function viewOf(cols: number, rows: number, width: number, height: number): View {
  const tile = Math.max(16, Math.floor(Math.min(width / cols, (height - 8) / rows)));
  return {
    tile,
    ox: Math.floor((width - tile * cols) / 2),
    oy: Math.floor((height - tile * rows) / 2),
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
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, theme.sky);
  sky.addColorStop(1, theme.ground);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const pathSet = new Set(input.path.map((point) => `${point.x},${point.y}`));
  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) {
      const ch = rows[y][x];
      const px = view.ox + x * view.tile;
      const py = view.oy + y * view.tile;
      drawTile(ctx, ch, px, py, view.tile, theme, hash(x, y), input.time, input.mapId);
      if (pathSet.has(`${x},${y}`)) {
        ctx.fillStyle = "rgba(198, 161, 91, 0.35)";
        ctx.fillRect(px + 4, py + 4, view.tile - 8, view.tile - 8);
      }
    }
  }

  for (const wisp of map.wisps) {
    if (input.defeated.includes(`${input.mapId}:${wisp.x}:${wisp.y}`)) continue;
    drawWisp(ctx, view.ox + wisp.x * view.tile, view.oy + wisp.y * view.tile, view.tile, input.time + wisp.x);
  }

  drawHero(ctx, view.ox + input.x * view.tile, view.oy + input.y * view.tile + Math.sin(input.time / 220) * 1.2, view.tile, input.schoolId);

  if (input.hover && input.hover.x >= 0 && input.hover.y >= 0 && input.hover.y < rows.length && input.hover.x < rows[0].length) {
    const ch = rows[input.hover.y][input.hover.x];
    ctx.strokeStyle = SOLID.has(ch) ? "rgba(143, 45, 45, 0.7)" : "rgba(255, 248, 230, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(view.ox + input.hover.x * view.tile + 1, view.oy + input.hover.y * view.tile + 1, view.tile - 2, view.tile - 2);
  }
  return view;
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  ch: string,
  x: number,
  y: number,
  size: number,
  theme: (typeof THEME)["qingshi"],
  noise: number,
  time: number,
  mapId: MapId,
): void {
  const pad = 1;
  ctx.fillStyle = noise > 0.5 ? theme.grass : theme.grass2;
  if (mapId === "cave" && ch !== "M") ctx.fillStyle = theme.ground;
  ctx.fillRect(x, y, size, size);
  if (ch === "." || ch === "p" || ch === "," || ch === "c") {
    ctx.fillStyle = ch === "p" || ch === "c" ? theme.path : noise > 0.5 ? theme.grass : theme.grass2;
    ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);
  }
  if (ch === ",") {
    ctx.strokeStyle = "rgba(40, 70, 30, 0.45)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i += 1) {
      const bx = x + 6 + i * (size / 4);
      ctx.beginPath();
      ctx.moveTo(bx, y + size - 6);
      ctx.quadraticCurveTo(bx + Math.sin(time / 300 + i) * 3, y + size / 2, bx + 2, y + 8);
      ctx.stroke();
    }
  }
  if (ch === "W") {
    const wave = ctx.createLinearGradient(x, y, x, y + size);
    wave.addColorStop(0, "#7eb8d4");
    wave.addColorStop(1, "#3d7596");
    ctx.fillStyle = wave;
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(x + 4, y + size * 0.45 + Math.sin(time / 280 + x) * 2);
    ctx.bezierCurveTo(x + size * 0.35, y + size * 0.25, x + size * 0.65, y + size * 0.7, x + size - 4, y + size * 0.4);
    ctx.stroke();
  }
  if (ch === "T") {
    ctx.fillStyle = "#6d4c32";
    ctx.fillRect(x + size * 0.42, y + size * 0.45, size * 0.16, size * 0.4);
    ctx.fillStyle = noise > 0.5 ? "#2f6b3a" : "#3e8148";
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size * 0.4, size * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
  if (ch === "M" || ch === "#") {
    ctx.fillStyle = ch === "#" ? "#8d5a3c" : "#5d6570";
    ctx.beginPath();
    ctx.moveTo(x + size * 0.5, y + 3);
    ctx.lineTo(x + size - 2, y + size - 2);
    ctx.lineTo(x + 2, y + size - 2);
    ctx.closePath();
    ctx.fill();
    if (ch === "#") {
      ctx.fillStyle = "#c4513a";
      ctx.fillRect(x + size * 0.2, y + 2, size * 0.6, size * 0.18);
    }
  }
  if ("v^><".includes(ch)) {
    ctx.fillStyle = theme.path;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    ctx.fillStyle = "#5c3a28";
    ctx.fillRect(x + size * 0.18, y + size * 0.38, size * 0.14, size * 0.46);
    ctx.fillRect(x + size * 0.68, y + size * 0.38, size * 0.14, size * 0.46);
    ctx.fillRect(x + size * 0.16, y + size * 0.24, size * 0.68, size * 0.16);
    ctx.fillStyle = "#1c1612";
    ctx.font = `bold ${Math.floor(size * 0.32)}px "WenQuanYi Micro Hei", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const arrow = ch === "v" ? "南" : ch === "^" ? "北" : ch === ">" ? "东" : "西";
    ctx.fillText(arrow, x + size / 2, y + size * 0.62);
  }
  if (ch === "H" || ch === "S" || ch === "L" || ch === "n" || ch === "q" || ch === "B") {
    ctx.fillStyle = "rgba(255, 248, 230, 0.9)";
    ctx.fillRect(x + 3, y + 3, size - 6, size - 6);
    ctx.fillStyle = ch === "B" ? "#d4532b" : ch === "q" ? "#3a7ca5" : "#8f2d2d";
    ctx.font = `bold ${Math.floor(size * 0.38)}px "WenQuanYi Micro Hei", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = ch === "H" ? "栈" : ch === "S" ? "铺" : ch === "L" ? "兽" : ch === "n" ? "翁" : ch === "q" ? "泉" : "主";
    ctx.fillText(label, x + size / 2, y + size / 2);
  }
}

function drawWisp(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number): void {
  const bob = Math.sin(time / 200) * 3;
  const cx = x + size / 2;
  const cy = y + size / 2 + bob;
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.45);
  glow.addColorStop(0, "rgba(255, 236, 170, 0.95)");
  glow.addColorStop(1, "rgba(196, 81, 58, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.42, 0, Math.PI * 2);
  ctx.fill();
}

function drawHero(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, schoolId: string): void {
  const color = schoolId === "fire" ? "#e07a45" : schoolId === "water" ? "#6eb0d4" : schoolId === "earth" ? "#c6a15b" : schoolId === "wood" ? "#7dae72" : "#efe6d4";
  const cx = x + size / 2;
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(cx, y + size - 6, size * 0.22, size * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, y + size * 0.34);
  ctx.lineTo(cx + size * 0.22, y + size * 0.78);
  ctx.lineTo(cx - size * 0.22, y + size * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f3e0c4";
  ctx.beginPath();
  ctx.arc(cx, y + size * 0.3, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a241e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.08, y + size * 0.42);
  ctx.lineTo(cx + size * 0.2, y + size * 0.7);
  ctx.stroke();
}

export function tileAt(view: View, localX: number, localY: number): { x: number; y: number } | null {
  const x = Math.floor((localX - view.ox) / view.tile);
  const y = Math.floor((localY - view.oy) / view.tile);
  if (x < 0 || y < 0 || x >= view.cols || y >= view.rows) return null;
  return { x, y };
}
