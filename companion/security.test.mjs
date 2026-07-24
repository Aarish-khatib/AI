import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  canonicalWorkspace,
  createApprovalGate,
  resolveInsideWorkspace,
  safeCommandEnvironment,
} from "./security.mjs";

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "limitless-security-"));
  const workspace = path.join(root, "workspace");
  const outside = path.join(root, "outside");
  await fs.mkdir(workspace);
  await fs.mkdir(outside);
  await fs.writeFile(path.join(outside, "secret.txt"), "outside");
  return {
    root,
    workspace: await canonicalWorkspace(workspace),
    outside,
    cleanup: () => fs.rm(root, { recursive: true, force: true }),
  };
}

test("blocks lexical traversal outside the workspace", async () => {
  const item = await fixture();
  try {
    await assert.rejects(
      resolveInsideWorkspace(item.workspace, "../outside/secret.txt"),
      /outside the selected workspace/,
    );
  } finally {
    await item.cleanup();
  }
});

test("blocks symlink escapes for reads and future writes", async () => {
  const item = await fixture();
  try {
    await fs.symlink(item.outside, path.join(item.workspace, "linked"));
    await assert.rejects(
      resolveInsideWorkspace(item.workspace, "linked/secret.txt"),
      /outside the selected workspace/,
    );
    await assert.rejects(
      resolveInsideWorkspace(item.workspace, "linked/new.txt", { allowMissing: true }),
      /outside the selected workspace/,
    );
  } finally {
    await item.cleanup();
  }
});

test("allows a missing path whose nearest ancestor is inside the workspace", async () => {
  const item = await fixture();
  try {
    const target = await resolveInsideWorkspace(item.workspace, "new/deep/file.txt", {
      allowMissing: true,
    });
    assert.equal(target, path.join(item.workspace, "new", "deep", "file.txt"));
  } finally {
    await item.cleanup();
  }
});

test("approval codes are one-time and bound to the exact payload", () => {
  let issued;
  const gate = createApprovalGate({ onCode: (value) => { issued = value; } });
  const request = gate.request("write_file", { path: "safe.txt", content: "a" });
  assert.throws(
    () =>
      gate.verify({
        id: request.id,
        code: issued.code,
        action: "write_file",
        payload: { path: "safe.txt", content: "changed" },
      }),
    /exact action/,
  );
  assert.equal(
    gate.verify({
      id: request.id,
      code: issued.code,
      action: "write_file",
      payload: { path: "safe.txt", content: "a" },
    }),
    true,
  );
  assert.throws(
    () =>
      gate.verify({
        id: request.id,
        code: issued.code,
        action: "write_file",
        payload: { path: "safe.txt", content: "a" },
      }),
    /missing or expired/,
  );
});

test("command environment excludes provider and cloud secrets", () => {
  const safe = safeCommandEnvironment(
    {
      PATH: "/usr/bin",
      LANG: "en_US.UTF-8",
      OPENROUTER_API_KEY: "secret",
      SUPABASE_SERVICE_ROLE_KEY: "secret",
      AWS_SECRET_ACCESS_KEY: "secret",
      GITHUB_TOKEN: "secret",
    },
    "/workspace/project",
  );
  assert.equal(safe.PATH, "/usr/bin");
  assert.equal(safe.LIMITLESS_WORKSPACE, "/workspace/project");
  assert.equal(safe.OPENROUTER_API_KEY, undefined);
  assert.equal(safe.SUPABASE_SERVICE_ROLE_KEY, undefined);
  assert.equal(safe.AWS_SECRET_ACCESS_KEY, undefined);
  assert.equal(safe.GITHUB_TOKEN, undefined);
});
