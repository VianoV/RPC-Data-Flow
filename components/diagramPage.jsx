import Link from "next/link";
import FlowCanvas from "@/components/flowCanvas";
import ThemeToggle from "@/components/themeToggle";

/**
 * Full-bleed canvas with the heading, doc prose and back link floating over it
 * as an island. The wrapper is pointer-events:none so drags/zooms pass through
 * to the canvas everywhere except on the island itself.
 */
export default function DiagramPage({ diagram, backHref, backLabel }) {
  return (
    <main className="diagram-screen relative h-dvh w-full overflow-hidden">
      <FlowCanvas
        nodes={diagram.nodes}
        edges={diagram.edges}
        dir={diagram.dir ?? "TB"}
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
        </div>

        <div className="floating-island pointer-events-auto shrink-0 !p-1.5">
          <ThemeToggle />
        </div>
      </div>
    </main>
  );
}
