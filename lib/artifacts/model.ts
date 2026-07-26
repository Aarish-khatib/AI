import type {
  Artifact,
  ArtifactContent,
  ArtifactType,
  ArtifactVersion,
  DocumentBlock,
  DocumentContent,
  PresentationContent,
  PresentationSlide,
  SpreadsheetCell,
  SpreadsheetContent,
} from "@/lib/artifacts/types";
import { uid } from "@/lib/types";

const defaultTheme = {
  name: "Limitless Mono",
  background: "#f5f5f2",
  foreground: "#121212",
  accent: "#111111",
  muted: "#686868",
  headingFont: "Aptos Display",
  bodyFont: "Aptos",
};

function titleSlide(title: string): PresentationSlide {
  return {
    id: uid(),
    title,
    layout: "title",
    speakerNotes: "",
    elements: [
      {
        id: uid(),
        kind: "text",
        text: title,
        x: 0.8,
        y: 1.6,
        width: 11.7,
        height: 1.4,
        fontSize: 34,
        bold: true,
        color: defaultTheme.foreground,
        align: "left",
      },
      {
        id: uid(),
        kind: "text",
        text: "Created in Limitless AI",
        x: 0.82,
        y: 3.25,
        width: 8,
        height: 0.5,
        fontSize: 14,
        color: defaultTheme.muted,
        align: "left",
      },
    ],
  };
}

export function createPresentationContent(title: string): PresentationContent {
  return {
    kind: "presentation",
    size: "LAYOUT_WIDE",
    theme: { ...defaultTheme },
    slides: [titleSlide(title)],
  };
}

export function createDocumentContent(title: string): DocumentContent {
  return {
    kind: "document",
    header: "",
    footer: "",
    pageNumbers: true,
    comments: [],
    layout: {
      size: "A4",
      orientation: "portrait",
      marginMm: 20,
      columns: 1,
      gutterMm: 8,
      mirroredMargins: false,
      baselineGridPt: 12,
    },
    typography: {
      headingFont: "Aptos Display",
      bodyFont: "Aptos",
      baseSizePt: 11,
      lineHeight: 1.35,
    },
    language: "en",
    citations: [],
    footnotes: [],
    bookmarks: [],
    formFields: [],
    exportProfile: "editable-docx",
    blocks: [
      { id: uid(), kind: "heading", level: 1, text: title },
      {
        id: uid(),
        kind: "paragraph",
        text: "Start writing here. Every block remains structured and editable.",
      },
    ],
  };
}

export function createSpreadsheetContent(): SpreadsheetContent {
  const sheetId = uid();
  return {
    kind: "spreadsheet",
    activeSheetId: sheetId,
    sheets: [
      {
        id: sheetId,
        name: "Sheet 1",
        cells: {},
        columnWidths: {},
        rowHeights: {},
        frozenRows: 0,
        frozenColumns: 0,
        charts: [],
      },
    ],
  };
}

export function defaultArtifactContent(type: ArtifactType, title: string): ArtifactContent {
  if (type === "presentation") return createPresentationContent(title);
  if (type === "document" || type === "report" || type === "note") {
    return createDocumentContent(title);
  }
  if (type === "spreadsheet" || type === "chart") return createSpreadsheetContent();
  if (type === "pdf") {
    return {
      kind: "pdf",
      pages: [
        {
          id: uid(),
          blocks: createDocumentContent(title).blocks,
          width: 595.28,
          height: 841.89,
        },
      ],
    };
  }
  if (type === "canvas" || type === "diagram") {
    return {
      kind: "canvas",
      width: 1280,
      height: 720,
      background: "#f5f5f2",
      elements: [],
    };
  }
  return { kind: type, schema: {} };
}

export function createArtifact(input: {
  ownerId: string;
  deviceId: string;
  type: ArtifactType;
  title?: string;
  content?: ArtifactContent;
  createdFromChatId?: string;
  createdFromMessageId?: string;
}): Artifact {
  const now = Date.now();
  const title =
    input.title?.trim() ||
    `Untitled ${input.type.replace("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}`;
  return {
    id: uid(),
    ownerId: input.ownerId,
    type: input.type,
    title,
    content: input.content || defaultArtifactContent(input.type, title),
    createdAt: now,
    updatedAt: now,
    autosaveState: "saved",
    exportState: "idle",
    thumbnail: { kind: "text", value: title.slice(0, 120) },
    assetIds: [],
    revision: 1,
    deviceId: input.deviceId,
    createdFromChatId: input.createdFromChatId,
    createdFromMessageId: input.createdFromMessageId,
  };
}

export function duplicateArtifact(
  source: Artifact,
  ownerId: string,
  deviceId: string,
): Artifact {
  const now = Date.now();
  return {
    ...structuredClone(source),
    id: uid(),
    ownerId,
    title: `${source.title} copy`,
    currentVersionId: undefined,
    createdAt: now,
    updatedAt: now,
    revision: 1,
    deviceId,
    autosaveState: "saved",
    exportState: "idle",
    deletedAt: undefined,
    recoveredFrom: source.id,
  };
}

export function artifactVersion(
  artifact: Artifact,
  versionNumber: number,
  reason: ArtifactVersion["reason"],
  label?: string,
): ArtifactVersion {
  return {
    id: uid(),
    artifactId: artifact.id,
    ownerId: artifact.ownerId,
    versionNumber,
    title: artifact.title,
    type: artifact.type,
    content: structuredClone(artifact.content),
    thumbnail: artifact.thumbnail ? structuredClone(artifact.thumbnail) : undefined,
    importReport: artifact.importReport ? structuredClone(artifact.importReport) : undefined,
    assetIds: [...artifact.assetIds],
    reason,
    label: label?.trim() || undefined,
    createdAt: Date.now(),
    deviceId: artifact.deviceId,
  };
}

function cleanMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/^```[^\n]*\n?/, "").replace(/```$/, ""))
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function markdownSections(value: string): Array<{ title: string; body: string }> {
  const sections: Array<{ title: string; body: string }> = [];
  let current = { title: "Overview", body: "" };
  for (const line of value.split(/\r?\n/)) {
    const heading = line.match(/^#{1,4}\s+(.+)$/);
    if (heading) {
      if (current.body.trim()) sections.push(current);
      current = { title: cleanMarkdown(heading[1]), body: "" };
    } else {
      current.body += `${line}\n`;
    }
  }
  if (current.body.trim() || !sections.length) sections.push(current);
  return sections.filter((section) => section.title || section.body.trim());
}

function presentationFromText(title: string, response: string): PresentationContent {
  const sections = markdownSections(response).slice(0, 24);
  const slides: PresentationSlide[] = [titleSlide(title)];
  for (const section of sections) {
    const body = cleanMarkdown(section.body)
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*+]\s+/, "").trim())
      .filter(Boolean)
      .slice(0, 8)
      .join("\n• ");
    slides.push({
      id: uid(),
      title: section.title,
      layout: "title-content",
      speakerNotes: "",
      elements: [
        {
          id: uid(),
          kind: "text",
          text: section.title,
          x: 0.7,
          y: 0.5,
          width: 11.9,
          height: 0.8,
          fontSize: 26,
          bold: true,
          color: defaultTheme.foreground,
        },
        {
          id: uid(),
          kind: "text",
          text: body ? `• ${body}` : "Add supporting detail",
          x: 0.9,
          y: 1.65,
          width: 11.3,
          height: 4.7,
          fontSize: 17,
          color: defaultTheme.foreground,
        },
      ],
    });
  }
  return { kind: "presentation", size: "LAYOUT_WIDE", theme: { ...defaultTheme }, slides };
}

function documentFromText(title: string, response: string): DocumentContent {
  const blocks: DocumentBlock[] = [
    { id: uid(), kind: "heading", level: 1, text: title },
  ];
  for (const section of markdownSections(response)) {
    if (section.title !== "Overview") {
      blocks.push({ id: uid(), kind: "heading", level: 2, text: section.title });
    }
    const lines = section.body.split(/\r?\n/);
    let list: string[] = [];
    const flushList = () => {
      if (!list.length) return;
      blocks.push({ id: uid(), kind: "list", ordered: false, items: list });
      list = [];
    };
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        flushList();
        continue;
      }
      if (/^[-*+]\s+/.test(line)) {
        list.push(cleanMarkdown(line.replace(/^[-*+]\s+/, "")));
      } else {
        flushList();
        blocks.push({ id: uid(), kind: "paragraph", text: cleanMarkdown(line) });
      }
    }
    flushList();
  }
  return { kind: "document", blocks, header: "", footer: "", pageNumbers: true, comments: [] };
}

function columnName(index: number): string {
  let name = "";
  let value = index + 1;
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

function spreadsheetFromText(response: string): SpreadsheetContent {
  const content = createSpreadsheetContent();
  const sheet = content.sheets[0];
  const tableLines = response
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("|") && line.trim().endsWith("|"))
    .filter((line) => !/^\|[\s:|-]+\|$/.test(line.trim()));
  const rows = tableLines.length
    ? tableLines.map((line) =>
        line
          .trim()
          .slice(1, -1)
          .split("|")
          .map((value) => cleanMarkdown(value.trim())),
      )
    : response
        .split(/\r?\n/)
        .map((line) => line.split(",").map((value) => value.trim()))
        .filter((row) => row.length > 1)
        .slice(0, 200);
  rows.forEach((row, rowIndex) => {
    row.forEach((raw, columnIndex) => {
      const numeric = raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : raw;
      sheet.cells[`${columnName(columnIndex)}${rowIndex + 1}`] = {
        value: numeric,
        style: rowIndex === 0 ? { bold: true, fill: "#e7e7e2" } : undefined,
      };
    });
  });
  return content;
}

export function inferArtifactType(prompt: string): ArtifactType | null {
  if (/\b(presentation|slide deck|slides?|pptx|powerpoint)\b/i.test(prompt)) return "presentation";
  if (/\b(spreadsheet|workbook|xlsx|csv|data table)\b/i.test(prompt)) return "spreadsheet";
  if (/\b(canvas|whiteboard|diagram|flowchart|mind map)\b/i.test(prompt)) return "canvas";
  if (/\b(document|report|essay|proposal|notes?|docx|pdf)\b/i.test(prompt)) return "document";
  return null;
}

export function artifactFromChat(input: {
  ownerId: string;
  deviceId: string;
  prompt: string;
  response: string;
  chatId: string;
  messageId: string;
  forcedType?: ArtifactType;
}): Artifact | null {
  const type = input.forcedType || inferArtifactType(input.prompt);
  if (!type) return null;
  const firstLine = input.prompt
    .replace(/^(please\s+)?(create|make|build|generate|write)\s+(me\s+)?(an?\s+)?/i, "")
    .replace(/\b(presentation|slide deck|slides?|spreadsheet|workbook|document|report|canvas)\b/gi, "")
    .trim();
  const title = (firstLine || `New ${type}`).slice(0, 90);
  let content: ArtifactContent;
  if (type === "presentation") content = presentationFromText(title, input.response);
  else if (type === "spreadsheet") content = spreadsheetFromText(input.response);
  else if (type === "document") content = documentFromText(title, input.response);
  else content = defaultArtifactContent(type, title);
  return createArtifact({
    ownerId: input.ownerId,
    deviceId: input.deviceId,
    type,
    title,
    content,
    createdFromChatId: input.chatId,
    createdFromMessageId: input.messageId,
  });
}

export function artifactContextForChat(
  artifact: Artifact,
  maxCharacters = 14_000,
): string {
  const content = artifact.content;
  let summary = "";
  if (content.kind === "presentation") {
    summary = content.slides
      .map((slide, index) => {
        const elements = slide.elements
          .map((element) => {
            if (element.kind === "text") return element.text;
            if (element.kind === "table") {
              return element.rows.map((row) => row.join(" | ")).join("\n");
            }
            if (element.kind === "chart") {
              return `${element.title || "Chart"}: ${element.labels
                .map((label, valueIndex) => `${label}=${element.values[valueIndex]}`)
                .join(", ")}`;
            }
            if (element.kind === "diagram") {
              return element.nodes.map((node) => node.label).join(" → ");
            }
            return element.kind === "image" ? `[Image: ${element.alt}]` : `[${element.shape}]`;
          })
          .filter(Boolean)
          .join("\n");
        return `Slide ${index + 1}: ${slide.title}\n${elements}\nNotes: ${slide.speakerNotes}`;
      })
      .join("\n\n");
  } else if (content.kind === "document") {
    summary = content.blocks
      .map((block) => {
        if ("text" in block) return `${block.kind}: ${block.text}`;
        if (block.kind === "list") {
          return `${block.ordered ? "numbered" : "bulleted"} list: ${block.items.join("; ")}`;
        }
        if (block.kind === "table") {
          return `table:\n${block.rows.map((row) => row.join(" | ")).join("\n")}`;
        }
        if (block.kind === "image") return `[Image: ${block.alt}]`;
        return "page break";
      })
      .join("\n\n");
  } else if (content.kind === "spreadsheet") {
    summary = content.sheets
      .map((sheet) => {
        const cells = Object.entries(sheet.cells)
          .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
          .slice(0, 500)
          .map(
            ([reference, cell]) =>
              `${reference}=${cell.formula ?? cell.computed ?? cell.value ?? ""}`,
          )
          .join("\n");
        return `Sheet: ${sheet.name}\n${cells}`;
      })
      .join("\n\n");
  } else if (content.kind === "canvas") {
    summary = content.elements
      .map(
        (element) =>
          `${element.kind} at (${element.x}, ${element.y}) ${element.width}×${element.height}${
            element.text ? `: ${element.text}` : ""
          }`,
      )
      .join("\n");
  } else if (content.kind === "pdf") {
    summary = content.pages
      .map(
        (page, index) =>
          `Page ${index + 1}\n${page.blocks.map((block) => ("text" in block ? block.text : block.kind)).join("\n")}`,
      )
      .join("\n\n");
  } else {
    summary = JSON.stringify(content.schema, null, 2);
  }
  return [
    `Artifact ID: ${artifact.id}`,
    `Type: ${artifact.type}`,
    `Title: ${artifact.title}`,
    "Current editable content:",
    summary,
  ]
    .join("\n")
    .slice(0, Math.max(1_000, maxCharacters));
}

export function normalizeCellReference(reference: string): string | null {
  const normalized = reference.trim().toUpperCase();
  return /^[A-Z]{1,3}[1-9][0-9]{0,5}$/.test(normalized) ? normalized : null;
}

export function evaluateFormula(
  formula: string,
  cells: Record<string, SpreadsheetCell>,
): number | string {
  const normalized = formula.trim().replace(/^=/, "").toUpperCase();
  if (!normalized) return "";
  const rangeMatch = normalized.match(/^(SUM|AVERAGE|MIN|MAX|COUNT)\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
  if (!rangeMatch) return "#UNSUPPORTED";
  const [, operation, start, end] = rangeMatch;
  const parse = (reference: string) => {
    const match = reference.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    let column = 0;
    for (const character of match[1]) column = column * 26 + character.charCodeAt(0) - 64;
    return { column: column - 1, row: Number(match[2]) - 1 };
  };
  const from = parse(start);
  const to = parse(end);
  if (!from || !to) return "#REF!";
  const values: number[] = [];
  for (let row = Math.min(from.row, to.row); row <= Math.max(from.row, to.row); row += 1) {
    for (
      let column = Math.min(from.column, to.column);
      column <= Math.max(from.column, to.column);
      column += 1
    ) {
      const value = cells[`${columnName(column)}${row + 1}`]?.computed ??
        cells[`${columnName(column)}${row + 1}`]?.value;
      if (typeof value === "number" && Number.isFinite(value)) values.push(value);
    }
  }
  if (operation === "COUNT") return values.length;
  if (!values.length) return 0;
  if (operation === "SUM") return values.reduce((sum, value) => sum + value, 0);
  if (operation === "AVERAGE") {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  if (operation === "MIN") return Math.min(...values);
  return Math.max(...values);
}
