"use client";

import { ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Shared trigger so every filter control reads as one family. */
export function FilterTrigger({
  label,
  value,
  active,
}: {
  label: string;
  value?: string | undefined;
  active: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        // Dashed until applied, solid once it is — a filtered list is obvious.
        "gap-1.5 border-dashed",
        active && "border-solid border-accent/40 bg-accent-wash text-accent",
      )}
    >
      <span className={active ? "text-accent" : "text-ink-muted"}>{label}</span>
      {active && value && <span className="font-medium">{value}</span>}
      <ChevronDown size={14} strokeWidth={1.75} className="text-ink-muted" />
    </Button>
  );
}

export function SearchFilter({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Search
        aria-hidden
        size={16}
        strokeWidth={1.75}
        className="pointer-events-none absolute top-2 left-2.5 text-ink-muted"
      />
      <Input
        // `/` focuses this from anywhere on the page.
        data-search-input="true"
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-label={placeholder}
        className="w-56 pl-8 lg:w-64"
      />
    </div>
  );
}
