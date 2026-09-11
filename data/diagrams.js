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
//     parent?: string,        // diagram key the back link returns to, default "root"
//     related?: [{ href: string, label: string }],
//                             // text links under the doc prose (not nodes/edges)
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
    dir: "LR",
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

      // SAP B1 documents upstream/downstream of the feeders above. They show the
      // "Copy To" document flow only — none of them feed RPC_JobBreakdown.
      { id: "sales-quotation",    label: "Sales Quotation",    kind: "document", href: "/process/sales-quotation" },
      { id: "sales-order",        label: "Sales Order",        kind: "document", href: "/process/sales-order" },
      { id: "returns",            label: "Returns",            kind: "document", href: "/process/returns" },
      { id: "incoming-payment",   label: "Incoming Payment",   kind: "document", href: "/process/incoming-payment" },
      { id: "purchase-request",   label: "Purchase Request",   kind: "document", href: "/process/purchase-request" },
      { id: "purchase-quotation", label: "Purchase Quotation", kind: "document", href: "/process/purchase-quotation" },
      { id: "purchase-order",     label: "Purchase Order",     kind: "document", href: "/process/purchase-order" },
      { id: "goods-receipt-po",   label: "Goods Receipt PO",   kind: "document", href: "/process/goods-receipt-po" },
      { id: "goods-return",       label: "Goods Return",       kind: "document", href: "/process/goods-return" },
      { id: "outgoing-payment",   label: "Outgoing Payment",   kind: "document", href: "/process/outgoing-payment" },
      { id: "bill-of-materials",  label: "Bill of Materials",  kind: "document", href: "/process/bill-of-materials" },
      { id: "goods-issue",        label: "Goods Issue",        kind: "document", href: "/process/goods-issue" },
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

      // SAP B1 document flow. Do NOT add edges into job-breakdown here.
      { source: "sales-quotation",    target: "sales-order" },
      { source: "sales-order",        target: "delivery" },
      { source: "delivery",           target: "ar-invoice" },
      { source: "delivery",           target: "returns" },
      { source: "returns",            target: "ar-credit-note" },
      { source: "ar-invoice",         target: "ar-credit-note" },
      { source: "ar-invoice",         target: "incoming-payment" },
      { source: "purchase-request",   target: "purchase-quotation" },
      { source: "purchase-quotation", target: "purchase-order" },
      { source: "purchase-order",     target: "goods-receipt-po" },
      { source: "goods-receipt-po",   target: "ap-invoice" },
      { source: "goods-receipt-po",   target: "goods-return" },
      { source: "goods-return",       target: "ap-credit-note" },
      { source: "ap-invoice",         target: "ap-credit-note" },
      { source: "ap-invoice",         target: "outgoing-payment" },
      { source: "bill-of-materials",  target: "production-order" },
      { source: "production-order",   target: "goods-issue",   label: "Issue for Production" },
      { source: "production-order",   target: "goods-receipt", label: "Receipt from Production" },
    ],
    related: [
      { href: "/process/inventory-transfers", label: "Inventory Transfers →" },
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

  // ---------- SAP B1 DOCUMENT PAGES (not fed into RPC_JobBreakdown) ----------
  "sales-quotation": {
    title: "Sales Quotation",
    doc: "Sales Quotation offered to a customer. OQUT header, QUT1 rows — copied to a Sales Order.",
    nodes: [
      { id: "oqut", kind: "table", label: "OQUT\n[HEADER]" },
      { id: "qut1", kind: "table", label: "QUT1\n[ROW]" },
    ],
    edges: [{ source: "oqut", target: "qut1" }],
  },

  "sales-order": {
    title: "Sales Order",
    doc: "Sales Order confirming a customer's order. ORDR header, RDR1 rows. Rows copied from a quotation carry BaseType/BaseEntry/BaseLine; copied onward to a Delivery.",
    nodes: [
      { id: "ordr", kind: "table", label: "ORDR\n[HEADER]" },
      { id: "rdr1", kind: "table", label: "RDR1\n[ROW]" },
    ],
    edges: [{ source: "ordr", target: "rdr1" }],
  },

  returns: {
    title: "Returns",
    doc: "Customer return of delivered goods. ORDN header, RDN1 rows (BaseType/BaseEntry/BaseLine point back at the Delivery) — can be copied to an A/R Credit Memo.",
    nodes: [
      { id: "ordn", kind: "table", label: "ORDN\n[HEADER]" },
      { id: "rdn1", kind: "table", label: "RDN1\n[ROW]" },
    ],
    edges: [{ source: "ordn", target: "rdn1" }],
  },

  "incoming-payment": {
    title: "Incoming Payment",
    doc: "Customer payment. ORCT is the payment header; RCT2 lists the A/R Invoices (and credit memos) the payment is applied to.",
    nodes: [
      { id: "orct", kind: "table", label: "ORCT\n[HEADER]" },
      { id: "rct2", kind: "table", label: "RCT2\n[PAID INVOICES]" },
    ],
    edges: [{ source: "orct", target: "rct2" }],
  },

  "purchase-request": {
    title: "Purchase Request",
    doc: "Internal request to buy. OPRQ header, PRQ1 rows — copied to a Purchase Quotation or Purchase Order.",
    nodes: [
      { id: "oprq", kind: "table", label: "OPRQ\n[HEADER]" },
      { id: "prq1", kind: "table", label: "PRQ1\n[ROW]" },
    ],
    edges: [{ source: "oprq", target: "prq1" }],
  },

  "purchase-quotation": {
    title: "Purchase Quotation",
    doc: "Supplier quotation. OPQT header, PQT1 rows — copied to a Purchase Order.",
    nodes: [
      { id: "opqt", kind: "table", label: "OPQT\n[HEADER]" },
      { id: "pqt1", kind: "table", label: "PQT1\n[ROW]" },
    ],
    edges: [{ source: "opqt", target: "pqt1" }],
  },

  "purchase-order": {
    title: "Purchase Order",
    doc: "Purchase Order sent to a supplier. OPOR header, POR1 rows — copied to a Goods Receipt PO.",
    nodes: [
      { id: "opor", kind: "table", label: "OPOR\n[HEADER]" },
      { id: "por1", kind: "table", label: "POR1\n[ROW]" },
    ],
    edges: [{ source: "opor", target: "por1" }],
  },

  "goods-receipt-po": {
    title: "Goods Receipt PO",
    doc: "Receipt of purchased goods against a Purchase Order. OPDN header, PDN1 rows (BaseType/BaseEntry/BaseLine point back at the PO). Not the same as the inventory Goods Receipt (OIGN).",
    nodes: [
      { id: "opdn", kind: "table", label: "OPDN\n[HEADER]" },
      { id: "pdn1", kind: "table", label: "PDN1\n[ROW]" },
    ],
    edges: [{ source: "opdn", target: "pdn1" }],
  },

  "goods-return": {
    title: "Goods Return",
    doc: "Return of received goods to a supplier. ORPD header, RPD1 rows — can be copied to an A/P Credit Memo.",
    nodes: [
      { id: "orpd", kind: "table", label: "ORPD\n[HEADER]" },
      { id: "rpd1", kind: "table", label: "RPD1\n[ROW]" },
    ],
    edges: [{ source: "orpd", target: "rpd1" }],
  },

  "outgoing-payment": {
    title: "Outgoing Payment",
    doc: "Payment to a supplier. OVPM is the payment header; VPM2 lists the A/P Invoices (and credit memos) the payment is applied to.",
    nodes: [
      { id: "ovpm", kind: "table", label: "OVPM\n[HEADER]" },
      { id: "vpm2", kind: "table", label: "VPM2\n[PAID INVOICES]" },
    ],
    edges: [{ source: "ovpm", target: "vpm2" }],
  },

  "bill-of-materials": {
    title: "Bill of Materials",
    doc: "Bill of Materials for a parent item. OITT header, ITT1 component rows — used as the template for a Production Order's WOR1 lines.",
    nodes: [
      { id: "oitt", kind: "table", label: "OITT\n[HEADER]" },
      { id: "itt1", kind: "table", label: "ITT1\n[COMPONENTS]" },
    ],
    edges: [{ source: "oitt", target: "itt1" }],
  },

  "goods-issue": {
    title: "Goods Issue",
    doc: "Goods Issue (inventory out). OIGE header, IGE1 rows. Issue for Production is also stored here, with rows linked to the Production Order.",
    nodes: [
      { id: "oige", kind: "table", label: "OIGE\n[HEADER]" },
      { id: "ige1", kind: "table", label: "IGE1\n[ROW]" },
    ],
    edges: [{ source: "oige", target: "ige1" }],
  },

  // ---------- SEPARATE DIAGRAM: no link to anything in `root` ----------
  "inventory-transfers": {
    title: "Inventory Transfers",
    doc: "Stock movement between warehouses. Not part of RPC_JobBreakdown. Click a document to drill in.",
    dir: "LR",
    nodes: [
      { id: "inventory-transfer-request", label: "Inventory Transfer Request", kind: "document", href: "/process/inventory-transfer-request" },
      { id: "inventory-transfer",         label: "Inventory Transfer",         kind: "document", href: "/process/inventory-transfer" },
    ],
    edges: [{ source: "inventory-transfer-request", target: "inventory-transfer" }],
  },

  "inventory-transfer-request": {
    title: "Inventory Transfer Request",
    parent: "inventory-transfers",
    doc: "Request to move stock between warehouses. OWTQ header, WTQ1 rows — copied to an Inventory Transfer.",
    nodes: [
      { id: "owtq", kind: "table", label: "OWTQ\n[HEADER]" },
      { id: "wtq1", kind: "table", label: "WTQ1\n[ROW]" },
    ],
    edges: [{ source: "owtq", target: "wtq1" }],
  },

  "inventory-transfer": {
    title: "Inventory Transfer",
    parent: "inventory-transfers",
    doc: "Stock moved between warehouses. OWTR header, WTR1 rows (BaseType/BaseEntry/BaseLine point back at the request, if any).",
    nodes: [
      { id: "owtr", kind: "table", label: "OWTR\n[HEADER]" },
      { id: "wtr1", kind: "table", label: "WTR1\n[ROW]" },
    ],
    edges: [{ source: "owtr", target: "wtr1" }],
  },
};