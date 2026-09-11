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

const MOVE_TARGET_LABELS = {
  0x00: "Une cible autre que le lanceur",
  0x01: "Aucune cible directe",
  0x02: "Un adversaire aléatoire",
  0x04: "Tous les adversaires",
  0x08: "Tous les Pokémon sauf le lanceur",
  0x10: "Le lanceur",
  0x20: "Le camp du lanceur",
  0x40: "Les deux camps",
  0x80: "Le camp adverse",
  0x100: "Le partenaire",
  0x200: "Le lanceur ou son partenaire",
  0x400: "Un adversaire choisi",
  0x800: "L'adversaire placé en face"
};

const MOVE_FLAG_LABELS = [
  [0x001, "Contact"], [0x002, "Bloquée par Abri/Détection"],
  [0x004, "Renvoyée par Reflet Magik"], [0x008, "Volable par Saisie"],
  [0x010, "Copiable par Mimique"], [0x020, "Compatible avec Roche Royale"],
  [0x040, "Dégèle le lanceur"], [0x080, "Taux critique élevé"],
  [0x100, "Morsure"], [0x200, "Poing"], [0x400, "Sonore"],
  [0x800, "Poudre"], [0x1000, "Aura/impulsion"], [0x2000, "Bombe/projectile"]
];

const MOVE_FUNCTION_NOTES = {
  0x06A: ["Inflige exactement 20 PV de dégâts."],
  0x06B: ["Inflige exactement 40 PV de dégâts."],
  0x06C: ["Retire la moitié des PV actuels de la cible."],
  0x06D: ["Dégâts fixes égaux au niveau du lanceur."],
  0x06E: ["Ramène les PV de la cible au niveau de ceux du lanceur ; échoue si la cible en a autant ou moins."],
  0x070: ["Met K.O. en un coup ; échoue si la cible est d'un niveau supérieur au lanceur."],
  0x071: ["Renvoie le double des derniers dégâts physiques reçus ; échoue sans attaque physique admissible."],
  0x072: ["Renvoie le double des derniers dégâts spéciaux reçus ; échoue sans attaque spéciale admissible."],
  0x073: ["Renvoie 1,5 fois les derniers dégâts reçus ; le lanceur doit avoir été touché durant ce tour."],
  0x07B: ["Puissance doublée si la cible est empoisonnée."],
  0x07D: ["Puissance doublée contre une cible endormie, qui est ensuite réveillée."],
  0x07E: ["Puissance doublée si le lanceur est empoisonné, paralysé ou brûlé."],
  0x07F: ["Puissance doublée si la cible subit une altération de statut."],
  0x080: ["Puissance doublée si la cible possède au plus la moitié de ses PV."],
  0x081: ["Puissance doublée si le lanceur a été touché par la cible durant ce tour."],
  0x082: ["Puissance doublée si la cible a déjà subi des dégâts durant ce tour."],
  0x083: ["Puissance doublée si un allié a déjà utilisé cette capacité durant le tour."],
  0x084: ["Puissance doublée si le lanceur agit après la cible."],
  0x085: ["Puissance doublée si un allié a été mis K.O. au tour précédent."],
  0x086: ["Puissance doublée si le lanceur ne tient aucun objet."],
  0x087: ["Sous une météo active, la puissance est doublée et le type s'adapte à la météo."],
  0x088: ["Puissance doublée contre une cible qui tente d'être remplacée."],
  0x08B: ["Puissance maximale 150, réduite proportionnellement aux PV perdus par le lanceur."],
  0x08C: ["Puissance maximale 120, réduite proportionnellement aux PV perdus par la cible."],
  0x08D: ["Puissance de 1 à 150 selon le rapport de Vitesse : plus le lanceur est lent face à la cible, plus l'attaque est forte."],
  0x08E: ["Puissance de base 20, puis +20 pour chaque niveau positif de statistique du lanceur."],
  0x08F: ["Puissance de base 60, puis +20 par niveau positif de statistique de la cible, avec un maximum de 200."],
  0x091: ["La puissance double à chaque utilisation consécutive réussie, dans la limite prévue par le script."],
  0x095: ["Puissance tirée aléatoirement par paliers d'Ampleur, de 10 à 150."],
  0x097: ["Plus les PP restants sont faibles, plus la puissance augmente : de 40 à 200."],
  0x098: ["Puissance de 20 à 200 : elle augmente lorsque les PV du lanceur diminuent."],
  0x099: ["Puissance de 60 à 150 selon l'avantage de Vitesse du lanceur sur la cible."],
  0x09A: ["Puissance de 20 à 120 selon le poids de la cible."],
  0x09B: ["Puissance de 40 à 120 selon l'avantage de poids du lanceur sur la cible."],
  0x0BD: ["Frappe exactement 2 fois."],
  0x0BE: ["Frappe exactement 2 fois ; chaque impact applique les règles de l'effet associé."],
  0x0BF: ["Frappe exactement 3 fois."],
  0x0C0: ["Frappe de 2 à 5 fois ; le nombre peut être modifié par certains talents."],
  0x0C2: ["Après une utilisation réussie, le lanceur doit se recharger au tour suivant."],
  0x0D5: ["Restaure 50 % des PV maximum du lanceur."],
  0x0D6: ["Restaure 50 % des PV maximum et retire temporairement le type Vol du lanceur jusqu'à la fin du tour."],
  0x0D7: ["Restaure 50 % des PV maximum du bénéficiaire à la fin du tour suivant."],
  0x0D8: ["Restaure normalement 50 % des PV max, 2/3 sous le soleil et 1/4 sous une météo défavorable."],
  0x0D9: ["Restaure tous les PV et soigne les statuts, puis endort le lanceur pendant 2 tours."],
  0x0DA: ["Régénère 1/16 des PV maximum à la fin de chaque tour."],
  0x0DB: ["Régénère 1/16 des PV maximum par tour, mais empêche le remplacement du lanceur."],
  0x0DC: ["Draine 1/8 des PV maximum de la cible à chaque tour."],
  0x0DD: ["Rend au lanceur 50 % des dégâts effectivement infligés."],
  0x0DE: ["Ne fonctionne que sur une cible endormie et rend 50 % des dégâts infligés."],
  0x0DF: ["Rend 50 % de ses PV maximum à la cible."],
  0x0E1: ["Inflige un nombre de dégâts égal aux PV actuels du lanceur, puis met celui-ci K.O."],
  0x0E5: ["Tous les Pokémon affectés tombent K.O. après 3 tours s'ils restent en combat."],
  0x0E8: ["Permet de survivre à 1 PV ; les utilisations protectrices successives réduisent ses chances de réussite."],
  0x0E9: ["Ne peut jamais faire descendre la cible sous 1 PV."],
  0x0FA: ["Le lanceur subit un recul égal à 1/4 des dégâts infligés."],
  0x0FB: ["Le lanceur subit un recul égal à 1/3 des dégâts infligés."],
  0x0FC: ["Le lanceur subit un recul égal à 1/2 des dégâts infligés."],
  0x0A1: ["Protège le camp du lanceur des coups critiques pendant 5 tours."],
  0x0A2: ["Divise les dégâts physiques reçus par le camp pendant 5 tours, ou 8 avec Lumargile."],
  0x0A3: ["Divise les dégâts spéciaux reçus par le camp pendant 5 tours, ou 8 avec Lumargile."],
  0x0AA: ["Bloque les attaques visant le lanceur pendant ce tour ; la probabilité est divisée par 2 à chaque protection consécutive."],
  0x0FF: ["Installe le soleil pendant 5 tours, ou 8 si le lanceur tient une Roche Chaude."],
  0x100: ["Installe la pluie pendant 5 tours, ou 8 si le lanceur tient une Roche Humide."],
  0x101: ["Installe la tempête de sable pendant 5 tours, ou 8 si le lanceur tient une Roche Lisse."],
  0x102: ["Installe la grêle pendant 5 tours, ou 8 si le lanceur tient une Roche Glace."],
  0x103: ["Pose jusqu'à 3 couches de Picots dans le camp adverse."],
  0x104: ["Pose jusqu'à 2 couches de Pics Toxik dans le camp adverse."],
  0x105: ["Pose une couche de Piège de Roc dans le camp adverse."],
  0x10C: ["Sacrifie 25 % des PV maximum du lanceur pour créer un clone."],
  0x112: ["Stocke jusqu'à 3 charges et augmente Défense et Défense Spéciale d'un niveau par charge."],
  0x114: ["Consomme les charges stockées et restaure 25 %, 50 % ou 100 % des PV max pour 1, 2 ou 3 charges."],
  0x118: ["La gravité agit pendant 5 tours, retire 2 niveaux d'Esquive lors du calcul de précision et ramène les Pokémon au sol."],
  0x11F: ["Inverse l'ordre de Vitesse pendant 5 tours ; priorité exceptionnellement basse."],
  0x153: ["Pose une Toile Gluante dans le camp adverse et baisse la Vitesse des entrants au sol d'un niveau."]
};

const MOVE_STAT_STAGE_NOTES = {
  0x01C: "+1 niveau d'Attaque au lanceur", 0x01D: "+1 niveau de Défense au lanceur",
  0x01F: "+1 niveau de Vitesse au lanceur", 0x020: "+1 niveau d'Attaque Spéciale au lanceur",
  0x021: "+1 niveau de Défense Spéciale et doublement de la prochaine capacité Électrik du lanceur",
  0x022: "+1 niveau d'Esquive au lanceur", 0x024: "+1 niveau d'Attaque et de Défense au lanceur",
  0x025: "+1 niveau d'Attaque, de Défense et de Précision au lanceur", 0x026: "+1 niveau d'Attaque et de Vitesse au lanceur",
  0x027: "+1 niveau d'Attaque et d'Attaque Spéciale au lanceur", 0x029: "+1 niveau d'Attaque et de Précision au lanceur",
  0x02A: "+1 niveau de Défense et de Défense Spéciale au lanceur", 0x02B: "+1 niveau d'Attaque Spéciale, Défense Spéciale et Vitesse au lanceur",
  0x02C: "+1 niveau d'Attaque Spéciale et de Défense Spéciale au lanceur", 0x02D: "+1 niveau dans les cinq statistiques de combat au lanceur",
  0x02E: "+2 niveaux d'Attaque au lanceur", 0x02F: "+2 niveaux de Défense au lanceur",
  0x030: "+2 niveaux de Vitesse au lanceur", 0x031: "+2 niveaux de Vitesse au lanceur et poids divisé par deux",
  0x032: "+2 niveaux d'Attaque Spéciale au lanceur", 0x033: "+2 niveaux de Défense Spéciale au lanceur",
  0x034: "+2 niveaux d'Esquive au lanceur", 0x036: "+1 niveau d'Attaque et +2 niveaux de Vitesse au lanceur",
  0x035: "+2 niveaux d'Attaque, d'Attaque Spéciale et de Vitesse, mais -1 niveau dans les deux Défenses",
  0x037: "+2 niveaux dans une statistique choisie aléatoirement", 0x038: "+3 niveaux de Défense au lanceur", 0x039: "+3 niveaux d'Attaque Spéciale au lanceur",
  0x03A: "Attaque portée au maximum (+6) en échange de la moitié des PV maximum",
  0x03B: "-1 niveau d'Attaque et de Défense au lanceur", 0x03C: "-1 niveau de Défense et de Défense Spéciale au lanceur",
  0x03D: "-1 niveau de Défense, Défense Spéciale et Vitesse au lanceur",
  0x03E: "-1 niveau de Vitesse au lanceur", 0x03F: "-2 niveaux d'Attaque Spéciale au lanceur",
  0x040: "+1 niveau d'Attaque Spéciale à la cible, puis confusion", 0x041: "+2 niveaux d'Attaque à la cible, puis confusion",
  0x042: "-1 niveau d'Attaque à la cible", 0x043: "-1 niveau de Défense à la cible",
  0x044: "-1 niveau de Vitesse à la cible", 0x045: "-1 niveau d'Attaque Spéciale à la cible",
  0x046: "-1 niveau de Défense Spéciale à la cible", 0x047: "-1 niveau de Précision à la cible",
  0x048: "-1 niveau d'Esquive à la cible", 0x04A: "-1 niveau d'Attaque et de Défense à la cible",
  0x04B: "-2 niveaux d'Attaque à la cible", 0x04C: "-2 niveaux de Défense à la cible",
  0x04D: "-2 niveaux de Vitesse à la cible", 0x04E: "-2 niveaux d'Attaque Spéciale à la cible",
  0x04F: "-2 niveaux de Défense Spéciale à la cible"
};

function buildMoveMechanics(moveData, offset) {
  const functionCode = moveData.readUInt16LE(offset);
  const power = moveData[offset + 2];
  const accuracy = moveData[offset + 5];
  const effectChance = moveData[offset + 7];
  const targetCode = moveData.readUInt16LE(offset + 8);
  const priority = moveData.readInt8(offset + 10);
  const flags = moveData.readUInt16LE(offset + 11);
  const notes = [...(MOVE_FUNCTION_NOTES[functionCode] || [])];
  if (MOVE_STAT_STAGE_NOTES[functionCode]) notes.unshift(MOVE_STAT_STAGE_NOTES[functionCode]);
  if (functionCode === 0x070) notes.push(`Chance de réussite : ${accuracy} % + la différence de niveau en faveur du lanceur.`);
  if (accuracy === 0) notes.push("Aucun test de précision ; la capacité peut toutefois échouer si sa condition propre n'est pas remplie.");
  const damagingOnlyFlags = new Set([0x001, 0x020, 0x080, 0x100, 0x200, 0x1000, 0x2000]);
  return {
    functionCode: functionCode.toString(16).toUpperCase().padStart(3, "0"),
    effectChance: effectChance > 0 && power > 0 ? effectChance : null,
    priority,
    target: MOVE_TARGET_LABELS[targetCode] || `Cible interne 0x${targetCode.toString(16).toUpperCase()}`,
    traits: MOVE_FLAG_LABELS.filter(([mask]) => (flags & mask) !== 0 && (power > 0 || !damagingOnlyFlags.has(mask))).map(([, label]) => label),
    notes
  };
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
    const rawPower = moveData[offset + 2];
    moves[moveId] = {
      name,
      description: text(messages[6]?.[moveId]),
      type: text(messages[12]?.[moveData[offset + 3]]) || "Inconnu",
      category: ["Physique", "Spéciale", "Statut"][moveData[offset + 4]] || "Inconnue",
      power: rawPower === 1 ? null : rawPower,
      ...(rawPower === 1 ? { variablePower: true } : {}),
      accuracy: moveData[offset + 5],
      pp: moveData[offset + 6],
      mechanics: buildMoveMechanics(moveData, offset)
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

function buildPokemonStats() {
  const dexData = readData("dexdata.dat");
  const recordSize = 76;
  const stats = {};
  for (let speciesId = 1; speciesId <= Math.floor(dexData.length / recordSize); speciesId += 1) {
    const offset = (speciesId - 1) * recordSize + 10;
    stats[speciesId] = {
      hp: dexData[offset],
      attack: dexData[offset + 1],
      defense: dexData[offset + 2],
      speed: dexData[offset + 3],
      specialAttack: dexData[offset + 4],
      specialDefense: dexData[offset + 5]
    };
  }
  return stats;
}

function buildPokemonAbilities(messages) {
  const dexData = readData("dexdata.dat");
  const recordSize = 76;
  const abilities = {};
  for (let speciesId = 1; speciesId <= Math.floor(dexData.length / recordSize); speciesId += 1) {
    const recordOffset = (speciesId - 1) * recordSize;
    const slots = [
      { id: dexData.readUInt16LE(recordOffset + 2), hidden: false, slot: 1 },
      { id: dexData.readUInt16LE(recordOffset + 4), hidden: false, slot: 2 },
      { id: dexData.readUInt16LE(recordOffset + 40), hidden: true, slot: 3 },
      { id: dexData.readUInt16LE(recordOffset + 42), hidden: true, slot: 4 },
      { id: dexData.readUInt16LE(recordOffset + 44), hidden: true, slot: 5 },
      { id: dexData.readUInt16LE(recordOffset + 46), hidden: true, slot: 6 }
    ];
    const seen = new Set();
    abilities[speciesId] = slots.filter(({ id }) => {
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    }).map(({ id, hidden, slot }) => ({
      id,
      key: `pokemon-z-ability-${id}`,
      name: text(messages[10]?.[id]) || `Talent n°${id}`,
      description: text(messages[11]?.[id]) || "Description indisponible.",
      hidden,
      slot
    }));
  }
  return abilities;
}

const TRAINING_ITEM_STATS = {
  HPUP: "PV",
  PROTEIN: "Attaque",
  IRON: "Défense",
  CALCIUM: "Attaque Spéciale",
  ZINC: "Défense Spéciale",
  CARBOS: "Vitesse",
  SUPERHPUP: "PV",
  SUPERPROTEIN: "Attaque",
  SUPERIRON: "Défense",
  SUPERCALCIUM: "Attaque Spéciale",
  SUPERZINC: "Défense Spéciale",
  SUPERCARBOS: "Vitesse",
  HEALTHWING: "PV",
  MUSCLEWING: "Attaque",
  RESISTWING: "Défense",
  GENIUSWING: "Attaque Spéciale",
  CLEVERWING: "Défense Spéciale",
  SWIFTWING: "Vitesse",
  SCapsula: "PV",
  ACapsula: "Attaque",
  DCapsula: "Défense",
  AECapsula: "Attaque Spéciale",
  DECapsula: "Défense Spéciale",
  VCapsula: "Vitesse"
};

function buildMeasuredStatEffect(symbol) {
  const stat = TRAINING_ITEM_STATS[symbol];
  if (/^(?:HPUP|PROTEIN|IRON|CALCIUM|ZINC|CARBOS)$/.test(symbol)) {
    return {
      metric: "EV",
      headline: `+10 EV en ${stat} par utilisation`,
      details: [
        "L'objet cesse d'agir à 250 EV dans cette statistique.",
        "Limites du jeu : 252 EV par statistique et 510 EV au total.",
        "Ce ne sont pas 10 points directs : 4 EV valent environ 1 point de statistique au niveau 100, avant les arrondis et la nature."
      ]
    };
  }
  if (/^SUPER(?:HPUP|PROTEIN|IRON|CALCIUM|ZINC|CARBOS)$/.test(symbol)) {
    return {
      metric: "EV",
      headline: `+20 EV en ${stat} par utilisation`,
      details: [
        "L'injection cesse d'agir à 250 EV dans cette statistique.",
        "Limites du jeu : 252 EV par statistique et 510 EV au total.",
        "Ce ne sont pas 20 points directs : les EV sont convertis selon le niveau du Pokémon."
      ]
    };
  }
  if (/^(?:HEALTH|MUSCLE|RESIST|GENIUS|CLEVER|SWIFT)WING$/.test(symbol)) {
    return {
      metric: "EV",
      headline: `+1 EV en ${stat} par utilisation`,
      details: [
        "Contrairement aux vitamines et injections, la plume peut atteindre la limite réelle de 252 EV dans cette statistique.",
        "Limite cumulée : 510 EV sur l'ensemble des six statistiques."
      ]
    };
  }
  if (/^(?:S|A|D|AE|DE|V)Capsula$/.test(symbol)) {
    return {
      metric: "IV",
      headline: `+7 IV en ${stat} par utilisation`,
      details: [
        "Plafond : 31 IV dans cette statistique ; le dernier gain est réduit si nécessaire.",
        "La description française annonce +10 IV, mais le script exécuté n'en ajoute que 7."
      ]
    };
  }
  if (symbol === "CHAPADORADA") {
    return {
      metric: "IV",
      headline: "+7 IV dans chacune des six statistiques",
      details: [
        "Chaque statistique progresse séparément jusqu'au plafond de 31 IV.",
        "La description française annonce +10 IV, mais le script exécuté appelle six fois un gain de 7 IV."
      ]
    };
  }
  return null;
}

function buildItems(messages, constants) {
  const pocketNames = [
    "Inconnus", "Objets", "Médicaments", "Poké Balls", "CT / CS",
    "Ingrédients", "Méga-Gemmes", "Objets de combat", "Objets rares"
  ];
  const symbolsById = new Map([...(constants.PBItems || new Map())].map(([symbol, id]) => [id, symbol]));
  return loadSerialRecords("items.dat").map((record) => {
    const measuredEffect = buildMeasuredStatEffect(symbolsById.get(record[0]) || "");
    return {
      id: record[0],
      name: text(messages[7]?.[record[0]]) || text(record[1]) || `Objet n°${record[0]}`,
      pluralName: text(messages[8]?.[record[0]]) || text(record[2]),
      description: text(messages[9]?.[record[0]]) || text(record[5]) || "Description indisponible.",
      pocket: pocketNames[record[3]] || `Poche ${record[3]}`,
      price: Number(record[4]) || 0,
      fieldUse: Number(record[6]) || 0,
      battleUse: Number(record[7]) || 0,
      itemType: Number(record[8]) || 0,
      machineMoveId: Number(record[9]) || 0,
      ...(measuredEffect ? { measuredEffect } : {})
    };
  });
}

function buildMachines(messages, constants, mapInfos, moveDex) {
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
    const move = moveDex[moveId];
    const category = moveData[offset + 4];
    const rawPower = moveData[offset + 2];
    return {
      id: record[0],
      code: text(messages[7]?.[record[0]]).replace(/[.\s]+$/u, ""),
      kind: record[6] === 4 ? "CS" : "CT",
      moveId,
      move: text(messages[5]?.[moveId]) || `Capacité n°${moveId}`,
      description: text(messages[6]?.[moveId]),
      type: text(messages[12]?.[moveData[offset + 3]]) || "Inconnu",
      category: ["Physique", "Spéciale", "Statut"][category] || "Inconnue",
      power: rawPower === 1 ? null : rawPower,
      ...(rawPower === 1 ? { variablePower: true } : {}),
      accuracy: moveData[offset + 5],
      pp: moveData[offset + 6],
      mechanics: move?.mechanics || buildMoveMechanics(moveData, offset),
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

const NOTABLE_TRAINER_TYPE_IDS = [
  21, 23, 24, 26, 29, 33, 36, 41, 42, 45, 48, 52, 50, 54, 63, 65, 72, 73,
  82, 83, 84, 85, 86, 88, 104, 107, 111, 116, 117, 119, 123, 126, 139, 156,
  148, 158, 144, 182, 188, 189, 190, 192, 193
];

function buildNotableTrainers(messages) {
  const trainers = loadRubyMarshal(readData("trainers.dat"));
  const trainerNames = translatedHash(messages, 14);
  const moveData = readData("moves.dat");
  const dexData = readData("dexdata.dat");
  const caps = [17, 27, 36, 42, 50, 56, 70, 75, 80, 85, 94, 100];
  const appTypeName = (value) => ({ "Électrik": "Electrik", "Ténèbres": "Tenebres", "Fée": "Fee" }[value] || value);
  return trainers.filter((record) => NOTABLE_TRAINER_TYPE_IDS.includes(record[0])).map((record, index) => {
    const sourceName = text(record[1]);
    const className = text(messages[13]?.[record[0]]) || "Personnalité";
    const team = record[3].map((pokemon) => {
      const speciesId = pokemon[0];
      const dexOffset = (speciesId - 1) * 76;
      const types = [...new Set([dexData[dexOffset + 8], dexData[dexOffset + 9]])]
        .map((typeId) => appTypeName(text(messages[12]?.[typeId]) || "Inconnu"));
      const attacks = [...new Set(pokemon.slice(3, 7).filter(Boolean).map((moveId) => (
        appTypeName(text(messages[12]?.[moveData[moveId * 14 + 3]]) || "Inconnu")
      )))];
      return {
        speciesId,
        name: text(messages[1]?.[speciesId]) || `Pokémon n°${speciesId}`,
        level: pokemon[1],
        types,
        attacks
      };
    });
    const maxLevel = Math.max(...team.map((pokemon) => pokemon.level));
    const requiredBadges = Math.max(0, caps.findIndex((cap) => maxLevel <= cap));
    return {
      id: `trainer-${record[0]}-${record[4]}-${index}`,
      typeId: record[0],
      partyId: record[4],
      name: trainerNames.get(sourceName) || sourceName,
      title: className,
      category: /Régent|Régente/u.test(className) ? "Régents" : /Rival/u.test(className) ? "Rivaux" : "Personnalités",
      requiredBadges,
      minLevel: Math.min(...team.map((pokemon) => pokemon.level)),
      maxLevel,
      team
    };
  });
}

function alchemyRequiredBadges(location) {
  const route = Number(location.match(/Route (\d+)/u)?.[1]);
  const routeBadges = { 3: 1, 4: 1, 5: 2, 7: 3, 8: 3, 9: 5, 10: 4, 11: 5, 13: 6, 14: 7, 15: 8, 17: 9, 18: 9, 19: 10, 20: 10, 21: 10, 22: 11, 23: 11 };
  if (routeBadges[route] !== undefined) return routeBadges[route];
  const stages = [
    [/Navarroc|Grotte Navarre/u, 0], [/Bois-en-Tronc|(?:Manoir|Château) Rosillon|Bibliothèque Ancestrale/u, 1],
    [/Marais Impie|Clairière Collinaire|Sanctuaire Royal/u, 2], [/Ancien Atelier|Académie d'Essience|Château Drazat/u, 3],
    [/Bridouville|Jardin Boyard|Catacombes/u, 5], [/Vieux Vanitas|Jardin Vanitas/u, 6],
    [/Illumis|Café Soleil|Votre-Gentilhomme/u, 7], [/Pires-Aînées|Asile d'Hache-Âme/u, 8],
    [/Fonds Marins/u, 7], [/Bois du Dédale/u, 10]
  ];
  return stages.find(([pattern]) => pattern.test(location))?.[1] ?? 0;
}

function buildAlchemyPages(messages, mapInfos) {
  const mapNames = messages[21] || [];
  const pages = [];
  for (let mapId = 1; mapId < mapNames.length; mapId += 1) {
    const filename = path.join(dataDirectory, `Map${String(mapId).padStart(3, "0")}.rxdata`);
    if (!fs.existsSync(filename)) continue;
    const map = loadRubyMarshal(fs.readFileSync(filename));
    for (const [eventId, event] of map["@events"]?.entries() || []) {
      const grantsPage = (event["@pages"] || []).some((page) => (page["@list"] || []).some((command) => {
        const parameters = command["@parameters"] || [];
        return command["@code"] === 122 && parameters[0] <= 926 && parameters[1] >= 926 && parameters[2] === 1;
      }));
      if (!grantsPage) continue;
      const location = eventLocation(mapId, mapNames, mapInfos);
      pages.push({
        id: `alchemy-${mapId}-${eventId}`,
        location,
        mapId,
        x: event["@x"],
        y: event["@y"],
        requiredBadges: alchemyRequiredBadges(location),
        hint: `Cherche un point interactif à proximité des coordonnées internes ${event["@x"]}, ${event["@y"]}.`
      });
    }
  }
  return pages;
}

function buildStoryChapters(leaders) {
  const opening = { badges: 0, title: "Le départ", location: "Bourg Canvas → Grotte Navarre → Navarroc", recap: "L’aventure commence et l’Alchimie Pokémon est introduite avant la première grande épreuve." };
  return [opening, ...leaders.map((leader, index) => ({
    badges: index + 1,
    title: index === leaders.length - 1 ? "Après les douze victoires" : `Après ${index + 1} victoire${index ? "s" : ""}`,
    location: index === leaders.length - 1 ? "Suite de l’aventure et objectifs restants" : `Prochaine étape majeure : ${leaders[index + 1].location}`,
    recap: `La grande étape de ${leader.location} est terminée. ${index === leaders.length - 1 ? "Les contenus de fin d’aventure deviennent pertinents." : "Poursuis vers la prochaine forteresse en explorant les routes et détours désormais accessibles."}`
  }))];
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
const leaders = buildLeaders(messages);
const learnsetData = {
  moves: moveDex,
  naturalLearnsets: buildNaturalLearnsets(moveDex)
};
const wiki = {
  version: "Pokémon Z v2.12 FR",
  generatedFrom: "Données internes compilées du jeu",
  levelCaps: [17, 27, 36, 42, 50, 56, 70, 75, 80, 85, 94, 100],
  machines: buildMachines(messages, constants, mapInfos, moveDex),
  leaders,
  notableTrainers: buildNotableTrainers(messages),
  alchemyPages: buildAlchemyPages(messages, mapInfos),
  storyChapters: buildStoryChapters(leaders),
  mechanics,
  progressionGuides,
  quests: buildQuests(),
  items: buildItems(messages, constants),
  recipes: buildRecipes(messages, constants, scripts),
  achievements: buildAchievements(messages, scripts),
  trainerTips,
  minigames
};

const outputPath = path.resolve(__dirname, "../src/pokemon-z-wiki-data.js");
fs.writeFileSync(outputPath, `// Généré depuis les fichiers de Pokémon Z v2.12 FR.\nconst POKEMON_Z_WIKI_DATA = ${JSON.stringify(wiki, null, 2)};\n`, "utf8");
const learnsetOutputPath = path.resolve(__dirname, "../src/pokemon-z-learnset-data.js");
fs.writeFileSync(learnsetOutputPath, `// Généré depuis attacksRS.dat et moves.dat de Pokémon Z v2.12 FR.\nconst POKEMON_Z_LEARNSET_DATA = ${JSON.stringify(learnsetData)};\n`, "utf8");
const statsOutputPath = path.resolve(__dirname, "../src/pokemon-z-stats-data.js");
fs.writeFileSync(statsOutputPath, `// Généré depuis dexdata.dat et french.dat de Pokémon Z v2.12 FR.\nconst POKEMON_Z_V212_STATS = ${JSON.stringify(buildPokemonStats())};\nconst POKEMON_Z_V212_ABILITIES = ${JSON.stringify(buildPokemonAbilities(messages))};\n`, "utf8");
console.log(`Generated ${wiki.machines.length} machines, ${wiki.items.length} items, ${wiki.leaders.length} leaders, ${wiki.quests.length} quests, ${wiki.recipes.length} recipes and ${wiki.trainerTips.length} tips.`);
