import { ELEMENTS, ELEMENT_NAME, overcomes, type Element } from "../game/elements.js";

export function Bar({
  value,
  max,
  kind,
}: {
  value: number;
  max: number;
  kind: "hp" | "mp" | "exp";
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`bar ${kind}${pct < 30 && kind === "hp" ? " low" : ""}`}>
      <span style={{ width: `${pct}%` }} />
      <em>
        {kind === "exp" ? `${value}/${max}` : `${Math.max(0, value)}/${max}`}
      </em>
    </div>
  );
}

export function Portrait({ kind, element }: { kind: string; element: Element }) {
  return (
    <div className={`portrait el-${element} kind-${kind}`} aria-hidden="true">
      <i className="aura" />
      <i className="body" />
      <i className="head" />
      <i className="mark" />
    </div>
  );
}

export function ElementSeal({
  element,
  active,
  onPick,
}: {
  element: Element;
  active?: boolean;
  onPick?: (element: Element) => void;
}) {
  const Tag = onPick ? "button" : "div";
  return (
    <Tag
      className={`seal-el el-${element}${active ? " active" : ""}`}
      onClick={onPick ? () => onPick(element) : undefined}
      type={onPick ? "button" : undefined}
      aria-pressed={onPick ? Boolean(active) : undefined}
    >
      <strong>{ELEMENT_NAME[element]}</strong>
      <small>克{ELEMENT_NAME[overcomes(element)]}</small>
    </Tag>
  );
}

export function ElementCycle({ highlight }: { highlight?: Element }) {
  return (
    <div className="cycle" aria-hidden="true">
      {ELEMENTS.map((element, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / 5;
        const left = 50 + Math.cos(angle) * 38;
        const top = 50 + Math.sin(angle) * 38;
        return (
          <span
            key={element}
            className={`cycle-node el-${element}${highlight === element ? " on" : ""}`}
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            {ELEMENT_NAME[element]}
          </span>
        );
      })}
      <span className="cycle-core">生克</span>
    </div>
  );
}
