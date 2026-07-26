import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(scriptDirectory, "..");
const args = process.argv.slice(2);
const targetArgument = args.find((value) => !value.startsWith("--"));
const apply = args.includes("--apply");
const confirmDeletions = args.includes("--confirm-deletions");

function usage() {
  console.log(`Usage:
  node handoff/apply-checkpoint.mjs /absolute/path/to/existing-repository
  node handoff/apply-checkpoint.mjs /absolute/path/to/existing-repository --apply --confirm-deletions

The default mode prints a plan. --apply performs the copy. Deletions require
the separate --confirm-deletions flag.`);
}

function validateRelativePath(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.includes("\0") ||
    path.isAbsolute(value)
  ) {
    throw new Error(`Unsafe manifest path: ${String(value)}`);
  }
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  if (normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`Manifest path escapes the project: ${value}`);
  }
  return normalized;
}

async function readManifest(filename) {
  const parsed = JSON.parse(
    await fs.readFile(path.join(scriptDirectory, filename), "utf8"),
  );
  if (!Array.isArray(parsed.paths)) {
    throw new Error(`${filename} does not contain a paths array.`);
  }
  return parsed.paths.map(validateRelativePath);
}

async function exists(filename) {
  try {
    await fs.lstat(filename);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function assertRegularFile(filename, label) {
  const stat = await fs.lstat(filename);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`${label} must be a regular file: ${filename}`);
  }
  return stat;
}

if (!targetArgument || args.includes("--help")) {
  usage();
  process.exit(targetArgument ? 0 : 1);
}

const targetRoot = path.resolve(targetArgument);
const filesystemRoot = path.parse(targetRoot).root;
if (targetRoot === filesystemRoot || targetRoot === sourceRoot) {
  throw new Error("Refusing a filesystem root or the checkpoint source itself.");
}

const sourcePackage = JSON.parse(
  await fs.readFile(path.join(sourceRoot, "package.json"), "utf8"),
);
const targetPackagePath = path.join(targetRoot, "package.json");
if (!(await exists(targetPackagePath))) {
  throw new Error(
    "Target must be an existing Limitless AI repository with package.json.",
  );
}
await assertRegularFile(targetPackagePath, "Target package.json");
const targetPackage = JSON.parse(await fs.readFile(targetPackagePath, "utf8"));
if (sourcePackage.name !== targetPackage.name || sourcePackage.name !== "limitless-ai") {
  throw new Error("Target package identity does not match Limitless AI.");
}

const changedPaths = await readManifest("CHANGED_FILES.json");
const deletedPaths = await readManifest("DELETED_FILES.json");

console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : "plan-only",
      sourceRoot,
      targetRoot,
      changedFiles: changedPaths.length,
      deletedFiles: deletedPaths,
    },
    null,
    2,
  ),
);

if (!apply) {
  console.log("No files changed. Add --apply after reviewing this plan.");
  process.exit(0);
}
if (deletedPaths.length > 0 && !confirmDeletions) {
  throw new Error(
    "Deletion manifest is non-empty. Review it and add --confirm-deletions.",
  );
}

const timestamp = new Date().toISOString().replaceAll(":", "-");
const backupRoot = path.join(
  path.dirname(targetRoot),
  ".limitless-ai-checkpoint-backups",
  `${path.basename(targetRoot)}-${timestamp}`,
);
const report = {
  appliedAt: new Date().toISOString(),
  sourceRoot,
  targetRoot,
  backupRoot,
  overwritten: [],
  created: [],
  deleted: [],
};

await fs.mkdir(backupRoot, { recursive: true });

for (const relativePath of changedPaths) {
  const sourcePath = path.join(sourceRoot, relativePath);
  const targetPath = path.join(targetRoot, relativePath);
  const sourceStat = await assertRegularFile(sourcePath, "Checkpoint source");

  if (await exists(targetPath)) {
    await assertRegularFile(targetPath, "Existing target");
    const backupPath = path.join(backupRoot, relativePath);
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.copyFile(targetPath, backupPath);
    report.overwritten.push(relativePath);
  } else {
    report.created.push(relativePath);
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
  await fs.chmod(targetPath, sourceStat.mode & 0o777);
}

for (const relativePath of deletedPaths) {
  const targetPath = path.join(targetRoot, relativePath);
  if (!(await exists(targetPath))) continue;
  await assertRegularFile(targetPath, "Deletion target");
  const backupPath = path.join(backupRoot, relativePath);
  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  await fs.copyFile(targetPath, backupPath);
  await fs.unlink(targetPath);
  report.deleted.push(relativePath);
}

await fs.writeFile(
  path.join(backupRoot, "apply-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(`Checkpoint applied. Backup and report: ${backupRoot}`);
