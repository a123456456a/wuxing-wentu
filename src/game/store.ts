import { playCue } from "./audio.js";
import { act, openBattle, rollEncounter, type BattleCommand } from "./combat.js";
import {
  ITEMS,
  MAPS,
  PETS,
  knownPetSkills,
  knownSchoolSkills,
  schoolById,
} from "./data.js";
import type { Element } from "./elements.js";
import { expToNext } from "./format.js";
import { findPath, isSolid, tileChar, type Point } from "./path.js";
import { loadMuted, loadSave, writeMuted, writeSave } from "./save.js";
import { makePetFighter, makePlayerFighter, petDerived, playerDerived, pillHeal, pillMana } from "./stats.js";
import type {
  BattleState,
  ItemId,
  MapId,
  Pet,
  Player,
  SaveData,
  SchoolId,
  SpeciesId,
} from "./types.js";

export type PanelId = "char" | "bag" | "pet" | "map" | "shop" | "lodge" | "help";

export interface Dialog {
  speaker: string;
  lines: string[];
  index: number;
  choices?: { id: string; label: string }[];
}

export interface GameState {
  phase: "title" | "create" | "world" | "battle";
  player: Player | null;
  mapId: MapId;
  x: number;
  y: number;
  gold: number;
  inventory: Partial<Record<ItemId, number>>;
  weaponId: ItemId | null;
  armorId: ItemId | null;
  pets: Pet[];
  activePetId: string | null;
  flags: { tutorial: boolean; bossCleared: boolean };
  defeatedWisps: string[];
  battle: BattleState | null;
  dialog: Dialog | null;
  panel: PanelId | null;
  toast: string | null;
  path: Point[];
  cooldown: number;
  moveLock: number;
  muted: boolean;
  hasSave: boolean;
  continueName: string;
}

const peeked = loadSave();

let state: GameState = {
  phase: "title",
  player: null,
  mapId: "qingshi",
  x: 6,
  y: 8,
  gold: 0,
  inventory: {},
  weaponId: null,
  armorId: null,
  pets: [],
  activePetId: null,
  flags: { tutorial: false, bossCleared: false },
  defeatedWisps: [],
  battle: null,
  dialog: null,
  panel: null,
  toast: null,
  path: [],
  cooldown: 0,
  moveLock: 0,
  muted: loadMuted(),
  hasSave: Boolean(peeked),
  continueName: peeked?.player.name ?? "",
};

const listeners = new Set<() => void>();

export function getState(): GameState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function set(next: GameState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function patch(partial: Partial<GameState>, tone?: "click" | "hit" | "heal" | "win" | "lose" | "encounter"): void {
  const next = { ...state, ...partial };
  if (tone) playCue(tone, next.muted);
  set(next);
}

function toast(message: string, tone?: "click" | "heal" | "win" | "lose" | "encounter"): void {
  patch({ toast: message }, tone ?? "click");
}

function snapshot(current: GameState): SaveData | null {
  if (!current.player) return null;
  return {
    version: 1,
    player: current.player,
    mapId: current.mapId,
    x: current.x,
    y: current.y,
    gold: current.gold,
    inventory: current.inventory,
    weaponId: current.weaponId,
    armorId: current.armorId,
    pets: current.pets,
    activePetId: current.activePetId,
    flags: current.flags,
    defeatedWisps: current.defeatedWisps,
  };
}

function persist(current: GameState): GameState {
  const data = snapshot(current);
  if (!data) return current;
  const ok = writeSave(data);
  return {
    ...current,
    hasSave: ok || current.hasSave,
    continueName: current.player?.name ?? current.continueName,
    toast: ok ? current.toast : "存档失败，浏览器可能禁止了本地存储。",
  };
}

function createPet(speciesId: SpeciesId, level: number): Pet {
  const spec = PETS[speciesId];
  const draft: Pet = {
    id: "pet-" + Math.random().toString(36).slice(2, 8),
    speciesId,
    name: spec.name,
    element: spec.element,
    level,
    exp: 0,
    hp: 1,
    mp: 1,
  };
  const stats = petDerived(draft);
  return { ...draft, hp: stats.maxHp, mp: stats.maxMp };
}

function gainLevels(level: number, exp: number, amount: number): { level: number; exp: number; ups: number[] } {
  let nextLevel = level;
  let nextExp = exp + amount;
  const ups: number[] = [];
  while (nextExp >= expToNext(nextLevel) && nextLevel < 30) {
    nextExp -= expToNext(nextLevel);
    nextLevel += 1;
    ups.push(nextLevel);
  }
  return { level: nextLevel, exp: nextExp, ups };
}

function restoreAll(current: GameState): GameState {
  if (!current.player) return current;
  const stats = playerDerived(current.player, current.weaponId, current.armorId);
  return {
    ...current,
    player: { ...current.player, hp: stats.maxHp, mp: stats.maxMp },
    pets: current.pets.map((pet) => {
      const derived = petDerived(pet);
      return { ...pet, hp: derived.maxHp, mp: derived.maxMp };
    }),
  };
}

function elderDialog(): Dialog {
  return {
    speaker: "村口老樵",
    lines: [
      "年轻人，山外的五行不是口诀，是打出去的手感。",
      "金克木，木克土，土克水，水克火，火克金。克得住，这一击就更重，封禁也更容易中。",
      "反过来金生水、水生木、木生火、火生土、土生金。相生会泄掉一点锋芒，但能收回少许法力。",
      "门派决定你学什么法术，亲和决定普攻的五行，也让同属性法术更稳。",
      "灵兽苑可以领一只同伴。落霞野、忘机林里的幼兽，气血越低越容易用契灵符结契。",
      "打赢就有道行。道行深了，法术更不容易落空，你也更难被冻住或封招。",
    ],
    index: 0,
  };
}

function applyOutcome(current: GameState): GameState {
  const battle = current.battle;
  const player = current.player;
  if (!battle || !player || battle.settled) return current;
  if (battle.phase === "fled") {
    const playerF = battle.allies.find((fighter) => fighter.kind === "player");
    const petF = battle.allies.find((fighter) => fighter.kind === "pet");
    const stats = playerDerived(player, current.weaponId, current.armorId);
    return {
      ...current,
      cooldown: 3,
      path: [],
      player: {
        ...player,
        hp: Math.max(1, Math.min(stats.maxHp, playerF?.hp ?? player.hp)),
        mp: Math.max(0, Math.min(stats.maxMp, playerF?.mp ?? player.mp)),
      },
      pets: current.pets.map((pet) => {
        if (pet.id !== current.activePetId || !petF) return pet;
        const derived = petDerived(pet);
        return {
          ...pet,
          hp: Math.max(0, Math.min(derived.maxHp, petF.hp)),
          mp: Math.max(0, Math.min(derived.maxMp, petF.mp)),
        };
      }),
      battle: { ...battle, settled: true, notes: ["你从妖气里退了出来。"] },
    };
  }

  let next: GameState = { ...current, pets: current.pets.map((pet) => ({ ...pet })), inventory: { ...current.inventory } };
  const stats = playerDerived(player, next.weaponId, next.armorId);
  const playerF = battle.allies.find((fighter) => fighter.kind === "player");
  const petF = battle.allies.find((fighter) => fighter.kind === "pet");
  let updated: Player = {
    ...player,
    hp: Math.max(0, Math.min(stats.maxHp, playerF?.hp ?? 0)),
    mp: Math.max(0, Math.min(stats.maxMp, playerF?.mp ?? 0)),
  };
  next.pets = next.pets.map((pet) => {
    if (pet.id !== next.activePetId || !petF) return pet;
    const derived = petDerived(pet);
    return {
      ...pet,
      hp: Math.max(0, Math.min(derived.maxHp, petF.hp)),
      mp: Math.max(0, Math.min(derived.maxMp, petF.mp)),
    };
  });
  const notes = [...battle.notes];

  if (battle.phase === "defeat") {
    updated = {
      ...updated,
      hp: Math.max(1, Math.floor(stats.maxHp * 0.35)),
      mp: Math.max(0, Math.floor(stats.maxMp * 0.25)),
    };
    next = {
      ...next,
      player: updated,
      gold: Math.floor(next.gold * 0.9),
      mapId: "qingshi",
      x: 6,
      y: 8,
      path: [],
      cooldown: 2,
      pets: next.pets.map((pet) => {
        const derived = petDerived(pet);
        return { ...pet, hp: Math.max(1, Math.floor(derived.maxHp * 0.4)), mp: Math.max(0, Math.floor(derived.maxMp * 0.3)) };
      }),
      battle: { ...battle, settled: true, notes: ["你在客栈醒来，钱袋轻了一成。"] },
    };
    return next;
  }

  const rewards = battle.rewards;
  if (!rewards) {
    next.player = updated;
    next.battle = { ...battle, settled: true };
    return next;
  }
  updated = { ...updated, daoXing: updated.daoXing + rewards.dao };
  next.gold += rewards.gold;
  const leveled = gainLevels(updated.level, updated.exp, rewards.exp);
  updated = { ...updated, level: leveled.level, exp: leveled.exp };
  if (leveled.ups.length > 0) {
    const grown = playerDerived(updated, next.weaponId, next.armorId);
    updated = { ...updated, hp: grown.maxHp, mp: grown.maxMp };
    notes.push(`${updated.name} 突破到 ${leveled.level} 级 · ${leveled.ups.map((lv) => lv).join("、")}`);
  }
  next.pets = next.pets.map((pet) => {
    const gained = gainLevels(pet.level, pet.exp, rewards.exp);
    let nextPet = { ...pet, level: gained.level, exp: gained.exp };
    if (gained.ups.length > 0) {
      const derived = petDerived(nextPet);
      nextPet = { ...nextPet, hp: derived.maxHp, mp: derived.maxMp };
      notes.push(`${nextPet.name} 升到 ${nextPet.level} 级。`);
    } else if (nextPet.hp <= 0) {
      const derived = petDerived(nextPet);
      nextPet = { ...nextPet, hp: Math.max(1, Math.floor(derived.maxHp * 0.3)) };
      notes.push(`${nextPet.name} 勉强站了起来。`);
    }
    return nextPet;
  });
  for (const drop of rewards.drops) {
    next.inventory[drop.id] = (next.inventory[drop.id] ?? 0) + drop.n;
    notes.push(`拾到 ${ITEMS[drop.id].name}。`);
  }
  for (const caught of rewards.caught) {
    if (next.pets.some((pet) => pet.speciesId === caught.speciesId)) {
      next.gold += 36;
      notes.push(`${PETS[caught.speciesId].name} 与已有同伴共鸣，化作 36 文。`);
      continue;
    }
    const pet = createPet(caught.speciesId, caught.level);
    next.pets = [...next.pets, pet];
    if (!next.activePetId) next.activePetId = pet.id;
    notes.push(`${pet.name} 决定同行。`);
  }
  if (battle.boss && !next.flags.bossCleared) {
    next.flags = { ...next.flags, bossCleared: true };
    updated = { ...updated, daoXing: updated.daoXing + 80 };
    next.gold += 200;
    if (next.armorId !== "armor_3" && !next.inventory.armor_3) {
      next.inventory.armor_3 = 1;
      notes.push("首次镇住霜嵴君，道行大涨，并得到玄霜甲。");
    } else {
      notes.push("首次镇住霜嵴君，道行与金钱都有进账。");
    }
  }
  notes.unshift(`修为 +${rewards.exp}，金钱 +${rewards.gold}，道行 +${rewards.dao + (battle.boss && notes.some((line) => line.includes("霜嵴君")) ? 80 : 0)}日。`);
  next.player = updated;
  next.cooldown = 4;
  next.path = [];
  next.battle = { ...battle, settled: true, notes };
  return next;
}

function startBattle(current: GameState, kind: "wild" | "boss"): GameState {
  if (!current.player) return current;
  const rolled = rollEncounter(current.mapId, kind, current.player.level);
  const skills = knownSchoolSkills(current.player.schoolId, current.player.level);
  const allies = [makePlayerFighter(current.player, current.weaponId, current.armorId, skills)];
  const pet = current.pets.find((item) => item.id === current.activePetId);
  if (pet && pet.hp > 0) allies.push(makePetFighter(pet, knownPetSkills(pet.speciesId, pet.level)));
  const battle = openBattle(allies, rolled.foes, current.mapId, rolled.boss);
  return {
    ...current,
    phase: "battle",
    battle,
    dialog: null,
    panel: null,
    path: [],
    toast: pet && pet.hp <= 0 ? "灵兽昏迷，没能上场。" : current.toast,
  };
}

function interact(current: GameState): GameState {
  const map = MAPS[current.mapId];
  const ch = tileChar(map.rows, current.x, current.y);
  const wispKey = `${current.mapId}:${current.x}:${current.y}`;
  const wisp = map.wisps.find((item) => item.x === current.x && item.y === current.y);
  if (wisp && !current.defeatedWisps.includes(wispKey)) {
    const next = startBattle({ ...current, defeatedWisps: [...current.defeatedWisps, wispKey], cooldown: 3 }, "wild");
    playCue("encounter", next.muted);
    return next;
  }
  const exit = map.exits.find((item) => item.x === current.x && item.y === current.y);
  if (exit) {
    if (exit.to === "cave" && current.player && current.player.level < 6) {
      return {
        ...current,
        path: [],
        dialog: {
          speaker: "洞口寒气",
          lines: ["玄霜洞里的妖物比落霞野凶得多。不到 6 级就进去，多半会被抬回村里。"],
          index: 0,
          choices: [
            { id: "enter-cave", label: "还是进去" },
            { id: "close", label: "先回去修炼" },
          ],
        },
      };
    }
    const destination = MAPS[exit.to];
    const next: GameState = {
      ...current,
      mapId: exit.to,
      x: exit.sx,
      y: exit.sy,
      path: [],
      cooldown: 1,
      defeatedWisps: current.defeatedWisps.filter((key) => !key.startsWith(exit.to + ":")),
      toast: `进入${destination.name}`,
    };
    playCue("click", next.muted);
    return persist(next);
  }
  if (ch === "B") {
    if (current.cooldown > 0) return { ...current, cooldown: current.cooldown - 1 };
    const next = startBattle({ ...current, cooldown: 4 }, "boss");
    playCue("encounter", next.muted);
    return next;
  }
  if (ch === "H") {
    return {
      ...current,
      panel: null,
      path: [],
      dialog: {
        speaker: "客栈掌柜",
        lines: ["热汤还在锅里。住一宿十文，你和灵兽都能缓过来。钱不够的话，先喝一碗也行。"],
        index: 0,
        choices: [
          { id: "rest", label: "住一宿" },
          { id: "close", label: "再逛逛" },
        ],
      },
    };
  }
  if (ch === "S") return { ...current, dialog: null, panel: "shop", path: [] };
  if (ch === "L") return { ...current, dialog: null, panel: "lodge", path: [] };
  if (ch === "n") return { ...current, panel: null, path: [], dialog: elderDialog() };
  if (ch === "q") {
    return {
      ...current,
      panel: null,
      path: [],
      dialog: {
        speaker: "忘机泉",
        lines: ["泉眼很安静。饮一口，气血和法力都会回来。"],
        index: 0,
        choices: [
          { id: "spring", label: "饮泉" },
          { id: "close", label: "离开" },
        ],
      },
    };
  }
  if (ch === "," && map.encounter > 0) {
    if (current.cooldown > 0) return { ...current, cooldown: current.cooldown - 1 };
    if (Math.random() < map.encounter) {
      const next = startBattle({ ...current, cooldown: 3 }, "wild");
      playCue("encounter", next.muted);
      return next;
    }
  } else if (current.cooldown > 0) {
    return { ...current, cooldown: current.cooldown - 1 };
  }
  return current;
}

function moveTo(current: GameState, x: number, y: number): GameState {
  const map = MAPS[current.mapId];
  if (isSolid(map.rows, x, y)) return current;
  return interact({ ...current, x, y, moveLock: Date.now() + 120 });
}

export const api = {
  openCreate() {
    patch({ phase: "create", toast: null }, "click");
  },
  newGame(name: string, schoolId: SchoolId, affinity: Element) {
    const trimmed = name.trim();
    if (!trimmed) {
      toast("先起一个名号。");
      return;
    }
    if ([...trimmed].length > 8) {
      toast("名号最多八个字。");
      return;
    }
    const stats = playerDerived(
      { name: trimmed, schoolId, affinity, level: 1, exp: 0, hp: 1, mp: 1, daoXing: 0 },
      null,
      "armor_1",
    );
    const player: Player = {
      name: trimmed,
      schoolId,
      affinity,
      level: 1,
      exp: 0,
      hp: stats.maxHp,
      mp: stats.maxMp,
      daoXing: 0,
    };
    let next: GameState = {
      ...state,
      phase: "world",
      player,
      mapId: "qingshi",
      x: 6,
      y: 8,
      gold: 60,
      inventory: { pill_hp: 3, pill_mp: 1, talisman: 1 },
      weaponId: null,
      armorId: "armor_1",
      pets: [],
      activePetId: null,
      flags: { tutorial: true, bossCleared: false },
      defeatedWisps: [],
      battle: null,
      panel: null,
      path: [],
      cooldown: 0,
      dialog: elderDialog(),
      toast: `${schoolById(schoolId).name} · ${trimmed}`,
    };
    next = persist(next);
    playCue("click", next.muted);
    set(next);
  },
  continueGame() {
    const saved = loadSave();
    if (!saved) {
      toast("没有找到存档。");
      return;
    }
    set({
      ...state,
      phase: "world",
      player: saved.player,
      mapId: saved.mapId,
      x: saved.x,
      y: saved.y,
      gold: saved.gold,
      inventory: saved.inventory,
      weaponId: saved.weaponId,
      armorId: saved.armorId,
      pets: saved.pets,
      activePetId: saved.activePetId,
      flags: saved.flags,
      defeatedWisps: saved.defeatedWisps,
      battle: null,
      dialog: null,
      panel: null,
      path: [],
      cooldown: 1,
      toast: `欢迎回来，${saved.player.name}`,
      hasSave: true,
      continueName: saved.player.name,
    });
    playCue("click", state.muted);
  },
  toTitle() {
    const saved = loadSave();
    patch({
      phase: "title",
      battle: null,
      dialog: null,
      panel: null,
      path: [],
      toast: null,
      hasSave: Boolean(saved),
      continueName: saved?.player.name ?? state.continueName,
    });
  },
  tryStep(dx: number, dy: number) {
    if (state.phase !== "world" || state.dialog || state.panel || state.battle) return;
    if (Date.now() < state.moveLock) return;
    const map = MAPS[state.mapId];
    const x = state.x + dx;
    const y = state.y + dy;
    if (isSolid(map.rows, x, y)) return;
    set(moveTo({ ...state, path: [] }, x, y));
  },
  stepExact(x: number, y: number): boolean {
    if (state.phase !== "world" || state.dialog || state.panel || state.battle) return true;
    if (Math.abs(state.x - x) + Math.abs(state.y - y) !== 1) return true;
    const before = state.panel || state.dialog || state.battle || state.mapId;
    const next = moveTo(state, x, y);
    set(next);
    return Boolean(next.panel || next.dialog || next.battle || next.mapId !== before);
  },
  setPath(path: Point[]) {
    if (state.path === path) return;
    patch({ path });
  },
  walkTo(x: number, y: number) {
    if (state.phase !== "world" || state.dialog || state.panel || state.battle || !state.player) return;
    const path = findPath(MAPS[state.mapId].rows, { x: state.x, y: state.y }, { x, y });
    if (!path) {
      toast("那边过不去。");
      return;
    }
    patch({ path });
  },
  advanceDialog() {
    const dialog = state.dialog;
    if (!dialog) return;
    if (dialog.index < dialog.lines.length - 1) {
      patch({ dialog: { ...dialog, index: dialog.index + 1 } }, "click");
      return;
    }
    if (dialog.choices && dialog.choices.length > 0) return;
    patch({ dialog: null }, "click");
  },
  chooseDialog(id: string) {
    if (id === "close") {
      patch({ dialog: null }, "click");
      return;
    }
    if (id === "enter-cave") {
      const destination = MAPS.cave;
      const next = persist({
        ...state,
        dialog: null,
        path: [],
        mapId: "cave",
        x: 10,
        y: 2,
        cooldown: 1,
        defeatedWisps: state.defeatedWisps.filter((key) => !key.startsWith("cave:")),
        toast: `进入${destination.name}`,
      });
      playCue("click", next.muted);
      set(next);
      return;
    }
    if (id === "rest" || id === "spring") {
      let next = restoreAll(state);
      if (id === "rest") {
        if (next.gold >= 10) {
          next = { ...next, gold: next.gold - 10, toast: "睡了一宿，十文已付。" };
        } else {
          next = { ...next, toast: "掌柜摆摆手，这碗汤不要钱。" };
        }
      } else {
        next = { ...next, toast: "泉水冰凉，精神回来了。" };
      }
      next = { ...next, dialog: null };
      playCue("heal", next.muted);
      set(persist(next));
    }
  },
  openPanel(panel: PanelId) {
    if (state.phase !== "world") return;
    patch({ panel, dialog: null, path: [] }, "click");
  },
  closePanel() {
    patch({ panel: null }, "click");
  },
  buy(id: ItemId) {
    const item = ITEMS[id];
    if (!state.player) return;
    if (state.player.level < item.level) {
      toast(`需要 ${item.level} 级。`);
      return;
    }
    if (state.gold < item.price) {
      toast("金钱不够。");
      return;
    }
    const inventory = { ...state.inventory, [id]: (state.inventory[id] ?? 0) + 1 };
    const next = persist({ ...state, gold: state.gold - item.price, inventory, toast: `购入${item.name}。` });
    playCue("click", next.muted);
    set(next);
  },
  sell(id: ItemId) {
    const have = state.inventory[id] ?? 0;
    if (have <= 0) return;
    const item = ITEMS[id];
    const inventory = { ...state.inventory };
    if (have === 1) delete inventory[id];
    else inventory[id] = have - 1;
    const gain = Math.max(1, Math.floor(item.price / 2));
    const next = persist({ ...state, inventory, gold: state.gold + gain, toast: `卖出${item.name}，得 ${gain} 文。` });
    set(next);
  },
  equip(id: ItemId) {
    if (!state.player) return;
    const item = ITEMS[id];
    if (item.kind !== "weapon" && item.kind !== "armor") return;
    if ((state.inventory[id] ?? 0) <= 0) return;
    if (state.player.level < item.level) {
      toast(`需要 ${item.level} 级才能装备。`);
      return;
    }
    const inventory = { ...state.inventory };
    const left = (inventory[id] ?? 0) - 1;
    if (left <= 0) delete inventory[id];
    else inventory[id] = left;
    const previous = item.kind === "weapon" ? state.weaponId : state.armorId;
    if (previous) inventory[previous] = (inventory[previous] ?? 0) + 1;
    let player = state.player;
    if (item.kind === "armor") {
      const oldMax = playerDerived(player, state.weaponId, state.armorId).maxHp;
      const newMax = playerDerived(player, state.weaponId, id).maxHp;
      player = { ...player, hp: Math.min(newMax, player.hp + Math.max(0, newMax - oldMax)) };
    }
    const next = persist({
      ...state,
      player,
      inventory,
      weaponId: item.kind === "weapon" ? id : state.weaponId,
      armorId: item.kind === "armor" ? id : state.armorId,
      toast: `装备了${item.name}。`,
    });
    set(next);
  },
  unequip(slot: "weapon" | "armor") {
    if (!state.player) return;
    const id = slot === "weapon" ? state.weaponId : state.armorId;
    if (!id) return;
    const inventory = { ...state.inventory, [id]: (state.inventory[id] ?? 0) + 1 };
    let player = state.player;
    if (slot === "armor") {
      const newMax = playerDerived(player, state.weaponId, null).maxHp;
      player = { ...player, hp: Math.min(player.hp, newMax) };
    }
    const next = persist({
      ...state,
      player,
      inventory,
      weaponId: slot === "weapon" ? null : state.weaponId,
      armorId: slot === "armor" ? null : state.armorId,
      toast: `卸下${ITEMS[id].name}。`,
    });
    set(next);
  },
  useItem(id: ItemId) {
    if (!state.player || state.phase === "battle") return;
    if ((state.inventory[id] ?? 0) <= 0) return;
    if (id !== "pill_hp" && id !== "pill_mp") {
      toast("这个要到战斗里用。");
      return;
    }
    const stats = playerDerived(state.player, state.weaponId, state.armorId);
    const inventory = { ...state.inventory };
    const left = (inventory[id] ?? 0) - 1;
    if (left <= 0) delete inventory[id];
    else inventory[id] = left;
    if (id === "pill_hp") {
      const amount = pillHeal(stats.maxHp);
      const player = { ...state.player, hp: Math.min(stats.maxHp, state.player.hp + amount) };
      set(persist({ ...state, player, inventory, toast: `恢复 ${amount} 点气血。` }));
    } else {
      const amount = pillMana(stats.maxMp);
      const player = { ...state.player, mp: Math.min(stats.maxMp, state.player.mp + amount) };
      set(persist({ ...state, player, inventory, toast: `恢复 ${amount} 点法力。` }));
    }
    playCue("heal", state.muted);
  },
  feedPet(petId: string) {
    if ((state.inventory.pill_hp ?? 0) <= 0) {
      toast("没有回灵丹。");
      return;
    }
    const pet = state.pets.find((item) => item.id === petId);
    if (!pet) return;
    const derived = petDerived(pet);
    const amount = pillHeal(derived.maxHp);
    const inventory = { ...state.inventory };
    const left = (inventory.pill_hp ?? 0) - 1;
    if (left <= 0) delete inventory.pill_hp;
    else inventory.pill_hp = left;
    const pets = state.pets.map((item) =>
      item.id === petId ? { ...item, hp: Math.min(derived.maxHp, item.hp + amount) } : item,
    );
    set(persist({ ...state, pets, inventory, toast: `${pet.name} 恢复了 ${amount} 点气血。` }));
    playCue("heal", state.muted);
  },
  setActivePet(petId: string) {
    if (!state.pets.some((pet) => pet.id === petId)) return;
    const next = persist({ ...state, activePetId: petId, toast: "已设为出战灵兽。" });
    set(next);
  },
  recruit(speciesId: SpeciesId) {
    const spec = PETS[speciesId];
    if (!spec.starter) return;
    if (!state.player) return;
    if (state.pets.some((pet) => pet.speciesId === speciesId)) {
      toast("它已经跟着你了。");
      return;
    }
    const pet = createPet(speciesId, state.player.level);
    const next = persist({
      ...state,
      pets: [...state.pets, pet],
      activePetId: state.activePetId ?? pet.id,
      toast: `${pet.name} 跟你出了灵兽苑。`,
    });
    playCue("win", next.muted);
    set(next);
  },
  battleAct(command: BattleCommand) {
    if (!state.battle) return;
    if (command.type === "ai" && state.battle.phase !== "ai") return;
    if (command.type !== "ai" && state.battle.phase === "ai") return;
    const result = act(state.battle, command, state.inventory);
    let next: GameState = { ...state, battle: result.battle, inventory: result.inventory };
    if (!result.battle.settled && (result.battle.phase === "victory" || result.battle.phase === "defeat" || result.battle.phase === "fled")) {
      next = applyOutcome(next);
      playCue(result.battle.phase === "victory" ? "win" : result.battle.phase === "defeat" ? "lose" : "click", next.muted);
      next = persist(next);
    } else if (command.type !== "ai") {
      playCue("hit", next.muted);
    }
    set(next);
  },
  finishBattle() {
    if (!state.battle) return;
    const phase = state.battle.phase;
    const next = persist({
      ...state,
      phase: "world",
      battle: null,
      cooldown: Math.max(state.cooldown, 3),
      toast: phase === "defeat" ? "你回到了青石村。" : state.toast,
    });
    set(next);
  },
  saveNow() {
    const next = persist({ ...state, toast: "已记入本地存档。" });
    playCue("click", next.muted);
    set(next);
  },
  toggleMute() {
    const muted = !state.muted;
    writeMuted(muted);
    patch({ muted, toast: muted ? "音效已关。" : "音效已开。" });
  },
  dismissToast() {
    if (state.toast) patch({ toast: null });
  },
};

export function tileCharOfMap(mapId: MapId, x: number, y: number): string {
  return tileChar(MAPS[mapId].rows, x, y);
}
