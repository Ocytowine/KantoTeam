const fs = require("fs");
const path = require("path");
const vm = require("vm");

const context = {};
for (const [file, exportCode] of [
  ["pokemon-z-data.js", "this.catalog = POKEMON_Z_V212;"],
  ["pokemon-z-guide-data.js", "this.documented = POKEMON_Z_GUIDE;"],
  ["pokemon-z-v212-encounter-data.js", "this.encounters = POKEMON_Z_V212_ENCOUNTERS; this.evolutions = POKEMON_Z_V212_EVOLUTIONS;"]
]) {
  const source = fs.readFileSync(path.resolve(__dirname, `../src/${file}`), "utf8");
  vm.runInNewContext(`${source}\n${exportCode}`, context);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

assert(context.catalog.length === 1018, "Le catalogue Pokémon Z doit contenir 1 018 entrées.");
assert(Object.keys(context.encounters).length === 679, "Le nombre de Pokémon disposant d’une obtention interne a changé.");
assert(Object.keys(context.evolutions).length === 499, "Le nombre de Pokémon obtenus par évolution interne a changé.");

const catalogIds = new Set(context.catalog.map((pokemon) => pokemon.id));
for (const [id, guide] of Object.entries(context.evolutions)) {
  assert(catalogIds.has(id), `Évolution associée à un identifiant inconnu : ${id}`);
  const seen = new Set();
  for (const method of guide.methods) {
    assert(method.kind === "evolution", `Type incorrect pour l’évolution de ${id}`);
    assert(method.confidence === "game-data", `Source interne absente pour l’évolution de ${id}`);
    assert(catalogIds.has(method.evolvesFrom), `Parent d’évolution inconnu pour ${id}`);
    assert(!/n°\d+|condition spéciale interne/i.test(method.text), `Condition non traduite pour ${id} : ${method.text}`);
    const key = normalize(method.text);
    assert(!seen.has(key), `Condition d’évolution dupliquée pour ${id} : ${method.text}`);
    seen.add(key);
  }
}

const acquisitionCounts = {};
for (const [id, guide] of Object.entries(context.encounters)) {
  assert(catalogIds.has(id), `Rencontre associée à un identifiant inconnu : ${id}`);
  const seen = new Set();
  for (const method of guide.methods) {
    acquisitionCounts[method.kind] = (acquisitionCounts[method.kind] || 0) + 1;
    assert(["capture", "gift", "trade", "fossil", "special"].includes(method.kind), `Type d’obtention incorrect pour ${id}`);
    assert(method.confidence === "game-data", `Source interne absente pour la rencontre de ${id}`);
    const key = normalize(method.text);
    assert(!seen.has(key), `Rencontre dupliquée pour ${id} : ${method.text}`);
    seen.add(key);
  }
}
assert(acquisitionCounts.capture === 648, "Le nombre de méthodes de capture internes a changé.");
assert(acquisitionCounts.gift === 36, "Le nombre de dons internes a changé.");
assert(acquisitionCounts.trade === 57, "Le nombre d’échanges PNJ internes a changé.");
assert(acquisitionCounts.fossil === 13, "Le nombre d’obtentions par fossile internes a changé.");
assert(acquisitionCounts.special === 5, "Le nombre d’obtentions spéciales internes a changé.");

assert(context.evolutions["pokemon-z-625"].methods[0].text === "Faire monter Scalpion au niveau 30.", "La règle interne Scalpion → Scalproie est incorrecte.");
assert(context.evolutions["pokemon-z-985"].methods[0].text === "Faire monter Scalproie au niveau 42.", "La règle interne Scalproie → Scalpereur est incorrecte.");
assert(context.evolutions["pokemon-z-292"].methods[0].text.includes("place libre"), "La condition complète de Munja est absente.");
assert(context.evolutions["pokemon-z-983"].methods.length === 2, "Les deux méthodes d’évolution vers Carmadura doivent être conservées.");
assert(context.evolutions["pokemon-z-984"].methods.length === 2, "Les deux méthodes d’évolution vers Malvalame doivent être conservées.");
assert(context.encounters["pokemon-z-720"].methods.some((method) => method.text.includes("600 jetons")), "Le coût interne exact de Hoopa est absent.");
assert(context.encounters["pokemon-z-772"].methods.some((method) => method.kind === "gift" && method.text.includes("niveau 90")), "Le don interne de Type:0 est absent.");

const covered = new Set([
  ...Object.keys(context.documented),
  ...Object.keys(context.encounters),
  ...Object.keys(context.evolutions)
]);
assert(context.catalog.every((pokemon) => covered.has(pokemon.id)), "Chaque Pokémon doit avoir au moins une information d’obtention ou d’évolution.");

function mergedMethods(id) {
  const internal = context.encounters[id]?.methods || [];
  const evolutions = context.evolutions[id]?.methods || [];
  const kinds = new Set(internal.map((method) => method.kind));
  const scriptedCapture = internal.some((method) => method.kind === "capture" && method.source.startsWith("Événements internes"));
  const definitive = scriptedCapture || kinds.has("gift") || kinds.has("special");
  const documented = (context.documented[id]?.methods || []).filter((method) => (
    method.confidence !== "official-master-document"
    && (method.kind !== "capture" || !(kinds.has("capture") || kinds.has("gift") || kinds.has("special")))
    && (method.kind !== "evolution" || !evolutions.length)
    && !(["trade", "gift", "fossil", "special"].includes(method.kind) && kinds.has(method.kind))
    && !(definitive && ["capture", "gift", "special"].includes(method.kind))
    && !(kinds.has("special") && method.kind === "trade")
    && !(scriptedCapture && method.kind === "fossil")
  ));
  const seen = new Set();
  return [...internal, ...evolutions, ...documented].filter((method) => {
    const key = `${method.kind}|${normalize(method.text)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

assert(context.catalog.every((pokemon) => mergedMethods(pokemon.id).length > 0), "Chaque fiche doit afficher au moins une méthode finale.");
assert(!Object.values(context.documented).flatMap((guide) => guide.methods).some((method) => method.confidence === "official-master-document"), "Les anciens échanges inversés sont encore présents.");
assert(mergedMethods("pokemon-z-720").some((method) => method.text.includes("600 jetons")), "Le coût final de Hoopa est incorrect.");
assert(!mergedMethods("pokemon-z-720").some((method) => method.text.includes("1400")), "L’ancien coût de Hoopa est encore affiché.");
assert(mergedMethods("pokemon-z-625").filter((method) => method.kind === "evolution").length === 1, "L’évolution de Scalproie est affichée en double.");

console.log("Pokémon Z guide data: OK");
