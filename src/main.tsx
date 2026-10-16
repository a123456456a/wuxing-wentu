import { createRoot } from "react-dom/client";
import { validateMaps } from "./game/data.js";
import { App } from "./ui/App.js";

const mapErrors = validateMaps();
if (mapErrors.length > 0) {
  throw new Error(mapErrors.join("\n"));
}

const root = document.getElementById("root");
if (!root) throw new Error("缺少根节点");
createRoot(root).render(<App />);
