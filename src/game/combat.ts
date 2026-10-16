import { ENCOUNTERS, LEVEL_BAND, SPECIES, skillById } from "./data.js";
import { ELEMENT_NAME, relation, type Element } from "./elements.js";
import { clamp, controlResist, skillStable } from "./format.js";
import { makeMonster, pillHeal, pillMana } from "./stats.js";
import type {
  BattleState,
  Buff,
  CaughtPet,
  Fighter,
  ItemId,
  MapId,
  PendingAction,
  Rewards,
} from "./types.js";

let randomFn: () => number = Math.random;

export function setRandom(fn: () => number): void {
  randomFn = fn;
}

export function rng(): number {
  return randomFn();
}

function irand(max: number): number {
  return Math.floor(rng() * max);
}

function pickWeighted<T extends { weight: number }>(rows: T[]): T {
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  let roll = rng() * total;
  for (const row of rows) {
    roll -= row.weight;
    if (roll <= 0) return row;
  }
  return rows[rows.length - 1];
}

export interface StrikeResult {
  damage: number;
  crit: boolean;
  relation: ReturnType<typeof relation>;
  mpGain: number;
}

export function strike(
  attacker: Fighter,
  defender: Fighter,
  element: Element,
  power: number,
  canCrit: boolean,
): StrikeResult {
  const rel = relation(element, defender.element);
  let raw = attacker.atk * power - defender.def * 0.5;
  const guard = defender.buffs.find((buff) => buff.kind === "def");
  if (guard) raw *= 1 - guard.value;
  if (defender.defending) raw *= 0.55;
  if (rel === "ke") raw *= 1.35;
  else if (rel === "beke") raw *= 0.78;
  else if (rel === "sheng") raw *= 0.88;
  else if (rel === "beisheng") raw *= 1.06;
  if (element === attacker.affinity) raw *= 1.12;
  raw *= 0.92 + rng() * 0.16;
  let crit = false;
  if (canCrit && rng() < 0.1) {
    raw *= 1.5;
    crit = true;
  }
  const damage = Math.max(1, Math.round(raw));
  const mpGain = rel === "sheng" ? Math.max(1, Math.round(damage * 0.22)) : 0;
  return { damage, crit, relation: rel, mpGain };
}

export function controlChance(attacker: Fighter, defender: Fighter, element: Element, base: number): number {
  let chance = base + skillStable(attacker.daoXing) - controlResist(defender.daoXing);
  const rel = relation(element, defender.element);
  if (rel === "ke") chance += 12;
  if (rel === "beke") chance -= 10;
  return clamp(Math.round(chance), 18, 95);
}

const SUFFIX = ["", "乙", "丙", "丁"];

export function rollEncounter(area: MapId, kind: "wild" | "boss", playerLevel = 1): { foes: Fighter[]; boss: boolean } {
  const table = kind === "boss" ? ENCOUNTERS.boss : ENCOUNTERS[area];
  const band = kind === "boss" ? LEVEL_BAND.boss : LEVEL_BAND[area];
  const picked = pickWeighted(table);
  const rolled = band[irand(band.length)];
  const level =
    kind === "boss"
      ? Math.max(rolled, playerLevel)
      : Math.max(1, rolled > playerLevel + 2 ? playerLevel + 2 : rolled < playerLevel - 1 ? playerLevel - 1 : rolled);
  const counts = new Map<string, number>();
  const foes = picked.foes.map((id, index) => {
    const seen = counts.get(id) ?? 0;
    counts.set(id, seen + 1);
    return makeMonster(id, level, index, SUFFIX[seen] ?? String(seen + 1));
  });
  return { foes, boss: kind === "boss" };
}

export type BattleCommand =
  | { type: "attack" }
  | { type: "skill"; skillId: string }
  | { type: "item"; itemId: ItemId }
  | { type: "catch" }
  | { type: "defend" }
  | { type: "flee" }
  | { type: "auto" }
  | { type: "target"; id: string }
  | { type: "back" }
  | { type: "ai" };

export interface CommandResult {
  battle: BattleState;
  inventory: Partial<Record<ItemId, number>>;
}

function countItem(inventory: Partial<Record<ItemId, number>>, id: ItemId): number {
  return inventory[id] ?? 0;
}

function spend(inventory: Partial<Record<ItemId, number>>, id: ItemId): Partial<Record<ItemId, number>> {
  const next = { ...inventory };
  const left = (next[id] ?? 0) - 1;
  if (left <= 0) delete next[id];
  else next[id] = left;
  return next;
}

export function openBattle(allies: Fighter[], enemies: Fighter[], area: MapId, boss: boolean): BattleState {
  const battle: BattleState = {
    allies,
    enemies,
    round: 1,
    order: [],
    cursor: 0,
    phase: "command",
    actorId: null,
    pending: null,
    log: [],
    seq: 0,
    lastHit: null,
    boss,
    area,
    rewards: null,
    notes: [],
    settled: false,
    caught: [],
    caughtEcho: { exp: 0, gold: 0, dao: 0 },
  };
  pushLog(battle, boss ? "洞底的寒气凝成了实体。" : "妖气扑面而来。");
  return advance(battle);
}

function pushLog(battle: BattleState, text: string): void {
  battle.seq += 1;
  battle.log = [...battle.log, { id: battle.seq, text }].slice(-40);
}

function flash(battle: BattleState, targetId: string, text: string): void {
  battle.seq += 1;
  battle.lastHit = { id: battle.seq, targetId, text };
}

function living(list: Fighter[]): Fighter[] {
  return list.filter((fighter) => fighter.hp > 0);
}

export function currentActor(battle: BattleState): Fighter | null {
  if (!battle.actorId) return null;
  return [...battle.allies, ...battle.enemies].find((fighter) => fighter.id === battle.actorId) ?? null;
}

function writeFighter(battle: BattleState, fighter: Fighter): void {
  if (fighter.side === "ally") {
    battle.allies = battle.allies.map((item) => (item.id === fighter.id ? fighter : item));
  } else {
    battle.enemies = battle.enemies.map((item) => (item.id === fighter.id ? fighter : item));
  }
}

function readFighter(battle: BattleState, id: string): Fighter | undefined {
  return [...battle.allies, ...battle.enemies].find((fighter) => fighter.id === id);
}

function speedOf(fighter: Fighter): number {
  return fighter.spd * (fighter.buffs.some((buff) => buff.kind === "slow") ? 0.72 : 1);
}

function buildOrder(battle: BattleState): string[] {
  return [...battle.allies, ...battle.enemies]
    .filter((fighter) => fighter.hp > 0)
    .sort((a, b) => speedOf(b) - speedOf(a) || (a.side === b.side ? 0 : a.side === "ally" ? -1 : 1))
    .map((fighter) => fighter.id);
}

function endTurn(fighter: Fighter): Fighter {
  const buffs: Buff[] = [];
  for (const buff of fighter.buffs) {
    if (buff.fresh) {
      buffs.push({ ...buff, fresh: false });
      continue;
    }
    if (buff.turns > 1) buffs.push({ ...buff, turns: buff.turns - 1 });
  }
  return { ...fighter, buffs };
}

function sealOn(fighter: Fighter): boolean {
  return fighter.buffs.some((buff) => buff.kind === "seal");
}

function frozen(fighter: Fighter): boolean {
  return fighter.buffs.some((buff) => buff.kind === "freeze");
}

function putBuff(fighter: Fighter, buff: Buff): Fighter {
  return { ...fighter, buffs: [...fighter.buffs.filter((item) => item.id !== buff.id), buff] };
}

function harm(battle: BattleState, attacker: Fighter, defender: Fighter, element: Element, power: number, label: string): { attacker: Fighter; defender: Fighter } {
  const hit = strike(attacker, defender, element, power, true);
  let nextDefender = { ...defender, hp: Math.max(0, defender.hp - hit.damage) };
  let nextAttacker = attacker;
  if (hit.mpGain > 0) {
    nextAttacker = { ...attacker, mp: Math.min(attacker.maxMp, attacker.mp + hit.mpGain) };
  }
  const rel = `${ELEMENT_NAME[element]}${hit.relation === "tong" ? "" : RELATION_SHORT[hit.relation]}`;
  const crit = hit.crit ? "，会心" : "";
  const siphon = hit.mpGain > 0 ? `，收回 ${hit.mpGain} 点法力` : "";
  pushLog(battle, `${attacker.name} 的${label}击中 ${defender.name}，造成 ${hit.damage} 点伤害（${rel}）${crit}${siphon}。`);
  flash(battle, defender.id, `${hit.crit ? "会心 " : ""}-${hit.damage}`);
  if (nextDefender.hp <= 0) pushLog(battle, `${nextDefender.name} 倒下了。`);
  return { attacker: nextAttacker, defender: nextDefender };
}

const RELATION_SHORT: Record<string, string> = {
  ke: "·相克",
  beke: "·受制",
  sheng: "·相生",
  beisheng: "·受生",
  tong: "",
};

function tryControl(battle: BattleState, attacker: Fighter, defender: Fighter, skillId: string): Fighter {
  const skill = skillById(skillId);
  if (!skill.control) return defender;
  const chance = controlChance(attacker, defender, skill.element, skill.acc);
  if (rng() * 100 > chance) {
    pushLog(battle, `${defender.name} 化开了「${skill.name}」（成功率 ${chance}%）。`);
    return defender;
  }
  const kind = skill.control;
  const name = kind === "seal" ? "封法" : kind === "freeze" ? "凝冰" : "迟缓";
  const buff: Buff = {
    id: kind,
    name,
    kind,
    turns: skill.controlTurns ?? 1,
    value: kind === "slow" ? 0.28 : 1,
    fresh: true,
  };
  pushLog(battle, `${defender.name} 陷入${name}，持续 ${buff.turns} 回合。`);
  return putBuff(defender, buff);
}

function applyDot(battle: BattleState, fighter: Fighter): Fighter {
  let next = fighter;
  for (const buff of fighter.buffs) {
    if (buff.kind !== "dot" || buff.fresh) continue;
    next = { ...next, hp: Math.max(0, next.hp - buff.value) };
    pushLog(battle, `${next.name} 被「${buff.name}」灼着，失去 ${buff.value} 点气血。`);
    flash(battle, next.id, `-${buff.value}`);
  }
  return next;
}

function playerDown(battle: BattleState): boolean {
  const player = battle.allies.find((fighter) => fighter.kind === "player");
  return !player || player.hp <= 0;
}

export function computeRewards(battle: BattleState): Rewards {
  let exp = battle.caughtEcho.exp;
  let gold = battle.caughtEcho.gold;
  let dao = battle.caughtEcho.dao;
  for (const enemy of battle.enemies) {
    if (enemy.hp > 0) continue;
    exp += enemy.exp;
    gold += enemy.gold;
    dao += 6 + enemy.level * 4;
  }
  const drops: Rewards["drops"] = [];
  if (rng() < 0.22) drops.push({ id: "pill_hp", n: 1 });
  if (rng() < 0.12) drops.push({ id: "pill_mp", n: 1 });
  if (rng() < (battle.boss ? 0.7 : 0.1)) drops.push({ id: "talisman", n: 1 });
  if (battle.boss) dao += 36;
  return { exp, gold, dao, drops, caught: battle.caught };
}

function conclude(battle: BattleState): BattleState | null {
  if (playerDown(battle)) {
    pushLog(battle, "你力竭倒地。");
    battle.phase = "defeat";
    battle.actorId = null;
    battle.pending = null;
    return battle;
  }
  if (living(battle.enemies).length === 0) {
    pushLog(battle, "一场斗法了结。");
    battle.phase = "victory";
    battle.actorId = null;
    battle.pending = null;
    battle.rewards = computeRewards(battle);
    return battle;
  }
  return null;
}

function advance(battle: BattleState): BattleState {
  for (let guard = 0; guard < 24; guard += 1) {
    const ended = conclude(battle);
    if (ended) return ended;
    if (battle.cursor >= battle.order.length) {
      battle.round += 1;
      battle.order = buildOrder(battle);
      battle.cursor = 0;
      if (battle.order.length === 0) return conclude(battle) ?? battle;
    }
    const actor = readFighter(battle, battle.order[battle.cursor]);
    if (!actor || actor.hp <= 0) {
      battle.cursor += 1;
      continue;
    }
    let started = { ...actor, defending: false, buffs: actor.buffs.map((buff) => ({ ...buff, fresh: false })) };
    started = applyDot(battle, started);
    writeFighter(battle, started);
    if (started.hp <= 0) {
      pushLog(battle, `${started.name} 倒下了。`);
      battle.cursor += 1;
      continue;
    }
    if (frozen(started)) {
      pushLog(battle, `${started.name} 被寒气封住，这个回合动不了。`);
      writeFighter(battle, endTurn(started));
      battle.cursor += 1;
      continue;
    }
    battle.actorId = started.id;
    battle.pending = null;
    battle.phase = started.kind === "monster" ? "ai" : "command";
    return battle;
  }
  return battle;
}

function afterAction(battle: BattleState, actor: Fighter): BattleState {
  writeFighter(battle, endTurn(actor));
  battle.cursor += 1;
  battle.pending = null;
  return advance(battle);
}

function friendsOf(battle: BattleState, actor: Fighter): Fighter[] {
  return living(actor.side === "ally" ? battle.allies : battle.enemies);
}

function foesOf(battle: BattleState, actor: Fighter): Fighter[] {
  return living(actor.side === "ally" ? battle.enemies : battle.allies);
}

function targetsFor(battle: BattleState, actor: Fighter, pending: PendingAction): Fighter[] {
  if (pending.kind === "attack") return foesOf(battle, actor);
  if (pending.kind === "catch") return living(battle.enemies).filter((fighter) => fighter.catchable);
  if (pending.kind === "item") return living(battle.allies);
  const skill = skillById(pending.skillId ?? "");
  if (skill.target === "self") return [actor];
  if (skill.target === "ally") return friendsOf(battle, actor);
  return foesOf(battle, actor);
}

function beginPending(battle: BattleState, actor: Fighter, pending: PendingAction, inventory: Partial<Record<ItemId, number>>): CommandResult {
  if (pending.kind === "skill") {
    const skill = skillById(pending.skillId ?? "");
    if (sealOn(actor)) {
      pushLog(battle, `${actor.name} 被封住法术，只能普攻、吃药或防御。`);
      return { battle, inventory };
    }
    if (actor.mp < skill.mp) {
      pushLog(battle, "法力不够。");
      return { battle, inventory };
    }
    if (skill.target === "all-enemies" || skill.target === "self") {
      const fallback = skill.target === "self" ? actor.id : (foesOf(battle, actor)[0]?.id ?? "");
      return resolvePending(battle, actor, pending, fallback, inventory);
    }
  }
  if (pending.kind === "item" && countItem(inventory, pending.itemId ?? "pill_hp") <= 0) {
    pushLog(battle, "行囊里没有这样东西。");
    return { battle, inventory };
  }
  if (pending.kind === "catch" && countItem(inventory, "talisman") <= 0) {
    pushLog(battle, "没有契灵符。");
    return { battle, inventory };
  }
  const options = targetsFor(battle, actor, pending);
  if (options.length === 0) {
    pushLog(battle, "没有合适的目标。");
    return { battle, inventory };
  }
  if (options.length === 1) {
    return resolvePending(battle, actor, pending, options[0].id, inventory);
  }
  battle.phase = "target";
  battle.pending = pending;
  return { battle, inventory };
}

function resolvePending(
  battle: BattleState,
  actor: Fighter,
  pending: PendingAction,
  targetId: string,
  inventory: Partial<Record<ItemId, number>>,
): CommandResult {
  const target = readFighter(battle, targetId);
  if (!target || target.hp <= 0) {
    pushLog(battle, "目标已经不在场上。");
    battle.phase = "command";
    battle.pending = null;
    return { battle, inventory };
  }
  if (pending.kind === "attack") {
    const hit = harm(battle, actor, target, actor.affinity, 1, `普通攻击（${ELEMENT_NAME[actor.affinity]}）`);
    writeFighter(battle, hit.attacker);
    writeFighter(battle, hit.defender);
    return { battle: afterAction(battle, hit.attacker), inventory };
  }
  if (pending.kind === "skill") {
    const skill = skillById(pending.skillId ?? "");
    let nextActor = { ...actor, mp: actor.mp - skill.mp };
    if (skill.kind === "heal") {
      const amount = Math.round(skill.flat + nextActor.atk * skill.power + (skill.element === nextActor.affinity ? 4 : 0));
      const healed = { ...target, hp: Math.min(target.maxHp, target.hp + amount) };
      writeFighter(battle, nextActor);
      writeFighter(battle, healed);
      pushLog(battle, `${nextActor.name} 施展「${skill.name}」，为 ${healed.name} 恢复 ${amount} 点气血。`);
      flash(battle, healed.id, `+${amount}`);
      return { battle: afterAction(battle, nextActor), inventory };
    }
    if (skill.kind === "buff" && skill.buffKind) {
      const buffed = putBuff(target, {
        id: skill.id,
        name: skill.name,
        kind: "def",
        turns: skill.buffTurns ?? 3,
        value: skill.buffValue ?? 0.3,
        fresh: true,
      });
      writeFighter(battle, nextActor.id === buffed.id ? { ...buffed, mp: nextActor.mp } : nextActor);
      if (nextActor.id !== buffed.id) writeFighter(battle, buffed);
      else nextActor = { ...buffed, mp: nextActor.mp };
      pushLog(battle, `${nextActor.name} 催动「${skill.name}」，防御升起。`);
      return { battle: afterAction(battle, nextActor), inventory };
    }
    if (skill.target === "all-enemies") {
      let attacker = nextActor;
      for (const enemy of foesOf(battle, nextActor)) {
        const hit = harm(battle, attacker, enemy, skill.element, skill.power, `「${skill.name}」`);
        attacker = hit.attacker;
        writeFighter(battle, hit.defender);
      }
      writeFighter(battle, attacker);
      return { battle: afterAction(battle, attacker), inventory };
    }
    const hit = harm(battle, nextActor, target, skill.element, Math.max(0.2, skill.power), `「${skill.name}」`);
    let defender = hit.defender;
    if (skill.control && defender.hp > 0) defender = tryControl(battle, hit.attacker, defender, skill.id);
    if (skill.dot && defender.hp > 0) {
      const dot = Math.max(2, Math.round(hit.attacker.atk * skill.dot));
      defender = putBuff(defender, {
        id: "dot:" + skill.id,
        name: skill.name,
        kind: "dot",
        turns: skill.dotTurns ?? 2,
        value: dot,
        fresh: true,
      });
      pushLog(battle, `${defender.name} 被附上「${skill.name}」。`);
    }
    writeFighter(battle, hit.attacker);
    writeFighter(battle, defender);
    return { battle: afterAction(battle, hit.attacker), inventory };
  }
  if (pending.kind === "item") {
    const itemId = pending.itemId ?? "pill_hp";
    if (countItem(inventory, itemId) <= 0) {
      pushLog(battle, "东西不够了。");
      battle.phase = "command";
      return { battle, inventory };
    }
    const nextInv = spend(inventory, itemId);
    let healed = target;
    if (itemId === "pill_hp") {
      const amount = pillHeal(target.maxHp);
      healed = { ...target, hp: Math.min(target.maxHp, target.hp + amount) };
      pushLog(battle, `${target.name} 服下回灵丹，恢复 ${amount} 点气血。`);
      flash(battle, target.id, `+${amount}`);
    } else if (itemId === "pill_mp") {
      const amount = pillMana(target.maxMp);
      healed = { ...target, mp: Math.min(target.maxMp, target.mp + amount) };
      pushLog(battle, `${target.name} 服下聚气散，恢复 ${amount} 点法力。`);
      flash(battle, target.id, `法力 +${amount}`);
    } else {
      pushLog(battle, "这件东西现在用不了。");
      battle.phase = "command";
      return { battle, inventory };
    }
    writeFighter(battle, healed);
    const actorNow = readFighter(battle, actor.id) ?? actor;
    return { battle: afterAction(battle, actorNow), inventory: nextInv };
  }
  if (pending.kind === "catch") {
    if (countItem(inventory, "talisman") <= 0) {
      pushLog(battle, "没有契灵符。");
      battle.phase = "command";
      return { battle, inventory };
    }
    const nextInv = spend(inventory, "talisman");
    if (!target.catchable || !target.speciesId) {
      pushLog(battle, `${target.name} 野性太重，符纸没有反应。`);
      return { battle: afterAction(battle, actor), inventory: nextInv };
    }
    const spec = SPECIES[target.speciesId];
    const speciesId = spec.catchAs;
    if (!speciesId) {
      pushLog(battle, `${target.name} 不能结契。`);
      return { battle: afterAction(battle, actor), inventory: nextInv };
    }
    const ratio = target.hp / target.maxHp;
    let chance = 58 - ratio * 46 + Math.min(12, Math.floor(actor.daoXing / 40)) - Math.max(0, target.level - actor.level) * 3;
    chance = clamp(chance, 8, 90);
    if (rng() * 100 > chance) {
      pushLog(battle, `契灵失败（约 ${Math.round(chance)}%），符纸烧成了灰。`);
      return { battle: afterAction(battle, actor), inventory: nextInv };
    }
    const caught: CaughtPet = { speciesId, level: Math.max(1, Math.min(target.level, actor.level)) };
    battle.caught = [...battle.caught, caught];
    battle.caughtEcho = {
      exp: battle.caughtEcho.exp + Math.round(target.exp * 0.5),
      gold: battle.caughtEcho.gold + Math.round(target.gold * 0.5),
      dao: battle.caughtEcho.dao + Math.round((6 + target.level * 4) * 0.5),
    };
    battle.enemies = battle.enemies.filter((enemy) => enemy.id !== target.id);
    pushLog(battle, `符纸亮起，${spec.petName ?? target.name} 愿意同行。`);
    return { battle: afterAction(battle, actor), inventory: nextInv };
  }
  return { battle, inventory };
}

export function act(battle: BattleState, command: BattleCommand, inventory: Partial<Record<ItemId, number>>): CommandResult {
  if (battle.phase === "victory" || battle.phase === "defeat" || battle.phase === "fled") {
    return { battle, inventory };
  }
  const draft = structuredClone(battle);
  const actor = currentActor(draft);
  if (!actor || actor.hp <= 0) return { battle: advance(draft), inventory };

  if (command.type === "back") {
    draft.phase = "command";
    draft.pending = null;
    return { battle: draft, inventory };
  }
  if (command.type === "target") {
    if (!draft.pending) return { battle: draft, inventory };
    return resolvePending(draft, actor, draft.pending, command.id, inventory);
  }
  if (draft.phase === "target") {
    pushLog(draft, "先选择目标，或返回。");
    return { battle: draft, inventory };
  }
  if (command.type === "ai" || command.type === "auto") {
    return takeAi(draft, inventory);
  }
  if (command.type === "defend") {
    const guarding = { ...actor, defending: true };
    pushLog(draft, `${actor.name} 沉气防守。`);
    writeFighter(draft, guarding);
    return { battle: afterAction(draft, guarding), inventory };
  }
  if (command.type === "flee") {
    if (draft.boss) {
      pushLog(draft, "霜气锁死了退路。");
      return { battle: afterAction(draft, actor), inventory };
    }
    const enemies = living(draft.enemies);
    const avg = enemies.reduce((sum, foe) => sum + foe.spd, 0) / Math.max(1, enemies.length);
    const chance = clamp(52 + (actor.spd - avg) * 3, 18, 90);
    if (rng() * 100 < chance) {
      pushLog(draft, "你撕开妖气，退了出来。");
      draft.phase = "fled";
      draft.actorId = null;
      return { battle: draft, inventory };
    }
    pushLog(draft, "没能脱身。");
    return { battle: afterAction(draft, actor), inventory };
  }
  if (command.type === "attack") return beginPending(draft, actor, { kind: "attack" }, inventory);
  if (command.type === "catch") return beginPending(draft, actor, { kind: "catch" }, inventory);
  if (command.type === "item") return beginPending(draft, actor, { kind: "item", itemId: command.itemId }, inventory);
  if (command.type === "skill") return beginPending(draft, actor, { kind: "skill", skillId: command.skillId }, inventory);
  return { battle: draft, inventory };
}

function scoreSkill(attacker: Fighter, skillId: string, foes: Fighter[]): number {
  const skill = skillById(skillId);
  if (attacker.mp < skill.mp) return -1;
  if (skill.kind === "heal") return attacker.hp < attacker.maxHp * 0.55 ? 50 + (attacker.maxHp - attacker.hp) : 0;
  if (skill.kind === "buff") return attacker.buffs.some((buff) => buff.kind === "def") ? 0 : 28;
  const target = foes[0];
  if (!target) return 0;
  const rel = relation(skill.element, target.element);
  const relScore = rel === "ke" ? 20 : rel === "beke" ? -8 : rel === "sheng" ? 4 : 0;
  return skill.power * 20 + relScore + (skill.target === "all-enemies" && foes.length > 1 ? 12 : 0);
}

export function takeAi(battle: BattleState, inventory: Partial<Record<ItemId, number>>): CommandResult {
  const actor = currentActor(battle);
  if (!actor) return { battle, inventory };
  const foes = actor.side === "ally" ? living(battle.enemies) : living(battle.allies);
  const heal = actor.skills
    .map((id) => skillById(id))
    .find((skill) => skill.kind === "heal" && actor.mp >= skill.mp);
  if (heal && actor.hp < actor.maxHp * 0.45 && rng() < 0.8) {
    const wounded = [...(actor.side === "ally" ? battle.allies : battle.enemies)]
      .filter((fighter) => fighter.hp > 0)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    const first = act(battle, { type: "skill", skillId: heal.id }, inventory);
    if (first.battle.phase === "target") {
      return act(first.battle, { type: "target", id: (wounded ?? actor).id }, first.inventory);
    }
    return first;
  }
  if (actor.kind !== "monster" && actor.hp < actor.maxHp * 0.3 && countItem(inventory, "pill_hp") > 0 && rng() < 0.65) {
    const first = act(battle, { type: "item", itemId: "pill_hp" }, inventory);
    if (first.battle.phase === "target") return act(first.battle, { type: "target", id: actor.id }, first.inventory);
    return first;
  }
  let bestId = "";
  let best = 0;
  if (!sealOn(actor)) {
    for (const id of actor.skills) {
      const score = scoreSkill(actor, id, foes);
      if (score > best) {
        best = score;
        bestId = id;
      }
    }
  }
  if (bestId && best >= 12) {
    const first = act(battle, { type: "skill", skillId: bestId }, inventory);
    if (first.battle.phase === "target") {
      const soft = [...foes].sort((a, b) => a.hp - b.hp)[0];
      return act(first.battle, { type: "target", id: soft.id }, first.inventory);
    }
    return first;
  }
  const first = act(battle, { type: "attack" }, inventory);
  if (first.battle.phase === "target") {
    const soft = [...foes].sort((a, b) => a.hp - b.hp)[0];
    return act(first.battle, { type: "target", id: soft.id }, first.inventory);
  }
  return first;
}

export function catchPreview(actor: Fighter, target: Fighter): number | null {
  if (!target.catchable || target.hp <= 0) return null;
  const ratio = target.hp / target.maxHp;
  const chance = 58 - ratio * 46 + Math.min(12, Math.floor(actor.daoXing / 40)) - Math.max(0, target.level - actor.level) * 3;
  return clamp(Math.round(chance), 8, 90);
}

export function validTargetIds(battle: BattleState): string[] {
  const actor = currentActor(battle);
  if (!actor || !battle.pending) return [];
  return targetsFor(battle, actor, battle.pending).map((fighter) => fighter.id);
}
