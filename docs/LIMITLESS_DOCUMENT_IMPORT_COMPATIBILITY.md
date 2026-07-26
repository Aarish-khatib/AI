# Document import compatibility

| Format | Preserved | Converted or reported |
|---|---|---|
| DOCX | headings, paragraphs, lists, tables, images where supported | unsupported relationships and layout effects appear in the compatibility report |
| PPTX | slides, common text/shapes/images/tables/charts | unsupported transitions, fonts, and effects are reported |
| XLSX | sheets, values, bounded formulas, common formatting, panes, filters, dimensions | unsupported formulas/features are reported, never executed |
| PDF | page text and page structure foundation | PDF is not claimed as a fully editable original-layout round trip |
| Markdown/HTML/CSV | semantic text/table structure | HTML is sanitized and scripts are never imported |

Office ZIP readers enforce CRC, path, entry-count, expanded-size, and file-size
limits. Import never silently claims unsupported fidelity.
