import { useState } from "react";
import { SCHOOLS } from "../game/data.js";
import { ELEMENT_NAME, ELEMENTS, type Element } from "../game/elements.js";
import { api } from "../game/store.js";
import type { SchoolId } from "../game/types.js";
import { ElementCycle, ElementSeal } from "./bits.js";

export function CreateScreen() {
  const [name, setName] = useState("云游子");
  const [schoolId, setSchoolId] = useState<SchoolId>("sword");
  const [affinity, setAffinity] = useState<Element>("metal");
  const school = SCHOOLS.find((item) => item.id === schoolId) ?? SCHOOLS[0];
  return (
    <section className="create">
      <header className="create-head">
        <button type="button" onClick={() => api.toTitle()}>
          返回
        </button>
        <h2>立下名号</h2>
      </header>
      <div className="create-grid">
        <div className="paper">
          <label className="field">
            名号
            <input
              value={name}
              maxLength={8}
              onChange={(event: { target: EventTarget | null }) => setName((event.target as HTMLInputElement).value)}
              placeholder="最多八个字"
            />
          </label>
          <p className="hint">门派决定法术，亲和决定普攻，也强化同属性法术。</p>
          <ElementCycle highlight={affinity} />
          <p className="hint">外圈按相生排列。印章上写着这一行克谁。</p>
          <div className="seal-row">
            {ELEMENTS.map((element) => (
              <ElementSeal key={element} element={element} active={affinity === element} onPick={(next) => setAffinity(next)} />
            ))}
          </div>
          <p className="hint">当前亲和 {ELEMENT_NAME[affinity]}。普攻带这个五行，同属性法术也会更有力。</p>
        </div>
        <div className="school-list">
          {SCHOOLS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`school-card el-${item.element}${schoolId === item.id ? " active" : ""}`}
              onClick={() => setSchoolId(item.id)}
              aria-pressed={schoolId === item.id}
            >
              <span className="school-el">{ELEMENT_NAME[item.element]}</span>
              <strong>{item.name}</strong>
              <em>{item.motto}</em>
              <p>{item.blurb}</p>
            </button>
          ))}
        </div>
      </div>
      <footer className="create-foot">
        <div>
          <strong>{school.name}</strong>
          <span>
            {" "}
            · 亲和{ELEMENT_NAME[affinity]} · {name.trim() || "未命名"}
          </span>
        </div>
        <button type="button" className="primary" onClick={() => api.newGame(name, schoolId, affinity)}>
          踏出青石村
        </button>
      </footer>
    </section>
  );
}
