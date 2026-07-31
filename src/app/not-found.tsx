import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="flex max-w-md flex-col items-start gap-3">
        <span className="font-mono text-sm text-ink-muted">404</span>
        <h1 className="text-3xl font-semibold tracking-heading text-ink">
          No page at this address
        </h1>
        <p className="text-base text-ink-muted">
          The link may be stale, or the document number in it may have been voided. Search
          for it instead — typing a document number in the command palette jumps straight
          to the record.
        </p>
        <Link
          href="/"
          className="mt-1 inline-flex h-8 items-center rounded-md bg-accent px-3 text-base font-medium text-accent-ink transition-colors hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        >
          Back to Distrix
        </Link>
      </div>
    </div>
  );
}
