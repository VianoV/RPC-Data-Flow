// data/diagrams.js
//
// RPC_JobBreakdown source map, converted from the draw.io SVG.
//
// Structure:
//   - `root` is the top-level diagram, rendered at "/". Each feeder group is
//     ONE node that links (href) to its own process page. RPC_JobBreakdown is
//     the leaf everything points at (no href).
//   - Every other key (e.g. "ar-invoice") is a drill-down page, served from
//     app/process/[slug]/page.js and prerendered at build time. The key IS the
//     URL slug, so `href: "/process/ar-invoice"` must match the key exactly.
//
// ---------------------------------------------------------------------------
// SCHEMA CONTRACT — the renderer honours exactly these fields. Any draw.io
// export converted to JS must target this shape.
//
//   diagrams[key] = {
//     title: string,          // page heading
//     doc:   string,          // prose paragraph shown above the canvas
//     dir?:  "TB" | "LR",     // dagre layout direction, default "TB".
//                             // Use "LR" for long left-to-right process flows.
//     nodes: [{
//       id:    string,        // unique WITHIN this diagram
//       label: string,        // "\n" renders as a real line break
//       kind?: "human" | "document" | "table" | "view" | "output",
//                             // drives the node's accent colour; omit for neutral
//       href?: string,        // makes the node clickable, e.g. "/process/<key>"
//       note?: string,        // optional smaller detail line under the label
//     }],
//     edges: [{
//       source: string,       // node id
//       target: string,       // node id
//       label?: string,       // optional text drawn on the edge
//     }],
//   }
//
// Node sizes and positions are computed automatically by lib/layout.js — never
// hand-place coordinates here.
// ---------------------------------------------------------------------------
//
// Fill in the `doc` fields with your real compliance/process notes.
// Rename the two legacy job-history tables once you confirm the real
// object names — the SVG labelled both "PT_RPC_JobHistoryIDR".

export const diagrams = {
  // ---------- TOP-LEVEL DIAGRAM ----------
  root: {
    title: "RPC_JobBreakdown",
    doc: "Consolidation view that aggregates SAP B1 marketing documents, master data and legacy history into a per-job cost/revenue breakdown. Click any source to drill in.",
    nodes: [
      { id: "ar-invoice",       label: "AR Invoice",             kind: "document", href: "/process/ar-invoice" },
      { id: "ap-invoice",       label: "AP Invoice",             kind: "document", href: "/process/ap-invoice" },
      { id: "ar-credit-note",   label: "AR Credit Note",         kind: "document", href: "/process/ar-credit-note" },
      { id: "ap-credit-note",   label: "AP Credit Note",         kind: "document", href: "/process/ap-credit-note" },
      { id: "production-order", label: "Production Order",       kind: "document", href: "/process/production-order" },
      { id: "delivery",         label: "Delivery",               kind: "document", href: "/process/delivery" },
      { id: "goods-receipt",    label: "Goods Receipt",          kind: "document", href: "/process/goods-receipt" },
      { id: "items",            label: "Items",                  kind: "table",    href: "/process/items" },
      { id: "project",          label: "Project",                kind: "table",    href: "/process/project" },
      { id: "legacy-labour",    label: "Legacy Labour History",  kind: "table",    href: "/process/legacy-labour" },
      { id: "legacy-material",  label: "Legacy Material History",kind: "table",    href: "/process/legacy-material" },
      { id: "legacy-invoice",   label: "Legacy Invoice History", kind: "table",    href: "/process/legacy-invoice" },
      { id: "job-breakdown",    label: "RPC_JobBreakdown (VIEW)", kind: "view" }, // leaf: no href
    ],
    edges: [
      { source: "ar-invoice",       target: "job-breakdown" },
      { source: "ap-invoice",       target: "job-breakdown" },
      { source: "ar-credit-note",   target: "job-breakdown" },
      { source: "ap-credit-note",   target: "job-breakdown" },
      { source: "production-order", target: "job-breakdown" },
      { source: "delivery",         target: "job-breakdown" },
      { source: "goods-receipt",    target: "job-breakdown" },
      { source: "items",            target: "job-breakdown" },
      { source: "project",          target: "job-breakdown" },
      { source: "legacy-labour",    target: "job-breakdown" },
      { source: "legacy-material",  target: "job-breakdown" },
      { source: "legacy-invoice",   target: "job-breakdown" },
    ],
  },

  // ---------- FEEDER PROCESS PAGES ----------
  "ar-invoice": {
    title: "AR Invoice",
    doc: "Standard SAP B1 A/R Invoice. OINV holds the document header; INV1 holds the line rows that feed job revenue into RPC_JobBreakdown.",
    nodes: [
      { id: "oinv", kind: "table", label: "OINV\n[HEADER]" },
      { id: "inv1", kind: "table", label: "INV1\n[ROW]" },
    ],
    edges: [{ source: "oinv", target: "inv1" }],
  },

  "ap-invoice": {
    title: "AP Invoice",
    doc: "A/P Invoice. OPCH is the header, PCH1 the rows — supplier costs attributed to a job.",
    nodes: [
      { id: "opch", kind: "table", label: "OPCH\n[HEADER]" },
      { id: "pch1", kind: "table", label: "PCH1\n[ROW]" },
    ],
    edges: [{ source: "opch", target: "pch1" }],
  },

  "ar-credit-note": {
    title: "AR Credit Note",
    doc: "A/R Credit Note reversing customer revenue. ORIN header, RIN1 rows.",
    nodes: [
      { id: "orin", kind: "table", label: "ORIN\n[HEADER]" },
      { id: "rin1", kind: "table", label: "RIN1\n[ROW]" },
    ],
    edges: [{ source: "orin", target: "rin1" }],
  },

  "ap-credit-note": {
    title: "AP Credit Note",
    doc: "A/P Credit Note reversing supplier cost. ORPC header, RPC1 rows.",
    nodes: [
      { id: "orpc", kind: "table", label: "ORPC\n[HEADER]" },
      { id: "rpc1", kind: "table", label: "RPC1\n[ROW]" },
    ],
    edges: [{ source: "orpc", target: "rpc1" }],
  },

  "production-order": {
    title: "Production Order",
    doc: "Production Order. OWOR header, WOR1 component/line rows.",
    nodes: [
      { id: "owor", kind: "table", label: "OWOR\n[HEADER]" },
      { id: "wor1", kind: "table", label: "WOR1\n[ROW]" },
    ],
    edges: [{ source: "owor", target: "wor1" }],
  },

  delivery: {
    title: "Delivery",
    doc: "Delivery document. ODLN header, DLN1 rows.",
    nodes: [
      { id: "odln", kind: "table", label: "ODLN\n[HEADER]" },
      { id: "dln1", kind: "table", label: "DLN1\n[ROW]" },
    ],
    edges: [{ source: "odln", target: "dln1" }],
  },

  "goods-receipt": {
    title: "Goods Receipt",
    doc: "Goods Receipt (inventory in). OIGN header, IGN1 rows.",
    nodes: [
      { id: "oign", kind: "table", label: "OIGN\n[HEADER]" },
      { id: "ign1", kind: "table", label: "IGN1\n[ROW]" },
    ],
    edges: [{ source: "oign", target: "ign1" }],
  },

  items: {
    title: "Items",
    doc: "Item master data. OITB is the item-groups table, OITM the item master — used to classify lines by item/group.",
    nodes: [
      { id: "oitb", kind: "table", label: "OITB\n[ITEMS GROUP]" },
      { id: "oitm", kind: "table", label: "OITM\n[ITEMS]" },
    ],
    edges: [{ source: "oitb", target: "oitm" }],
  },

  project: {
    title: "Project",
    doc: "Project structure. OPRJ holds SAP project codes; @PROJECT is the header UDO; @SECTION is a UDT of sections under a project. These provide the job/section dimension for the breakdown.",
    nodes: [
      { id: "oprj",    kind: "table", label: "OPRJ\n[PROJECT CODES]" },
      { id: "project-udo", kind: "table", label: "@PROJECT\n[HEADER UDO]" },
      { id: "section-udt", kind: "table", label: "@SECTION\n[UDT]" },
    ],
    edges: [
      { source: "oprj", target: "project-udo" },
      { source: "project-udo", target: "section-udt" },
    ],
  },

  "legacy-labour": {
    title: "Legacy Labour History",
    doc: "Pre-migration labour history in IDR. Rename to the real object name if different.",
    nodes: [{ id: "pt-labour", kind: "table", label: "PT_RPC_JobHistoryIDR\n(labour)" }],
    edges: [],
  },

  "legacy-material": {
    title: "Legacy Material History",
    doc: "Pre-migration material history in IDR. Rename to the real object name if different.",
    nodes: [{ id: "pt-material", kind: "table", label: "PT_RPC_JobHistoryIDR\n(material)" }],
    edges: [],
  },

  "legacy-invoice": {
    title: "Legacy Invoice History",
    doc: "Pre-migration invoiced history.",
    nodes: [{ id: "pt-invoice", kind: "table", label: "PT_RPC_InvoicedHistory" }],
    edges: [],
  },
};