import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import JSZip from "jszip";

const root = process.cwd();
const output = resolve(process.argv[2] || join(dirname(root), "Limitless-AI-v2-Final-Verified-Release.zip"));
const generated = new Set(["release/FILE_MANIFEST.json", "release/SHA256SUMS.txt"]);
const excludedParts = new Set([
  ".git", ".next", ".sites-runtime", ".vercel", ".wrangler", "coverage",
  "dist", "node_modules", "out", "outputs", "work",
]);
const forbiddenFiles = [
  /^\.env(?:\.|$)/,
  /(?:^|\/)\.DS_Store$/,
  /\.(?:key|keystore|log|p12|pem)$/i,
];
const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");
const files = [];

function walk(directory) {
  for (const name of readdirSync(directory).sort()) {
    const absolute = join(directory, name);
    const path = relative(root, absolute).split(sep).join("/");
    if (excludedParts.has(name) || path.endsWith(".tsbuildinfo") || path.endsWith(".zip")) continue;
    if (forbiddenFiles.some((pattern) => pattern.test(path)) && path !== ".env.example") {
      throw new Error(`Private or temporary file blocks release packaging: ${path}`);
    }
    const stat = statSync(absolute, { throwIfNoEntry: true });
    if (stat.isSymbolicLink()) throw new Error(`Symlinks are not portable: ${path}`);
    if (stat.isDirectory()) walk(absolute);
    else if (!generated.has(path)) {
      files.push({
        path,
        absolute,
        size: stat.size,
        mode: stat.mode & 0o777,
      });
    }
  }
}

mkdirSync(join(root, "release"), { recursive: true });
walk(root);
const entries = files.map((file) => {
  const bytes = readFileSync(file.absolute);
  return {
    path: file.path,
    size: bytes.byteLength,
    mode: file.mode.toString(8).padStart(4, "0"),
    sha256: sha(bytes),
  };
});
const manifest = {
  format: "limitless-ai-v2-portable-release",
  version: 3,
  generatedAt: new Date().toISOString(),
  excluded: Array.from(excludedParts).sort(),
  entries,
};
writeFileSync(join(root, "release/FILE_MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(
  join(root, "release/SHA256SUMS.txt"),
  `${entries.map((entry) => `${entry.sha256}  ${entry.path}`).join("\n")}\n`,
);

const zip = new JSZip();
for (const file of files) {
  zip.file(file.path, readFileSync(file.absolute), {
    date: new Date(0),
    unixPermissions: file.mode,
  });
}
zip.file(
  "release/FILE_MANIFEST.json",
  readFileSync(join(root, "release/FILE_MANIFEST.json")),
  { date: new Date(0), unixPermissions: 0o644 },
);
zip.file(
  "release/SHA256SUMS.txt",
  readFileSync(join(root, "release/SHA256SUMS.txt")),
  { date: new Date(0), unixPermissions: 0o644 },
);
const archive = await zip.generateAsync({
  type: "nodebuffer",
  compression: "DEFLATE",
  compressionOptions: { level: 9 },
  platform: "UNIX",
});
writeFileSync(output, archive);
console.log(JSON.stringify({
  output,
  file: basename(output),
  files: entries.length + 2,
  bytes: archive.byteLength,
  sha256: sha(archive),
}, null, 2));
