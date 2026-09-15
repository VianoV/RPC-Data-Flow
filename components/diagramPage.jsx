"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import FlowCanvas from "@/components/flowCanvas";
import ThemeToggle from "@/components/themeToggle";
import { HOW_LABEL } from "@/components/columnCardNode";

// The active view of a page with `lineage` lives in the URL hash (#columns), so
// it survives a reload, can be shared, and the back button undoes a switch —
// without searchParams, which would stop the page prerendering.
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

function setView(view) {
  const { pathname, search } = window.location;
  // Native pushState integrates with the Next.js router; it fires no event of
  // its own, so tell subscribers.
  window.history.pushState(null, "", view === "columns" ? "#columns" : pathname + search);
  window.dispatchEvent(new Event(VIEW_EVENT));
}

const LEGEND = ["read", "calc", "fallback", "lookup"];

/**
 * Full-bleed canvas with the heading, doc prose and back link floating over it
 * as an island. The wrapper is pointer-events:none so drags/zooms pass through
 * to the canvas everywhere except on the island itself.
 */
export default function DiagramPage({ diagram, backHref, backLabel }) {
  const hash = useSyncExternalStore(subscribe, getHash, getServerHash);
  const view = diagram.lineage && hash === "#columns" ? "columns" : "joins";

  return (
    <main className="diagram-screen relative h-dvh w-full overflow-hidden">
      {/* Keyed by view so switching remounts the canvas and fits the new graph. */}
      <FlowCanvas
        key={view}
        nodes={diagram.nodes}
        edges={diagram.edges}
        dir={diagram.dir ?? "TB"}
        lineage={view === "columns" ? diagram.lineage : undefined}
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

          {diagram.lineage && (
            <>
              <div className="view-toggle mt-3" role="group" aria-label="View">
                {[
                  ["joins", "Joins"],
                  ["columns", "Columns"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={view === value}
                    onClick={() => view !== value && setView(value)}
                  >
                    {label}
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

        <div className="floating-island pointer-events-auto shrink-0 !p-1.5">
          <ThemeToggle />
        </div>
      </div>
    </main>
  );
}
