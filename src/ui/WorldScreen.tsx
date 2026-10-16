import { useEffect, useRef } from "react";
import { useSyncExternalStore } from "react";
import { MAPS } from "../game/data.js";
import { ELEMENT_NAME } from "../game/elements.js";
import { expToNext, formatDao, realmName } from "../game/format.js";
import { playerDerived } from "../game/stats.js";
import { api, getState, subscribe } from "../game/store.js";
import { drawWorld, tileAt, viewOf } from "../render/drawWorld.js";
import { Bar } from "./bits.js";
import { Panels } from "./Panels.js";

const DIRS = [
  { id: "up", dx: 0, dy: -1, label: "上" },
  { id: "left", dx: -1, dy: 0, label: "左" },
  { id: "down", dx: 0, dy: 1, label: "下" },
  { id: "right", dx: 1, dy: 0, label: "右" },
];

export function WorldScreen() {
  const state = useSyncExternalStore(subscribe, getState);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hover = useRef<{ x: number; y: number } | null>(null);
  const visual = useRef({ x: state.x, y: state.y, map: state.mapId });
  const player = state.player;
  const map = MAPS[state.mapId];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const key = event.key.toLowerCase();
      const dir: [number, number] | null =
        key === "arrowup" || key === "w"
          ? [0, -1]
          : key === "arrowdown" || key === "s"
            ? [0, 1]
            : key === "arrowleft" || key === "a"
              ? [-1, 0]
              : key === "arrowright" || key === "d"
                ? [1, 0]
                : null;
      if (dir) {
        event.preventDefault();
        api.tryStep(dir[0], dir[1]);
        return;
      }
      if (event.key === "Escape") api.closePanel();
      if ((event.key === "Enter" || event.key === " ") && getState().dialog) {
        event.preventDefault();
        api.advanceDialog();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (state.path.length === 0 || state.dialog || state.panel || state.phase !== "world") return;
    const next = state.path[0];
    const timer = window.setTimeout(() => {
      const stop = api.stepExact(next.x, next.y);
      const latest = getState();
      if (stop) api.setPath([]);
      else api.setPath(latest.path.slice(1));
    }, 140);
    return () => window.clearTimeout(timer);
  }, [state.path, state.x, state.y, state.dialog, state.panel, state.phase, state.mapId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0;
    const loop = (time: number) => {
      const current = getState();
      const node = canvasRef.current;
      if (!node || !current.player) return;
      if (visual.current.map !== current.mapId) {
        visual.current = { x: current.x, y: current.y, map: current.mapId };
      } else {
        visual.current.x += (current.x - visual.current.x) * 0.35;
        visual.current.y += (current.y - visual.current.y) * 0.35;
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = node.clientWidth;
      const height = node.clientHeight;
      if (width > 0 && height > 0) {
        if (node.width !== Math.floor(width * dpr) || node.height !== Math.floor(height * dpr)) {
          node.width = Math.floor(width * dpr);
          node.height = Math.floor(height * dpr);
        }
        const ctx = node.getContext("2d");
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawWorld(ctx, width, height, {
            mapId: current.mapId,
            x: visual.current.x,
            y: visual.current.y,
            schoolId: current.player.schoolId,
            path: current.path,
            defeated: current.defeatedWisps,
            hover: hover.current,
            time,
          });
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!player) return null;
  const stats = playerDerived(player, state.weaponId, state.armorId);
  const aliveWisps = map.wisps.filter((wisp) => !state.defeatedWisps.includes(`${map.id}:${wisp.x}:${wisp.y}`)).length;

  const pointFromEvent = (event: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const rows = map.rows;
    const view = viewOf(rows[0].length, rows.length, rect.width, rect.height);
    return tileAt(view, event.clientX - rect.left, event.clientY - rect.top);
  };

  return (
    <section className="shell">
      <header className="hud">
        <div>
          <strong>{player.name}</strong>
          <span>
            {realmName(player.level)} · {player.level} 级 · {ELEMENT_NAME[player.affinity]}
          </span>
        </div>
        <div className="hud-bars">
          <Bar kind="hp" value={player.hp} max={stats.maxHp} />
          <Bar kind="mp" value={player.mp} max={stats.maxMp} />
          <Bar kind="exp" value={player.exp} max={expToNext(player.level)} />
        </div>
        <div className="hud-meta">
          <span>金钱 {state.gold}</span>
          <span>道行 {formatDao(player.daoXing)}</span>
          <span>
            {map.name}
            {aliveWisps > 0 ? ` · 妖气 ${aliveWisps}` : ""}
          </span>
        </div>
      </header>
      <div className="stage">
        <canvas
          ref={canvasRef}
          className="world"
          onPointerDown={(event: { clientX: number; clientY: number }) => {
            const point = pointFromEvent(event);
            if (point) api.walkTo(point.x, point.y);
          }}
          onPointerMove={(event: { clientX: number; clientY: number }) => {
            hover.current = pointFromEvent(event);
          }}
        />
        <div className="dpad">
          {DIRS.map((dir) => (
            <button key={dir.id} type="button" className={`pad ${dir.id}`} onClick={() => api.tryStep(dir.dx, dir.dy)}>
              {dir.label}
            </button>
          ))}
        </div>
      </div>
      {state.dialog && (
        <div className="dialog" role="dialog">
          <strong>{state.dialog.speaker}</strong>
          <p>{state.dialog.lines[state.dialog.index]}</p>
          {state.dialog.index < state.dialog.lines.length - 1 || !state.dialog.choices ? (
            <button type="button" onClick={() => api.advanceDialog()}>
              继续
            </button>
          ) : (
            <div className="choices">
              {state.dialog.choices.map((choice) => (
                <button key={choice.id} type="button" onClick={() => api.chooseDialog(choice.id)}>
                  {choice.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {state.panel && <Panels />}
      <footer className="dock">
        <button type="button" onClick={() => api.openPanel("char")}>人物</button>
        <button type="button" onClick={() => api.openPanel("bag")}>行囊</button>
        <button type="button" onClick={() => api.openPanel("pet")}>灵兽</button>
        <button type="button" onClick={() => api.openPanel("map")}>地图</button>
        <button type="button" onClick={() => api.openPanel("help")}>五行</button>
        <button type="button" onClick={() => api.saveNow()}>存档</button>
        <button type="button" onClick={() => api.toggleMute()}>{state.muted ? "开声" : "静音"}</button>
      </footer>
    </section>
  );
}
