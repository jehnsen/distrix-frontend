/**
 * Source material for the seed. Real-sounding Filipino names, plausible trade
 * names for the customer segments this business actually sells to, and an
 * imported food-and-beverage range an importer–distributor would carry.
 */

export const FIRST_NAMES = [
  "Arnel", "Liza", "Ferdie", "Grace", "Marisol", "Ramon", "Divina", "Joel",
  "Cristina", "Rodel", "Melinda", "Edgardo", "Charmaine", "Nestor", "Rowena",
  "Bernardo", "Imelda", "Alfonso", "Jocelyn", "Teodoro", "Marilou", "Danilo",
  "Rosalinda", "Efren", "Luzviminda", "Ariel", "Maricel", "Wilfredo", "Analiza",
  "Benjie", "Corazon", "Dante", "Evelyn", "Fidel", "Girlie", "Hermogenes",
  "Josefina", "Kristoffer", "Lourdes", "Manuel", "Norma", "Orlando", "Perlita",
];

export const LAST_NAMES = [
  "Bautista", "Mangubat", "Salcedo", "Villamor", "Bituin", "Dimaculangan",
  "Panganiban", "Sarmiento", "Alcantara", "Buenaventura", "Cabrera", "Delos Reyes",
  "Escalante", "Fajardo", "Guevarra", "Hernandez", "Ilagan", "Jimenez",
  "Lagman", "Macaraeg", "Nazareno", "Ocampo", "Paglinawan", "Quinto",
  "Rivera", "Santillan", "Tolentino", "Ubaldo", "Valdez", "Ybañez", "Zamora",
];

/** Name fragments that combine into believable trade names, by segment. */
export const CUSTOMER_NAME_PARTS = {
  consolidator: {
    heads: [
      "Tondo", "Divisoria", "Baclaran", "Cubao", "Malabon", "Navotas", "Pasig",
      "Caloocan", "Marikina", "Valenzuela", "Sampaloc", "Quiapo", "Bacoor",
    ],
    tails: [
      "Sari-Sari Consolidators", "Wholesale Trading", "General Merchandise",
      "Commercial Corp.", "Marketing Corp.", "Trading Enterprises",
    ],
  },
  supermarket: {
    heads: [
      "Puregold", "Suy Sing", "Ever", "Isetann", "Shopwise", "Rustan's",
      "Waltermart", "Landers", "Prince", "Gaisano", "Metro", "Robinsons",
    ],
    tails: [
      "Commercial Corp.", "Supermarket Inc.", "Hypermart Corp.", "Retail Group",
      "Superstore Inc.",
    ],
  },
  restaurant: {
    heads: [
      "Bistro Rossi", "Casa Marcelo", "Kanto Freestyle", "Pancit Malabon",
      "Mesa Filipina", "Cibo Rosso", "Tavola Nostra", "Sentro 1771",
      "Manam Kitchen", "Locavore",
    ],
    tails: ["Group Inc.", "Restaurant Group", "Hospitality Corp.", "Concepts Inc."],
  },
  convenience: {
    heads: ["Alfamart", "Uncle John's", "Ministop", "Lawson", "Family Mart", "TreatsPH"],
    tails: ["Convenience Corp.", "Retail Inc.", "Stores Corp."],
  },
  hotel: {
    heads: [
      "Bayfront", "Seda Vertis", "Discovery Shores", "Crimson Bay", "Astoria Palawan",
      "The Manor Baguio", "Marco Polo Davao",
    ],
    tails: ["Hotel Supply Co.", "Resorts Inc.", "Hospitality Supply"],
  },
  distributor: {
    heads: ["Cebu Provisions", "Iloilo Central", "Bacolod Prime", "Cagayan Valley", "Zamboanga Bay"],
    tails: ["Trading", "Distribution Inc.", "Marketing Corp."],
  },
} as const;

export interface CityRecord {
  city: string;
  province: string;
  postalCode: string;
  /** Which warehouse naturally serves it. */
  warehouseCode: "PRQ" | "CEB" | "DVO";
}

export const CITIES: CityRecord[] = [
  { city: "Parañaque", province: "Metro Manila", postalCode: "1700", warehouseCode: "PRQ" },
  { city: "Makati", province: "Metro Manila", postalCode: "1200", warehouseCode: "PRQ" },
  { city: "Quezon City", province: "Metro Manila", postalCode: "1100", warehouseCode: "PRQ" },
  { city: "Manila", province: "Metro Manila", postalCode: "1000", warehouseCode: "PRQ" },
  { city: "Caloocan", province: "Metro Manila", postalCode: "1400", warehouseCode: "PRQ" },
  { city: "Marikina", province: "Metro Manila", postalCode: "1800", warehouseCode: "PRQ" },
  { city: "Pasig", province: "Metro Manila", postalCode: "1600", warehouseCode: "PRQ" },
  { city: "Las Piñas", province: "Metro Manila", postalCode: "1740", warehouseCode: "PRQ" },
  { city: "Bacoor", province: "Cavite", postalCode: "4102", warehouseCode: "PRQ" },
  { city: "Santa Rosa", province: "Laguna", postalCode: "4026", warehouseCode: "PRQ" },
  { city: "Angeles", province: "Pampanga", postalCode: "2009", warehouseCode: "PRQ" },
  { city: "Mandaue", province: "Cebu", postalCode: "6014", warehouseCode: "CEB" },
  { city: "Cebu City", province: "Cebu", postalCode: "6000", warehouseCode: "CEB" },
  { city: "Lapu-Lapu", province: "Cebu", postalCode: "6015", warehouseCode: "CEB" },
  { city: "Iloilo City", province: "Iloilo", postalCode: "5000", warehouseCode: "CEB" },
  { city: "Bacolod", province: "Negros Occidental", postalCode: "6100", warehouseCode: "CEB" },
  { city: "Tagbilaran", province: "Bohol", postalCode: "6300", warehouseCode: "CEB" },
  { city: "Davao City", province: "Davao del Sur", postalCode: "8000", warehouseCode: "DVO" },
  { city: "Cagayan de Oro", province: "Misamis Oriental", postalCode: "9000", warehouseCode: "DVO" },
  { city: "General Santos", province: "South Cotabato", postalCode: "9500", warehouseCode: "DVO" },
  { city: "Zamboanga City", province: "Zamboanga del Sur", postalCode: "7000", warehouseCode: "DVO" },
  { city: "Butuan", province: "Agusan del Norte", postalCode: "8600", warehouseCode: "DVO" },
];

export const STREETS = [
  "Dr. A. Santos Ave.", "Quirino Ave.", "Aurora Blvd.", "EDSA", "C. Raymundo Ave.",
  "Shaw Blvd.", "Ortigas Ave.", "Sucat Rd.", "Alabang–Zapote Rd.", "Marcos Highway",
  "M.L. Quezon St.", "A.S. Fortuna St.", "Colon St.", "J.P. Laurel Ave.",
  "Governor Chavez St.", "Bonifacio St.", "Rizal Ave.", "Mabini St.",
];

export interface ProductSeed {
  name: string;
  brand: string;
  category:
    | "ambient_grocery" | "canned_goods" | "pasta_sauces" | "oils_condiments"
    | "beverages" | "confectionery" | "dairy_chilled" | "baking" | "rice_grains";
  skuMid: string;
  uom: "PCS" | "SACK" | "BTL" | "PACK";
  altUom?: "CS" | "BOX";
  conversion?: number;
  isImported: boolean;
  vatType: "vatable" | "exempt" | "zero-rated";
  /** Retail-ish anchor in pesos; the generator derives cost and list price. */
  anchorPrice: number;
  weightGrams: number;
}

/**
 * ~40 base products; the generator expands them into ~120 SKUs by size and
 * variant. Weighted toward imported ambient lines, which is what an
 * importer–distributor of this size actually moves.
 */
export const PRODUCT_SEEDS: ProductSeed[] = [
  { name: "Extra Virgin Olive Oil", brand: "Bellucci", category: "oils_condiments", skuMid: "OLV", uom: "BTL", altUom: "CS", conversion: 12, isImported: true, vatType: "vatable", anchorPrice: 412, weightGrams: 780 },
  { name: "Spaghetti No.12", brand: "Granoro", category: "pasta_sauces", skuMid: "PAS", uom: "PACK", altUom: "CS", conversion: 24, isImported: true, vatType: "vatable", anchorPrice: 148, weightGrams: 1000 },
  { name: "Penne Rigate", brand: "Granoro", category: "pasta_sauces", skuMid: "PEN", uom: "PACK", altUom: "CS", conversion: 24, isImported: true, vatType: "vatable", anchorPrice: 142, weightGrams: 1000 },
  { name: "Tomato Passata", brand: "Mutti", category: "pasta_sauces", skuMid: "PSS", uom: "BTL", altUom: "CS", conversion: 12, isImported: true, vatType: "vatable", anchorPrice: 198, weightGrams: 700 },
  { name: "Tuna in Olive Oil", brand: "Ayam Brand", category: "canned_goods", skuMid: "TUN", uom: "PCS", altUom: "CS", conversion: 48, isImported: true, vatType: "vatable", anchorPrice: 96, weightGrams: 185 },
  { name: "Sardines in Tomato Sauce", brand: "Ligo", category: "canned_goods", skuMid: "SRD", uom: "PCS", altUom: "CS", conversion: 100, isImported: false, vatType: "vatable", anchorPrice: 28, weightGrams: 155 },
  { name: "Coconut Milk", brand: "Chaokoh", category: "canned_goods", skuMid: "CCM", uom: "PCS", altUom: "CS", conversion: 24, isImported: true, vatType: "vatable", anchorPrice: 74, weightGrams: 400 },
  { name: "Green Curry Paste", brand: "Maesri", category: "oils_condiments", skuMid: "CRY", uom: "PCS", altUom: "CS", conversion: 48, isImported: true, vatType: "vatable", anchorPrice: 62, weightGrams: 114 },
  { name: "Light Soy Sauce", brand: "Lee Kum Kee", category: "oils_condiments", skuMid: "SOY", uom: "BTL", altUom: "CS", conversion: 12, isImported: true, vatType: "vatable", anchorPrice: 138, weightGrams: 500 },
  { name: "Oyster Sauce", brand: "Lee Kum Kee", category: "oils_condiments", skuMid: "OYS", uom: "BTL", altUom: "CS", conversion: 12, isImported: true, vatType: "vatable", anchorPrice: 165, weightGrams: 510 },
  { name: "Sesame Oil", brand: "Kadoya", category: "oils_condiments", skuMid: "SES", uom: "BTL", altUom: "CS", conversion: 24, isImported: true, vatType: "vatable", anchorPrice: 245, weightGrams: 327 },
  { name: "Rice Vermicelli", brand: "Erawan", category: "ambient_grocery", skuMid: "VRM", uom: "PACK", altUom: "CS", conversion: 30, isImported: true, vatType: "vatable", anchorPrice: 58, weightGrams: 400 },
  { name: "Jasmine Rice", brand: "Royal Umbrella", category: "rice_grains", skuMid: "RIC", uom: "SACK", isImported: true, vatType: "exempt", anchorPrice: 2480, weightGrams: 25000 },
  { name: "Sinandomeng Premium Rice", brand: "Golden Grain", category: "rice_grains", skuMid: "SIN", uom: "SACK", isImported: false, vatType: "exempt", anchorPrice: 1680, weightGrams: 25000 },
  { name: "All-Purpose Flour", brand: "Pillsbury", category: "baking", skuMid: "FLR", uom: "SACK", isImported: true, vatType: "vatable", anchorPrice: 1240, weightGrams: 25000 },
  { name: "Caster Sugar", brand: "Victorias", category: "baking", skuMid: "SUG", uom: "SACK", isImported: false, vatType: "exempt", anchorPrice: 3150, weightGrams: 50000 },
  { name: "Cocoa Powder", brand: "Van Houten", category: "baking", skuMid: "COC", uom: "PACK", altUom: "BOX", conversion: 10, isImported: true, vatType: "vatable", anchorPrice: 485, weightGrams: 1000 },
  { name: "Condensed Milk", brand: "Alaska", category: "dairy_chilled", skuMid: "CND", uom: "PCS", altUom: "CS", conversion: 48, isImported: false, vatType: "vatable", anchorPrice: 52, weightGrams: 300 },
  { name: "Evaporated Milk", brand: "Alaska", category: "dairy_chilled", skuMid: "EVP", uom: "PCS", altUom: "CS", conversion: 48, isImported: false, vatType: "vatable", anchorPrice: 48, weightGrams: 370 },
  { name: "Mozzarella Block", brand: "Galbani", category: "dairy_chilled", skuMid: "MOZ", uom: "PCS", altUom: "BOX", conversion: 8, isImported: true, vatType: "vatable", anchorPrice: 720, weightGrams: 1000 },
  { name: "Parmigiano Reggiano Wedge", brand: "Zanetti", category: "dairy_chilled", skuMid: "PRM", uom: "PCS", altUom: "BOX", conversion: 6, isImported: true, vatType: "vatable", anchorPrice: 1180, weightGrams: 500 },
  { name: "Unsalted Butter", brand: "Anchor", category: "dairy_chilled", skuMid: "BTR", uom: "PCS", altUom: "CS", conversion: 20, isImported: true, vatType: "vatable", anchorPrice: 385, weightGrams: 454 },
  { name: "Italian Sparkling Water", brand: "San Pellegrino", category: "beverages", skuMid: "SPW", uom: "BTL", altUom: "CS", conversion: 24, isImported: true, vatType: "vatable", anchorPrice: 88, weightGrams: 750 },
  { name: "Fruit Nectar", brand: "Del Monte", category: "beverages", skuMid: "NEC", uom: "BTL", altUom: "CS", conversion: 12, isImported: false, vatType: "vatable", anchorPrice: 112, weightGrams: 1000 },
  { name: "Instant Coffee", brand: "Nescafé", category: "beverages", skuMid: "COF", uom: "PCS", altUom: "CS", conversion: 24, isImported: false, vatType: "vatable", anchorPrice: 268, weightGrams: 200 },
  { name: "Ceylon Black Tea", brand: "Dilmah", category: "beverages", skuMid: "TEA", uom: "PACK", altUom: "CS", conversion: 12, isImported: true, vatType: "vatable", anchorPrice: 195, weightGrams: 200 },
  { name: "Dark Chocolate Bar", brand: "Lindt", category: "confectionery", skuMid: "CHO", uom: "PCS", altUom: "BOX", conversion: 20, isImported: true, vatType: "vatable", anchorPrice: 248, weightGrams: 100 },
  { name: "Assorted Biscuits", brand: "Danisa", category: "confectionery", skuMid: "BIS", uom: "PCS", altUom: "CS", conversion: 12, isImported: true, vatType: "vatable", anchorPrice: 412, weightGrams: 454 },
  { name: "Wafer Rolls", brand: "Nissin", category: "confectionery", skuMid: "WAF", uom: "PCS", altUom: "CS", conversion: 24, isImported: false, vatType: "vatable", anchorPrice: 68, weightGrams: 300 },
  { name: "Balsamic Vinegar", brand: "Ponti", category: "oils_condiments", skuMid: "BAL", uom: "BTL", altUom: "CS", conversion: 12, isImported: true, vatType: "vatable", anchorPrice: 285, weightGrams: 500 },
  { name: "Sea Salt Flakes", brand: "Maldon", category: "oils_condiments", skuMid: "SLT", uom: "PCS", altUom: "CS", conversion: 12, isImported: true, vatType: "vatable", anchorPrice: 465, weightGrams: 250 },
  { name: "Black Peppercorns", brand: "Kampot", category: "oils_condiments", skuMid: "PEP", uom: "PACK", altUom: "BOX", conversion: 20, isImported: true, vatType: "vatable", anchorPrice: 318, weightGrams: 200 },
  { name: "Canned Chickpeas", brand: "Cirio", category: "canned_goods", skuMid: "CHK", uom: "PCS", altUom: "CS", conversion: 24, isImported: true, vatType: "vatable", anchorPrice: 92, weightGrams: 400 },
  { name: "Canned Corn Kernels", brand: "Hunt's", category: "canned_goods", skuMid: "CRN", uom: "PCS", altUom: "CS", conversion: 24, isImported: false, vatType: "vatable", anchorPrice: 46, weightGrams: 425 },
  { name: "Virgin Coconut Oil", brand: "Pacific Pantry", category: "oils_condiments", skuMid: "VCO", uom: "BTL", altUom: "CS", conversion: 12, isImported: false, vatType: "zero-rated", anchorPrice: 385, weightGrams: 1000 },
  { name: "Dried Mango Slices", brand: "Pacific Pantry", category: "confectionery", skuMid: "MNG", uom: "PACK", altUom: "CS", conversion: 24, isImported: false, vatType: "zero-rated", anchorPrice: 168, weightGrams: 200 },
  { name: "Muscovado Sugar", brand: "Pacific Pantry", category: "baking", skuMid: "MUS", uom: "PACK", altUom: "CS", conversion: 20, isImported: false, vatType: "zero-rated", anchorPrice: 142, weightGrams: 500 },
  { name: "Rice Paper Wrappers", brand: "Three Ladies", category: "ambient_grocery", skuMid: "RPW", uom: "PACK", altUom: "CS", conversion: 30, isImported: true, vatType: "vatable", anchorPrice: 78, weightGrams: 340 },
  { name: "Palm Sugar", brand: "Cock Brand", category: "ambient_grocery", skuMid: "PLM", uom: "PACK", altUom: "CS", conversion: 24, isImported: true, vatType: "vatable", anchorPrice: 96, weightGrams: 454 },
  { name: "Fish Sauce", brand: "Squid Brand", category: "oils_condiments", skuMid: "FSH", uom: "BTL", altUom: "CS", conversion: 12, isImported: true, vatType: "vatable", anchorPrice: 118, weightGrams: 725 },
];

/**
 * Pack sizes that make sense for each base unit, with the price and weight
 * multiplier relative to the seed's anchor size. A sack of rice comes in 25kg
 * and 50kg; it does not come in 250g.
 */
export const SIZE_VARIANTS_BY_UOM: Record<
  ProductSeed["uom"],
  { label: string; factor: number }[]
> = {
  SACK: [
    { label: "25KG", factor: 1 },
    { label: "50KG", factor: 1.95 },
  ],
  BTL: [
    { label: "250ML", factor: 0.55 },
    { label: "500ML", factor: 1 },
    { label: "750ML", factor: 1.42 },
    { label: "1L", factor: 1.85 },
  ],
  PACK: [
    { label: "200G", factor: 0.52 },
    { label: "400G", factor: 1 },
    { label: "1KG", factor: 2.3 },
  ],
  PCS: [
    { label: "155G", factor: 0.82 },
    { label: "185G", factor: 1 },
    { label: "400G", factor: 2.05 },
  ],
};

export interface SupplierSeed {
  name: string;
  type: "local" | "international";
  currency: "PHP" | "USD" | "CNY" | "THB" | "MYR";
  origin: string;
  incoterms?: "FOB" | "CIF" | "EXW";
  leadTimeDays: number;
  city: string;
  province: string;
  postalCode: string;
}

export const SUPPLIER_SEEDS: SupplierSeed[] = [
  { name: "Shantou Fortune Foods Co. Ltd.", type: "international", currency: "CNY", origin: "Shantou, China", incoterms: "FOB", leadTimeDays: 45, city: "Shantou", province: "Guangdong", postalCode: "5150", },
  { name: "Bangkok Pacific Trading Co. Ltd.", type: "international", currency: "THB", origin: "Laem Chabang, Thailand", incoterms: "CIF", leadTimeDays: 32, city: "Bangkok", province: "Bangkok", postalCode: "1010" },
  { name: "Penang Golden Harvest Sdn. Bhd.", type: "international", currency: "MYR", origin: "Port Klang, Malaysia", incoterms: "FOB", leadTimeDays: 28, city: "Penang", province: "Penang", postalCode: "1020" },
  { name: "Luzon Grains Milling Corp.", type: "local", currency: "PHP", origin: "Nueva Ecija", leadTimeDays: 7, city: "Cabanatuan", province: "Nueva Ecija", postalCode: "3100" },
  { name: "Victorias Sugar Marketing Inc.", type: "local", currency: "PHP", origin: "Negros Occidental", leadTimeDays: 10, city: "Victorias", province: "Negros Occidental", postalCode: "6119" },
  { name: "Alaska Milk Distribution Partners", type: "local", currency: "PHP", origin: "Laguna", leadTimeDays: 5, city: "San Pedro", province: "Laguna", postalCode: "4023" },
  { name: "Pampanga Canning Industries Inc.", type: "local", currency: "PHP", origin: "Pampanga", leadTimeDays: 12, city: "San Fernando", province: "Pampanga", postalCode: "2000" },
  { name: "Cavite Packaging & Supply Corp.", type: "local", currency: "PHP", origin: "Cavite", leadTimeDays: 6, city: "Imus", province: "Cavite", postalCode: "4103" },
];

export const DRIVERS = [
  { name: "Rogelio Mendoza", plate: "NCR 4821" },
  { name: "Arturo Balagtas", plate: "NBP 7734" },
  { name: "Willie Castañeda", plate: "TXK 2210" },
  { name: "Jimmy Aquino", plate: "CEB 5518" },
  { name: "Boyet Sarmiento", plate: "DVO 3392" },
  { name: "Efren Lacsamana", plate: "NCR 9047" },
];

export const BANKS = ["BDO", "BPI", "Metrobank", "Landbank", "Security Bank", "UnionBank"];

export const EXPENSE_PAYEES: Record<string, string[]> = {
  fuel_transport: ["Petron Sucat", "Shell Alabang", "Caltex Mandaue", "Phoenix Davao"],
  warehouse_rent: ["Sta. Lucia Realty", "Ayala Property Mgmt.", "Cebu Industrial Park"],
  utilities: ["Meralco", "Maynilad", "VECO", "Davao Light", "PLDT Enterprise", "Converge ICT"],
  salaries_wages: ["Payroll — warehouse", "Payroll — sales", "Payroll — admin"],
  repairs_maintenance: ["Isuzu Alabang Service", "Forklift Care Inc.", "Cool Air Refrigeration"],
  brokerage_fees: ["Manila Customs Brokerage", "Pacific Freight Forwarders", "Bureau of Customs"],
  office_supplies: ["National Book Store", "Office Warehouse", "Cebu Office Depot"],
  professional_fees: ["Reyes & Associates CPAs", "Cruz Law Office", "BIR Consultancy Services"],
  marketing: ["Trade display fabrication", "Supermarket listing fee", "Sampling activation"],
  permits_licenses: ["Parañaque City Hall", "FDA Philippines", "BIR Annual Registration"],
  representation: ["Client lunch — Rustan's", "Trade dinner — Cebu", "Buyer meeting — Davao"],
  other: ["Miscellaneous", "Bank charges", "Courier — LBC"],
};
