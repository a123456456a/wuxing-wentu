import { runSim } from "../dist/js/game/sim.js";

const errors = runSim();
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("模拟通过：地图、五行相克、入门战与首领战都能走完。");
