const fs = require("fs");
const path = require("path");

const STATS_URL = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_stats.csv";
const MAX_NATIONAL_ID = 1025;
const STAT_KEYS = {
  1: "hp",
  2: "attack",
  3: "defense",
  4: "specialAttack",
  5: "specialDefense",
  6: "speed"
};

async function main() {
  const response = await fetch(STATS_URL);
  if (!response.ok) throw new Error(`PokeAPI stats: ${response.status}`);
  const stats = {};
  for (const line of (await response.text()).split(/\r?\n/).slice(1)) {
    const [rawPokemonId, rawStatId, rawBaseStat] = line.split(",");
    const pokemonId = Number(rawPokemonId);
    const statKey = STAT_KEYS[Number(rawStatId)];
    if (!statKey || !pokemonId || pokemonId > MAX_NATIONAL_ID) continue;
    stats[pokemonId] ||= {};
    stats[pokemonId][statKey] = Number(rawBaseStat);
  }

  const completeStats = Object.fromEntries(Object.entries(stats).filter(([, values]) => (
    Object.values(STAT_KEYS).every((key) => Number.isInteger(values[key]))
  )));
  const outputPath = path.resolve(__dirname, "../src/official-pokemon-stats.js");
  const banner = "// Statistiques de base officielles generees depuis les donnees PokeAPI.\n";
  fs.writeFileSync(outputPath, `${banner}const OFFICIAL_POKEMON_STATS = ${JSON.stringify(completeStats)};\n`, "utf8");
  console.log(`Generated ${Object.keys(completeStats).length} official Pokemon stat entries.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
