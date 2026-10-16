import { SOLID } from "./data.js";

export interface Point {
  x: number;
  y: number;
}

export function tileChar(rows: string[], x: number, y: number): string {
  return rows[y]?.[x] ?? "#";
}

export function isSolid(rows: string[], x: number, y: number): boolean {
  return SOLID.has(tileChar(rows, x, y));
}

export function findPath(rows: string[], from: Point, to: Point): Point[] | null {
  if (from.x === to.x && from.y === to.y) return [];
  if (isSolid(rows, to.x, to.y)) return null;
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const key = (p: Point) => `${p.x},${p.y}`;
  const queue: Point[] = [from];
  const prev = new Map<string, string | null>();
  prev.set(key(from), null);
  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (!cur) break;
    for (const dir of dirs) {
      const next = { x: cur.x + dir.x, y: cur.y + dir.y };
      if (next.x < 0 || next.y < 0 || next.x >= width || next.y >= height) continue;
      const id = key(next);
      if (prev.has(id) || isSolid(rows, next.x, next.y)) continue;
      prev.set(id, key(cur));
      if (next.x === to.x && next.y === to.y) {
        const path: Point[] = [next];
        let cursor: string | null = key(cur);
        while (cursor && cursor !== key(from)) {
          const [x, y] = cursor.split(",").map(Number);
          path.push({ x, y });
          cursor = prev.get(cursor) ?? null;
        }
        path.reverse();
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}
