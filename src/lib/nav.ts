import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Banknote,
  Boxes,
  ClipboardList,
  Coins,
  FileText,
  History,
  LayoutDashboard,
  PackageSearch,
  Percent,
  Receipt,
  RotateCcw,
  Scale,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
  Undo2,
  Users,
  Warehouse,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Matches child routes too, e.g. /orders/SO-2026-0142. */
  match?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Grouped by what the user is trying to do, not by data model — §5.
 * Customers sits under Sell: the spec lists a Customers screen but no group
 * for it, and every path into it starts from selling.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Sell",
    items: [
      { label: "Orders", href: "/orders", icon: ShoppingCart },
      { label: "Deliveries", href: "/deliveries", icon: Truck },
      { label: "Invoices", href: "/invoices", icon: FileText },
      { label: "Returns", href: "/returns", icon: Undo2 },
      { label: "Customers", href: "/customers", icon: Users },
    ],
  },
  {
    label: "Collect",
    items: [
      { label: "Statements", href: "/statements", icon: ClipboardList },
      { label: "Payments", href: "/payments", icon: Banknote },
      { label: "Aging", href: "/aging", icon: Scale },
    ],
  },
  {
    label: "Buy",
    items: [
      { label: "Purchase Orders", href: "/purchase-orders", icon: Receipt },
      { label: "Receiving", href: "/receiving", icon: PackageSearch },
      { label: "Suppliers", href: "/suppliers", icon: Warehouse },
    ],
  },
  {
    label: "Stock",
    items: [
      { label: "Products", href: "/products", icon: Boxes },
      { label: "Stock Levels", href: "/stock-levels", icon: SlidersHorizontal },
      { label: "Adjustments", href: "/adjustments", icon: RotateCcw },
      { label: "Transfers", href: "/transfers", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Money",
    items: [
      { label: "Expenses", href: "/expenses", icon: Coins },
      { label: "Commissions", href: "/commissions", icon: Percent },
    ],
  },
  {
    label: "Insight",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Sales History", href: "/sales-history", icon: History },
    ],
  },
  {
    label: "Setup",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];

const ALL_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

export function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Longest-prefix match, so /orders/SO-1 resolves to Orders not to /. */
export function findNavItem(pathname: string): NavItem | undefined {
  return ALL_ITEMS.filter((item) => isActiveRoute(pathname, item.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
}

export function findNavGroup(pathname: string): NavGroup | undefined {
  return NAV_GROUPS.find((group) =>
    group.items.some((item) => isActiveRoute(pathname, item.href)),
  );
}

export { ALL_ITEMS as NAV_ITEMS };
