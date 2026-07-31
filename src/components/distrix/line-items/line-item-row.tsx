"use client";

import { AlertTriangle, Trash2 } from "lucide-react";

import { formatMoney, formatQty } from "@/lib/format";
import {
  applyProduct,
  computeLine,
  shortfall,
  VAT_TYPE_LABEL,
  VAT_TYPE_SHORT,
  type LineItem,
  type LineProduct,
  type VatType,
} from "@/lib/line-items";
import { parseMoney, type Centavos } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Money } from "@/components/distrix/money";
import { ProductCombobox } from "@/components/distrix/line-items/product-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const VAT_TYPES: VatType[] = ["vatable", "exempt", "zero-rated"];

const CELL = "border-b border-border px-1.5 py-0 align-middle";
const NUM_INPUT = "h-7 border-transparent bg-transparent px-1.5 hover:border-border";

export function LineItemRow({
  line,
  product,
  products,
  readOnly,
  onUpdate,
  onRemove,
}: {
  line: LineItem;
  product: LineProduct | undefined;
  products: LineProduct[];
  readOnly: boolean;
  onUpdate: (patch: Partial<LineItem>) => void;
  onRemove: () => void;
}) {
  const calc = computeLine(line);
  const over = shortfall(line, product);
  const warningId = `${line.id}-stock-warning`;

  return (
    <tr data-row-id={line.id} className="group/line">
      <td className={CELL}>
        <ProductCombobox
          products={products}
          value={product}
          disabled={readOnly}
          onSelect={(picked) => onUpdate(applyProduct(line, picked))}
        />
      </td>

      <td className={cn(CELL, "text-right")}>
        <Input
          numeric
          inputMode="numeric"
          readOnly={readOnly}
          aria-label="Quantity"
          aria-describedby={over > 0 ? warningId : undefined}
          aria-invalid={over > 0 || undefined}
          value={line.qty === 0 ? "" : String(line.qty)}
          onChange={(event) =>
            onUpdate({ qty: Math.max(0, Number(event.target.value) || 0) })
          }
          className={cn(NUM_INPUT, over > 0 && "border-partial text-partial")}
        />
        {/* Warn, never block: an order for stock arriving tomorrow is valid. */}
        {over > 0 && (
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  id={warningId}
                  className="mt-0.5 flex items-center justify-end gap-1 text-xs text-partial"
                >
                  <AlertTriangle size={11} strokeWidth={2} />
                  {formatQty(over)} over
                </span>
              }
            />
            <TooltipContent>
              Only {formatQty(product?.available ?? 0)} {product?.uom} available. The order
              can still be taken.
            </TooltipContent>
          </Tooltip>
        )}
      </td>

      <td className={CELL}>
        <span className="px-1.5 font-mono text-sm text-ink-muted">{line.uom || "—"}</span>
      </td>

      <td className={cn(CELL, "text-right")}>
        <Input
          numeric
          inputMode="decimal"
          readOnly={readOnly}
          aria-label="Unit price"
          // Keyed so an externally changed price re-seeds the uncontrolled field.
          key={`${line.id}-${line.unitPrice}`}
          defaultValue={formatMoney(line.unitPrice, { parens: false })}
          onBlur={(event) =>
            onUpdate({ unitPrice: parseMoney(event.target.value) ?? (0 as Centavos) })
          }
          className={NUM_INPUT}
        />
      </td>

      <td className={cn(CELL, "text-right")}>
        <Input
          numeric
          inputMode="decimal"
          readOnly={readOnly}
          aria-label="Discount percent"
          placeholder="0"
          value={line.discountPct === 0 ? "" : String(line.discountPct)}
          onChange={(event) =>
            onUpdate({
              discountPct: Math.min(100, Math.max(0, Number(event.target.value) || 0)),
            })
          }
          className={NUM_INPUT}
        />
      </td>

      <td className={CELL}>
        {readOnly ? (
          <span className="px-1.5 font-mono text-sm text-ink-muted">
            {VAT_TYPE_SHORT[line.vatType]}
          </span>
        ) : (
          <Select
            value={line.vatType}
            onValueChange={(value) => {
              if (typeof value === "string") onUpdate({ vatType: value as VatType });
            }}
          >
            <SelectTrigger
              size="sm"
              aria-label="VAT type"
              className="h-7 w-full border-transparent bg-transparent hover:border-border"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VAT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {VAT_TYPE_LABEL[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </td>

      <td className={cn(CELL, "px-3 text-right")}>
        <Money amount={calc.total} weight="medium" />
      </td>

      {!readOnly && (
        <td className={cn(CELL, "text-center")}>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Remove line"
            onClick={onRemove}
            className="opacity-0 transition-opacity group-hover/line:opacity-100 focus-visible:opacity-100"
          >
            <Trash2 size={14} strokeWidth={1.75} />
          </Button>
        </td>
      )}
    </tr>
  );
}
