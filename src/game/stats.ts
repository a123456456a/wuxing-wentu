import { ITEMS, PETS, SPECIES, schoolById } from "./data.js";
import type { Element } from "./elements.js";
import { clamp } from "./format.js";
import type { Fighter, ItemId, Pet, Player, SpeciesId } from "./types.js";

export interface Derived {
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
  spd: number;
}

export function playerDerived(player: Player, weaponId: ItemId | null, armorId: ItemId | null): Derived {
  const school = schoolById(player.schoolId);
  const weapon = weaponId ? ITEMS[weaponId] : null;
  const armor = armorId ? ITEMS[armorId] : null;
  const grown = player.level - 1;
  return {
    maxHp: 92 + grown * 18 + (school.bonus.hp ?? 0) + (armor?.hp ?? 0),
    maxMp: 34 + grown * 6 + (school.bonus.mp ?? 0),
    atk: 13 + grown * 3 + (school.bonus.atk ?? 0) + (weapon?.atk ?? 0),
    def: 5 + grown * 2 + (school.bonus.def ?? 0) + (armor?.def ?? 0),
    spd: 10 + player.level + (school.bonus.spd ?? 0),
  };
}

export function petDerived(pet: Pet): Derived {
  const spec = PETS[pet.speciesId];
  const grown = pet.level - 1;
  return {
    maxHp: spec.hp + grown * spec.hpG,
    maxMp: spec.mp + grown * spec.mpG,
    atk: spec.atk + grown * spec.atkG,
    def: spec.def + grown * spec.defG,
    spd: spec.spd + grown * spec.spdG,
  };
}

export function speciesDerived(speciesId: string, level: number): Derived {
  const spec = SPECIES[speciesId];
  const grown = level - 1;
  return {
    maxHp: spec.hp + grown * spec.hpG,
    maxMp: spec.mp + grown * spec.mpG,
    atk: spec.atk + grown * spec.atkG,
    def: spec.def + grown * spec.defG,
    spd: spec.spd + grown * spec.spdG,
  };
}

export function pillHeal(maxHp: number): number {
  return 40 + Math.floor(maxHp * 0.15);
}

export function pillMana(maxMp: number): number {
  return 24 + Math.floor(maxMp * 0.22);
}

export function withClampedVitals<T extends { hp: number; mp: number }>(
  body: T,
  maxHp: number,
  maxMp: number,
): T {
  return { ...body, hp: clamp(body.hp, 0, maxHp), mp: clamp(body.mp, 0, maxMp) };
}

export function makePlayerFighter(
  player: Player,
  weaponId: ItemId | null,
  armorId: ItemId | null,
  skills: string[],
): Fighter {
  const stats = playerDerived(player, weaponId, armorId);
  return {
    id: "player",
    name: player.name,
    side: "ally",
    kind: "player",
    element: player.affinity,
    affinity: player.affinity,
    level: player.level,
    hp: clamp(player.hp, 0, stats.maxHp),
    maxHp: stats.maxHp,
    mp: clamp(player.mp, 0, stats.maxMp),
    maxMp: stats.maxMp,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    daoXing: player.daoXing,
    skills,
    buffs: [],
    defending: false,
    catchable: false,
    exp: 0,
    gold: 0,
  };
}

export function makePetFighter(pet: Pet, skills: string[]): Fighter {
  const stats = petDerived(pet);
  return {
    id: "pet",
    name: pet.name,
    side: "ally",
    kind: "pet",
    element: pet.element,
    affinity: pet.element,
    level: pet.level,
    hp: clamp(pet.hp, 0, stats.maxHp),
    maxHp: stats.maxHp,
    mp: clamp(pet.mp, 0, stats.maxMp),
    maxMp: stats.maxMp,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    daoXing: Math.floor(pet.level * 6),
    skills,
    buffs: [],
    defending: false,
    speciesId: pet.speciesId,
    catchable: false,
    exp: 0,
    gold: 0,
  };
}

export function makeMonster(speciesId: string, level: number, index: number, suffix: string): Fighter {
  const spec = SPECIES[speciesId];
  const stats = speciesDerived(speciesId, level);
  return {
    id: "e" + index,
    name: suffix ? `${spec.name}·${suffix}` : spec.name,
    side: "enemy",
    kind: "monster",
    element: spec.element,
    affinity: spec.element,
    level,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    mp: stats.maxMp,
    maxMp: stats.maxMp,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    daoXing: level * 8,
    skills: spec.skills,
    buffs: [],
    defending: false,
    speciesId: spec.id,
    catchable: Boolean(spec.catchAs),
    exp: spec.exp + level * 6,
    gold: spec.gold + level * 4,
  };
}

export function emptyElement(): Element {
  return "earth";
}

export function speciesOfPet(id: SpeciesId) {
  return PETS[id];
}
