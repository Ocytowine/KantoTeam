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

function getKind(text) {
  const value = normalize(text);
  if (/trade|exchange| for a | for an /.test(value)) return "trade";
  if (/evolve|evolution|level up/.test(value)) return "evolution";
  if (/breed|egg/.test(value)) return "breeding";
  if (/fossil|revive/.test(value)) return "fossil";
  if (/gift|given|receive|reward/.test(value)) return "gift";
  if (/capture|catch|obtainable|route|cave|town|city|forest|swamp|island|sanctuary|laboratory|workshop/.test(value)) return "capture";
  return "special";
}

function translateMethod(text) {
  return String(text || "")
    .replace(/How to obtain:\s*/gi, "")
    .replace(/Evolves? from/gi, "Évolue depuis")
    .replace(/Evolves? at/gi, "Évolue au")
    .replace(/at [Ll]evel/gi, "au niveau")
    .replace(/with a[n]? /gi, "avec ")
    .replace(/Trade for a[n]? /gi, "Échanger ")
    .replace(/Trade a[n]? /gi, "Échanger ")
    .replace(/Obtainable by breeding/gi, "Obtenu par reproduction de")
    .replace(/Obtained by breeding/gi, "Obtenu par reproduction de")
    .replace(/Obtainable (?:on|in|at) /gi, "Capturable : ")
    .replace(/Capturable (?:on|in|at) /gi, "Capturable : ")
    .replace(/Location:\s*/gi, "Lieu : ")
    .replace(/Requirement:\s*/gi, "Condition : ")
    .replace(/after /gi, "après ")
    .replace(/during /gi, "pendant ")
    .replace(/ or /gi, " ou ")
    .replace(/ and /gi, " et ")
    .replace(/\bat\b/gi, "a")
    .replace(/\bin\b/gi, "dans")
    .replace(/\bon\b/gi, "sur")
    .replace(/\bafter defeating\b/gi, "apres avoir vaincu")
    .replace(/\bafter completing\b/gi, "apres avoir termine")
    .replace(/\busing\b/gi, "avec")
    .replace(/\bfrom\b/gi, "depuis")
    .replace(/\s+/g, " ")
    .trim();
}

function addMethod(guide, pokemon, text, source, confidence = "documented") {
  if (!pokemon || !text) return;
  const record = {
    kind: getKind(text),
    text: translateMethod(text),
    source: source.label,
    sourceUrl: source.url,
    confidence
  };
  guide[pokemon.id] ||= { methods: [] };
  const key = `${record.kind}|${normalize(record.text)}`;
  if (!guide[pokemon.id].methods.some((item) => `${item.kind}|${normalize(item.text)}` === key)) {
    guide[pokemon.id].methods.push(record);
  }
}

async function main() {
  const catalog = loadCatalog();
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

  const output = `// Donnees d'obtention compilees pour Pokemon Z v2.12.\nconst POKEMON_Z_GUIDE = ${JSON.stringify(guide, null, 2)};\n\nconst POKEMON_Z_GLOBAL_NOTES = ${JSON.stringify(globalNotes, null, 2)};\n`;
  const outputPath = path.resolve(__dirname, "../src/pokemon-z-guide-data.js");
  fs.writeFileSync(outputPath, output, "utf8");
  console.log(`Generated ${Object.keys(guide).length}/${catalog.length} guide entries (${unresolved.length} unresolved rows).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
