const fs = require("fs");

const source = fs.readFileSync("../kanto, localisation et évolution.md", "utf8");
const [locationText, evolutionText = ""] = source.split(/EVOLUTION\s*:/i);

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function cleanName(value) {
  return String(value || "")
    .replace(/^[-•\s]+/, "")
    .replace(/[.,;]+$/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/~\d+$/g, "")
    .trim();
}

function methodLabel(value) {
  const cleaned = String(value || "").replace(/^[-•\s]+/, "").replace(/:$/, "").trim();
  const normalized = normalizeName(cleaned);
  if (normalized.includes("surf")) return "Surf";
  if (normalized.includes("canne")) return "Canne";
  if (normalized.includes("peche")) return "Peche";
  return cleaned || "Herbes";
}

const methodWords = new Set(["surf", "canne", "peche"]);
const data = {};
let area = "";
let method = "Herbes";
let rate = "";

function addLocation(name, info) {
  const cleaned = cleanName(name);
  if (!cleaned) return;
  const key = normalizeName(cleaned);
  if (!key) return;
  data[key] ||= { locations: [], evolution: "" };
  const label = [info.area, info.method && info.method !== "Herbes" ? info.method : "", info.rate, info.levels ? `niv. ${info.levels}` : ""]
    .filter(Boolean)
    .join(" - ");
  if (!data[key].locations.some((item) => item.label === label)) {
    data[key].locations.push({
      area: info.area,
      method: info.method,
      rate: info.rate,
      levels: info.levels,
      label
    });
  }
}

for (const rawLine of locationText.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line) continue;

  if (/^#\s*\d+\s*%/.test(line) || /^\d+\s*%$/.test(line)) {
    const match = line.match(/(\d+)\s*%/);
    rate = match ? `${match[1]}%` : "";
    continue;
  }

  if (/^[-•]?\s*(surf|canne|p[eê]che)\s*:?$/i.test(line)) {
    method = methodLabel(line);
    rate = "";
    continue;
  }

  if (/^[^,]+:\s*$/.test(line)) {
    const header = line.replace(/:$/, "").trim();
    if (methodWords.has(normalizeName(header))) {
      method = methodLabel(header);
    } else {
      area = header;
      method = "Herbes";
    }
    rate = "";
    continue;
  }

  const entry = line.replace(/^[-•\s]+/, "").trim();
  if (!entry) continue;
  const levelMatch = entry.match(/^(\d+)\s*,\s*(\d+)\s*,\s*(.+)$/);
  if (levelMatch) {
    addLocation(levelMatch[3], {
      area,
      method,
      rate,
      levels: levelMatch[1] === levelMatch[2] ? levelMatch[1] : `${levelMatch[1]}-${levelMatch[2]}`
    });
  } else if (!/^\d/.test(entry) && area) {
    addLocation(entry, { area, method, rate, levels: "" });
  }
}

for (const rawLine of evolutionText.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || /^Methode|^Méthode/i.test(line)) continue;
  const parts = line.split(":");
  if (parts.length < 2) continue;
  const namesPart = parts.shift();
  const evolution = parts.join(":").trim();
  const names = namesPart.split(/,| et /i).map(cleanName).filter(Boolean);
  for (const name of names) {
    const key = normalizeName(name);
    data[key] ||= { locations: [], evolution: "" };
    data[key].evolution = evolution;
  }
}

const aliases = {
  spetrum: "spectrum",
  saqdeneu: "saquedeneu",
  mystherb: "mystherbe",
  poisirene: "poissirene",
  feuforeve: "feuforeve"
};

for (const [from, to] of Object.entries(aliases)) {
  if (!data[from]) continue;
  data[to] ||= { locations: [], evolution: "" };
  for (const loc of data[from].locations || []) {
    if (!data[to].locations.some((item) => item.label === loc.label)) data[to].locations.push(loc);
  }
  if (data[from].evolution && !data[to].evolution) data[to].evolution = data[from].evolution;
}

for (const value of Object.values(data)) {
  value.locations = (value.locations || []).slice(0, 8);
  if (!value.evolution) delete value.evolution;
  if (!value.locations.length) delete value.locations;
}

fs.writeFileSync("src/reforged-guide-data.js", `const KANTO_REFORGED_GUIDE = ${JSON.stringify(data, null, 2)};\n`, "utf8");
console.log(`Generated ${Object.keys(data).length} guide entries.`);
