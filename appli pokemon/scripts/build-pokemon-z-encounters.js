const fs = require("fs");
const path = require("path");

const [encountersPath, pokemonPath, mapNamesPath] = process.argv.slice(2);
if (!encountersPath || !pokemonPath || !mapNamesPath) {
  throw new Error("Usage: node scripts/build-pokemon-z-encounters.js <encounters.txt> <pokemon.txt> <map-names.json>");
}

const METHOD_LABELS = {
  Land: "Hautes herbes",
  LandMorning: "Hautes herbes (matin)",
  LandDay: "Hautes herbes (jour)",
  LandNight: "Hautes herbes (nuit)",
  Cave: "Grotte",
  Water: "Surf",
  OldRod: "Vieille Canne",
  GoodRod: "Bonne Canne",
  SuperRod: "Super Canne",
  RockSmash: "Éclate-Roc",
  Headbutt: "Coup d'Boule"
};

function parsePokemon(source) {
  const byInternalName = new Map();
  const blocks = [...source.matchAll(/(?:^\uFEFF?|\r?\n)\[(\d+)\]\r?\n([\s\S]*?)(?=\r?\n\[\d+\]|$)/g)];
  for (const block of blocks) {
    const internalName = block[2].match(/^InternalName=(.*)$/m)?.[1].trim();
    if (internalName) byInternalName.set(internalName, Number(block[1]));
  }
  return byInternalName;
}

function parseEncounters(source, byInternalName, mapNames) {
  const records = new Map();
  const unresolved = new Set();
  const sections = source.split(/^#{10,}\s*$/m).map((part) => part.trim()).filter(Boolean);
  for (const section of sections) {
    const lines = section.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const header = lines.shift()?.match(/^(\d+)\s*(?:#.*)?$/);
    if (!header || !lines.length) continue;
    const mapId = Number(header[1]);
    const location = mapNames[String(mapId)] || `Carte ${mapId}`;
    lines.shift(); // Frequences de rencontre, inutiles pour l'affichage.
    let method = null;
    for (const line of lines) {
      if (/^[A-Za-z][A-Za-z0-9_]*$/.test(line)) {
        method = line;
        continue;
      }
      const encounter = line.match(/^([A-Za-z0-9_]+),(\d+),(\d+)$/);
      if (!method || !encounter) continue;
      const zIndex = byInternalName.get(encounter[1]);
      if (!zIndex) {
        unresolved.add(encounter[1]);
        continue;
      }
      const key = `${zIndex}|${method}|${location}`;
      const minLevel = Number(encounter[2]);
      const maxLevel = Number(encounter[3]);
      const current = records.get(key);
      records.set(key, {
        zIndex,
        method,
        location,
        minLevel: current ? Math.min(current.minLevel, minLevel) : minLevel,
        maxLevel: current ? Math.max(current.maxLevel, maxLevel) : maxLevel
      });
    }
  }
  return { records: [...records.values()], unresolved: [...unresolved] };
}

function formatLevels(minLevel, maxLevel) {
  return minLevel === maxLevel ? `niveau ${minLevel}` : `niveaux ${minLevel} à ${maxLevel}`;
}

function buildGuide(records) {
  const grouped = new Map();
  for (const record of records) {
    const key = `${record.zIndex}|${record.method}`;
    if (!grouped.has(key)) grouped.set(key, { zIndex: record.zIndex, method: record.method, locations: [] });
    grouped.get(key).locations.push(record);
  }
  const guide = {};
  for (const group of grouped.values()) {
    group.locations.sort((left, right) => left.location.localeCompare(right.location, "fr", { numeric: true }));
    const label = METHOD_LABELS[group.method] || group.method;
    const text = `${label} : ${group.locations.map((item) => `${item.location} (${formatLevels(item.minLevel, item.maxLevel)})`).join(", ")}`;
    const id = `pokemon-z-${group.zIndex}`;
    guide[id] ||= { methods: [] };
    guide[id].methods.push({
      kind: "capture",
      text,
      source: "Donnees internes Pokemon Z v2.12 FR",
      confidence: "game-data"
    });
  }
  return guide;
}

const encounters = fs.readFileSync(encountersPath, "utf8");
const pokemon = fs.readFileSync(pokemonPath, "utf8");
const mapNames = JSON.parse(fs.readFileSync(mapNamesPath, "utf8"));
const { records, unresolved } = parseEncounters(encounters, parsePokemon(pokemon), mapNames);
const guide = buildGuide(records);
const outputPath = path.resolve(__dirname, "../src/pokemon-z-v212-encounter-data.js");
const banner = "// Rencontres sauvages generees depuis PBS/encounters.txt et MapInfos.rxdata de Pokemon Z v2.12 Patch 1 FR.\n";
fs.writeFileSync(outputPath, `${banner}const POKEMON_Z_V212_ENCOUNTERS = ${JSON.stringify(guide, null, 2)};\n`, "utf8");
console.log(`Generated ${Object.keys(guide).length} encounter entries (${records.length} location/method records, ${unresolved.length} unresolved species).`);
if (unresolved.length) console.log(`Unresolved: ${unresolved.join(", ")}`);
