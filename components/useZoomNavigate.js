"use client";
import { useCallback, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useRouter } from "next/navigation";

// Zoom-into-the-node transition before navigating.
const ZOOM_DURATION = 380;
const ZOOM_TARGET = 2.4;

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Fly into a node, then open its page. Shared by the canvas (nodes that have a
 * page but no details) and the detail island's "Open tables" button, so both
 * get the same transition and drive the same veil. Call it once, inside the
 * ReactFlowProvider, and pass the result down.
 */
export function useZoomNavigate() {
  const router = useRouter();
  const { fitView } = useReactFlow();
  const [leaving, setLeaving] = useState(false);
  const navigating = useRef(false);

  const open = useCallback(
    async (nodeId, href) => {
      if (!href || navigating.current) return;

      navigating.current = true;
      setLeaving(true);

      if (!prefersReducedMotion()) {
        await fitView({
          nodes: [{ id: nodeId }],
          duration: ZOOM_DURATION,
          minZoom: ZOOM_TARGET,
          maxZoom: ZOOM_TARGET,
          padding: 0.6,
        });
      }

      router.push(href);
    },
    [fitView, router]
  );

  // Warm the target page so the push lands as the animation ends.
  const prefetch = useCallback((href) => href && router.prefetch(href), [router]);

  return { open, prefetch, leaving, navigating };
}
