import assert from "node:assert/strict";
import test from "node:test";
import {
  copySafeWorkspaceData,
  settingMayCrossWorkspace,
} from "../lib/workspace-scope.mjs";

test("workspace copy excludes common credential-bearing settings", () => {
  const privateNames = [
    "password", "backup-passphrase", "oauth-auth-state", "bearer-header",
    "private_key", "refresh-token", "apiKey", "credential-cache",
    "authorToken", "authorization-header", "oauthState", "session-id", "secret-value", "vault-metadata",
  ];
  for (const name of privateNames) {
    assert.equal(settingMayCrossWorkspace(name), false, name);
  }
  for (const name of ["author-name", "defaultAuthorName", "author_color"]) {
    assert.equal(settingMayCrossWorkspace(name), true, name);
  }
  assert.equal(settingMayCrossWorkspace("theme"), true);
  assert.equal(settingMayCrossWorkspace("quality-boost"), true);
});

test("workspace copy preserves benign preferences but omits credentials", () => {
  const original = {
    settings: {
      theme: "mono",
      "quality-boost": true,
      "backup-password": "do-not-copy",
      "oauth-auth-state": "do-not-copy",
      "private-key": "do-not-copy",
    },
    memory: [{ id: "user-approved-note", text: "example" }],
  };
  const copied = copySafeWorkspaceData(original);
  assert.deepEqual(copied.settings, { theme: "mono", "quality-boost": true });
  assert.deepEqual(copied.memory, original.memory);
  assert.notEqual(copied.memory, original.memory);
});
