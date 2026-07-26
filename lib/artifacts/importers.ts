import type {
  Artifact,
  ArtifactContent,
  ArtifactType,
  DocumentBlock,
  ImportCompatibilityReport,
  PresentationSlide,
  SpreadsheetCell,
} from "@/lib/artifacts/types";
import {
  createArtifact,
  createDocumentContent,
  createPresentationContent,
  createSpreadsheetContent,
} from "@/lib/artifacts/model";
import { uid } from "@/lib/types";

export type ImportableArtifactFile = {
  name: string;
  type?: string;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
};

function notice(feature: string, detail: string) {
  return { feature, detail };
}

function baseReport(file: ImportableArtifactFile, sourceFormat: string): ImportCompatibilityReport {
  return {
    sourceName: file.name,
    sourceFormat,
    importedAt: Date.now(),
    preserved: [],
    converted: [],
    unsupported: [],
    warnings: [],
    missingFontsOrAssets: [],
  };
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function xmlText(xml: string, tag: string): string[] {
  const expression = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "g");
  return [...xml.matchAll(expression)].map((match) =>
    decodeXmlText(match[1].replace(/<[^>]+>/g, "")),
  );
}

function xmlAttribute(xml: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(
    new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`),
  );
  return match ? decodeXmlText(match[1] ?? match[2] ?? "") : undefined;
}

type SafeZipEntry = {
  dir: boolean;
  unsafeOriginalName?: string;
  _data?: { uncompressedSize?: number };
  async(type: "text"): Promise<string>;
};

type SafeZipArchive = {
  files: Record<string, SafeZipEntry>;
  file(path: string): SafeZipEntry | null;
};

const OFFICE_ARCHIVE_MAX_FILES = 2_000;
const OFFICE_ARCHIVE_MAX_FILE_BYTES = 32 * 1024 * 1024;
const OFFICE_ARCHIVE_MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const OFFICE_XML_MAX_CHARACTERS = 32 * 1024 * 1024;

async function loadSafeOfficeArchive(buffer: ArrayBuffer): Promise<SafeZipArchive> {
  const JSZip = (await import("jszip")).default;
  const archive = (await JSZip.loadAsync(buffer, {
    checkCRC32: true,
    createFolders: false,
  })) as unknown as SafeZipArchive;
  const entries = Object.entries(archive.files);
  if (entries.length > OFFICE_ARCHIVE_MAX_FILES) {
    throw new Error("The Office package contains too many files to import safely.");
  }
  let totalBytes = 0;
  for (const [path, entry] of entries) {
    const original = entry.unsafeOriginalName || path;
    if (
      original.includes("\0") ||
      original.includes("\\") ||
      original.startsWith("/") ||
      original.split("/").includes("..")
    ) {
      throw new Error("The Office package contains an unsafe file path.");
    }
    if (entry.dir) continue;
    const size = Number(entry._data?.uncompressedSize || 0);
    if (!Number.isFinite(size) || size < 0 || size > OFFICE_ARCHIVE_MAX_FILE_BYTES) {
      throw new Error("An Office package file exceeds the safe import limit.");
    }
    totalBytes += size;
    if (totalBytes > OFFICE_ARCHIVE_MAX_TOTAL_BYTES) {
      throw new Error("The Office package exceeds the safe import limit.");
    }
  }
  return archive;
}

async function readOfficeXml(
  archive: SafeZipArchive,
  path: string,
  required = true,
): Promise<string> {
  const entry = archive.file(path);
  if (!entry) {
    if (required) throw new Error(`The Office package is missing ${path}.`);
    return "";
  }
  const xml = await entry.async("text");
  if (xml.length > OFFICE_XML_MAX_CHARACTERS) {
    throw new Error(`${path} exceeds the safe XML import limit.`);
  }
  return xml;
}

function resolveOfficeRelationshipTarget(base: string, target: string): string {
  const parts = (target.startsWith("/") ? target.slice(1) : `${base}/${target}`)
    .split("/")
    .filter(Boolean);
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      if (!resolved.length) throw new Error("The Office package has an unsafe relationship.");
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }
  const path = resolved.join("/");
  if (!path.startsWith("xl/")) {
    throw new Error("The workbook relationship points outside the workbook package.");
  }
  return path;
}

function finiteInteger(value: string | undefined, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : fallback;
}

function parseSpreadsheetValue(
  type: string | undefined,
  raw: string | undefined,
  inlineText: string,
  sharedStrings: string[],
): SpreadsheetCell["value"] {
  if (type === "inlineStr") return inlineText;
  if (type === "s") {
    const index = finiteInteger(raw, -1);
    return index >= 0 && index < sharedStrings.length ? sharedStrings[index] : "";
  }
  if (type === "b") return raw === "1" || raw === "true";
  if (type === "str" || type === "e" || type === "d") return raw || "";
  if (raw === undefined || raw === "") return null;
  const number = Number(raw);
  return Number.isFinite(number) ? number : decodeXmlText(raw);
}

const BUILTIN_NUMBER_FORMATS: Record<number, string> = {
  0: "General",
  1: "0",
  2: "0.00",
  3: "#,##0",
  4: "#,##0.00",
  9: "0%",
  10: "0.00%",
  11: "0.00E+00",
  12: "# ?/?",
  13: "# ??/??",
  14: "mm-dd-yy",
  15: "d-mmm-yy",
  16: "d-mmm",
  17: "mmm-yy",
  18: "h:mm AM/PM",
  19: "h:mm:ss AM/PM",
  20: "h:mm",
  21: "h:mm:ss",
  22: "m/d/yy h:mm",
  37: "#,##0 ;(#,##0)",
  38: "#,##0 ;[Red](#,##0)",
  39: "#,##0.00;(#,##0.00)",
  40: "#,##0.00;[Red](#,##0.00)",
  49: "@",
};

function parseXlsxStyles(xml: string): Array<SpreadsheetCell["style"] | undefined> {
  if (!xml) return [undefined];
  const customFormats = new Map<number, string>();
  for (const match of xml.matchAll(/<numFmt\b([^>]*)\/?>/g)) {
    const id = finiteInteger(xmlAttribute(match[1], "numFmtId"), -1);
    const format = xmlAttribute(match[1], "formatCode");
    if (id >= 0 && format) customFormats.set(id, format);
  }
  const fontsXml = xml.match(/<fonts\b[^>]*>([\s\S]*?)<\/fonts>/)?.[1] || "";
  const fonts = [...fontsXml.matchAll(/<font\b[^>]*>([\s\S]*?)<\/font>/g)].map(
    (match) => {
      const colorTag = match[1].match(/<color\b([^>]*)\/?>/)?.[1] || "";
      const rgb = xmlAttribute(colorTag, "rgb");
      return {
        bold: /<b(?:\s[^>]*)?\/?>/.test(match[1]) || undefined,
        italic: /<i(?:\s[^>]*)?\/?>/.test(match[1]) || undefined,
        textColor: rgb ? `#${rgb.slice(-6)}` : undefined,
      };
    },
  );
  const fillsXml = xml.match(/<fills\b[^>]*>([\s\S]*?)<\/fills>/)?.[1] || "";
  const fills = [...fillsXml.matchAll(/<fill\b[^>]*>([\s\S]*?)<\/fill>/g)].map(
    (match) => {
      const colorTag = match[1].match(/<fgColor\b([^>]*)\/?>/)?.[1] || "";
      const rgb = xmlAttribute(colorTag, "rgb");
      return rgb ? `#${rgb.slice(-6)}` : undefined;
    },
  );
  const cellXfs = xml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] || "";
  const styles: Array<SpreadsheetCell["style"] | undefined> = [];
  for (const match of cellXfs.matchAll(
    /<xf\b([^>]*?)(?:\/>|>([\s\S]*?)<\/xf>)/g,
  )) {
    const attributes = match[1];
    const body = match[2] || "";
    const font = fonts[finiteInteger(xmlAttribute(attributes, "fontId"))] || {};
    const fill = fills[finiteInteger(xmlAttribute(attributes, "fillId"))];
    const numberFormatId = finiteInteger(xmlAttribute(attributes, "numFmtId"));
    const numberFormat =
      customFormats.get(numberFormatId) || BUILTIN_NUMBER_FORMATS[numberFormatId];
    const alignmentTag = body.match(/<alignment\b([^>]*)\/?>/)?.[1] || "";
    const horizontal = xmlAttribute(alignmentTag, "horizontal");
    const align: "left" | "center" | "right" | undefined =
      horizontal === "left" || horizontal === "center" || horizontal === "right"
        ? horizontal
        : undefined;
    const style = {
      bold: font.bold,
      italic: font.italic,
      textColor: font.textColor,
      fill,
      numberFormat: numberFormatId ? numberFormat : undefined,
      align,
    };
    styles.push(Object.values(style).some((value) => value !== undefined) ? style : undefined);
  }
  return styles.length ? styles : [undefined];
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else value += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  if (value || row.length) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function columnName(index: number): string {
  let result = "";
  let value = index + 1;
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function artifactTitle(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Imported artifact";
}

async function importCsv(
  file: ImportableArtifactFile,
): Promise<{ type: ArtifactType; content: ArtifactContent; report: ImportCompatibilityReport }> {
  const report = baseReport(file, "csv");
  const rows = parseCsv((await file.text()).replace(/^\uFEFF/, ""));
  const content = createSpreadsheetContent();
  const sheet = content.sheets[0];
  rows.forEach((row, rowIndex) =>
    row.forEach((raw, columnIndex) => {
      const value = raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : raw;
      sheet.cells[`${columnName(columnIndex)}${rowIndex + 1}`] = {
        value,
        style: rowIndex === 0 ? { bold: true } : undefined,
      };
    }),
  );
  report.preserved.push(notice("Cell values", `${rows.length} rows imported`));
  report.converted.push(notice("Single sheet", "CSV has no workbook-level sheet metadata."));
  return { type: "spreadsheet", content, report };
}

async function importXlsx(
  file: ImportableArtifactFile,
): Promise<{ type: ArtifactType; content: ArtifactContent; report: ImportCompatibilityReport }> {
  const report = baseReport(file, "xlsx");
  const archive = await loadSafeOfficeArchive(await file.arrayBuffer());
  const workbookXml = await readOfficeXml(archive, "xl/workbook.xml");
  const relationshipsXml = await readOfficeXml(
    archive,
    "xl/_rels/workbook.xml.rels",
  );
  const sharedStringsXml = await readOfficeXml(
    archive,
    "xl/sharedStrings.xml",
    false,
  );
  const stylesXml = await readOfficeXml(archive, "xl/styles.xml", false);
  const sharedStrings = [
    ...sharedStringsXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g),
  ].map((match) => xmlText(match[1], "t").join(""));
  const styles = parseXlsxStyles(stylesXml);
  const relationships = new Map<string, string>();
  for (const match of relationshipsXml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const attributes = match[1];
    const id = xmlAttribute(attributes, "Id");
    const target = xmlAttribute(attributes, "Target");
    const type = xmlAttribute(attributes, "Type") || "";
    const external = xmlAttribute(attributes, "TargetMode") === "External";
    if (id && target && !external && type.endsWith("/worksheet")) {
      relationships.set(id, resolveOfficeRelationshipTarget("xl", target));
    }
  }
  const sheetEntries = [...workbookXml.matchAll(/<sheet\b([^>]*)\/?>/g)].map(
    (match, index) => ({
      name: xmlAttribute(match[1], "name") || `Sheet ${index + 1}`,
      relationshipId: xmlAttribute(match[1], "r:id"),
    }),
  );
  const activeTab = finiteInteger(
    xmlAttribute(workbookXml.match(/<workbookView\b([^>]*)\/?>/)?.[1] || "", "activeTab"),
  );
  let content = createSpreadsheetContent();
  content.sheets = [];
  for (const [sheetIndex, source] of sheetEntries.entries()) {
    const path = source.relationshipId
      ? relationships.get(source.relationshipId)
      : undefined;
    if (!path) {
      report.warnings.push(
        notice(
          `Sheet ${sheetIndex + 1}`,
          "The worksheet relationship was missing, so this sheet could not be imported.",
        ),
      );
      continue;
    }
    const sheetXml = await readOfficeXml(archive, path);
    const cells: Record<string, SpreadsheetCell> = {};
    for (const match of sheetXml.matchAll(
      /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,
    )) {
      const attributes = match[1];
      const body = match[2] || "";
      const reference = (xmlAttribute(attributes, "r") || "").toUpperCase();
      if (!/^[A-Z]{1,3}[1-9]\d{0,6}$/.test(reference)) continue;
      const type = xmlAttribute(attributes, "t");
      const value = xmlText(body, "v")[0];
      const inlineText = xmlText(body, "t").join("");
      const formula = xmlText(body, "f")[0];
      const styleIndex = finiteInteger(xmlAttribute(attributes, "s"));
      const style = styles[styleIndex];
      const parsedValue = parseSpreadsheetValue(
        type,
        value,
        inlineText,
        sharedStrings,
      );
      cells[reference] = formula
        ? {
            value: null,
            formula: `=${formula}`,
            computed: parsedValue,
            style,
          }
        : { value: parsedValue, style };
    }
    const columnWidths: Record<string, number> = {};
    for (const match of sheetXml.matchAll(/<col\b([^>]*)\/?>/g)) {
      const minimum = Math.max(1, finiteInteger(xmlAttribute(match[1], "min"), 1));
      const maximum = Math.min(
        16_384,
        Math.max(minimum, finiteInteger(xmlAttribute(match[1], "max"), minimum)),
      );
      const width = Number(xmlAttribute(match[1], "width"));
      if (!Number.isFinite(width) || width <= 0) continue;
      for (let index = minimum; index <= maximum; index += 1) {
        columnWidths[columnName(index - 1)] = Math.min(255, width);
      }
    }
    const rowHeights: Record<string, number> = {};
    for (const match of sheetXml.matchAll(/<row\b([^>]*)/g)) {
      const row = finiteInteger(xmlAttribute(match[1], "r"));
      const height = Number(xmlAttribute(match[1], "ht"));
      if (row > 0 && Number.isFinite(height) && height > 0) {
        rowHeights[String(row)] = Math.min(409, height);
      }
    }
    const pane = sheetXml.match(/<pane\b([^>]*)\/?>/)?.[1] || "";
    const filterRange = xmlAttribute(
      sheetXml.match(/<autoFilter\b([^>]*)\/?>/)?.[1] || "",
      "ref",
    );
    const id = uid();
    content.sheets.push({
      id,
      name: source.name,
      cells,
      columnWidths,
      rowHeights,
      frozenRows: Math.min(
        1_048_576,
        finiteInteger(xmlAttribute(pane, "ySplit")),
      ),
      frozenColumns: Math.min(
        16_384,
        finiteInteger(xmlAttribute(pane, "xSplit")),
      ),
      filterRange,
      charts: [],
    });
  }
  if (!content.sheets.length) content = createSpreadsheetContent();
  content.activeSheetId =
    content.sheets[Math.min(activeTab, content.sheets.length - 1)]?.id ||
    content.sheets[0].id;
  report.preserved.push(
    notice("Workbook structure", `${content.sheets.length} sheet(s), cell values and formulas imported`),
  );
  report.converted.push(
    notice(
      "Formatting",
      "Common fonts, fills, number formats, alignment, dimensions, freeze panes and filters converted.",
    ),
  );
  report.unsupported.push(
    notice(
      "Macros and advanced workbook objects",
      "Macros, external links, pivot tables, embedded drawings and unsupported formula features are not imported.",
    ),
  );
  return { type: "spreadsheet", content, report };
}

async function importDocx(
  file: ImportableArtifactFile,
): Promise<{ type: ArtifactType; content: ArtifactContent; report: ImportCompatibilityReport }> {
  const report = baseReport(file, "docx");
  const archive = await loadSafeOfficeArchive(await file.arrayBuffer());
  const documentXml = await readOfficeXml(archive, "word/document.xml");
  const paragraphs = [...documentXml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)];
  const blocks: DocumentBlock[] = [];
  for (const paragraph of paragraphs) {
    const text = xmlText(paragraph[1], "w:t").join("");
    if (!text.trim()) continue;
    const style = paragraph[1].match(/<w:pStyle[^>]*w:val="([^"]+)"/)?.[1] || "";
    if (/Heading1/i.test(style)) blocks.push({ id: uid(), kind: "heading", level: 1, text });
    else if (/Heading2/i.test(style)) blocks.push({ id: uid(), kind: "heading", level: 2, text });
    else if (/Heading3/i.test(style)) blocks.push({ id: uid(), kind: "heading", level: 3, text });
    else blocks.push({ id: uid(), kind: "paragraph", text });
  }
  const content = createDocumentContent(artifactTitle(file.name));
  content.blocks = blocks.length ? blocks : content.blocks;
  report.preserved.push(notice("Text structure", `${blocks.length} editable paragraphs imported`));
  report.converted.push(notice("Paragraph styles", "Heading levels and body paragraphs converted."));
  report.unsupported.push(
    notice("Advanced Word layout", "Track changes, floating objects, fields and section geometry may require manual review."),
  );
  if (Object.keys(archive.files).some((path) => path.startsWith("word/media/"))) {
    report.missingFontsOrAssets.push(
      notice("Embedded media", "Media remains in the source package but is not yet linked to document blocks."),
    );
  }
  return { type: "document", content, report };
}

async function importPptx(
  file: ImportableArtifactFile,
): Promise<{ type: ArtifactType; content: ArtifactContent; report: ImportCompatibilityReport }> {
  const report = baseReport(file, "pptx");
  const archive = await loadSafeOfficeArchive(await file.arrayBuffer());
  const paths = Object.keys(archive.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((left, right) =>
      Number(left.match(/\d+/)?.[0]) - Number(right.match(/\d+/)?.[0]),
    );
  const content = createPresentationContent(artifactTitle(file.name));
  const slides: PresentationSlide[] = [];
  for (const [index, path] of paths.entries()) {
    const xml = await readOfficeXml(archive, path);
    const texts = xmlText(xml, "a:t").filter(Boolean);
    const title = texts[0] || `Slide ${index + 1}`;
    slides.push({
      id: uid(),
      title,
      layout: "title-content",
      background: content.theme.background,
      speakerNotes: "",
      elements: [
        {
          id: uid(),
          kind: "text",
          text: title,
          x: 0.7,
          y: 0.5,
          width: 11.8,
          height: 0.8,
          fontSize: 26,
          bold: true,
        },
        {
          id: uid(),
          kind: "text",
          text: texts.slice(1).join("\n"),
          x: 0.85,
          y: 1.55,
          width: 11.4,
          height: 4.9,
          fontSize: 17,
        },
      ],
    });
  }
  if (slides.length) content.slides = slides;
  report.preserved.push(notice("Slide order and text", `${slides.length} slide(s) imported`));
  report.converted.push(notice("Text boxes", "Text was converted into editable title and content elements."));
  report.unsupported.push(
    notice(
      "Complex PowerPoint objects",
      "Animations, SmartArt, masters, charts and exact geometry remain in the source package and may require manual recreation.",
    ),
  );
  if (Object.keys(archive.files).some((path) => path.startsWith("ppt/media/"))) {
    report.missingFontsOrAssets.push(
      notice("Embedded media", "Media is detected but is not automatically positioned in this foundation importer."),
    );
  }
  return { type: "presentation", content, report };
}

async function importPdf(
  file: ImportableArtifactFile,
): Promise<{ type: ArtifactType; content: ArtifactContent; report: ImportCompatibilityReport }> {
  const report = baseReport(file, "pdf");
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.load(await file.arrayBuffer());
  const content: ArtifactContent = {
    kind: "pdf",
    pages: pdf.getPages().map((page, index) => ({
      id: uid(),
      width: page.getWidth(),
      height: page.getHeight(),
      blocks: [
        {
          id: uid(),
          kind: "callout",
          text: `Imported PDF page ${index + 1}. Text extraction is not available in this safe foundation importer.`,
        },
      ],
    })),
  };
  report.preserved.push(notice("Page geometry", `${pdf.getPageCount()} page(s) detected`));
  report.unsupported.push(
    notice("PDF text and vector editing", "PDF pages are preserved as a page model without claiming editable source reconstruction."),
  );
  return { type: "pdf", content, report };
}

async function importTextDocument(
  file: ImportableArtifactFile,
  format: "markdown" | "html",
): Promise<{ type: ArtifactType; content: ArtifactContent; report: ImportCompatibilityReport }> {
  const report = baseReport(file, format);
  const source = await file.text();
  const text =
    format === "html"
      ? source
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, "\n")
      : source;
  const blocks: DocumentBlock[] = [];
  text.split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({
        id: uid(),
        kind: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      });
    } else {
      blocks.push({ id: uid(), kind: "paragraph", text: line });
    }
  });
  const content = createDocumentContent(artifactTitle(file.name));
  content.blocks = blocks.length ? blocks : content.blocks;
  report.preserved.push(notice("Editable text", `${blocks.length} block(s) imported`));
  report.warnings.push(
    notice("Sanitization", "Scripts and style blocks are discarded from HTML imports."),
  );
  return { type: "document", content, report };
}

export async function importArtifactFile(input: {
  file: ImportableArtifactFile;
  ownerId: string;
  deviceId: string;
}): Promise<Artifact> {
  const extension = input.file.name.split(".").pop()?.toLowerCase() || "";
  const imported =
    extension === "csv"
      ? await importCsv(input.file)
      : extension === "xlsx"
        ? await importXlsx(input.file)
        : extension === "docx"
          ? await importDocx(input.file)
          : extension === "pptx"
            ? await importPptx(input.file)
            : extension === "pdf"
              ? await importPdf(input.file)
              : extension === "md" || extension === "markdown"
                ? await importTextDocument(input.file, "markdown")
                : extension === "html" || extension === "htm"
                  ? await importTextDocument(input.file, "html")
                  : null;
  if (!imported) {
    throw new Error("Supported imports are PPTX, DOCX, XLSX, CSV, PDF, Markdown, and HTML.");
  }
  const artifact = createArtifact({
    ownerId: input.ownerId,
    deviceId: input.deviceId,
    type: imported.type,
    title: artifactTitle(input.file.name),
    content: imported.content,
  });
  artifact.importReport = imported.report;
  return artifact;
}
