// Column-lineage layout: source-table cards stacked on the left, one output
// card on the right, and an edge per source column → output column. Positions
// are fixed (no dagre): rows already give the vertical order, so the only
// layout decision is the order of cards and rows, chosen to limit crossings.
//
// Sizes are shared with components/columnCardNode.jsx, which renders rows at
// exactly these heights so the handles line up.
export const ROW_H = 24;
export const HEADER_H = 48;
export const CARD_PAD_B = 8;
export const SOURCE_W = 250;
export const OUTPUT_W = 560;
const GAP_X = 240; // room for the edges between the two columns
const CARD_GAP = 28;

export const OUTPUT_ID = "out";

const cardHeight = (rows) => HEADER_H + rows * ROW_H + CARD_PAD_B;

/**
 * @param tables  the block's table nodes ({ id, label }), from its joins diagram
 * @param lineage { columns: [{ name, how, expr, from?, negated? }] }
 */
export function lineageLayout(tables, lineage) {
  const { columns } = lineage;
  const labels = new Map(tables.map((t) => [t.id, t.label]));

  // Source rows: every distinct table.column referenced, remembering the first
  // output row it feeds so cards and rows can be ordered top-down to match.
  const sources = new Map(); // tableId -> Map(column -> first output index)
  columns.forEach((col, i) => {
    for (const ref of col.from ?? []) {
      const dot = ref.indexOf(".");
      const table = ref.slice(0, dot);
      const column = ref.slice(dot + 1);
      if (!sources.has(table)) sources.set(table, new Map());
      const rows = sources.get(table);
      if (!rows.has(column)) rows.set(column, i);
    }
  });

  const cards = [...sources.entries()]
    .map(([table, rows]) => ({
      table,
      rows: [...rows.entries()].sort((a, b) => a[1] - b[1]).map(([name]) => name),
      first: Math.min(...rows.values()),
    }))
    .sort((a, b) => a.first - b.first);

  const outputH = cardHeight(columns.length);
  const sourcesH =
    cards.reduce((sum, c) => sum + cardHeight(c.rows.length), 0) +
    CARD_GAP * Math.max(0, cards.length - 1);

  // Centre the shorter column against the taller one.
  let y = Math.max(0, (outputH - sourcesH) / 2);
  const outputY = Math.max(0, (sourcesH - outputH) / 2);

  const nodes = cards.map((card) => {
    const height = cardHeight(card.rows.length);
    const node = {
      id: card.table,
      type: "columns",
      position: { x: 0, y },
      data: {
        side: "source",
        title: labels.get(card.table) ?? card.table,
        rows: card.rows.map((name) => ({ id: name, label: name })),
        width: SOURCE_W,
        height,
      },
    };
    y += height + CARD_GAP;
    return node;
  });

  nodes.push({
    id: OUTPUT_ID,
    type: "columns",
    position: { x: SOURCE_W + GAP_X, y: outputY },
    data: {
      side: "output",
      title: `Block output\n${columns.length} columns → RPC_JobBreakdown`,
      rows: columns.map((col) => ({
        id: col.name,
        label: col.name,
        how: col.how,
        expr: col.expr,
        negated: Boolean(col.negated),
      })),
      width: OUTPUT_W,
      height: outputH,
    },
  });

  const edges = columns.flatMap((col) =>
    (col.from ?? []).map((ref) => {
      const dot = ref.indexOf(".");
      const table = ref.slice(0, dot);
      const column = ref.slice(dot + 1);
      return {
        id: `${ref}->${col.name}`,
        source: table,
        sourceHandle: column,
        target: OUTPUT_ID,
        targetHandle: col.name,
        style: {
          stroke: `var(--how-${col.how})`,
          strokeWidth: 1.5,
          ...(col.negated ? { strokeDasharray: "5 4" } : null),
        },
      };
    })
  );

  return { nodes, edges };
}
