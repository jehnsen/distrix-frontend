"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { findNavGroup, findNavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

interface Crumb {
  label: string;
  href?: string;
  /** Document numbers, SKUs and codes render mono. */
  mono?: boolean;
}

/** SO-2026-0142, DR-000188, SKU codes — anything that is an identifier. */
const IDENTIFIER = /^[A-Z]{2,4}[-–]?[\dA-Z-]{3,}$/;

function buildCrumbs(pathname: string): Crumb[] {
  const group = findNavGroup(pathname);
  const item = findNavItem(pathname);
  if (!item) return [];

  const crumbs: Crumb[] = [];
  if (group) crumbs.push({ label: group.label });
  crumbs.push({ label: item.label, href: item.href });

  // Everything after the matched nav route becomes a trailing crumb.
  const rest = pathname
    .slice(item.href.length)
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent);

  rest.forEach((segment, index) => {
    const isLast = index === rest.length - 1;
    const mono = IDENTIFIER.test(segment);
    crumbs.push({
      label: mono ? segment : segment.replace(/-/g, " "),
      mono,
      href: isLast ? undefined : `${item.href}/${rest.slice(0, index + 1).join("/")}`,
    });
  });

  return crumbs;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1" role="list">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 && (
                <ChevronRight
                  aria-hidden
                  size={14}
                  strokeWidth={1.75}
                  className="shrink-0 text-border-strong"
                />
              )}
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className={cn(
                    "truncate rounded-sm px-0.5 text-base text-ink-muted capitalize",
                    "transition-colors hover:text-ink",
                    "outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                    crumb.mono && "font-mono normal-case",
                  )}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "truncate px-0.5 text-base capitalize",
                    isLast ? "font-medium text-ink" : "text-ink-muted",
                    crumb.mono && "font-mono normal-case",
                  )}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
