export type ArtifactType =
  | "presentation"
  | "document"
  | "spreadsheet"
  | "pdf"
  | "canvas"
  | "website"
  | "report"
  | "note"
  | "form"
  | "chart"
  | "diagram"
  | "code-project";

export type ArtifactSaveState = "saved" | "saving" | "dirty" | "error";
export type ArtifactJobState =
  | "idle"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type ArtifactThumbnail = {
  kind: "text" | "image";
  value: string;
  mimeType?: string;
};

export type CompatibilityNotice = {
  feature: string;
  detail: string;
};

export type ImportCompatibilityReport = {
  sourceName: string;
  sourceFormat: string;
  importedAt: number;
  preserved: CompatibilityNotice[];
  converted: CompatibilityNotice[];
  unsupported: CompatibilityNotice[];
  warnings: CompatibilityNotice[];
  missingFontsOrAssets: CompatibilityNotice[];
};

export type PresentationTheme = {
  name: string;
  background: string;
  foreground: string;
  accent: string;
  muted: string;
  headingFont: string;
  bodyFont: string;
};

export type PresentationElementBase = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  locked?: boolean;
};

export type PresentationTextElement = PresentationElementBase & {
  kind: "text";
  text: string;
  fontSize: number;
  fontFamily?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
};

export type PresentationShapeElement = PresentationElementBase & {
  kind: "shape";
  shape: "rectangle" | "ellipse" | "line" | "chevron";
  fill: string;
  stroke: string;
  strokeWidth?: number;
};

export type PresentationImageElement = PresentationElementBase & {
  kind: "image";
  assetId?: string;
  dataUrl?: string;
  alt: string;
  fit: "contain" | "cover";
};

export type PresentationTableElement = PresentationElementBase & {
  kind: "table";
  rows: string[][];
  header: boolean;
};

export type PresentationChartElement = PresentationElementBase & {
  kind: "chart";
  chartType: "bar" | "line" | "pie";
  labels: string[];
  values: number[];
  title?: string;
};

export type PresentationDiagramElement = PresentationElementBase & {
  kind: "diagram";
  direction: "horizontal" | "vertical";
  nodes: Array<{ id: string; label: string }>;
};

export type PresentationElement =
  | PresentationTextElement
  | PresentationShapeElement
  | PresentationImageElement
  | PresentationTableElement
  | PresentationChartElement
  | PresentationDiagramElement;

export type PresentationSlide = {
  id: string;
  title: string;
  layout: "title" | "title-content" | "two-column" | "blank";
  background?: string;
  elements: PresentationElement[];
  speakerNotes: string;
};

export type PresentationContent = {
  kind: "presentation";
  size: "LAYOUT_WIDE" | "LAYOUT_4X3";
  theme: PresentationTheme;
  slides: PresentationSlide[];
};

export type DocumentTextStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  align?: "left" | "center" | "right" | "justify";
};

export type DocumentTextBlock = {
  id: string;
  kind: "heading" | "paragraph" | "quote" | "callout";
  text: string;
  level?: 1 | 2 | 3;
  style?: DocumentTextStyle;
};

export type DocumentListBlock = {
  id: string;
  kind: "list";
  ordered: boolean;
  items: string[];
};

export type DocumentTableBlock = {
  id: string;
  kind: "table";
  rows: string[][];
  header: boolean;
  caption?: string;
};

export type DocumentImageBlock = {
  id: string;
  kind: "image";
  assetId?: string;
  dataUrl?: string;
  alt: string;
  caption?: string;
  width?: number;
};

export type DocumentPageBreakBlock = {
  id: string;
  kind: "page-break";
};

export type DocumentCodeBlock = {
  id: string;
  kind: "code";
  language: string;
  text: string;
};

export type DocumentBlock =
  | DocumentTextBlock
  | DocumentListBlock
  | DocumentTableBlock
  | DocumentImageBlock
  | DocumentPageBreakBlock
  | DocumentCodeBlock;

export type DocumentComment = {
  id: string;
  blockId: string;
  text: string;
  createdAt: number;
  resolvedAt?: number;
};

export type DocumentContent = {
  kind: "document";
  blocks: DocumentBlock[];
  header: string;
  footer: string;
  pageNumbers: boolean;
  comments: DocumentComment[];
  layout?: {
    size: "A4" | "Letter" | "Legal" | "A3";
    orientation: "portrait" | "landscape";
    marginMm: number;
    columns: 1 | 2 | 3;
    gutterMm: number;
    mirroredMargins: boolean;
    baselineGridPt: number;
  };
  typography?: {
    headingFont: string;
    bodyFont: string;
    baseSizePt: number;
    lineHeight: number;
  };
  language?: string;
  citations?: Array<{
    id: string;
    key: string;
    title: string;
    author?: string;
    url?: string;
    accessedAt?: string;
  }>;
  footnotes?: Array<{ id: string; marker: string; text: string }>;
  bookmarks?: Array<{ id: string; label: string; blockId: string }>;
  formFields?: Array<{
    id: string;
    label: string;
    type: "text" | "checkbox" | "date" | "signature";
    required: boolean;
  }>;
  exportProfile?:
    | "editable-docx"
    | "standard-pdf"
    | "print-pdf"
    | "compressed-pdf"
    | "web-pdf"
    | "fillable-pdf";
};

export type SpreadsheetCellValue = string | number | boolean | null;

export type SpreadsheetCellStyle = {
  bold?: boolean;
  italic?: boolean;
  textColor?: string;
  fill?: string;
  numberFormat?: string;
  align?: "left" | "center" | "right";
};

export type SpreadsheetCell = {
  value: SpreadsheetCellValue;
  formula?: string;
  computed?: SpreadsheetCellValue;
  style?: SpreadsheetCellStyle;
};

export type SpreadsheetChart = {
  id: string;
  type: "bar" | "line" | "pie";
  title: string;
  range: string;
};

export type SpreadsheetSheet = {
  id: string;
  name: string;
  cells: Record<string, SpreadsheetCell>;
  columnWidths: Record<string, number>;
  rowHeights: Record<string, number>;
  frozenRows: number;
  frozenColumns: number;
  filterRange?: string;
  sort?: { column: string; direction: "asc" | "desc" };
  charts: SpreadsheetChart[];
};

export type SpreadsheetContent = {
  kind: "spreadsheet";
  sheets: SpreadsheetSheet[];
  activeSheetId: string;
};

export type PdfContent = {
  kind: "pdf";
  pages: Array<{
    id: string;
    blocks: DocumentBlock[];
    width: number;
    height: number;
  }>;
};

export type CanvasElement = {
  id: string;
  kind: "text" | "shape" | "image" | "connector";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  text?: string;
  shape?: "rectangle" | "ellipse" | "line";
  fill?: string;
  stroke?: string;
  assetId?: string;
  dataUrl?: string;
  fromId?: string;
  toId?: string;
};

export type CanvasContent = {
  kind: "canvas";
  width: number;
  height: number;
  background: string;
  elements: CanvasElement[];
};

export type GenericArtifactContent = {
  kind:
    | "website"
    | "report"
    | "note"
    | "form"
    | "chart"
    | "diagram"
    | "code-project";
  schema: Record<string, unknown>;
};

export type ArtifactContent =
  | PresentationContent
  | DocumentContent
  | SpreadsheetContent
  | PdfContent
  | CanvasContent
  | GenericArtifactContent;

export type Artifact = {
  id: string;
  ownerId: string;
  type: ArtifactType;
  title: string;
  content: ArtifactContent;
  currentVersionId?: string;
  createdAt: number;
  updatedAt: number;
  autosaveState: ArtifactSaveState;
  exportState: ArtifactJobState;
  thumbnail?: ArtifactThumbnail;
  importReport?: ImportCompatibilityReport;
  assetIds: string[];
  revision: number;
  deviceId: string;
  createdFromChatId?: string;
  createdFromMessageId?: string;
  deletedAt?: number;
  recoveredFrom?: string;
};

export type ArtifactVersion = {
  id: string;
  artifactId: string;
  ownerId: string;
  versionNumber: number;
  title: string;
  type: ArtifactType;
  content: ArtifactContent;
  thumbnail?: ArtifactThumbnail;
  importReport?: ImportCompatibilityReport;
  assetIds: string[];
  reason: "created" | "manual" | "autosave" | "restore" | "import" | "ai-edit";
  label?: string;
  createdAt: number;
  deviceId: string;
};

export type ArtifactExportFormat =
  | "pptx"
  | "docx"
  | "pdf"
  | "xlsx"
  | "csv"
  | "png"
  | "markdown"
  | "html"
  | "json"
  | "zip";

export type ArtifactExport = {
  id: string;
  artifactId: string;
  ownerId: string;
  format: ArtifactExportFormat;
  status: ArtifactJobState;
  fileName: string;
  mimeType: string;
  size: number;
  blob?: Blob;
  dataUrl?: string;
  storagePath?: string;
  downloadUrl?: string;
  checksum?: string;
  error?: string;
  compatibilityReport?: ImportCompatibilityReport;
  createdAt: number;
  updatedAt: number;
  revision: number;
  deviceId: string;
  deletedAt?: number;
};

export type ArtifactAsset = {
  id: string;
  artifactId: string;
  ownerId: string;
  name: string;
  kind: "image" | "audio" | "video" | "font" | "attachment" | "other";
  mimeType: string;
  size: number;
  blob?: Blob;
  dataUrl?: string;
  storagePath?: string;
  downloadUrl?: string;
  width?: number;
  height?: number;
  createdAt: number;
  updatedAt: number;
  revision: number;
  deviceId: string;
  deletedAt?: number;
};
