"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { useRouter } from "next/navigation";
import { layout } from "@/lib/layout";
import { lineageLayout } from "@/lib/lineageLayout";
import ProcessNode from "@/components/processNode";
import ColumnCardNode, { RowHoverContext } from "@/components/columnCardNode";
import { useResolvedTheme } from "@/components/useResolvedTheme";

// Defined once, outside the component: React Flow warns if this object identity
// changes between renders.
const nodeTypes = { process: ProcessNode, columns: ColumnCardNode };

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

// Zoom-into-the-node transition before navigating.
const ZOOM_DURATION = 380;
const ZOOM_TARGET = 2.4;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function Canvas({ nodes, edges, dir, lineage }) {
  const router = useRouter();
  const { fitView } = useReactFlow();
  const theme = useResolvedTheme();
  const [leaving, setLeaving] = useState(false);
  const [hovered, setHovered] = useState(null);
  // Column-lineage view only: { node, row } under the pointer.
  const [hoveredRow, setHoveredRow] = useState(null);
  const navigating = useRef(false);

  // With `lineage`, `nodes` are the block's tables and the canvas draws the
  // column-to-column view instead of the diagram itself.
  const laid = useMemo(
    () => (lineage ? lineageLayout(nodes, lineage) : layout(nodes, edges, dir)),
    [nodes, edges, dir, lineage]
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
  // individual path traceable.
  //
  // This is done with a generated stylesheet keyed on the data-id attributes
  // React Flow already renders, rather than by rebuilding the node/edge arrays.
  // Handing React Flow new node objects resets its measurement pass, which
  // drops every edge from the DOM until the nodes are re-measured.
  //
  // In the column-lineage view a hovered row narrows this further: only the
  // edges on that row's handle stay, and the rows at both ends are highlighted.
  const focusCss = useMemo(() => {
    if (!hovered && !hoveredRow) return null;

    const liveEdges = [];
    const liveRows = [];
    const liveNodes = new Set([hoveredRow?.node ?? hovered]);
    if (hoveredRow) liveRows.push([hoveredRow.node, hoveredRow.row]);

    for (const e of laid.edges) {
      const live = hoveredRow
        ? (e.source === hoveredRow.node && e.sourceHandle === hoveredRow.row) ||
          (e.target === hoveredRow.node && e.targetHandle === hoveredRow.row)
        : e.source === hovered || e.target === hovered;
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
    `;
  }, [laid, hovered, hoveredRow]);

  // React Flow keeps its viewport when the container resizes, so a full-screen
  // canvas ends up cropped after a window resize. Refit instead.
  useEffect(() => {
    let frame = 0;
    const refit = () => {
      if (navigating.current) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => fitView(fitViewOptions));
    };
    window.addEventListener("resize", refit);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", refit);
    };
  }, [fitView]);

  const onNodeClick = useCallback(
    async (_, node) => {
      const href = node.data?.href;
      if (!href || navigating.current) return;

      navigating.current = true;
      setLeaving(true);

      if (prefersReducedMotion()) {
        router.push(href);
        return;
      }

      // Fly into the clicked node, then hand over to the next page.
      await fitView({
        nodes: [{ id: node.id }],
        duration: ZOOM_DURATION,
        minZoom: ZOOM_TARGET,
        maxZoom: ZOOM_TARGET,
        padding: 0.6,
      });

      router.push(href);
    },
    [fitView, router]
  );

  const onNodeMouseEnter = useCallback(
    (_, node) => {
      setHovered(node.id);
      // Warm the target page so the push lands as the animation ends.
      if (node.data?.href) router.prefetch(node.data.href);
    },
    [router]
  );

  const onNodeMouseLeave = useCallback(() => setHovered(null), []);

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
          nodesDraggable
          nodesConnectable={false}
          edgesFocusable={false}
          minZoom={MIN_ZOOM}
          fitView
          fitViewOptions={fitViewOptions}
        >
          <Background />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </RowHoverContext.Provider>

      {/* Fades the canvas out as it flies in, so the page swap isn't a hard cut. */}
      <div
        className={`canvas-veil${leaving ? " is-leaving" : ""}`}
        aria-hidden="true"
      />
    </div>
  );
}

export default function FlowCanvas(props) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} dir={props.dir ?? "TB"} />
    </ReactFlowProvider>
  );
}
