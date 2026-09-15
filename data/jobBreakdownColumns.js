// data/jobBreakdownColumns.js
//
// Column lineage for every RPC_JobBreakdown block: how each of the view's 29
// output columns is produced, and which source columns feed it. Transcribed
// from RPC_JobBreakdown_detailed.md — expressions the reference abbreviates
// (`CASE …`) stay abbreviated.
//
//   column = {
//     how:      "typed" | "read" | "calc" | "fallback" | "lookup",
//     expr:     string,             // the SELECT expression
//     from?:    ["t1.LineTotal"],   // <table id>.<column>; table ids match the
//                                   // block's joins diagram (t0, t1, t5, t11 …)
//     negated?: true,               // sign-flipped (credit blocks)
//   }
//
// "typed" columns are constants and have no `from`; every other column has at
// least one source. The reference's "Read with fallback", "Chosen by fallback"
// and "Rule" all map to "fallback".

export const COLUMN_ORDER = [
  "AREA", "Type", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal",
  "DocTotal1000", "Project", "ProjectName", "LineNum", "ItemCode",
  "Description", "LineTotal", "LineTotal1000", "COGS", "Quantity", "CostCode",
  "CostCodeName", "Section", "SectionName", "SummaryType", "PO",
  "OverHeadCost", "DepartmentalCost", "ForeignAmt", "Currency", "SysAmt",
  "SysRate",
];

const typed = (expr) => ({ how: "typed", expr });
const read = (expr, ...from) => ({ how: "read", expr, from });
const calc = (expr, ...from) => ({ how: "calc", expr, from });
const fallback = (expr, ...from) => ({ how: "fallback", expr, from });
const lookup = (expr, ...from) => ({ how: "lookup", expr, from });
const negated = (column) => ({ ...column, negated: true });

// ---------- Document blocks (1–4, 6): header T0 + line T1 + lookups ----------

// Block 1's derivation; blocks 2, 3, 4 and 6 read the same column names from
// their own header/line tables and only override what differs.
function documentColumns({ area, type }) {
  return {
    AREA: typed(`'${area}'`),
    Type: typed(`'${type}'`),
    DocNum: read("T0.DocNum", "t0.DocNum"),
    DocDate: read("T0.DocDate", "t0.DocDate"),
    CardCode: read("T0.CardCode", "t0.CardCode"),
    CardName: read("T0.CardName", "t0.CardName"),
    DocTotal: read("T0.DocTotal", "t0.DocTotal"),
    DocTotal1000: calc("T0.DocTotal/1000", "t0.DocTotal"),
    Project: fallback("ISNULL(ISNULL(T0.Project,T1.Project),'RPC')", "t0.Project", "t1.Project"),
    ProjectName: lookup("ISNULL(T5.PrjName,'No Project')", "t5.PrjName"),
    LineNum: calc("T1.LineNum+1", "t1.LineNum"),
    ItemCode: fallback("ISNULL(T1.ItemCode,'Service')", "t1.ItemCode"),
    Description: fallback("ISNULL(T1.Dscription,'Service')", "t1.Dscription"),
    LineTotal: calc("T1.LineTotal - T1.LineTotal*(T0.DiscPrcnt/100)", "t1.LineTotal", "t0.DiscPrcnt"),
    LineTotal1000: calc("T1.LineTotal/1000 - …", "t1.LineTotal", "t0.DiscPrcnt"),
    COGS: typed("0"),
    Quantity: fallback("ISNULL(T1.Quantity,0)", "t1.Quantity"),
    CostCode: fallback("CASE … U_CostCode … LEFT(ItmsGrpNam,3) …", "t1.U_CostCode", "t3.ItmsGrpNam"),
    CostCodeName: lookup("ISNULL(ISNULL(T3.ItmsGrpNam,T4.ItmsGrpNam),'UnAllocated')", "t3.ItmsGrpNam", "t4.ItmsGrpNam"),
    Section: fallback("ISNULL(T1.U_Section,'Unallocated')", "t1.U_Section"),
    SectionName: lookup("ISNULL(T6.U_Name,'')", "t6.U_Name"),
    SummaryType: fallback("CASE on cost code + DocType", "t3.ItmsGrpNam", "t0.DocType"),
    PO: fallback("CAST(ISNULL(T0.NumAtCard,'') AS NVARCHAR(100))", "t0.NumAtCard"),
    OverHeadCost: typed("0"),
    DepartmentalCost: typed("0"),
    ForeignAmt: read("T0.TotalFrgn", "t0.TotalFrgn"),
    Currency: read("T0.DocCur", "t0.DocCur"),
    SysAmt: read("T0.TotalSumSy", "t0.TotalSumSy"),
    SysRate: read("T0.SysRate", "t0.SysRate"),
  };
}

// Block 4: supplier cost goes into COGS.
function apColumns() {
  return {
    ...documentColumns({ area: "JOB COSTS", type: "AP" }),
    LineTotal1000: typed("0"),
    COGS: calc("T1.LineTotal - T1.LineTotal*(T0.DiscPrcnt/100)", "t1.LineTotal", "t0.DiscPrcnt"),
    SummaryType: fallback("CASE: 3%&I→Purchased (twice); 1%→Direct Labour; else Purchased", "t3.ItmsGrpNam", "t0.DocType"),
  };
}

// ---------- Legacy job-cost blocks (8–10): flat PT_RPCJobHistoryIDR ----------

function legacyColumns({ type }) {
  return {
    AREA: typed("'JOB COSTS'"),
    Type: typed(`'${type}'`),
    DocNum: typed("''"),
    DocDate: read("T0.Date", "t0.Date"),
    CardCode: typed("''"),
    CardName: typed("''"),
    DocTotal: read("T0.Cost", "t0.Cost"),
    DocTotal1000: calc("T0.Cost/1000", "t0.Cost"),
    Project: fallback("ISNULL(T5.PrjCode,T0.[Job Number])", "t5.PrjCode", "t0.[Job Number]"),
    ProjectName: lookup("ISNULL(T5.PrjName,'No Project')", "t5.PrjName"),
    LineNum: typed("1"),
    ItemCode: typed("'Purchase'"),
    Description: read("T0.[Description 2]", "t0.[Description 2]"),
    LineTotal: read("T0.Cost", "t0.Cost"),
    LineTotal1000: typed("0"),
    COGS: read("T0.Cost", "t0.Cost"),
    Quantity: fallback("ISNULL(T0.Quantity,0)", "t0.Quantity"),
    CostCode: read("T0.[Cost Centre]", "t0.[Cost Centre]"),
    CostCodeName: lookup("T4.ItmsGrpNam", "t4.ItmsGrpNam"),
    Section: read("T0.Section", "t0.Section"),
    SectionName: lookup("ISNULL(T6.U_Name,'')", "t6.U_Name"),
    SummaryType: typed("'Purchased'"),
    PO: typed("CAST('' AS NVARCHAR(100))"),
    OverHeadCost: typed("0"),
    DepartmentalCost: typed("0"),
    ForeignAmt: typed("0"),
    Currency: typed("''"),
    SysAmt: typed("0"),
    SysRate: typed("0"),
  };
}

// Columns every production-order / legacy block types as zero or blank.
const NO_CURRENCY = {
  ForeignAmt: typed("0"),
  Currency: typed("''"),
  SysAmt: typed("0"),
  SysRate: typed("0"),
};

// ---------- Per block, keyed by the block page slug ----------

const byBlock = {
  "jb-ar-invoices": documentColumns({ area: "INVOICES", type: "INV" }),

  "jb-deliveries": documentColumns({ area: "JOB COSTS", type: "DLN" }),

  "jb-ar-credit-notes": {
    ...documentColumns({ area: "INVOICES", type: "CRE" }),
    DocTotal: negated(calc("-T0.DocTotal", "t0.DocTotal")),
    DocTotal1000: negated(calc("-T0.DocTotal/1000", "t0.DocTotal")),
    LineTotal: negated(calc("-T1.LineTotal + T1.LineTotal*(T0.DiscPrcnt/100)", "t1.LineTotal", "t0.DiscPrcnt")),
    LineTotal1000: negated(calc("-T1.LineTotal/1000 + …", "t1.LineTotal", "t0.DiscPrcnt")),
    ForeignAmt: negated(read("-T0.TotalFrgn", "t0.TotalFrgn")),
    SysAmt: negated(read("-T0.TotalSumSy", "t0.TotalSumSy")),
  },

  "jb-ap-invoices": apColumns(),

  "jb-journal-entries": {
    AREA: typed("'JOB COSTS'"),
    Type: typed("'AP'"),
    DocNum: read("T0.TransId", "t0.TransId"),
    DocDate: read("T0.RefDate", "t0.RefDate"),
    CardCode: typed("''"),
    CardName: typed("''"),
    DocTotal: calc("ISNULL(T1.Debit,0)-ISNULL(T1.Credit,0)", "t1.Debit", "t1.Credit"),
    DocTotal1000: calc("(Debit-Credit)/1000", "t1.Debit", "t1.Credit"),
    Project: fallback("ISNULL(ISNULL(T1.Project,T0.Project),'RPC')", "t1.Project", "t0.Project"),
    ProjectName: lookup("ISNULL(T5.PrjName,'No Project')", "t5.PrjName"),
    LineNum: calc("T1.Line_ID+1", "t1.Line_ID"),
    ItemCode: typed("'Service'"),
    Description: read("T1.LineMemo", "t1.LineMemo"),
    LineTotal: calc("ISNULL(T1.Debit,0)-ISNULL(T1.Credit,0)", "t1.Debit", "t1.Credit"),
    LineTotal1000: typed("0"),
    COGS: calc("ISNULL(T1.Debit,0)-ISNULL(T1.Credit,0)", "t1.Debit", "t1.Credit"),
    Quantity: typed("0"),
    CostCode: fallback("ISNULL(T1.U_CostCode,'UnAllocated')", "t1.U_CostCode"),
    CostCodeName: fallback("ISNULL(T1.LineMemo,'UnAllocated')", "t1.LineMemo"),
    Section: fallback("ISNULL(T1.U_Section,'Unallocated')", "t1.U_Section"),
    SectionName: lookup("ISNULL(T6.U_Name,'')", "t6.U_Name"),
    SummaryType: fallback("CASE ISNULL(U_CostType,'P') …", "t1.U_CostType"),
    PO: read("T1.Ref1", "t1.Ref1"),
    OverHeadCost: typed("0"),
    DepartmentalCost: typed("0"),
    ForeignAmt: calc("ISNULL(T1.BalFcDeb,0)-ISNULL(T1.BalFcCred,0)", "t1.BalFcDeb", "t1.BalFcCred"),
    Currency: read("T1.FCCurrency", "t1.FCCurrency"),
    SysAmt: calc("ISNULL(T1.BalScDeb,0)-ISNULL(T1.BalScCred,0)", "t1.BalScDeb", "t1.BalScCred"),
    SysRate: read("T1.SystemRate", "t1.SystemRate"),
  },

  "jb-ap-credit-notes": {
    ...apColumns(),
    LineTotal: negated(calc("-T1.LineTotal + T1.LineTotal*(T0.DiscPrcnt/100)", "t1.LineTotal", "t0.DiscPrcnt")),
    COGS: negated(calc("-T1.LineTotal + T1.LineTotal*(T0.DiscPrcnt/100)", "t1.LineTotal", "t0.DiscPrcnt")),
    ForeignAmt: negated(read("-T0.TotalFrgn", "t0.TotalFrgn")),
    SysAmt: negated(read("-T0.TotalSumSy", "t0.TotalSumSy")),
  },

  "jb-production-labour": {
    AREA: typed("'JOB COSTS'"),
    Type: typed("'LAB'"),
    DocNum: read("T0.DocNum", "t0.DocNum"),
    DocDate: read("T0.PostDate", "t0.PostDate"),
    CardCode: fallback("ISNULL(T0.CardCode,'')", "t0.CardCode"),
    CardName: typed("''"),
    DocTotal: typed("0"),
    DocTotal1000: typed("0"),
    Project: fallback("ISNULL(T1.Project,ISNULL(T0.Project,'RPC'))", "t1.Project", "t0.Project"),
    ProjectName: lookup("ISNULL(T5.PrjName,'No Project')", "t5.PrjName"),
    LineNum: typed("1"),
    ItemCode: typed("''"),
    Description: typed("'Direct Labour'"),
    LineTotal: typed("0"),
    LineTotal1000: typed("0"),
    COGS: calc("T1.IssuedQty * ISNULL(T2.U_Direct,0)", "t1.IssuedQty", "t2.U_Direct"),
    Quantity: read("T1.IssuedQty", "t1.IssuedQty"),
    CostCode: typed("'100'"),
    CostCodeName: typed("'100 - Labour'"),
    Section: fallback("ISNULL(T1.U_Section,'')", "t1.U_Section"),
    SectionName: lookup("ISNULL(T9.U_Name,'')", "t9.U_Name"),
    SummaryType: typed("'Direct Labour'"),
    PO: typed("CAST('' AS NVARCHAR(100))"),
    OverHeadCost: calc("T1.IssuedQty * ISNULL(T2.U_OverHead,0)", "t1.IssuedQty", "t2.U_OverHead"),
    DepartmentalCost: typed("0"),
    ...NO_CURRENCY,
  },

  "jb-legacy-purchases": legacyColumns({ type: "AP" }),

  "jb-legacy-labour": {
    ...legacyColumns({ type: "LAB" }),
    ItemCode: typed("'Labour'"),
    Description: typed("'Direct Labour'"),
    CostCode: typed("'100'"),
    CostCodeName: typed("'100 - Labour'"),
    SummaryType: typed("'Direct Labour'"),
    OverHeadCost: read("T0.[Sum Oncosts Overhead]", "t0.[Sum Oncosts Overhead]"),
    DepartmentalCost: read("T0.[Departmental Overhead]", "t0.[Departmental Overhead]"),
  },

  "jb-legacy-materials": {
    ...legacyColumns({ type: "AP" }),
    DocNum: read("T0.[Reference No]", "t0.[Reference No]"),
    ItemCode: read("T0.[Reference No]", "t0.[Reference No]"),
    Description: read("T0.[Description 2]", "t0.[Description 2]"),
    SummaryType: typed("'Stock'"),
    PO: read("CAST(T0.[Reference No] AS NVARCHAR(100))", "t0.[Reference No]"),
  },

  "jb-legacy-invoices": {
    AREA: typed("'INVOICES'"),
    Type: typed("'INV'"),
    DocNum: read("T0.Invoice", "t0.Invoice"),
    DocDate: read("T0.Date", "t0.Date"),
    CardCode: read("T0.CardCode", "t0.CardCode"),
    CardName: lookup("T1.CardName", "t1.CardName"),
    DocTotal: read("T0.AmountIDR", "t0.AmountIDR"),
    DocTotal1000: calc("T0.AmountIDR/1000", "t0.AmountIDR"),
    Project: fallback("ISNULL(ISNULL(T5.PrjCode,T0.JobNumber),'RPC')", "t5.PrjCode", "t0.JobNumber"),
    ProjectName: lookup("ISNULL(T5.PrjName,'No Project')", "t5.PrjName"),
    LineNum: typed("1"),
    ItemCode: typed("'Invoice'"),
    Description: typed("'Invoice'"),
    LineTotal: read("T0.AmountIDR", "t0.AmountIDR"),
    LineTotal1000: calc("T0.AmountIDR/1000", "t0.AmountIDR"),
    COGS: typed("0"),
    Quantity: typed("1"),
    CostCode: typed("''"),
    CostCodeName: typed("''"),
    Section: typed("''"),
    SectionName: typed("''"),
    SummaryType: typed("'Other'"),
    PO: read("CAST(T0.Invoice AS NVARCHAR(100))", "t0.Invoice"),
    OverHeadCost: typed("0"),
    DepartmentalCost: typed("0"),
    ...NO_CURRENCY,
  },

  "jb-production-stock": {
    AREA: typed("'JOB COSTS'"),
    Type: typed("'DLN'"),
    DocNum: read("T0.DocNum", "t0.DocNum"),
    DocDate: read("T0.PostDate", "t0.PostDate"),
    CardCode: fallback("ISNULL(T0.CardCode,'')", "t0.CardCode"),
    CardName: typed("''"),
    DocTotal: typed("0"),
    DocTotal1000: typed("0"),
    Project: fallback("ISNULL(T11.Project,ISNULL(T0.Project,'RPC'))", "t11.Project", "t0.Project"),
    ProjectName: lookup("ISNULL(T5.PrjName,'No Project')", "t5.PrjName"),
    LineNum: typed("1"),
    ItemCode: read("T1.ItemCode", "t1.ItemCode"),
    Description: lookup("T2.ItemName", "t2.ItemName"),
    LineTotal: typed("0"),
    LineTotal1000: typed("0"),
    COGS: calc("CASE WHEN T1.OutQty-T1.InQty>=0 THEN T1.OpenValue ELSE -T1.OpenValue END", "t1.OutQty", "t1.InQty", "t1.OpenValue"),
    Quantity: calc("T1.OutQty - T1.InQty", "t1.OutQty", "t1.InQty"),
    CostCode: lookup("ISNULL(LEFT(T3.ItmsGrpNam,3),'UnAllocated')", "t3.ItmsGrpNam"),
    CostCodeName: lookup("ISNULL(T3.ItmsGrpNam,'UnAllocated')", "t3.ItmsGrpNam"),
    Section: fallback("ISNULL(T11.U_Section,'')", "t11.U_Section"),
    SectionName: lookup("ISNULL(T9.U_Name,'')", "t9.U_Name"),
    SummaryType: typed("'Stock'"),
    PO: read("T11.ItemCode", "t11.ItemCode"),
    OverHeadCost: typed("0"),
    DepartmentalCost: typed("0"),
    ...NO_CURRENCY,
  },
};

// Ordered arrays: [{ name, how, expr, from?, negated? }] in COLUMN_ORDER.
export const blockColumns = Object.fromEntries(
  Object.entries(byBlock).map(([slug, cols]) => [
    slug,
    COLUMN_ORDER.map((name) => ({ name, ...cols[name] })),
  ])
);
