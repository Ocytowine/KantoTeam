const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { EXPECTED_CHANGED_SPECIES_IDS } = require("./pokemon-z-sprite-config");

const appRoot = path.resolve(__dirname, "..");
const destinationDirectory = path.join(appRoot, "assets/pokemon-z-sprites");
const sourceDirectory = path.resolve(process.argv[2] || destinationDirectory);
if (!fs.existsSync(sourceDirectory)) throw new Error(`Dossier de sprites introuvable : ${sourceDirectory}`);

const catalogSource = fs.readFileSync(path.join(appRoot, "src/pokemon-z-data.js"), "utf8");
const knownSpeciesIds = new Set([...catalogSource.matchAll(/"id": "pokemon-z-(\d+)"/g)]
  .map((match) => Number(match[1])));
for (const speciesId of EXPECTED_CHANGED_SPECIES_IDS) {
  if (!knownSpeciesIds.has(speciesId)) throw new Error(`Numéro de sprite modifié inconnu dans Pokémon Z : ${speciesId}`);
}

function numberedPngFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^\d{3,4}\.png$/i.test(entry.name))
    .map((entry) => entry.name);
}

function verifyPng(filePath) {
  const content = fs.readFileSync(filePath);
  if (content.length < 24
    || content.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    || content.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error(`${path.basename(filePath)} n'est pas un PNG valide.`);
  }
  return content;
}

const existingFiles = fs.existsSync(destinationDirectory) ? numberedPngFiles(destinationDirectory) : [];
const sourceFiles = numberedPngFiles(sourceDirectory);
const files = new Map();
for (const [directory, name] of [
  ...existingFiles.map((name) => [destinationDirectory, name]),
  ...sourceFiles.map((name) => [sourceDirectory, name])
]) {
  const speciesId = Number(name.slice(0, -4));
  if (!knownSpeciesIds.has(speciesId)) throw new Error(`Sprite ${name} : aucun Pokémon Z interne avec le numéro ${speciesId}.`);
  const content = verifyPng(path.join(directory, name));
  if (files.has(speciesId) && files.get(speciesId).name.toLowerCase() !== name.toLowerCase()) {
    throw new Error(`Deux fichiers désignent le Pokémon Z n°${speciesId}.`);
  }
  files.set(speciesId, { directory, name, content });
}
if (!files.size) throw new Error("Aucun PNG numéroté trouvé dans ce dossier ou dans les assets existants.");

fs.mkdirSync(destinationDirectory, { recursive: true });
for (const { directory, name, content } of files.values()) {
  if (path.resolve(directory) !== path.resolve(destinationDirectory)) fs.writeFileSync(path.join(destinationDirectory, name), content);
}

const sprites = {};
for (const [speciesId, { name, content }] of [...files].sort(([left], [right]) => left - right)) {
  const version = crypto.createHash("sha256").update(content).digest("hex").slice(0, 10);
  sprites[speciesId] = `assets/pokemon-z-sprites/${name}?v=${version}`;
}
const output = `// Sprites individuels de Pokémon Z, indexés par numéro interne du jeu.\nconst POKEMON_Z_LOCAL_SPRITES = ${JSON.stringify(sprites, null, 2)};\n`;
fs.writeFileSync(path.join(appRoot, "src/pokemon-z-sprite-data.js"), output, "utf8");

const missing = EXPECTED_CHANGED_SPECIES_IDS.filter((speciesId) => !files.has(speciesId));
console.log(`Référencé ${files.size} sprites Pokémon Z individuels (${sourceFiles.length} dans le dossier fourni).`);
console.log(missing.length
  ? `Sprites modifiés encore attendus (${missing.length}) : ${missing.map((id) => String(id).padStart(3, "0") + ".png").join(", ")}`
  : "Tous les sprites modifiés attendus sont présents.");
