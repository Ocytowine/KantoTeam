const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { loadRubyMarshal } = require("./lib/ruby-marshal");

const [sourcePath, outputDirectory] = process.argv.slice(2);
if (!sourcePath || !outputDirectory) {
  throw new Error("Usage: node scripts/extract-rgss-scripts.js <Scripts.rxdata> <output-directory>");
}

const scripts = loadRubyMarshal(fs.readFileSync(sourcePath));
fs.mkdirSync(outputDirectory, { recursive: true });
for (const [index, script] of scripts.entries()) {
  const name = script[1].toString("utf8").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_") || "unnamed";
  const source = zlib.inflateSync(script[2]);
  fs.writeFileSync(path.join(outputDirectory, `${String(index).padStart(3, "0")}-${name}.rb`), source);
}
console.log(`Extracted ${scripts.length} scripts to ${outputDirectory}.`);
