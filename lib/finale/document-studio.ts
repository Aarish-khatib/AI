import type { Artifact, DocumentContent } from "@/lib/artifacts/types";
import { createArtifact } from "@/lib/artifacts/model";
import type { ProfessionalDocumentDraft } from "@/lib/finale/contracts";
import { uid } from "@/lib/types";

export const DOCUMENT_TEMPLATES = [
  "Executive report",
  "Business proposal",
  "Research report",
  "School project",
  "Technical documentation",
  "Product specification",
  "Case study",
  "White paper",
  "Portfolio",
  "Resume/CV",
  "Newsletter",
  "Magazine/editorial",
  "Ebook",
  "Meeting report",
  "Policy document",
  "Invoice and quotation",
  "Fillable application form",
  "Branded letterhead",
  "Minimal monochrome",
  "Premium visual report",
  "Data-heavy report",
] as const;

export function preflightProfessionalDraft(
  draft: ProfessionalDocumentDraft,
): ProfessionalDocumentDraft["preflight"] {
  const result: ProfessionalDocumentDraft["preflight"] = [];
  if (!draft.title.trim()) result.push({ severity: "error", message: "Document title is required." });
  if (draft.sections.length < 2) result.push({ severity: "warning", message: "Professional reports normally need at least two sections." });
  if (draft.sections.some((section) => !section.heading.trim())) {
    result.push({ severity: "error", message: "Every section needs a heading." });
  }
  if (draft.sections.some((section) => !section.body.trim())) {
    result.push({ severity: "warning", message: "One or more sections still contain no body text." });
  }
  if (draft.page.marginMm < 10) result.push({ severity: "warning", message: "Margins under 10 mm may clip on common printers." });
  if (draft.page.marginMm > 45) result.push({ severity: "warning", message: "Margins over 45 mm leave little usable page width." });
  if (draft.page.columns > 1 && draft.page.gutterMm < 5) {
    result.push({ severity: "warning", message: "Multi-column layouts need at least a 5 mm gutter for legibility." });
  }
  if (draft.typography.baseSizePt < 9) result.push({ severity: "warning", message: "Body text below 9 pt may be difficult to read." });
  if (draft.typography.lineHeight < 1.1) result.push({ severity: "warning", message: "Line height below 1.1 may cause text collisions." });
  const approximateWords = draft.sections.reduce(
    (sum, section) => sum + section.body.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
  const estimatedPages = Math.max(1, Math.ceil(approximateWords / Math.max(180, 520 / draft.page.columns)));
  if (estimatedPages > 120) {
    result.push({ severity: "warning", message: `The current source is approximately ${estimatedPages} pages; review long-document pagination after export.` });
  }
  if (draft.citations.some((citation) => citation.url && !/^https:\/\//i.test(citation.url))) {
    result.push({ severity: "error", message: "Citation links must use HTTPS." });
  }
  if (draft.formFields.some((field) => !field.label.trim())) {
    result.push({ severity: "error", message: "Every form field needs a visible label." });
  }
  if (draft.exportProfile === "fillable-pdf" && !draft.formFields.length) {
    result.push({ severity: "warning", message: "The fillable PDF profile has no form fields yet." });
  }
  if (!draft.accessibility.language) result.push({ severity: "error", message: "Document language is required for accessibility." });
  if (!draft.accessibility.logicalHeadings) result.push({ severity: "error", message: "Logical heading order must be restored before accessible export." });
  if (!result.length) result.push({ severity: "info", message: "Structured source passed the local preflight checks." });
  return result;
}

export function professionalDraftToArtifact(input: {
  draft: ProfessionalDocumentDraft;
  ownerId: string;
  deviceId: string;
}): Artifact {
  const { draft } = input;
  const blocks: DocumentContent["blocks"] = [
    { id: uid(), kind: "heading", level: 1, text: draft.title },
    {
      id: uid(),
      kind: "callout",
      text: `${draft.templateId} · ${draft.audience} · ${draft.purpose}`,
    },
    { id: uid(), kind: "page-break" },
    {
      id: uid(),
      kind: "heading",
      level: 1,
      text: "Contents",
    },
    {
      id: uid(),
      kind: "list",
      ordered: true,
      items: draft.sections.map((section) => section.heading),
    },
    { id: uid(), kind: "page-break" },
  ];
  for (const section of draft.sections) {
    blocks.push(
      { id: section.id, kind: "heading", level: 1, text: section.heading },
      { id: uid(), kind: "paragraph", text: section.body },
    );
  }
  if (draft.citations.length) {
    blocks.push({ id: uid(), kind: "page-break" });
    blocks.push({ id: uid(), kind: "heading", level: 1, text: "References" });
    draft.citations.forEach((citation) => {
      blocks.push({
        id: citation.id,
        kind: "paragraph",
        text: `[${citation.key}] ${citation.author ? `${citation.author}. ` : ""}${citation.title}${citation.url ? ` ${citation.url}` : ""}${citation.accessedAt ? ` (accessed ${citation.accessedAt})` : ""}`,
      });
    });
  }
  if (draft.footnotes.length) {
    blocks.push({ id: uid(), kind: "heading", level: 2, text: "Footnotes" });
    draft.footnotes.forEach((footnote) => {
      blocks.push({
        id: footnote.id,
        kind: "paragraph",
        text: `${footnote.marker}. ${footnote.text}`,
      });
    });
  }
  if (draft.formFields.length) {
    blocks.push({ id: uid(), kind: "page-break" });
    blocks.push({ id: uid(), kind: "heading", level: 1, text: "Form" });
    draft.formFields.forEach((field) => {
      blocks.push({
        id: field.id,
        kind: "paragraph",
        text: `${field.label}${field.required ? " *" : ""}: ${field.type === "checkbox" ? "[ ]" : "____________________________"}`,
      });
    });
  }
  const artifact = createArtifact({
    ownerId: input.ownerId,
    deviceId: input.deviceId,
    type: "document",
    title: draft.title,
    content: {
      kind: "document",
      blocks,
      header: draft.header,
      footer: draft.footer,
      pageNumbers: draft.pageNumbers,
      comments: [],
      layout: structuredClone(draft.page),
      typography: structuredClone(draft.typography),
      language: draft.accessibility.language,
      citations: structuredClone(draft.citations),
      footnotes: structuredClone(draft.footnotes),
      bookmarks: draft.bookmarks.map((bookmark) => ({
        id: bookmark.id,
        label: bookmark.label,
        blockId: bookmark.sectionId,
      })),
      formFields: structuredClone(draft.formFields),
      exportProfile: draft.exportProfile,
    },
  });
  artifact.importReport = {
    sourceName: draft.title,
    sourceFormat: "limitless-professional-document",
    importedAt: Date.now(),
    preserved: [
      { feature: "structured-source", detail: "Headings, paragraphs, lists, and page breaks remain editable." },
      { feature: "page-numbering", detail: "Page numbering is enabled in supported DOCX and PDF profiles." },
      { feature: "page-layout", detail: `${draft.page.size} ${draft.page.orientation}, ${draft.page.columns} column(s), ${draft.page.marginMm} mm margins.` },
      { feature: "references", detail: `${draft.citations.length} citation(s) and ${draft.footnotes.length} footnote(s) preserved in structured source.` },
      { feature: "form-fields", detail: `${draft.formFields.length} field(s); fillable widgets are emitted only by the fillable PDF profile.` },
    ],
    converted: [
      { feature: "font-substitution", detail: "Browser PDF export uses embedded standard PDF fonts; the structured source keeps the requested font names for editable DOCX output." },
    ],
    unsupported: draft.formFields.some((field) => field.type === "signature")
      ? [{ feature: "digital-signatures", detail: "Signature fields are visual input fields, not cryptographic digital-signature containers." }]
      : [],
    warnings: preflightProfessionalDraft(draft)
      .filter((item) => item.severity !== "info")
      .map((item) => ({ feature: "preflight", detail: item.message })),
    missingFontsOrAssets: [],
  };
  return artifact;
}

export function redactDocumentText(
  value: string,
  phrases: string[],
): { text: string; removed: string[] } {
  let output = value;
  const removed: string[] = [];
  for (const phrase of phrases.map((item) => item.trim()).filter(Boolean)) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "gi");
    if (pattern.test(output)) {
      output = output.replace(pattern, "[REDACTED]");
      removed.push(phrase);
    }
  }
  return { text: output, removed };
}
