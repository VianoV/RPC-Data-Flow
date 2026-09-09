import DiagramPage from "@/components/diagramPage";
import { diagrams } from "@/data/diagrams";

export default function Home() {
  return <DiagramPage diagram={diagrams.root} />;
}
