"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ReactFlowProvider } from "@xyflow/react";
import FlowCanvas from "@/components/flowCanvas";
import ThemeToggle from "@/components/themeToggle";
import DetailIsland from "@/components/detailIsland";
import { HOW_LABEL } from "@/components/columnCardNode";
import { useZoomNavigate } from "@/components/useZoomNavigate";
import { scopeView } from "@/lib/scopeView";

// The active view lives in the URL hash (#columns, #sap, #outside), so it
// survives a reload, can be shared, and the back button undoes a switch —
// without searchParams, which would stop the page prerendering. The first view
// is the default and has no hash.
const VIEW_EVENT = "diagram-view-change";

function subscribe(onChange) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  window.addEventListener(VIEW_EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(VIEW_EVENT, onChange);
  };
}

const getHash = () => window.location.hash;
const getServerHash = () => "";

const LINEAGE_VIEWS = [
  { id: "joins", label: "Joins" },
  { id: "columns", label: "Columns" },
];

const viewsOf = (diagram) =>
  diagram.views ?? (diagram.lineage ? LINEAGE_VIEWS : null);

function setView(views, id) {
  const { pathname, search } = window.location;
  // Native pushState integrates with the Next.js router; it fires no event of
  // its own, so tell subscribers.
  window.history.pushState(
    null,
    "",
    id === views[0].id ? pathname + search : `#${id}`
  );
  window.dispatchEvent(new Event(VIEW_EVENT));
}

const LEGEND = ["read", "calc", "fallback", "lookup"];

/**
 * One provider per view: switching views is a fresh React Flow mount (no stale
 * measurement) and clears the selection. The provider wraps the overlay too, so
 * the detail island can run the same zoom-and-navigate as the canvas.
 */
export default function DiagramPage(props) {
  const views = viewsOf(props.diagram);
  const hash = useSyncExternalStore(subscribe, getHash, getServerHash);
  const view = views
    ? (views.find((v) => `#${v.id}` === hash) ?? views[0]).id
    : null;

  return (
    <ReactFlowProvider key={view ?? "default"}>
      <DiagramScreen {...props} views={views} view={view} />
    </ReactFlowProvider>
  );
}

/**
 * Full-bleed canvas with the heading, doc prose and back link floating over it
 * as an island. The overlay is pointer-events:none so drags/zooms pass through
 * to the canvas everywhere except on the islands themselves.
 */
function DiagramScreen({ diagram, backHref, backLabel, views, view }) {
  const { open, prefetch, leaving, navigating } = useZoomNavigate();
  const [selected, setSelected] = useState(null);

  const scoped = useMemo(
    () =>
      diagram.views
        ? scopeView(diagram, view)
        : { nodes: diagram.nodes, edges: diagram.edges, bands: null },
    [diagram, view]
  );
  const selectedNode = selected
    ? scoped.nodes.find((n) => n.id === selected)
    : null;

  // Esc closes the island.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <main className="diagram-screen relative h-dvh w-full overflow-hidden">
      <FlowCanvas
        nodes={scoped.nodes}
        edges={scoped.edges}
        bands={scoped.bands}
        dir={diagram.dir ?? "TB"}
        lineage={view === "columns" ? diagram.lineage : undefined}
        selected={selected}
        onSelect={setSelected}
        onOpen={open}
        prefetch={prefetch}
        navigating={navigating}
      />

      <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-between gap-4 p-4 sm:p-6">
        <div className="floating-island pointer-events-auto max-w-sm">
          {backHref && (
            <Link
              href={backHref}
              className="mb-2 inline-block text-xs opacity-70 underline-offset-4 hover:underline hover:opacity-100"
            >
              ← {backLabel ?? "Back"}
            </Link>
          )}

          <h1 className="text-lg font-semibold tracking-tight">
            {diagram.title}
          </h1>

          {diagram.doc && (
            <p className="mt-1.5 text-[13px] leading-relaxed opacity-75">
              {diagram.doc}
            </p>
          )}

          {diagram.related?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {diagram.related.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs opacity-70 underline-offset-4 hover:underline hover:opacity-100"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {views && (
            <>
              <div className="view-toggle mt-3" role="group" aria-label="View">
                {views.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={view === v.id}
                    onClick={() => view !== v.id && setView(views, v.id)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {view === "columns" && (
                <div className="how-legend mt-2">
                  {LEGEND.map((how) => (
                    <span key={how} data-how={how}>
                      {HOW_LABEL[how]}
                    </span>
                  ))}
                  <span data-how="negated">negated</span>
                  <span data-how="typed">typed = constant, no line</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="island-column">
          <div className="floating-island pointer-events-auto shrink-0 !p-1.5">
            <ThemeToggle />
          </div>

          {selectedNode && (
            <DetailIsland
              key={selectedNode.id}
              node={selectedNode}
              onClose={() => setSelected(null)}
              onOpen={open}
            />
          )}
        </div>
      </div>

      {/* Fades the canvas out as it flies in, so the page swap isn't a hard cut. */}
      <div
        className={`canvas-veil${leaving ? " is-leaving" : ""}`}
        aria-hidden="true"
      />
    </main>
  );
}
