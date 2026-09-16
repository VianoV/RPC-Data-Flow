// Which part of a diagram a view shows. The main page consolidates the SAP
// Business One documents with everything that happens outside SAP — email, the
// storeman's records, the labour website — and the physical work in the store
// and on the shop floor. Nodes carry `scope` ("sap" by default, "outside" or
// "shopfloor"); this picks what each view draws, and which bands group it.

export const scopeOf = (node) => node.scope ?? "sap";

// Top to bottom: the physical work, then the office and its systems, then SAP.
const BANDS = [
  { id: "shopfloor", label: "Shop floor and store" },
  { id: "outside", label: "Outside SAP Business One" },
  { id: "sap", label: "Inside SAP Business One" },
];

// Bands are only worth drawing when a view holds more than one scope. Every
// node must fall in one, or lib/layout.js would leave it outside the bands.
function bandsFor(nodes) {
  const present = new Set(nodes.map(scopeOf));
  const bands = BANDS.filter((b) => present.has(b.id));
  return bands.length > 1 ? bands : null;
}

/**
 * @param diagram a diagrams[key] entry
 * @param view    "all" | "sap" | "outside"
 * @returns {{ nodes, edges, bands }} bands is null when the view has one scope
 */
export function scopeView(diagram, view) {
  const { nodes, edges } = diagram;

  if (view === "sap") {
    const keep = nodes.filter((n) => scopeOf(n) === "sap");
    const ids = new Set(keep.map((n) => n.id));
    return {
      nodes: keep,
      edges: edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
      bands: null,
    };
  }

  if (view === "outside") {
    // The shop floor is outside SAP too, so both non-SAP scopes belong here.
    const outside = new Set(
      nodes.filter((n) => scopeOf(n) !== "sap").map((n) => n.id)
    );
    const keptEdges = edges.filter(
      (e) => outside.has(e.source) || outside.has(e.target)
    );
    // The SAP documents an outside step hands off to stay, as ghosts, so the
    // view still shows where each chain enters SAP.
    const ids = new Set([...outside, ...keptEdges.flatMap((e) => [e.source, e.target])]);
    const kept = nodes
      .filter((n) => ids.has(n.id))
      .map((n) => (outside.has(n.id) ? n : { ...n, ghost: true }));
    return { nodes: kept, edges: keptEdges, bands: bandsFor(kept) };
  }

  return { nodes, edges, bands: bandsFor(nodes) };
}
