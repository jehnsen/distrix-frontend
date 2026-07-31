"use client";

import { useCallback, useMemo, useRef } from "react";
import { Plus } from "lucide-react";

import { formatQty } from "@/lib/format";
import {
  emptyLine,
  summariseLines,
  type LineItem,
  type LineProduct,
} from "@/lib/line-items";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/distrix/kbd";
import { Money } from "@/components/distrix/money";
import { LineItemRow } from "@/components/distrix/line-items/line-item-row";
import { Button } from "@/components/ui/button";

const HEADERS = [
  { label: "Product", align: "left", width: "auto" },
  { label: "Qty", align: "right", width: "6rem" },
  { label: "UoM", align: "left", width: "5rem" },
  { label: "Unit price", align: "right", width: "8rem" },
  { label: "Disc %", align: "right", width: "5.5rem" },
  { label: "VAT", align: "left", width: "5rem" },
  { label: "Line total", align: "right", width: "9rem" },
] as const;

/**
 * Keyboard-first line grid (§6.4). Tab moves right through the native tab
 * order, Enter adds a row below, ⌘Backspace deletes the row under the cursor.
 * Totals recompute on every keystroke and are announced politely.
 */
export function LineItemsEditor({
  lines,
  products,
  onChange,
  readOnly = false,
  className,
}: {
  lines: LineItem[];
  products: LineProduct[];
  onChange: (lines: LineItem[]) => void;
  readOnly?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const summary = summariseLines(lines);

  const update = useCallback(
    (id: string, patch: Partial<LineItem>) => {
      onChange(lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
    },
    [lines, onChange],
  );

  const addAfter = useCallback(
    (id?: string) => {
      const next = emptyLine();
      if (!id) {
        onChange([...lines, next]);
      } else {
        const index = lines.findIndex((line) => line.id === id);
        onChange([...lines.slice(0, index + 1), next, ...lines.slice(index + 1)]);
      }
      // Focus the new row's product picker once React has committed it.
      requestAnimationFrame(() => {
        containerRef.current
          ?.querySelector<HTMLButtonElement>(`[data-row-id="${next.id}"] button`)
          ?.focus();
      });
    },
    [lines, onChange],
  );

  const remove = useCallback(
    (id: string) => {
      // Always leave one row so the grid never collapses to nothing.
      const remaining = lines.filter((line) => line.id !== id);
      onChange(remaining.length > 0 ? remaining : [emptyLine()]);
    },
    [lines, onChange],
  );

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (readOnly) return;
    const rowId = (event.target as HTMLElement)
      .closest<HTMLElement>("[data-row-id]")
      ?.dataset["rowId"];

    if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      addAfter(rowId);
      return;
    }
    if (event.key === "Backspace" && (event.metaKey || event.ctrlKey) && rowId) {
      event.preventDefault();
      remove(rowId);
    }
  }

  return (
    <div
      ref={containerRef}
      onKeyDown={onKeyDown}
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-surface shadow-raised",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <h3 className="text-xl font-semibold tracking-heading text-ink">Lines</h3>
        {!readOnly && (
          <p className="hidden items-center gap-2 text-xs text-ink-muted sm:flex">
            <Kbd keys={["↵"]} /> add row
            <Kbd keys={["⌘", "⌫"]} /> delete row
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] border-separate border-spacing-0 text-base">
          <thead>
            <tr>
              {HEADERS.map((header) => (
                <th
                  key={header.label}
                  scope="col"
                  style={{ width: header.width }}
                  className={cn(
                    "th-label h-8 border-b border-border bg-surface-sunken px-3",
                    header.align === "right" && "text-right",
                  )}
                >
                  {header.label}
                </th>
              ))}
              {!readOnly && (
                <th
                  scope="col"
                  style={{ width: "2.5rem" }}
                  className="border-b border-border bg-surface-sunken"
                >
                  <span className="sr-only">Remove line</span>
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {lines.map((line) => (
              <LineItemRow
                key={line.id}
                line={line}
                product={line.productId ? productById.get(line.productId) : undefined}
                products={products}
                readOnly={readOnly}
                onUpdate={(patch) => update(line.id, patch)}
                onRemove={() => remove(line.id)}
              />
            ))}
          </tbody>

          <tfoot>
            <tr aria-live="polite">
              <td className="th-label px-3 py-2">
                {summary.lineCount} line{summary.lineCount === 1 ? "" : "s"}
              </td>
              <td className="px-1.5 py-2 text-right font-mono text-sm text-ink-muted tabular-nums">
                {formatQty(summary.totalQty)}
              </td>
              <td colSpan={3} />
              <td className="th-label px-1.5 py-2">Subtotal</td>
              <td className="px-3 py-2 text-right">
                <Money amount={summary.subtotal} weight="semibold" className="text-lg" />
              </td>
              {!readOnly && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      {!readOnly && (
        <div className="border-t border-border p-1.5">
          <Button variant="ghost" size="sm" onClick={() => addAfter()}>
            <Plus size={16} strokeWidth={1.75} />
            Add line
          </Button>
        </div>
      )}
    </div>
  );
}
