"use client";
import { Handle } from "@xyflow/react";

export default function ProcessNode({ data }) {
  const lines = String(data.label ?? "").split("\n");
  const noteLines = data.note ? String(data.note).split("\n") : [];
  const clickable = Boolean(data.href);

  return (
    <div
      className={`process-node${clickable ? " is-clickable" : ""}`}
      data-kind={data.kind ?? "default"}
      style={{ width: data.width, height: data.height }}
      title={clickable ? "Click to drill in" : undefined}
    >
      <Handle type="target" position={data.targetPosition} />

      <div className="process-node__label">
        {lines.map((line, i) => (
          <span key={i}>{line}</span>
        ))}
      </div>

      {noteLines.length > 0 && (
        <div className="process-node__note">
          {noteLines.map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </div>
      )}

      <Handle type="source" position={data.sourcePosition} />
    </div>
  );
}
