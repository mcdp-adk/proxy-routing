// Writes rules/*.list in a form Loon reads: each GEOSITE line becomes the
// domains of that category's classical list from MetaCubeX/meta-rules-dat.
//
// Usage: node scripts/loon.mjs <out-dir> [<category-dir>]
// With <category-dir>, categories are read from <category>.list files there
// instead of being downloaded.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rulesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "rules");
const categoryUrl = (category) =>
  `https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/classical/${encodeURIComponent(category).replaceAll("!", "%21")}.list`;
// Domain rules Loon supports. Categories may also hold DOMAIN-REGEX, which Loon
// lacks; those lines are dropped from categories, and rejected anywhere else.
const loonTypes = new Set(["DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD"]);
const droppedCategoryTypes = new Set(["DOMAIN-REGEX"]);

const [outDir, categoryDir] = process.argv.slice(2);
if (!outDir) throw new Error("usage: node scripts/loon.mjs <out-dir> [<category-dir>]");

const loadCategory = async (category) => {
  if (categoryDir) return readFileSync(path.join(categoryDir, `${category}.list`), "utf8");
  const response = await fetch(categoryUrl(category));
  if (!response.ok) throw new Error(`GEOSITE,${category}: GET ${categoryUrl(category)}: ${response.status}`);
  return response.text();
};

const domainRules = (text, source, droppedTypes = new Set()) =>
  text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .filter((line) => {
      const [type, value, ...rest] = line.split(",");
      if (droppedTypes.has(type)) return false;
      if (!loonTypes.has(type) || !value || rest.length > 0) {
        throw new Error(`${source}: Loon cannot use "${line}"`);
      }
      return true;
    });

const expand = async (file) => {
  const lines = [];
  for (const line of readFileSync(path.join(rulesDir, file), "utf8").split(/\r?\n/)) {
    if (line.startsWith("GEOSITE,")) {
      const category = line.slice("GEOSITE,".length);
      const rules = domainRules(await loadCategory(category), `GEOSITE,${category}`, droppedCategoryTypes);
      if (rules.length === 0) throw new Error(`GEOSITE,${category}: no rules`);
      lines.push(...rules);
    } else if (!line.trim() || line.startsWith("#")) {
      lines.push(line);
    } else {
      lines.push(...domainRules(line, `rules/${file}`));
    }
  }
  return `# Generated from rules/${file} by scripts/loon.mjs.\n${lines.join("\n").trimEnd()}\n`;
};

// Expand everything before writing anything, so a failed expansion writes nothing.
const files = readdirSync(rulesDir).filter((file) => file.endsWith(".list"));
const lists = await Promise.all(files.map(async (file) => [file, await expand(file)]));
mkdirSync(outDir, { recursive: true });
for (const [file, text] of lists) writeFileSync(path.join(outDir, file), text);
