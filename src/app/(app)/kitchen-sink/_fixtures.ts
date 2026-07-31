/**
 * Demo values for the visual system review. Deliberately colocated with the
 * kitchen-sink route so no feature component can import them — real data
 * arrives at GATE 2 behind `src/lib/api/*`.
 */

import type { AgingSummary } from "@/lib/aging";
import type { FilterDef } from "@/lib/filters";
import { fromMajor, type Centavos } from "@/lib/money";
import type { LineItem, LineProduct } from "@/lib/line-items";
import type { StatusKey } from "@/components/distrix/status-pill";
import type { SavedView } from "@/components/distrix/data-table/types";

export interface DemoInvoice {
  id: string;
  siNo: string;
  customer: string;
  customerCode: string;
  invoiceDate: string;
  dueDate: string;
  amount: Centavos;
  balance: Centavos;
  status: StatusKey;
  rep: string;
}

export const DEMO_INVOICES: DemoInvoice[] = [
  {
    id: "1",
    siNo: "SI-2026-1188",
    customer: "Suy Sing Commercial Corp.",
    customerCode: "C-0104",
    invoiceDate: "2026-07-12",
    dueDate: "2026-08-11",
    amount: fromMajor(412_880),
    balance: fromMajor(412_880),
    status: "open",
    rep: "Arnel Bautista",
  },
  {
    id: "2",
    siNo: "SI-2026-1174",
    customer: "Bistro Rossi Group Inc.",
    customerCode: "C-0311",
    invoiceDate: "2026-04-02",
    dueDate: "2026-05-02",
    amount: fromMajor(688_500),
    balance: fromMajor(688_500),
    status: "overdue",
    rep: "Liza Mangubat",
  },
  {
    id: "3",
    siNo: "SI-2026-1201",
    customer: "Marikina Grocery Supply",
    customerCode: "C-0207",
    invoiceDate: "2026-07-22",
    dueDate: "2026-08-21",
    amount: fromMajor(88_450),
    balance: fromMajor(32_100),
    status: "partial",
    rep: "Arnel Bautista",
  },
  {
    id: "4",
    siNo: "SI-2026-1093",
    customer: "Tondo Sari-Sari Consolidators",
    customerCode: "C-0088",
    invoiceDate: "2026-01-18",
    dueDate: "2026-02-17",
    amount: fromMajor(214_600),
    balance: fromMajor(214_600),
    status: "overdue",
    rep: "Ferdie Salcedo",
  },
  {
    id: "5",
    siNo: "SI-2026-1210",
    customer: "Cebu Provisions Trading",
    customerCode: "C-0412",
    invoiceDate: "2026-07-28",
    dueDate: "2026-09-11",
    amount: fromMajor(156_240),
    balance: 0 as Centavos,
    status: "paid",
    rep: "Grace Villamor",
  },
  {
    id: "6",
    siNo: "SI-2026-1155",
    customer: "Davao Hotel Supply Co.",
    customerCode: "C-0503",
    invoiceDate: "2026-06-05",
    dueDate: "2026-07-05",
    amount: fromMajor(97_320),
    balance: fromMajor(97_320),
    status: "overdue",
    rep: "Grace Villamor",
  },
  {
    id: "7",
    siNo: "SI-2026-1219",
    customer: "Alabang Fine Foods Inc.",
    customerCode: "C-0266",
    invoiceDate: "2026-07-30",
    dueDate: "2026-08-29",
    amount: fromMajor(48_775),
    balance: fromMajor(48_775),
    status: "open",
    rep: "Liza Mangubat",
  },
  {
    id: "8",
    siNo: "SI-2026-1067",
    customer: "Bistro Rossi Group Inc.",
    customerCode: "C-0311",
    invoiceDate: "2025-12-20",
    dueDate: "2026-01-19",
    amount: fromMajor(515_800),
    balance: fromMajor(515_800),
    status: "overdue",
    rep: "Liza Mangubat",
  },
];

export const DEMO_AGING: AgingSummary = {
  current: { amount: fromMajor(2_184_530), count: 26 },
  d1_30: { amount: fromMajor(864_210), count: 11 },
  d31_60: { amount: fromMajor(412_880), count: 5 },
  d61_90: { amount: fromMajor(214_600), count: 3 },
  d90_plus: { amount: fromMajor(515_800), count: 2 },
};

export const DEMO_SAVED_VIEWS: SavedView[] = [
  { id: "all", label: "All open", query: "", count: 47 },
  { id: "overdue", label: "My overdue", query: "status=overdue", count: 21 },
  { id: "week", label: "Due this week", query: "status=open&dueFrom=2026-07-27", count: 8 },
  { id: "big", label: "Over ₱500K", query: "amountMin=50000000", count: 4 },
];

export const DEMO_FILTERS: FilterDef[] = [
  { kind: "search", key: "q", placeholder: "Invoice no. or customer…" },
  {
    kind: "multi",
    key: "status",
    label: "Status",
    options: [
      { value: "open", label: "Open", hint: "18" },
      { value: "partial", label: "Partly paid", hint: "6" },
      { value: "overdue", label: "Overdue", hint: "21" },
      { value: "paid", label: "Paid", hint: "112" },
    ],
  },
  {
    kind: "combobox",
    key: "rep",
    label: "Sales rep",
    options: [
      { value: "arnel", label: "Arnel Bautista", hint: "₱1.4M" },
      { value: "liza", label: "Liza Mangubat", hint: "₱2.1M" },
      { value: "ferdie", label: "Ferdie Salcedo", hint: "₱620K" },
      { value: "grace", label: "Grace Villamor", hint: "₱940K" },
    ],
  },
  { kind: "dateRange", key: "due", label: "Due date" },
  { kind: "amountRange", key: "amount", label: "Amount" },
];

export const DEMO_PRODUCTS: LineProduct[] = [
  {
    id: "p1",
    sku: "IMP-OLV-500",
    name: "Bellucci Extra Virgin Olive Oil 500ml",
    uom: "PCS",
    altUom: "CS",
    altUomConversion: 12,
    unitPrice: fromMajor(412.5),
    available: 412,
    vatType: "vatable",
  },
  {
    id: "p2",
    sku: "IMP-PAS-1KG",
    name: "Granoro Spaghetti No.12 1kg",
    uom: "PCS",
    altUom: "CS",
    altUomConversion: 24,
    unitPrice: fromMajor(148),
    available: 1840,
    vatType: "vatable",
  },
  {
    id: "p3",
    sku: "LOC-RIC-25K",
    name: "Sinandomeng Premium Rice 25kg",
    uom: "SACK",
    unitPrice: fromMajor(1_680),
    available: 96,
    vatType: "exempt",
  },
  {
    id: "p4",
    sku: "IMP-TUN-185",
    name: "Ayam Brand Tuna in Olive Oil 185g",
    uom: "PCS",
    altUom: "CS",
    altUomConversion: 48,
    unitPrice: fromMajor(96.75),
    available: 18,
    vatType: "vatable",
  },
  {
    id: "p5",
    sku: "EXP-COC-1L",
    name: "Virgin Coconut Oil 1L (export pack)",
    uom: "PCS",
    unitPrice: fromMajor(385),
    available: 240,
    vatType: "zero-rated",
  },
];

export const DEMO_LINES: LineItem[] = [
  {
    id: "l1",
    productId: "p1",
    qty: 120,
    uom: "PCS",
    unitPrice: fromMajor(412.5),
    discountPct: 5,
    vatType: "vatable",
  },
  {
    id: "l2",
    productId: "p2",
    qty: 480,
    uom: "PCS",
    unitPrice: fromMajor(148),
    discountPct: 0,
    vatType: "vatable",
  },
  {
    id: "l3",
    productId: "p3",
    qty: 40,
    uom: "SACK",
    unitPrice: fromMajor(1_680),
    discountPct: 0,
    vatType: "exempt",
  },
  {
    // Deliberately over-committed: only 18 on hand. The editor warns, not blocks.
    id: "l4",
    productId: "p4",
    qty: 96,
    uom: "PCS",
    unitPrice: fromMajor(96.75),
    discountPct: 2.5,
    vatType: "vatable",
  },
];
