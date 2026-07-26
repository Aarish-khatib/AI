"use client";

import {
  Bold,
  ChevronLeft,
  ChevronRight,
  Circle,
  Columns3,
  Copy,
  FilePlus2,
  GripVertical,
  Italic,
  LayoutTemplate,
  List,
  MessageSquarePlus,
  Minus,
  MonitorPlay,
  Palette,
  Plus,
  RectangleHorizontal,
  Rows3,
  Table2,
  Trash2,
  Type,
} from "lucide-react";
import { useMemo, useState } from "react";
import { evaluateFormula } from "@/lib/artifacts/model";
import type {
  ArtifactContent,
  CanvasContent,
  CanvasElement,
  DocumentBlock,
  DocumentContent,
  PdfContent,
  PresentationContent,
  PresentationElement,
  PresentationSlide,
  SpreadsheetCell,
  SpreadsheetContent,
  SpreadsheetSheet,
} from "@/lib/artifacts/types";
import { uid } from "@/lib/types";

type EditorProps<T extends ArtifactContent> = {
  content: T;
  onChange: (content: T) => void;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function defaultSlide(title = "New slide"): PresentationSlide {
  return {
    id: uid(),
    title,
    layout: "title-content",
    speakerNotes: "",
    elements: [
      {
        id: uid(),
        kind: "text",
        text: title,
        x: 0.7,
        y: 0.45,
        width: 11.9,
        height: 0.75,
        fontSize: 26,
        bold: true,
      },
      {
        id: uid(),
        kind: "text",
        text: "Add supporting detail",
        x: 0.9,
        y: 1.55,
        width: 11.3,
        height: 4.9,
        fontSize: 18,
      },
    ],
  };
}

function presentationElementLabel(element: PresentationElement): string {
  if (element.kind === "text") return element.text.slice(0, 32) || "Text";
  if (element.kind === "shape") return element.shape;
  if (element.kind === "image") return element.alt || "Image";
  if (element.kind === "table") return "Table";
  if (element.kind === "chart") return element.title || "Chart";
  return "Diagram";
}

function PresentationEditor({
  content,
  onChange,
  onAssetFile,
}: EditorProps<PresentationContent> & {
  onAssetFile?: (file: File) => Promise<{ id: string; dataUrl: string }>;
}) {
  const [activeSlideId, setActiveSlideId] = useState(content.slides[0]?.id || "");
  const [selectedElementId, setSelectedElementId] = useState("");
  const [draggedSlideId, setDraggedSlideId] = useState("");
  const [presenting, setPresenting] = useState(false);
  const [presentIndex, setPresentIndex] = useState(0);
  const activeSlide =
    content.slides.find((slide) => slide.id === activeSlideId) || content.slides[0];
  const activeIndex = Math.max(
    0,
    content.slides.findIndex((slide) => slide.id === activeSlide?.id),
  );
  const selectedElement = activeSlide?.elements.find(
    (element) => element.id === selectedElementId,
  );

  const updateSlide = (updater: (slide: PresentationSlide) => void) => {
    if (!activeSlide) return;
    const next = clone(content);
    const slide = next.slides.find((candidate) => candidate.id === activeSlide.id);
    if (!slide) return;
    updater(slide);
    onChange(next);
  };

  const updateElement = (
    id: string,
    updater: (element: PresentationElement) => void,
  ) => {
    updateSlide((slide) => {
      const element = slide.elements.find((candidate) => candidate.id === id);
      if (element) updater(element);
    });
  };

  const addElement = (kind: PresentationElement["kind"]) => {
    let element: PresentationElement;
    if (kind === "text") {
      element = {
        id: uid(),
        kind: "text",
        text: "New text",
        x: 1,
        y: 1.4,
        width: 5,
        height: 0.8,
        fontSize: 22,
      };
    } else if (kind === "shape") {
      element = {
        id: uid(),
        kind: "shape",
        shape: "rectangle",
        x: 1.2,
        y: 1.7,
        width: 3,
        height: 1.5,
        fill: "#e7e7e2",
        stroke: "#111111",
      };
    } else if (kind === "table") {
      element = {
        id: uid(),
        kind: "table",
        x: 1,
        y: 1.5,
        width: 7,
        height: 3.5,
        header: true,
        rows: [
          ["Heading", "Value"],
          ["Item", "0"],
        ],
      };
    } else if (kind === "chart") {
      element = {
        id: uid(),
        kind: "chart",
        chartType: "bar",
        x: 1,
        y: 1.5,
        width: 7,
        height: 4,
        title: "Chart title",
        labels: ["A", "B", "C"],
        values: [4, 7, 5],
      };
    } else {
      element = {
        id: uid(),
        kind: "diagram",
        direction: "horizontal",
        x: 1,
        y: 2,
        width: 9,
        height: 1.4,
        nodes: [
          { id: uid(), label: "Start" },
          { id: uid(), label: "Next" },
          { id: uid(), label: "Finish" },
        ],
      };
    }
    updateSlide((slide) => slide.elements.push(element));
    setSelectedElementId(element.id);
  };

  const addImage = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return;
    if (onAssetFile) {
      const saved = await onAssetFile(file);
      const element: PresentationElement = {
        id: uid(),
        kind: "image",
        x: 1,
        y: 1.4,
        width: 5,
        height: 3.8,
        assetId: saved.id,
        dataUrl: saved.dataUrl,
        alt: file.name,
        fit: "contain",
      };
      updateSlide((slide) => slide.elements.push(element));
      setSelectedElementId(element.id);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const element: PresentationElement = {
        id: uid(),
        kind: "image",
        x: 1,
        y: 1.4,
        width: 5,
        height: 3.8,
        dataUrl: String(reader.result),
        alt: file.name,
        fit: "contain",
      };
      updateSlide((slide) => slide.elements.push(element));
      setSelectedElementId(element.id);
    };
    reader.readAsDataURL(file);
  };

  const addSlide = () => {
    const next = clone(content);
    const slide = defaultSlide(`Slide ${next.slides.length + 1}`);
    next.slides.splice(activeIndex + 1, 0, slide);
    onChange(next);
    setActiveSlideId(slide.id);
  };

  const duplicateSlide = () => {
    if (!activeSlide) return;
    const next = clone(content);
    const copy = clone(activeSlide);
    copy.id = uid();
    copy.title = `${activeSlide.title} copy`;
    copy.elements = copy.elements.map((element) => ({ ...element, id: uid() }));
    next.slides.splice(activeIndex + 1, 0, copy);
    onChange(next);
    setActiveSlideId(copy.id);
  };

  const removeSlide = () => {
    if (!activeSlide || content.slides.length === 1) return;
    const next = clone(content);
    next.slides.splice(activeIndex, 1);
    onChange(next);
    setActiveSlideId(next.slides[Math.max(0, activeIndex - 1)].id);
  };

  return (
    <div className="artifact-editor presentation-editor">
      <div className="artifact-toolstrip" aria-label="Presentation tools">
        <button type="button" onClick={addSlide}>
          <FilePlus2 size={15} /> Slide
        </button>
        <button type="button" onClick={duplicateSlide}>
          <Copy size={15} /> Duplicate
        </button>
        <button type="button" onClick={() => addElement("text")}>
          <Type size={15} /> Text
        </button>
        <button type="button" onClick={() => addElement("shape")}>
          <RectangleHorizontal size={15} /> Shape
        </button>
        <button type="button" onClick={() => addElement("table")}>
          <Table2 size={15} /> Table
        </button>
        <button type="button" onClick={() => addElement("chart")}>
          <Columns3 size={15} /> Chart
        </button>
        <button type="button" onClick={() => addElement("diagram")}>
          <Rows3 size={15} /> Diagram
        </button>
        <label className="artifact-file-button">
          Image
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              void addImage(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setPresentIndex(activeIndex);
            setPresenting(true);
          }}
        >
          <MonitorPlay size={15} /> Present
        </button>
      </div>
      <div className="presentation-layout">
        <aside className="slide-rail" aria-label="Slides">
          {content.slides.map((slide, index) => (
            <button
              type="button"
              key={slide.id}
              draggable
              className={slide.id === activeSlide?.id ? "active" : ""}
              onDragStart={() => setDraggedSlideId(slide.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                const from = content.slides.findIndex(
                  (candidate) => candidate.id === draggedSlideId,
                );
                const to = content.slides.findIndex(
                  (candidate) => candidate.id === slide.id,
                );
                const next = clone(content);
                next.slides = moveItem(next.slides, from, to);
                onChange(next);
                setDraggedSlideId("");
              }}
              onClick={() => {
                setActiveSlideId(slide.id);
                setSelectedElementId("");
              }}
            >
              <span>
                <GripVertical size={13} />
                {index + 1}
              </span>
              <b>{slide.title || "Untitled slide"}</b>
            </button>
          ))}
        </aside>
        <main className="presentation-stage">
          <div className="slide-stage-toolbar">
            <label>
              <LayoutTemplate size={14} />
              <select
                value={activeSlide?.layout || "blank"}
                onChange={(event) =>
                  updateSlide(
                    (slide) =>
                      (slide.layout = event.target
                        .value as PresentationSlide["layout"]),
                  )
                }
              >
                <option value="title">Title</option>
                <option value="title-content">Title + content</option>
                <option value="two-column">Two columns</option>
                <option value="blank">Blank</option>
              </select>
            </label>
            <label>
              <Palette size={14} />
              <input
                type="color"
                value={activeSlide?.background || content.theme.background}
                onChange={(event) =>
                  updateSlide((slide) => (slide.background = event.target.value))
                }
                aria-label="Slide background"
              />
            </label>
            <span>{content.size === "LAYOUT_WIDE" ? "16:9" : "4:3"}</span>
            <button
              type="button"
              onClick={removeSlide}
              disabled={content.slides.length === 1}
              title="Delete slide"
            >
              <Trash2 size={14} />
            </button>
          </div>
          {activeSlide && (
            <div
              className={`slide-canvas ${
                content.size === "LAYOUT_4X3" ? "slide-canvas-4x3" : ""
              }`}
              style={{
                background: activeSlide.background || content.theme.background,
                color: content.theme.foreground,
              }}
              onClick={() => setSelectedElementId("")}
            >
              {activeSlide.elements.map((element) => (
                <div
                  key={element.id}
                  className={`slide-element slide-element-${element.kind} ${
                    selectedElementId === element.id ? "selected" : ""
                  }`}
                  style={{
                    left: `${(element.x / 13.333) * 100}%`,
                    top: `${(element.y / 7.5) * 100}%`,
                    width: `${(element.width / 13.333) * 100}%`,
                    height: `${(element.height / 7.5) * 100}%`,
                    transform: `rotate(${element.rotation || 0}deg)`,
                    opacity: element.opacity ?? 1,
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedElementId(element.id);
                  }}
                >
                  {element.kind === "text" && (
                    <textarea
                      value={element.text}
                      style={{
                        color: element.color || content.theme.foreground,
                        fontSize: `${Math.max(9, element.fontSize * 0.72)}px`,
                        fontWeight: element.bold ? 700 : 400,
                        fontStyle: element.italic ? "italic" : "normal",
                        textAlign: element.align || "left",
                      }}
                      onChange={(event) =>
                        updateElement(
                          element.id,
                          (target) =>
                            target.kind === "text" &&
                            (target.text = event.target.value),
                        )
                      }
                      aria-label="Slide text"
                    />
                  )}
                  {element.kind === "shape" && (
                    <span
                      className={`shape-preview shape-${element.shape}`}
                      style={{
                        background:
                          element.shape === "line" ? element.stroke : element.fill,
                        borderColor: element.stroke,
                      }}
                    />
                  )}
                  {element.kind === "image" && element.dataUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={element.dataUrl}
                      alt={element.alt}
                      style={{ objectFit: element.fit }}
                    />
                  )}
                  {element.kind === "table" && (
                    <table>
                      <tbody>
                        {element.rows.map((row, rowIndex) => (
                          <tr key={`${element.id}-${rowIndex}`}>
                            {row.map((cell, cellIndex) => (
                              <td key={`${element.id}-${rowIndex}-${cellIndex}`}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {element.kind === "chart" && (
                    <div className="mini-chart">
                      {element.values.map((value, index) => (
                        <span
                          key={`${element.id}-${index}`}
                          style={{
                            height: `${Math.max(
                              8,
                              (value / Math.max(1, ...element.values)) * 82,
                            )}%`,
                            background: content.theme.accent,
                          }}
                          title={`${element.labels[index]}: ${value}`}
                        />
                      ))}
                    </div>
                  )}
                  {element.kind === "diagram" && (
                    <div
                      className={`diagram-preview diagram-${element.direction}`}
                    >
                      {element.nodes.map((node) => (
                        <span key={node.id}>{node.label}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <label className="speaker-notes">
            <span>Speaker notes</span>
            <textarea
              value={activeSlide?.speakerNotes || ""}
              onChange={(event) =>
                updateSlide((slide) => (slide.speakerNotes = event.target.value))
              }
              placeholder="Private notes for this slide…"
            />
          </label>
        </main>
        <aside className="artifact-inspector">
          <h3>Design</h3>
          <label>
            Theme
            <input
              value={content.theme.name}
              onChange={(event) => {
                const next = clone(content);
                next.theme.name = event.target.value;
                onChange(next);
              }}
            />
          </label>
          <label>
            Accent
            <input
              type="color"
              value={content.theme.accent}
              onChange={(event) => {
                const next = clone(content);
                next.theme.accent = event.target.value;
                onChange(next);
              }}
            />
          </label>
          <label>
            Heading font
            <input
              value={content.theme.headingFont}
              onChange={(event) => {
                const next = clone(content);
                next.theme.headingFont = event.target.value;
                onChange(next);
              }}
            />
          </label>
          <label>
            Slide size
            <select
              value={content.size}
              onChange={(event) => {
                const next = clone(content);
                next.size = event.target.value as PresentationContent["size"];
                onChange(next);
              }}
            >
              <option value="LAYOUT_WIDE">Widescreen 16:9</option>
              <option value="LAYOUT_4X3">Standard 4:3</option>
            </select>
          </label>
          {selectedElement && (
            <>
              <h3>Selection</h3>
              <p>{presentationElementLabel(selectedElement)}</p>
              <div className="inspector-grid">
                {(["x", "y", "width", "height"] as const).map((key) => (
                  <label key={key}>
                    {key}
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={selectedElement[key]}
                      onChange={(event) =>
                        updateElement(selectedElement.id, (element) => {
                          element[key] = Math.max(0, Number(event.target.value));
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              {selectedElement.kind === "text" && (
                <>
                  <label>
                    Size
                    <input
                      type="number"
                      min={6}
                      max={160}
                      value={selectedElement.fontSize}
                      onChange={(event) =>
                        updateElement(selectedElement.id, (element) => {
                          if (element.kind === "text") {
                            element.fontSize = Number(event.target.value);
                          }
                        })
                      }
                    />
                  </label>
                  <div className="inline-controls">
                    <button
                      type="button"
                      className={selectedElement.bold ? "active" : ""}
                      onClick={() =>
                        updateElement(selectedElement.id, (element) => {
                          if (element.kind === "text") element.bold = !element.bold;
                        })
                      }
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      type="button"
                      className={selectedElement.italic ? "active" : ""}
                      onClick={() =>
                        updateElement(selectedElement.id, (element) => {
                          if (element.kind === "text") element.italic = !element.italic;
                        })
                      }
                    >
                      <Italic size={14} />
                    </button>
                  </div>
                </>
              )}
              <button
                type="button"
                className="danger-subtle"
                onClick={() => {
                  updateSlide(
                    (slide) =>
                      (slide.elements = slide.elements.filter(
                        (element) => element.id !== selectedElement.id,
                      )),
                  );
                  setSelectedElementId("");
                }}
              >
                <Trash2 size={14} /> Delete selection
              </button>
            </>
          )}
        </aside>
      </div>
      {presenting && (
        <div className="presenter-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="presenter-close"
            onClick={() => setPresenting(false)}
          >
            Exit presentation
          </button>
          <div
            className="presenter-slide"
            style={{
              background:
                content.slides[presentIndex]?.background || content.theme.background,
              color: content.theme.foreground,
            }}
          >
            {content.slides[presentIndex]?.elements.map((element) => (
              <div
                key={element.id}
                style={{
                  position: "absolute",
                  left: `${(element.x / 13.333) * 100}%`,
                  top: `${(element.y / 7.5) * 100}%`,
                  width: `${(element.width / 13.333) * 100}%`,
                  height: `${(element.height / 7.5) * 100}%`,
                }}
              >
                {element.kind === "text" ? (
                  <div
                    style={{
                      fontSize: `${Math.max(12, element.fontSize)}px`,
                      fontWeight: element.bold ? 700 : 400,
                    }}
                  >
                    {element.text}
                  </div>
                ) : element.kind === "image" && element.dataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={element.dataUrl} alt={element.alt} />
                ) : (
                  <div className="presenter-object">{presentationElementLabel(element)}</div>
                )}
              </div>
            ))}
          </div>
          <div className="presenter-controls">
            <button
              type="button"
              disabled={presentIndex === 0}
              onClick={() => setPresentIndex((current) => Math.max(0, current - 1))}
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              {presentIndex + 1} / {content.slides.length}
            </span>
            <button
              type="button"
              disabled={presentIndex === content.slides.length - 1}
              onClick={() =>
                setPresentIndex((current) =>
                  Math.min(content.slides.length - 1, current + 1),
                )
              }
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function blockText(block: DocumentBlock): string {
  if ("text" in block) return block.text;
  if (block.kind === "list") return block.items.join("\n");
  if (block.kind === "table") return block.rows.map((row) => row.join("\t")).join("\n");
  return "";
}

function countDocumentWords(content: DocumentContent): number {
  return content.blocks
    .map(blockText)
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function DocumentEditor({
  content,
  onChange,
}: EditorProps<DocumentContent>) {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [commentBlockId, setCommentBlockId] = useState(
    content.blocks[0]?.id || "",
  );
  const [comment, setComment] = useState("");

  const updateBlock = (id: string, updater: (block: DocumentBlock) => void) => {
    const next = clone(content);
    const block = next.blocks.find((candidate) => candidate.id === id);
    if (block) updater(block);
    onChange(next);
  };

  const addBlock = (kind: DocumentBlock["kind"]) => {
    const next = clone(content);
    let block: DocumentBlock;
    if (kind === "heading") {
      block = { id: uid(), kind, level: 2, text: "New heading" };
    } else if (kind === "paragraph" || kind === "quote" || kind === "callout") {
      block = { id: uid(), kind, text: "Start writing…" };
    } else if (kind === "list") {
      block = { id: uid(), kind, ordered: false, items: ["First item", "Second item"] };
    } else if (kind === "table") {
      block = {
        id: uid(),
        kind,
        header: true,
        rows: [
          ["Heading", "Value"],
          ["Item", "0"],
        ],
      };
    } else if (kind === "code") {
      block = { id: uid(), kind, language: "text", text: "" };
    } else {
      block = { id: uid(), kind: "page-break" };
    }
    next.blocks.push(block);
    onChange(next);
  };

  const replaceAll = () => {
    if (!find) return;
    const next = clone(content);
    for (const block of next.blocks) {
      if ("text" in block) block.text = block.text.split(find).join(replace);
      else if (block.kind === "list") {
        block.items = block.items.map((item) => item.split(find).join(replace));
      } else if (block.kind === "table") {
        block.rows = block.rows.map((row) =>
          row.map((cell) => cell.split(find).join(replace)),
        );
      }
    }
    onChange(next);
  };

  return (
    <div className="artifact-editor document-editor">
      <div className="artifact-toolstrip">
        <button type="button" onClick={() => addBlock("heading")}>
          <Type size={15} /> Heading
        </button>
        <button type="button" onClick={() => addBlock("paragraph")}>
          <Plus size={15} /> Paragraph
        </button>
        <button type="button" onClick={() => addBlock("list")}>
          <List size={15} /> List
        </button>
        <button type="button" onClick={() => addBlock("table")}>
          <Table2 size={15} /> Table
        </button>
        <button type="button" onClick={() => addBlock("callout")}>
          <MessageSquarePlus size={15} /> Callout
        </button>
        <button type="button" onClick={() => addBlock("page-break")}>
          <Minus size={15} /> Page break
        </button>
        <span className="artifact-toolstrip-stat">
          {countDocumentWords(content).toLocaleString()} words
        </span>
      </div>
      <div className="document-layout">
        <main className="document-page" aria-label="Document page">
          <input
            className="document-header-input"
            value={content.header}
            onChange={(event) => {
              const next = clone(content);
              next.header = event.target.value;
              onChange(next);
            }}
            placeholder="Header"
            aria-label="Document header"
          />
          <div className="document-blocks">
            {content.blocks.map((block, index) => (
              <div
                key={block.id}
                className={`document-block document-block-${block.kind}`}
              >
                <div className="document-block-controls">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => {
                      const next = clone(content);
                      next.blocks = moveItem(next.blocks, index, index - 1);
                      onChange(next);
                    }}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === content.blocks.length - 1}
                    onClick={() => {
                      const next = clone(content);
                      next.blocks = moveItem(next.blocks, index, index + 1);
                      onChange(next);
                    }}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = clone(content);
                      next.blocks.splice(index, 1);
                      onChange(next);
                    }}
                    title="Delete block"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                {block.kind === "page-break" ? (
                  <div className="page-break-marker">Page break</div>
                ) : block.kind === "image" ? (
                  <figure>
                    {block.dataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={block.dataUrl} alt={block.alt} />
                    ) : (
                      <div className="missing-document-image">
                        Missing image · {block.alt}
                      </div>
                    )}
                    <input
                      value={block.caption || ""}
                      onChange={(event) =>
                        updateBlock(block.id, (target) => {
                          if (target.kind === "image") {
                            target.caption = event.target.value;
                          }
                        })
                      }
                      placeholder="Caption"
                    />
                  </figure>
                ) : block.kind === "table" ? (
                  <textarea
                    value={block.rows.map((row) => row.join("\t")).join("\n")}
                    onChange={(event) =>
                      updateBlock(block.id, (target) => {
                        if (target.kind === "table") {
                          target.rows = event.target.value
                            .split("\n")
                            .map((row) => row.split("\t"));
                        }
                      })
                    }
                    aria-label="Table cells separated by tabs"
                  />
                ) : block.kind === "list" ? (
                  <textarea
                    value={block.items.join("\n")}
                    onChange={(event) =>
                      updateBlock(block.id, (target) => {
                        if (target.kind === "list") {
                          target.items = event.target.value.split("\n");
                        }
                      })
                    }
                    aria-label="List items"
                  />
                ) : (
                  <textarea
                    value={block.text}
                    rows={
                      block.kind === "heading"
                        ? 1
                        : Math.max(2, Math.ceil(block.text.length / 90))
                    }
                    onChange={(event) =>
                      updateBlock(block.id, (target) => {
                        if ("text" in target) target.text = event.target.value;
                      })
                    }
                    aria-label={block.kind}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="document-footer-row">
            <input
              value={content.footer}
              onChange={(event) => {
                const next = clone(content);
                next.footer = event.target.value;
                onChange(next);
              }}
              placeholder="Footer"
              aria-label="Document footer"
            />
            {content.pageNumbers && <span>1</span>}
          </div>
        </main>
        <aside className="artifact-inspector document-inspector">
          <h3>Document</h3>
          <label className="switch-control">
            <input
              type="checkbox"
              checked={content.pageNumbers}
              onChange={(event) => {
                const next = clone(content);
                next.pageNumbers = event.target.checked;
                onChange(next);
              }}
            />
            Page numbers
          </label>
          <h3>Find and replace</h3>
          <label>
            Find
            <input value={find} onChange={(event) => setFind(event.target.value)} />
          </label>
          <label>
            Replace
            <input
              value={replace}
              onChange={(event) => setReplace(event.target.value)}
            />
          </label>
          <button type="button" disabled={!find} onClick={replaceAll}>
            Replace all
          </button>
          <h3>Comments</h3>
          <label>
            Block
            <select
              value={commentBlockId}
              onChange={(event) => setCommentBlockId(event.target.value)}
            >
              {content.blocks.map((block, index) => (
                <option value={block.id} key={block.id}>
                  {index + 1}. {block.kind}
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Add a review comment"
          />
          <button
            type="button"
            disabled={!comment.trim() || !commentBlockId}
            onClick={() => {
              const next = clone(content);
              next.comments.push({
                id: uid(),
                blockId: commentBlockId,
                text: comment.trim(),
                createdAt: Date.now(),
              });
              onChange(next);
              setComment("");
            }}
          >
            Add comment
          </button>
          <div className="document-comments">
            {content.comments.map((item) => (
              <article key={item.id} className={item.resolvedAt ? "resolved" : ""}>
                <p>{item.text}</p>
                <button
                  type="button"
                  onClick={() => {
                    const next = clone(content);
                    const target = next.comments.find(
                      (candidate) => candidate.id === item.id,
                    );
                    if (target) {
                      target.resolvedAt = target.resolvedAt
                        ? undefined
                        : Date.now();
                    }
                    onChange(next);
                  }}
                >
                  {item.resolvedAt ? "Reopen" : "Resolve"}
                </button>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function columnName(index: number): string {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function spreadsheetDisplay(cell?: SpreadsheetCell): string {
  if (!cell) return "";
  if (cell.formula) return cell.formula;
  return cell.value === null ? "" : String(cell.value);
}

function parseCellInput(value: string, cells: Record<string, SpreadsheetCell>) {
  if (value.startsWith("=")) {
    return {
      value: null,
      formula: value,
      computed: evaluateFormula(value, cells),
    } satisfies SpreadsheetCell;
  }
  const numeric = value.trim() !== "" && Number.isFinite(Number(value));
  return {
    value: numeric ? Number(value) : value,
  } satisfies SpreadsheetCell;
}

function SpreadsheetEditor({
  content,
  onChange,
}: EditorProps<SpreadsheetContent>) {
  const [selectedCell, setSelectedCell] = useState("A1");
  const active =
    content.sheets.find((sheet) => sheet.id === content.activeSheetId) ||
    content.sheets[0];
  const selected = active?.cells[selectedCell];
  const rows = 30;
  const columns = 12;

  const updateSheet = (updater: (sheet: SpreadsheetSheet) => void) => {
    if (!active) return;
    const next = clone(content);
    const sheet = next.sheets.find((candidate) => candidate.id === active.id);
    if (!sheet) return;
    updater(sheet);
    onChange(next);
  };

  const setCell = (reference: string, raw: string) => {
    updateSheet((sheet) => {
      const style = sheet.cells[reference]?.style;
      sheet.cells[reference] = {
        ...parseCellInput(raw, sheet.cells),
        style,
      };
      for (const cell of Object.values(sheet.cells)) {
        if (cell.formula) cell.computed = evaluateFormula(cell.formula, sheet.cells);
      }
    });
  };

  const updateSelectedStyle = (
    updater: (style: NonNullable<SpreadsheetCell["style"]>) => void,
  ) => {
    updateSheet((sheet) => {
      const cell = sheet.cells[selectedCell] || { value: null };
      const style = { ...(cell.style || {}) };
      updater(style);
      sheet.cells[selectedCell] = { ...cell, style };
    });
  };

  const addSheet = () => {
    const next = clone(content);
    const sheet: SpreadsheetSheet = {
      id: uid(),
      name: `Sheet ${next.sheets.length + 1}`,
      cells: {},
      columnWidths: {},
      rowHeights: {},
      frozenRows: 0,
      frozenColumns: 0,
      charts: [],
    };
    next.sheets.push(sheet);
    next.activeSheetId = sheet.id;
    onChange(next);
    setSelectedCell("A1");
  };

  const sortRows = (direction: "asc" | "desc") => {
    const column = selectedCell.match(/^[A-Z]+/)?.[0] || "A";
    updateSheet((sheet) => {
      const rowMaps = Array.from({ length: rows - 1 }, (_, index) => {
        const row = index + 2;
        const cells: Record<string, SpreadsheetCell> = {};
        for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
          const name = columnName(columnIndex);
          const cell = sheet.cells[`${name}${row}`];
          if (cell) cells[name] = cell;
        }
        return { row, cells, value: cells[column]?.computed ?? cells[column]?.value ?? "" };
      });
      rowMaps.sort((left, right) => {
        const result = String(left.value).localeCompare(String(right.value), undefined, {
          numeric: true,
        });
        return direction === "asc" ? result : -result;
      });
      for (let row = 2; row <= rows; row += 1) {
        for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
          delete sheet.cells[`${columnName(columnIndex)}${row}`];
        }
      }
      rowMaps.forEach((source, index) => {
        const targetRow = index + 2;
        Object.entries(source.cells).forEach(([name, cell]) => {
          sheet.cells[`${name}${targetRow}`] = cell;
        });
      });
      sheet.sort = { column, direction };
    });
  };

  const chartValues = useMemo(() => {
    if (!active?.charts[0]) return [];
    const numeric: number[] = [];
    for (const cell of Object.values(active.cells)) {
      const value = cell.computed ?? cell.value;
      if (typeof value === "number") numeric.push(value);
      if (numeric.length === 12) break;
    }
    return numeric;
  }, [active]);

  return (
    <div className="artifact-editor spreadsheet-editor">
      <div className="artifact-toolstrip">
        <button
          type="button"
          className={selected?.style?.bold ? "active" : ""}
          onClick={() =>
            updateSelectedStyle((style) => (style.bold = !style.bold))
          }
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          className={selected?.style?.italic ? "active" : ""}
          onClick={() =>
            updateSelectedStyle((style) => (style.italic = !style.italic))
          }
        >
          <Italic size={15} />
        </button>
        <label className="cell-color">
          Fill
          <input
            type="color"
            value={selected?.style?.fill || "#ffffff"}
            onChange={(event) =>
              updateSelectedStyle((style) => (style.fill = event.target.value))
            }
          />
        </label>
        <button type="button" onClick={() => sortRows("asc")}>
          Sort A→Z
        </button>
        <button type="button" onClick={() => sortRows("desc")}>
          Sort Z→A
        </button>
        <button
          type="button"
          onClick={() =>
            updateSheet((sheet) => {
              sheet.charts.push({
                id: uid(),
                type: "bar",
                title: "Data chart",
                range: "A1:B12",
              });
            })
          }
        >
          <Columns3 size={15} /> Chart
        </button>
        <label>
          Freeze rows
          <input
            className="tiny-number"
            type="number"
            min={0}
            max={10}
            value={active?.frozenRows || 0}
            onChange={(event) =>
              updateSheet(
                (sheet) => (sheet.frozenRows = Number(event.target.value)),
              )
            }
          />
        </label>
        <label>
          Freeze columns
          <input
            className="tiny-number"
            type="number"
            min={0}
            max={6}
            value={active?.frozenColumns || 0}
            onChange={(event) =>
              updateSheet(
                (sheet) => (sheet.frozenColumns = Number(event.target.value)),
              )
            }
          />
        </label>
      </div>
      <div className="formula-bar">
        <b>{selectedCell}</b>
        <span>fx</span>
        <input
          value={spreadsheetDisplay(selected)}
          onChange={(event) => setCell(selectedCell, event.target.value)}
          aria-label="Formula bar"
          placeholder="Value or =SUM(A1:A5)"
        />
      </div>
      <div className="sheet-grid-wrap">
        <div
          className="sheet-grid"
          style={{
            gridTemplateColumns: `42px repeat(${columns}, minmax(96px, 1fr))`,
          }}
        >
          <div className="sheet-corner" />
          {Array.from({ length: columns }, (_, index) => (
            <div className="sheet-column-heading" key={columnName(index)}>
              {columnName(index)}
            </div>
          ))}
          {Array.from({ length: rows }, (_, rowIndex) => (
            <div className="sheet-row" key={rowIndex + 1}>
              <div className="sheet-row-heading">{rowIndex + 1}</div>
              {Array.from({ length: columns }, (__, columnIndex) => {
                const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
                const cell = active?.cells[reference];
                return (
                  <input
                    key={reference}
                    className={reference === selectedCell ? "selected" : ""}
                    value={spreadsheetDisplay(cell)}
                    style={{
                      background: cell?.style?.fill,
                      color: cell?.style?.textColor,
                      fontWeight: cell?.style?.bold ? 700 : 400,
                      fontStyle: cell?.style?.italic ? "italic" : "normal",
                      textAlign: cell?.style?.align || "left",
                    }}
                    onFocus={() => setSelectedCell(reference)}
                    onChange={(event) => setCell(reference, event.target.value)}
                    aria-label={reference}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="sheet-footer">
        <div className="sheet-tabs">
          {content.sheets.map((sheet) => (
            <button
              type="button"
              key={sheet.id}
              className={sheet.id === active?.id ? "active" : ""}
              onClick={() => {
                const next = clone(content);
                next.activeSheetId = sheet.id;
                onChange(next);
                setSelectedCell("A1");
              }}
              onDoubleClick={() => {
                const name = window.prompt("Rename sheet", sheet.name)?.trim();
                if (!name) return;
                const next = clone(content);
                const target = next.sheets.find(
                  (candidate) => candidate.id === sheet.id,
                );
                if (target) target.name = name.slice(0, 40);
                onChange(next);
              }}
            >
              {sheet.name}
            </button>
          ))}
          <button type="button" onClick={addSheet} title="Add sheet">
            <Plus size={14} />
          </button>
        </div>
        {active?.charts.length ? (
          <div className="spreadsheet-chart">
            <b>{active.charts[0].title}</b>
            <div>
              {chartValues.map((value, index) => (
                <span
                  key={`${value}-${index}`}
                  style={{
                    height: `${Math.max(
                      5,
                      (Math.abs(value) /
                        Math.max(1, ...chartValues.map(Math.abs))) *
                        70,
                    )}px`,
                  }}
                  title={String(value)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                updateSheet((sheet) => {
                  sheet.charts = sheet.charts.slice(1);
                })
              }
            >
              Remove chart
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CanvasEditor({ content, onChange }: EditorProps<CanvasContent>) {
  const [selectedId, setSelectedId] = useState(content.elements[0]?.id || "");
  const selected = content.elements.find((element) => element.id === selectedId);

  const add = (kind: CanvasElement["kind"], shape?: CanvasElement["shape"]) => {
    const next = clone(content);
    const element: CanvasElement = {
      id: uid(),
      kind,
      x: 80 + next.elements.length * 12,
      y: 80 + next.elements.length * 12,
      width: kind === "text" ? 260 : 180,
      height: kind === "text" ? 60 : 120,
      rotation: 0,
      text: kind === "text" ? "New idea" : undefined,
      shape,
      fill: "#ffffff",
      stroke: "#111111",
    };
    next.elements.push(element);
    onChange(next);
    setSelectedId(element.id);
  };

  const update = (updater: (element: CanvasElement) => void) => {
    const next = clone(content);
    const element = next.elements.find((candidate) => candidate.id === selectedId);
    if (element) updater(element);
    onChange(next);
  };

  const connect = () => {
    const nodes = content.elements.filter(
      (element) => element.kind !== "connector",
    );
    if (nodes.length < 2) return;
    const next = clone(content);
    next.elements.push({
      id: uid(),
      kind: "connector",
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      rotation: 0,
      fromId: nodes[nodes.length - 2].id,
      toId: nodes[nodes.length - 1].id,
      stroke: "#111111",
    });
    onChange(next);
  };

  return (
    <div className="artifact-editor canvas-editor">
      <div className="artifact-toolstrip">
        <button type="button" onClick={() => add("text")}>
          <Type size={15} /> Text
        </button>
        <button type="button" onClick={() => add("shape", "rectangle")}>
          <RectangleHorizontal size={15} /> Rectangle
        </button>
        <button type="button" onClick={() => add("shape", "ellipse")}>
          <Circle size={15} /> Ellipse
        </button>
        <button type="button" onClick={connect}>
          <Minus size={15} /> Connect last two
        </button>
        <label>
          Canvas
          <input
            type="color"
            value={content.background}
            onChange={(event) => {
              const next = clone(content);
              next.background = event.target.value;
              onChange(next);
            }}
          />
        </label>
      </div>
      <div className="canvas-layout">
        <div className="canvas-scroll">
          <div
            className="structured-canvas"
            style={{
              width: content.width,
              height: content.height,
              background: content.background,
            }}
            onClick={() => setSelectedId("")}
          >
            {content.elements.map((element) => {
              if (element.kind === "connector") {
                const from = content.elements.find(
                  (candidate) => candidate.id === element.fromId,
                );
                const to = content.elements.find(
                  (candidate) => candidate.id === element.toId,
                );
                if (!from || !to) return null;
                const x1 = from.x + from.width / 2;
                const y1 = from.y + from.height / 2;
                const x2 = to.x + to.width / 2;
                const y2 = to.y + to.height / 2;
                const length = Math.hypot(x2 - x1, y2 - y1);
                const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
                return (
                  <span
                    key={element.id}
                    className="canvas-connector"
                    style={{
                      left: x1,
                      top: y1,
                      width: length,
                      transform: `rotate(${angle}deg)`,
                      background: element.stroke,
                    }}
                  />
                );
              }
              return (
                <button
                  type="button"
                  key={element.id}
                  className={`canvas-element ${
                    selectedId === element.id ? "selected" : ""
                  } canvas-element-${element.shape || element.kind}`}
                  style={{
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    transform: `rotate(${element.rotation}deg)`,
                    background: element.fill,
                    borderColor: element.stroke,
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedId(element.id);
                  }}
                >
                  {element.text || (element.shape === "ellipse" ? "Ellipse" : "")}
                </button>
              );
            })}
          </div>
        </div>
        <aside className="artifact-inspector">
          <h3>Canvas</h3>
          <div className="inspector-grid">
            <label>
              Width
              <input
                type="number"
                min={320}
                max={4096}
                value={content.width}
                onChange={(event) => {
                  const next = clone(content);
                  next.width = Number(event.target.value);
                  onChange(next);
                }}
              />
            </label>
            <label>
              Height
              <input
                type="number"
                min={240}
                max={4096}
                value={content.height}
                onChange={(event) => {
                  const next = clone(content);
                  next.height = Number(event.target.value);
                  onChange(next);
                }}
              />
            </label>
          </div>
          {selected && selected.kind !== "connector" && (
            <>
              <h3>Selection</h3>
              {selected.kind === "text" && (
                <label>
                  Text
                  <textarea
                    value={selected.text || ""}
                    onChange={(event) =>
                      update((element) => (element.text = event.target.value))
                    }
                  />
                </label>
              )}
              <div className="inspector-grid">
                {(["x", "y", "width", "height", "rotation"] as const).map(
                  (key) => (
                    <label key={key}>
                      {key}
                      <input
                        type="number"
                        value={selected[key]}
                        onChange={(event) =>
                          update(
                            (element) =>
                              (element[key] = Number(event.target.value)),
                          )
                        }
                      />
                    </label>
                  ),
                )}
              </div>
              <label>
                Fill
                <input
                  type="color"
                  value={selected.fill || "#ffffff"}
                  onChange={(event) =>
                    update((element) => (element.fill = event.target.value))
                  }
                />
              </label>
              <button
                type="button"
                className="danger-subtle"
                onClick={() => {
                  const next = clone(content);
                  next.elements = next.elements.filter(
                    (element) => element.id !== selected.id,
                  );
                  onChange(next);
                  setSelectedId("");
                }}
              >
                <Trash2 size={14} /> Delete selection
              </button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function PdfEditor({ content, onChange }: EditorProps<PdfContent>) {
  const [pageIndex, setPageIndex] = useState(0);
  const page = content.pages[pageIndex] || content.pages[0];
  if (!page) return <div className="unsupported-editor">This PDF has no pages.</div>;
  const document: DocumentContent = {
    kind: "document",
    blocks: page.blocks,
    header: "",
    footer: "",
    pageNumbers: true,
    comments: [],
  };
  return (
    <div className="pdf-structured-editor">
      <div className="pdf-page-tabs">
        {content.pages.map((item, index) => (
          <button
            type="button"
            className={index === pageIndex ? "active" : ""}
            key={item.id}
            onClick={() => setPageIndex(index)}
          >
            Page {index + 1}
          </button>
        ))}
      </div>
      <DocumentEditor
        content={document}
        onChange={(nextDocument) => {
          const next = clone(content);
          next.pages[pageIndex].blocks = nextDocument.blocks;
          onChange(next);
        }}
      />
    </div>
  );
}

export function ArtifactEditor({
  content,
  onChange,
  onAssetFile,
}: {
  content: ArtifactContent;
  onChange: (content: ArtifactContent) => void;
  onAssetFile?: (file: File) => Promise<{ id: string; dataUrl: string }>;
}) {
  if (content.kind === "presentation") {
    return (
      <PresentationEditor
        content={content}
        onChange={(next) => onChange(next)}
        onAssetFile={onAssetFile}
      />
    );
  }
  if (content.kind === "document") {
    return (
      <DocumentEditor content={content} onChange={(next) => onChange(next)} />
    );
  }
  if (content.kind === "spreadsheet") {
    return (
      <SpreadsheetEditor
        content={content}
        onChange={(next) => onChange(next)}
      />
    );
  }
  if (content.kind === "canvas") {
    return <CanvasEditor content={content} onChange={(next) => onChange(next)} />;
  }
  if (content.kind === "pdf") {
    return <PdfEditor content={content} onChange={(next) => onChange(next)} />;
  }
  return (
    <div className="unsupported-editor">
      <LayoutTemplate size={28} />
      <h2>{content.kind.replace("-", " ")} workspace</h2>
      <p>
        This typed artifact is safely stored and versioned. Its specialized editor
        is scheduled after the shared Office and canvas foundation.
      </p>
    </div>
  );
}
