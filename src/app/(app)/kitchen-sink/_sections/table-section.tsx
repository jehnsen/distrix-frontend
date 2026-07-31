"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Ban, Printer, Send } from "lucide-react";
import { toast } from "sonner";

import {
  codeColumn,
  dateColumn,
  moneyColumn,
  selectColumn,
  statusColumn,
} from "@/components/distrix/data-table/columns";
import { DataTable } from "@/components/distrix/data-table/data-table";
import { FilterBar } from "@/components/distrix/filter-bar/filter-bar";
import { EmptyState } from "@/components/distrix/states";
import { Button } from "@/components/ui/button";
import {
  DEMO_FILTERS,
  DEMO_INVOICES,
  DEMO_SAVED_VIEWS,
  type DemoInvoice,
} from "@/app/(app)/kitchen-sink/_fixtures";

type Mode = "data" | "loading" | "error" | "empty";

export function TableSection() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("data");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const columns = useMemo<ColumnDef<DemoInvoice>[]>(
    () => [
      selectColumn<DemoInvoice>(),
      codeColumn({ id: "siNo", label: "Invoice no.", accessor: (row) => row.siNo }),
      {
        id: "customer",
        accessorFn: (row) => row.customer,
        header: "Customer",
        meta: { label: "Customer", priority: "essential" },
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-ink">{row.original.customer}</span>
            <span className="font-mono text-xs text-ink-muted">
              {row.original.customerCode}
            </span>
          </div>
        ),
      },
      dateColumn({
        id: "invoiceDate",
        label: "Invoiced",
        accessor: (row) => row.invoiceDate,
        priority: "secondary",
      }),
      dateColumn({ id: "dueDate", label: "Due", accessor: (row) => row.dueDate }),
      {
        id: "rep",
        accessorFn: (row) => row.rep,
        header: "Sales rep",
        meta: { label: "Sales rep", priority: "secondary" },
      },
      moneyColumn({ id: "amount", label: "Amount", accessor: (row) => row.amount }),
      moneyColumn({
        id: "balance",
        label: "Balance",
        accessor: (row) => row.balance,
        tone: (row) => (row.status === "overdue" ? "variance" : "plain"),
      }),
      statusColumn({ accessor: (row) => row.status }),
    ],
    [],
  );

  const rows = mode === "data" ? DEMO_INVOICES : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="th-label mr-1">Force state</span>
        {(["data", "loading", "error", "empty"] as Mode[]).map((option) => (
          <Button
            key={option}
            size="xs"
            variant={mode === option ? "subtle" : "outline"}
            onClick={() => setMode(option)}
            className="capitalize"
          >
            {option}
          </Button>
        ))}
      </div>

      <DataTable<DemoInvoice>
        data={rows}
        columns={columns}
        getRowId={(row) => row.id}
        what="open invoices"
        exportFilename="invoices-open"
        stickyFirstColumn
        enableSelection
        isLoading={mode === "loading"}
        error={
          mode === "error"
            ? { message: "The invoice service did not respond within 5 seconds." }
            : null
        }
        onRetry={() => setMode("data")}
        emptyState={
          <EmptyState
            title="No invoices yet"
            description="Invoices are created from delivered orders. Cut a delivery receipt first, then invoice it."
            action={
              <Button size="sm" onClick={() => router.push("/deliveries")}>
                Go to deliveries
              </Button>
            }
          />
        }
        onRowOpen={(row) => toast.info(`Would open ${row.siNo}`)}
        savedViews={DEMO_SAVED_VIEWS}
        basePath="/kitchen-sink"
        toolbar={<FilterBar filters={DEMO_FILTERS} />}
        bulkActions={(selected, clear) => (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                toast.success(`Statement queued for ${selected.length} invoices`);
                clear();
              }}
            >
              <Send size={16} strokeWidth={1.75} />
              Send statement
            </Button>
            <Button size="sm" variant="outline">
              <Printer size={16} strokeWidth={1.75} />
              Print
            </Button>
            <Button size="sm" variant="destructive-outline">
              <Ban size={16} strokeWidth={1.75} />
              Void
            </Button>
          </>
        )}
        pagination={{
          pageIndex,
          pageSize,
          total: 47,
          onPageChange: setPageIndex,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPageIndex(0);
          },
        }}
      />
    </div>
  );
}
