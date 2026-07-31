"use client";

import { Check } from "lucide-react";

import type { FilterOption } from "@/lib/filters";
import { cn } from "@/lib/utils";
import { FilterTrigger } from "@/components/distrix/filter-bar/filter-trigger";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function MultiFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const active = selected.length > 0;
  const onlyLabel =
    selected.length === 1
      ? options.find((option) => option.value === selected[0])?.label
      : `${selected.length}`;

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        render={<FilterTrigger label={label} active={active} value={onlyLabel} />}
      />
      <PopoverContent align="start" className="w-60 p-1">
        <ul role="list" className="max-h-72 overflow-y-auto">
          {options.map((option) => (
            <li key={option.value}>
              <label className="flex h-8 cursor-pointer items-center gap-2.5 rounded-md px-2 text-base hover:bg-surface-sunken">
                <Checkbox
                  checked={selected.includes(option.value)}
                  onCheckedChange={() => toggle(option.value)}
                />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.hint && (
                  <span className="font-mono text-xs text-ink-muted tabular-nums">
                    {option.hint}
                  </span>
                )}
              </label>
            </li>
          ))}
        </ul>
        {active && (
          <div className="border-t border-border pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => onChange([])}
            >
              Clear {label.toLowerCase()}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function ComboboxFilter({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const active = value !== "";
  const selected = options.find((option) => option.value === value);

  return (
    <Popover>
      <PopoverTrigger
        render={<FilterTrigger label={label} active={active} value={selected?.label} />}
      />
      <PopoverContent align="start" className="w-72 p-1">
        <ul role="list" className="max-h-72 overflow-y-auto">
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => onChange(option.value === value ? "" : option.value)}
                className={cn(
                  "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-base",
                  "outline-none hover:bg-surface-sunken focus-visible:bg-surface-sunken",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.hint && (
                  <span className="font-mono text-xs text-ink-muted tabular-nums">
                    {option.hint}
                  </span>
                )}
                {option.value === value && (
                  <Check size={16} strokeWidth={1.75} className="text-accent" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
