import { ITEMS, MAP_ORDER, MAPS, PETS, SCHOOLS, SHOP_IDS, knownPetSkills, knownSchoolSkills, skillById } from "../game/data.js";
import { ELEMENT_NAME, overcomes } from "../game/elements.js";
import { controlResist, expToNext, formatDao, realmName, skillStable } from "../game/format.js";
import { petDerived, playerDerived } from "../game/stats.js";
import { api, getState, subscribe } from "../game/store.js";
import type { ItemId, SpeciesId } from "../game/types.js";
import { useSyncExternalStore } from "react";
import { Bar, ElementCycle, Portrait } from "./bits.js";

export function Panels() {
  const state = useSyncExternalStore(subscribe, getState);
  const player = state.player;
  if (!player || !state.panel) return null;
  const stats = playerDerived(player, state.weaponId, state.armorId);
  const school = SCHOOLS.find((item) => item.id === player.schoolId);
  return (
    <div className="sheet" role="dialog">
      <header>
        <strong>
          {state.panel === "char" ? "人物" : state.panel === "bag" ? "行囊" : state.panel === "pet" ? "灵兽" : state.panel === "shop" ? "铁铺" : state.panel === "lodge" ? "灵兽苑" : state.panel === "map" ? "山河" : "五行"}
        </strong>
        <button type="button" onClick={() => api.closePanel()}>关闭</button>
      </header>
      {state.panel === "char" && (
        <div className="sheet-body">
          <p>
            {player.name} · {school?.name} · 亲和{ELEMENT_NAME[player.affinity]} · {realmName(player.level)} {player.level} 级
          </p>
          <p>道行 {formatDao(player.daoXing)}。法术稳定 +{skillStable(player.daoXing)}%，抗控制 +{controlResist(player.daoXing)}%。</p>
          <Bar kind="exp" value={player.exp} max={expToNext(player.level)} />
          <ul className="stat-list">
            <li>气血 {player.hp}/{stats.maxHp}</li>
            <li>法力 {player.mp}/{stats.maxMp}</li>
            <li>攻击 {stats.atk}</li>
            <li>防御 {stats.def}</li>
            <li>速度 {stats.spd}</li>
          </ul>
          <p>武器：{state.weaponId ? ITEMS[state.weaponId].name : "空着"} {state.weaponId && <button type="button" onClick={() => api.unequip("weapon")}>卸下</button>}</p>
          <p>衣服：{state.armorId ? ITEMS[state.armorId].name : "空着"} {state.armorId && <button type="button" onClick={() => api.unequip("armor")}>卸下</button>}</p>
          <h3>已学法术</h3>
          {knownSchoolSkills(player.schoolId, player.level).map((id) => {
            const skill = skillById(id);
            return <p key={id}>{skill.name} · {ELEMENT_NAME[skill.element]} · {skill.mp} 法力 · {skill.desc}</p>;
          })}
        </div>
      )}
      {state.panel === "bag" && (
        <div className="sheet-body">
          {Object.keys(state.inventory).length === 0 && <p>行囊是空的。</p>}
          {(Object.keys(state.inventory) as ItemId[]).map((id) => {
            const item = ITEMS[id];
            const count = state.inventory[id] ?? 0;
            if (count <= 0) return null;
            return (
              <article key={id} className="row-card">
                <div>
                  <strong>{item.name} ×{count}</strong>
                  <p>{item.desc}</p>
                </div>
                <div className="row-actions">
                  {(item.kind === "weapon" || item.kind === "armor") && <button type="button" onClick={() => api.equip(id)}>装备</button>}
                  {(id === "pill_hp" || id === "pill_mp") && <button type="button" onClick={() => api.useItem(id)}>使用</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {state.panel === "pet" && (
        <div className="sheet-body">
          {state.pets.length === 0 && <p>还没有灵兽。去灵兽苑领一只，或在野外用契灵符结契。</p>}
          {state.pets.map((pet) => {
            const derived = petDerived(pet);
            const active = pet.id === state.activePetId;
            return (
              <article key={pet.id} className={`row-card${active ? " active" : ""}`}>
                <Portrait kind={pet.speciesId} element={pet.element} />
                <div>
                  <strong>{pet.name} · {pet.level} 级 · {ELEMENT_NAME[pet.element]}{active ? " · 出战" : ""}</strong>
                  <Bar kind="hp" value={pet.hp} max={derived.maxHp} />
                  <Bar kind="mp" value={pet.mp} max={derived.maxMp} />
                  <p>{knownPetSkills(pet.speciesId, pet.level).map((id) => skillById(id).name).join("、")}</p>
                  <div className="row-actions">
                    {!active && <button type="button" onClick={() => api.setActivePet(pet.id)}>设为出战</button>}
                    <button type="button" onClick={() => api.feedPet(pet.id)}>喂回灵丹</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {state.panel === "shop" && (
        <div className="sheet-body">
          <p>掌柜把家伙摊在青石上。卖出按半价。</p>
          {SHOP_IDS.map((id) => {
            const item = ITEMS[id];
            return (
              <article key={id} className="row-card">
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.desc}售价 {item.price} 文。</p>
                </div>
                <div className="row-actions">
                  <button type="button" onClick={() => api.buy(id)}>购买</button>
                  <button type="button" disabled={(state.inventory[id] ?? 0) <= 0} onClick={() => api.sell(id)}>卖出</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {state.panel === "lodge" && (
        <div className="sheet-body">
          <p>第一只同伴可以在这里领。焰尾狐、溪鳞和岩背龟也能在野外契到；青藤灵鹿只出现在忘机林。</p>
          {(Object.keys(PETS) as SpeciesId[]).map((id) => {
            const spec = PETS[id];
            const owned = state.pets.some((pet) => pet.speciesId === id);
            return (
              <article key={id} className="row-card">
                <Portrait kind={id} element={spec.element} />
                <div>
                  <strong>{spec.name} · {ELEMENT_NAME[spec.element]}</strong>
                  <p>{spec.blurb}</p>
                  {spec.starter ? (
                    <button type="button" disabled={owned} onClick={() => api.recruit(id)}>{owned ? "已结契" : "收为同伴"}</button>
                  ) : (
                    <p>{owned ? "已结契" : "只能在野外契灵。"}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {state.panel === "map" && (
        <div className="sheet-body">
          {MAP_ORDER.map((id) => (
            <article key={id} className={`row-card${id === state.mapId ? " active" : ""}`}>
              <div>
                <strong>{MAPS[id].name}{id === state.mapId ? " · 你在这里" : ""}</strong>
                <p>{MAPS[id].blurb}</p>
              </div>
            </article>
          ))}
          <p>青石村往南是落霞野。落霞野往东进忘机林，往南进玄霜洞。</p>
        </div>
      )}
      {state.panel === "help" && (
        <div className="sheet-body help-layout">
          <ElementCycle highlight={player.affinity} />
          <div>
            <p>相克：金克木，木克土，土克水，水克火，火克金。相克时伤害提高，控制更容易命中。</p>
            <p>相生：金生水，水生木，木生火，火生土，土生金。相生会泄去一点伤害，并回复少许法力。</p>
            <p>你的亲和是{ELEMENT_NAME[player.affinity]}，克{ELEMENT_NAME[overcomes(player.affinity)]}。道行每深一截，法术成功率与抗控制都会略增。</p>
            <p>点击地图行走。高草会随机遇敌，妖气光团必战。战斗中途刷新页面会回到最近一次存档。</p>
          </div>
        </div>
      )}
    </div>
  );
}
