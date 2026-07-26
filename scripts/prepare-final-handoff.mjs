import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = process.cwd();
const baselineArgument = process.argv[2];
if (!baselineArgument) {
  throw new Error(
    "Usage: node scripts/prepare-final-handoff.mjs /absolute/path/to/v5-baseline",
  );
}
const baseline = resolve(baselineArgument);
const excludedParts = new Set([
  ".git",
  ".next",
  ".sites-runtime",
  ".vercel",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "outputs",
  "release",
  "work",
]);
const generatedChecksum = "handoff/checksums.sha256";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

function validateProject(directory, label) {
  const packagePath = join(directory, "package.json");
  if (!existsSync(packagePath)) throw new Error(`${label} has no package.json.`);
  const manifest = JSON.parse(readFileSync(packagePath, "utf8"));
  if (manifest.name !== "limitless-ai") {
    throw new Error(`${label} is not a Limitless AI source tree.`);
  }
}

function walk(directory, base, result) {
  for (const name of readdirSync(directory).sort()) {
    const absolute = join(directory, name);
    const path = relative(base, absolute).split(sep).join("/");
    if (excludedParts.has(name)) continue;
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new Error(`Symlink is not portable: ${path}`);
    if (stat.isDirectory()) {
      walk(absolute, base, result);
      continue;
    }
    if (!stat.isFile()) throw new Error(`Unsupported source entry: ${path}`);
    if (path.endsWith(".tsbuildinfo") || path.endsWith(".zip")) continue;
    result.set(path, {
      sha256: sha(readFileSync(absolute)),
      size: stat.size,
    });
  }
}

function sourceMap(directory) {
  const result = new Map();
  walk(directory, directory, result);
  return result;
}

validateProject(root, "Current source");
validateProject(baseline, "Baseline");
mkdirSync(join(root, "handoff"), { recursive: true });

const current = sourceMap(root);
const previous = sourceMap(baseline);
const changed = [];
const deleted = [];

for (const [path, entry] of current) {
  const baselineEntry = previous.get(path);
  if (!baselineEntry || baselineEntry.sha256 !== entry.sha256) changed.push(path);
}
for (const path of previous.keys()) {
  if (!current.has(path)) deleted.push(path);
}

for (const required of [
  "handoff/CHANGED_FILES.json",
  "handoff/DELETED_FILES.json",
  generatedChecksum,
]) {
  if (!changed.includes(required)) changed.push(required);
}
changed.sort();
deleted.sort();

writeFileSync(
  join(root, "handoff/CHANGED_FILES.json"),
  `${JSON.stringify(
    {
      schemaVersion: 2,
      baseline: "Limitless AI v5",
      release: "Limitless AI v2 Final",
      generatedAt: new Date().toISOString(),
      paths: changed,
    },
    null,
    2,
  )}\n`,
);
writeFileSync(
  join(root, "handoff/DELETED_FILES.json"),
  `${JSON.stringify(
    {
      schemaVersion: 2,
      baseline: "Limitless AI v5",
      release: "Limitless AI v2 Final",
      generatedAt: new Date().toISOString(),
      paths: deleted,
    },
    null,
    2,
  )}\n`,
);

const finalFiles = sourceMap(root);
const checksumLines = [...finalFiles.entries()]
  .filter(([path]) => path !== generatedChecksum)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, entry]) => `${entry.sha256}  ${path}`);
writeFileSync(
  join(root, generatedChecksum),
  `${checksumLines.join("\n")}\n`,
);

console.log(
  JSON.stringify(
    {
      baseline,
      changedFiles: changed.length,
      deletedFiles: deleted.length,
      checksummedFiles: checksumLines.length,
    },
    null,
    2,
  ),
);
