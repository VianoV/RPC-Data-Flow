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
//     lineage?: { columns },  // adds a "Columns" view: which source column feeds
//                             // each output column (data/jobBreakdownColumns.js).
//                             // `from` refs use this diagram's table node ids.
//     views?: [{ id, label }], // a view switch; views[0] is the default. `root`
//                             // uses all / sap / outside (see lib/scopeView.js).
//     nodes: [{
//       id:    string,        // unique WITHIN this diagram
//       label: string,        // "\n" renders as a real line break
//       kind?: "human" | "document" | "table" | "view" | "output",
//                             // drives the node's accent colour; omit for neutral
//       href?: string,        // opens "/process/<key>"; with `detail`, via the island
//       note?: string,        // optional smaller detail line under the label
//       scope?: "sap" | "outside", // "outside" = a step done outside SAP B1
//       unused?: string,      // SAP document RPC's process doesn't use, and why
//       detail?: { body, who, where, sap, view, risk },
//                             // floating island shown when the node is clicked
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
// Legacy table names follow the view SQL (RPC_JobBreakdown_detailed.md):
// PT_RPCJobHistoryIDR feeds blocks 8–10, PT_RPC_InvoicedHistory block 11.

import { blockColumns } from "./jobBreakdownColumns.js";
import { consolidateRoot } from "./rpcProcess.js";

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

const jobBreakdownJoins = {
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

// Every block page also gets its column lineage (the "Columns" view).
const jobBreakdownBlocks = Object.fromEntries(
  Object.entries(jobBreakdownJoins).map(([slug, page]) => [
    slug,
    { ...page, lineage: { columns: blockColumns[slug] } },
  ])
);

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
    doc: "SAP Business One document flow. A node's note names the view block that reads it. Click the view for its 12-block breakdown.",
    // Only a document or table the view's SQL actually reads connects to
    // job-breakdown (see RPC_JobBreakdown_detailed.md). Automatic journal
    // entries are not drawn: each posting document's `doc` mentions its journal
    // instead (the view ignores them — block 5 takes TransType 30 only). Legacy
    // history (blocks 8–11) is shown only on the job-breakdown page.
    nodes: [
      // Only documents RPC uses. The one exception is Delivery: RPC doesn't
      // create them, but block 2 reads ODLN, so it stays (marked unused in
      // data/rpcProcess.js).

      // Sales
      { id: "sales-order",        label: "Sales Order",        kind: "document", href: "/process/sales-order" },
      { id: "delivery",           label: "Delivery",           kind: "document", href: "/process/delivery",       note: "Block 2 · DLN" },
      { id: "ar-invoice",         label: "AR Invoice",         kind: "document", href: "/process/ar-invoice",     note: "Block 1 · INV" },
      { id: "ar-credit-note",     label: "AR Credit Note",     kind: "document", href: "/process/ar-credit-note", note: "Block 3 · CRE (negated)" },
      { id: "incoming-payment",   label: "Incoming Payment",   kind: "document", href: "/process/incoming-payment" },

      // Purchasing
      { id: "purchase-order",     label: "Purchase Order",     kind: "document", href: "/process/purchase-order" },
      { id: "ap-invoice",         label: "AP Invoice",         kind: "document", href: "/process/ap-invoice",     note: "Block 4 · AP (non-stock)" },
      { id: "ap-credit-note",     label: "AP Credit Note",     kind: "document", href: "/process/ap-credit-note", note: "Block 6 · AP (negated)" },
      { id: "outgoing-payment",   label: "Outgoing Payment",   kind: "document", href: "/process/outgoing-payment" },

      // Production
      { id: "production-order",   label: "Production Order",   kind: "document", href: "/process/production-order", note: "Block 7 · LAB (labour)" },
      { id: "goods-issue",        label: "Goods Issue",        kind: "document", href: "/process/goods-issue" },
      { id: "goods-receipt",      label: "Goods Receipt",      kind: "document", href: "/process/goods-receipt" },
      { id: "inventory-movements",label: "Inventory Movements",kind: "table",    href: "/process/inventory-movements", note: "OINM · Block 12 · DLN (stock)" },

      // Financials
      { id: "journal-entry",      label: "Manual Journal Entry", kind: "document", href: "/process/journal-entry", note: "Block 5 · AP" },

      // Master data (looked up by the blocks)
      { id: "items",              label: "Items",              kind: "table", href: "/process/items",             note: "lookup · OITM / OITB" },
      { id: "project",            label: "Project",            kind: "table", href: "/process/project",           note: "OPRJ + @SECTION · header or rows" },
      { id: "business-partners",  label: "Business Partners",  kind: "table", href: "/process/business-partners", note: "lookup · OCRD" },

      { id: "job-breakdown",      label: "RPC_JobBreakdown (VIEW)", kind: "view", href: "/process/job-breakdown", note: "12 blocks · 29 columns" },
    ],
    edges: [
      // Sales: order → invoice → credit. RPC raises the AR Invoice straight from
      // the Sales Order; the route through Delivery is the standard SAP one,
      // drawn dotted because RPC creates no Deliveries (block 2 still reads them).
      { source: "sales-order",        target: "ar-invoice" },
      { source: "sales-order",        target: "delivery" },
      { source: "delivery",           target: "ar-invoice" },
      { source: "ar-invoice",         target: "ar-credit-note" },
      { source: "ar-invoice",         target: "incoming-payment" },
      { source: "delivery",           target: "job-breakdown" },
      { source: "ar-invoice",         target: "job-breakdown" },
      { source: "ar-credit-note",     target: "job-breakdown" },

      // Purchasing: order → invoice (the supplier's bill closes the PO) → credit
      { source: "purchase-order",     target: "ap-invoice" },
      { source: "ap-invoice",         target: "ap-credit-note" },
      { source: "ap-invoice",         target: "outgoing-payment" },
      { source: "ap-invoice",         target: "job-breakdown" },
      { source: "ap-credit-note",     target: "job-breakdown" },

      // Production: labour is read from the order itself; material cost from
      // the inventory movements its issues and receipts write.
      { source: "production-order",   target: "goods-issue",   label: "Issue for Production" },
      { source: "production-order",   target: "goods-receipt", label: "Receipt from Production" },
      { source: "goods-issue",        target: "inventory-movements" },
      { source: "goods-receipt",      target: "inventory-movements" },
      { source: "production-order",   target: "job-breakdown" },
      { source: "inventory-movements",target: "job-breakdown" },

      { source: "journal-entry",      target: "job-breakdown" },

      { source: "items",              target: "job-breakdown" },
      { source: "project",            target: "job-breakdown" },
      { source: "business-partners",  target: "job-breakdown" },
    ],
  },

  // ---------- FEEDER PROCESS PAGES ----------
  "ar-invoice": {
    title: "AR Invoice",
    doc: "Standard SAP B1 A/R Invoice. OINV holds the document header; INV1 holds the line rows that feed job revenue into RPC_JobBreakdown. Posts an automatic journal entry (TransType 13), which the view doesn't read.",
    nodes: [
      { id: "oinv", kind: "table", label: "OINV\n[HEADER]", note: "Project (header) · read first" },
      { id: "inv1", kind: "table", label: "INV1\n[ROW]", note: "Project + U_Section (rows)\nlookups join here" },
    ],
    edges: [{ source: "oinv", target: "inv1" }],
  },

  "ap-invoice": {
    title: "AP Invoice",
    doc: "A/P Invoice. OPCH is the header, PCH1 the rows — supplier costs attributed to a job. Posts an automatic journal entry (TransType 18), which the view doesn't read.",
    nodes: [
      { id: "opch", kind: "table", label: "OPCH\n[HEADER]", note: "Project (header) · read first" },
      { id: "pch1", kind: "table", label: "PCH1\n[ROW]", note: "Project + U_Section (rows)\nlookups join here" },
    ],
    edges: [{ source: "opch", target: "pch1" }],
  },

  "ar-credit-note": {
    title: "AR Credit Note",
    doc: "A/R Credit Note reversing customer revenue. ORIN header, RIN1 rows. Posts an automatic journal entry (TransType 14), which the view doesn't read.",
    nodes: [
      { id: "orin", kind: "table", label: "ORIN\n[HEADER]" },
      { id: "rin1", kind: "table", label: "RIN1\n[ROW]" },
    ],
    edges: [{ source: "orin", target: "rin1" }],
  },

  "ap-credit-note": {
    title: "AP Credit Note",
    doc: "A/P Credit Note reversing supplier cost. ORPC header, RPC1 rows. Posts an automatic journal entry (TransType 19), which the view doesn't read.",
    nodes: [
      { id: "orpc", kind: "table", label: "ORPC\n[HEADER]" },
      { id: "rpc1", kind: "table", label: "RPC1\n[ROW]" },
    ],
    edges: [{ source: "orpc", target: "rpc1" }],
  },

  "production-order": {
    title: "Production Order",
    doc: "Production Order. OWOR header, WOR1 component/line rows. The product is the dummy item PROD-1 — RPC doesn't use Bills of Materials — and orders are entered weekly, not per job. Closing the order posts an automatic journal entry for any variance (TransType 202), which the view doesn't read.",
    nodes: [
      { id: "owor", kind: "table", label: "OWOR\n[HEADER]", note: "Project (header) · fallback" },
      { id: "wor1", kind: "table", label: "WOR1\n[ROW]", note: "Project + U_Section (rows)\nread first · @SECTION INNER" },
    ],
    edges: [{ source: "owor", target: "wor1" }],
  },

  delivery: {
    title: "Delivery",
    doc: "Delivery document. ODLN header, DLN1 rows. Posts an automatic journal entry for stock items (TransType 15), which the view doesn't read.",
    nodes: [
      { id: "odln", kind: "table", label: "ODLN\n[HEADER]" },
      { id: "dln1", kind: "table", label: "DLN1\n[ROW]" },
    ],
    edges: [{ source: "odln", target: "dln1" }],
  },

  "goods-receipt": {
    title: "Goods Receipt",
    doc: "Goods Receipt (inventory in). OIGN header, IGN1 rows. Receipt from Production is stored here too, and writes the OINM rows block 12 reads. Posts an automatic journal entry (TransType 59), which the view doesn't read.",
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
    title: "Project + Section",
    dir: "LR",
    doc: "Projects are created in OPRJ; sections live in @SECTION under its @PROJECT header, maintained through a custom form inside SAP B1. A document carries the project on its header or on its rows — the section only on its rows. Which one RPC_JobBreakdown reads depends on the block, and every OPRJ / @SECTION lookup joins from the row.",
    nodes: [
      { id: "form",        kind: "human",    label: "Project & Section Form", note: "custom SAP B1 screen" },
      { id: "oprj",        kind: "table",    label: "OPRJ\n[SAP PROJECTS]", note: "PrjCode · PrjName" },
      { id: "project-udo", kind: "table",    label: "@PROJECT\n[HEADER UDO]" },
      {
        id: "section-udt", kind: "table",    label: "@SECTION\n[SECTION ROWS]",
        note: "one row per section of a project",
        detail: {
          sap: "A user-defined table of sections, keyed by project + section code, under the @PROJECT header UDO.",
          view: "Joined as T6 (or T9) on project + U_Section; SectionName is its U_Name.",
          risk: "Section is row-only — no document has a header section field. An empty U_Section becomes 'Unallocated'.",
        },
      },
      {
        id: "doc-header",  kind: "document", label: "Document HEADER\nProject",
        note: "ORDR · OPOR · OINV · OPCH · OWOR",
        detail: {
          view: "Blocks 1–4 and 6 read the header's Project first, falling back to the row, then to 'RPC'. Blocks 5, 7 and 12 use it only when the row is empty.",
          risk: "The OPRJ lookup joins from the ROW, so a project typed only here keeps its code but comes back as ProjectName 'No Project'.",
        },
      },
      {
        id: "doc-row",     kind: "document", label: "Document ROWS\nProject + U_Section",
        note: "RDR1 · POR1 · INV1 · PCH1 · WOR1",
        detail: {
          sap: "The project sits on the row, and the section in U_Section on that same row.",
          view: "Blocks 5, 7 and 12 read it first. Every OPRJ and @SECTION lookup joins from here, in every block.",
          risk: "Blocks 7 and 12 join @SECTION INNER, so a production row whose project + section has no match is dropped entirely.",
        },
      },
      { id: "view",        kind: "view",     label: "RPC_JobBreakdown (VIEW)", href: "/process/job-breakdown", note: "12 blocks · 29 columns" },
    ],
    edges: [
      { source: "form",        target: "project-udo", label: "maintains" },
      { source: "project-udo", target: "section-udt", label: "sections under the project" },
      { source: "oprj",        target: "project-udo", label: "project code" },
      { source: "oprj",        target: "doc-header",  label: "project code" },
      { source: "oprj",        target: "doc-row",     label: "project code" },
      { source: "section-udt", target: "doc-row",     label: "section code" },
      { source: "doc-header",  target: "view",        label: "read first by blocks 1–4, 6" },
      { source: "doc-row",     target: "view",        label: "read first by 5, 7, 12 · all lookups" },
    ],
  },

  "business-partners": {
    title: "Business Partners",
    doc: "Business partner master data. OCRD holds customers and suppliers; block 11 looks up CardName here for legacy invoices. SAP documents carry CardCode/CardName on their own headers.",
    nodes: [{ id: "ocrd", kind: "table", label: "OCRD\n[BUSINESS PARTNERS]" }],
    edges: [],
  },

  "inventory-movements": {
    title: "Inventory Movements",
    doc: "OINM is the inventory audit ledger SAP writes automatically for every stock movement. Issues and receipts for a production order carry AppObjAbs/AppObjLine pointing at the order line, which is how block 12 costs materials (OpenValue, sign-flipped for returns).",
    nodes: [
      { id: "oige", kind: "table", label: "OIGE / IGE1\n[ISSUE FOR PRODUCTION]" },
      { id: "oign", kind: "table", label: "OIGN / IGN1\n[RECEIPT FROM PRODUCTION]" },
      { id: "oinm", kind: "table", label: "OINM\n[INVENTORY MOVEMENTS]", note: "AppObjAbs = OWOR.DocEntry" },
    ],
    edges: [
      { source: "oige", target: "oinm", label: "OutQty" },
      { source: "oign", target: "oinm", label: "InQty" },
    ],
  },

  "journal-entry": {
    title: "Manual Journal Entry",
    doc: "Journal entry keyed on TransId. The view only reads manual entries (TransType 30) whose lines carry a Project and U_CostCode — block 5. The journals SAP posts automatically for documents (TransType = the source object type, BaseRef = its DocNum) share these tables but are excluded.",
    nodes: [
      { id: "ojdt", kind: "table", label: "OJDT\n[HEADER]" },
      { id: "jdt1", kind: "table", label: "JDT1\n[ROW]" },
    ],
    edges: [{ source: "ojdt", target: "jdt1", label: "TransId" }],
  },

  // ---------- RPC_JobBreakdown DETAIL (built above) ----------
  // Legacy history (PT_RPCJobHistoryIDR, PT_RPC_InvoicedHistory) is shown only
  // here, as blocks 8–11 — never on the main page.
  "job-breakdown": jobBreakdownOverview,
  ...jobBreakdownBlocks,

  // ---------- SAP B1 DOCUMENT PAGES (upstream of the view's sources) ----------
  "sales-order": {
    title: "Sales Order",
    doc: "Sales Order confirming a customer's order. ORDR header, RDR1 rows.",
    nodes: [
      { id: "ordr", kind: "table", label: "ORDR\n[HEADER]", note: "Project (header)" },
      { id: "rdr1", kind: "table", label: "RDR1\n[ROW]", note: "Project + U_Section (rows)" },
    ],
    edges: [{ source: "ordr", target: "rdr1" }],
  },

  "incoming-payment": {
    title: "Incoming Payment",
    doc: "Customer payment. ORCT is the payment header; RCT2 lists the A/R Invoices (and credit memos) the payment is applied to. Posts an automatic journal entry (TransType 24), which the view doesn't read.",
    nodes: [
      { id: "orct", kind: "table", label: "ORCT\n[HEADER]" },
      { id: "rct2", kind: "table", label: "RCT2\n[PAID INVOICES]" },
    ],
    edges: [{ source: "orct", target: "rct2" }],
  },

  "purchase-order": {
    title: "Purchase Order",
    doc: "Purchase Order sent to a supplier. OPOR header, POR1 rows — closed by the supplier's AP Invoice. The view reads neither table; the project and section it carries reach RPC_JobBreakdown through the AP Invoice.",
    nodes: [
      { id: "opor", kind: "table", label: "OPOR\n[HEADER]", note: "Project (header)" },
      { id: "por1", kind: "table", label: "POR1\n[ROW]", note: "Project + U_Section (rows)" },
    ],
    edges: [{ source: "opor", target: "por1" }],
  },

  "outgoing-payment": {
    title: "Outgoing Payment",
    doc: "Payment to a supplier. OVPM is the payment header; VPM2 lists the A/P Invoices (and credit memos) the payment is applied to. Posts an automatic journal entry (TransType 46), which the view doesn't read.",
    nodes: [
      { id: "ovpm", kind: "table", label: "OVPM\n[HEADER]" },
      { id: "vpm2", kind: "table", label: "VPM2\n[PAID INVOICES]" },
    ],
    edges: [{ source: "ovpm", target: "vpm2" }],
  },

  "goods-issue": {
    title: "Goods Issue",
    doc: "Goods Issue (inventory out). OIGE header, IGE1 rows. Issue for Production is also stored here, with rows linked to the Production Order. Posts an automatic journal entry (TransType 60), which the view doesn't read.",
    nodes: [
      { id: "oige", kind: "table", label: "OIGE\n[HEADER]" },
      { id: "ige1", kind: "table", label: "IGE1\n[ROW]" },
    ],
    edges: [{ source: "oige", target: "ige1" }],
  },
};

// The main page also shows RPC's process outside SAP, and every root node gets
// its detail island. Runs last: SAP nodes take their text from the pages above.
consolidateRoot(diagrams);