const fs = require("fs");
const path = require("path");

const sourcePath = process.argv[2];
if (!sourcePath) {
  throw new Error("Usage: node scripts/build-pokemon-z-data.js <chemin-vers-PBS/pokemon.txt>");
}

const TYPE_NAMES = {
  BUG: "Insecte",
  DARK: "Tenebres",
  DRAGON: "Dragon",
  ELECTRIC: "Electrik",
  FAIRY: "Fee",
  FIGHTING: "Combat",
  FIRE: "Feu",
  FLYING: "Vol",
  GHOST: "Spectre",
  GRASS: "Plante",
  GROUND: "Sol",
  ICE: "Glace",
  NORMAL: "Normal",
  POISON: "Poison",
  PSYCHIC: "Psy",
  ROCK: "Roche",
  STEEL: "Acier",
  WATER: "Eau"
};

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

async function getOfficialPokemonData() {
  const [speciesResponse, namesResponse] = await Promise.all([
    fetch("https://pokeapi.co/api/v2/pokemon-species?limit=2000"),
    fetch("https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv")
  ]);
  if (!speciesResponse.ok) throw new Error(`PokeAPI: ${speciesResponse.status}`);
  if (!namesResponse.ok) throw new Error(`PokeAPI names: ${namesResponse.status}`);
  const payload = await speciesResponse.json();
  const idsByName = payload.results.reduce((ids, pokemon) => {
    const id = Number(pokemon.url.match(/\/(\d+)\/$/)?.[1]);
    if (id) ids[normalize(pokemon.name)] = id;
    return ids;
  }, {});
  const frenchNames = {};
  for (const line of (await namesResponse.text()).split(/\r?\n/)) {
    const match = line.match(/^(\d+),5,("(?:[^"]|"")*"|[^,]*),/);
    if (!match) continue;
    frenchNames[Number(match[1])] = match[2].replace(/^"|"$/g, "").replace(/""/g, "\"");
  }
  return { idsByName, frenchNames };
}

async function main() {
  const source = fs.readFileSync(sourcePath, "utf8");
  const headers = [...source.matchAll(/(?:^\uFEFF?|\r?\n)\[(\d+)\]\r?\n/g)];
  const blocks = headers.map((header, index) => ({
    zIndex: Number(header[1]),
    body: source.slice(header.index + header[0].length, headers[index + 1]?.index ?? source.length)
  }));
  const { idsByName, frenchNames } = await getOfficialPokemonData();
  const pokemon = blocks.map(({ zIndex, body }) => {
    const read = (field) => body.match(new RegExp(`^${field}=(.*)$`, "m"))?.[1].trim() || "";
    const sourceName = read("Name");
    const nationalId = zIndex <= 898 ? zIndex : idsByName[normalize(sourceName)] || null;
    const types = [read("Type1"), read("Type2")].filter(Boolean).map((type) => {
      if (!TYPE_NAMES[type]) throw new Error(`Type inconnu pour ${sourceName}: ${type}`);
      return TYPE_NAMES[type];
    });
    return {
      id: `pokemon-z-${zIndex}`,
      name: nationalId ? frenchNames[nationalId] || sourceName : sourceName,
      types,
      nationalId,
      custom: false,
      origin: "pokemon-z"
    };
  });

  const outputPath = path.resolve(__dirname, "../src/pokemon-z-data.js");
  const banner = "// Genere depuis PBS/pokemon.txt de Pokemon Z v2.12 Patch 1 (version francaise).\n";
  fs.writeFileSync(outputPath, `${banner}const POKEMON_Z_V212 = ${JSON.stringify(pokemon, null, 2)};\n`, "utf8");
  console.log(`Generated ${pokemon.length} Pokemon Z entries in ${outputPath}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
