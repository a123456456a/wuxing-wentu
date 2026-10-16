import type { Element } from "./elements.js";

export type SchoolId = "sword" | "fire" | "water" | "earth" | "wood";
export type MapId = "qingshi" | "luoxia" | "wangji" | "cave";
export type ItemId =
  | "sword_1"
  | "sword_2"
  | "sword_3"
  | "armor_1"
  | "armor_2"
  | "armor_3"
  | "pill_hp"
  | "pill_mp"
  | "talisman";

export type SpeciesId = "fox" | "serpent" | "turtle" | "deer";

export interface Buff {
  id: string;
  name: string;
  kind: "def" | "seal" | "freeze" | "slow" | "dot";
  turns: number;
  value: number;
  fresh: boolean;
}

export interface Fighter {
  id: string;
  name: string;
  side: "ally" | "enemy";
  kind: "player" | "pet" | "monster";
  element: Element;
  affinity: Element;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  spd: number;
  daoXing: number;
  skills: string[];
  buffs: Buff[];
  defending: boolean;
  speciesId?: string;
  catchable: boolean;
  exp: number;
  gold: number;
}

export interface Pet {
  id: string;
  speciesId: SpeciesId;
  name: string;
  element: Element;
  level: number;
  exp: number;
  hp: number;
  mp: number;
}

export interface Player {
  name: string;
  schoolId: SchoolId;
  affinity: Element;
  level: number;
  exp: number;
  hp: number;
  mp: number;
  daoXing: number;
}

export interface LogLine {
  id: number;
  text: string;
}

export type BattlePhase = "command" | "target" | "ai" | "victory" | "defeat" | "fled";

export interface PendingAction {
  kind: "attack" | "skill" | "item" | "catch";
  skillId?: string;
  itemId?: ItemId;
}

export interface CaughtPet {
  speciesId: SpeciesId;
  level: number;
}

export interface Rewards {
  exp: number;
  gold: number;
  dao: number;
  drops: { id: ItemId; n: number }[];
  caught: CaughtPet[];
}

export interface BattleState {
  allies: Fighter[];
  enemies: Fighter[];
  round: number;
  order: string[];
  cursor: number;
  phase: BattlePhase;
  actorId: string | null;
  pending: PendingAction | null;
  log: LogLine[];
  seq: number;
  lastHit: { id: number; targetId: string; text: string } | null;
  boss: boolean;
  area: MapId;
  rewards: Rewards | null;
  notes: string[];
  settled: boolean;
  caught: CaughtPet[];
  caughtEcho: { exp: number; gold: number; dao: number };
}

export interface SaveData {
  version: 1;
  player: Player;
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
}
