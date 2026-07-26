import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(path), "utf8");
const tauri = JSON.parse(read("desktop/src-tauri/tauri.conf.json"));
assert.equal(tauri.identifier, "com.limitless.ai.desktop");
assert.equal(tauri.build.beforeBuildCommand, "npm --prefix .. run build");
assert.equal(tauri.app.security.freezePrototype, true);
assert.match(tauri.app.security.csp, /object-src 'none'/);
assert.equal(tauri.plugins.updater.active, false);
assert.deepEqual(tauri.plugins.updater.endpoints, []);
assert.equal(tauri.bundle.createUpdaterArtifacts, false);
assert.doesNotMatch(JSON.stringify(tauri), /example\.invalid/i);

const releaseConfigurator = read("scripts/configure-tauri-release.mjs");
assert.match(releaseConfigurator, /LIMITLESS_UPDATER_ENDPOINT/);
assert.match(releaseConfigurator, /TAURI_SIGNING_PUBLIC_KEY/);
assert.match(releaseConfigurator, /endpoint\.protocol, "https:"/);
const desktopWorkflow = read(".github/workflows/desktop-release.yml");
assert.match(desktopWorkflow, /Configure signed updater/);
assert.match(desktopWorkflow, /projectPath: desktop\/src-tauri/);
assert.match(desktopWorkflow, /TAURI_SIGNING_PRIVATE_KEY/);
assert.match(desktopWorkflow, /APPLE_SIGNING_IDENTITY/);

assert.ok(existsSync(resolve("mobile/package-lock.json")), "Mobile lockfile is required.");
const mobilePackage = JSON.parse(read("mobile/package.json"));
for (const dependency of [
  "@capacitor/android",
  "@capacitor/core",
  "@capacitor/ios",
  "@capacitor/cli",
]) {
  const version =
    mobilePackage.dependencies?.[dependency] ||
    mobilePackage.devDependencies?.[dependency];
  assert.match(version || "", /^\d+\.\d+\.\d+$/, `${dependency} must be exactly pinned.`);
}
const mobileWorkflow = read(".github/workflows/mobile-build.yml");
assert.match(mobileWorkflow, /npx cap add android/);
assert.match(mobileWorkflow, /\.\/gradlew assembleDebug/);
assert.match(mobileWorkflow, /npx cap add ios/);
assert.match(mobileWorkflow, /xcodebuild/);
assert.match(mobileWorkflow, /CODE_SIGNING_ALLOWED=NO/);

console.log(JSON.stringify({
  desktopSource: "validated",
  desktopUpdaterDefault: "disabled",
  signedDesktopWorkflow: "credential-gated",
  androidWorkflow: "compile-configured",
  iosWorkflow: "simulator-compile-configured",
}, null, 2));
