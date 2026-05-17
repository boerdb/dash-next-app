import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function load(modulePath) {
  return import(pathToFileURL(join(root, modulePath)).href);
}

const { fetchHarlingenTides } = await load("lib/tides/fetch-tides.ts");
const { fetchHarlingenTidesOpenMeteo } = await load(
  "lib/tides/open-meteo-client.ts"
);

const { items: rws, source } = await fetchHarlingenTides();
const om = await fetchHarlingenTidesOpenMeteo();

console.log("Bron:", source);
console.log("\nRWS (primair):");
for (const i of rws) {
  console.log(`  ${i.dagKey} ${i.type === "HW" ? "Vloed" : "Eb "} ${i.tijd}  ${i.hoogte} m`);
}

console.log("\nOpen-Meteo (model):");
for (const i of om) {
  console.log(`  ${i.dagKey} ${i.type === "HW" ? "Vloed" : "Eb "} ${i.tijd}  ${i.hoogte} m`);
}

function minutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const pairs = rws.filter((r) => om.some((o) => o.dagKey === r.dagKey && o.type === r.type));
let maxDiff = 0;
for (const r of pairs) {
  const o = om.find((x) => x.dagKey === r.dagKey && x.type === r.type);
  if (!o) continue;
  const diff = Math.abs(minutes(r.tijd) - minutes(o.tijd));
  maxDiff = Math.max(maxDiff, diff);
}
console.log(`\nMax tijdsverschil RWS vs Open-Meteo (zelfde dag+type): ${maxDiff} min`);
