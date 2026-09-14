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
const pokemonZStats = readConstant(path.join(root, "src/pokemon-z-stats-data.js"), "POKEMON_Z_V212_STATS");
const pokemonZAbilities = readConstant(path.join(root, "src/pokemon-z-stats-data.js"), "POKEMON_Z_V212_ABILITIES");
const catalogSpeciesIds = new Set(catalog.map((pokemon) => Number(pokemon.id.replace("pokemon-z-", ""))));

assert.strictEqual(wiki.machines.length, 114, "Le wiki doit contenir 108 CT et 6 CS.");
assert.strictEqual(wiki.machines.filter((machine) => machine.kind === "CT").length, 108, "Nombre de CT incorrect.");
assert.strictEqual(wiki.machines.filter((machine) => machine.kind === "CS").length, 6, "Nombre de CS incorrect.");
assert.strictEqual(new Set(wiki.machines.map((machine) => machine.code)).size, 114, "Une CT ou CS est presente en double.");
assert.strictEqual(wiki.machines.filter((machine) => machine.variablePower).length, 4, "Les quatre CT a puissance variable ne sont pas identifiees.");
assert(wiki.machines.filter((machine) => machine.variablePower).every((machine) => machine.power === null), "Une puissance variable est encore exposee comme une valeur fixe.");
assert(wiki.machines.filter((machine) => machine.kind === "CT").every((machine) => machine.sources.length), "Une CT n'a aucun lieu d'obtention detecte.");
assert.strictEqual(wiki.machines.filter((machine) => machine.kind === "CS" && machine.relatedMachines?.length).length, 4, "Les quatre CT equivalentes aux CS ne sont pas reliees.");
assert(wiki.machines.filter((machine) => machine.kind === "CS").every((machine) => machine.fieldUse), "Une CS ne decrit pas son usage sur le terrain.");
assert.strictEqual(Object.keys(learnsetData.naturalLearnsets).length, 1018, "Les listes d'apprentissage des 1 018 especes internes sont incompletes.");
assert(Object.keys(learnsetData.moves).length >= 700, "Le dictionnaire des capacites du jeu est incomplet.");
const moveByName = (name) => Object.values(learnsetData.moves).find((move) => move.name === name);
assert(Object.values(learnsetData.moves).every((move) => move.mechanics?.functionCode && move.mechanics.target && Array.isArray(move.mechanics.traits) && Array.isArray(move.mechanics.notes)), "Une capacite ne possede pas ses valeurs internes detaillees.");
assert.strictEqual(moveByName("Tonnerre").mechanics.effectChance, 10, "La probabilite de paralysie de Tonnerre est incorrecte.");
assert(moveByName("Danse Lames").mechanics.notes.some((note) => note.includes("+2 niveaux d'Attaque")), "Danse Lames ne precise pas son augmentation reelle.");
assert(moveByName("Gyroballe").mechanics.notes.some((note) => note.includes("150") && note.includes("Vitesse")), "La plage de puissance de Gyroballe est absente.");
assert(moveByName("Soin").mechanics.notes.some((note) => note.includes("50 %")), "La quantite restauree par Soin est absente.");
assert.strictEqual(moveByName("Abri").mechanics.priority, 4, "La priorite interne d'Abri est incorrecte.");

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
  assert(machine.mechanics?.functionCode && machine.mechanics.target, `${machine.code} ne reprend pas les conditions internes de sa capacite.`);
}

assert.strictEqual(wiki.leaders.length, 12, "Le parcours doit contenir 12 chefs.");
assert.strictEqual(wiki.leaders.reduce((total, leader) => total + leader.variants.length, 0), 14, "Le nombre de configurations de chefs est incorrect.");
assert.deepStrictEqual(Array.from(wiki.levelCaps), [17, 27, 36, 42, 50, 56, 70, 75, 80, 85, 94, 100], "Les plafonds de niveau ont change.");

assert.strictEqual(wiki.storyChapters.length, 13, "Le guide anti-spoiler doit couvrir le depart et les 12 grandes etapes.");
assert.deepStrictEqual(Array.from(wiki.storyChapters, (chapter) => chapter.badges), Array.from({ length: 13 }, (_, index) => index), "Les etapes du guide ne suivent pas la progression.");
assert(wiki.storyChapters.every((chapter) => chapter.title && chapter.location && chapter.recap), "Une etape du guide d'aventure est incomplete.");

assert.strictEqual(wiki.alchemyPages.length, 47, "Les 47 pages physiques d'alchimie ne sont pas toutes referencees.");
assert.strictEqual(new Set(wiki.alchemyPages.map((page) => page.id)).size, 47, "Une page physique d'alchimie est presente en double.");
assert(wiki.alchemyPages.every((page) => page.location && page.requiredBadges >= 0 && page.requiredBadges <= 12), "Une page d'alchimie a une progression invalide.");

const appTypes = new Set(["Normal", "Feu", "Eau", "Electrik", "Plante", "Glace", "Combat", "Poison", "Sol", "Vol", "Psy", "Insecte", "Roche", "Spectre", "Dragon", "Tenebres", "Acier", "Fee"]);
assert.strictEqual(wiki.notableTrainers.length, 62, "Les equipes des personnages importants sont incompletes.");
assert.strictEqual(new Set(wiki.notableTrainers.map((trainer) => trainer.id)).size, 62, "Une equipe de personnage important est presente en double.");
assert(wiki.notableTrainers.every((trainer) => trainer.name && trainer.title && trainer.team.length >= 1 && trainer.team.length <= 6), "Une equipe Versus importante est incomplete.");
assert(wiki.notableTrainers.flatMap((trainer) => trainer.team).every((pokemon) => catalogSpeciesIds.has(pokemon.speciesId)), "Une equipe Versus reference un Pokemon absent du catalogue Z.");
assert(wiki.notableTrainers.flatMap((trainer) => trainer.team).every((pokemon) => [...pokemon.types, ...pokemon.attacks].every((type) => appTypes.has(type))), "Une equipe Versus utilise un type incompatible avec l'app.");

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
assert.strictEqual(wiki.items.length, 906, "Le catalogue d'objets interne est incomplet.");
assert(wiki.items.every((item) => item.name && item.description && item.pocket), "Une fiche d'objet est incomplete.");
assert.strictEqual(wiki.items.filter((item) => item.pocket === "Poké Balls").length, 28, "La liste des Poké Balls est incomplete.");
const itemByName = (name) => wiki.items.find((item) => item.name === name);
assert.strictEqual(itemByName("Calcium").measuredEffect?.headline, "+10 EV en Attaque Spéciale par utilisation", "L'effet reel du Calcium n'est pas chiffre.");
assert.strictEqual(itemByName("Plume Esprit").measuredEffect?.headline, "+1 EV en Attaque Spéciale par utilisation", "L'effet reel de la Plume Esprit n'est pas chiffre.");
assert.strictEqual(itemByName("Injection Calcium").measuredEffect?.headline, "+20 EV en Attaque Spéciale par utilisation", "L'effet reel de l'Injection Calcium n'est pas chiffre.");
assert.strictEqual(itemByName("Pilule Att. Spéciale").measuredEffect?.headline, "+7 IV en Attaque Spéciale par utilisation", "La valeur executee par les Pilules doit primer sur leur description incorrecte.");
assert.strictEqual(itemByName("Pilule Radiante").measuredEffect?.headline, "+7 IV dans chacune des six statistiques", "L'effet reel de la Pilule Radiante n'est pas chiffre.");
assert.strictEqual(Object.keys(pokemonZStats).length, 1018, "Les statistiques de Pokémon Z sont incomplètes.");
assert.deepStrictEqual(Array.from(Object.values(pokemonZStats[1])), [50, 49, 49, 45, 65, 65], "Les statistiques de Bulbizarre ne proviennent pas de Pokémon Z.");
assert.strictEqual(Object.keys(pokemonZAbilities).length, 1018, "Les talents de Pokémon Z sont incomplets.");
assert(Object.values(pokemonZAbilities).every((abilities) => abilities.length), "Un Pokémon Z ne possède aucun talent documenté.");
assert.deepStrictEqual(Array.from(pokemonZAbilities[25], (ability) => ability.name), ["Toxitouche", "Point Poison"], "Les talents spécifiques de Pikachu sont incorrects.");
assert(pokemonZAbilities[15].some((ability) => ability.name === "Vrille de là!" && ability.hidden), "Le talent caché propre à Dardargnan est absent.");
assert.strictEqual(pokemonZAbilities[1018][0].name, "Aura Dorée", "Le talent du Fakemon Auretosk est absent.");
assert.strictEqual(wiki.achievements.length, 27, "La liste des succes doit contenir 27 entrees.");
assert.strictEqual(wiki.trainerTips.length, 39, "Les astuces de dresseur uniques sont incompletes.");
assert.strictEqual(wiki.minigames.length, 9, "La liste des mini-jeux detectes est incomplete.");
assert(wiki.progressionGuides.every((guide) => guide.hints.length === 3), "Une aide progressive ne possede pas trois niveaux.");

const frenchContent = JSON.stringify({ quests: wiki.quests, achievements: wiki.achievements, trainerTips: wiki.trainerTips });
assert(!/\b(?:Ciudad|Pueblo|Ruta|Vence|Derrota|Consigue|Encuentra|Misión|Pista)\b/u.test(frenchContent), "Du texte espagnol subsiste dans les fiches francaises.");

console.log("Pokémon Z wiki data: OK");
