import type { Element } from "./elements.js";
import type { ItemId, MapId, SchoolId, SpeciesId } from "./types.js";

export interface SchoolDef {
  id: SchoolId;
  name: string;
  element: Element;
  motto: string;
  blurb: string;
  bonus: { hp?: number; mp?: number; atk?: number; def?: number; spd?: number };
  skills: string[];
}

export interface SkillDef {
  id: string;
  name: string;
  element: Element;
  mp: number;
  kind: "damage" | "heal" | "buff" | "control";
  target: "enemy" | "ally" | "self" | "all-enemies";
  power: number;
  flat: number;
  acc: number;
  desc: string;
  control?: "seal" | "freeze" | "slow";
  controlTurns?: number;
  buffKind?: "def";
  buffTurns?: number;
  buffValue?: number;
  dot?: number;
  dotTurns?: number;
}

export interface ItemDef {
  id: ItemId;
  name: string;
  kind: "weapon" | "armor" | "consumable" | "talisman";
  desc: string;
  price: number;
  atk?: number;
  def?: number;
  hp?: number;
  level: number;
}

export interface SpeciesDef {
  id: string;
  name: string;
  element: Element;
  hp: number;
  hpG: number;
  atk: number;
  atkG: number;
  def: number;
  defG: number;
  spd: number;
  spdG: number;
  mp: number;
  mpG: number;
  skills: string[];
  exp: number;
  gold: number;
  catchAs?: SpeciesId;
  petName?: string;
  blurb: string;
}

export interface PetSpeciesDef {
  id: SpeciesId;
  name: string;
  element: Element;
  blurb: string;
  skills: string[];
  hp: number;
  hpG: number;
  atk: number;
  atkG: number;
  def: number;
  defG: number;
  spd: number;
  spdG: number;
  mp: number;
  mpG: number;
  starter: boolean;
}

export interface GameMap {
  id: MapId;
  name: string;
  blurb: string;
  rows: string[];
  encounter: number;
  pool: MapId | "boss";
  exits: { x: number; y: number; to: MapId; sx: number; sy: number }[];
  wisps: { x: number; y: number }[];
}

export const SCHOOLS: SchoolDef[] = [
  {
    id: "sword",
    name: "青岚剑宗",
    element: "metal",
    motto: "一剑清风，断尽尘缘",
    blurb: "金行剑意，擅长破甲与短封。普攻仍看你自选的五行亲和。",
    bonus: { atk: 2, spd: 2 },
    skills: ["break_metal", "sword_seal"],
  },
  {
    id: "fire",
    name: "赤霞火府",
    element: "fire",
    motto: "一炬燎原，照见真心",
    blurb: "火行猛攻。灼焰打单，燎原波及所有敌人。",
    bonus: { atk: 3 },
    skills: ["scorch", "wildfire"],
  },
  {
    id: "water",
    name: "玄溟水榭",
    element: "water",
    motto: "静水深流，万法归潮",
    blurb: "水行控场。寒潮减速，凝冰可让对手停手，润泽用来续命。",
    bonus: { mp: 12, spd: 1 },
    skills: ["cold_tide", "ice_bind", "nourish"],
  },
  {
    id: "earth",
    name: "厚土禅院",
    element: "earth",
    motto: "地载万物，我自不动",
    blurb: "土行坚壁。磐击沉稳，岩甲抬高防御，适合拖进持久战。",
    bonus: { hp: 24, def: 2 },
    skills: ["rock_strike", "stone_skin"],
  },
  {
    id: "wood",
    name: "青木药谷",
    element: "wood",
    motto: "生机不尽，草木皆兵",
    blurb: "木行缠斗与疗伤。藤缠克土，回春能把同伴从昏迷边缘拉回来。",
    bonus: { hp: 12, mp: 8 },
    skills: ["vine_bind", "renew"],
  },
];

export const SKILLS: Record<string, SkillDef> = {
  break_metal: {
    id: "break_metal",
    name: "断金式",
    element: "metal",
    mp: 8,
    kind: "damage",
    target: "enemy",
    power: 1.48,
    flat: 0,
    acc: 100,
    desc: "金行重斩，专破护甲。",
  },
  sword_seal: {
    id: "sword_seal",
    name: "剑意封锋",
    element: "metal",
    mp: 10,
    kind: "control",
    target: "enemy",
    power: 0.45,
    flat: 0,
    acc: 74,
    desc: "以剑意封住对方法术一回合，并造成少量伤害。",
    control: "seal",
    controlTurns: 1,
  },
  scorch: {
    id: "scorch",
    name: "灼焰",
    element: "fire",
    mp: 8,
    kind: "damage",
    target: "enemy",
    power: 1.52,
    flat: 0,
    acc: 100,
    desc: "火行单点爆发。",
  },
  wildfire: {
    id: "wildfire",
    name: "燎原",
    element: "fire",
    mp: 14,
    kind: "damage",
    target: "all-enemies",
    power: 0.72,
    flat: 0,
    acc: 100,
    desc: "火势铺开，灼烧在场所有敌人。",
  },
  cold_tide: {
    id: "cold_tide",
    name: "寒潮",
    element: "water",
    mp: 8,
    kind: "control",
    target: "enemy",
    power: 1.12,
    flat: 0,
    acc: 86,
    desc: "水行冲击，并让目标迟缓两回合。",
    control: "slow",
    controlTurns: 2,
  },
  ice_bind: {
    id: "ice_bind",
    name: "凝冰诀",
    element: "water",
    mp: 12,
    kind: "control",
    target: "enemy",
    power: 0.35,
    flat: 0,
    acc: 66,
    desc: "试图冻住目标一个回合。相克时更容易成功。",
    control: "freeze",
    controlTurns: 1,
  },
  nourish: {
    id: "nourish",
    name: "润泽",
    element: "water",
    mp: 10,
    kind: "heal",
    target: "ally",
    power: 0.35,
    flat: 28,
    acc: 100,
    desc: "为一名同伴恢复气血。",
  },
  rock_strike: {
    id: "rock_strike",
    name: "磐击",
    element: "earth",
    mp: 6,
    kind: "damage",
    target: "enemy",
    power: 1.36,
    flat: 2,
    acc: 100,
    desc: "土行重击，消耗较少。",
  },
  stone_skin: {
    id: "stone_skin",
    name: "岩甲",
    element: "earth",
    mp: 8,
    kind: "buff",
    target: "self",
    power: 0,
    flat: 0,
    acc: 100,
    desc: "三回合内减免受到的伤害。",
    buffKind: "def",
    buffTurns: 3,
    buffValue: 0.38,
  },
  vine_bind: {
    id: "vine_bind",
    name: "藤缠",
    element: "wood",
    mp: 8,
    kind: "control",
    target: "enemy",
    power: 1.05,
    flat: 0,
    acc: 90,
    desc: "木藤缠足，造成伤害并迟缓。",
    control: "slow",
    controlTurns: 2,
  },
  renew: {
    id: "renew",
    name: "回春",
    element: "wood",
    mp: 12,
    kind: "heal",
    target: "ally",
    power: 0.48,
    flat: 34,
    acc: 100,
    desc: "药谷回春，治疗量较高。",
  },
  fox_tail: {
    id: "fox_tail",
    name: "火尾",
    element: "fire",
    mp: 4,
    kind: "damage",
    target: "enemy",
    power: 1.22,
    flat: 0,
    acc: 100,
    desc: "灵狐甩尾，火行单体。",
  },
  fox_burn: {
    id: "fox_burn",
    name: "燎毛",
    element: "fire",
    mp: 6,
    kind: "damage",
    target: "enemy",
    power: 0.7,
    flat: 0,
    acc: 100,
    desc: "附上灼烧，之后两回合持续掉血。",
    dot: 0.28,
    dotTurns: 2,
  },
  koi_breath: {
    id: "koi_breath",
    name: "吐雾",
    element: "water",
    mp: 4,
    kind: "damage",
    target: "enemy",
    power: 1.18,
    flat: 0,
    acc: 100,
    desc: "幼蛟吐出寒雾。",
  },
  koi_bind: {
    id: "koi_bind",
    name: "缠潮",
    element: "water",
    mp: 6,
    kind: "control",
    target: "enemy",
    power: 0.55,
    flat: 0,
    acc: 84,
    desc: "潮水缠身，使目标迟缓。",
    control: "slow",
    controlTurns: 2,
  },
  turtle_bash: {
    id: "turtle_bash",
    name: "壳击",
    element: "earth",
    mp: 3,
    kind: "damage",
    target: "enemy",
    power: 1.12,
    flat: 1,
    acc: 100,
    desc: "以壳为锤。",
  },
  turtle_shell: {
    id: "turtle_shell",
    name: "缩壳",
    element: "earth",
    mp: 5,
    kind: "buff",
    target: "self",
    power: 0,
    flat: 0,
    acc: 100,
    desc: "缩进壳中，三回合提升防御。",
    buffKind: "def",
    buffTurns: 3,
    buffValue: 0.42,
  },
  deer_ram: {
    id: "deer_ram",
    name: "抵角",
    element: "wood",
    mp: 4,
    kind: "damage",
    target: "enemy",
    power: 1.28,
    flat: 0,
    acc: 100,
    desc: "灵鹿顶撞。",
  },
  deer_dew: {
    id: "deer_dew",
    name: "露养",
    element: "wood",
    mp: 6,
    kind: "heal",
    target: "ally",
    power: 0.3,
    flat: 22,
    acc: 100,
    desc: "以朝露为同伴回血。",
  },
  sprout: {
    id: "sprout",
    name: "草刺",
    element: "wood",
    mp: 4,
    kind: "damage",
    target: "enemy",
    power: 1.05,
    flat: 0,
    acc: 100,
    desc: "草绒精的刺击。",
  },
  bite: {
    id: "bite",
    name: "虫咬",
    element: "earth",
    mp: 4,
    kind: "damage",
    target: "enemy",
    power: 1.1,
    flat: 0,
    acc: 100,
    desc: "石壳虫的啃咬。",
  },
  pounce: {
    id: "pounce",
    name: "狼扑",
    element: "metal",
    mp: 6,
    kind: "damage",
    target: "enemy",
    power: 1.24,
    flat: 0,
    acc: 100,
    desc: "霜脊狼扑击。",
  },
  spark: {
    id: "spark",
    name: "火花",
    element: "fire",
    mp: 6,
    kind: "damage",
    target: "enemy",
    power: 1.16,
    flat: 0,
    acc: 100,
    desc: "灰火傀喷出火星。",
  },
  frost_breath: {
    id: "frost_breath",
    name: "霜息",
    element: "water",
    mp: 10,
    kind: "damage",
    target: "enemy",
    power: 1.42,
    flat: 4,
    acc: 100,
    desc: "霜嵴君的吐息。",
  },
};

export const ITEMS: Record<ItemId, ItemDef> = {
  sword_1: {
    id: "sword_1",
    name: "青锋短剑",
    kind: "weapon",
    desc: "村铁匠的入门剑，攻击 +7。",
    price: 80,
    atk: 7,
    level: 1,
  },
  sword_2: {
    id: "sword_2",
    name: "赤纹刀",
    kind: "weapon",
    desc: "刀身纹着赤霞，攻击 +14。需要 4 级。",
    price: 220,
    atk: 14,
    level: 4,
  },
  sword_3: {
    id: "sword_3",
    name: "玄霜重剑",
    kind: "weapon",
    desc: "洞中寒铁所铸，攻击 +22。需要 8 级。",
    price: 520,
    atk: 22,
    level: 8,
  },
  armor_1: {
    id: "armor_1",
    name: "素布道袍",
    kind: "armor",
    desc: "防御 +3，气血上限 +14。",
    price: 70,
    def: 3,
    hp: 14,
    level: 1,
  },
  armor_2: {
    id: "armor_2",
    name: "兽皮轻甲",
    kind: "armor",
    desc: "防御 +8，气血上限 +30。需要 4 级。",
    price: 200,
    def: 8,
    hp: 30,
    level: 4,
  },
  armor_3: {
    id: "armor_3",
    name: "玄霜甲",
    kind: "armor",
    desc: "防御 +13，气血上限 +52。需要 8 级。",
    price: 500,
    def: 13,
    hp: 52,
    level: 8,
  },
  pill_hp: {
    id: "pill_hp",
    name: "回灵丹",
    kind: "consumable",
    desc: "恢复一部分气血。战斗内外都能用。",
    price: 18,
    level: 1,
  },
  pill_mp: {
    id: "pill_mp",
    name: "聚气散",
    kind: "consumable",
    desc: "恢复一部分法力。",
    price: 20,
    level: 1,
  },
  talisman: {
    id: "talisman",
    name: "契灵符",
    kind: "talisman",
    desc: "对气血残缺的幼兽使用，有机会结为同伴。",
    price: 36,
    level: 1,
  },
};

export const SHOP_IDS: ItemId[] = [
  "sword_1",
  "sword_2",
  "sword_3",
  "armor_1",
  "armor_2",
  "armor_3",
  "pill_hp",
  "pill_mp",
  "talisman",
];

export const SPECIES: Record<string, SpeciesDef> = {
  grass: {
    id: "grass",
    name: "草绒精",
    element: "wood",
    hp: 34,
    hpG: 9,
    atk: 8,
    atkG: 2,
    def: 2,
    defG: 1,
    spd: 8,
    spdG: 1,
    mp: 16,
    mpG: 3,
    skills: ["sprout"],
    exp: 16,
    gold: 7,
    blurb: "路边结成的小精怪。",
  },
  fox: {
    id: "fox",
    name: "焰尾狐",
    element: "fire",
    hp: 40,
    hpG: 11,
    atk: 11,
    atkG: 3,
    def: 3,
    defG: 1,
    spd: 13,
    spdG: 1,
    mp: 20,
    mpG: 4,
    skills: ["fox_tail", "fox_burn"],
    exp: 20,
    gold: 10,
    catchAs: "fox",
    petName: "焰尾灵狐",
    blurb: "尾尖常年燃着，尚未成妖。",
  },
  bug: {
    id: "bug",
    name: "石壳虫",
    element: "earth",
    hp: 48,
    hpG: 13,
    atk: 9,
    atkG: 2,
    def: 6,
    defG: 2,
    spd: 6,
    spdG: 1,
    mp: 12,
    mpG: 2,
    skills: ["bite"],
    exp: 18,
    gold: 8,
    blurb: "壳硬，动作慢。",
  },
  koi: {
    id: "koi",
    name: "溪鳞",
    element: "water",
    hp: 42,
    hpG: 11,
    atk: 10,
    atkG: 3,
    def: 4,
    defG: 1,
    spd: 11,
    spdG: 1,
    mp: 22,
    mpG: 4,
    skills: ["koi_breath", "koi_bind"],
    exp: 22,
    gold: 11,
    catchAs: "serpent",
    petName: "墨纹幼蛟",
    blurb: "溪里的幼鳞，纹路像未长成的蛟。",
  },
  deer: {
    id: "deer",
    name: "藤角鹿",
    element: "wood",
    hp: 46,
    hpG: 12,
    atk: 12,
    atkG: 3,
    def: 4,
    defG: 1,
    spd: 12,
    spdG: 1,
    mp: 20,
    mpG: 4,
    skills: ["deer_ram", "deer_dew"],
    exp: 24,
    gold: 12,
    catchAs: "deer",
    petName: "青藤灵鹿",
    blurb: "角上缠着活藤，只在忘机林出现。",
  },
  turtle: {
    id: "turtle",
    name: "岩背龟",
    element: "earth",
    hp: 58,
    hpG: 14,
    atk: 9,
    atkG: 2,
    def: 8,
    defG: 2,
    spd: 5,
    spdG: 1,
    mp: 18,
    mpG: 3,
    skills: ["turtle_bash", "turtle_shell"],
    exp: 24,
    gold: 12,
    catchAs: "turtle",
    petName: "岩背玄龟",
    blurb: "背甲如岩，能替主人挡灾。",
  },
  wolf: {
    id: "wolf",
    name: "霜脊狼",
    element: "metal",
    hp: 52,
    hpG: 13,
    atk: 14,
    atkG: 3,
    def: 5,
    defG: 1,
    spd: 14,
    spdG: 1,
    mp: 18,
    mpG: 3,
    skills: ["pounce"],
    exp: 26,
    gold: 14,
    blurb: "洞外就敢拦路的狼。",
  },
  puppet: {
    id: "puppet",
    name: "灰火傀",
    element: "fire",
    hp: 48,
    hpG: 12,
    atk: 13,
    atkG: 3,
    def: 6,
    defG: 2,
    spd: 9,
    spdG: 1,
    mp: 24,
    mpG: 4,
    skills: ["spark", "scorch"],
    exp: 28,
    gold: 15,
    blurb: "被洞中残火驱动的泥偶。",
  },
  boss: {
    id: "boss",
    name: "霜嵴君",
    element: "water",
    hp: 86,
    hpG: 16,
    atk: 15,
    atkG: 2,
    def: 7,
    defG: 1,
    spd: 11,
    spdG: 1,
    mp: 40,
    mpG: 6,
    skills: ["frost_breath", "ice_bind", "cold_tide"],
    exp: 80,
    gold: 60,
    blurb: "玄霜洞深处的寒蛟，不是能契的幼兽。",
  },
};

export const PETS: Record<SpeciesId, PetSpeciesDef> = {
  fox: {
    id: "fox",
    name: "焰尾灵狐",
    element: "fire",
    blurb: "火行灵兽。先学火尾，三级后会燎毛灼烧。",
    skills: ["fox_tail", "fox_burn"],
    hp: 48,
    hpG: 12,
    atk: 12,
    atkG: 3,
    def: 4,
    defG: 1,
    spd: 13,
    spdG: 1,
    mp: 24,
    mpG: 4,
    starter: true,
  },
  serpent: {
    id: "serpent",
    name: "墨纹幼蛟",
    element: "water",
    blurb: "水行灵兽。吐雾伤敌，缠潮让对手变慢。",
    skills: ["koi_breath", "koi_bind"],
    hp: 50,
    hpG: 12,
    atk: 11,
    atkG: 3,
    def: 5,
    defG: 1,
    spd: 12,
    spdG: 1,
    mp: 28,
    mpG: 5,
    starter: true,
  },
  turtle: {
    id: "turtle",
    name: "岩背玄龟",
    element: "earth",
    blurb: "土行灵兽。血厚，缩壳后极难被击倒。",
    skills: ["turtle_bash", "turtle_shell"],
    hp: 64,
    hpG: 15,
    atk: 9,
    atkG: 2,
    def: 8,
    defG: 2,
    spd: 6,
    spdG: 1,
    mp: 20,
    mpG: 3,
    starter: true,
  },
  deer: {
    id: "deer",
    name: "青藤灵鹿",
    element: "wood",
    blurb: "木行灵兽。忘机林才有，既能抵角也能露养。",
    skills: ["deer_ram", "deer_dew"],
    hp: 54,
    hpG: 13,
    atk: 12,
    atkG: 3,
    def: 5,
    defG: 1,
    spd: 12,
    spdG: 1,
    mp: 26,
    mpG: 4,
    starter: false,
  },
};

export const ENCOUNTERS: Record<string, { weight: number; foes: string[] }[]> = {
  luoxia: [
    { weight: 4, foes: ["grass", "grass"] },
    { weight: 3, foes: ["fox"] },
    { weight: 3, foes: ["bug"] },
    { weight: 2, foes: ["koi"] },
    { weight: 2, foes: ["fox", "grass"] },
  ],
  wangji: [
    { weight: 3, foes: ["deer"] },
    { weight: 3, foes: ["deer", "grass"] },
    { weight: 2, foes: ["turtle"] },
    { weight: 2, foes: ["fox", "fox"] },
    { weight: 2, foes: ["wolf"] },
  ],
  cave: [
    { weight: 3, foes: ["wolf", "puppet"] },
    { weight: 3, foes: ["puppet", "puppet"] },
    { weight: 2, foes: ["wolf", "wolf"] },
    { weight: 2, foes: ["turtle", "koi"] },
  ],
  boss: [{ weight: 1, foes: ["boss", "puppet"] }],
};

export const LEVEL_BAND: Record<string, number[]> = {
  luoxia: [1, 1, 2, 2, 3],
  wangji: [3, 4, 4, 5, 6],
  cave: [6, 7, 7, 8, 9],
  boss: [10],
};

const QINGSHI = [
  "MMMMMMMMMMMMMMMMMMMM",
  "M..................M",
  "M......WWWWW.......M",
  "M..####W...W.......M",
  "M..#..#W...W.......M",
  "M..#HH#WWWWW.......M",
  "M..#..#............M",
  "M..#..#.....n......M",
  "M..................M",
  "M..pppppppppp......M",
  "M....p....S..L.....M",
  "M....p.............M",
  "M....v.............M",
  "MMMMMMMMMMMMMMMMMMMM",
];

const LUOXIA = [
  "MMMMMMMMMMMMMMMMMMMMMM",
  "M.......^............M",
  "M.......p............M",
  "M.......p..,,,,......M",
  "M...pppppppp,,,......M",
  "M.......p.....WW.....M",
  "M,,,,,,,p.....WW..>..M",
  "M.......p............M",
  "M.......ppppppppp....M",
  "M.............p......M",
  "M......,,,,...p......M",
  "M......,,,,...p......M",
  "M.............v......M",
  "MMMMMMMMMMMMMMMMMMMMMM",
];

const WANGJI = [
  "MMMMMMMMMMMMMMMMMMMM",
  "MTTTTTTTTTTTTTTTTT.M",
  "MTT,,T,,,,,T,,,,T<.M",
  "MTT,,T,,q,,T,,,,TT.M",
  "MTTTTTTpppppTTTTTT.M",
  "M..,,,,p..T,,,,TT..M",
  "M..,,,,p..T,,,,T...M",
  "M..TTpppppppppT....M",
  "M..TT....p.....T...M",
  "M..T,,,,,p,,,,,T...M",
  "M..TTTTTTTTT...T...M",
  "M..................M",
  "MMMMMMMMMMMMMMMMMMMM",
];

const CAVE = [
  "MMMMMMMMMMMMMMMMMMMM",
  "M.........^........M",
  "M..cccccccccccccc..M",
  "M..cc,,cccccc,,cc..M",
  "M..c,,ccMMccMM,cc..M",
  "M..cccccMMccMMccc..M",
  "M..ccccccBcccccccc.M",
  "M..,,cccccccc,,cc..M",
  "M..,,cccccccc,,cc..M",
  "M..................M",
  "MMMMMMMMMMMMMMMMMMMM",
];

export const MAPS: Record<MapId, GameMap> = {
  qingshi: {
    id: "qingshi",
    name: "青石村",
    blurb: "安全的村子。客栈调息，铁铺置装，灵兽苑领第一只同伴。",
    rows: QINGSHI,
    encounter: 0,
    pool: "luoxia",
    exits: [{ x: 5, y: 12, to: "luoxia", sx: 8, sy: 2 }],
    wisps: [],
  },
  luoxia: {
    id: "luoxia",
    name: "落霞野",
    blurb: "村南的野地。高草会遇敌，发光的妖气则一定会开战。",
    rows: LUOXIA,
    encounter: 0.22,
    pool: "luoxia",
    exits: [
      { x: 8, y: 1, to: "qingshi", sx: 5, sy: 11 },
      { x: 18, y: 6, to: "wangji", sx: 18, sy: 2 },
      { x: 14, y: 12, to: "cave", sx: 10, sy: 2 },
    ],
    wisps: [
      { x: 12, y: 3 },
      { x: 3, y: 6 },
      { x: 8, y: 10 },
    ],
  },
  wangji: {
    id: "wangji",
    name: "忘机林",
    blurb: "林中有泉，可以免费调息。藤角鹿只在这里游荡。",
    rows: WANGJI,
    encounter: 0.3,
    pool: "wangji",
    exits: [{ x: 17, y: 2, to: "luoxia", sx: 17, sy: 6 }],
    wisps: [
      { x: 8, y: 2 },
      { x: 4, y: 5 },
      { x: 12, y: 9 },
    ],
  },
  cave: {
    id: "cave",
    name: "玄霜洞",
    blurb: "洞底住着霜嵴君。打赢第一场会有额外道行和一份寒铁甲。",
    rows: CAVE,
    encounter: 0.26,
    pool: "cave",
    exits: [{ x: 10, y: 1, to: "luoxia", sx: 14, sy: 11 }],
    wisps: [
      { x: 5, y: 3 },
      { x: 14, y: 4 },
      { x: 4, y: 7 },
    ],
  },
};

export const MAP_ORDER: MapId[] = ["qingshi", "luoxia", "wangji", "cave"];

export const SOLID = new Set(["M", "T", "W", "#"]);

export function schoolById(id: SchoolId): SchoolDef {
  const found = SCHOOLS.find((school) => school.id === id);
  if (!found) throw new Error("未知门派");
  return found;
}

export function skillById(id: string): SkillDef {
  const skill = SKILLS[id];
  if (!skill) throw new Error("未知法术 " + id);
  return skill;
}

export function knownSchoolSkills(schoolId: SchoolId, level: number): string[] {
  const skills = schoolById(schoolId).skills;
  const gates = [1, 3, 6];
  return skills.filter((_, index) => level >= (gates[index] ?? 99));
}

export function knownPetSkills(speciesId: SpeciesId, level: number): string[] {
  const skills = PETS[speciesId].skills;
  return level >= 3 ? skills : skills.slice(0, 1);
}

export function validateMaps(): string[] {
  const errors: string[] = [];
  for (const map of Object.values(MAPS)) {
    const width = map.rows[0]?.length ?? 0;
    map.rows.forEach((row, y) => {
      if (row.length !== width) errors.push(`${map.id} 第 ${y} 行宽度 ${row.length}`);
    });
    const height = map.rows.length;
    const check = (x: number, y: number, label: string) => {
      const ch = map.rows[y]?.[x];
      if (ch == null) errors.push(`${map.id} ${label} 越界 ${x},${y}`);
      else if (SOLID.has(ch) && label !== "solid-ok") errors.push(`${map.id} ${label} 落在阻挡 ${ch} @${x},${y}`);
    };
    for (const exit of map.exits) check(exit.x, exit.y, "出口");
    for (const wisp of map.wisps) check(wisp.x, wisp.y, "妖气");
    const dest = MAPS[map.id];
    void dest;
    void height;
  }
  for (const map of Object.values(MAPS)) {
    for (const exit of map.exits) {
      const next = MAPS[exit.to];
      const ch = next.rows[exit.sy]?.[exit.sx];
      if (ch == null || SOLID.has(ch)) errors.push(`${map.id} 通往 ${exit.to} 的落点不可走`);
      if ("v^><".includes(ch ?? "")) errors.push(`${map.id} 落点踩在出口上`);
    }
  }
  return errors;
}
