import { useState } from "react";
import { api, getState, subscribe } from "../game/store.js";
import { useSyncExternalStore } from "react";

export function TitleScreen() {
  const state = useSyncExternalStore(subscribe, getState);
  const [help, setHelp] = useState(false);
  return (
    <section className="title-screen">
      <div className="ink-sky" aria-hidden="true">
        <div className="cloud cloud-a" />
        <div className="cloud cloud-b" />
        <div className="cloud cloud-c" />
        <div className="ridge ridge-far" />
        <div className="ridge ridge-mid" />
        <div className="ridge ridge-near" />
      </div>
      <div className="title-plaque">
        <p className="eyebrow">原创单机原型 · 与任何商业作品无关</p>
        <h1>五行问途</h1>
        <p className="subtitle">顺着五行，走出一程</p>
        <hr className="rule" />
        <div className="stamp" aria-hidden="true">
          <span>五</span>
          <span>行</span>
          <span>问</span>
          <span>途</span>
        </div>
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
