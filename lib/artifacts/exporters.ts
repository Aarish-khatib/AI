import type {
  Artifact,
  ArtifactExport,
  ArtifactExportFormat,
  DocumentBlock,
  DocumentContent,
  PresentationContent,
  PresentationElement,
  SpreadsheetCellValue,
  SpreadsheetContent,
} from "@/lib/artifacts/types";
import { evaluateFormula } from "@/lib/artifacts/model";
import { uid } from "@/lib/types";

export type GeneratedArtifactFile = {
  blob: Blob;
  fileName: string;
  mimeType: string;
  checksum: string;
};

const mimeTypes: Record<ArtifactExportFormat, string> = {
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv;charset=utf-8",
  png: "image/png",
  markdown: "text/markdown;charset=utf-8",
  html: "text/html;charset=utf-8",
  json: "application/json",
  zip: "application/zip",
};

function cleanFileName(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 _.-]/gi, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 90) || "limitless-artifact"
  );
}

async function checksumBlob(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }
  let value = 0x811c9dc5;
  for (const byte of bytes) value = Math.imul(value ^ byte, 0x01000193);
  return `local-${(value >>> 0).toString(16).padStart(8, "0")}`;
}

function stripHash(value?: string): string | undefined {
  return value?.replace(/^#/, "");
}

function presentationContent(artifact: Artifact): PresentationContent {
  if (artifact.content.kind !== "presentation") {
    throw new Error("This artifact is not an editable presentation.");
  }
  return artifact.content;
}

function documentContent(artifact: Artifact): DocumentContent {
  if (artifact.content.kind !== "document") {
    throw new Error("This artifact is not an editable document.");
  }
  return artifact.content;
}

function spreadsheetContent(artifact: Artifact): SpreadsheetContent {
  if (artifact.content.kind !== "spreadsheet") {
    throw new Error("This artifact is not an editable spreadsheet.");
  }
  return artifact.content;
}

function presentationShape(pptx: {
  ShapeType: Record<string, string>;
}, element: Extract<PresentationElement, { kind: "shape" }>): string {
  if (element.shape === "ellipse") return pptx.ShapeType.ellipse;
  if (element.shape === "line") return pptx.ShapeType.line;
  if (element.shape === "chevron") return pptx.ShapeType.chevron;
  return pptx.ShapeType.rect;
}

async function exportPptx(artifact: Artifact): Promise<Blob> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const content = presentationContent(artifact);
  const pptx = new PptxGenJS();
  pptx.layout = content.size;
  pptx.author = "Limitless AI";
  pptx.company = "Limitless AI";
  pptx.subject = artifact.title;
  pptx.title = artifact.title;
  pptx.theme = {
    headFontFace: content.theme.headingFont,
    bodyFontFace: content.theme.bodyFont,
  };
  for (const source of content.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: stripHash(source.background || content.theme.background) };
    for (const element of source.elements) {
      const common = {
        x: element.x,
        y: element.y,
        w: element.width,
        h: element.height,
        rotate: element.rotation,
        transparency: Math.round((1 - (element.opacity ?? 1)) * 100),
      };
      if (element.kind === "text") {
        slide.addText(element.text, {
          ...common,
          fontFace: element.fontFamily || content.theme.bodyFont,
          fontSize: element.fontSize,
          color: stripHash(element.color || content.theme.foreground),
          bold: element.bold,
          italic: element.italic,
          align: element.align,
          breakLine: false,
          margin: 0.04,
          valign: "middle",
        });
      } else if (element.kind === "shape") {
        slide.addShape(presentationShape(pptx, element) as never, {
          ...common,
          fill: { color: stripHash(element.fill) },
          line: {
            color: stripHash(element.stroke),
            width: element.strokeWidth || 1,
          },
        });
      } else if (element.kind === "image" && element.dataUrl) {
        slide.addImage({
          data: element.dataUrl,
          ...common,
          altText: element.alt,
        });
      } else if (element.kind === "table") {
        slide.addTable(
          element.rows.map((row) => row.map((cell) => ({ text: cell }))),
          {
          ...common,
          border: { color: "B8B8B2", pt: 1 },
          color: stripHash(content.theme.foreground),
          fill: { color: stripHash(content.theme.background) },
          fontFace: content.theme.bodyFont,
          fontSize: 12,
          bold: element.header ? true : undefined,
          margin: 0.05,
          },
        );
      } else if (element.kind === "chart") {
        const chartType =
          element.chartType === "pie"
            ? pptx.ChartType.pie
            : element.chartType === "line"
              ? pptx.ChartType.line
              : pptx.ChartType.bar;
        slide.addChart(
          chartType,
          [{ name: element.title || "Series", labels: element.labels, values: element.values }],
          {
            ...common,
            showTitle: Boolean(element.title),
            title: element.title,
            showLegend: false,
            chartColors: [stripHash(content.theme.accent) || "111111"],
          },
        );
      } else if (element.kind === "diagram") {
        const count = Math.max(1, element.nodes.length);
        const gap = 0.2;
        const nodeWidth =
          element.direction === "horizontal"
            ? (element.width - gap * (count - 1)) / count
            : element.width;
        const nodeHeight =
          element.direction === "vertical"
            ? (element.height - gap * (count - 1)) / count
            : element.height;
        element.nodes.forEach((node, index) => {
          slide.addShape(pptx.ShapeType.roundRect, {
            x: element.x + (element.direction === "horizontal" ? index * (nodeWidth + gap) : 0),
            y: element.y + (element.direction === "vertical" ? index * (nodeHeight + gap) : 0),
            w: nodeWidth,
            h: nodeHeight,
            fill: { color: stripHash(content.theme.muted) },
            line: { color: stripHash(content.theme.foreground) },
          });
          slide.addText(node.label, {
            x: element.x + (element.direction === "horizontal" ? index * (nodeWidth + gap) : 0),
            y: element.y + (element.direction === "vertical" ? index * (nodeHeight + gap) : 0),
            w: nodeWidth,
            h: nodeHeight,
            fontSize: 12,
            align: "center",
            valign: "middle",
            color: stripHash(content.theme.foreground),
            margin: 0.04,
          });
        });
      }
    }
    if (source.speakerNotes.trim()) slide.addNotes(source.speakerNotes);
  }
  const generated = await pptx.write({ outputType: "blob", compression: true });
  if (generated instanceof Blob) return generated;
  return new Blob([generated as BlobPart], { type: mimeTypes.pptx });
}

function documentText(block: DocumentBlock): string {
  if (block.kind === "list") return block.items.join("\n");
  if (block.kind === "table") return block.rows.map((row) => row.join("\t")).join("\n");
  if (block.kind === "image") return block.caption || block.alt;
  if (block.kind === "page-break") return "";
  return block.text;
}

async function imageBytes(dataUrl: string): Promise<Uint8Array> {
  const encoded = dataUrl.split(",")[1] || "";
  if (typeof atob === "function") {
    return Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  }
  return Uint8Array.from(Buffer.from(encoded, "base64"));
}

const pageSizeMillimeters = {
  A4: [210, 297],
  Letter: [215.9, 279.4],
  Legal: [215.9, 355.6],
  A3: [297, 420],
} as const;

function documentPageGeometry(content: DocumentContent): {
  widthMm: number;
  heightMm: number;
  marginMm: number;
  gutterMm: number;
  columns: 1 | 2 | 3;
  orientation: "portrait" | "landscape";
} {
  const layout = content.layout || {
    size: "A4" as const,
    orientation: "portrait" as const,
    marginMm: 20,
    columns: 1 as const,
    gutterMm: 8,
  };
  const source = pageSizeMillimeters[layout.size] || pageSizeMillimeters.A4;
  const [widthMm, heightMm] =
    layout.orientation === "landscape" ? [source[1], source[0]] : source;
  return {
    widthMm,
    heightMm,
    marginMm: Math.min(Math.max(layout.marginMm, 5), 60),
    gutterMm: Math.min(Math.max(layout.gutterMm, 0), 30),
    columns: layout.columns,
    orientation: layout.orientation,
  };
}

function millimetersToTwips(value: number): number {
  return Math.round((value / 25.4) * 1_440);
}

function millimetersToPoints(value: number): number {
  return (value / 25.4) * 72;
}

async function exportDocx(artifact: Artifact): Promise<Blob> {
  const {
    AlignmentType,
    Document,
    Footer,
    Header,
    HeadingLevel,
    ImageRun,
    PageBreak,
    PageNumber,
    PageOrientation,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = await import("docx");
  const content = documentContent(artifact);
  const geometry = documentPageGeometry(content);
  const children: Array<InstanceType<typeof Paragraph> | InstanceType<typeof Table>> = [];
  for (const block of content.blocks) {
    if (block.kind === "page-break") {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    } else if (block.kind === "table") {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: block.rows.map(
            (row, rowIndex) =>
              new TableRow({
                children: row.map(
                  (cell) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: cell,
                              bold: block.header && rowIndex === 0,
                            }),
                          ],
                        }),
                      ],
                    }),
                ),
              }),
          ),
        }),
      );
      if (block.caption) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: block.caption, italics: true })],
          }),
        );
      }
    } else if (block.kind === "list") {
      block.items.forEach((item) =>
        children.push(
          new Paragraph({
            text: item,
            bullet: block.ordered ? undefined : { level: 0 },
            numbering: block.ordered
              ? { reference: "limitless-numbering", level: 0 }
              : undefined,
          }),
        ),
      );
    } else if (block.kind === "image" && block.dataUrl) {
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: await imageBytes(block.dataUrl),
              transformation: { width: block.width || 520, height: Math.round((block.width || 520) * 0.6) },
              type: block.dataUrl.includes("image/png") ? "png" : "jpg",
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      );
      if (block.caption) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: block.caption, italics: true })],
            alignment: AlignmentType.CENTER,
          }),
        );
      }
    } else if (block.kind === "code") {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: block.text, font: "Aptos Mono" })],
          style: "Code",
        }),
      );
    } else if (
      block.kind === "heading" ||
      block.kind === "paragraph" ||
      block.kind === "quote" ||
      block.kind === "callout"
    ) {
      const heading =
        block.kind === "heading"
          ? block.level === 1
            ? HeadingLevel.HEADING_1
            : block.level === 3
              ? HeadingLevel.HEADING_3
              : HeadingLevel.HEADING_2
          : undefined;
      children.push(
        new Paragraph({
          heading,
          children: [
            new TextRun({
              text: block.text,
              bold: block.style?.bold || block.kind === "callout",
              italics: block.style?.italic || block.kind === "quote",
              underline: block.style?.underline ? {} : undefined,
              color: stripHash(block.style?.color),
              font:
                block.kind === "heading"
                  ? content.typography?.headingFont
                  : content.typography?.bodyFont,
              size:
                block.kind === "heading"
                  ? undefined
                  : Math.round((content.typography?.baseSizePt || 11) * 2),
            }),
          ],
          alignment:
            block.style?.align === "center"
              ? AlignmentType.CENTER
              : block.style?.align === "right"
                ? AlignmentType.RIGHT
                : block.style?.align === "justify"
                  ? AlignmentType.JUSTIFIED
                  : AlignmentType.LEFT,
        }),
      );
    }
  }
  if (content.comments.some((comment) => !comment.resolvedAt)) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: "Comments" }));
    content.comments
      .filter((comment) => !comment.resolvedAt)
      .forEach((comment) =>
        children.push(new Paragraph({ text: `${comment.blockId}: ${comment.text}` })),
      );
  }
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "limitless-numbering",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
    sections: [
      {
        headers: content.header
          ? { default: new Header({ children: [new Paragraph(content.header)] }) }
          : undefined,
        footers:
          content.footer || content.pageNumbers
            ? {
                default: new Footer({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun(content.footer ? `${content.footer}  ` : ""),
                        ...(content.pageNumbers
                          ? [new TextRun({ children: [PageNumber.CURRENT] })]
                          : []),
                      ],
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                }),
              }
            : undefined,
        properties: {
          page: {
            size: {
              width: millimetersToTwips(geometry.widthMm),
              height: millimetersToTwips(geometry.heightMm),
              orientation:
                geometry.orientation === "landscape"
                  ? PageOrientation.LANDSCAPE
                  : PageOrientation.PORTRAIT,
            },
            margin: {
              top: millimetersToTwips(geometry.marginMm),
              right: millimetersToTwips(geometry.marginMm),
              bottom: millimetersToTwips(geometry.marginMm),
              left: millimetersToTwips(geometry.marginMm),
              gutter: content.layout?.mirroredMargins
                ? millimetersToTwips(geometry.gutterMm)
                : 0,
            },
          },
          grid: content.layout?.baselineGridPt
            ? { linePitch: Math.round(content.layout.baselineGridPt * 20) }
            : undefined,
          column: {
            count: geometry.columns,
            equalWidth: true,
            space: millimetersToTwips(geometry.gutterMm),
          },
        },
        children,
      },
    ],
  });
  return Packer.toBlob(doc);
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xlsxColumnNumber(name: string): number {
  let value = 0;
  for (const character of name.toUpperCase()) {
    value = value * 26 + character.charCodeAt(0) - 64;
  }
  return Math.max(1, value);
}

function xlsxColumnName(index: number): string {
  let value = Math.max(1, index);
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function xlsxCellOrder(reference: string): [number, number] {
  const match = reference.toUpperCase().match(/^([A-Z]+)(\d+)$/);
  return match
    ? [Number(match[2]), xlsxColumnNumber(match[1])]
    : [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
}

type XlsxStyleRecord = NonNullable<
  SpreadsheetContent["sheets"][number]["cells"][string]["style"]
>;

function colorArgb(value?: string): string | undefined {
  const normalized = stripHash(value)?.toUpperCase();
  if (!normalized) return undefined;
  if (/^[0-9A-F]{8}$/.test(normalized)) return normalized;
  return /^[0-9A-F]{6}$/.test(normalized) ? `FF${normalized}` : undefined;
}

function styleKey(style?: XlsxStyleRecord): string {
  return JSON.stringify({
    bold: Boolean(style?.bold),
    italic: Boolean(style?.italic),
    textColor: colorArgb(style?.textColor) || "",
    fill: colorArgb(style?.fill) || "",
    numberFormat: style?.numberFormat || "",
    align: style?.align || "",
  });
}

function xlsxStyles(content: SpreadsheetContent): {
  xml: string;
  ids: Map<string, number>;
} {
  const styles = new Map<string, XlsxStyleRecord | undefined>();
  styles.set(styleKey(undefined), undefined);
  content.sheets.forEach((sheet) =>
    Object.values(sheet.cells).forEach((cell) =>
      styles.set(styleKey(cell.style), cell.style),
    ),
  );
  const fonts = new Map<string, number>([["", 0]]);
  const fills = new Map<string, number>([
    ["", 0],
    ["gray125", 1],
  ]);
  const formats = new Map<string, number>();
  const records = [...styles.entries()];
  records.forEach(([, style]) => {
    const font = JSON.stringify({
      bold: Boolean(style?.bold),
      italic: Boolean(style?.italic),
      color: colorArgb(style?.textColor) || "",
    });
    if (font !== '{"bold":false,"italic":false,"color":""}' && !fonts.has(font)) {
      fonts.set(font, fonts.size);
    }
    const fill = colorArgb(style?.fill) || "";
    if (fill && !fills.has(fill)) fills.set(fill, fills.size);
    if (style?.numberFormat && !formats.has(style.numberFormat)) {
      formats.set(style.numberFormat, 164 + formats.size);
    }
  });
  const ids = new Map<string, number>();
  const xfs = records.map(([key, style], index) => {
    ids.set(key, index);
    const fontKey = JSON.stringify({
      bold: Boolean(style?.bold),
      italic: Boolean(style?.italic),
      color: colorArgb(style?.textColor) || "",
    });
    const fontId =
      fontKey === '{"bold":false,"italic":false,"color":""}'
        ? 0
        : fonts.get(fontKey) || 0;
    const fillId = style?.fill ? fills.get(colorArgb(style.fill) || "") || 0 : 0;
    const numFmtId = style?.numberFormat
      ? formats.get(style.numberFormat) || 0
      : 0;
    const alignment = style?.align
      ? `<alignment horizontal="${style.align}"/>`
      : "";
    return `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="0" xfId="0"${
      fontId ? ' applyFont="1"' : ""
    }${fillId ? ' applyFill="1"' : ""}${
      numFmtId ? ' applyNumberFormat="1"' : ""
    }${alignment ? ' applyAlignment="1"' : ""}>${alignment}</xf>`;
  });
  const fontXml = [...fonts.entries()]
    .sort((left, right) => left[1] - right[1])
    .map(([key, index]) => {
      if (index === 0) {
        return '<font><sz val="11"/><color theme="1"/><name val="Aptos"/><family val="2"/></font>';
      }
      const font = JSON.parse(key) as {
        bold: boolean;
        italic: boolean;
        color: string;
      };
      return `<font>${font.bold ? "<b/>" : ""}${font.italic ? "<i/>" : ""}<sz val="11"/>${
        font.color ? `<color rgb="${font.color}"/>` : '<color theme="1"/>'
      }<name val="Aptos"/><family val="2"/></font>`;
    })
    .join("");
  const fillXml = [...fills.entries()]
    .sort((left, right) => left[1] - right[1])
    .map(([value, index]) => {
      if (index === 0) return '<fill><patternFill patternType="none"/></fill>';
      if (index === 1) return '<fill><patternFill patternType="gray125"/></fill>';
      return `<fill><patternFill patternType="solid"><fgColor rgb="${value}"/><bgColor indexed="64"/></patternFill></fill>`;
    })
    .join("");
  const formatXml = [...formats.entries()]
    .map(
      ([format, id]) =>
        `<numFmt numFmtId="${id}" formatCode="${xmlEscape(format)}"/>`,
    )
    .join("");
  return {
    ids,
    xml:
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      (formats.size ? `<numFmts count="${formats.size}">${formatXml}</numFmts>` : "") +
      `<fonts count="${fonts.size}">${fontXml}</fonts>` +
      `<fills count="${fills.size}">${fillXml}</fills>` +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      `<cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs>` +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '<dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>' +
      "</styleSheet>",
  };
}

function xlsxCellXml(
  reference: string,
  cell: SpreadsheetContent["sheets"][number]["cells"][string],
  styleId: number,
): string {
  const style = styleId ? ` s="${styleId}"` : "";
  const formula = cell.formula?.replace(/^=/, "");
  const value = formula ? cell.computed ?? cell.value : cell.value;
  if (formula) {
    const result =
      typeof value === "boolean"
        ? value
          ? "1"
          : "0"
        : value === null || value === undefined
          ? ""
          : typeof value === "number"
            ? String(value)
            : xmlEscape(String(value));
    const type =
      typeof value === "boolean"
        ? ' t="b"'
        : typeof value === "string"
          ? ' t="str"'
          : "";
    return `<c r="${reference}"${style}${type}><f>${xmlEscape(formula)}</f>${
      result === "" ? "" : `<v>${result}</v>`
    }</c>`;
  }
  if (typeof value === "string") {
    return `<c r="${reference}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(
      value,
    )}</t></is></c>`;
  }
  if (typeof value === "boolean") {
    return `<c r="${reference}"${style} t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${reference}"${style}><v>${value}</v></c>`;
  }
  return `<c r="${reference}"${style}/>`;
}

function xlsxSheetXml(
  source: SpreadsheetContent["sheets"][number],
  styles: Map<string, number>,
): string {
  const references = Object.keys(source.cells)
    .filter((reference) => /^[A-Z]+\d+$/.test(reference))
    .sort((left, right) => {
      const [leftRow, leftColumn] = xlsxCellOrder(left);
      const [rightRow, rightColumn] = xlsxCellOrder(right);
      return leftRow - rightRow || leftColumn - rightColumn;
    });
  const maximum = references.reduce(
    (current, reference) => {
      const [row, column] = xlsxCellOrder(reference);
      return {
        row: Math.max(current.row, row),
        column: Math.max(current.column, column),
      };
    },
    { row: 1, column: 1 },
  );
  const rows = new Map<number, string[]>();
  references.forEach((reference) => {
    const [row] = xlsxCellOrder(reference);
    const cell = source.cells[reference];
    const styleId = styles.get(styleKey(cell.style)) || 0;
    const values = rows.get(row) || [];
    values.push(xlsxCellXml(reference, cell, styleId));
    rows.set(row, values);
  });
  const rowXml = [...rows.entries()]
    .sort(([left], [right]) => left - right)
    .map(([row, cells]) => {
      const height = source.rowHeights[String(row)];
      return `<row r="${row}"${
        height ? ` ht="${height}" customHeight="1"` : ""
      }>${cells.join("")}</row>`;
    })
    .join("");
  const columns = Object.entries(source.columnWidths)
    .map(([name, width]) => {
      const index = xlsxColumnNumber(name);
      return `<col min="${index}" max="${index}" width="${Math.max(
        1,
        Math.min(255, width),
      )}" customWidth="1"/>`;
    })
    .join("");
  const frozen = source.frozenRows || source.frozenColumns;
  const activePane =
    source.frozenRows && source.frozenColumns
      ? "bottomRight"
      : source.frozenRows
        ? "bottomLeft"
        : "topRight";
  const topLeftCell = `${xlsxColumnName(source.frozenColumns + 1)}${
    source.frozenRows + 1
  }`;
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<dimension ref="A1:${xlsxColumnName(maximum.column)}${maximum.row}"/>` +
    `<sheetViews><sheetView workbookViewId="0">${
      frozen
        ? `<pane${
            source.frozenColumns ? ` xSplit="${source.frozenColumns}"` : ""
          }${source.frozenRows ? ` ySplit="${source.frozenRows}"` : ""} topLeftCell="${topLeftCell}" activePane="${activePane}" state="frozen"/>`
        : ""
    }</sheetView></sheetViews>` +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    (columns ? `<cols>${columns}</cols>` : "") +
    `<sheetData>${rowXml}</sheetData>` +
    (source.filterRange
      ? `<autoFilter ref="${xmlEscape(source.filterRange)}"/>`
      : "") +
    "</worksheet>"
  );
}

async function exportXlsx(artifact: Artifact): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const content = spreadsheetContent(artifact);
  const archive = new JSZip();
  const sheets = content.sheets.length
    ? content.sheets
    : [
        {
          id: "sheet-1",
          name: "Sheet 1",
          cells: {},
          columnWidths: {},
          rowHeights: {},
          frozenRows: 0,
          frozenColumns: 0,
          charts: [],
        },
      ];
  const styleBundle = xlsxStyles({ ...content, sheets });
  const safeSheetNames = new Set<string>();
  const names = sheets.map((sheet, index) => {
    const base =
      sheet.name.replace(/[\\/*?:[\]]/g, " ").trim().slice(0, 31) ||
      `Sheet ${index + 1}`;
    let name = base;
    let suffix = 2;
    while (safeSheetNames.has(name.toLowerCase())) {
      const ending = ` ${suffix}`;
      name = `${base.slice(0, 31 - ending.length)}${ending}`;
      suffix += 1;
    }
    safeSheetNames.add(name.toLowerCase());
    return name;
  });
  const activeIndex = Math.max(
    0,
    sheets.findIndex((sheet) => sheet.id === content.activeSheetId),
  );
  const sheetOverrides = sheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("");
  archive.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
      sheetOverrides +
      "</Types>",
  );
  archive.file(
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
      "</Relationships>",
  );
  archive.file(
    "docProps/core.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      `<dc:title>${xmlEscape(artifact.title)}</dc:title><dc:creator>Limitless AI</dc:creator>` +
      "</cp:coreProperties>",
  );
  archive.file(
    "docProps/app.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
      `<Application>Limitless AI</Application><TitlesOfParts><vt:vector size="${names.length}" baseType="lpstr">${names
        .map((name) => `<vt:lpstr>${xmlEscape(name)}</vt:lpstr>`)
        .join("")}</vt:vector></TitlesOfParts>` +
      "</Properties>",
  );
  archive.file(
    "xl/workbook.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      `<bookViews><workbookView activeTab="${activeIndex}"/></bookViews><sheets>${names
        .map(
          (name, index) =>
            `<sheet name="${xmlEscape(name)}" sheetId="${index + 1}" r:id="rId${
              index + 1
            }"/>`,
        )
        .join("")}</sheets></workbook>`,
  );
  archive.file(
    "xl/_rels/workbook.xml.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets
        .map(
          (_, index) =>
            `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
        )
        .join("") +
      `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      "</Relationships>",
  );
  archive.file("xl/styles.xml", styleBundle.xml);
  sheets.forEach((sheet, index) => {
    archive.file(
      `xl/worksheets/sheet${index + 1}.xml`,
      xlsxSheetXml(sheet, styleBundle.ids),
    );
  });
  return archive.generateAsync({
    type: "blob",
    mimeType: mimeTypes.xlsx,
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

function quoteCsv(value: SpreadsheetCellValue): string {
  const text = value === null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function columnIndex(reference: string): number {
  const name = reference.match(/^[A-Z]+/)?.[0] || "A";
  let index = 0;
  for (const character of name) index = index * 26 + character.charCodeAt(0) - 64;
  return index - 1;
}

function exportCsvText(artifact: Artifact): string {
  const content = spreadsheetContent(artifact);
  const sheet =
    content.sheets.find((candidate) => candidate.id === content.activeSheetId) ||
    content.sheets[0];
  if (!sheet) return "";
  let maxRow = 0;
  let maxColumn = 0;
  Object.keys(sheet.cells).forEach((reference) => {
    maxRow = Math.max(maxRow, Number(reference.match(/\d+$/)?.[0] || 1));
    maxColumn = Math.max(maxColumn, columnIndex(reference) + 1);
  });
  const rows: string[] = [];
  for (let row = 1; row <= maxRow; row += 1) {
    const values: string[] = [];
    for (let column = 0; column < maxColumn; column += 1) {
      let label = "";
      let value = column + 1;
      while (value > 0) {
        value -= 1;
        label = String.fromCharCode(65 + (value % 26)) + label;
        value = Math.floor(value / 26);
      }
      const cell = sheet.cells[`${label}${row}`];
      const computed =
        cell?.formula && cell.computed === undefined
          ? evaluateFormula(cell.formula, sheet.cells)
          : cell?.computed ?? cell?.value ?? null;
      values.push(quoteCsv(computed));
    }
    rows.push(values.join(","));
  }
  return `\uFEFF${rows.join("\r\n")}`;
}

function textBlocks(content: DocumentContent): string[] {
  const lines: string[] = [];
  for (const block of content.blocks) {
    if (block.kind === "heading") {
      lines.push(`${"#".repeat(block.level || 2)} ${block.text}`);
    } else if (block.kind === "paragraph") {
      lines.push(block.text);
    } else if (block.kind === "quote") {
      lines.push(`> ${block.text}`);
    } else if (block.kind === "callout") {
      lines.push(`> **${block.text}**`);
    } else if (block.kind === "list") {
      lines.push(
        ...block.items.map((item, index) =>
          block.ordered ? `${index + 1}. ${item}` : `- ${item}`,
        ),
      );
    } else if (block.kind === "table") {
      if (block.rows.length) {
        lines.push(`| ${block.rows[0].join(" | ")} |`);
        lines.push(`| ${block.rows[0].map(() => "---").join(" | ")} |`);
        block.rows.slice(1).forEach((row) => lines.push(`| ${row.join(" | ")} |`));
      }
    } else if (block.kind === "image") {
      lines.push(`![${block.alt}](${block.dataUrl || block.assetId || ""})`);
      if (block.caption) lines.push(`_${block.caption}_`);
    } else if (block.kind === "page-break") {
      lines.push('<div style="page-break-after: always"></div>');
    } else if (block.kind === "code") {
      lines.push(`\`\`\`${block.language}\n${block.text}\n\`\`\``);
    }
    lines.push("");
  }
  return lines;
}

function exportMarkdownText(artifact: Artifact): string {
  return `${textBlocks(documentContent(artifact)).join("\n").trim()}\n`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function exportHtmlText(artifact: Artifact): string {
  const content = documentContent(artifact);
  const body = content.blocks
    .map((block) => {
      if (block.kind === "heading") {
        const level = block.level || 2;
        return `<h${level}>${escapeHtml(block.text)}</h${level}>`;
      }
      if (block.kind === "paragraph") return `<p>${escapeHtml(block.text)}</p>`;
      if (block.kind === "quote") return `<blockquote>${escapeHtml(block.text)}</blockquote>`;
      if (block.kind === "callout") return `<aside>${escapeHtml(block.text)}</aside>`;
      if (block.kind === "list") {
        const tag = block.ordered ? "ol" : "ul";
        return `<${tag}>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</${tag}>`;
      }
      if (block.kind === "table") {
        return `<table>${block.rows
          .map(
            (row, rowIndex) =>
              `<tr>${row
                .map((cell) =>
                  block.header && rowIndex === 0
                    ? `<th>${escapeHtml(cell)}</th>`
                    : `<td>${escapeHtml(cell)}</td>`,
                )
                .join("")}</tr>`,
          )
          .join("")}</table>`;
      }
      if (block.kind === "image") {
        return `<figure><img alt="${escapeHtml(block.alt)}" src="${escapeHtml(block.dataUrl || "")}"/>${
          block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ""
        }</figure>`;
      }
      if (block.kind === "page-break") return '<hr class="page-break"/>';
      if (block.kind === "code") {
        return `<pre><code class="language-${escapeHtml(block.language)}">${escapeHtml(block.text)}</code></pre>`;
      }
      return "";
    })
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(artifact.title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 24px;line-height:1.6}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:8px}.page-break{break-after:page;border:0}</style>
</head>
<body>${body}</body>
</html>`;
}

function splitText(
  text: string,
  font: { widthOfTextAtSize(value: string, size: number): number },
  size: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.replace(/\s+/g, " ").split(" ")) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function exportPdf(artifact: Artifact): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle(artifact.title);
  pdf.setAuthor("Limitless AI");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  if (artifact.content.kind === "presentation") {
    for (const slide of artifact.content.slides) {
      const page = pdf.addPage([960, 540]);
      const background = artifact.content.theme.background.replace("#", "");
      const color = Number.parseInt(background, 16);
      page.drawRectangle({
        x: 0,
        y: 0,
        width: 960,
        height: 540,
        color: rgb(((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255),
      });
      for (const element of slide.elements) {
        const scaleX = 960 / 13.333;
        const scaleY = 540 / 7.5;
        if (element.kind === "text") {
          const size = Math.max(8, element.fontSize * 0.75);
          const lines = splitText(element.text, element.bold ? bold : regular, size, element.width * scaleX);
          lines.slice(0, Math.max(1, Math.floor((element.height * scaleY) / (size * 1.2)))).forEach((line, index) => {
            page.drawText(line, {
              x: element.x * scaleX,
              y: 540 - element.y * scaleY - size - index * size * 1.2,
              size,
              font: element.bold ? bold : regular,
            });
          });
        } else if (element.kind === "shape") {
          page.drawRectangle({
            x: element.x * scaleX,
            y: 540 - (element.y + element.height) * scaleY,
            width: element.width * scaleX,
            height: element.height * scaleY,
            borderWidth: element.strokeWidth || 1,
          });
        }
      }
    }
  } else {
    const documentSource =
      artifact.content.kind === "document" ? artifact.content : undefined;
    const blocks =
      documentSource
        ? documentSource.blocks
        : artifact.content.kind === "pdf"
          ? artifact.content.pages.flatMap((page) => page.blocks)
          : [];
    const geometry = documentSource
      ? documentPageGeometry(documentSource)
      : {
          widthMm: 210,
          heightMm: 297,
          marginMm: 17.6,
          gutterMm: 8,
          columns: 1 as const,
          orientation: "portrait" as const,
        };
    const pageWidth = millimetersToPoints(geometry.widthMm);
    const pageHeight = millimetersToPoints(geometry.heightMm);
    const margin = millimetersToPoints(geometry.marginMm);
    const gutter = millimetersToPoints(geometry.gutterMm);
    const headerReserve = documentSource?.header ? 18 : 0;
    const footerReserve =
      documentSource?.footer || documentSource?.pageNumbers ? 18 : 0;
    const top = pageHeight - margin - headerReserve;
    const bottom = margin + footerReserve;
    const columnWidth =
      (pageWidth - margin * 2 - gutter * (geometry.columns - 1)) /
      geometry.columns;
    let column = 0;
    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = top;
    const x = () => margin + column * (columnWidth + gutter);
    const addPage = () => {
      page = pdf.addPage([pageWidth, pageHeight]);
      column = 0;
      y = top;
    };
    const advanceColumnOrPage = () => {
      if (column + 1 < geometry.columns) {
        column += 1;
        y = top;
      } else {
        addPage();
      }
    };
    for (const block of blocks) {
      if (block.kind === "page-break") {
        addPage();
        continue;
      }
      const text = documentText(block);
      const size =
        block.kind === "heading"
          ? block.level === 1
            ? 22
            : 16
          : documentSource?.typography?.baseSizePt || 11;
      const selectedFont = block.kind === "heading" || block.kind === "callout" ? bold : regular;
      const lineHeight = size * (documentSource?.typography?.lineHeight || 1.35);
      const lines = splitText(text, selectedFont, size, columnWidth);
      lines.forEach((line) => {
        if (y - lineHeight < bottom) advanceColumnOrPage();
        page.drawText(line, { x: x(), y, size, font: selectedFont });
        y -= lineHeight;
      });
      y -= 8;
      if (y < bottom) advanceColumnOrPage();
    }
    if (artifact.content.kind === "spreadsheet") {
      const spreadsheet = artifact.content;
      const source =
        spreadsheet.sheets.find((sheet) => sheet.id === spreadsheet.activeSheetId) ||
        spreadsheet.sheets[0];
      page = pdf.getPages()[0];
      y = 790;
      const entries = Object.entries(source?.cells || {}).sort(([left], [right]) =>
        left.localeCompare(right, undefined, { numeric: true }),
      );
      entries.slice(0, 120).forEach(([reference, cell]) => {
        const value = cell.computed ?? cell.value ?? "";
        page.drawText(`${reference}: ${String(value)}`, { x: 50, y, size: 10, font: regular });
        y -= 13;
        if (y < 50) {
          page = pdf.addPage([595.28, 841.89]);
          y = 790;
        }
      });
    }
    if (
      documentSource?.exportProfile === "fillable-pdf" &&
      documentSource.formFields?.length
    ) {
      const form = pdf.getForm();
      for (const [index, field] of documentSource.formFields.entries()) {
        if (y - 44 < bottom) advanceColumnOrPage();
        const fieldName = `limitless.${index + 1}.${field.id.replace(/[^a-z0-9_-]/gi, "_")}`;
        page.drawText(`${field.label}${field.required ? " *" : ""}`, {
          x: x(),
          y,
          size: 10,
          font: regular,
        });
        y -= 22;
        if (field.type === "checkbox") {
          const checkBox = form.createCheckBox(fieldName);
          checkBox.addToPage(page, {
            x: x(),
            y: y - 2,
            width: 14,
            height: 14,
            borderWidth: 1,
          });
          y -= 24;
        } else {
          const textField = form.createTextField(fieldName);
          textField.addToPage(page, {
            x: x(),
            y: y - 4,
            width: columnWidth,
            height: 20,
            borderWidth: 1,
            font: regular,
          });
          y -= 32;
        }
      }
    }
    if (documentSource) {
      const pages = pdf.getPages();
      pages.forEach((target, pageIndex) => {
        if (documentSource.header) {
          target.drawText(documentSource.header.slice(0, 180), {
            x: margin,
            y: pageHeight - margin + 4,
            size: 8,
            font: regular,
          });
        }
        const footerText = [
          documentSource.footer,
          documentSource.pageNumbers ? `${pageIndex + 1} / ${pages.length}` : "",
        ].filter(Boolean).join(" · ");
        if (footerText) {
          target.drawText(footerText.slice(0, 180), {
            x: margin,
            y: Math.max(8, margin - 12),
            size: 8,
            font: regular,
          });
        }
      });
      pdf.setLanguage(documentSource.language || "en");
      pdf.setSubject(
        `${documentSource.exportProfile || "standard-pdf"} generated from structured Limitless source`,
      );
      pdf.setKeywords([
        "Limitless AI",
        documentSource.exportProfile || "standard-pdf",
        "structured document",
      ]);
    }
  }
  return new Blob(
    [new Uint8Array(await pdf.save({
      useObjectStreams:
        artifact.content.kind !== "document" ||
        artifact.content.exportProfile !== "print-pdf",
    }))],
    { type: mimeTypes.pdf },
  );
}

function drawWrappedCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maximumWidth: number,
  lineHeight: number,
) {
  let currentY = y;
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      currentY += lineHeight;
      continue;
    }
    let line = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${line} ${word}`;
      if (context.measureText(candidate).width <= maximumWidth) line = candidate;
      else {
        context.fillText(line, x, currentY, maximumWidth);
        currentY += lineHeight;
        line = word;
      }
    }
    context.fillText(line, x, currentY, maximumWidth);
    currentY += lineHeight;
  }
}

function loadCanvasImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("An embedded image could not be rendered."));
    image.src = dataUrl;
  });
}

async function exportPng(artifact: Artifact): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("PNG export requires a browser canvas.");
  }
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas rendering is unavailable.");
  if (artifact.content.kind === "canvas") {
    const content = artifact.content;
    canvas.width = Math.max(320, Math.min(4096, Math.round(content.width)));
    canvas.height = Math.max(240, Math.min(4096, Math.round(content.height)));
    context.fillStyle = content.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (const element of content.elements) {
      if (element.kind === "connector") {
        const from = content.elements.find((candidate) => candidate.id === element.fromId);
        const to = content.elements.find((candidate) => candidate.id === element.toId);
        if (!from || !to) continue;
        context.save();
        context.strokeStyle = element.stroke || "#111111";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(from.x + from.width / 2, from.y + from.height / 2);
        context.lineTo(to.x + to.width / 2, to.y + to.height / 2);
        context.stroke();
        context.restore();
        continue;
      }
      context.save();
      const centerX = element.x + element.width / 2;
      const centerY = element.y + element.height / 2;
      context.translate(centerX, centerY);
      context.rotate(((element.rotation || 0) * Math.PI) / 180);
      context.translate(-centerX, -centerY);
      context.fillStyle = element.fill || "#ffffff";
      context.strokeStyle = element.stroke || "#111111";
      context.lineWidth = 2;
      if (element.kind === "text") {
        context.fillStyle = element.stroke || "#111111";
        context.font = "500 24px sans-serif";
        context.textBaseline = "top";
        drawWrappedCanvasText(
          context,
          element.text || "",
          element.x + 8,
          element.y + 8,
          Math.max(1, element.width - 16),
          30,
        );
      } else if (element.kind === "image" && element.dataUrl) {
        const image = await loadCanvasImage(element.dataUrl);
        context.drawImage(image, element.x, element.y, element.width, element.height);
      } else if (element.shape === "ellipse") {
        context.beginPath();
        context.ellipse(
          centerX,
          centerY,
          Math.abs(element.width / 2),
          Math.abs(element.height / 2),
          0,
          0,
          Math.PI * 2,
        );
        context.fill();
        context.stroke();
      } else if (element.shape === "line") {
        context.beginPath();
        context.moveTo(element.x, element.y);
        context.lineTo(element.x + element.width, element.y + element.height);
        context.stroke();
      } else {
        context.fillRect(element.x, element.y, element.width, element.height);
        context.strokeRect(element.x, element.y, element.width, element.height);
      }
      context.restore();
    }
  } else {
    const content = presentationContent(artifact);
    const slide = content.slides[0];
    if (!slide) throw new Error("The presentation has no slide to export.");
    canvas.width = 1600;
    canvas.height = content.size === "LAYOUT_4X3" ? 1200 : 900;
    context.fillStyle = slide.background || content.theme.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const slideWidth = content.size === "LAYOUT_4X3" ? 10 : 13.333;
    const scaleX = canvas.width / slideWidth;
    const scaleY = canvas.height / 7.5;
    for (const element of slide.elements) {
      const x = element.x * scaleX;
      const y = element.y * scaleY;
      const width = element.width * scaleX;
      const height = element.height * scaleY;
      context.save();
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      context.translate(centerX, centerY);
      context.rotate(((element.rotation || 0) * Math.PI) / 180);
      context.translate(-centerX, -centerY);
      context.globalAlpha = element.opacity ?? 1;
      if (element.kind === "text") {
        context.fillStyle = element.color || content.theme.foreground;
        context.font = `${element.italic ? "italic " : ""}${element.bold ? "700 " : "400 "}${Math.round(
          element.fontSize * 1.5,
        )}px ${element.fontFamily || "sans-serif"}`;
        context.textBaseline = "top";
        drawWrappedCanvasText(
          context,
          element.text,
          x,
          y,
          width,
          Math.max(18, element.fontSize * 1.8),
        );
      } else if (element.kind === "image" && element.dataUrl) {
        const image = await loadCanvasImage(element.dataUrl);
        context.drawImage(image, x, y, width, height);
      } else if (element.kind === "shape") {
        context.fillStyle = element.fill;
        context.strokeStyle = element.stroke;
        context.lineWidth = Math.max(1, (element.strokeWidth || 1) * 2);
        if (element.shape === "ellipse") {
          context.beginPath();
          context.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
          context.fill();
          context.stroke();
        } else if (element.shape === "line") {
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(x + width, y + height);
          context.stroke();
        } else {
          context.fillRect(x, y, width, height);
          context.strokeRect(x, y, width, height);
        }
      } else if (element.kind === "table") {
        const rows = Math.max(1, element.rows.length);
        const columns = Math.max(1, ...element.rows.map((row) => row.length));
        const rowHeight = height / rows;
        const columnWidth = width / columns;
        context.strokeStyle = content.theme.muted;
        context.font = "500 18px sans-serif";
        context.textBaseline = "middle";
        element.rows.forEach((row, rowIndex) =>
          row.forEach((value, columnIndex) => {
            const cellX = x + columnIndex * columnWidth;
            const cellY = y + rowIndex * rowHeight;
            if (element.header && rowIndex === 0) {
              context.fillStyle = content.theme.accent;
              context.fillRect(cellX, cellY, columnWidth, rowHeight);
            }
            context.strokeRect(cellX, cellY, columnWidth, rowHeight);
            context.fillStyle =
              element.header && rowIndex === 0
                ? content.theme.background
                : content.theme.foreground;
            context.fillText(String(value), cellX + 8, cellY + rowHeight / 2, columnWidth - 16);
          }),
        );
      } else if (element.kind === "chart") {
        const maximum = Math.max(1, ...element.values.map((value) => Math.abs(value)));
        const barWidth = width / Math.max(1, element.values.length) * 0.62;
        element.values.forEach((value, index) => {
          const barHeight = (Math.abs(value) / maximum) * (height - 32);
          const barX = x + ((index + 0.5) * width) / element.values.length - barWidth / 2;
          context.fillStyle = content.theme.accent;
          context.fillRect(barX, y + height - barHeight, barWidth, barHeight);
        });
      } else if (element.kind === "diagram") {
        const nodeWidth = width / Math.max(1, element.nodes.length) * 0.7;
        const gap = width / Math.max(1, element.nodes.length);
        element.nodes.forEach((node, index) => {
          const nodeX = x + index * gap + (gap - nodeWidth) / 2;
          const nodeY = y + height * 0.2;
          context.fillStyle = content.theme.background;
          context.strokeStyle = content.theme.accent;
          context.fillRect(nodeX, nodeY, nodeWidth, height * 0.6);
          context.strokeRect(nodeX, nodeY, nodeWidth, height * 0.6);
          context.fillStyle = content.theme.foreground;
          context.font = "500 16px sans-serif";
          context.textBaseline = "middle";
          context.fillText(node.label, nodeX + 8, nodeY + height * 0.3, nodeWidth - 16);
        });
      }
      context.restore();
    }
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("PNG encoding failed.");
  return blob;
}

export function supportedExportFormats(artifact: Artifact): ArtifactExportFormat[] {
  if (artifact.content.kind === "presentation") return ["pptx", "pdf", "png", "json"];
  if (artifact.content.kind === "document") {
    return ["docx", "pdf", "markdown", "html", "json"];
  }
  if (artifact.content.kind === "spreadsheet") return ["xlsx", "csv", "pdf", "json"];
  if (artifact.content.kind === "pdf") return ["pdf", "json"];
  if (artifact.content.kind === "canvas") return ["png", "json"];
  return ["json"];
}

export async function generateArtifactFile(
  artifact: Artifact,
  format: ArtifactExportFormat,
): Promise<GeneratedArtifactFile> {
  if (!supportedExportFormats(artifact).includes(format)) {
    throw new Error(`${format.toUpperCase()} export is not supported for this artifact type.`);
  }
  let blob: Blob;
  if (format === "pptx") blob = await exportPptx(artifact);
  else if (format === "docx") blob = await exportDocx(artifact);
  else if (format === "xlsx") blob = await exportXlsx(artifact);
  else if (format === "csv") {
    blob = new Blob([exportCsvText(artifact)], { type: mimeTypes.csv });
  } else if (format === "markdown") {
    blob = new Blob([exportMarkdownText(artifact)], { type: mimeTypes.markdown });
  } else if (format === "html") {
    blob = new Blob([exportHtmlText(artifact)], { type: mimeTypes.html });
  } else if (format === "pdf") blob = await exportPdf(artifact);
  else if (format === "png") blob = await exportPng(artifact);
  else {
    blob = new Blob(
      [
        JSON.stringify(
          {
            format: "limitless-artifact",
            version: 1,
            artifact,
          },
          null,
          2,
        ),
      ],
      { type: mimeTypes.json },
    );
  }
  const fileName = `${cleanFileName(artifact.title)}.${format === "markdown" ? "md" : format}`;
  return {
    blob,
    fileName,
    mimeType: mimeTypes[format],
    checksum: await checksumBlob(blob),
  };
}

export function queuedArtifactExport(
  artifact: Artifact,
  format: ArtifactExportFormat,
): ArtifactExport {
  const now = Date.now();
  return {
    id: uid(),
    artifactId: artifact.id,
    ownerId: artifact.ownerId,
    format,
    status: "queued",
    fileName: `${cleanFileName(artifact.title)}.${format === "markdown" ? "md" : format}`,
    mimeType: mimeTypes[format],
    size: 0,
    createdAt: now,
    updatedAt: now,
    revision: 1,
    deviceId: artifact.deviceId,
  };
}

export async function validateArtifactFile(
  format: ArtifactExportFormat,
  blob: Blob,
): Promise<{ valid: boolean; detail: string }> {
  if (format === "pdf") {
    const header = new TextDecoder().decode((await blob.arrayBuffer()).slice(0, 5));
    return { valid: header === "%PDF-", detail: "PDF header" };
  }
  if (format === "png") {
    const signature = [...new Uint8Array((await blob.arrayBuffer()).slice(0, 8))];
    const expected = [137, 80, 78, 71, 13, 10, 26, 10];
    return {
      valid: expected.every((value, index) => signature[index] === value),
      detail: "PNG signature",
    };
  }
  if (["pptx", "docx", "xlsx"].includes(format)) {
    const JSZip = (await import("jszip")).default;
    const archive = await JSZip.loadAsync(await blob.arrayBuffer());
    const required =
      format === "pptx"
        ? ["[Content_Types].xml", "ppt/presentation.xml"]
        : format === "docx"
          ? ["[Content_Types].xml", "word/document.xml"]
          : ["[Content_Types].xml", "xl/workbook.xml"];
    const missing = required.filter((path) => !archive.file(path));
    return {
      valid: missing.length === 0,
      detail: missing.length ? `Missing ${missing.join(", ")}` : `${format.toUpperCase()} package`,
    };
  }
  return {
    valid: blob.size > 0,
    detail: blob.size > 0 ? "Non-empty file" : "Empty file",
  };
}
