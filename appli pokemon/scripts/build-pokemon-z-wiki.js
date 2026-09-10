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

function loadGameScripts() {
  return new Map(loadRubyMarshal(readData("Scripts.rxdata")).map((section) => [
    text(section[1]),
    zlib.inflateSync(section[2]).toString("utf8")
  ]));
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

function buildMoveDex(messages) {
  const moveData = readData("moves.dat");
  const moveRecordSize = 14;
  const moveCount = Math.floor(moveData.length / moveRecordSize);
  const moves = {};
  for (let moveId = 1; moveId < moveCount; moveId += 1) {
    const offset = moveId * moveRecordSize;
    const name = text(messages[5]?.[moveId]);
    if (!name) continue;
    moves[moveId] = {
      name,
      description: text(messages[6]?.[moveId]),
      type: text(messages[12]?.[moveData[offset + 3]]) || "Inconnu",
      category: ["Physique", "Spéciale", "Statut"][moveData[offset + 4]] || "Inconnue",
      power: moveData[offset + 2],
      accuracy: moveData[offset + 5],
      pp: moveData[offset + 6]
    };
  }
  return moves;
}

function buildNaturalLearnsets(moveDex) {
  const buffer = readData("attacksRS.dat");
  const speciesCount = buffer.readUInt32LE(0) / 8;
  const learnsets = {};
  for (let speciesId = 1; speciesId <= speciesCount; speciesId += 1) {
    const headerOffset = (speciesId - 1) * 8;
    const dataOffset = buffer.readUInt32LE(headerOffset);
    const entryCount = buffer.readUInt32LE(headerOffset + 4) >> 1;
    const entries = [];
    const seen = new Set();
    for (let index = 0; index < entryCount; index += 1) {
      const offset = dataOffset + index * 4;
      const level = buffer.readUInt16LE(offset);
      const moveId = buffer.readUInt16LE(offset + 2);
      const key = `${level}:${moveId}`;
      if (!moveDex[moveId] || seen.has(key)) continue;
      seen.add(key);
      entries.push([level, moveId]);
    }
    learnsets[speciesId] = entries;
  }
  return learnsets;
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
  const machines = machineRecords.map((record) => {
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
  const fieldRules = {
    Coupe: "Utilisable sur le terrain après 1 victoire majeure.",
    Vol: "Utilisable en extérieur après 1 victoire majeure, hors accompagnement scénarisé.",
    Surf: "La Monture Surf est remise à Relifac-le-Haut avec la CT15 ; son usage demande 5 victoires majeures.",
    Force: "Utilisable sur le terrain après 1 victoire majeure.",
    Cascade: "Utilisable sur les cascades après 8 victoires majeures par un Pokémon qui connaît la capacité.",
    Plongée: "Utilisable dans les zones d’eau profonde après 7 victoires majeures par un Pokémon qui connaît la capacité."
  };
  for (const machine of machines.filter((entry) => entry.kind === "CS")) {
    machine.relatedMachines = machines.filter((entry) => entry.kind === "CT" && entry.moveId === machine.moveId)
      .map((entry) => ({ code: entry.code, sources: entry.sources }));
    machine.fieldUse = fieldRules[machine.move] || "";
  }
  return machines;
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

function buildRecipes(messages, constants, scripts) {
  const source = [...scripts.entries()].find(([name]) => /Crafteo/i.test(name))?.[1] || "";
  const itemIds = constants.PBItems || new Map();
  const itemName = (symbol) => {
    const id = itemIds.get(symbol);
    return id === undefined ? symbol : text(messages[7]?.[id]).replace(/[.\s]+$/u, "") || symbol;
  };
  const recipes = [];
  const pattern = /if\s+\$game_variables\[RECETAS_CRAFTEO\]>=\s*(\d+)[\s\S]*?stock\.push\(\[:([A-Za-z0-9_]+),\[([\s\S]*?)\]\]\)/g;
  for (const match of source.matchAll(pattern)) {
    const ingredients = [...match[3].matchAll(/:([A-Za-z0-9_]+)\s*,\s*(\d+)/g)]
      .map((ingredient) => ({ item: itemName(ingredient[1]), quantity: Number(ingredient[2]) }));
    recipes.push({
      number: Number(match[1]) + 1,
      result: itemName(match[2]),
      ingredients
    });
  }
  return recipes;
}

function buildAchievements(messages, scripts) {
  const source = [...scripts.entries()].find(([name]) => /Logros/i.test(name))?.[1] || "";
  const block = source.match(/LOGROS\s*=\s*\[([\s\S]*?)\n\]/)?.[1] || "";
  const translations = translatedHash(messages, 23);
  return [...block.matchAll(/\[_INTL\("([^"]+)"\),\s*_INTL\("([^"]+)"\)\]/g)].map((match, index) => ({
    number: index + 1,
    title: translations.get(match[1]) || match[1],
    description: translations.get(match[2]) || match[2]
  }));
}

const QUESTS_FR = {
  299: ["La tour mystérieuse", "Bourg Canvas", "Examiner la mystérieuse tour fermée de Bourg Canvas."],
  298: ["Une monture Gogoat", "Route 2", "Apporter une Clé Mercurielle au fermier de la Route 2 en échange d’une Monture Gogoat."],
  119: ["Mission des Mousquetaires I", "Grotte Navarre", "Neutraliser le malfaiteur signalé par les Mousquetaires dans la Grotte Navarre."],
  121: ["Mission des Mousquetaires II", "Grotte Inondée", "Neutraliser le malfaiteur signalé dans la Grotte Inondée."],
  123: ["Mission des Mousquetaires III", "Catacombes septentrionales", "Neutraliser le malfaiteur caché dans les Catacombes septentrionales."],
  276: ["Mission des Mousquetaires IV", "Vieux Vanitas", "Neutraliser le malfaiteur signalé à Vieux Vanitas."],
  125: ["Un endroit où s’installer", "Route 3", "Indiquer au marchand de la Route 3 un lieu où il pourrait installer son commerce."],
  128: ["Le spectre du fossoyeur", "Route 6", "Aider le fossoyeur de la Route 6 à chasser un Spectrum."],
  300: ["Trois Pokétoxines", "Marais Impie", "Rapporter trois Pokétoxines à la sorcière du Marais Impie."],
  301: ["Le condensateur perdu", "Ancien Atelier", "Récupérer dans l’Ancien Atelier le condensateur demandé par un chercheur de l’Académie d’Essience."],
  302: ["Le mouchoir égaré", "Château Lanto", "Retrouver au Château Lanto le mouchoir perdu par une dame de la Route 8."],
  306: ["La porte de Chez Gourmelet", "Chez Gourmelet", "Trouver comment ouvrir la mystérieuse porte de Chez Gourmelet."],
  307: ["La Chambre druidique", "Chambre druidique", "Trouver comment ouvrir la mystérieuse porte de la Chambre druidique."],
  308: ["Le restaurant de Justine", "Chez Gourmelet", "Aider Justine à ouvrir son restaurant Chez Gourmelet."],
  304: ["Les mots de la cloche", "Autel de Prospérité", "Utiliser les mots magiques qui font réagir la cloche de l’Autel de Prospérité."],
  305: ["La traversée du Passeur", "Roche-sur-Gliffe", "Rejoindre le Passeur à Roche-sur-Gliffe avec une Pièce d’Or."],
  253: ["Deux livres recherchés", "Route 20", "Retrouver les deux livres précis recherchés par un monsieur de la Route 20."],
  389: ["L’épée perdue", "Route 11", "Retrouver l’épée égarée par le chevalier de la Route 11."],
  390: ["L’enfant de Vieux Vanitas", "Vieux Vanitas", "Rétablir l’ordre à Vieux Vanitas afin de libérer l’enfant pris au piège."],
  391: ["Un remède introuvable", "Vieux Vanitas", "Chercher dans les rivières du sud de la région un remède pour le Pokémon malade."],
  392: ["Le voleur du Jardin", "Jardin Vanitas", "Attirer le Pokémon voleur du Jardin Vanitas avec les baies appropriées."],
  393: ["La main verte", "Jardin Vanitas", "Prouver votre talent au cultivateur du Jardin Vanitas en faisant pousser des baies."],
  394: ["L’homme en noir", "Catacombes d’Illumis", "Retrouver l’individu vêtu de noir qui demande de l’aide dans les Catacombes d’Illumis."],
  395: ["La porte des Catacombes", "Catacombes d’Illumis", "Trouver comment ouvrir la mystérieuse porte des Catacombes d’Illumis."],
  396: ["La porte de Votre-Gentilhomme", "Votre-Gentilhomme d’Illumis", "Trouver comment ouvrir la mystérieuse porte de Votre-Gentilhomme d’Illumis."],
  494: ["La porte de l’Usine", "Usine de Poké Balls", "Trouver comment ouvrir la mystérieuse porte de l’Usine de Poké Balls."],
  545: ["La Forge scellée", "Forge Millénaire", "Trouver comment ouvrir la porte de la Forge Millénaire."],
  639: ["L’entrepôt de la Prison", "Saint-Héchaînes", "Ouvrir la porte scellée d’un entrepôt de la prison de Saint-Héchaînes."],
  640: ["La porte de la Route 15", "Route 15", "Trouver comment ouvrir la mystérieuse porte de la Route 15."],
  641: ["La porte de Mozheim", "Mozheim", "Trouver comment ouvrir la mystérieuse porte de Mozheim."],
  649: ["Le fugitif Dandelio", "Saint-Héchaînes", "Aider Dandelio, prisonnier évadé caché près de Saint-Héchaînes."],
  650: ["Urgence à la Tour", "Asile d’Hache-Âme", "Porter secours à la patiente de l’Asile d’Hache-Âme."],
  651: ["La peintre disparue", "Grotte Coda", "Retrouver la peintre partie chercher son Pokémon dans la Grotte Coda."],
  652: ["Condamné à tort", "Mozheim", "Empêcher l’exécution injuste d’un monsieur à Mozheim."],
  653: ["La porte secrète", "Asile d’Hache-Âme", "Utiliser la clé obtenue pour ouvrir la porte secrète de l’Asile d’Hache-Âme."],
  654: ["Un fantôme à domicile", "Romant-sous-Bois", "Chasser le fantôme entré dans la maison d’un habitant de Romant-sous-Bois."],
  655: ["La carte au trésor", "Île lointaine", "Explorer une île reculée avec le vieux pirate en utilisant la Carte au Trésor."],
  657: ["Les invitations thermales", "Mozheim", "Utiliser les Invitations thermales pour accéder à l’En-Scène depuis Mozheim."],
  686: ["Besoin d’aide à la gare", "Gare d’Illumis", "Parler à la dame qui semble avoir besoin d’aide dans la Gare d’Illumis."],
  696: ["Une demande à Des-Rires", "Des-Rires", "Parler à la demoiselle qui semble avoir besoin d’aide à Des-Rires."],
  745: ["La porte mercurielle", "Tour Maîtrise", "Ouvrir la porte mercurielle située à l’intérieur de la Tour Maîtrise."],
  695: ["La clé de la gare", "Gare d’Illumis", "Retrouver, non loin de la gare, la clé de sa porte fermée."],
  690: ["La requête du moine", "Bateau Échoué", "Retrouver le moine ivre près du Bateau Échoué et répondre à sa demande."],
  310: ["La porte de la Forteresse", "Forteresse de Fort-Vanitas", "Ouvrir la porte mercurielle à l’intérieur de la Forteresse de Fort-Vanitas."],
  828: ["L’ancienne recrue Azoth", "Route 16", "Aider l’ancienne recrue de la Team Azoth sur la Route 16."]
};

function buildQuests() {
  const board = loadRubyMarshal(readData("CommonEvents.rxdata"))[51];
  const trackedSwitches = new Set();
  for (const command of board?.["@list"] || []) {
    const parameters = command["@parameters"] || [];
    if (command["@code"] === 111 && parameters[0] === 0 && QUESTS_FR[parameters[1]]) trackedSwitches.add(parameters[1]);
  }
  return [...trackedSwitches].map((switchId, index) => ({
    number: index + 1,
    switchId,
    title: QUESTS_FR[switchId][0],
    location: QUESTS_FR[switchId][1],
    objective: QUESTS_FR[switchId][2]
  }));
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

const progressionGuides = [
  {
    id: "quiz-bordevin",
    title: "Les trois questions du savant",
    location: "Bordevin — Maison",
    kind: "Énigme",
    reward: "Mouchoir Soie",
    hints: [
      "Les réponses concernent l’apparence ou l’évolution de trois Pokémon bien connus.",
      "Comptez les yeux de Smogogo, pensez au poisson qui devient un monstre marin, puis à un Pokémon qui perd sa queue en évoluant.",
      "Réponses dans l’ordre : 4, Magicarpe, Kadabra."
    ]
  },
  {
    id: "urano-spa",
    title: "Les quatre énigmes d’Urano",
    location: "En-Scène",
    kind: "Énigme et combat",
    reward: "Trésor d’Urano et pierre liée à une forme de Kanto",
    hints: [
      "Chaque réponse se trouve parmi les éléments ou personnages présents dans l’établissement thermal.",
      "Cherchez successivement quelque chose qui reflète, qui rapetisse avec l’âge, qui vit pour faire rire, puis une créature en écailles toujours dans l’eau.",
      "Interagissez dans cet ordre avec le reflet, les bougies, le clown puis les poissons. Retournez voir Urano entre les étapes et préparez-vous à un combat final."
    ]
  },
  {
    id: "jardin-boyard",
    title: "Les quatre énigmes du Roi",
    location: "Jardin Boyard",
    kind: "Énigmes et combat",
    reward: "Perruque Royale et succès « C’est mon dernier mot »",
    hints: [
      "Chaque devinette se résout directement dans le Jardin : observez les étoiles, les quatre panneaux, Pikachu et la statue du Roi.",
      "La première réponse brille la nuit ; la deuxième est le nombre 8 ; la troisième est Donphan ; pour la dernière, la réponse se trouve devant vous.",
      "Ramassez les 5 étoiles. Réglez ensuite les quatre panneaux pour que leur somme fasse 8. Poussez Pikachu jusqu’à la zone de Donphan. Enfin, interrogez 7 fois le Roi des Énigmes puis remportez son combat."
    ]
  },
  {
    id: "quiz-cris-pokemon",
    title: "Reconnaître les cris de Pokémon",
    location: "Maison d’Auffrac-les-Congères",
    kind: "Mini-jeu sonore",
    reward: "Charminite et Sorcilencite",
    hints: [
      "Trois cris sont joués, dans l’ordre des régions Kanto, Johto puis Hoenn.",
      "Les bonnes réponses sont un Pokémon insectoïde de Kanto, un Pokémon aquatique bleu de Johto et un Pokémon annonciateur de catastrophes de Hoenn.",
      "Réponses dans l’ordre : Parasect, Axoloto, Absol."
    ]
  },
  {
    id: "arena-route",
    title: "Préparer un combat de chef",
    location: "Toutes les forteresses",
    kind: "Conseil de progression",
    reward: "Progression et nouveau plafond de niveau",
    hints: [
      "Consultez d’abord la spécialité du chef et le plafond actuel sans dévoiler son équipe.",
      "Ouvrez le conseil tactique de sa fiche pour connaître les types offensifs qui couvrent le plus de membres.",
      "La composition complète révèle ensuite les objets, capacités, IV et variantes éventuelles."
    ]
  }
];

const trainerTips = [
  ["Bourg Canvas", "La sauvegarde se trouve dans le dossier des parties sauvegardées de votre compte utilisateur."],
  ["Route 1", "La méthode d’évolution d’un Pokémon capturé peut être consultée dans le Pokédex."],
  ["Route 1", "De nombreux Pokémon considérés comme faibles ont reçu un rééquilibrage de leurs statistiques."],
  ["Route 2", "Les mises à jour futures de Pokémon Z sont conçues pour conserver votre sauvegarde."],
  ["Navarroc", "Si certains Pokémon n’apparaissent pas en combat, le chargement de leurs sprites animés rencontre probablement un problème."],
  ["Route 3", "Sur Android, garder un Pokémon suiveur peut réduire les ralentissements lors du passage dans les hautes herbes."],
  ["Route 4", "Le cycle jour/nuit suit l’heure de l’ordinateur, même lorsqu’il n’est pas visible à l’écran."],
  ["Route 4", "Les étoiles de l’écran des statistiques représentent les IV, c’est-à-dire le potentiel du Pokémon dans chaque statistique."],
  ["Route 6", "La Lentille de la Vérité peut servir dans plusieurs autres endroits de Kalos."],
  ["Marais Impie", "Avec Querelleur, les capacités Normal et Combat peuvent toucher les Pokémon Spectre."],
  ["Route 2", "Tous les Pokémon de la série sont annoncés comme obtenables dans Pokémon Z."],
  ["Route 5", "Les objets cachés peuvent se trouver très près des chemins visibles."],
  ["Route 5", "Marcher avec un Pokémon suiveur augmente son bonheur."],
  ["Route 7", "Un Repousse ne bloque pas les Pokémon sauvages dont le niveau dépasse celui du premier membre de l’équipe."],
  ["Route 7", "Les Pokémon Plante sont immunisés contre les capacités de poudres et de spores."],
  ["Route 7", "Les objets liés aux Capsules permettent d’exploiter davantage le potentiel de vos Pokémon."],
  ["Route 10", "Sous Champ Herbu, les Pokémon au sol subissent deux fois moins de dégâts des capacités Sol."],
  ["Route 10", "Sous Champ Brumeux, les Pokémon au sol subissent deux fois moins de dégâts des capacités Dragon."],
  ["Route 9", "La Poudre d’Os est un matériau d’alchimie précieux, souvent présent dans les catacombes et lieux hostiles."],
  ["Route 9", "Doux Parfum permet d’attirer les Pokémon sauvages sans se déplacer."],
  ["Colline Tumultueuse", "Œil Composé et Fouille augmentent les chances que les Pokémon sauvages portent un objet."],
  ["Route 8", "Lumiattirance a été modifiée : elle réduit désormais la Précision adverse."],
  ["Route 8", "Les Repousses échouent si le premier Pokémon est moins haut niveau que les Pokémon sauvages."],
  ["Roche-sur-Gliffe", "Une Monture Gogoat permet d’escalader les parois rocheuses."],
  ["Route 11", "Certaines capacités possèdent une efficacité spéciale, comme Finsecte ou Lyophilisation."],
  ["Route 11", "Le panneau du Centre Pokémon brille lorsqu’une mission connue est encore en attente."],
  ["Route 9", "Pour Évoli, il peut être intéressant d’attendre l’obtention d’un objet d’évolution particulièrement noble."],
  ["Route 12", "Après avoir obtenu une Monture Surf, revisitez les zones déjà parcourues pour atteindre de nouveaux recoins."],
  ["Route 15", "Les Pokémon Plante ne sont pas affectés par les poudres et les spores."],
  ["Caverne Gelée", "Dans Pokémon Z, le gel agit comme une brûlure appliquée à l’Attaque Spéciale."],
  ["Route 17", "Gardez des objets chauds dans l’inventaire pour résister au froid de la Grotte Gelée."],
  ["Route 14", "Pour Méga-Évoluer, équipez la Méga-Gemme correspondante puis utilisez la touche Z assignée pendant le combat."],
  ["La Frescale", "Sous la pluie, certaines capacités comme Fatal-Foudre et Vent Violent ne ratent jamais."],
  ["Route 18", "Blizzard ne rate jamais lorsqu’il neige en combat."],
  ["Route 18", "La neige augmente la Défense des Pokémon Glace."],
  ["Route 20", "Vaincre les 18 Pokémon Alpha de la région débloque une récompense de grande valeur."],
  ["Flusselles", "Vous pouvez changer de Méga-Évolution selon les besoins de votre équipe."],
  ["Route 19", "Réunir toutes les pages d’Alchimie débloque des objets particulièrement puissants."],
  ["Route 22", "Hémorragie, le Périscope et une capacité à haut taux de critique permettent d’atteindre 100 % de chances d’infliger cet état."]
].map(([location, text], index) => ({ number: index + 1, location, text }));

const minigames = [
  { title: "Machine à sous", summary: "Mini-jeu de casino à rouleaux, avec mises et gains en jetons." },
  { title: "Voltorb Flip", summary: "Jeu de grille où les indices de ligne et de colonne permettent d’éviter les Voltorbe." },
  { title: "Loterie", summary: "Tirage fondé sur la correspondance entre le numéro gagnant et les identifiants de vos Pokémon." },
  { title: "Triple Triad", summary: "Jeu de cartes tactique où les valeurs des côtés servent à capturer les cartes adverses." },
  { title: "Extraction minière", summary: "Utilisez les outils avec mesure pour découvrir les objets avant l’effondrement de la paroi." },
  { title: "Puzzles de dalles", summary: "Reconstituez l’image en déplaçant ou retournant les pièces selon la variante proposée." },
  { title: "Duel", summary: "Mini-jeu d’affrontement distinct des combats Pokémon classiques." },
  { title: "Blackjack", summary: "À Saint-Héchaînes, approchez-vous de 21 sans le dépasser ; l’As peut valoir 1 ou 13. Une victoire rapporte une Baie Meloc." },
  { title: "Quiz des cris", summary: "À Auffrac-les-Congères, reconnaissez Parasect, Axoloto puis Absol pour recevoir une Charminite et une Sorcilencite." }
];

const messages = loadRubyMarshal(readData("french.dat"));
const constants = loadConstants();
const scripts = loadGameScripts();
const mapInfos = loadRubyMarshal(readData("MapInfos.rxdata"));
const moveDex = buildMoveDex(messages);
const learnsetData = {
  moves: moveDex,
  naturalLearnsets: buildNaturalLearnsets(moveDex)
};
const wiki = {
  version: "Pokémon Z v2.12 FR",
  generatedFrom: "Données internes compilées du jeu",
  levelCaps: [17, 27, 36, 42, 50, 56, 70, 75, 80, 85, 94, 100],
  machines: buildMachines(messages, constants, mapInfos),
  leaders: buildLeaders(messages),
  mechanics,
  progressionGuides,
  quests: buildQuests(),
  recipes: buildRecipes(messages, constants, scripts),
  achievements: buildAchievements(messages, scripts),
  trainerTips,
  minigames
};

const outputPath = path.resolve(__dirname, "../src/pokemon-z-wiki-data.js");
fs.writeFileSync(outputPath, `// Généré depuis les fichiers de Pokémon Z v2.12 FR.\nconst POKEMON_Z_WIKI_DATA = ${JSON.stringify(wiki, null, 2)};\n`, "utf8");
const learnsetOutputPath = path.resolve(__dirname, "../src/pokemon-z-learnset-data.js");
fs.writeFileSync(learnsetOutputPath, `// Généré depuis attacksRS.dat et moves.dat de Pokémon Z v2.12 FR.\nconst POKEMON_Z_LEARNSET_DATA = ${JSON.stringify(learnsetData)};\n`, "utf8");
console.log(`Generated ${wiki.machines.length} machines, ${wiki.leaders.length} leaders, ${wiki.quests.length} quests, ${wiki.recipes.length} recipes and ${wiki.trainerTips.length} tips.`);
