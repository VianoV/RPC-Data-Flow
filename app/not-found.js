import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start gap-3 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        No such diagram
      </h1>
      <p className="text-sm opacity-80">
        That process page doesn&apos;t exist in the data map.
      </p>
      <Link
        href="/"
        className="text-sm underline underline-offset-4 opacity-80 hover:opacity-100"
      >
        ← Back to the overview
      </Link>
    </main>
  );
}
