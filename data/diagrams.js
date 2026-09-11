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
//                             // (job-breakdown block pages are built by block())
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

// ---------- RPC_JobBreakdown BLOCK PAGES ----------
// The view is a UNION ALL of 12 SELECT blocks (see RPC_JobBreakdown_detailed.md).
// Each block page shows the tables it joins (edge label = join type + key), its
// WHERE filter, and the rows it contributes. Blocks 1–4 and 6 share one join
// shape (documentBlock), as do legacy blocks 8–10 (legacyJobBlock).

/**
 * One block page: its tables and joins, then
 *   <rowsFrom table> → WHERE (when there is a filter) → "Block n rows".
 */
function block({ n, title, doc, area, type, tables, joins, rowsFrom, filter, output }) {
  const out = {
    id: "out",
    kind: "output",
    label: `Block ${n} rows`,
    note: [`AREA '${area}' · Type '${type}'`, output].filter(Boolean).join("\n"),
  };
  const tail = filter
    ? {
        nodes: [{ id: "where", label: "WHERE", note: filter }, out],
        edges: [
          { source: rowsFrom, target: "where" },
          { source: "where", target: "out" },
        ],
      }
    : { nodes: [out], edges: [{ source: rowsFrom, target: "out" }] };

  return {
    title: `Block ${n} — ${title}`,
    doc,
    parent: "job-breakdown",
    dir: "LR",
    nodes: [
      ...tables.map(([id, label, note]) => ({ id, kind: "table", label, note })),
      ...tail.nodes,
    ],
    edges: [
      ...joins.map(([source, target, label]) => ({ source, target, label })),
      ...tail.edges,
    ],
  };
}

// Header + line document with item, item-group, project and section lookups.
function documentBlock({ header, line, ...rest }) {
  return block({
    ...rest,
    rowsFrom: "t1",
    tables: [
      ["t0", `T0 · ${header}\n[HEADER]`],
      ["t1", `T1 · ${line}\n[LINE]`],
      ["t2", "T2 · OITM\n[ITEM]"],
      ["t3", "T3 · OITB\n[GROUP VIA ITEM]"],
      ["t4", "T4 · OITB\n[GROUP VIA COST CODE]"],
      ["t5", "T5 · OPRJ\n[PROJECT]"],
      ["t6", "T6 · @SECTION\n[SECTION]"],
    ],
    joins: [
      ["t0", "t1", "INNER · DocEntry"],
      ["t1", "t2", "LEFT · ItemCode"],
      ["t2", "t3", "LEFT · ItmsGrpCod"],
      ["t1", "t4", "LEFT · U_CostCode"],
      ["t1", "t5", "LEFT · project"],
      ["t1", "t6", "LEFT · project + U_Section"],
    ],
  });
}

// Flat legacy job-cost table in RPC_INA: lookups only, no header/line.
function legacyJobBlock({ projectJoin = "LEFT · Job Number", ...rest }) {
  return block({
    ...rest,
    rowsFrom: "t0",
    tables: [
      ["t0", "T0 · PT_RPCJobHistoryIDR\n[FLAT · RPC_INA]"],
      ["t4", "T4 · OITB\n[GROUP VIA COST CENTRE]"],
      ["t5", "T5 · OPRJ\n[PROJECT]", "matched on U_BC_PC, then PrjCode"],
      ["t6", "T6 · @SECTION\n[SECTION]"],
    ],
    joins: [
      ["t0", "t4", "LEFT · Cost Centre"],
      ["t0", "t5", projectJoin],
      ["t0", "t6", "LEFT · project + Section"],
    ],
  });
}

const jobBreakdownBlocks = {
  "jb-ar-invoices": documentBlock({
    n: 1, title: "A/R Invoices", area: "INVOICES", type: "INV",
    doc: "Sales invoices: revenue billed to customers. Sets the 29-column pattern every other block mirrors. Lines are INNER-joined; every lookup is LEFT, so a missing item, group, project or section never drops the invoice.",
    header: "OINV", line: "INV1",
    filter: "T0.CANCELED = 'N'",
    output: "LineTotal net of DiscPrcnt\nCOGS = 0",
  }),

  "jb-deliveries": documentBlock({
    n: 2, title: "Deliveries", area: "JOB COSTS", type: "DLN",
    doc: "Delivery notes: goods shipped against a job. Columns are identical to block 1, read from ODLN/DLN1. No filter — every delivery is included.",
    header: "ODLN", line: "DLN1",
    output: "Columns as block 1",
  }),

  "jb-ar-credit-notes": documentBlock({
    n: 3, title: "A/R Credit Notes", area: "INVOICES", type: "CRE",
    doc: "Customer credit notes. Same as block 1 (ORIN/RIN1), but DocTotal, LineTotal, ForeignAmt and SysAmt are negated so they subtract from revenue.",
    header: "ORIN", line: "RIN1",
    filter: "T0.CANCELED = 'N'",
    output: "Amounts negated\nCOGS = 0",
  }),

  "jb-ap-invoices": documentBlock({
    n: 4, title: "A/P Invoices", area: "JOB COSTS", type: "AP",
    doc: "Supplier invoices: the discounted line value goes into COGS. Only service lines and non-inventory items are taken — stock purchases are counted in block 12 instead. Known bug: the SummaryType CASE repeats one branch, so one mapping is unreachable.",
    header: "OPCH", line: "PCH1",
    filter: "DocType = 'S' OR\n(DocType = 'I' AND InvntItem = 'N')\nAND CANCELED = 'N'",
    output: "COGS = LineTotal net of DiscPrcnt",
  }),

  "jb-journal-entries": block({
    n: 5, title: "Manual Journal Entries", area: "JOB COSTS", type: "AP",
    doc: "Costs posted by hand to the ledger and tagged to a job. Header and lines join on TransId, not DocEntry. There is no item, so no item/group lookups; the amount is Debit − Credit.",
    tables: [
      ["t0", "T0 · OJDT\n[HEADER]"],
      ["t1", "T1 · JDT1\n[LINE]"],
      ["t5", "T5 · OPRJ\n[PROJECT]"],
      ["t6", "T6 · @SECTION\n[SECTION]"],
    ],
    joins: [
      ["t0", "t1", "INNER · TransId"],
      ["t1", "t5", "LEFT · project"],
      ["t1", "t6", "LEFT · project + U_Section"],
    ],
    rowsFrom: "t1",
    filter: "TransType = '30'\nDebit or Credit ≠ 0\nProject and U_CostCode filled",
    output: "DocTotal = COGS = Debit − Credit\nSummaryType from U_CostType",
  }),

  "jb-ap-credit-notes": documentBlock({
    n: 6, title: "A/P Credit Notes", area: "JOB COSTS", type: "AP",
    doc: "Supplier refunds: block 4 with the cost negated. BaseType <> 204 skips credits drawn from that source document, to avoid double counting.",
    header: "ORPC", line: "RPC1",
    filter: "Service / non-stock (as block 4)\nAND T1.BaseType <> 204\nAND CANCELED = 'N'",
    output: "COGS negated",
  }),

  "jb-production-labour": block({
    n: 7, title: "Production-Order Labour", area: "JOB COSTS", type: "LAB",
    doc: "Internal cost of workers' time on production orders, computed from rates on the labour item rather than read from a document total. Warning: @SECTION is INNER-joined, so labour whose project has no matching section is silently dropped.",
    tables: [
      ["t0", "T0 · OWOR\n[HEADER]"],
      ["t1", "T1 · WOR1\n[LINE]"],
      ["t2", "T2 · OITM\n[LABOUR RATES]"],
      ["t3", "T3 · OITB\n[GROUP]"],
      ["t5", "T5 · OPRJ\n[PROJECT]"],
      ["t9", "T9 · @SECTION\n[SECTION]", "INNER: no section → row dropped"],
    ],
    joins: [
      ["t0", "t1", "INNER · DocEntry"],
      ["t1", "t2", "INNER · ItemCode LIKE 'LAB%'"],
      ["t2", "t3", "INNER · ItmsGrpCod"],
      ["t1", "t5", "LEFT · project"],
      ["t1", "t9", "INNER · project + U_Section"],
    ],
    rowsFrom: "t1",
    filter: "T2.ItemType = 'L'",
    output: "COGS = IssuedQty × U_Direct\nOverHeadCost = IssuedQty ×\nU_OverHead",
  }),

  "jb-legacy-purchases": legacyJobBlock({
    n: 8, title: "Legacy Purchases", area: "JOB COSTS", type: "AP",
    doc: "Purchase costs imported from the legacy system: one flat table in the RPC_INA database. The legacy [Job Number] is matched to OPRJ via the Business-Craft cross-reference U_BC_PC first, then PrjCode. The reference lists no WHERE filter for this block.",
    output: "COGS = Cost\nSummaryType 'Purchased'",
  }),

  "jb-legacy-labour": legacyJobBlock({
    n: 9, title: "Legacy Labour", area: "JOB COSTS", type: "LAB",
    doc: "Labour costs from the same flat legacy table as block 8, with labour constants (cost code 100) and the two overhead columns read from the table.",
    filter: "[Cost Type] = 'LABOUR'",
    output: "OverHeadCost =\n[Sum Oncosts Overhead]\nDepartmentalCost =\n[Departmental Overhead]",
  }),

  "jb-legacy-materials": legacyJobBlock({
    n: 10, title: "Legacy Materials", area: "JOB COSTS", type: "AP",
    doc: "Material/stock costs from the flat legacy table, categorised as Stock. Unlike blocks 8 and 9, the OPRJ join trims whitespace from the job number.",
    projectJoin: "LEFT · TRIM(Job Number)",
    filter: "[Cost Type] = 'MATERIALS'",
    output: "DocNum / PO = [Reference No]\nSummaryType 'Stock'",
  }),

  "jb-legacy-invoices": block({
    n: 11, title: "Legacy Invoices", area: "INVOICES", type: "INV",
    doc: "Old sales invoices from a second flat legacy table, already in IDR. Income, so COGS stays 0. No @SECTION lookup and no header/line join.",
    tables: [
      ["t0", "T0 · PT_RPC_InvoicedHistory\n[FLAT]"],
      ["t1", "T1 · OCRD\n[CUSTOMER]"],
      ["t5", "T5 · OPRJ\n[PROJECT]", "matched on U_BC_PC, then PrjCode"],
    ],
    joins: [
      ["t0", "t1", "LEFT · CardCode"],
      ["t0", "t5", "LEFT · JobNumber"],
    ],
    rowsFrom: "t0",
    output: "Amount = AmountIDR\nCOGS = 0",
  }),

  "jb-production-stock": block({
    n: 12, title: "Production-Order Stock Issues", area: "JOB COSTS", type: "DLN",
    doc: "True cost of materials consumed on production orders, read from SAP's inventory movement ledger (OINM). Here T1 is OINM and the order line is T11. Warning: @SECTION is INNER-joined, so stock whose project has no matching section is silently dropped.",
    tables: [
      ["t0", "T0 · OWOR\n[HEADER]"],
      ["t1", "T1 · OINM\n[INVENTORY MOVEMENTS]"],
      ["t11", "T11 · WOR1\n[LINE]"],
      ["t2", "T2 · OITM\n[ITEM]"],
      ["t3", "T3 · OITB\n[GROUP]"],
      ["t5", "T5 · OPRJ\n[PROJECT]"],
      ["t9", "T9 · @SECTION\n[SECTION]", "INNER: no section → row dropped"],
    ],
    joins: [
      ["t0", "t1", "INNER · AppObjAbs = DocEntry"],
      ["t1", "t11", "INNER · DocEntry + AppObjLine"],
      ["t1", "t2", "INNER · ItemCode"],
      ["t2", "t3", "LEFT · ItmsGrpCod"],
      ["t11", "t5", "LEFT · project"],
      ["t11", "t9", "INNER · project + U_Section"],
    ],
    rowsFrom: "t1",
    output: "COGS = ±OpenValue\nQuantity = OutQty − InQty",
  }),
};

// The breakdown overview: every block, grouped by the AREA it writes, into the
// view. Blocks are declared by AREA so dagre keeps each group together. The
// Type code sits in the note, not on the edge — a dozen edge labels pile up
// where the lines converge.
const BLOCK_OVERVIEW = [
  // [slug, label, source tables, what's special, area, type]
  ["jb-ar-invoices",       "1 · A/R Invoices",           "OINV + INV1",            "",                "INVOICES",  "INV"],
  ["jb-ar-credit-notes",   "3 · A/R Credit Notes",       "ORIN + RIN1",            "negated",         "INVOICES",  "CRE"],
  ["jb-legacy-invoices",   "11 · Legacy Invoices",       "PT_RPC_InvoicedHistory", "",                "INVOICES",  "INV"],
  ["jb-deliveries",        "2 · Deliveries",             "ODLN + DLN1",            "",                "JOB COSTS", "DLN"],
  ["jb-ap-invoices",       "4 · A/P Invoices",           "OPCH + PCH1",            "non-stock",       "JOB COSTS", "AP"],
  ["jb-journal-entries",   "5 · Manual Journal Entries", "OJDT + JDT1",            "Debit − Credit",  "JOB COSTS", "AP"],
  ["jb-ap-credit-notes",   "6 · A/P Credit Notes",       "ORPC + RPC1",            "negated",         "JOB COSTS", "AP"],
  ["jb-production-labour", "7 · Production Labour",      "OWOR + WOR1",            "qty × rate",      "JOB COSTS", "LAB"],
  ["jb-production-stock",  "12 · Production Stock",      "OWOR + OINM",            "OpenValue",       "JOB COSTS", "DLN"],
  ["jb-legacy-purchases",  "8 · Legacy Purchases",       "PT_RPCJobHistoryIDR",    "",                "JOB COSTS", "AP"],
  ["jb-legacy-labour",     "9 · Legacy Labour",          "PT_RPCJobHistoryIDR",    "",                "JOB COSTS", "LAB"],
  ["jb-legacy-materials",  "10 · Legacy Materials",      "PT_RPCJobHistoryIDR",    "",                "JOB COSTS", "AP"],
];

const AREA_NODE = { INVOICES: "area-invoices", "JOB COSTS": "area-job-costs" };

const jobBreakdownOverview = {
  title: "RPC_JobBreakdown — 12 Blocks",
  doc: "A UNION ALL of 12 SELECT blocks, each returning the same 29 columns. Income blocks write AREA 'INVOICES'; cost blocks write 'JOB COSTS'. Click a block for its joins and filter.",
  dir: "LR",
  nodes: [
    ...BLOCK_OVERVIEW.map(([slug, label, tables, special, , type]) => ({
      id: slug,
      label,
      note: `${tables}\nType '${type}'${special ? ` · ${special}` : ""}`,
      kind: "document",
      href: `/process/${slug}`,
    })),
    { id: "area-invoices",  kind: "view",   label: "AREA 'INVOICES'",  note: "revenue · COGS = 0" },
    { id: "area-job-costs", kind: "view",   label: "AREA 'JOB COSTS'", note: "cost in COGS" },
    { id: "view",           kind: "output", label: "RPC_JobBreakdown (VIEW)", note: "UNION ALL · 29 columns" },
  ],
  edges: [
    ...BLOCK_OVERVIEW.map(([slug, , , , area]) => ({ source: slug, target: AREA_NODE[area] })),
    { source: "area-invoices",  target: "view" },
    { source: "area-job-costs", target: "view" },
  ],
};

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
      { id: "job-breakdown",    label: "RPC_JobBreakdown (VIEW)", kind: "view",     href: "/process/job-breakdown" },

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

  // ---------- RPC_JobBreakdown DETAIL (built above) ----------
  "job-breakdown": jobBreakdownOverview,
  ...jobBreakdownBlocks,

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