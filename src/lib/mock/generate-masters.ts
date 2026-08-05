import { addDays, formatISO } from "date-fns";

import { fromMajor, type Centavos } from "@/lib/money";
import {
  CITIES,
  CUSTOMER_NAME_PARTS,
  FIRST_NAMES,
  LAST_NAMES,
  PRODUCT_SEEDS,
  SIZE_VARIANTS_BY_UOM,
  STREETS,
  SUPPLIER_SEEDS,
} from "@/lib/mock/catalogues";
import type { Rng } from "@/lib/mock/rng";
import type {
  Address,
  Contact,
  Customer,
  CustomerSegment,
  PaymentTerms,
  PriceList,
  PriceListEntry,
  Product,
  SalesRep,
  Supplier,
  UserRecord,
  Warehouse,
} from "@/types";

const EPOCH = new Date("2024-11-01T00:00:00+08:00");

function isoDay(date: Date): string {
  return formatISO(date, { representation: "date" });
}

function personName(rng: Rng): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}

function address(rng: Rng, cityIndex: number): Address {
  const city = CITIES[cityIndex % CITIES.length];
  if (!city) throw new Error("City catalogue is empty");
  return {
    line1: `${rng.int(1, 899)} ${rng.pick(STREETS)}`,
    city: city.city,
    province: city.province,
    postalCode: city.postalCode,
    country: "Philippines",
  };
}

function tin(rng: Rng): string {
  return `${rng.int(100, 999)}${rng.int(100, 999)}${rng.int(100, 999)}${String(
    rng.int(0, 99999),
  ).padStart(5, "0")}`;
}

function contacts(rng: Rng, count: number): Contact[] {
  const roles = ["Purchasing Officer", "Accounts Payable", "Store Manager", "Owner"];
  return Array.from({ length: count }, (_, index) => {
    const name = personName(rng);
    const contact: Contact = {
      id: `ct-${rng.int(100000, 999999)}`,
      name,
      role: roles[index % roles.length] ?? "Contact",
      email: `${name.split(" ")[0]?.toLowerCase()}@example.ph`,
      phone: `+63 9${rng.int(10, 99)} ${rng.int(100, 999)} ${rng.int(1000, 9999)}`,
      isPrimary: index === 0,
    };
    return contact;
  });
}

export function generateWarehouses(): Warehouse[] {
  return [
    {
      id: "WH-PRQ",
      code: "PRQ",
      name: "Parañaque DC",
      isDefault: true,
      address: {
        line1: "18 Dr. A. Santos Ave.",
        line2: "Sucat",
        city: "Parañaque",
        province: "Metro Manila",
        postalCode: "1700",
        country: "Philippines",
      },
    },
    {
      id: "WH-CEB",
      code: "CEB",
      name: "Cebu Branch",
      isDefault: false,
      address: {
        line1: "204 A.S. Fortuna St.",
        city: "Mandaue",
        province: "Cebu",
        postalCode: "6014",
        country: "Philippines",
      },
    },
    {
      id: "WH-DVO",
      code: "DVO",
      name: "Davao Branch",
      isDefault: false,
      address: {
        line1: "77 J.P. Laurel Ave.",
        city: "Davao City",
        province: "Davao del Sur",
        postalCode: "8000",
        country: "Philippines",
      },
    },
  ];
}

export function generateSalesReps(): SalesRep[] {
  const reps = [
    { name: "Arnel Bautista", territory: "Metro Manila North" },
    { name: "Liza Mangubat", territory: "Metro Manila South" },
    { name: "Ferdie Salcedo", territory: "Central Luzon" },
    { name: "Grace Villamor", territory: "Visayas" },
    { name: "Rodel Panganiban", territory: "Mindanao" },
    { name: "Charmaine Sarmiento", territory: "Key Accounts" },
  ];
  return reps.map((rep, index) => ({
    id: `REP-${String(index + 1).padStart(2, "0")}`,
    code: `R${String(index + 1).padStart(2, "0")}`,
    name: rep.name,
    email: `${rep.name.split(" ")[0]?.toLowerCase()}@pacificpantry.ph`,
    territory: rep.territory,
    status: "active" as const,
  }));
}

export function generateUsers(): UserRecord[] {
  return [
    { id: "USR-001", name: "Ramon Dimaculangan", email: "ramon@pacificpantry.ph", role: "owner", status: "active" },
    { id: "USR-002", name: "Marisol Bituin", email: "marisol@pacificpantry.ph", role: "sales_admin", status: "active" },
    { id: "USR-003", name: "Nestor Alcantara", email: "nestor@pacificpantry.ph", role: "warehouse", status: "active" },
    { id: "USR-004", name: "Divina Ocampo", email: "divina@pacificpantry.ph", role: "accounting", status: "active" },
    { id: "USR-005", name: "Joel Fajardo", email: "joel@pacificpantry.ph", role: "purchasing", status: "active" },
    { id: "USR-006", name: "Rowena Guevarra", email: "rowena@pacificpantry.ph", role: "sales_admin", status: "inactive" },
  ];
}

export function generatePriceLists(): PriceList[] {
  return [
    { id: "PL-STD", code: "STD", name: "Standard", description: "Default list price for new accounts.", status: "active" },
    { id: "PL-VOL", code: "VOL", name: "Volume", description: "Consolidators and sub-distributors moving full cases.", status: "active" },
    { id: "PL-KEY", code: "KEY", name: "Key account", description: "Supermarket chains on negotiated terms.", status: "active" },
    { id: "PL-FSV", code: "FSV", name: "Food service", description: "Restaurant groups and hotels.", status: "active" },
  ];
}

export function generateSuppliers(rng: Rng): Supplier[] {
  return SUPPLIER_SEEDS.map((seed, index) => {
    const isLocal = seed.type === "local";
    const supplier: Supplier = {
      id: `SUP-${String(index + 1).padStart(3, "0")}`,
      code: `S-${String(index + 1).padStart(3, "0")}`,
      name: seed.name,
      type: seed.type,
      currency: seed.currency,
      origin: seed.origin,
      leadTimeDays: seed.leadTimeDays,
      terms: isLocal ? rng.pick<PaymentTerms>(["15", "30", "45"]) : rng.pick<PaymentTerms>(["30", "60"]),
      address: {
        line1: `${rng.int(1, 500)} ${isLocal ? rng.pick(STREETS) : "Industrial Estate Rd."}`,
        city: seed.city,
        province: seed.province,
        postalCode: seed.postalCode,
        country: isLocal ? "Philippines" : seed.origin.split(", ")[1] ?? "—",
      },
      contacts: contacts(rng, 2),
      status: "active",
      createdAt: formatISO(addDays(EPOCH, -rng.int(200, 900))),
      createdById: "USR-005",
      createdByName: "Joel Fajardo",
      auditTrail: [],
      ...(isLocal ? { tin: tin(rng) } : {}),
      ...(seed.incoterms ? { incoterms: seed.incoterms } : {}),
    };
    return supplier;
  });
}

/** Expands the ~40 seeds into ~120 SKUs by adding size variants. */
export function generateProducts(rng: Rng, suppliers: Supplier[]): Product[] {
  const importers = suppliers.filter((s) => s.type === "international");
  const locals = suppliers.filter((s) => s.type === "local");
  const products: Product[] = [];
  let sequence = 0;

  for (const seed of PRODUCT_SEEDS) {
    const available = SIZE_VARIANTS_BY_UOM[seed.uom];
    // Keep the anchor size, then add one or two neighbours around it.
    const anchor = available.find((variant) => variant.factor === 1) ?? available[0]!;
    const others = rng.pickMany(
      available.filter((variant) => variant !== anchor),
      rng.int(1, Math.min(2, available.length - 1)),
    );

    for (const variant of [anchor, ...others]) {
      sequence += 1;
      const prefix = seed.vatType === "zero-rated" ? "EXP" : seed.isImported ? "IMP" : "LOC";
      // Price tracks pack size, with a little brand-level noise on top.
      const scale = variant.factor * rng.float(0.94, 1.07);
      const listPrice = fromMajor(Math.round(seed.anchorPrice * scale));
      const marginPct = rng.float(0.18, 0.34);
      const standardCost = Math.round(listPrice * (1 - marginPct)) as Centavos;
      const supplier = seed.isImported ? rng.pick(importers) : rng.pick(locals);

      products.push({
        id: `PRD-${String(sequence).padStart(4, "0")}`,
        sku: `${prefix}-${seed.skuMid}-${variant.label}`,
        barcode: String(rng.int(48000000, 48999999)) + String(rng.int(100000, 999999)),
        name: `${seed.brand} ${seed.name} ${variant.label}`,
        category: seed.category,
        brand: seed.brand,
        uom: seed.uom,
        // Bulk lines turn over in small counts; retail packs in large ones.
        reorderPoint:
          seed.uom === "SACK" ? rng.int(20, 90) : rng.int(120, 900),
        vatType: seed.vatType,
        isImported: seed.isImported,
        standardCost,
        listPrice,
        weightGrams: Math.round(seed.weightGrams * variant.factor),
        primarySupplierId: supplier.id,
        status: rng.bool(0.96) ? "active" : "inactive",
        createdAt: formatISO(addDays(EPOCH, -rng.int(30, 700))),
        createdById: "USR-005",
        createdByName: "Joel Fajardo",
        auditTrail: [],
        ...(seed.altUom && seed.conversion
          ? { altUom: seed.altUom, altUomConversion: seed.conversion }
          : {}),
      });
    }
  }

  return products;
}

export function generateCustomers(rng: Rng, reps: SalesRep[]): Customer[] {
  const segments: { value: CustomerSegment; weight: number }[] = [
    { value: "consolidator", weight: 30 },
    { value: "supermarket", weight: 20 },
    { value: "restaurant", weight: 22 },
    { value: "convenience", weight: 10 },
    { value: "hotel", weight: 8 },
    { value: "distributor", weight: 10 },
  ];

  const priceListForSegment: Record<CustomerSegment, string> = {
    consolidator: "PL-VOL",
    supermarket: "PL-KEY",
    restaurant: "PL-FSV",
    convenience: "PL-KEY",
    hotel: "PL-FSV",
    distributor: "PL-VOL",
  };

  const used = new Set<string>();
  const customers: Customer[] = [];

  for (let i = 0; i < 40; i++) {
    const segment = rng.weighted(segments);
    const parts = CUSTOMER_NAME_PARTS[segment];

    let name = "";
    for (let attempt = 0; attempt < 30; attempt++) {
      const candidate = `${rng.pick(parts.heads)} ${rng.pick(parts.tails)}`;
      if (!used.has(candidate)) {
        name = candidate;
        used.add(candidate);
        break;
      }
    }
    if (name === "") name = `${rng.pick(parts.heads)} ${rng.pick(parts.tails)} ${i}`;

    // Bigger formats carry bigger limits and longer terms.
    const scale =
      segment === "supermarket" || segment === "convenience"
        ? rng.float(2.2, 4.5)
        : segment === "distributor"
          ? rng.float(1.6, 3.0)
          : rng.float(0.6, 1.8);

    customers.push({
      id: `CUS-${String(i + 1).padStart(4, "0")}`,
      code: `C-${String(i + 1).padStart(4, "0")}`,
      name,
      tin: tin(rng),
      segment,
      address: address(rng, rng.int(0, CITIES.length - 1)),
      contacts: contacts(rng, rng.int(1, 3)),
      terms: rng.weighted<PaymentTerms>([
        { value: "COD", weight: 8 },
        { value: "7", weight: 10 },
        { value: "15", weight: 22 },
        { value: "30", weight: 38 },
        { value: "45", weight: 14 },
        { value: "60", weight: 8 },
      ]),
      // Limits are set against a typical open balance — roughly two months of
      // trade for the format — and rounded to a negotiable-looking figure.
      creditLimit: fromMajor(Math.round((900_000 * scale) / 25_000) * 25_000),
      currentBalance: 0 as Centavos,
      priceListId: priceListForSegment[segment],
      salesRepId: rng.pick(reps).id,
      status: rng.bool(0.94) ? "active" : rng.bool(0.5) ? "on_hold" : "inactive",
      firstOrderDate: null,
      lastOrderDate: null,
      createdAt: formatISO(addDays(EPOCH, -rng.int(10, 800))),
      createdById: "USR-002",
      createdByName: "Marisol Bituin",
      auditTrail: [],
    });
  }

  return customers;
}

/** Segment price lists discount off list; volume breaks reward full cases. */
export function generatePriceListEntries(
  rng: Rng,
  products: Product[],
  priceLists: PriceList[],
): PriceListEntry[] {
  const discountByList: Record<string, number> = {
    "PL-STD": 0,
    "PL-VOL": 0.12,
    "PL-KEY": 0.16,
    "PL-FSV": 0.08,
  };

  const entries: PriceListEntry[] = [];
  for (const list of priceLists) {
    const discount = discountByList[list.id] ?? 0;
    for (const product of products) {
      entries.push({
        priceListId: list.id,
        productId: product.id,
        unitPrice: Math.round(product.listPrice * (1 - discount)) as Centavos,
        minQty: 0,
      });
      // A second break at case quantity, a little cheaper again.
      if (product.altUomConversion && rng.bool(0.55)) {
        entries.push({
          priceListId: list.id,
          productId: product.id,
          unitPrice: Math.round(
            product.listPrice * (1 - discount - rng.float(0.02, 0.05)),
          ) as Centavos,
          minQty: product.altUomConversion,
        });
      }
    }
  }
  return entries;
}

export { isoDay, personName, EPOCH };
