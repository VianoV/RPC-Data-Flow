# RPC Data Flow

An interactive map of how data flows end to end into `RPC_JobBreakdown` — from human
input, through SAP Business One records, to the consolidated report.

Built with Next.js (App Router), React Flow (`@xyflow/react`) and dagre auto-layout.

- The canvas is full-screen; the title, description and controls float over it.
- Clicking a node zooms into it, then opens that node's drill-down page.
- Hovering a node isolates its flow — everything unrelated fades out.
- Each flow has its own colour, shared by the line and the node it leaves.
- Dark/light: follows the OS by default, and the toggle (top right) overrides it.
  The choice is saved in `localStorage` and applied before first paint.

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

All content lives in **`data/diagrams.js`** — there is no database and no API.

- `diagrams.root` is the overview, rendered at `/`.
- Every other key is a drill-down page at `/process/<key>`, prerendered at build time
  by `generateStaticParams` in `app/process/[slug]/page.js`.
- Node positions are **computed**, never hand-placed: `lib/layout.js` runs dagre and
  sizes each node from its label.
- Clicking the `RPC_JobBreakdown (VIEW)` node opens `/process/job-breakdown`: the view's
  12 UNION ALL blocks, grouped by `AREA`. Each block opens a page showing its tables,
  joins (edge label = join type · key), `WHERE` filter and output rules. They're built
  by `block()` in `data/diagrams.js` from `RPC_JobBreakdown_detailed.md`.
- Every block page has a **Joins | Columns** toggle. **Columns** is the column lineage: the
  source columns the block reads (left) wired to its 29 output columns (right). Lines are
  coloured by how the value is made (read, calc, fallback/rule, lookup) and dashed when
  negated; constants have no line. Hover a row to isolate its lines. The view is kept in the
  URL hash (`#columns`), so it survives reloads and can be linked. The data lives in
  `data/jobBreakdownColumns.js`.

| File | Role |
| --- | --- |
| `data/diagrams.js` | All diagram content (the only file you normally edit) |
| `lib/layout.js` | dagre auto-layout, node sizing, handle positions |
| `components/flowCanvas.jsx` | The React Flow canvas |
| `components/processNode.jsx` | Custom node: multi-line labels, flow/`kind` colour |
| `components/columnCardNode.jsx` | Column-lineage card: one row + handle per column |
| `lib/lineageLayout.js` | Positions lineage cards and wires column → column edges |
| `data/jobBreakdownColumns.js` | How each block produces its 29 output columns |
| `components/diagramPage.jsx` | Shared page shell (islands over the canvas) |
| `components/themeToggle.jsx` | Dark/light button |
| `components/useResolvedTheme.js` | Subscribes to `<html data-theme>` |

## Diagram data schema

Diagrams are authored in draw.io and converted to JS. Any conversion must produce
exactly this shape:

```js
diagrams[key] = {
  title: string,          // page heading
  doc:   string,          // prose paragraph shown above the canvas
  dir?:  "TB" | "LR",     // dagre direction, default "TB"; use "LR" for long flows
  parent?: string,        // diagram key the back link returns to, default "root"
  related?: [{ href: string, label: string }], // text links under the doc prose
  lineage?: { columns: [{ name, how, expr, from?, negated? }] }, // adds the Columns view
  nodes: [{
    id:    string,        // unique within this diagram
    label: string,        // "\n" renders as a real line break
    kind?: "human" | "document" | "table" | "view" | "output",
    href?: string,        // makes the node clickable, e.g. "/process/<key>"
    note?: string,        // optional smaller detail line under the label
  }],
  edges: [{
    source: string,       // node id
    target: string,       // node id
    label?: string,       // optional text drawn on the edge
  }],
};
```

Rules:

- A node's `href` must match another diagram key exactly (`/process/<key>`), or the
  link 404s.
- `parent` must be an existing diagram key. Set it on drill-downs of a diagram other
  than `root` (e.g. the `jb-*` block pages use `job-breakdown`) so the back link returns there.
- `root` is the actual SAP B1 document flow:
  - A node connects to `RPC_JobBreakdown` only if the view's SQL reads it
    (see `RPC_JobBreakdown_detailed.md`), and its `note` names that block.
  - Automatic journal entries are **not drawn**. Each document that posts one says so
    in its `doc`, with its TransType (e.g. AR Invoice = 13, Goods Receipt PO = 20).
    The view ignores them: block 5 only reads manual journals (TransType 30).
  - Legacy history (blocks 8–11) is not on `root`; it appears only on the
    `job-breakdown` page.
- `kind` only sets the accent colour. Omit it for a neutral node.
- Never write `position` or `width` — `lib/layout.js` computes both.

`kind` colours: `human` amber · `document` blue · `table` teal · `view` violet ·
`output` green.

### Flow colours

Any node with an outgoing edge is assigned one of twelve flow colours
(`--flow-1`..`--flow-12` in `globals.css`), in declaration order. The node's top
border and every line leaving it share that colour, so a line can be traced back
to its source. `kind` only shows on nodes that start no flow.

The twelve hues are a validated categorical palette — worst adjacent
colour-blind ΔE 14.6 light / 13.4 dark (target ≥8), normal-vision ΔE 24.9 / 24.6
(floor ≥15). Dark mode uses its own steps rather than a flip of the light ones.
If you change them, re-validate rather than eyeballing. Colour is never the only
cue: every line ends at a labelled node, and hovering isolates one flow.

## Deploying

The site is fully static — no server code, no environment variables. Import the repo
into [Vercel](https://vercel.com/new); the framework and `next build` are auto-detected.
