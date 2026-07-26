import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const baseline =
  process.argv[2] || "17d05f88ddbbc84384b9984e71d07930f4437ec4";
const session = process.argv[3] || "2";
const continuationBaseline =
  process.argv[4] || "207512b8305a17a644381e2b931856f41f857acf";
const handoffDirectory = path.join(projectRoot, "handoff");
const patchRelativePath = `handoff/session-${session}.patch`;
const patchPath = path.join(projectRoot, patchRelativePath);

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    ...options,
  });
}

function nullList(value) {
  return value.split("\0").filter(Boolean);
}

function validatePath(value) {
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  if (
    !value ||
    value.includes("\0") ||
    path.isAbsolute(value) ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new Error(`Unsafe checkpoint path: ${value}`);
  }
  return normalized;
}

await fs.mkdir(handoffDirectory, { recursive: true });
await fs.writeFile(patchPath, "", "utf8");

const statusTokens = nullList(
  git(["diff", "--name-status", "--find-renames", "-z", baseline, "--"]),
);
const changed = new Set();
const deleted = new Set();
for (let index = 0; index < statusTokens.length; ) {
  const status = statusTokens[index++];
  if (/^[RC]/.test(status)) {
    const previous = validatePath(statusTokens[index++]);
    const current = validatePath(statusTokens[index++]);
    if (status.startsWith("R")) deleted.add(previous);
    changed.add(current);
  } else {
    const target = validatePath(statusTokens[index++]);
    if (status.startsWith("D")) deleted.add(target);
    else changed.add(target);
  }
}

const untracked = nullList(
  git(["ls-files", "--others", "--exclude-standard", "-z"]),
).map(validatePath);
untracked.forEach((target) => changed.add(target));
changed.add(patchRelativePath);
deleted.forEach((target) => changed.delete(target));

const changedPaths = [...changed].sort();
const deletedPaths = [...deleted].sort();
await fs.writeFile(
  path.join(handoffDirectory, "CHANGED_FILES.json"),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      baselineCommit: baseline,
      continuationBaselineCommit: continuationBaseline,
      paths: changedPaths,
    },
    null,
    2,
  )}\n`,
  "utf8",
);
await fs.writeFile(
  path.join(handoffDirectory, "DELETED_FILES.json"),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      baselineCommit: baseline,
      continuationBaselineCommit: continuationBaseline,
      paths: deletedPaths,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const intentPaths = nullList(
  git(["ls-files", "--others", "--exclude-standard", "-z"]),
).map(validatePath);
if (intentPaths.length) {
  execFileSync("git", ["add", "--intent-to-add", "--", ...intentPaths], {
    cwd: projectRoot,
    stdio: "pipe",
    maxBuffer: 64 * 1024 * 1024,
  });
}

const patch = git([
  "diff",
  "--binary",
  baseline,
  "--",
  ".",
  `:(exclude)${patchRelativePath}`,
  ":(exclude)handoff/checksums.sha256",
]);
await fs.writeFile(patchPath, patch, "utf8");

const releasePaths = nullList(
  git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"]),
)
  .map(validatePath)
  .filter((target) => target !== "handoff/checksums.sha256")
  .sort();
const checksumLines = [];
for (const target of releasePaths) {
  const absolutePath = path.join(projectRoot, target);
  let stat;
  try {
    stat = await fs.lstat(absolutePath);
  } catch (error) {
    if (error?.code === "ENOENT") continue;
    throw error;
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`Checkpoint source must be a regular file: ${target}`);
  }
  const digest = createHash("sha256")
    .update(await fs.readFile(absolutePath))
    .digest("hex");
  checksumLines.push(`${digest}  ${target}`);
}
await fs.writeFile(
  path.join(handoffDirectory, "checksums.sha256"),
  `${checksumLines.join("\n")}\n`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      baseline,
      continuationBaseline,
      changedFiles: changedPaths.length,
      deletedFiles: deletedPaths.length,
      checksummedFiles: checksumLines.length,
      patch: patchRelativePath,
    },
    null,
    2,
  ),
);
