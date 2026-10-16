import { takeAi, act, controlChance, openBattle, rollEncounter, setRandom, strike } from "./combat.js";
import { validateMaps } from "./data.js";
import { relation } from "./elements.js";
import { makeMonster, makePetFighter, makePlayerFighter } from "./stats.js";
import type { BattleState, Fighter, ItemId, Player } from "./types.js";

function fighter(partial: Partial<Fighter> & Pick<Fighter, "element" | "affinity" | "atk" | "def">): Fighter {
  return {
    id: "x",
    name: "试",
    side: "ally",
    kind: "player",
    level: 1,
    hp: 100,
    maxHp: 100,
    mp: 20,
    maxMp: 20,
    spd: 10,
    daoXing: 0,
    skills: [],
    buffs: [],
    defending: false,
    catchable: false,
    exp: 0,
    gold: 0,
    ...partial,
  };
}

function autoplay(battle: BattleState, inventory: Partial<Record<ItemId, number>>) {
  let current = battle;
  let bag = inventory;
  let steps = 0;
  while ((current.phase === "command" || current.phase === "ai" || current.phase === "target") && steps < 90) {
    const next =
      current.phase === "target" && current.pending
        ? act(current, { type: "back" }, bag)
        : takeAi(current, bag);
    if (next.battle.seq === current.seq && next.battle.phase === current.phase && next.battle.cursor === current.cursor) break;
    current = next.battle;
    bag = next.inventory;
    steps += 1;
  }
  return { battle: current, steps };
}

export function runSim(): string[] {
  const errors: string[] = [];
  for (const error of validateMaps()) errors.push(error);
  if (relation("fire", "metal") !== "ke") errors.push("火应克金");
  if (relation("metal", "water") !== "sheng") errors.push("金应生水");
  if (relation("water", "fire") !== "ke") errors.push("水应克火");
  if (relation("wood", "wood") !== "tong") errors.push("同行判断错误");

  setRandom(() => 0.5);
  const attacker = fighter({ element: "fire", affinity: "fire", atk: 20, def: 4, daoXing: 0 });
  const metal = fighter({ id: "m", element: "metal", affinity: "metal", atk: 10, def: 4, side: "enemy", kind: "monster" });
  const water = fighter({ id: "w", element: "water", affinity: "water", atk: 10, def: 4, side: "enemy", kind: "monster" });
  const ke = strike(attacker, metal, "fire", 1, true);
  const bad = strike(attacker, water, "fire", 1, true);
  if (!(ke.damage > bad.damage)) errors.push(`相克伤害应更高 ${ke.damage} vs ${bad.damage}`);

  const player: Player = { name: "试", schoolId: "sword", affinity: "metal", level: 1, exp: 0, hp: 120, mp: 40, daoXing: 0 };
  const allies = [makePlayerFighter(player, null, "armor_1", ["break_metal"])];
  const easy = openBattle(allies, [makeMonster("grass", 1, 0, "")], "luoxia", false);
  const easyEnd = autoplay(easy, { pill_hp: 2 });
  if (easyEnd.battle.phase !== "victory") errors.push(`一级应能打过草绒精，结果 ${easyEnd.battle.phase}，步数 ${easyEnd.steps}`);

  const grown: Player = { ...player, level: 8, hp: 400, mp: 80, daoXing: 200, schoolId: "fire", affinity: "fire" };
  const pet = makePetFighter(
    { id: "pet", speciesId: "fox", name: "焰尾灵狐", element: "fire", level: 8, exp: 0, hp: 200, mp: 40 },
    ["fox_tail", "fox_burn"],
  );
  const bossRoll = rollEncounter("cave", "boss");
  const bossFight = openBattle(
    [makePlayerFighter(grown, "sword_3", "armor_3", ["scorch", "wildfire"]), pet],
    bossRoll.foes,
    "cave",
    true,
  );
  const bossEnd = autoplay(bossFight, { pill_hp: 5, pill_mp: 3 });
  if (bossEnd.battle.phase !== "victory" && bossEnd.battle.phase !== "defeat") {
    errors.push(`首领战没有结束：${bossEnd.battle.phase}`);
  }
  const high = controlChance({ ...attacker, daoXing: 300 }, metal, "fire", 70);
  const low = controlChance({ ...attacker, daoXing: 0 }, { ...metal, daoXing: 200 }, "water", 70);
  if (!(high > low)) errors.push("道行应提高控制成功率");
  return errors;
}
