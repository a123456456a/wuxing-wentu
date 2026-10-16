export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** 360 日为一载，只用于显示。 */
export function formatDao(points: number): string {
  const safe = Math.max(0, Math.floor(points));
  const years = Math.floor(safe / 360);
  const days = safe % 360;
  if (years <= 0) return `${days}日`;
  return `${years}载${days}日`;
}

export function realmName(level: number): string {
  if (level <= 2) return "炼气";
  if (level <= 4) return "引灵";
  if (level <= 6) return "凝元";
  if (level <= 8) return "通脉";
  if (level <= 11) return "守一";
  return "问道";
}

export function expToNext(level: number): number {
  return 48 + level * 28;
}

export function skillStable(daoXing: number): number {
  return Math.min(14, Math.floor(daoXing / 30));
}

export function controlResist(daoXing: number): number {
  return Math.min(16, Math.floor(daoXing / 28));
}
