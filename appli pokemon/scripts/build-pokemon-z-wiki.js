const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { loadRubyMarshal } = require("./lib/ruby-marshal");

const dataDirectory = process.argv[2];
if (!dataDirectory) {
  throw new Error("Usage: node scripts/build-pokemon-z-wiki.js <repertoire-Data-du-jeu>");
}

const text = (value) => Buffer.isBuffer(value) ? value.toString("utf8") : String(value || "");
const readData = (name) => fs.readFileSync(path.join(dataDirectory, name));

function loadConstants() {
  const result = {};
  for (const section of loadRubyMarshal(readData("Constants.rxdata"))) {
    const source = zlib.inflateSync(section[2]).toString("utf8");
    result[text(section[1])] = new Map(
      [...source.matchAll(/^([A-Za-z][A-Za-z0-9_]*)\s*=\s*(\d+)\s*$/gm)]
        .map((match) => [match[1], Number(match[2])])
    );
  }
  return result;
}

function decodeVariableInteger(buffer, start) {
  let offset = start;
  let value = 0;
  let bits = 0;
  let byte;
  do {
    byte = buffer[offset];
    offset += 1;
    value += (byte & 0x7f) * (2 ** bits);
    bits += 7;
  } while ((byte & 0x80) && bits < 29);
  return [value, offset];
}

function loadSerialRecords(name) {
  const buffer = readData(name);
  const count = buffer.readUInt32LE(0) >> 3;
  const records = [];
  for (let index = 0; index < count; index += 1) {
    let offset = buffer.readUInt32LE(index * 8);
    const end = offset + buffer.readUInt32LE(index * 8 + 4);
    const record = [];
    while (offset < end) {
      const type = String.fromCharCode(buffer[offset]);
      offset += 1;
      if (type === "0") record.push(null);
      else if (type === "T") record.push(true);
      else if (type === "F") record.push(false);
      else if (type === "i") {
        let value;
        [value, offset] = decodeVariableInteger(buffer, offset);
        record.push(value);
      } else if (type === "\"") {
        let length;
        [length, offset] = decodeVariableInteger(buffer, offset);
        record.push(buffer.subarray(offset, offset + length).toString("utf8"));
        offset += length;
      } else {
        throw new Error(`Type SerialRecord non pris en charge : ${type}`);
      }
    }
    records.push(record);
  }
  return records;
}

function translatedHash(messages, index) {
  const values = messages[index]?.__value;
  if (!Array.isArray(values?.[0]) || !Array.isArray(values?.[1])) return new Map();
  return new Map(values[0].map((source, position) => [text(source), text(values[1][position])]));
}

function eventLocation(mapId, mapNames, mapInfos) {
  const current = text(mapNames[mapId]) || `Carte ${mapId}`;
  if (!/^(?:Maison|Centre Pokémon|Tente|Camp|Passerelle|Café.*|Chez.*)$/iu.test(current)) return current;
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

function pageScripts(page) {
  return (page["@list"] || [])
    .flatMap((command) => command["@parameters"] || [])
    .filter(Buffer.isBuffer)
    .map(text)
    .join("\n");
}

function machineSources(machineIds, itemConstants, mapNames, mapInfos) {
  const sources = new Map([...machineIds].map((id) => [id, []]));
  const patterns = [
    { method: "Objet à ramasser", regex: /\bpbItemBall\s*\(\s*(?:PBItems::|:)([A-Za-z][A-Za-z0-9_]*)/g },
    { method: "Don ou récompense", regex: /\bpbReceiveItem\s*\(\s*(?:PBItems::|:)([A-Za-z][A-Za-z0-9_]*)/g },
    { method: "Don ou récompense", regex: /\bpbStoreItem\s*\(\s*(?:PBItems::|:)([A-Za-z][A-Za-z0-9_]*)/g }
  ];
  for (let mapId = 1; mapId < mapNames.length; mapId += 1) {
    const filename = path.join(dataDirectory, `Map${String(mapId).padStart(3, "0")}.rxdata`);
    if (!fs.existsSync(filename)) continue;
    const map = loadRubyMarshal(fs.readFileSync(filename));
    for (const event of map["@events"]?.values() || []) {
      for (const page of event["@pages"] || []) {
        const script = pageScripts(page);
        const location = eventLocation(mapId, mapNames, mapInfos);
        for (const { method, regex } of patterns) {
          regex.lastIndex = 0;
          for (const match of script.matchAll(regex)) {
            const itemId = itemConstants.get(match[1]);
            if (!sources.has(itemId)) continue;
            const record = { method, location };
            if (!sources.get(itemId).some((entry) => entry.method === method && entry.location === location)) {
              sources.get(itemId).push(record);
            }
          }
        }
        for (const shop of script.matchAll(/\bpbPokemonMart\s*\(\s*\[([\s\S]*?)\]\s*\)/g)) {
          for (const item of shop[1].matchAll(/(?:PBItems::|:)([A-Za-z][A-Za-z0-9_]*)/g)) {
            const itemId = itemConstants.get(item[1]);
            if (!sources.has(itemId)) continue;
            const record = { method: "Boutique", location };
            if (!sources.get(itemId).some((entry) => entry.method === record.method && entry.location === location)) {
              sources.get(itemId).push(record);
            }
          }
        }
      }
    }
  }
  return sources;
}

function decodeWordArray(value) {
  const buffer = value?.__value;
  if (!Buffer.isBuffer(buffer)) return [];
  const result = [];
  for (let offset = 0; offset + 1 < buffer.length; offset += 2) result.push(buffer.readUInt16LE(offset));
  return result;
}

function buildMachines(messages, constants, mapInfos) {
  const itemRecords = loadSerialRecords("items.dat");
  const compatibility = loadRubyMarshal(readData("tm.dat"));
  const mapNames = messages[21] || [];
  const machineRecords = itemRecords.filter((record) => record[6] === 3 || record[6] === 4);
  const ids = new Set(machineRecords.map((record) => record[0]));
  const sources = machineSources(ids, constants.PBItems || new Map(), mapNames, mapInfos);
  const moveData = readData("moves.dat");
  const moveRecordSize = 14;
  return machineRecords.map((record) => {
    const moveId = record[9];
    const offset = moveId * moveRecordSize;
    const category = moveData[offset + 4];
    return {
      id: record[0],
      code: text(messages[7]?.[record[0]]).replace(/[.\s]+$/u, ""),
      kind: record[6] === 4 ? "CS" : "CT",
      moveId,
      move: text(messages[5]?.[moveId]) || `Capacité n°${moveId}`,
      description: text(messages[6]?.[moveId]),
      type: text(messages[12]?.[moveData[offset + 3]]) || "Inconnu",
      category: ["Physique", "Spéciale", "Statut"][category] || "Inconnue",
      power: moveData[offset + 2],
      accuracy: moveData[offset + 5],
      pp: moveData[offset + 6],
      compatibleSpeciesIds: [...new Set(decodeWordArray(compatibility[moveId]))],
      sources: sources.get(record[0]) || []
    };
  });
}

const LEADERS = [
  { typeId: 21, order: 1, specialty: "Combat", location: "Forteresse de Navarroc" },
  { typeId: 29, order: 2, specialty: "Spectre", location: "Forteresse de Savinion" },
  { typeId: 42, order: 3, specialty: "Électrik", location: "Forteresse d’Essience", note: "Les boutons optionnels modifient la puissance de son équipe." },
  { typeId: 52, order: 4, specialty: "Fée", location: "Forteresse d’Essience" },
  { typeId: 63, order: 5, specialty: "Eau et Vol", location: "Lévite-Or" },
  { typeId: 72, order: 6, specialty: "Poison", location: "Forteresse de Fort-Vanitas" },
  { typeId: 104, order: 7, specialty: "Psy", location: "Asile d’Hache-Âme" },
  { typeId: 111, order: 8, specialty: "Feu", location: "Forteresse de Romant-sous-Bois" },
  { typeId: 119, order: 9, specialty: "Roche", location: "Forteresse de Flusselles" },
  { typeId: 126, order: 10, specialty: "Glace", location: "Forteresse d’Auffrac-les-Congères" },
  { typeId: 139, order: 11, specialty: "Ténèbres", location: "Coulisses du Cirnique" },
  { typeId: 156, order: 12, specialty: "Insecte", location: "Toileries" }
];

const NATURES = [
  "Hardi", "Solo", "Brave", "Rigide", "Mauvais", "Assuré", "Docile", "Relax", "Malin", "Lâche",
  "Timide", "Pressé", "Sérieux", "Jovial", "Naïf", "Modeste", "Doux", "Discret", "Pudique", "Foufou",
  "Calme", "Gentil", "Malpoli", "Prudent", "Bizarre"
];

function buildLeaders(messages) {
  const trainers = loadRubyMarshal(readData("trainers.dat"));
  const trainerNames = translatedHash(messages, 14);
  return LEADERS.map((leader) => {
    const records = trainers.filter((record) => record[0] === leader.typeId);
    const sourceName = text(records[0]?.[1]);
    return {
      order: leader.order,
      name: trainerNames.get(sourceName) || sourceName,
      specialty: leader.specialty,
      location: leader.location,
      note: leader.note || "",
      levelCapAfterVictory: [27, 36, 42, 50, 56, 70, 75, 80, 85, 94, 100, 100][leader.order - 1],
      variants: records.map((record) => ({
        partyId: record[4],
        team: record[3].map((pokemon) => ({
          speciesId: pokemon[0],
          name: text(messages[1]?.[pokemon[0]]) || `Pokémon n°${pokemon[0]}`,
          level: pokemon[1],
          item: pokemon[2] ? text(messages[7]?.[pokemon[2]]) : "",
          moves: pokemon.slice(3, 7).filter(Boolean).map((move) => text(messages[5]?.[move])),
          form: pokemon[9] || 0,
          nature: pokemon[11] === null || pokemon[11] === undefined ? "" : NATURES[pokemon[11]] || "",
          iv: pokemon[12]
        }))
      }))
    };
  });
}

const mechanics = [
  {
    id: "level-cap",
    title: "Plafond de niveau",
    summary: "Le plafond progresse avec les victoires majeures. Une fois atteint, chaque gain est réduit à 1 point d’expérience.",
    details: ["Départ : niveau 17", "Puis : 27, 36, 42, 50, 56, 70, 75, 80, 85 et 94", "Fin de progression : niveau 100"]
  },
  {
    id: "iv",
    title: "IV et statistiques",
    summary: "Chaque statistique possède un IV compris entre 0 et 31. Plus il est élevé, plus le potentiel naturel du Pokémon est important.",
    details: ["Un IV est fixé à la création du Pokémon.", "La formule du jeu utilise directement l’IV avec les statistiques de base, le niveau et les EV.", "Dans le Pocodex, la couleur des étoiles donne une indication de leur qualité."]
  },
  {
    id: "ev",
    title: "EV et entraînement",
    summary: "Un Pokémon peut cumuler 510 EV au total, avec un maximum de 252 dans une même statistique.",
    details: ["Chaque tranche de 4 EV intervient dans le calcul de la statistique.", "Le Bracelet Macho double les EV gagnés.", "Les objets Pouvoir ajoutent 8 EV dans leur statistique.", "Le Pokérus double les EV, même après guérison."]
  },
  {
    id: "friendship",
    title: "Bonheur et affinité",
    summary: "Le bonheur varie de 0 à 255. Les évolutions par bonheur demandent au moins 220.",
    details: ["Tous les 128 pas, chaque Pokémon valide de l’équipe a 50 % de chances de gagner du bonheur.", "Monter de niveau, les vitamines, certaines baies et le toilettage augmentent le bonheur.", "La Luxe Ball ajoute 1 aux gains concernés ; le Grelot Zen les multiplie par 1,5.", "Un K.O. et les remèdes amers peuvent faire baisser le bonheur."]
  },
  {
    id: "mega-evolution",
    title: "Méga-Évolution et Lien",
    summary: "Le texte du jeu parle de Lien, mais la vérification technique repose sur la Méga-Gemme compatible et l’accès à la Méga-Évolution.",
    details: ["Une seule Méga-Évolution peut être enregistrée par dresseur et par combat.", "Le Pokémon doit posséder une forme Méga valide.", "Le bonheur n’est pas contrôlé par le code au moment de la transformation."]
  },
  {
    id: "day-night",
    title: "Jour et nuit",
    summary: "Le cycle n’est pas forcément visible à l’écran, mais le jeu utilise l’heure de l’ordinateur.",
    details: ["Certaines évolutions ne fonctionnent que de jour ou de nuit.", "Modifier l’heure du système peut donc modifier la condition reconnue par le jeu."]
  },
  {
    id: "technical-machines",
    title: "CT réutilisables",
    summary: "Les CT sont configurées comme utilisables à l’infini dans cette version.",
    details: ["Une CT n’est pas consommée après apprentissage.", "La compatibilité est propre aux données de Pokémon Z et peut différer des jeux officiels."]
  },
  {
    id: "field-moves",
    title: "Capacités de terrain",
    summary: "Les actions de terrain restent soumises à la progression, même lorsque leur accès passe par un outil ou une monture.",
    details: ["Coupe et Éclate-Roc : 1 victoire majeure", "Flash : 2", "Surf : 5", "Plongée : 7", "Cascade : 8"]
  }
];

const messages = loadRubyMarshal(readData("french.dat"));
const constants = loadConstants();
const mapInfos = loadRubyMarshal(readData("MapInfos.rxdata"));
const wiki = {
  version: "Pokémon Z v2.12 FR",
  generatedFrom: "Données internes compilées du jeu",
  levelCaps: [17, 27, 36, 42, 50, 56, 70, 75, 80, 85, 94, 100],
  machines: buildMachines(messages, constants, mapInfos),
  leaders: buildLeaders(messages),
  mechanics
};

const outputPath = path.resolve(__dirname, "../src/pokemon-z-wiki-data.js");
fs.writeFileSync(outputPath, `// Généré depuis les fichiers de Pokémon Z v2.12 FR.\nconst POKEMON_Z_WIKI_DATA = ${JSON.stringify(wiki, null, 2)};\n`, "utf8");
console.log(`Generated ${wiki.machines.length} machines, ${wiki.leaders.length} leaders and ${wiki.mechanics.length} mechanics.`);
