"use client";

/**
 * Background for one half of the consolidated main page ("Outside SAP Business
 * One" / "Inside SAP Business One"). Sized by lib/layout.js; it has no handles
 * and ignores the pointer, so clicks fall through to the pane.
 */
export default function BandNode({ data }) {
  return (
    <div
      className="band"
      data-scope={data.scope}
      style={{ width: data.width, height: data.height }}
    >
      <span className="band__label">{data.label}</span>
    </div>
  );
}
