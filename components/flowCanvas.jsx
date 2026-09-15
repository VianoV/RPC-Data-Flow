"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { layout } from "@/lib/layout";
import { lineageLayout } from "@/lib/lineageLayout";
import ProcessNode from "@/components/processNode";
import BandNode from "@/components/bandNode";
import ColumnCardNode, { RowHoverContext } from "@/components/columnCardNode";
import { useResolvedTheme } from "@/components/useResolvedTheme";
import { prefersReducedMotion } from "@/components/useZoomNavigate";

// Defined once, outside the component: React Flow warns if this object identity
// changes between renders.
const nodeTypes = { process: ProcessNode, columns: ColumnCardNode, band: BandNode };

// Keep the graph clear of the floating island (top-left) and the Controls /
// MiniMap chrome along the bottom. maxZoom stops tiny two-node diagrams from
// ballooning to fill the viewport. MIN_ZOOM sits below React Flow's 0.5 default
// so wide diagrams (the root map) can still fit on one screen.
const MIN_ZOOM = 0.1;
const fitViewOptions = {
  padding: { top: "104px", right: "56px", bottom: "72px", left: "56px" },
  minZoom: MIN_ZOOM,
  maxZoom: 1.1,
};

// Selecting a node pans it clear of the detail island: the island sits on the
// right on wide screens and is a bottom sheet on narrow ones (see globals.css).
const SELECT_ZOOM = 0.8; // zoom in to at least this, so the node is readable
const ISLAND_SHIFT_X = 200; // screen px
const SHEET_SHIFT_Y = 0.22; // share of the viewport height

const minimapClass = (node) => (node.type === "band" ? "minimap-band" : "");

/**
 * The React Flow canvas. Renders inside the ReactFlowProvider that DiagramPage
 * sets up, so the detail island can drive the same viewport.
 *
 * Clicking a node with `detail` selects it (DiagramPage shows the island);
 * a node with only `href` flies in and opens its page via `onOpen`.
 */
export default function FlowCanvas({
  nodes,
  edges,
  dir = "TB",
  lineage,
  bands,
  selected,
  onSelect,
  onOpen,
  prefetch,
  navigating,
}) {
  const { fitView, getInternalNode, getZoom, setCenter } = useReactFlow();
  const theme = useResolvedTheme();
  const [hovered, setHovered] = useState(null);
  // Column-lineage view only: { node, row } under the pointer.
  const [hoveredRow, setHoveredRow] = useState(null);

  // With `lineage`, `nodes` are the block's tables and the canvas draws the
  // column-to-column view instead of the diagram itself.
  const laid = useMemo(
    () =>
      lineage
        ? lineageLayout(nodes, lineage)
        : layout(nodes, edges, dir, { bands }),
    [nodes, edges, dir, lineage, bands]
  );

  // Nodes are draggable, so their positions live in state. Dagre's layout is
  // only the starting point; a new diagram resets it. Positions aren't saved —
  // a reload goes back to the computed layout.
  //
  // The reset happens during render and only when the layout actually changes.
  // Resetting in an effect on mount would swap in node objects without React
  // Flow's `measured` sizes, leaving it un-initialised so fitView (and with it
  // the click-to-navigate zoom) never resolves.
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(laid.nodes);
  const [prevLaid, setPrevLaid] = useState(laid);
  if (laid !== prevLaid) {
    setPrevLaid(laid);
    setFlowNodes(laid.nodes);
  }

  // Hovering a node isolates its flow: everything unrelated recedes. With a
  // dozen lines converging on one view this, not colour alone, is what makes an
  // individual path traceable. The selected node keeps its flow isolated while
  // the pointer is elsewhere.
  //
  // This is done with a generated stylesheet keyed on the data-id attributes
  // React Flow already renders, rather than by rebuilding the node/edge arrays.
  // Handing React Flow new node objects resets its measurement pass, which
  // drops every edge from the DOM until the nodes are re-measured.
  //
  // In the column-lineage view a hovered row narrows this further: only the
  // edges on that row's handle stay, and the rows at both ends are highlighted.
  const focus = hovered ?? selected;
  const focusCss = useMemo(() => {
    if (!focus && !hoveredRow) return null;

    const liveEdges = [];
    const liveRows = [];
    const liveNodes = new Set([hoveredRow?.node ?? focus]);
    if (hoveredRow) liveRows.push([hoveredRow.node, hoveredRow.row]);

    for (const e of laid.edges) {
      const live = hoveredRow
        ? (e.source === hoveredRow.node && e.sourceHandle === hoveredRow.row) ||
          (e.target === hoveredRow.node && e.targetHandle === hoveredRow.row)
        : e.source === focus || e.target === focus;
      if (!live) continue;
      liveEdges.push(e.id);
      liveNodes.add(e.source);
      liveNodes.add(e.target);
      if (hoveredRow) {
        liveRows.push([e.source, e.sourceHandle], [e.target, e.targetHandle]);
      }
    }

    const esc = (v) => (window.CSS?.escape ? CSS.escape(v) : v);
    const notNodes = [...liveNodes]
      .map((id) => `:not([data-id="${esc(id)}"])`)
      .join("");
    const notEdges = liveEdges
      .map((id) => `:not([data-id="${esc(id)}"])`)
      .join("");

    return `
      .rf-focus .react-flow__node${notNodes} :is(.process-node, .column-card) { opacity: .22 }
      .rf-focus .react-flow__edge${notEdges} { opacity: .1 }
      ${liveEdges
        .map(
          (id) =>
            `.rf-focus .react-flow__edge[data-id="${esc(
              id
            )}"] .react-flow__edge-path { stroke-width: 3.5 }`
        )
        .join("\n")}
      ${liveRows
        .map(
          ([node, row]) =>
            `.rf-focus .react-flow__node[data-id="${esc(node)}"] .column-card__row[data-row="${esc(
              row
            )}"] { background: var(--row-focus) }`
        )
        .join("\n")}
      ${
        selected
          ? `.rf-focus .react-flow__node[data-id="${esc(
              selected
            )}"] .process-node { box-shadow: 0 0 0 2px var(--node-accent, var(--kind-document)), 0 4px 14px rgba(0,0,0,.18) }`
          : ""
      }
    `;
  }, [laid, focus, hoveredRow, selected]);

  // React Flow keeps its viewport when the container resizes, so a full-screen
  // canvas ends up cropped after a window resize. Refit instead.
  useEffect(() => {
    let frame = 0;
    const refit = () => {
      if (navigating?.current) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => fitView(fitViewOptions));
    };
    window.addEventListener("resize", refit);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", refit);
    };
  }, [fitView, navigating]);

  const panToNode = useCallback(
    (id) => {
      const node = getInternalNode(id);
      if (!node) return;
      const { x, y } = node.internals.positionAbsolute;
      const cx = x + (node.measured.width ?? 0) / 2;
      const cy = y + (node.measured.height ?? 0) / 2;
      const zoom = Math.max(getZoom(), SELECT_ZOOM);
      const narrow = window.matchMedia("(max-width: 639px)").matches;

      setCenter(
        narrow ? cx : cx + ISLAND_SHIFT_X / zoom,
        narrow ? cy + (window.innerHeight * SHEET_SHIFT_Y) / zoom : cy,
        { zoom, duration: prefersReducedMotion() ? 0 : 350 }
      );
    },
    [getInternalNode, getZoom, setCenter]
  );

  const onNodeClick = useCallback(
    (_, node) => {
      if (node.type === "band" || navigating?.current) return;
      if (node.data?.detail) {
        onSelect?.(node.id);
        panToNode(node.id);
        return;
      }
      if (node.data?.href) onOpen?.(node.id, node.data.href);
    },
    [navigating, onSelect, onOpen, panToNode]
  );

  const onNodeMouseEnter = useCallback(
    (_, node) => {
      if (node.type === "band") return;
      setHovered(node.id);
      prefetch?.(node.data?.href);
    },
    [prefetch]
  );

  const onNodeMouseLeave = useCallback(() => setHovered(null), []);
  const onPaneClick = useCallback(() => onSelect?.(null), [onSelect]);

  return (
    <div className={`absolute inset-0${focusCss ? " rf-focus" : ""}`}>
      {focusCss && <style>{focusCss}</style>}
      <RowHoverContext.Provider value={setHoveredRow}>
        <ReactFlow
          nodes={flowNodes}
          edges={laid.edges}
          nodeTypes={nodeTypes}
          colorMode={theme}
          onNodesChange={onNodesChange}
          onNodeClick={onNodeClick}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          onPaneClick={onPaneClick}
          nodesDraggable
          nodesConnectable={false}
          edgesFocusable={false}
          minZoom={MIN_ZOOM}
          fitView
          fitViewOptions={fitViewOptions}
        >
          <Background />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeClassName={minimapClass} />
        </ReactFlow>
      </RowHoverContext.Provider>
    </div>
  );
}
