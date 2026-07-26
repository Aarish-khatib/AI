import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const configurationPath = resolve("desktop/src-tauri/tauri.conf.json");
const endpointValue = String(process.env.LIMITLESS_UPDATER_ENDPOINT || "").trim();
const publicKey = String(process.env.TAURI_SIGNING_PUBLIC_KEY || "").trim();
assert.ok(endpointValue, "LIMITLESS_UPDATER_ENDPOINT is required for a signed desktop release.");
assert.ok(publicKey, "TAURI_SIGNING_PUBLIC_KEY is required for a signed desktop release.");
const endpoint = new URL(endpointValue);
assert.equal(endpoint.protocol, "https:", "The updater endpoint must use HTTPS.");
assert.doesNotMatch(endpoint.hostname, /(?:^|\.)example\.(?:com|invalid)$/i);
assert.equal(endpoint.username || endpoint.password, "", "Updater URLs cannot contain credentials.");

const configuration = JSON.parse(readFileSync(configurationPath, "utf8"));
configuration.bundle.createUpdaterArtifacts = true;
configuration.plugins.updater = {
  active: true,
  endpoints: [endpoint.toString()],
  pubkey: publicKey,
};
writeFileSync(configurationPath, `${JSON.stringify(configuration, null, 2)}\n`);
console.log("Tauri signed-release updater configuration injected.");
