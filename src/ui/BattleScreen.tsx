import { useEffect, useRef, useState } from "react";
import { useSyncExternalStore } from "react";
import { catchPreview, currentActor, validTargetIds } from "../game/combat.js";
import { ITEMS, skillById } from "../game/data.js";
import { ELEMENT_NAME, relation, relationHint } from "../game/elements.js";
import { formatDao } from "../game/format.js";
import { api, getState, subscribe } from "../game/store.js";
import type { Fighter, ItemId } from "../game/types.js";
import { Bar, Portrait } from "./bits.js";

export function BattleScreen() {
  const state = useSyncExternalStore(subscribe, getState);
  const battle = state.battle;
  const [menu, setMenu] = useState<"root" | "skill" | "item">("root");
  const logRef = useRef<HTMLDivElement | null>(null);
  const actor = battle ? currentActor(battle) : null;

  useEffect(() => {
    setMenu("root");
  }, [battle?.actorId, battle?.round, battle?.phase]);

  useEffect(() => {
    if (!battle || battle.phase !== "ai") return;
    const timer = window.setTimeout(() => api.battleAct({ type: "ai" }), 560);
    return () => window.clearTimeout(timer);
  }, [battle?.phase, battle?.cursor, battle?.round, battle?.seq]);

  useEffect(() => {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [battle?.log.length]);

  useEffect(() => {
    if (!battle || battle.phase !== "command" || !actor || actor.kind === "monster") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu("root");
        if (battle.phase === "target") api.battleAct({ type: "back" });
      }
      const index = Number(event.key) - 1;
      if (Number.isNaN(index) || index < 0) return;
      if (menu === "skill" && actor.skills[index]) api.battleAct({ type: "skill", skillId: actor.skills[index] });
      if (menu === "root") {
        const actions = ["attack", "skill", "item", "defend", "catch", "flee"] as const;
        const action = actions[index];
        if (action === "attack") api.battleAct({ type: "attack" });
        if (action === "skill") setMenu("skill");
        if (action === "item") setMenu("item");
        if (action === "defend") api.battleAct({ type: "defend" });
        if (action === "catch") api.battleAct({ type: "catch" });
        if (action === "flee") api.battleAct({ type: "flee" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [battle, actor, menu]);

  if (!battle) return null;
  const done = battle.phase === "victory" || battle.phase === "defeat" || battle.phase === "fled";
  const targeting = battle.phase === "target";
  const targets = new Set(validTargetIds(battle));
  const mine = actor?.kind === "player" || actor?.kind === "pet";
  const foe = battle.enemies.find((fighter) => fighter.hp > 0) ?? null;

  return (
    <section className={`shell battle-screen area-${battle.area}`}>
      <header className="hud">
        <div>
          <strong>{done ? "斗法结束" : actor ? `轮到 ${actor.name}` : "对峙"}</strong>
          <span>
            第 {battle.round} 回合 · 道行 {state.player ? formatDao(state.player.daoXing) : ""}
          </span>
        </div>
        <p className="hint">{targeting ? "点一名角色作为目标。" : mine ? "数字键 1 到 6 对应下方指令。" : ""}</p>
      </header>
      <div className="battle-field">
        <div className="enemy-row">
          {battle.enemies.map((fighter) => (
            <FighterCard key={fighter.id} fighter={fighter} battleHit={battle.lastHit} selected={targets.has(fighter.id)} onPick={() => { if (targeting) api.battleAct({ type: "target", id: fighter.id }); }} />
          ))}
        </div>
        <div className="ally-row">
          {battle.allies.map((fighter) => (
            <FighterCard key={fighter.id} fighter={fighter} battleHit={battle.lastHit} selected={targets.has(fighter.id)} onPick={() => { if (targeting) api.battleAct({ type: "target", id: fighter.id }); }} />
          ))}
        </div>
      </div>
      <div className="log" ref={logRef} aria-live="polite">
        {battle.log.map((line) => (
          <p key={line.id}>{line.text}</p>
        ))}
      </div>
      {done ? (
        <div className="commands outcome">
          {battle.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
          <button type="button" className="primary" onClick={() => api.finishBattle()}>
            {battle.phase === "defeat" ? "在客栈醒来" : "继续赶路"}
          </button>
        </div>
      ) : (
        <div className="commands">
          {targeting && (
            <button type="button" onClick={() => api.battleAct({ type: "back" })}>
              返回
            </button>
          )}
          {!targeting && mine && menu === "root" && actor?.kind === "player" && (
            <>
              <button type="button" onClick={() => api.battleAct({ type: "attack" })}>攻击</button>
              <button type="button" disabled={actor.buffs.some((buff) => buff.kind === "seal")} onClick={() => setMenu("skill")}>法术</button>
              <button type="button" onClick={() => setMenu("item")}>物品</button>
              <button type="button" onClick={() => api.battleAct({ type: "defend" })}>防御</button>
              <button type="button" disabled={(state.inventory.talisman ?? 0) <= 0} onClick={() => api.battleAct({ type: "catch" })}>
                契灵 {state.inventory.talisman ?? 0}
              </button>
              <button type="button" onClick={() => api.battleAct({ type: "flee" })}>{battle.boss ? "退路已断" : "撤退"}</button>
            </>
          )}
          {!targeting && mine && menu === "root" && actor?.kind === "pet" && (
            <>
              <button type="button" onClick={() => api.battleAct({ type: "attack" })}>攻击</button>
              <button type="button" onClick={() => setMenu("skill")}>法术</button>
              <button type="button" onClick={() => api.battleAct({ type: "defend" })}>防御</button>
              <button type="button" onClick={() => api.battleAct({ type: "auto" })}>自行其是</button>
            </>
          )}
          {!targeting && mine && menu === "skill" && actor && (
            <>
              {actor.skills.map((id) => {
                const skill = skillById(id);
                const rel = foe && skill.kind !== "heal" && skill.kind !== "buff" ? relation(skill.element, foe.element) : null;
                return (
                  <button key={id} type="button" disabled={actor.mp < skill.mp} onClick={() => api.battleAct({ type: "skill", skillId: id })}>
                    <strong>{skill.name}</strong>
                    <small>
                      {ELEMENT_NAME[skill.element]} · {skill.mp} 法力
                      {rel ? ` · ${relationHint(rel)}` : ""}
                    </small>
                  </button>
                );
              })}
              <button type="button" onClick={() => setMenu("root")}>返回</button>
            </>
          )}
          {!targeting && mine && menu === "item" && (
            <>
              <ItemButton id="pill_hp" count={state.inventory.pill_hp ?? 0} />
              <ItemButton id="pill_mp" count={state.inventory.pill_mp ?? 0} />
              <button type="button" onClick={() => setMenu("root")}>返回</button>
            </>
          )}
          {!mine && !done && <p className="hint">对方正在动作。</p>}
          {actor && foe && mine && menu === "root" && (
            <p className="hint">
              对 {foe.name}：普攻是{ELEMENT_NAME[actor.affinity]}，{relationHint(relation(actor.affinity, foe.element))}
              {actor.kind === "player" ? catchLine(actor, battle.enemies) : ""}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function catchLine(actor: Fighter, enemies: Fighter[]): string {
  const target = enemies.find((fighter) => fighter.hp > 0 && fighter.catchable);
  if (!target) return "";
  const chance = catchPreview(actor, target);
  return chance == null ? "" : `。${target.name} 契灵大约 ${chance}%`;
}

function ItemButton({ id, count }: { id: ItemId; count: number }) {
  return (
    <button type="button" disabled={count <= 0} onClick={() => api.battleAct({ type: "item", itemId: id })}>
      {ITEMS[id].name} ×{count}
    </button>
  );
}

function FighterCard({
  fighter,
  selected,
  onPick,
  battleHit,
}: {
  fighter: Fighter;
  selected: boolean;
  onPick: () => void;
  battleHit: { id: number; targetId: string; text: string } | null;
}) {
  const kind = fighter.kind === "player" ? "hero" : fighter.speciesId ?? fighter.kind;
  return (
    <button type="button" className={`fighter${selected ? " target" : ""}${fighter.hp <= 0 ? " fainted" : ""}`} disabled={fighter.hp <= 0} onClick={onPick}>
      <Portrait kind={kind} element={fighter.element} />
      <div>
        <strong>
          {fighter.name}
          <small> {fighter.level}级 · {ELEMENT_NAME[fighter.element]}</small>
        </strong>
        <Bar kind="hp" value={fighter.hp} max={fighter.maxHp} />
        <Bar kind="mp" value={fighter.mp} max={fighter.maxMp} />
        <div className="buffs">
          {fighter.defending && <em>守</em>}
          {fighter.buffs.map((buff) => (
            <em key={buff.id}>{buff.name}{buff.turns}</em>
          ))}
        </div>
      </div>
      {battleHit?.targetId === fighter.id && <b key={battleHit.id} className="float">{battleHit.text}</b>}
    </button>
  );
}
