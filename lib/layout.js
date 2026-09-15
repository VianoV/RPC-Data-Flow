import dagre from "@dagrejs/dagre";
import { MarkerType, Position } from "@xyflow/react";

const CHAR_W = 8.2; // approx width of one char at the node's label font size
const LINE_H = 20; // label line height
const NOTE_H = 16; // note line height
const TAG_H = 18; // the small "OUTSIDE SAP" / "IN SAP" / "NOT USED BY RPC" tag
const PAD_X = 32;
const PAD_Y = 24;
const MIN_W = 150;
const MAX_W = 320;
const EDGE_CHAR_W = 6.2; // React Flow draws edge labels at 10px
const EDGE_LABEL_H = 18;

// Bands: the outside-SAP and inside-SAP halves of the consolidated main page.
const BAND_PAD_X = 40;
const BAND_PAD_Y = 28;
const BAND_LABEL_H = 34;
const BAND_GAP = 56;
const BAND_INNER_GAP = 40; // largest vertical gap kept between nodes in a band

/** The tag a node wears, if any. Also sizes the node, so it lives here. */
export function tagOf(node) {
  if (node.unused) return "Not used by RPC";
  if (node.ghost) return "In SAP";
  if ((node.scope ?? "sap") === "outside") return "Outside SAP";
  return null;
}

export function measure(node) {
  const lines = String(node.label ?? "").split("\n");
  const noteLines = node.note ? String(node.note).split("\n") : [];
  const longest = [...lines, ...noteLines].reduce(
    (m, l) => Math.max(m, l.length),
    0
  );

  return {
    width: Math.min(MAX_W, Math.max(MIN_W, Math.ceil(longest * CHAR_W) + PAD_X)),
    height:
      lines.length * LINE_H +
      noteLines.length * NOTE_H +
      (tagOf(node) ? TAG_H : 0) +
      PAD_Y,
  };
}

// 12 flow colours, defined in globals.css as --flow-1..--flow-12 with a
// separately stepped set for dark mode. Each flow takes its colour from the
// node the edge leaves, so a line and its source node always match.
export const FLOW_COUNT = 12;

/**
 * Every node with at least one outgoing edge owns a flow colour, assigned in
 * declaration order so a node keeps its colour regardless of the edge list.
 */
export function assignFlows(nodes, edges) {
  const sources = new Set(edges.map((e) => e.source));
  const flows = new Map();
  let i = 0;
  for (const n of nodes) {
    if (sources.has(n.id)) flows.set(n.id, (i++ % FLOW_COUNT) + 1);
  }
  return flows;
}

/**
 * Split an already laid-out graph into horizontal bands, one per scope, top to
 * bottom in `bands` order. Dagre has placed every node for the whole graph, so
 * left-to-right step order and neighbour alignment across bands are kept; each
 * band's nodes are then only translated vertically. Nodes whose boxes overlap
 * vertically move together, and the empty gaps the other band left behind are
 * closed — translation preserves in-band spacing, so nothing can overlap.
 *
 * Mutates `pos`. Returns one background node per band.
 */
function layoutBands(nodes, sizes, pos, bands) {
  let minX = Infinity;
  let maxX = -Infinity;
  for (const n of nodes) {
    const { x } = pos.get(n.id);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x + sizes.get(n.id).width);
  }

  const backgrounds = [];
  let top = 0;

  for (const band of bands) {
    const spans = nodes
      .filter((n) => (n.scope ?? "sap") === band.id)
      .map((n) => {
        const { y } = pos.get(n.id);
        return { id: n.id, a: y, b: y + sizes.get(n.id).height };
      })
      .sort((p, q) => p.a - q.a);
    if (!spans.length) continue;

    const groups = [];
    for (const s of spans) {
      const last = groups[groups.length - 1];
      if (last && s.a < last.b) {
        last.b = Math.max(last.b, s.b);
        last.ids.push(s.id);
      } else {
        groups.push({ a: s.a, b: s.b, ids: [s.id] });
      }
    }

    let cursor = top + BAND_LABEL_H + BAND_PAD_Y;
    let prevBottom = null;
    for (const group of groups) {
      const gap =
        prevBottom === null ? 0 : Math.min(group.a - prevBottom, BAND_INNER_GAP);
      const offset = cursor + gap - group.a;
      for (const id of group.ids) {
        const p = pos.get(id);
        pos.set(id, { x: p.x, y: p.y + offset });
      }
      cursor = group.b + offset;
      prevBottom = group.b;
    }

    const height = cursor + BAND_PAD_Y - top;
    backgrounds.push({
      id: `band-${band.id}`,
      type: "band",
      position: { x: minX - BAND_PAD_X, y: top },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: -1,
      className: "band-node",
      data: {
        label: band.label,
        scope: band.id,
        width: maxX - minX + BAND_PAD_X * 2,
        height,
      },
    });
    top += height + BAND_GAP;
  }

  return backgrounds;
}

export function layout(nodes, edges, dir = "TB", { bands } = {}) {
  const horizontal = dir === "LR" || dir === "RL";
  const flows = assignFlows(nodes, edges);
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: dir, nodesep: 40, ranksep: 70 });
  g.setDefaultEdgeLabel(() => ({}));

  const sizes = new Map();
  nodes.forEach((n) => {
    const size = measure(n);
    sizes.set(n.id, size);
    g.setNode(n.id, size);
  });
  // Give dagre each edge label's size so it leaves room between ranks.
  // Otherwise a long label (e.g. a join condition) is drawn under the nodes.
  edges.forEach((e) =>
    g.setEdge(
      e.source,
      e.target,
      e.label
        ? {
            width: Math.ceil(String(e.label).length * EDGE_CHAR_W) + 12,
            height: EDGE_LABEL_H,
            labelpos: "c",
          }
        : {}
    )
  );
  dagre.layout(g);

  const pos = new Map(
    nodes.map((n) => {
      const { x, y } = g.node(n.id);
      const { width, height } = sizes.get(n.id);
      return [n.id, { x: x - width / 2, y: y - height / 2 }];
    })
  );
  const backgrounds = bands?.length ? layoutBands(nodes, sizes, pos, bands) : [];

  const sourcePosition = horizontal ? Position.Right : Position.Bottom;
  const targetPosition = horizontal ? Position.Left : Position.Top;
  const unusedIds = new Set(nodes.filter((n) => n.unused).map((n) => n.id));

  return {
    nodes: [
      ...backgrounds,
      ...nodes.map((n) => {
        const { width, height } = sizes.get(n.id);
        return {
          id: n.id,
          type: "process",
          position: pos.get(n.id),
          sourcePosition,
          targetPosition,
          data: {
            label: n.label,
            note: n.note,
            kind: n.kind,
            href: n.href,
            detail: n.detail,
            scope: n.scope ?? "sap",
            ghost: Boolean(n.ghost),
            unused: n.unused,
            tag: tagOf(n),
            flow: flows.get(n.id),
            width,
            height,
            sourcePosition,
            targetPosition,
          },
        };
      }),
    ],
    edges: edges.map((e, i) => {
      const color = `var(--flow-${flows.get(e.source) ?? 1})`;
      // A line into or out of a document RPC doesn't use is dotted, so the
      // solid lines trace the path RPC actually takes. Round caps turn the
      // short dashes into dots.
      const skipped = unusedIds.has(e.source) || unusedIds.has(e.target);
      return {
        id: `e${i}-${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        label: e.label,
        flow: flows.get(e.source),
        style: {
          stroke: color,
          strokeWidth: 2,
          ...(skipped ? { strokeDasharray: "1 6", strokeLinecap: "round" } : null),
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 18,
          height: 18,
          color,
        },
      };
    }),
  };
}
