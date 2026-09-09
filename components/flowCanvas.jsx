"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
} from "@xyflow/react";
import { useRouter } from "next/navigation";
import { layout } from "@/lib/layout";
import ProcessNode from "@/components/processNode";

// Defined once, outside the component: React Flow warns if this object identity
// changes between renders.
const nodeTypes = { process: ProcessNode };

// Keep the graph clear of the floating island (top-left) and the Controls /
// MiniMap chrome along the bottom. maxZoom stops tiny two-node diagrams from
// ballooning to fill the viewport.
const fitViewOptions = {
  padding: { top: "104px", right: "56px", bottom: "72px", left: "56px" },
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

function Canvas({ nodes, edges, dir }) {
  const router = useRouter();
  const { fitView } = useReactFlow();
  const [leaving, setLeaving] = useState(false);
  const navigating = useRef(false);

  const laid = useMemo(() => layout(nodes, edges, dir), [nodes, edges, dir]);

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

  // Warm the target page so the push lands as soon as the animation ends.
  const onNodeMouseEnter = useCallback(
    (_, node) => {
      if (node.data?.href) router.prefetch(node.data.href);
    },
    [router]
  );

  return (
    <div className="absolute inset-0">
      <ReactFlow
        nodes={laid.nodes}
        edges={laid.edges}
        nodeTypes={nodeTypes}
        colorMode="system"
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        fitView
        fitViewOptions={fitViewOptions}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>

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
