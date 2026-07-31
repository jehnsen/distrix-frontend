import { cn } from "@/lib/utils";

/**
 * Keyboard hint. Renders ⌘ on Apple platforms and Ctrl elsewhere — resolved on
 * the client only, so the server always paints the neutral form first.
 */
export function Kbd({
  keys,
  className,
}: {
  keys: readonly string[];
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {keys.map((key) => (
        <kbd
          key={key}
          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-xs border border-border bg-surface-sunken px-1 font-mono text-xs leading-none text-ink-muted"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
