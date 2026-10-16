import { useState } from "react";
import { api, getState, subscribe } from "../game/store.js";
import { useSyncExternalStore } from "react";

export function TitleScreen() {
  const state = useSyncExternalStore(subscribe, getState);
  const [help, setHelp] = useState(false);
  return (
    <section className="title-screen">
      <div className="title-copy">
        <p className="eyebrow">原创单机原型 · 与任何商业作品无关</p>
        <h1>问道</h1>
        <p className="subtitle">山河试炼</p>
        <div className="stamp">山河</div>
        <p className="lead">
          选一门派，定一行亲和，带灵兽走过青石村、落霞野、忘机林，直到玄霜洞底。回合之间，看五行相生相克。
        </p>
        <div className="title-actions">
          <button type="button" className="primary" onClick={() => api.openCreate()}>
            开始新的修行
          </button>
          <button type="button" disabled={!state.hasSave} onClick={() => api.continueGame()}>
            {state.hasSave ? `继续 · ${state.continueName}` : "没有存档"}
          </button>
          <button type="button" onClick={() => setHelp((open) => !open)}>
            {help ? "收起说明" : "怎么玩"}
          </button>
        </div>
        {help && (
          <div className="help-card">
            <p>点击地面行走，或用 WASD / 方向键。手机上可以用方向键。</p>
            <p>村子里的「栈、铺、兽、翁」分别是客栈、铁铺、灵兽苑和引路人。</p>
            <p>高草可能遇敌，发光的妖气一定会开战。道行随胜利增长，让法术更稳。</p>
          </div>
        )}
      </div>
    </section>
  );
}
