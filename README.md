# RPC Data Flow

An interactive map of how data flows end to end into `RPC_JobBreakdown` — from human
input, through SAP Business One records, to the consolidated report.

Built with Next.js (App Router), React Flow (`@xyflow/react`) and dagre auto-layout.
Dark and light mode follow the operating system preference; there is no toggle.

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

| File | Role |
| --- | --- |
| `data/diagrams.js` | All diagram content (the only file you normally edit) |
| `lib/layout.js` | dagre auto-layout, node sizing, handle positions |
| `components/flowCanvas.jsx` | The React Flow canvas |
| `components/processNode.jsx` | Custom node: multi-line labels, colour by `kind` |
| `components/diagramPage.jsx` | Shared page shell (heading, doc, canvas, back link) |

## Diagram data schema

Diagrams are authored in draw.io and converted to JS. Any conversion must produce
exactly this shape:

```js
diagrams[key] = {
  title: string,          // page heading
  doc:   string,          // prose paragraph shown above the canvas
  dir?:  "TB" | "LR",     // dagre direction, default "TB"; use "LR" for long flows
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
- `kind` only sets the accent colour. Omit it for a neutral node.
- Never write `position` or `width` — `lib/layout.js` computes both.

`kind` colours: `human` amber · `document` blue · `table` teal · `view` violet ·
`output` green.

## Deploying

The site is fully static — no server code, no environment variables. Import the repo
into [Vercel](https://vercel.com/new); the framework and `next build` are auto-detected.
