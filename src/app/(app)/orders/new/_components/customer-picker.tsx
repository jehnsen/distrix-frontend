"use client";

import { useState } from "react";
import { Building2, ChevronDown } from "lucide-react";

import type { CustomerOption } from "@/lib/api";
import { fuzzyScore } from "@/lib/command-registry";
import { formatMoney } from "@/lib/format";
import { termsLabel } from "@/types/common";
import { cn } from "@/lib/utils";
import { Money } from "@/components/distrix/money";
import { Field, FieldGrid, InlineBanner } from "@/components/distrix/primitives";
import { UtilisationBar } from "@/components/distrix/utilisation-bar";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Picking a customer surfaces terms, credit headroom and aging on the spot
 * (§7). The clerk should never have to open the customer record to find out
 * whether this order can go out.
 */
export function CustomerPicker({
  customers,
  value,
  onSelect,
  invalid,
}: {
  customers: CustomerOption[];
  value: CustomerOption | undefined;
  onSelect: (customer: CustomerOption) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const matches = customers
    .map((customer) => ({
      customer,
      score: Math.max(
        fuzzyScore(query, customer.code) ?? -Infinity,
        fuzzyScore(query, customer.name) ?? -Infinity,
      ),
    }))
    .filter((row) => row.score > -Infinity)
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);

  return (
    <div className="flex flex-col gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              data-invalid={invalid || undefined}
              className={cn(
                "flex h-9 w-full items-center gap-2.5 rounded-md border bg-surface px-3 text-left",
                "transition-colors outline-none",
                "focus-visible:border-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                invalid ? "border-overdue" : "border-border hover:border-border-strong",
              )}
            >
              <Building2 size={16} strokeWidth={1.75} className="shrink-0 text-ink-muted" />
              {value ? (
                <>
                  <span className="font-mono text-sm text-ink-muted">{value.code}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{value.name}</span>
                </>
              ) : (
                <span className="flex-1 text-ink-muted">Choose a customer…</span>
              )}
              <ChevronDown size={14} strokeWidth={1.75} className="shrink-0 text-ink-muted" />
            </button>
          }
        />
        <PopoverContent align="start" className="w-[40rem] max-w-[calc(100vw-2rem)] p-0">
          <Command shouldFilter={false} loop>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Customer code or name…"
            />
            <CommandList>
              <CommandEmpty>No customer matches that.</CommandEmpty>
              {matches.map(({ customer }) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id}
                  onSelect={() => {
                    onSelect(customer);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="h-11"
                >
                  <span className="w-16 shrink-0 font-mono text-sm text-ink-muted">
                    {customer.code}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{customer.name}</span>
                    <span className="truncate text-xs text-ink-muted">
                      {termsLabel(customer.terms)} · {customer.salesRepName}
                    </span>
                  </span>
                  {/* Headroom is the number that decides whether to proceed. */}
                  <span className="w-28 shrink-0 text-right">
                    <Money
                      amount={customer.headroom}
                      tone={customer.headroom < 0 ? "variance" : "plain"}
                      className="text-sm"
                    />
                    <span className="block text-xs text-ink-muted">headroom</span>
                  </span>
                  {customer.pastDue > 0 && (
                    <span className="w-24 shrink-0 text-right">
                      <Money amount={customer.pastDue} tone="variance" className="text-sm" />
                      <span className="block text-xs text-ink-muted">past due</span>
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value && <CustomerSummary customer={value} />}
    </div>
  );
}

function CustomerSummary({ customer }: { customer: CustomerOption }) {
  const utilisation =
    customer.creditLimit === 0 ? 0 : customer.currentBalance / customer.creditLimit;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-sunken/40 p-3">
      <FieldGrid columns={4}>
        <Field label="Terms">{termsLabel(customer.terms)}</Field>
        <Field label="Credit limit">
          <Money amount={customer.creditLimit} symbol />
        </Field>
        <Field label="Balance">
          <Money
            amount={customer.currentBalance}
            symbol
            tone={customer.isOverLimit ? "variance" : "plain"}
          />
        </Field>
        <Field label="Headroom">
          <Money
            amount={customer.headroom}
            symbol
            weight="medium"
            tone={customer.headroom < 0 ? "variance" : "plain"}
          />
        </Field>
      </FieldGrid>

      <UtilisationBar value={utilisation} />

      {customer.isOverLimit ? (
        <InlineBanner tone="overdue" title="This account is over its credit limit">
          The order can be taken and saved as a draft, but confirming it needs a
          manager&apos;s approval.
        </InlineBanner>
      ) : customer.pastDue > 0 ? (
        <InlineBanner tone="partial" title="This account has money past due">
          {formatMoney(customer.pastDue, { symbol: true })} is overdue
          {customer.worstBucket ? ` (worst bucket ${customer.worstBucket})` : ""}. Collect
          before extending more credit.
        </InlineBanner>
      ) : null}
    </div>
  );
}
