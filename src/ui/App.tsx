import { useEffect } from "react";
import { useSyncExternalStore } from "react";
import { api, getState, subscribe } from "../game/store.js";
import { BattleScreen } from "./BattleScreen.js";
import { CreateScreen } from "./CreateScreen.js";
import { TitleScreen } from "./TitleScreen.js";
import { WorldScreen } from "./WorldScreen.js";

export function App() {
  const state = useSyncExternalStore(subscribe, getState);
  useEffect(() => {
    if (!state.toast) return;
    const timer = window.setTimeout(() => api.dismissToast(), 2400);
    return () => window.clearTimeout(timer);
  }, [state.toast]);

  return (
    <div className="app">
      {state.phase === "title" && <TitleScreen />}
      {state.phase === "create" && <CreateScreen />}
      {state.phase === "world" && <WorldScreen />}
      {state.phase === "battle" && state.battle && <BattleScreen />}
      {state.toast && <div className="toast">{state.toast}</div>}
    </div>
  );
}
