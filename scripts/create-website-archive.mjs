import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(projectRoot, "public", "Limitless-AI-Website.zip");
const temporaryPath = `${outputPath}.tmp`;
const archiveRoot = "limitless-ai-website";

const excludedDirectories = new Set([
  ".git",
  ".next",
  ".openai",
  ".sites-runtime",
  ".vercel",
  ".vinext",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "outputs",
  "work",
]);

const excludedPublicFiles = new Set([
  "public/Limitless-AI-Website.zip",
  "public/Limitless-AI-Website.zip.tmp",
  "public/SHA256SUMS.txt",
  "public/download-windows.html",
  "public/limitless-ai-complete.zip",
  "public/limitless-desktop-app.zip",
  "public/limitless-desktop-companion.zip",
]);

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

const crc32 = (data) => {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const dosTimestamp = (date) => {
  const year = Math.min(Math.max(date.getFullYear(), 1980), 2107);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
};

const shouldExclude = (relativePath, isDirectory) => {
  const normalized = relativePath.split(path.sep).join("/");
  const firstSegment = normalized.split("/")[0];
  if (isDirectory && excludedDirectories.has(firstSegment)) return true;
  if (excludedDirectories.has(firstSegment)) return true;
  if (excludedPublicFiles.has(normalized)) return true;
  if (normalized.startsWith("public/downloads/")) return true;
  if (normalized === ".DS_Store" || normalized.endsWith("/.DS_Store")) return true;
  if (
    normalized === ".env" ||
    (normalized.startsWith(".env.") && normalized !== ".env.example")
  ) return true;
  if (normalized.endsWith(".tsbuildinfo")) return true;
  return false;
};

const collectFiles = async (directory = projectRoot) => {
  const files = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.relative(projectRoot, absolutePath);
    if (shouldExclude(relativePath, entry.isDirectory())) continue;
    if (entry.isDirectory()) files.push(...await collectFiles(absolutePath));
    else if (entry.isFile()) files.push(relativePath);
  }
  return files.sort((a, b) => a.localeCompare(b));
};

const makeArchive = async () => {
  const files = await collectFiles();
  const localChunks = [];
  const centralChunks = [];
  let localOffset = 0;

  for (const relativePath of files) {
    const absolutePath = path.join(projectRoot, relativePath);
    const data = await fs.readFile(absolutePath);
    const compressed = deflateRawSync(data, { level: 9 });
    const stat = await fs.stat(absolutePath);
    const { time, date } = dosTimestamp(stat.mtime);
    const name = Buffer.from(`${archiveRoot}/${relativePath.split(path.sep).join("/")}`, "utf8");
    const checksum = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localChunks.push(localHeader, name, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(0x0314, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(date, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(((relativePath.endsWith(".sh") ? 0o100755 : 0o100644) << 16) >>> 0, 38);
    centralHeader.writeUInt32LE(localOffset, 42);
    centralChunks.push(centralHeader, name);

    localOffset += localHeader.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralChunks);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  end.writeUInt16LE(0, 20);

  await fs.writeFile(temporaryPath, Buffer.concat([...localChunks, centralDirectory, end]));
  await fs.rm(outputPath, { force: true });
  await fs.rename(temporaryPath, outputPath);
  const outputStat = await fs.stat(outputPath);
  console.log(`Created ${path.basename(outputPath)} (${files.length} files, ${outputStat.size} bytes).`);
};

await makeArchive();
