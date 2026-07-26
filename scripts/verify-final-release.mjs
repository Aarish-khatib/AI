import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import JSZip from "jszip";

const archivePath = resolve(process.argv[2] || "../Limitless-AI-v2-Final-Verified-Release.zip");
const archive = readFileSync(archivePath);
const zip = await JSZip.loadAsync(archive, { checkCRC32: true, createFolders: false });
const manifestFile = zip.file("release/FILE_MANIFEST.json");
assert.ok(manifestFile, "Release manifest is missing.");
const manifest = JSON.parse(await manifestFile.async("string"));
assert.equal(manifest.format, "limitless-ai-v2-portable-release");
assert.equal(manifest.version, 3);
const listed = new Set();
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
for (const entry of manifest.entries) {
  assert.ok(!listed.has(entry.path), `Duplicate manifest path: ${entry.path}`);
  listed.add(entry.path);
  const file = zip.file(entry.path);
  assert.ok(file, `Archive file is missing: ${entry.path}`);
  const bytes = await file.async("nodebuffer");
  assert.equal(bytes.byteLength, entry.size, `Size mismatch: ${entry.path}`);
  assert.equal(sha(bytes), entry.sha256, `Checksum mismatch: ${entry.path}`);
  assert.equal(
    (file.unixPermissions & 0o777).toString(8).padStart(4, "0"),
    entry.mode,
    `Permission mismatch: ${entry.path}`,
  );
}
for (const path of Object.keys(zip.files)) {
  assert.doesNotMatch(path, /(^|\/)(?:node_modules|\.git|\.next|dist|coverage|\.sites-runtime|\.vercel|\.wrangler|out|outputs|work)(\/|$)/);
  if (path !== ".env.example") assert.doesNotMatch(path, /(^|\/)\.env(?:\.|$)/);
  assert.doesNotMatch(path, /(?:^|\/)\.DS_Store$/);
  assert.doesNotMatch(path, /\.(?:key|keystore|log|p12|pem|zip)$/i);
  assert.equal(path.startsWith("/") || path.split("/").includes(".."), false, `Unsafe archive path: ${path}`);
  if (zip.files[path].dir) continue;
  assert.ok(listed.has(path) || path === "release/FILE_MANIFEST.json" || path === "release/SHA256SUMS.txt", `Unexpected archive file: ${path}`);
}
const required = [
  ".github/workflows/release-validation.yml",
  "docs/FINAL_DECISION_LOG.md",
  "docs/FINAL_FEATURE_MATRIX.md",
  "docs/FINAL_KNOWN_LIMITATIONS.md",
  "docs/FINAL_REQUIREMENTS_COMPLIANCE_MATRIX.md",
  "docs/FINAL_SECURITY_REPORT.md",
  "docs/FINAL_VALIDATION_REPORT.md",
  "docs/LIMITLESS_V2_PROGRESS.md",
  "docs/LIMITLESS_V2_SESSION_5_FINALE_REPORT.md",
  "docs/LIMITLESS_V2_TEST_REPORT.md",
  "docs/limitless-v2/DECISION_LOG.md",
  "docs/limitless-v2/FEATURE_MATRIX.json",
  "docs/limitless-v2/FEATURE_MATRIX.yaml",
  "docs/limitless-v2/RELEASE_GATES.md",
  "docs/limitless-v2/SESSION_LEDGER.md",
  "handoff/APPLY_INSTRUCTIONS.md",
  "handoff/ROLLBACK_INSTRUCTIONS.md",
  "handoff/SESSION_STATE.json",
  "handoff/VERIFY_INSTRUCTIONS.md",
  "handoff/apply-checkpoint.mjs",
  "handoff/checksums.sha256",
  "supabase/migrations/20260726143000_limitless_v2_finale.sql",
  "supabase/migrations/20260726190000_limitless_v2_verified_release.sql",
  "supabase/config.toml",
  "tests/finale.test.ts",
  "lib/finale/provider-runtime.ts",
  "scripts/validate-native.mjs",
  "scripts/validate-supabase.mjs",
];
for (const path of required) {
  assert.ok(listed.has(path), `Required release file is missing: ${path}`);
}
for (const path of [
  "handoff/verify-checkpoint.sh",
  "scripts/build-verified.sh",
  "scripts/install-ci.sh",
  "scripts/sites-env.sh",
  "scripts/validate-artifact.sh",
]) {
  const file = zip.file(path);
  assert.ok(file && (file.unixPermissions & 0o111) !== 0, `Executable permission is missing: ${path}`);
}
const sumsFile = zip.file("release/SHA256SUMS.txt");
assert.ok(sumsFile, "Release checksum list is missing.");
const expectedSums = `${manifest.entries
  .map((entry) => `${entry.sha256}  ${entry.path}`)
  .join("\n")}\n`;
assert.equal(await sumsFile.async("string"), expectedSums, "Release checksum list does not match the manifest.");
const secretPatterns = [
  /\bsk-(?:proj-|or-v1-)?[A-Za-z0-9_-]{24,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bsb_secret_[A-Za-z0-9_-]{16,}\b/g,
];
for (const path of listed) {
  if (/\.(?:png|jpg|jpeg|gif|webp|woff2?|zip|pdf|pptx|docx|xlsx)$/i.test(path)) continue;
  const text = await zip.file(path).async("string");
  for (const pattern of secretPatterns) {
    pattern.lastIndex = 0;
    assert.equal(pattern.test(text), false, `Secret-shaped value found in ${path}`);
  }
}
console.log(JSON.stringify({
  archive: archivePath,
  files: Object.keys(zip.files).length,
  bytes: archive.byteLength,
  sha256: sha(archive),
  verified: true,
}, null, 2));
