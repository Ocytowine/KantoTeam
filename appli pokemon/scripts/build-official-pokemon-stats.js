const fs = require("fs");
const path = require("path");

const STATS_URL = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_stats.csv";
const SPECIES_URL = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species.csv";
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
  const [response, speciesResponse] = await Promise.all([fetch(STATS_URL), fetch(SPECIES_URL)]);
  if (!response.ok) throw new Error(`PokeAPI stats: ${response.status}`);
  if (!speciesResponse.ok) throw new Error(`PokeAPI species: ${speciesResponse.status}`);
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
  const specialIds = [];
  for (const line of (await speciesResponse.text()).split(/\r?\n/).slice(1)) {
    const columns = line.split(",");
    const pokemonId = Number(columns[0]);
    if (pokemonId && pokemonId <= MAX_NATIONAL_ID && (columns[16] === "1" || columns[17] === "1")) {
      specialIds.push(pokemonId);
    }
  }
  const classificationPath = path.resolve(__dirname, "../src/official-pokemon-classification.js");
  const classificationBanner = "// Pokemon legendaires et fabuleux generes depuis pokemon_species.csv de PokeAPI.\n";
  fs.writeFileSync(
    classificationPath,
    `${classificationBanner}const OFFICIAL_LEGENDARY_OR_MYTHICAL_IDS = new Set(${JSON.stringify(specialIds)});\n`,
    "utf8"
  );
  console.log(`Generated ${Object.keys(completeStats).length} stat entries and ${specialIds.length} legendary/mythical classifications.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
