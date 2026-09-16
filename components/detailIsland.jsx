"use client";
import { useEffect, useRef } from "react";

const SECTIONS = [
  ["who", "Who"],
  ["where", "Where it's recorded"],
  ["sap", "SAP tables"],
  ["view", "In RPC_JobBreakdown"],
  ["risk", "Watch out"],
];

/**
 * Floating explanation for the selected node. Non-modal: the canvas stays
 * usable behind it. A bottom sheet on narrow screens (see globals.css).
 */
export default function DetailIsland({ node, onClose, onOpen }) {
  const headingRef = useRef(null);

  // Move focus to the heading so keyboard and screen-reader users land in it.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [node.id]);

  const detail = node.detail ?? {};
  const title = String(node.label ?? "").replace(/\n/g, " ");
  const scope = node.scope ?? "sap";
  const sections = SECTIONS.filter(([key]) => detail[key]);

  return (
    <section
      className="floating-island detail-island pointer-events-auto"
      aria-label={`Details: ${title}`}
    >
      <div className="detail-island__head">
        <div className="detail-island__badges">
          {/* Any non-SAP scope (outside, shop floor) reads as outside SAP; the
              band on the canvas names which group it is in. */}
          <span className="detail-island__badge" data-scope={scope}>
            {scope === "sap" ? "Inside SAP" : "Outside SAP"}
          </span>
          {node.unused && (
            <span className="detail-island__badge" data-unused="">
              Not used by RPC
            </span>
          )}
        </div>
        <button
          type="button"
          className="detail-island__close"
          onClick={onClose}
          aria-label="Close details"
        >
          ×
        </button>
      </div>

      <h2 ref={headingRef} tabIndex={-1} className="detail-island__title">
        {title}
      </h2>
      {node.note && <p className="detail-island__note">{node.note}</p>}
      {node.unused && <p className="detail-island__unused">{node.unused}</p>}
      {detail.body && <p className="detail-island__body">{detail.body}</p>}

      {sections.length > 0 && (
        <dl className="detail-island__sections">
          {sections.map(([key, label]) => (
            <div key={key} data-section={key}>
              <dt>{label}</dt>
              <dd>{detail[key]}</dd>
            </div>
          ))}
        </dl>
      )}

      {node.href && (
        <button
          type="button"
          className="island-button detail-island__open"
          onClick={() => onOpen(node.id, node.href)}
        >
          Open tables →
        </button>
      )}
    </section>
  );
}
