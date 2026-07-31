"use client";

import { Check, ChevronsUpDown, Warehouse as WarehouseIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import type { Warehouse } from "@/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const ALL_WAREHOUSES_ID = "ALL";

interface Option {
  id: string;
  code: string;
  name: string;
  detail: string;
}

/**
 * Scopes stock figures and dispatch lists to one site. Shows the code in mono —
 * clerks say "PRQ", not "Parañaque Distribution Centre".
 */
export function WarehouseSwitcher({ warehouses }: { warehouses: Warehouse[] }) {
  const activeId = useUiStore((s) => s.activeWarehouseId);
  const setActiveWarehouse = useUiStore((s) => s.setActiveWarehouse);

  const options: Option[] = [
    {
      id: ALL_WAREHOUSES_ID,
      code: "ALL",
      name: "All warehouses",
      detail: `Consolidated across ${warehouses.length} sites`,
    },
    ...warehouses.map((warehouse) => ({
      id: warehouse.id,
      code: warehouse.code,
      name: warehouse.name,
      detail: `${warehouse.address.city}, ${warehouse.address.province}`,
    })),
  ];

  const active = options.find((option) => option.id === activeId) ?? options[0];
  if (!active) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2 pr-1.5">
            <WarehouseIcon size={16} strokeWidth={1.75} className="text-ink-muted" />
            <span className="font-mono text-sm font-medium">{active.code}</span>
            <span className="hidden max-w-32 truncate text-sm text-ink-muted lg:inline">
              {active.name}
            </span>
            <ChevronsUpDown size={14} strokeWidth={1.75} className="text-ink-muted" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Warehouse scope</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option, index) => (
          <div key={option.id}>
            {index === 1 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={() => setActiveWarehouse(option.id)}
              className="gap-2.5"
            >
              <span
                className={cn(
                  "w-8 shrink-0 font-mono text-sm",
                  option.id === active.id ? "text-accent" : "text-ink-muted",
                )}
              >
                {option.code}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-base text-ink">{option.name}</span>
                <span className="truncate text-xs text-ink-muted">{option.detail}</span>
              </span>
              {option.id === active.id && (
                <Check size={16} strokeWidth={1.75} className="ml-auto text-accent" />
              )}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
