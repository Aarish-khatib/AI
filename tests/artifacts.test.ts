import "fake-indexeddb/auto";

import assert from "node:assert/strict";
import test from "node:test";
import {
  generateArtifactFile,
  supportedExportFormats,
  validateArtifactFile,
} from "../lib/artifacts/exporters";
import { importArtifactFile } from "../lib/artifacts/importers";
import {
  createArtifact,
  evaluateFormula,
} from "../lib/artifacts/model";
import type {
  Artifact,
  ArtifactExportFormat,
  PresentationContent,
  SpreadsheetContent,
} from "../lib/artifacts/types";
import {
  activateWorkspace,
  checkpointArtifact,
  exportBackup,
  getActiveWorkspaceScope,
  getDeviceId,
  importBackup,
  loadArtifactVersions,
  loadArtifacts,
  recoverArtifact,
  restoreArtifactVersion,
  tombstoneArtifact,
} from "../lib/local-store";

function fileFromBlob(blob: Blob, name: string, type = blob.type): File {
  return new File([blob], name, { type });
}

test("artifact lifecycle is versioned, recoverable, and isolated between accounts", async () => {
  await activateWorkspace("session2-alice", { importAnonymous: false });
  const aliceScope = getActiveWorkspaceScope();
  const aliceDevice = await getDeviceId();
  const source = createArtifact({
    ownerId: aliceScope,
    deviceId: aliceDevice,
    type: "document",
    title: "Alice plan",
  });
  source.id = "shared-artifact-id";
  const created = await checkpointArtifact(source, "created", "Initial");
  assert.equal((await loadArtifacts()).length, 1);
  assert.equal((await loadArtifactVersions(source.id)).length, 1);

  const edited = structuredClone(created.artifact);
  if (edited.content.kind !== "document") {
    throw new Error("Expected document content.");
  }
  edited.content.blocks.push({
    id: "alice-private-block",
    kind: "paragraph",
    text: "Only Alice can see this.",
  });
  edited.updatedAt += 1;
  edited.revision += 1;
  const second = await checkpointArtifact(edited, "manual", "Alice revision");
  const versions = await loadArtifactVersions(source.id);
  assert.equal(versions.length, 2);
  assert.equal(versions[0].versionNumber, 2);

  const restored = await restoreArtifactVersion(
    second.artifact,
    versions.find((version) => version.versionNumber === 1)!,
    aliceDevice,
  );
  assert.equal(restored.artifact.content.kind, "document");
  if (restored.artifact.content.kind === "document") {
    assert.equal(
      restored.artifact.content.blocks.some(
        (block) => block.id === "alice-private-block",
      ),
      false,
    );
  }

  const removed = await tombstoneArtifact(restored.artifact, aliceDevice);
  assert.equal((await loadArtifacts()).length, 0);
  assert.equal((await loadArtifacts({ includeDeleted: true }))[0].deletedAt, removed.deletedAt);
  await recoverArtifact(removed, aliceDevice);
  assert.equal((await loadArtifacts()).length, 1);

  await activateWorkspace("session2-bob", { importAnonymous: false });
  assert.equal((await loadArtifacts()).length, 0);
  const bobScope = getActiveWorkspaceScope();
  const bobDevice = await getDeviceId();
  const bobArtifact = createArtifact({
    ownerId: bobScope,
    deviceId: bobDevice,
    type: "spreadsheet",
    title: "Bob ledger",
  });
  bobArtifact.id = "shared-artifact-id";
  await checkpointArtifact(bobArtifact, "created", "Bob initial");
  assert.equal((await loadArtifacts())[0].title, "Bob ledger");

  await activateWorkspace("session2-alice", { importAnonymous: false });
  const aliceArtifacts = await loadArtifacts();
  assert.equal(aliceArtifacts.length, 1);
  assert.equal(aliceArtifacts[0].title, "Alice plan");
  assert.equal(aliceArtifacts[0].ownerId, aliceScope);
});

test("v7 backup round-trips artifacts and rejects corruption before writing", async () => {
  await activateWorkspace("session2-backup-source", { importAnonymous: false });
  const ownerId = getActiveWorkspaceScope();
  const deviceId = await getDeviceId();
  const artifact = createArtifact({
    ownerId,
    deviceId,
    type: "canvas",
    title: "Portable canvas",
  });
  await checkpointArtifact(artifact, "created", "Portable initial");

  const backup = await exportBackup();
  const parsed = JSON.parse(await backup.text()) as {
    version: number;
    integrity: { digest: string };
    artifacts: Artifact[];
    artifactVersions: unknown[];
    artifactExports: unknown[];
    artifactAssets: unknown[];
    vault?: unknown;
  };
  assert.equal(parsed.version, 10);
  assert.equal(parsed.artifacts.length, 1);
  assert.equal(parsed.artifactVersions.length, 1);
  assert.equal(typeof parsed.integrity.digest, "string");
  assert.equal(parsed.vault, undefined);
  assert.doesNotMatch(JSON.stringify(parsed), /downloadUrl/);

  const corrupted = structuredClone(parsed);
  corrupted.artifacts[0].title = "Tampered title";
  const before = (await loadArtifacts({ includeDeleted: true })).length;
  await assert.rejects(
    importBackup(
      new File([JSON.stringify(corrupted)], "corrupted-limitless-backup.json", {
        type: "application/json",
      }),
    ),
    /integrity verification failed/i,
  );
  assert.equal((await loadArtifacts({ includeDeleted: true })).length, before);

  await activateWorkspace("session2-backup-target", { importAnonymous: false });
  const result = await importBackup(fileFromBlob(backup, "limitless-backup.json"));
  assert.equal(result.artifacts, 1);
  assert.equal(result.artifactVersions, 1);
  const restored = await loadArtifacts();
  assert.equal(restored[0].title, "Portable canvas");
  assert.equal(restored[0].ownerId, getActiveWorkspaceScope());
});

test("presentation, document, spreadsheet, and PDF exports are real validated files", async () => {
  const ownerId = "test-owner";
  const deviceId = "test-device";
  const presentation = createArtifact({
    ownerId,
    deviceId,
    type: "presentation",
    title: "Editable launch deck",
  });
  const presentationContent = presentation.content as PresentationContent;
  presentationContent.slides[0].elements.push(
    {
      id: "shape",
      kind: "shape",
      shape: "rectangle",
      x: 1,
      y: 4.8,
      width: 2,
      height: 1,
      fill: "#eeeeea",
      stroke: "#111111",
    },
    {
      id: "chart",
      kind: "chart",
      chartType: "bar",
      x: 7,
      y: 2,
      width: 4,
      height: 3,
      title: "Growth",
      labels: ["One", "Two", "Three"],
      values: [3, 7, 5],
    },
  );

  const document = createArtifact({
    ownerId,
    deviceId,
    type: "document",
    title: "Editable project brief",
  });
  if (document.content.kind !== "document") throw new Error("Expected document.");
  document.content.header = "Limitless AI";
  document.content.footer = "Private draft";
  document.content.blocks.push(
    {
      id: "list",
      kind: "list",
      ordered: true,
      items: ["Research", "Build", "Verify"],
    },
    {
      id: "table",
      kind: "table",
      header: true,
      rows: [
        ["Owner", "Status"],
        ["Team", "Ready"],
      ],
    },
  );

  const spreadsheet = createArtifact({
    ownerId,
    deviceId,
    type: "spreadsheet",
    title: "Editable forecast",
  });
  const spreadsheetContent = spreadsheet.content as SpreadsheetContent;
  const sheet = spreadsheetContent.sheets[0];
  sheet.cells = {
    A1: { value: "Month", style: { bold: true, fill: "#eeeeea" } },
    B1: { value: "Revenue", style: { bold: true, fill: "#eeeeea" } },
    A2: { value: "Jan" },
    B2: {
      value: 10,
      style: {
        italic: true,
        textColor: "#123456",
        numberFormat: "$#,##0.00",
        align: "right",
      },
    },
    A3: { value: "Feb" },
    B3: { value: 20 },
    B4: {
      value: null,
      formula: "=SUM(B2:B3)",
      computed: evaluateFormula("=SUM(B2:B3)", {
        B2: { value: 10 },
        B3: { value: 20 },
      }),
    },
  };
  sheet.frozenRows = 1;
  sheet.filterRange = "A1:B4";
  sheet.columnWidths = { A: 18, B: 22 };
  sheet.rowHeights = { "1": 24 };
  spreadsheetContent.sheets.push({
    id: "second-sheet",
    name: "Assumptions",
    cells: {
      A1: { value: "Growth" },
      B1: { value: 0.15, style: { numberFormat: "0.00%" } },
      A2: { value: "Conversion" },
      B2: { value: 0.42, style: { numberFormat: "0.00%" } },
    },
    columnWidths: {},
    rowHeights: {},
    frozenRows: 0,
    frozenColumns: 1,
    charts: [],
  });
  spreadsheetContent.activeSheetId = "second-sheet";

  const cases: Array<{
    artifact: Artifact;
    formats: ArtifactExportFormat[];
  }> = [
    { artifact: presentation, formats: ["pptx", "pdf", "json"] },
    {
      artifact: document,
      formats: ["docx", "pdf", "markdown", "html", "json"],
    },
    { artifact: spreadsheet, formats: ["xlsx", "csv", "pdf", "json"] },
  ];
  for (const item of cases) {
    for (const format of item.formats) {
      assert.equal(supportedExportFormats(item.artifact).includes(format), true);
      const generated = await generateArtifactFile(item.artifact, format);
      assert.ok(generated.blob.size > 20, `${format} should not be empty`);
      assert.equal(generated.checksum.length >= 14, true);
      const validation = await validateArtifactFile(format, generated.blob);
      assert.equal(validation.valid, true, `${format}: ${validation.detail}`);
    }
  }

  const pptx = await generateArtifactFile(presentation, "pptx");
  const importedDeck = await importArtifactFile({
    file: fileFromBlob(pptx.blob, pptx.fileName),
    ownerId,
    deviceId,
  });
  assert.equal(importedDeck.type, "presentation");
  assert.ok(importedDeck.importReport?.preserved.length);

  const docx = await generateArtifactFile(document, "docx");
  const importedDocument = await importArtifactFile({
    file: fileFromBlob(docx.blob, docx.fileName),
    ownerId,
    deviceId,
  });
  assert.equal(importedDocument.type, "document");

  const xlsx = await generateArtifactFile(spreadsheet, "xlsx");
  const importedWorkbook = await importArtifactFile({
    file: fileFromBlob(xlsx.blob, xlsx.fileName),
    ownerId,
    deviceId,
  });
  assert.equal(importedWorkbook.type, "spreadsheet");
  assert.equal(importedWorkbook.content.kind, "spreadsheet");
  if (importedWorkbook.content.kind === "spreadsheet") {
    assert.equal(importedWorkbook.content.sheets.length, 2);
    assert.equal(importedWorkbook.content.sheets[0].cells.B4.formula, "=SUM(B2:B3)");
    assert.equal(importedWorkbook.content.sheets[0].cells.B2.style?.italic, true);
    assert.equal(
      importedWorkbook.content.sheets[0].cells.B2.style?.textColor,
      "#123456",
    );
    assert.equal(
      importedWorkbook.content.sheets[0].cells.B2.style?.numberFormat,
      "$#,##0.00",
    );
    assert.equal(importedWorkbook.content.sheets[0].columnWidths.B, 22);
    assert.equal(importedWorkbook.content.sheets[0].rowHeights["1"], 24);
    assert.equal(importedWorkbook.content.sheets[0].frozenRows, 1);
    assert.equal(importedWorkbook.content.sheets[0].filterRange, "A1:B4");
    assert.equal(
      importedWorkbook.content.activeSheetId,
      importedWorkbook.content.sheets[1].id,
    );
  }
});

test("spreadsheet formulas are constrained to the safe supported grammar", () => {
  const cells = {
    A1: { value: 5 },
    A2: { value: 10 },
    A3: { value: "ignored" },
  };
  assert.equal(evaluateFormula("=SUM(A1:A3)", cells), 15);
  assert.equal(evaluateFormula("=AVERAGE(A1:A2)", cells), 7.5);
  assert.equal(evaluateFormula("=1+1", cells), "#UNSUPPORTED");
  assert.equal(evaluateFormula("=globalThis.process", cells), "#UNSUPPORTED");
  const canvas = createArtifact({
    ownerId: "test-owner",
    deviceId: "test-device",
    type: "canvas",
    title: "Exportable canvas",
  });
  assert.deepEqual(supportedExportFormats(canvas), ["png", "json"]);
});
