@AGENTS.md

# Distrix — working rules

Distribution ERP frontend for Philippine importer–distributor SMEs. Frontend only:
no backend, no database, no auth provider. Typed mock data behind a swappable
data layer.

## Build order (stop for review at each gate)

1. ✅ **Foundation** — tokens, restyled primitives, app shell, command palette, all
   shared patterns, `/kitchen-sink`.
2. ✅ **Domain model** — `src/types`, Zod schemas, `src/lib/api`, seeded generators.
3. ⬜ Customers, Products/Inventory
4. ⬜ Sales Order → Delivery Receipt → Invoice
5. ⬜ Payments + Statement of Account + aging
6. ⬜ Sales Returns and credit notes
7. ⬜ Purchase Orders (local + international)
8. ⬜ Expenses, Commissions
9. ⬜ Dashboard, Sales History, Settings
10. ⬜ Responsive, accessibility, state sweep, print views

Only `/` and `/kitchen-sink` exist so far. Sidebar links to unbuilt routes 404 by
design — do not stub them with placeholder pages.

## Non-negotiables

- **No `any`, no `@ts-ignore`.** Strict mode plus `noUnusedLocals`,
  `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noImplicitOverride`.
- **No float math on money.** Every amount is `Centavos` (a branded integer) from
  `src/lib/money.ts`. Anything that can produce a fraction rounds explicitly.
  Proportional splits go through `allocate()` so no centavo is created or lost.
- **No raw Tailwind palette colours in feature code.** Semantic tokens only:
  `bg-surface`, `text-ink-muted`, `bg-accent-wash`, `border-border`. Never
  `gray-500`, never a hex literal.
- **No component over ~250 lines.** Split it.
- **No stock shadcn look.** New primitives added via `npx shadcn add` need a
  restyle pass — see "Adding a primitive" below.
- **No `localStorage` for domain data.** UI preferences only (`distrix.ui`).
- **No lorem ipsum, no placeholder images, no "Coming soon" pages.**
- **Feature components never import fixtures.** All reads/writes go through
  `src/lib/api/*` (GATE 2). Kitchen-sink fixtures are colocated under
  `src/app/(app)/kitchen-sink/_fixtures.ts` precisely so nothing else can reach them.

## Where things live

| Path | What |
|---|---|
| `src/types/` | The domain model. Import from `@/types`, not the files. |
| `src/lib/schemas/` | One Zod schema per document type. Form + write validation. |
| `src/lib/api/` | **The only data source a feature may import.** |
| `src/lib/mock/` | Seed generators and the in-memory DB. Never import directly. |
| `src/app/globals.css` | The token system. Every colour, size, radius and shadow. |
| `src/lib/money.ts` | Integer-centavo money. VAT, FX, `allocate()`. |
| `src/lib/format.ts` | Dates (`dd MMM yyyy`, Asia/Manila), money strings, TIN mask. |
| `src/lib/aging.ts` | Aging buckets, `summariseAging()`, the severity ramp classes. |
| `src/lib/line-items.ts` | Line maths and the per-line VAT split. |
| `src/lib/filters.ts` | Declarative filter defs → nuqs parsers → visible chips. |
| `src/lib/nav.ts` | Sidebar groups and route matching. |
| `src/components/ui/` | Restyled shadcn/Base UI primitives. |
| `src/components/distrix/` | The shared patterns. Build once, reuse everywhere. |
| `src/components/shell/` | Sidebar, top bar, breadcrumbs, warehouse switcher. |
| `src/stores/ui-store.ts` | Sidebar collapse, density, theme, palette open. |

## The shared patterns — use these, don't re-invent

- `<DataTable>` — every grid. Column meta drives alignment, mono, CSV and the
  visibility menu. Build columns with `moneyColumn`/`qtyColumn`/`dateColumn`/
  `codeColumn`/`statusColumn` so numeric alignment is guaranteed, not remembered.
- `<FilterBar filters={...} />` — declarative, URL-synced, chips always visible.
- `<DocumentPage>` — the layout for all ten document types.
- `<LineItemsEditor>` — the keyboard-first line grid.
- `<StatusPill>` — add new statuses to `STATUS_REGISTRY`, never a coloured span.
- `<Money>` / `<Figure>` — the only way currency and quantities render.
  Alignment is the container's job; these only guarantee mono + tabular.
- `<AgingRail>` — the signature element. Dashboard, SoA, every customer page.
- `EmptyState` / `NoResultsState` / `ErrorState` / `TableSkeleton` — four
  distinct states. "No results for these filters" ≠ "nothing here yet".
- `ConfirmDialog` with `requireTyped` for destructive posts;
  `useUnsavedChangesGuard` on any form; `useOptimisticMutation` for rollback.

## The data layer

Everything goes through `@/lib/api`. No component imports `src/lib/mock/*`.

- Reads return typed promises with 200–500ms of latency and are **cloned**, so a
  response can never mutate under a component holding it for rollback.
- Writes mutate the in-memory DB and call `recalculate()`, which re-derives
  invoice status, customer balances and order dates. That is why posting a
  payment moves the statement and the aging rail in the same call.
- `configureApi({ failureRate: 0.1 })` turns on the seeded failure mode — the
  same call fails on every run, so a broken screenshot is reproducible.
- Lists take a `PageRequest` (`pageIndex`, `pageSize`, `sort`) and return
  `Page<T>`. `sort` is a column id, `-` prefixed for descending.
- Errors are `ApiError` / `NotFoundError` / `ValidationError`; each carries
  `what` so `<ErrorState what={...}>` can name what failed.

The seed is deterministic from `SEED` in `src/lib/mock/rng.ts`, and "today" is
pinned to `TODAY` in `src/lib/mock/db.ts` so aging buckets never drift between
sessions. Changing either changes every figure in the app.

## Adding a shadcn primitive

`npx shadcn@latest add <name>` pulls Base UI components carrying stock classes.
Three things do **not** inherit from the token remap and must be fixed by hand:

1. `bg-accent` → `bg-accent-wash` (shadcn means "hover surface"; Distrix means
   the teal). `text-accent-foreground` → `text-accent`.
2. `focus-visible:ring-3 focus-visible:ring-ring/50` → `focus-visible:outline-2
   focus-visible:outline-offset-1 focus-visible:outline-accent`.
3. `rounded-lg` on a control → `rounded-md` (6px controls, 8px cards).

Everything else inherits, because `--color-background`, `--color-primary`,
`--color-muted` etc. are remapped onto Distrix tokens in the `@theme` block.

## Philippine specifics

12% VAT with per-line `vatType`; every invoice shows a VATable / VAT-Exempt /
Zero-Rated / VAT block. TIN is `000-000-000-00000` (`formatTin`). EWT is always a
separate deduction line, never folded into a total. International POs show
foreign currency *and* PHP at the PO's FX rate. Leave `// EIS:` hook points where
BIR e-invoicing submission status would attach.

## Commands

```
npm run dev          # localhost:3000
npm run build        # runs tsc as part of the build
npx tsc --noEmit     # typecheck alone
npx eslint .         # zero errors expected
```

One ESLint warning is expected and correct: React Compiler cannot memoize
TanStack Table's `useReactTable`. The compiler is off in this project.
