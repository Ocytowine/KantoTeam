const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SOURCES = [
  ...Array.from({ length: 9 }, (_, index) => ({
    url: `https://pokemonzfangame.com/gen-${index + 1}-pokemon-location${index === 0 ? "s" : ""}/`,
    label: `Guide Pokemon Z - Generation ${index + 1}`,
    indexed: true
  })),
  {
    url: "https://pokemonzfangame.com/all-new-fakemon-locations/",
    label: "Guide Pokemon Z - Fakemon",
    indexed: true
  },
  {
    url: "https://pokemonzfangame.com/all-legendary-pokemon-locations/",
    label: "Guide Pokemon Z - Legendaires",
    indexed: false
  }
];

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/♀/g, " f ")
    .replace(/♂/g, " m ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function decodeHtml(value) {
  const entities = {
    amp: "&", apos: "'", quot: '"', nbsp: " ", ndash: "-", mdash: "-",
    rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", eacute: "é", Eacute: "É"
  };
  return String(value || "")
    .replace(/<br\s*\/?\s*>/gi, " / ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name] ?? match)
    .replace(/\s+/g, " ")
    .trim();
}

function parseRows(html) {
  return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((row) => [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => decodeHtml(cell[1])))
    .filter((cells) => cells.length >= 3);
}

function loadCatalog() {
  const context = {};
  const dataPath = path.resolve(__dirname, "../src/pokemon-z-data.js");
  vm.runInNewContext(`${fs.readFileSync(dataPath, "utf8")}\nthis.catalog = POKEMON_Z_V212;`, context);
  return context.catalog;
}

async function loadOfficialPokemonNames() {
  const response = await fetch("https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv");
  if (!response.ok) throw new Error(`PokeAPI names: ${response.status}`);
  const names = {};
  for (const line of (await response.text()).split(/\r?\n/)) {
    const match = line.match(/^(\d+),(5|9),("(?:[^"]|"")*"|[^,]*),/);
    if (!match) continue;
    const id = Number(match[1]);
    const language = match[2] === "5" ? "fr" : "en";
    names[id] ||= {};
    names[id][language] = match[3].replace(/^"|"$/g, "").replace(/""/g, '"');
  }
  return names;
}

function getKind(text) {
  const value = normalize(text);
  if (/trade|exchange| for a | for an /.test(value)) return "trade";
  if (/evolve|evolution|level up|friendship|happiness|\bstone\b/.test(value)) return "evolution";
  if (/breed|egg/.test(value)) return "breeding";
  if (/fossil|revive/.test(value)) return "fossil";
  if (/gift|given|receive|reward/.test(value)) return "gift";
  if (/capture|capturable|catch|obtainable|route|cave|cavern|town|city|forest|swamp|island|isle|sanctuary|laboratory|workshop|forge|catacomb|chateau|bastion|seafloor|coast|station|orchard|grotto|crypt|lighthouse|pyrenees|vanitas|luminalia|villa|village|factory|hill|abyss|chasm|prison|library|cathedral|lake|circus|tower|exhibition|chamber/.test(value)) return "capture";
  return "special";
}

function translateMethod(text) {
  return String(text || "")
    .replace(/How to obtain:\s*/gi, "")
    .replace(/Obtainable by breeding/gi, "Obtenu par reproduction de")
    .replace(/Obtained by breeding/gi, "Obtenu par reproduction de")
    .replace(/Breed(?:ing)? from/gi, "Obtenu par reproduction de")
    .replace(/^Breeding\s+/gi, "Obtenu par reproduction de ")
    .replace(/^Breeding$/gi, "Reproduction")
    .replace(/Obtainable (?:on|in|at) /gi, "Capturable : ")
    .replace(/Capturable (?:on|in|at) /gi, "Capturable : ")
    .replace(/\bCatchable\b/gi, "Capturable")
    .replace(/\bObtained\b/gi, "Obtenu")
    .replace(/\bObtainable\b/gi, "Disponible")
    .replace(/Evolves? from/gi, "Évolue depuis")
    .replace(/Evolves? at(?: [Ll]evel)?/gi, "Évolue au niveau")
    .replace(/\bEvolve\b/gi, "Faire évoluer")
    .replace(/\bevolves\b/gi, "évolue")
    .replace(/at [Ll]evel/gi, "au niveau")
    .replace(/\bat (\d+)\b/gi, "au niveau $1")
    .replace(/with a[n]? /gi, "avec ")
    .replace(/Trade for a[n]? /gi, "Échanger ")
    .replace(/Trade a[n]? /gi, "Échanger ")
    .replace(/\bTradeable\b/gi, "Échangeable")
    .replace(/\bTrade for\b/gi, "Échange contre")
    .replace(/\bTrade\b/gi, "Échange")
    .replace(/\bExchange for\b/gi, "Échange contre")
    .replace(/Location:\s*/gi, "Lieu : ")
    .replace(/Requirement:\s*/gi, "Condition : ")
    .replace(/\bEmpty party slot\b/gi, "Une place libre dans l'équipe")
    .replace(/\bWater Stone\b/gi, "Pierre Eau")
    .replace(/\bLeaf Stone\b/gi, "Pierre Plante")
    .replace(/\bMoon Stone\b/gi, "Pierre Lune")
    .replace(/\bSun Stone\b/gi, "Pierre Soleil")
    .replace(/\bShiny Stone\b/gi, "Pierre Éclat")
    .replace(/\bDusk Stone\b/gi, "Pierre Nuit")
    .replace(/\bDawn Stone\b/gi, "Pierre Aube")
    .replace(/\bIce Stone\b/gi, "Pierre Glace")
    .replace(/\bFire Stone\b/gi, "Pierre Feu")
    .replace(/\bThunder Stone\b/gi, "Pierre Foudre")
    .replace(/\bOval Stone\b/gi, "Pierre Ovale")
    .replace(/\bDay Stone\b/gi, "Pierre Jour")
    .replace(/\bNight Stone\b/gi, "Pierre Nuit")
    .replace(/\bKing[’']s Rock\b/gi, "Roche Royale")
    .replace(/\bHelix Fossil\b/gi, "Fossile Nautile")
    .replace(/\bDome Fossil\b/gi, "Fossile Dôme")
    .replace(/\bRoot Fossil\b/gi, "Fossile Racine")
    .replace(/\bClaw Fossil\b/gi, "Fossile Griffe")
    .replace(/\bby friendship\b/gi, "avec un bonheur élevé")
    .replace(/\bby happiness\b/gi, "avec un bonheur élevé")
    .replace(/\bby leveling up once\b/gi, "en gagnant un niveau")
    .replace(/\bFriendship Evolution\b/gi, "Évolution par bonheur")
    .replace(/\bFriendship \+ Daytime level\b/gi, "Bonheur élevé + gain de niveau de jour")
    .replace(/\bfriendship\b/gi, "bonheur élevé")
    .replace(/\bhappiness\b/gi, "bonheur élevé")
    .replace(/\bduring the day\b/gi, "pendant la journée")
    .replace(/\bat night\b/gi, "de nuit")
    .replace(/\bwhen\b/gi, "lorsque")
    .replace(/\bUse\b/gi, "Utiliser")
    .replace(/\bafter defeating\b/gi, "après avoir vaincu")
    .replace(/\bafter completing\b/gi, "après avoir terminé")
    .replace(/\bafter returning\b/gi, "après avoir rendu")
    .replace(/after /gi, "après ")
    .replace(/during /gi, "pendant ")
    .replace(/ or /gi, " ou ")
    .replace(/ and /gi, " et ")
    .replace(/\bat\b/gi, "à")
    .replace(/\bin\b/gi, "dans")
    .replace(/\bon\b/gi, "sur")
    .replace(/\bwith\b/gi, "avec")
    .replace(/\busing\b/gi, "avec")
    .replace(/\bfrom\b/gi, "depuis")
    .replace(/\bfor an?\b/gi, "contre")
    .replace(/\bfor\b/gi, "contre")
    .replace(/\bby\b/gi, "avec")
    .replace(/\bknowing\b/gi, "en connaissant")
    .replace(/\breturning\b/gi, "avoir rendu")
    .replace(/\bmale\b/gi, "mâle")
    .replace(/\bfemale\b/gi, "femelle")
    .replace(/\s+/g, " ")
    .trim();
}

// Le guide regroupe souvent deux vérités dans une même cellule, par exemple
// "Route 14 or evolve at 21". Les séparer permet aux rencontres internes de
// remplacer uniquement le lieu web, sans supprimer la condition d'évolution.
function splitMethods(text) {
  return String(text || "")
    .split(/\s+(?:or|\/)\s+(?=(?:evolves?|evolution|friendship|happiness|use\b|[a-z]+\s+stone\b))/gi)
    .map((method) => method.trim())
    .filter(Boolean);
}

function addMethod(guide, pokemon, text, source, confidence = "documented") {
  if (!pokemon || !text) return;
  guide[pokemon.id] ||= { methods: [] };
  const methods = splitMethods(text);
  for (const [index, method] of methods.entries()) {
    const detectedKind = getKind(method);
    const record = {
      kind: methods.length > 1 && index === 0 && detectedKind === "special" ? "capture" : detectedKind,
      text: translateMethod(method),
      source: source.label,
      sourceUrl: source.url,
      confidence
    };
    const key = `${record.kind}|${normalize(record.text)}`;
    if (!guide[pokemon.id].methods.some((item) => `${item.kind}|${normalize(item.text)}` === key)) {
      guide[pokemon.id].methods.push(record);
    }
  }
}

async function main() {
  const catalog = loadCatalog();
  const officialNames = await loadOfficialPokemonNames();
  const byName = new Map();
  for (const pokemon of catalog) {
    byName.set(normalize(pokemon.name), pokemon);
    byName.set(normalize(pokemon.name.replace(/\s*\(.*?\)\s*/g, "")), pokemon);
  }

  const guide = {};
  const unresolved = [];
  for (const source of SOURCES) {
    const response = await fetch(source.url);
    if (!response.ok) throw new Error(`${source.url}: ${response.status}`);
    const rows = parseRows(await response.text());
    for (const cells of rows) {
      if (source.indexed) {
        const zIndex = Number(String(cells[0]).match(/\d+/)?.[0]);
        if (!zIndex) continue;
        const pokemon = catalog.find((item) => item.id === `pokemon-z-${zIndex}`);
        if (!pokemon) {
          unresolved.push({ source: source.url, cells });
          continue;
        }
        addMethod(guide, pokemon, cells.slice(2).join(" - "), source);
      } else {
        const rawName = cells[1]?.replace(/\s*\([^)]*\)\s*/g, "").trim();
        const pokemon = byName.get(normalize(rawName));
        if (!pokemon) continue;
        addMethod(guide, pokemon, cells.slice(2).join(" - "), source, "cross-checked");
      }
    }
  }

  const globalNotes = [
    {
      kind: "trade",
      title: "Le Prodige",
      text: "Le Pokemon proposé dépend de l'offre et d'un tirage mémorisé par la sauvegarde. Refuser puis recharger conserve la proposition ; accepter fait évoluer la sélection lors d'une tentative suivante.",
      locations: ["Route 4", "Ville Profane", "Chateau Lento", "Fort Leviathan", "Route 12", "Bourg Acrylique après recrutement"],
      confidence: "community",
      sourceUrl: "https://www.reddit.com/r/PokemonZTheFangame/comments/1k5lbhs/regional_variants_locationevolutiontypes/"
    },
    {
      kind: "time",
      title: "Évolutions jour/nuit",
      text: "Les conditions de jour et de nuit utilisent l'horloge de l'appareil ; l'apparence du jeu ne montre pas nécessairement la nuit.",
      confidence: "documented",
      sourceUrl: "https://pokemonzfangame.com/gen-1-pokemon-locations/"
    },
    {
      kind: "breeding",
      title: "Reproduction",
      text: "Pour les obtentions par reproduction documentées, les parents ne doivent tenir aucun objet.",
      confidence: "documented",
      sourceUrl: "https://pokemonzfangame.com/gen-1-pokemon-locations/"
    }
  ];

  const pokemonNames = catalog
    .filter((pokemon) => pokemon.nationalId && officialNames[pokemon.nationalId]?.en)
    .map((pokemon) => ({
      source: officialNames[pokemon.nationalId].en,
      nationalId: pokemon.nationalId
    }));
  const output = `// Donnees d'obtention compilees pour Pokemon Z v2.12.\nconst POKEMON_Z_GUIDE = ${JSON.stringify(guide, null, 2)};\n\n// Noms anglais susceptibles d'etre cites par le guide, relies au catalogue FR.\nconst POKEMON_Z_GUIDE_POKEMON_NAMES = ${JSON.stringify(pokemonNames, null, 2)};\n\nconst POKEMON_Z_GLOBAL_NOTES = ${JSON.stringify(globalNotes, null, 2)};\n`;
  const outputPath = path.resolve(__dirname, "../src/pokemon-z-guide-data.js");
  fs.writeFileSync(outputPath, output, "utf8");
  console.log(`Generated ${Object.keys(guide).length}/${catalog.length} guide entries (${unresolved.length} unresolved rows).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
