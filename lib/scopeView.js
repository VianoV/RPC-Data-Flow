// Which part of a diagram a view shows. The main page consolidates two flows:
// the SAP Business One documents and the steps that happen outside SAP (email,
// the storeman's Excel, the labour website …). Nodes carry `scope`
// ("sap" by default, or "outside"); this picks what each view draws.

export const scopeOf = (node) => node.scope ?? "sap";

const BANDS = [
  { id: "outside", label: "Outside SAP Business One" },
  { id: "sap", label: "Inside SAP Business One" },
];

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
    const outside = new Set(
      nodes.filter((n) => scopeOf(n) === "outside").map((n) => n.id)
    );
    const keptEdges = edges.filter(
      (e) => outside.has(e.source) || outside.has(e.target)
    );
    // The SAP documents an outside step hands off to stay, as ghosts, so the
    // view still shows where each chain enters SAP.
    const ids = new Set([...outside, ...keptEdges.flatMap((e) => [e.source, e.target])]);
    return {
      nodes: nodes
        .filter((n) => ids.has(n.id))
        .map((n) => (outside.has(n.id) ? n : { ...n, ghost: true })),
      edges: keptEdges,
      bands: null,
    };
  }

  const scopes = new Set(nodes.map(scopeOf));
  return {
    nodes,
    edges,
    bands: scopes.size > 1 ? BANDS.filter((b) => scopes.has(b.id)) : null,
  };
}
