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
  outside("receive-material", "Receive Material In", "storeman's Excel", {
    who: "The storeman.",
    where: "The storeman's own Excel record.",
    sap: "No Goods Receipt PO: the AP Invoice raises the item quantity.",
    risk: "The receipt itself is recorded only in that Excel file.",
  }),
  outside("record-material-out", "Record Material Out", "for a project or expired", {
    who: "The storeman, when material goes to a project or has expired.",
    sap: "A production clerk enters it weekly — not per project — on a Production Order, adding the project and section.",
    view: "Material cost reaches the view only once it is issued against a production order: block 12 reads those issues from OINM. AP Invoice stock lines are excluded (block 4).",
    risk: "Material recorded out but never issued to a production order — expired stock included — doesn't reach RPC_JobBreakdown. Block 12 INNER-joins @SECTION, so a row whose project + section has no match is silently dropped.",
  }),
  outside("labour-website", "Labour-hours Website", "team leader · RPC's own server", {
    who: "The team leader.",
    where: "A website hosted on RPC's own server.",
    sap: "Hours become labour items on a Production Order (ItemCode LIKE 'LAB%'), each with a fixed price in the item master: U_Direct and U_OverHead.",
    view: "Block 7: COGS = issued quantity × U_Direct; OverHeadCost = issued quantity × U_OverHead.",
    risk: "Block 7 INNER-joins @SECTION, so labour on a project with no matching section is silently dropped.",
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
      body: "Built from the storeman's material-out records and the labour-hours website.",
      view: "Not read by RPC_JobBreakdown.",
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
  { source: "labour-website",      target: "production-order", label: "labour items" },
  { source: "record-material-out", target: "production-order", label: "weekly · clerk adds project + section" },

  // Material and invoicing chains.
  { source: "purchase-order",      target: "receive-material" },
  { source: "receive-material",    target: "record-material-out" },
  { source: "ar-invoice",          target: "sent-to-customer" },

  // Reports.
  { source: "record-material-out", target: "productivity-summary" },
  { source: "labour-website",      target: "productivity-summary" },
  { source: "job-breakdown",       target: "crystal-report" },
  { source: "journal-entry",       target: "cash-flow-report" },

  // SAP links the drawing adds.
  { source: "sales-order",         target: "project", label: "tied to project" },
  { source: "purchase-order",      target: "project", label: "tags project" },
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
