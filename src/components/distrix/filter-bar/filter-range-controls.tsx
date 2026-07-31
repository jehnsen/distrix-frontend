"use client";

import { formatMoney } from "@/lib/format";
import { parseMoney, type Centavos } from "@/lib/money";
import { FilterTrigger } from "@/components/distrix/filter-bar/filter-trigger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DateRangeFilter({
  label,
  from,
  to,
  onChange,
}: {
  label: string;
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const active = from !== "" || to !== "";

  return (
    <Popover>
      <PopoverTrigger render={<FilterTrigger label={label} active={active} />} />
      <PopoverContent align="start" className="w-64 p-3">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-date-from">From</Label>
            <Input
              id="filter-date-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => onChange(event.target.value, to)}
              className="font-mono"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-date-to">To</Label>
            <Input
              id="filter-date-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => onChange(from, event.target.value)}
              className="font-mono"
            />
          </div>
          {active && (
            <Button variant="ghost" size="sm" onClick={() => onChange("", "")}>
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Amounts are held in the URL as centavos, so the query never carries a float. */
export function AmountRangeFilter({
  label,
  min,
  max,
  onChange,
}: {
  label: string;
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const active = min !== null || max !== null;

  return (
    <Popover>
      <PopoverTrigger render={<FilterTrigger label={label} active={active} />} />
      <PopoverContent align="start" className="w-60 p-3">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-amount-min">At least</Label>
            <Input
              id="filter-amount-min"
              numeric
              inputMode="decimal"
              placeholder="0.00"
              defaultValue={min === null ? "" : formatMoney(min as Centavos, { parens: false })}
              onBlur={(event) => onChange(parseMoney(event.target.value), max)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-amount-max">At most</Label>
            <Input
              id="filter-amount-max"
              numeric
              inputMode="decimal"
              placeholder="0.00"
              defaultValue={max === null ? "" : formatMoney(max as Centavos, { parens: false })}
              onBlur={(event) => onChange(min, parseMoney(event.target.value))}
            />
          </div>
          {active && (
            <Button variant="ghost" size="sm" onClick={() => onChange(null, null)}>
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
