// data/rpcProcess.js
//
// RPC's operational process, consolidated into the main page (`root`).
//
// Source: RPC's draw.io process drawing, corrected to match the RPC_JobBreakdown
// SQL (the block pages in diagrams.js):
//   - No Purchase Order → RPC_JobBreakdown line: no block reads OPOR/POR1. The
//     view's PO column is the document's own NumAtCard reference text.
//   - The drawing's Journal Entry and AP Invoice lines into the view are already
//     on root as Manual Journal Entry (block 5, TransType 30 only) and AP Invoice
//     (block 4, non-stock lines only).
// The drawing's SAP boxes map onto root's existing nodes instead of being drawn
// twice. Steps done outside SAP carry `scope: "outside"`.
//
// Detail text is the drawing's own wording plus facts from the view's SQL —
// nothing else. Root's SAP nodes get their detail body from the page they
// open, so it is never written twice.

export const ROOT_VIEWS = [
  { id: "all", label: "All" },
  { id: "sap", label: "Inside SAP B1" },
  { id: "outside", label: "Outside SAP B1" },
];

const ROOT_DOC =
  "RPC's flow end to end: the steps done outside SAP (email, the storeman's Excel, the labour website), the SAP Business One documents they become, RPC_JobBreakdown, and the reports built on it. A node's note names the view block that reads it. Click any node for details.";

const outside = (id, label, note, detail, kind = "human") => ({
  id,
  label,
  note,
  kind,
  scope: "outside",
  detail,
});

const PROCESS_NODES = [
  outside("customer-po", "Customer PO", "email exchange", {
    who: "The customer, by email.",
    where: "Email.",
    sap: "Finance enters it as a Sales Order (ORDR / RDR1).",
  }),
  outside("request-material", "Request for Material", "email · personnel → purchasing", {
    who: "Personnel, to purchasing.",
    where: "Email.",
    sap: "Becomes a Purchase Order once verified and authorised.",
  }),
  outside("verify-authorize", "Verify & Authorise", "storeman check · GM approves", {
    who: "Purchasing verifies with the storeman; the general manager authorises.",
    sap: "Purchasing then enters the Purchase Order (OPOR / POR1) and tags the project.",
  }),
  // The physical steps, grouped into their own band by lib/scopeView.js.
  {
    id: "material-arrives",
    label: "Material Arrives\nin Stores",
    kind: "human",
    scope: "shopfloor",
    detail: {
      where: "The goods physically arriving at the store.",
      sap: "No Goods Receipt PO is created: the AP Invoice is what raises the item quantity.",
    },
  },
  outside("record-material-in", "Record Material In", "storeman's Excel", {
    who: "The storeman.",
    where: "The storeman's own Excel record.",
    sap: "No Goods Receipt PO: the AP Invoice raises the item quantity.",
    risk: "The receipt itself is recorded only in that Excel file.",
  }),
  outside("record-material-out", "Record Material Out", "for a project or expired", {
    who: "The storeman, when material goes to a project or has expired.",
    sap: "It feeds the Productivity Summary; from there a production clerk enters it weekly — not per project — on a Production Order, adding the project and section.",
    view: "Material cost reaches the view only once it is issued against a production order: block 12 reads those issues from OINM. AP Invoice stock lines are excluded (block 4).",
    risk: "Material recorded out but never issued to a production order — expired stock included — doesn't reach RPC_JobBreakdown. Block 12 INNER-joins @SECTION, so a row whose project + section has no match is silently dropped.",
  }),
  {
    id: "shop-floor-work",
    label: "Work on the\nShop Floor",
    kind: "human",
    scope: "shopfloor",
    detail: {
      where: "The work itself — nothing is recorded at this step.",
      sap: "It reaches SAP two ways: as labour hours keyed onto a Production Order, and as the engineer's completion report that Finance turns into an AR Invoice. The material it consumes is recorded out of the store.",
    },
  },
  outside("labour-website", "Labour-hours Website", "team leader · RPC's own server", {
    who: "The team leader, entering their own hours and their team members'.",
    where: "A website hosted on RPC's own server.",
    sap: "Hours go into the Productivity Summary, and from there onto a Production Order as labour items (ItemCode LIKE 'LAB%'), each with a fixed price in the item master: U_Direct and U_OverHead.",
    view: "Block 7: COGS = issued quantity × U_Direct; OverHeadCost = issued quantity × U_OverHead.",
    risk: "Block 7 INNER-joins @SECTION, so labour on a project with no matching section is silently dropped.",
  }),
  outside("engineer-completion-report", "Engineer Completion Report", "when the work is done", {
    who: "The engineer, when the work is complete.",
    sap: "The engineer's commercial invoice is raised from it.",
  }),
  outside("engineer-ci", "Engineer Commercial Invoice", "when claiming an invoice", {
    who: "The engineer, when they want to claim an invoice.",
    where: "The engineer's own commercial invoice.",
    sap: "Finance enters an AR Invoice (OINV / INV1) from it.",
    view: "Block 1: revenue; cancelled invoices are excluded.",
  }),
  outside("sent-to-customer", "Sent to Customer", null, {
    where: "Delivery is entered on the AP and AR invoices.",
    sap: "No Delivery document is created, so block 2 has nothing to read for this step.",
  }),
  outside(
    "productivity-summary",
    "Productivity Summary",
    null,
    {
      body: "Where the week's work meets: the storeman's material-in and material-out records, the hours from the labour website, and the engineer's completion report. The production clerk keys the weekly Production Order from it.",
      view: "Not read by RPC_JobBreakdown itself — its figures reach the view through the Production Order the clerk enters from it (blocks 7 and 12).",
    },
    "output"
  ),

  // Reports inside SAP, built from what's consolidated.
  {
    id: "crystal-report",
    label: "Crystal Report\nJob Costing",
    note: "line + summary",
    kind: "output",
    detail: {
      body: "Job costing report — line detail and summary — built on RPC_JobBreakdown.",
    },
  },
  {
    id: "cash-flow-report",
    label: "Cash Flow Report",
    kind: "output",
    detail: {
      body: "Built from journal entries: manual ones, the automatic postings documents make, and payments.",
      view: "Only manual journal entries (TransType 30) reach RPC_JobBreakdown; automatic postings and payments don't.",
    },
  },
];

const PROCESS_EDGES = [
  // Outside SAP → the SAP document it becomes.
  { source: "customer-po",         target: "sales-order" },
  { source: "request-material",    target: "verify-authorize" },
  { source: "verify-authorize",    target: "purchase-order" },
  { source: "engineer-ci",         target: "ar-invoice" },

  // Material: the goods turn up, and the storeman records them in, then out.
  { source: "purchase-order",      target: "material-arrives" },
  { source: "material-arrives",    target: "record-material-in" },

  // The shop floor: hours to the website, the completion report to the
  // engineer's invoice, and the material it consumes recorded out of the store.
  { source: "shop-floor-work",     target: "labour-website", label: "hours" },
  { source: "shop-floor-work",     target: "engineer-completion-report" },
  { source: "shop-floor-work",     target: "record-material-out" },
  { source: "engineer-completion-report", target: "engineer-ci" },

  { source: "ar-invoice",          target: "sent-to-customer" },

  // Everything the week produced meets in the Productivity Summary, and the
  // clerk keys the Production Order from it — the only process line into that
  // order (the project + section line below is a dimension, not a flow).
  { source: "record-material-in",  target: "productivity-summary" },
  { source: "record-material-out", target: "productivity-summary" },
  { source: "labour-website",      target: "productivity-summary" },
  { source: "engineer-completion-report", target: "productivity-summary" },
  { source: "productivity-summary", target: "production-order", label: "weekly · clerk adds project + section" },

  // Reports.
  { source: "job-breakdown",       target: "crystal-report" },
  { source: "journal-entry",       target: "cash-flow-report" },

  // The project + section dimension is applied TO the documents. The drawing
  // drew it the other way (Sales Order → "tied to project"), but the project and
  // section aren't always set at the sales order, so the arrows run from the
  // dimension to each document that carries it.
  { source: "project",             target: "sales-order",      label: "project + section" },
  { source: "project",             target: "purchase-order",   label: "project + section" },
  { source: "project",             target: "production-order", label: "project + section" },
  { source: "project",             target: "ar-invoice",       label: "project + section" },
  { source: "project",             target: "ap-invoice",       label: "project + section" },
];

// SAP documents RPC doesn't use are deleted from root, with one exception:
// Delivery stays because block 2 of RPC_JobBreakdown still reads it. It's
// dimmed, tagged, and its lines are dotted (lib/layout.js).
const UNUSED = {
  delivery:
    "RPC's process skips it: delivery is entered on the AP and AR invoices. It stays on the page because block 2 of RPC_JobBreakdown still reads any Delivery documents that exist.",
};

// What the drawing adds to root's existing SAP nodes.
const SAP_DETAILS = {
  "sales-order": { who: "Finance, from the customer's PO." },
  "purchase-order": { who: "Purchasing, after verification; tags the project." },
  "ar-invoice": { who: "Finance, from the engineer's commercial invoice." },
  "ap-invoice": {
    risk: "In RPC's process the AP Invoice raises stock, but block 4 excludes stock lines — that cost reaches the view only when issued to a production order (block 12).",
  },
  project: {
    who: "Projects are created in OPRJ; sections in @SECTION under its @PROJECT header, through a custom form inside SAP B1.",
    sap: "A document carries the project on its header (ORDR / OPOR / OINV / OPCH / OWOR .Project) or on its rows (RDR1 / POR1 / INV1 / PCH1 / WOR1 .Project). The section is only ever on the rows, in U_Section.",
    view: "Blocks 1–4 and 6 read the header project first and fall back to the row; blocks 5, 7 and 12 read the row first and fall back to the header. Both default to 'RPC'. Section is always the row's U_Section, defaulting to 'Unallocated'.",
    risk: "Every OPRJ and @SECTION lookup joins from the ROW. A project typed only on the header still shows its code, but ProjectName comes back as 'No Project'. On production orders @SECTION is INNER-joined, so a row whose project + section has no match is dropped entirely.",
  },
  "production-order": {
    who: "A production clerk, weekly — not per job or project — adding the project and section on each line.",
    sap: "The order's product is a dummy item, PROD-1: RPC doesn't use Bills of Materials. Project and section sit on the WOR1 lines, which is where blocks 7 and 12 read them.",
    view: "Labour: block 7 (LAB% items, issued quantity × U_Direct / U_OverHead). Material: block 12, from the issues' OINM rows.",
    risk: "Blocks 7 and 12 INNER-join @SECTION: a row whose project + section has no match is silently dropped.",
  },
};

const slugOf = (href) =>
  href?.startsWith("/process/") ? href.slice("/process/".length) : null;

/**
 * Merge RPC's process into `diagrams.root`. Mutates and returns `diagrams`.
 * Existing nodes keep their order, so their flow colours don't change.
 */
export function consolidateRoot(diagrams) {
  const root = diagrams.root;
  root.doc = ROOT_DOC;
  root.views = ROOT_VIEWS;
  root.nodes = [
    ...root.nodes.map((n) => ({
      ...n,
      ...(UNUSED[n.id] ? { unused: UNUSED[n.id] } : null),
      detail: {
        body: diagrams[slugOf(n.href)]?.doc,
        ...SAP_DETAILS[n.id],
        ...n.detail,
      },
    })),
    ...PROCESS_NODES,
  ];
  root.edges = [...root.edges, ...PROCESS_EDGES];
  return diagrams;
}
