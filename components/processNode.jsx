"use client";
import { Handle } from "@xyflow/react";

export default function ProcessNode({ data }) {
  const lines = String(data.label ?? "").split("\n");
  const noteLines = data.note ? String(data.note).split("\n") : [];
  const clickable = Boolean(data.detail || data.href);

  const className = [
    "process-node",
    clickable && "is-clickable",
    data.scope === "outside" && "is-outside",
    data.ghost && "is-ghost",
    data.unused && "is-unused",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      data-kind={data.kind ?? "default"}
      style={{
        width: data.width,
        height: data.height,
        // A node that starts a flow wears that flow's colour, so the line
        // leaving it and the node itself read as one thing.
        ...(data.flow ? { "--node-accent": `var(--flow-${data.flow})` } : null),
      }}
      title={
        data.detail ? "Click for details" : data.href ? "Click to drill in" : undefined
      }
    >
      <Handle type="target" position={data.targetPosition} />

      {data.tag && <span className="process-node__tag">{data.tag}</span>}

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
