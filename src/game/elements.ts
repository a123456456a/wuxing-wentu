export type Element = "metal" | "wood" | "water" | "fire" | "earth";

export const ELEMENTS: Element[] = ["metal", "wood", "water", "fire", "earth"];

export const ELEMENT_NAME: Record<Element, string> = {
  metal: "金",
  wood: "木",
  water: "水",
  fire: "火",
  earth: "土",
};

/** 相生：金生水、水生木、木生火、火生土、土生金 */
const GENERATES: Record<Element, Element> = {
  metal: "water",
  water: "wood",
  wood: "fire",
  fire: "earth",
  earth: "metal",
};

/** 相克：金克木、木克土、土克水、水克火、火克金 */
const OVERCOMES: Record<Element, Element> = {
  metal: "wood",
  wood: "earth",
  earth: "water",
  water: "fire",
  fire: "metal",
};

export type Relation = "ke" | "beke" | "sheng" | "beisheng" | "tong";

export const RELATION_NAME: Record<Relation, string> = {
  ke: "相克",
  beke: "受制",
  sheng: "相生",
  beisheng: "受生",
  tong: "同行",
};

export function relation(from: Element, to: Element): Relation {
  if (from === to) return "tong";
  if (OVERCOMES[from] === to) return "ke";
  if (OVERCOMES[to] === from) return "beke";
  if (GENERATES[from] === to) return "sheng";
  return "beisheng";
}

export function relationHint(kind: Relation): string {
  switch (kind) {
    case "ke":
      return "相克，伤害提高，控制更稳";
    case "beke":
      return "受制，伤害降低，控制易被化开";
    case "sheng":
      return "相生泄力，伤害略降，并收回少许法力";
    case "beisheng":
      return "受生，伤害略增";
    case "tong":
      return "同行，无克制";
  }
}

export function generates(from: Element): Element {
  return GENERATES[from];
}

export function overcomes(from: Element): Element {
  return OVERCOMES[from];
}
