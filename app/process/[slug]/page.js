import { notFound } from "next/navigation";
import DiagramPage from "@/components/diagramPage";
import { diagrams } from "@/data/diagrams";

// Prerender every drill-down page at build time. "root" is the overview at "/".
export function generateStaticParams() {
  return Object.keys(diagrams)
    .filter((slug) => slug !== "root")
    .map((slug) => ({ slug }));
}

// Next 16: `params` is a Promise and must be awaited.
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const diagram = diagrams[slug];
  if (!diagram) return {};
  return { title: `${diagram.title} — RPC Data Flow`, description: diagram.doc };
}

export default async function ProcessPage({ params }) {
  const { slug } = await params;
  const diagram = diagrams[slug];

  if (!diagram || slug === "root") notFound();

  return (
    <DiagramPage
      diagram={diagram}
      back2Href="/"
      backLabel={diagrams.root.title}
    />
  );
}
