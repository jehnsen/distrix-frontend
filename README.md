# Distrix

Distribution ERP frontend for Philippine importer–distributor SMEs — 20–200
employees, 1–5 warehouses, a field sales team on commission, local and imported
inventory.

Frontend only. No backend, no database, no auth provider: everything runs on
typed mock data behind a swappable data layer, so replacing it with a real API
touches one folder.

The people who use this stare at it for eight hours a day — warehouse clerks
encoding delivery receipts, sales admins cutting orders, an accounting clerk
chasing receivables, the owner checking margins on his phone at 10pm. It is
designed for repetition and speed, not for first impressions.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
```

`/` redirects to `/kitchen-sink`, which is the only route with anything behind it
today. It renders the complete visual system and every shared pattern.

```bash
npm run build     # production build, typechecks as part of it
npx tsc --noEmit  # typecheck alone
npx eslint .      # zero errors
```

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind CSS v4 with tokens as CSS
custom properties · shadcn/ui on Base UI, restyled · TanStack Table v8 ·
React Hook Form + Zod · nuqs for URL-synced filters · Zustand for global UI state ·
lucide-react · Recharts · date-fns with `Asia/Manila` · sonner · cmdk ·
Geist Sans and Geist Mono.

Money is an integer-centavo utility in `src/lib/money.ts` rather than dinero.js —
that package is still published as an alpha, and this app needs six operations,
all of which fit in one dependency-free file.

## Design system

Deep cargo teal, not default blue. Density with total clarity: 13px body, 40px
table rows with a persisted 32px compact mode, 6px control radius, 8px card
radius, one elevation. Semantic colour appears only in status pills, figure
deltas and validation — never as decoration.

The signature element is the **AR Aging Rail**: a segmented Current / 1–30 /
31–60 / 61–90 / 90+ bar with mono figures beneath each segment, each clickable to
filter the list below. In a distribution business collection *is* the business,
so it sits on the dashboard and pinned to Statement of Account and every customer
page. It is the one place the design spends visual boldness.

Dark mode ships from day one via CSS variables; light is the default.

## Build order

Built in gates, each reviewed before the next starts.

1. **Foundation** ✅ — token system, restyled primitives, app shell, command
   palette, every shared pattern, `/kitchen-sink`
2. Types + Zod schemas + `src/lib/api` + seed generators
3. Customers, Products/Inventory
4. Sales Order → Delivery Receipt → Invoice
5. Payments + Statement of Account + aging
6. Sales Returns and credit notes
7. Purchase Orders, local and international
8. Expenses, Commissions
9. Dashboard, Sales History, Settings
10. Responsive pass, accessibility audit, state sweep, print views

Sidebar links to routes from later gates 404 rather than showing a placeholder.

See `CLAUDE.md` for the working rules — token discipline, the money contract, and
how to restyle a newly added shadcn primitive.
