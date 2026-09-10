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
const learnsetData = readConstant(path.join(root, "src/pokemon-z-learnset-data.js"), "POKEMON_Z_LEARNSET_DATA");
const catalog = readConstant(path.join(root, "src/pokemon-z-data.js"), "POKEMON_Z_V212");
const catalogSpeciesIds = new Set(catalog.map((pokemon) => Number(pokemon.id.replace("pokemon-z-", ""))));

assert.strictEqual(wiki.machines.length, 114, "Le wiki doit contenir 108 CT et 6 CS.");
assert.strictEqual(wiki.machines.filter((machine) => machine.kind === "CT").length, 108, "Nombre de CT incorrect.");
assert.strictEqual(wiki.machines.filter((machine) => machine.kind === "CS").length, 6, "Nombre de CS incorrect.");
assert.strictEqual(new Set(wiki.machines.map((machine) => machine.code)).size, 114, "Une CT ou CS est presente en double.");
assert(wiki.machines.filter((machine) => machine.kind === "CT").every((machine) => machine.sources.length), "Une CT n'a aucun lieu d'obtention detecte.");
assert.strictEqual(wiki.machines.filter((machine) => machine.kind === "CS" && machine.relatedMachines?.length).length, 4, "Les quatre CT equivalentes aux CS ne sont pas reliees.");
assert(wiki.machines.filter((machine) => machine.kind === "CS").every((machine) => machine.fieldUse), "Une CS ne decrit pas son usage sur le terrain.");
assert.strictEqual(Object.keys(learnsetData.naturalLearnsets).length, 1018, "Les listes d'apprentissage des 1 018 especes internes sont incompletes.");
assert(Object.keys(learnsetData.moves).length >= 700, "Le dictionnaire des capacites du jeu est incomplet.");

for (const [speciesId, learnset] of Object.entries(learnsetData.naturalLearnsets)) {
  assert(catalogSpeciesIds.has(Number(speciesId)), `La liste d'apprentissage ${speciesId} ne correspond a aucun Pokemon Z.`);
  assert(learnset.every(([level, moveId]) => Number.isInteger(level) && level >= 0 && learnsetData.moves[moveId]), `La liste d'apprentissage ${speciesId} contient une capacite invalide.`);
  assert.strictEqual(new Set(learnset.map(([level, moveId]) => `${level}:${moveId}`)).size, learnset.length, `La liste d'apprentissage ${speciesId} contient un doublon exact.`);
}

const bulbasaurLearnset = learnsetData.naturalLearnsets[1].map(([level, moveId]) => [level, learnsetData.moves[moveId].name]);
assert.deepStrictEqual(Array.from(bulbasaurLearnset[0]), [1, "Charge"], "La premiere capacite naturelle de Bulbizarre est incorrecte.");
assert(bulbasaurLearnset.some(([level, move]) => level === 9 && move === "Fouet Lianes"), "Le niveau de Fouet Lianes pour Bulbizarre est incorrect.");

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
assert.strictEqual(wiki.quests.length, 45, "Le tableau de missions doit contenir 45 objectifs.");
assert.strictEqual(new Set(wiki.quests.map((quest) => quest.switchId)).size, 45, "Une mission est presente en double.");
assert(wiki.quests.every((quest) => quest.title && quest.location && quest.objective), "Une mission est incomplete.");
assert.strictEqual(wiki.recipes.length, 50, "Le livre d'alchimie doit contenir 50 recettes.");
assert(wiki.recipes.every((recipe) => recipe.result && recipe.ingredients.length >= 1), "Une recette est incomplete.");
assert.strictEqual(wiki.achievements.length, 27, "La liste des succes doit contenir 27 entrees.");
assert.strictEqual(wiki.trainerTips.length, 39, "Les astuces de dresseur uniques sont incompletes.");
assert.strictEqual(wiki.minigames.length, 9, "La liste des mini-jeux detectes est incomplete.");
assert(wiki.progressionGuides.every((guide) => guide.hints.length === 3), "Une aide progressive ne possede pas trois niveaux.");

const frenchContent = JSON.stringify({ quests: wiki.quests, achievements: wiki.achievements, trainerTips: wiki.trainerTips });
assert(!/\b(?:Ciudad|Pueblo|Ruta|Vence|Derrota|Consigue|Encuentra|Misión|Pista)\b/u.test(frenchContent), "Du texte espagnol subsiste dans les fiches francaises.");

console.log("Pokémon Z wiki data: OK");
