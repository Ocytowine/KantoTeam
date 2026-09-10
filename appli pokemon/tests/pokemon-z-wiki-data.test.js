const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function readConstant(filename, name) {
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${fs.readFileSync(filename, "utf8")}\nthis.result = ${name};`, context);
  return context.result;
}

const root = path.resolve(__dirname, "..");
const wiki = readConstant(path.join(root, "src/pokemon-z-wiki-data.js"), "POKEMON_Z_WIKI_DATA");
const catalog = readConstant(path.join(root, "src/pokemon-z-data.js"), "POKEMON_Z_V212");
const catalogSpeciesIds = new Set(catalog.map((pokemon) => Number(pokemon.id.replace("pokemon-z-", ""))));

assert.strictEqual(wiki.machines.length, 114, "Le wiki doit contenir 108 CT et 6 CS.");
assert.strictEqual(wiki.machines.filter((machine) => machine.kind === "CT").length, 108, "Nombre de CT incorrect.");
assert.strictEqual(wiki.machines.filter((machine) => machine.kind === "CS").length, 6, "Nombre de CS incorrect.");
assert.strictEqual(new Set(wiki.machines.map((machine) => machine.code)).size, 114, "Une CT ou CS est presente en double.");
assert(wiki.machines.filter((machine) => machine.kind === "CT").every((machine) => machine.sources.length), "Une CT n'a aucun lieu d'obtention detecte.");

for (const machine of wiki.machines) {
  assert.strictEqual(new Set(machine.compatibleSpeciesIds).size, machine.compatibleSpeciesIds.length, `${machine.code} contient des Pokemon compatibles en double.`);
  assert(machine.compatibleSpeciesIds.every((id) => catalogSpeciesIds.has(id)), `${machine.code} reference un Pokemon absent du catalogue Z.`);
  assert(machine.move && machine.description && machine.type && machine.category, `${machine.code} contient une fiche incomplete.`);
}

assert.strictEqual(wiki.leaders.length, 12, "Le parcours doit contenir 12 chefs.");
assert.strictEqual(wiki.leaders.reduce((total, leader) => total + leader.variants.length, 0), 14, "Le nombre de configurations de chefs est incorrect.");
assert.deepStrictEqual(Array.from(wiki.levelCaps), [17, 27, 36, 42, 50, 56, 70, 75, 80, 85, 94, 100], "Les plafonds de niveau ont change.");

for (const leader of wiki.leaders) {
  assert(leader.name && leader.location && leader.specialty, `La fiche du chef ${leader.order} est incomplete.`);
  assert(leader.variants.every((variant) => variant.team.length >= 3), `${leader.name} possede une equipe vide ou incomplete.`);
  assert(leader.variants.flatMap((variant) => variant.team).every((pokemon) => catalogSpeciesIds.has(pokemon.speciesId)), `${leader.name} reference un Pokemon absent du catalogue Z.`);
}

assert(wiki.mechanics.length >= 8, "Les principales mecaniques ne sont pas toutes documentees.");
assert(wiki.mechanics.every((entry) => entry.title && entry.summary && entry.details.length), "Une fiche de mecanique est incomplete.");

console.log("Pokémon Z wiki data: OK");
