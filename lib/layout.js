import dagre from "@dagrejs/dagre";
import { MarkerType, Position } from "@xyflow/react";

const CHAR_W = 8.2; // approx width of one char at the node's label font size
const LINE_H = 20; // label line height
const NOTE_H = 16; // note line height
const PAD_X = 32;
const PAD_Y = 24;
const MIN_W = 150;
const MAX_W = 320;

function measure(node) {
  const lines = String(node.label ?? "").split("\n");
  const noteLines = node.note ? String(node.note).split("\n") : [];
  const longest = [...lines, ...noteLines].reduce(
    (m, l) => Math.max(m, l.length),
    0
  );

  return {
    width: Math.min(MAX_W, Math.max(MIN_W, Math.ceil(longest * CHAR_W) + PAD_X)),
    height: lines.length * LINE_H + noteLines.length * NOTE_H + PAD_Y,
  };
}

export function layout(nodes, edges, dir = "TB") {
  const horizontal = dir === "LR" || dir === "RL";
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: dir, nodesep: 40, ranksep: 70 });
  g.setDefaultEdgeLabel(() => ({}));

  const sizes = new Map();
  nodes.forEach((n) => {
    const size = measure(n);
    sizes.set(n.id, size);
    g.setNode(n.id, size);
  });
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const sourcePosition = horizontal ? Position.Right : Position.Bottom;
  const targetPosition = horizontal ? Position.Left : Position.Top;

  return {
    nodes: nodes.map((n) => {
      const { x, y } = g.node(n.id);
      const { width, height } = sizes.get(n.id);
      return {
        id: n.id,
        type: "process",
        position: { x: x - width / 2, y: y - height / 2 },
        sourcePosition,
        targetPosition,
        data: {
          label: n.label,
          note: n.note,
          kind: n.kind,
          href: n.href,
          width,
          height,
          sourcePosition,
          targetPosition,
        },
      };
    }),
    edges: edges.map((e, i) => ({
      id: `e${i}-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      label: e.label,
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
    })),
  };
}
