const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");
const { loadRubyMarshal } = require("./lib/ruby-marshal");

const dataDirectory = process.argv[2];
if (!dataDirectory) {
  throw new Error("Usage: node scripts/build-pokemon-z-compiled-guide.js <repertoire-Data-du-jeu>");
}

const ENCOUNTER_LABELS = [
  "Hautes herbes", "Grotte", "Surf", "Éclate-Roc", "Vieille Canne",
  "Bonne Canne", "Super Canne", "Coup d’Boule (arbres communs)",
  "Coup d’Boule (arbres rares)", "Hautes herbes (matin)",
  "Hautes herbes (jour)", "Hautes herbes (nuit)", "Concours de Capture d’insecte"
];

function readData(name) {
  return fs.readFileSync(path.join(dataDirectory, name));
}

function text(value) {
  return Buffer.isBuffer(value) ? value.toString("utf8") : String(value || "");
}

function loadCatalog() {
  const context = {};
  const source = fs.readFileSync(path.resolve(__dirname, "../src/pokemon-z-data.js"), "utf8");
  vm.runInNewContext(`${source}\nthis.catalog = POKEMON_Z_V212;`, context);
  return context.catalog;
}

function loadConstants() {
  const sections = loadRubyMarshal(readData("Constants.rxdata"));
  const result = {};
  for (const section of sections) {
    const group = text(section[1]);
    const source = zlib.inflateSync(section[2]).toString("utf8");
    result[group] = new Map(
      [...source.matchAll(/^([A-Za-z][A-Za-z0-9_]*)\s*=\s*(\d+)\s*$/gm)]
        .map((match) => [match[1], Number(match[2])])
    );
  }
  return result;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function formatLevels(minimum, maximum) {
  return minimum === maximum ? `niveau ${minimum}` : `niveaux ${minimum} à ${maximum}`;
}

function itemName(value) {
  return text(value)
    .replace(/^Superbe Pierre\s+/u, "Super Pierre ")
    .replace(/\bEclat\b/u, "Éclat");
}

function addMethod(guide, zIndex, method) {
  if (!zIndex) return;
  const id = `pokemon-z-${zIndex}`;
  guide[id] ||= { methods: [] };
  const key = `${method.kind}|${normalize(method.text)}`;
  if (!guide[id].methods.some((entry) => `${entry.kind}|${normalize(entry.text)}` === key)) {
    guide[id].methods.push(method);
  }
}

function buildEncounters(messages, constants, catalog) {
  const encounters = loadRubyMarshal(readData("encounters.dat"));
  const mapInfos = loadRubyMarshal(readData("MapInfos.rxdata"));
  const mapNames = messages[21] || [];
  const records = new Map();
  for (const [mapId, mapData] of encounters.entries()) {
    const location = text(mapNames[mapId]) || `Carte ${mapId}`;
    for (const [methodIndex, entries] of (mapData[1] || []).entries()) {
      if (!entries) continue;
      for (const [zIndex, minimum, maximum] of entries) {
        const key = `${zIndex}|${methodIndex}|${location}`;
        const current = records.get(key);
        records.set(key, {
          zIndex,
          methodIndex,
          location,
          minimum: current ? Math.min(current.minimum, minimum) : minimum,
          maximum: current ? Math.max(current.maximum, maximum) : maximum
        });
      }
    }
  }

  const groups = new Map();
  for (const record of records.values()) {
    const key = `${record.zIndex}|${record.methodIndex}`;
    if (!groups.has(key)) groups.set(key, { ...record, locations: [] });
    groups.get(key).locations.push(record);
  }

  const guide = {};
  for (const group of groups.values()) {
    group.locations.sort((left, right) => left.location.localeCompare(right.location, "fr", { numeric: true }));
    const label = ENCOUNTER_LABELS[group.methodIndex] || `Méthode ${group.methodIndex}`;
    addMethod(guide, group.zIndex, {
      kind: "capture",
      text: `${label} : ${group.locations.map((entry) => `${entry.location} (${formatLevels(entry.minimum, entry.maximum)})`).join(", ")}`,
      source: "Données internes de Pokémon Z v2.12 FR",
      confidence: "game-data"
    });
  }
  addScriptedEncounters(guide, mapNames, mapInfos, constants.PBSpecies || new Map());
  addScriptedAcquisitions(guide, mapNames, mapInfos, constants, messages, catalog);
  return guide;
}

function eventLocation(mapId, mapNames, mapInfos) {
  const current = text(mapNames[mapId]) || `Carte ${mapId}`;
  if (!/^(?:Maison|Centre Pokémon|Tente|Camp|Passerelle|Tour Maîtrise|Café.*|Chez.*)$/iu.test(current)) return current;
  let parentId = mapInfos.get(mapId)?.["@parent_id"];
  while (parentId) {
    const parent = text(mapNames[parentId]);
    if (parent && parent !== current && !/^(?:Maison|Centre Pokémon|Tente|Camp|Passerelle)$/iu.test(parent)) {
      return `${parent} — ${current}`;
    }
    parentId = mapInfos.get(parentId)?.["@parent_id"];
  }
  return current;
}

function addScriptedEncounters(guide, mapNames, mapInfos, speciesConstants) {
  const scripted = new Map();
  for (let mapId = 1; mapId < mapNames.length; mapId += 1) {
    const filename = path.join(dataDirectory, `Map${String(mapId).padStart(3, "0")}.rxdata`);
    if (!fs.existsSync(filename)) continue;
    const map = loadRubyMarshal(fs.readFileSync(filename));
    for (const event of map["@events"]?.values() || []) {
      for (const page of event["@pages"] || []) {
        const source = (page["@list"] || [])
          .filter((command) => command["@code"] === 355 || command["@code"] === 655)
          .map((command) => text(command["@parameters"]?.[0]))
          .join("\n");
        for (const match of source.matchAll(/pbWildBattle\s*\(\s*(?:PBSpecies::|:)([A-Za-z][A-Za-z0-9_]*)\s*,\s*(\d+)/g)) {
          const zIndex = speciesConstants.get(match[1]);
          if (!zIndex || (mapId === 2 && match[1] === "BIDOOF")) continue;
          const location = eventLocation(mapId, mapNames, mapInfos);
          const key = `${zIndex}|${location}`;
          if (!scripted.has(key)) scripted.set(key, { zIndex, location, levels: new Set() });
          scripted.get(key).levels.add(Number(match[2]));
        }
      }
    }
  }

  for (const record of scripted.values()) {
    const levels = [...record.levels].sort((left, right) => left - right);
    const levelText = levels.length === 1
      ? `niveau ${levels[0]}`
      : `niveaux ${levels.slice(0, -1).join(", ")} ou ${levels.at(-1)}`;
    addMethod(guide, record.zIndex, {
      kind: "capture",
      text: `Rencontre fixe : ${record.location} (${levelText})`,
      source: "Événements internes de Pokémon Z v2.12 FR",
      confidence: "game-data"
    });
  }
}

function addScriptedAcquisitions(guide, mapNames, mapInfos, constants, messages, catalog) {
  const speciesConstants = constants.PBSpecies || new Map();
  const itemConstants = constants.PBItems || new Map();
  const speciesNames = [null, ...catalog.map((pokemon) => pokemon.name)];
  const itemNames = messages[7] || [];
  for (let mapId = 1; mapId < mapNames.length; mapId += 1) {
    const filename = path.join(dataDirectory, `Map${String(mapId).padStart(3, "0")}.rxdata`);
    if (!fs.existsSync(filename)) continue;
    const map = loadRubyMarshal(fs.readFileSync(filename));
    for (const event of map["@events"]?.values() || []) {
      for (const page of event["@pages"] || []) {
        let requestedSpecies = null;
        let coinCost = null;
        let removesPokemon = false;
        let requiredItem = null;
        for (const command of page["@list"] || []) {
          const fragments = (command["@parameters"] || []).filter(Buffer.isBuffer).map(text);
          for (const fragment of fragments) {
            const request = fragment.match(/pokemonParty\[0\]\.species\s*==\s*PBSpecies::([A-Za-z][A-Za-z0-9_]*)/);
            if (request) requestedSpecies = request[1];
            const coins = fragment.match(/\$PokemonGlobal\.coins\s*>=\s*(\d+)/);
            if (coins) coinCost = Number(coins[1]);
            const item = fragment.match(/\$PokemonBag\.pbQuantity\s*\(\s*PBItems::([A-Za-z][A-Za-z0-9_]*)\s*\)\s*>\s*0/);
            if (item) requiredItem = item[1];
            if (/pbRemovePokemonAt\s*\(/.test(fragment)) removesPokemon = true;
            for (const match of fragment.matchAll(/\b(?:pbAddPokemon|pbAddToParty)\s*\(\s*(?:PBSpecies::|:)([A-Za-z][A-Za-z0-9_]*)\s*,\s*(\d+)/g)) {
              const zIndex = speciesConstants.get(match[1]);
              if (!zIndex) continue;
              const level = Number(match[2]);
              const location = eventLocation(mapId, mapNames, mapInfos);
              const targetName = text(speciesNames[zIndex]) || match[1];
              const requestedIndex = requestedSpecies ? speciesConstants.get(requestedSpecies) : null;
              const requestedName = requestedIndex ? text(speciesNames[requestedIndex]) : requestedSpecies;
              let kind = "gift";
              let methodText = `Recevoir ${targetName} à ${location} (niveau ${level}).`;
              if (requestedName || removesPokemon) {
                kind = "trade";
                methodText = requestedName
                  ? `Donner ${requestedName} à un PNJ — ${location} (${targetName} reçu au niveau ${level}).`
                  : `Échange avec un PNJ à ${location} (${targetName} reçu au niveau ${level}).`;
              } else if (coinCost !== null) {
                kind = "special";
                methodText = `Échanger ${coinCost} jetons au casino de ${location} contre ${targetName} (niveau ${level}).`;
              } else if (requiredItem && /FOSSIL|OLDAMBER/.test(requiredItem)) {
                const itemIndex = itemConstants.get(requiredItem);
                const rawItemName = itemName(itemNames[itemIndex]) || requiredItem;
                const fossilName = requiredItem === "HELIXFOSSIL" && !/^Fossile\b/iu.test(rawItemName)
                  ? `Fossile ${rawItemName}`
                  : rawItemName;
                kind = "fossil";
                methodText = `Confier ${fossilName} au spécialiste de ${location} pour recevoir ${targetName} (niveau ${level}).`;
              } else if (requiredItem === "ODDKEYSTONE") {
                const itemIndex = itemConstants.get(requiredItem);
                const requiredItemName = itemName(itemNames[itemIndex]) || "Clé de Voûte";
                kind = "special";
                methodText = `Confier ${requiredItemName} au spécialiste de ${location} pour recevoir ${targetName} (niveau ${level}).`;
              }
              addMethod(guide, zIndex, {
                kind,
                text: methodText,
                source: "Événements internes de Pokémon Z v2.12 FR",
                confidence: "game-data"
              });
              requestedSpecies = null;
              coinCost = null;
              removesPokemon = false;
              requiredItem = null;
            }
          }
        }
      }
    }
  }
}

function evolutionText(method, parameter, parentName, names) {
  const item = itemName(names.items[parameter]) || `objet n°${parameter}`;
  const move = text(names.moves[parameter]) || `capacité n°${parameter}`;
  const species = text(names.species[parameter]) || `Pokémon n°${parameter}`;
  const map = text(names.maps[parameter]) || `carte n°${parameter}`;
  switch (method) {
    case 1: return `Faire gagner un niveau à ${parentName} avec un bonheur d’au moins 220.`;
    case 2: return `Faire gagner un niveau à ${parentName} de jour avec un bonheur d’au moins 220.`;
    case 3: return `Faire gagner un niveau à ${parentName} de nuit avec un bonheur d’au moins 220.`;
    case 4:
    case 13: return `Faire monter ${parentName} au niveau ${parameter}.`;
    case 5: return `Échanger ${parentName}.`;
    case 6: return `Échanger ${parentName} pendant qu’il tient ${item}.`;
    case 7: return `Utiliser ${item} sur ${parentName}.`;
    case 8: return `Faire monter ${parentName} au niveau ${parameter} avec une Attaque supérieure à sa Défense.`;
    case 9: return `Faire monter ${parentName} au niveau ${parameter} avec une Attaque égale à sa Défense.`;
    case 10: return `Faire monter ${parentName} au niveau ${parameter} avec une Attaque inférieure à sa Défense.`;
    case 11:
    case 12: return `Faire monter ${parentName} au niveau ${parameter} ; l’évolution obtenue dépend de sa valeur de personnalité.`;
    case 14: return `Faire monter ${parentName} au niveau ${parameter} avec une place libre dans l’équipe et au moins une Poké Ball dans le Sac.`;
    case 15: return `Augmenter la Beauté de ${parentName} au-dessus de ${parameter}, puis lui faire gagner un niveau.`;
    case 16: return `Utiliser ${item} sur un ${parentName} mâle.`;
    case 17: return `Utiliser ${item} sur un ${parentName} femelle.`;
    case 18: return `Faire gagner un niveau à ${parentName} de jour pendant qu’il tient ${item}.`;
    case 19: return `Faire gagner un niveau à ${parentName} de nuit pendant qu’il tient ${item}.`;
    case 20: return `Faire gagner un niveau à ${parentName} alors qu’il connaît ${move}.`;
    case 21: return `Faire gagner un niveau à ${parentName} avec ${species} dans l’équipe.`;
    case 22: return `Faire monter un ${parentName} mâle au niveau ${parameter}.`;
    case 23: return `Faire monter un ${parentName} femelle au niveau ${parameter}.`;
    case 24: return `Faire gagner un niveau à ${parentName} à ${map}.`;
    case 25: return `Échanger ${parentName} contre ${species}.`;
    case 26: return `Faire monter ${parentName} au niveau ${parameter} de jour.`;
    case 27: return `Faire monter ${parentName} au niveau ${parameter} de nuit.`;
    case 28: return `Faire monter ${parentName} au niveau ${parameter} avec un Pokémon Ténèbres dans l’équipe.`;
    case 29: return `Faire monter ${parentName} au niveau ${parameter} sous la pluie.`;
    case 30: return `Faire gagner un niveau à ${parentName} avec un bonheur élevé et une capacité de type ${text(names.types[parameter])}.`;
    default: return `Condition spéciale interne n°${method} (paramètre ${parameter}) pour faire évoluer ${parentName}.`;
  }
}

function buildEvolutions(messages, catalog) {
  const binary = readData("evolutions.dat");
  const names = {
    species: [null, ...catalog.map((pokemon) => pokemon.name)],
    moves: messages[5] || [],
    items: messages[7] || [],
    types: messages[12] || [],
    maps: messages[21] || []
  };
  const guide = {};
  for (let parent = 1; parent <= catalog.length; parent += 1) {
    const tableOffset = (parent - 1) * 8;
    const offset = binary.readUInt32LE(tableOffset);
    const length = binary.readUInt32LE(tableOffset + 4);
    for (let position = offset; position < offset + length; position += 5) {
      const encodedMethod = binary[position];
      if ((encodedMethod & 0xc0) !== 0) continue;
      const method = encodedMethod & 0x3f;
      const parameter = binary.readUInt16LE(position + 1);
      const target = binary.readUInt16LE(position + 3);
      const parentName = catalog[parent - 1]?.name || text(names.species[parent]) || `Pokémon n°${parent}`;
      addMethod(guide, target, {
        kind: "evolution",
        text: evolutionText(method, parameter, parentName, names),
        source: "Données internes de Pokémon Z v2.12 FR",
        confidence: "game-data",
        evolvesFrom: `pokemon-z-${parent}`
      });
    }
  }
  return guide;
}

const catalog = loadCatalog();
const constants = loadConstants();
if ((constants.PBSpecies?.size || 0) !== catalog.length) {
  throw new Error(`Catalogue incompatible : ${catalog.length} entrées dans l’app, ${constants.PBSpecies?.size || 0} dans le jeu.`);
}
const messages = loadRubyMarshal(readData("french.dat"));
const encounters = buildEncounters(messages, constants, catalog);
const evolutions = buildEvolutions(messages, catalog);
const output = [
  "// Généré depuis les fichiers compilés de Pokémon Z v2.12 FR.",
  `const POKEMON_Z_V212_ENCOUNTERS = ${JSON.stringify(encounters, null, 2)};`,
  "",
  `const POKEMON_Z_V212_EVOLUTIONS = ${JSON.stringify(evolutions, null, 2)};`,
  ""
].join("\n");
const outputPath = path.resolve(__dirname, "../src/pokemon-z-v212-encounter-data.js");
fs.writeFileSync(outputPath, output, "utf8");
console.log(`Generated ${Object.keys(encounters).length} encounter entries and ${Object.keys(evolutions).length} evolution entries.`);
