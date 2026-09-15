"use client";
import { createContext, useContext } from "react";
import { Handle, Position } from "@xyflow/react";
import { HEADER_H, ROW_H } from "@/lib/lineageLayout";

// FlowCanvas provides a setter; hovering a row isolates that row's edges.
export const RowHoverContext = createContext(() => {});

export const HOW_LABEL = {
  typed: "typed",
  read: "read",
  calc: "calc",
  fallback: "fallback",
  lookup: "lookup",
};

/**
 * A table card for the column-lineage view: a header plus one fixed-height row
 * per column. Each row carries its own handle — source handles on the right of
 * table cards, target handles on the left of the output card — so edges run
 * column to column rather than card to card.
 */
export default function ColumnCardNode({ id, data }) {
  const setHoveredRow = useContext(RowHoverContext);
  const isOutput = data.side === "output";

  return (
    <div
      className="column-card"
      data-side={data.side}
      style={{ width: data.width, height: data.height }}
    >
      <div className="column-card__header" style={{ height: HEADER_H }}>
        {String(data.title)
          .split("\n")
          .map((line, i) => (
            <span key={i}>{line}</span>
          ))}
      </div>

      {data.rows.map((row) => (
        <div
          key={row.id}
          className="column-card__row"
          data-row={row.id}
          data-how={row.how}
          style={{ height: ROW_H }}
          onMouseEnter={() => setHoveredRow({ node: id, row: row.id })}
          onMouseLeave={() => setHoveredRow(null)}
        >
          {isOutput && (
            <Handle type="target" position={Position.Left} id={row.id} isConnectable={false} />
          )}

          <span className="column-card__name">{row.label}</span>

          {isOutput && (
            <>
              <span className="column-card__how" data-how={row.how}>
                {row.negated ? "− " : ""}
                {HOW_LABEL[row.how]}
              </span>
              <span className="column-card__expr" title={row.expr}>
                {row.how === "typed" ? `= ${row.expr}` : row.expr}
              </span>
            </>
          )}

          {!isOutput && (
            <Handle type="source" position={Position.Right} id={row.id} isConnectable={false} />
          )}
        </div>
      ))}
    </div>
  );
}
