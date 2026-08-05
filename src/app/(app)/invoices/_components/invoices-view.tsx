"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText, Plus } from "lucide-react";

import { listInvoices, type InvoiceFilters, type InvoiceListRow } from "@/lib/api";
import { AGING_BUCKETS, type AgingBucketKey } from "@/lib/aging";
import type { FilterDef } from "@/lib/filters";
import type { InvoiceStatus } from "@/types/invoice";
import { cn } from "@/lib/utils";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  readAmountRange,
  readArray,
  readDateRange,
  readString,
  useFilterValues,
  useListPagination,
} from "@/hooks/use-list-state";
import {
  codeColumn,
  dateColumn,
  moneyColumn,
  statusColumn,
} from "@/components/distrix/data-table/columns";
import { DataTable } from "@/components/distrix/data-table/data-table";
import type { SavedView } from "@/components/distrix/data-table/types";
import { FilterBar } from "@/components/distrix/filter-bar/filter-bar";
import { PageHeader } from "@/components/distrix/primitives";
import { EmptyState, NoResultsState } from "@/components/distrix/states";
import { Button } from "@/components/ui/button";

const FILTERS: FilterDef[] = [
  { kind: "search", key: "q", placeholder: "Invoice no., order or customer…" },
  {
    kind: "multi",
    key: "status",
    label: "Status",
    options: [
      { value: "open", label: "Open" },
      { value: "partial", label: "Partly paid" },
      { value: "overdue", label: "Overdue" },
      { value: "paid", label: "Paid" },
      { value: "cancelled", label: "Cancelled" },
    ],
  },
  {
    kind: "multi",
    key: "bucket",
    label: "Aging",
    options: AGING_BUCKETS.map((bucket) => ({ value: bucket.key, label: bucket.label })),
  },
  { kind: "dateRange", key: "due", label: "Due date" },
  { kind: "amountRange", key: "amount", label: "Amount" },
];

const SAVED_VIEWS: SavedView[] = [
  { id: "all", label: "All", query: "" },
  { id: "open", label: "Open", query: "openOnly=true" },
  { id: "overdue", label: "Overdue", query: "status=overdue" },
  { id: "90", label: "90+ days", query: "bucket=d90_plus" },
];

function invoiceColumns(): ColumnDef<InvoiceListRow>[] {
  return [
    codeColumn({ id: "siNo", label: "Invoice no.", accessor: (row) => row.siNo }),
    {
      id: "customer",
      accessorFn: (row) => row.customerName,
      header: "Customer",
      meta: { label: "Customer", priority: "essential" },
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-ink">{row.original.customerName}</span>
          <span className="font-mono text-xs text-ink-muted">
            {row.original.customerCode}
          </span>
        </div>
      ),
    },
    dateColumn({
      id: "invoiceDate",
      label: "Issued",
      accessor: (row) => row.invoiceDate,
      priority: "secondary",
    }),
    dateColumn({ id: "dueDate", label: "Due", accessor: (row) => row.dueDate }),
    {
      id: "daysOverdue",
      accessorFn: (row) => row.daysOverdue,
      header: "Age",
      meta: {
        label: "Days overdue",
        align: "right",
        mono: true,
        width: "6rem",
        priority: "essential",
        exportValue: (row) => row.daysOverdue,
      },
      cell: ({ row }) => {
        const { daysOverdue, balance } = row.original;
        if (balance === 0 || daysOverdue <= 0) {
          return <span className="font-mono text-ink-muted">—</span>;
        }
        const meta = AGING_BUCKETS.find((bucket) => bucket.key === row.original.bucket);
        return (
          <span className={cn("font-mono tabular-nums", meta?.text ?? "text-ink")}>
            {daysOverdue}d
          </span>
        );
      },
    },
    {
      id: "salesRep",
      accessorFn: (row) => row.salesRepName,
      header: "Sales rep",
      meta: { label: "Sales rep", width: "10rem", priority: "secondary" },
    },
    moneyColumn({ id: "amountDue", label: "Amount", accessor: (row) => row.amountDue }),
    moneyColumn({
      id: "amountPaid",
      label: "Settled",
      accessor: (row) => (row.amountPaid + row.creditApplied) as typeof row.amountPaid,
      tone: "muted",
      priority: "secondary",
    }),
    moneyColumn({
      id: "balance",
      label: "Balance",
      accessor: (row) => row.balance,
      tone: (row) => (row.status === "overdue" ? "variance" : "plain"),
    }),
    statusColumn({ accessor: (row) => row.status }),
  ];
}

export function InvoicesView() {
  const router = useRouter();
  const values = useFilterValues(FILTERS);
  const { pageIndex, pageSize, setPageIndex, setPageSize } = useListPagination();
  const columns = useMemo(() => invoiceColumns(), []);

  const q = readString(values, "q");
  const status = readArray<InvoiceStatus>(values, "status");
  const bucket = readArray<AgingBucketKey>(values, "bucket");
  const due = readDateRange(values, "due");
  const amount = readAmountRange(values, "amount");

  const filters: InvoiceFilters = {
    pageIndex,
    pageSize,
    amountMin: amount.min,
    amountMax: amount.max,
    ...(q ? { q } : {}),
    ...(status ? { status } : {}),
    ...(bucket ? { bucket } : {}),
    ...(due.from ? { dueDateFrom: due.from } : {}),
    ...(due.to ? { dueDateTo: due.to } : {}),
  };

  const { data, error, isLoading, refetch } = useApiQuery(JSON.stringify(filters), () =>
    listInvoices(filters),
  );

  const hasFilters = Object.values(values).some((value) =>
    Array.isArray(value) ? value.length > 0 : value != null && value !== "",
  );

  const openBalance = (data?.rows ?? []).reduce((acc, row) => acc + row.balance, 0);

  return (
    <>
      <PageHeader
        title="Invoices"
        count={data?.total}
        description={
          openBalance > 0
            ? "Balance is what is still owed after payments and credit notes."
            : "Every invoice cut against a delivered order."
        }
        actions={
          <Button size="sm" onClick={() => router.push("/invoices/new")}>
            <Plus size={16} strokeWidth={1.75} />
            New invoice
          </Button>
        }
      />

      <div className="px-4 pb-6">
        <DataTable
          data={data?.rows ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          what="invoices"
          exportFilename="invoices"
          stickyFirstColumn
          isLoading={isLoading}
          error={error ? { message: error.message } : null}
          onRetry={refetch}
          onRowOpen={(row) => router.push(`/invoices/${row.siNo}`)}
          savedViews={SAVED_VIEWS}
          basePath="/invoices"
          toolbar={<FilterBar filters={FILTERS} />}
          emptyState={
            hasFilters ? (
              <NoResultsState
                {...(q ? { query: q } : {})}
                onClearFilters={() => router.push("/invoices")}
              />
            ) : (
              <EmptyState
                icon={FileText}
                title="No invoices yet"
                description="An invoice bills what a delivery receipt says the customer accepted. Acknowledge a delivery first."
                action={
                  <Button size="sm" onClick={() => router.push("/deliveries")}>
                    Go to deliveries
                  </Button>
                }
              />
            )
          }
          pagination={{
            pageIndex,
            pageSize,
            total: data?.total ?? 0,
            onPageChange: setPageIndex,
            onPageSizeChange: setPageSize,
          }}
        />
      </div>
    </>
  );
}
