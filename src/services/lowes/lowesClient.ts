import {
  LowesProductSKU,
  ProcurementLineItem,
  ProcurementOrder,
  RetailerConnectionConfig,
  SupplyRetailerId,
  TradeCategory,
  DefectItem,
  RoomNode,
} from '../../types/sprocket';

export const MOCK_BUILDER_CATALOG: LowesProductSKU[] = [
  {
    sku: 'LW-DRY-01',
    model: '1/2-in x 4-ft x 8-ft Drywall Sheet',
    name: 'USG Sheetrock Brand 1/2-in x 4-ft x 8-ft Gypsum Panel',
    description: 'Tapered edge drywall panel suitable for walls and ceilings.',
    category: 'Drywall',
    unit_of_measure: 'EA',
    coverage_per_unit: 32, // 32 SF per sheet
    retail_price: 15.48,
    contractor_price: 13.92, // 10% Pro discount
    aisle: 'Aisle 12',
    bay: 'Bay 04',
    stock_level: 420,
    in_stock: true,
  },
  {
    sku: 'LW-TRM-02',
    model: '9/16-in x 3-1/4-in x 8-ft Baseboard',
    name: 'ReliaBilt 3-1/4-in x 8-ft Primed MDF Colonial Baseboard',
    description: 'Primed fiberboard interior trim moulding.',
    category: 'Finish Carpentry',
    unit_of_measure: 'EA',
    coverage_per_unit: 8, // 8 LF per stick
    retail_price: 11.28,
    contractor_price: 9.98,
    aisle: 'Aisle 19',
    bay: 'Bay 02',
    stock_level: 280,
    in_stock: true,
  },
  {
    sku: 'LW-PNT-03',
    model: 'Valspar 2000 Interior Satin 1-Gallon',
    name: 'Valspar 2000 Zero VOC Neutral Base Interior Latex Paint (1 Gal)',
    description: 'Commercial grade latex wall paint, 400 SF coverage per gallon.',
    category: 'Painting',
    unit_of_measure: 'CAN',
    coverage_per_unit: 350, // 350 SF coverage
    retail_price: 34.98,
    contractor_price: 29.50,
    aisle: 'Aisle 08',
    bay: 'Bay 06',
    stock_level: 95,
    in_stock: true,
  },
  {
    sku: 'LW-FLR-04',
    model: 'Style Selections 12x24 Glazed Porcelain',
    name: 'Style Selections Galvano Charcoal 12-in x 24-in Porcelain Floor Tile (16-sq ft/Case)',
    description: 'Matte rectified porcelain tile.',
    category: 'Carpet, Flooring',
    unit_of_measure: 'EA',
    coverage_per_unit: 16, // 16 SF per box/case
    retail_price: 31.84,
    contractor_price: 26.88,
    aisle: 'Aisle 31',
    bay: 'Bay 14',
    stock_level: 160,
    in_stock: true,
  },
  {
    sku: 'LW-ELE-05',
    model: 'Southwire Romex SIMpull 12/2 250-ft',
    name: 'Southwire 250-ft 12/2 Non-Metallic Wire (By-the-Roll)',
    description: 'Copper solid NM-B residential indoor wiring cable.',
    category: 'Electrical',
    unit_of_measure: 'ROLL',
    coverage_per_unit: 250, // 250 LF
    retail_price: 148.00,
    contractor_price: 132.00,
    aisle: 'Aisle 24',
    bay: 'Bay 08',
    stock_level: 45,
    in_stock: true,
  },
  {
    sku: 'LW-DOR-06',
    model: 'Masonite 6-Panel Pre-Hung Door 30x80',
    name: 'Masonite Traditional 30-in x 80-in Hollow Core Pre-Hung Interior Door',
    description: 'Split jamb molded panel right-hand interior door.',
    category: 'Doors & Windows',
    unit_of_measure: 'EA',
    coverage_per_unit: 1, // 1 door per EA
    retail_price: 129.00,
    contractor_price: 114.00,
    aisle: 'Aisle 16',
    bay: 'Bay 01',
    stock_level: 32,
    in_stock: true,
  },
  {
    sku: 'LW-PLM-07',
    model: 'Moen Adler 4-in Centerset Chrome Faucet',
    name: 'Moen Adler Chrome 2-handle 4-in Centerset WaterSense Bathroom Sink Faucet',
    description: 'Complete with drain assembly.',
    category: 'Plumbing Fixtures',
    unit_of_measure: 'EA',
    coverage_per_unit: 1,
    retail_price: 79.00,
    contractor_price: 68.50,
    aisle: 'Aisle 28',
    bay: 'Bay 03',
    stock_level: 54,
    in_stock: true,
  },
  {
    sku: 'LW-CAB-08',
    model: 'Diamond NOW Arcadia 36-in Base Cabinet',
    name: 'Diamond NOW Arcadia 36-in W x 34.5-in H Shaker White Base Cabinet',
    description: 'Factory-assembled hardwood face frame kitchen base cabinet.',
    category: 'Cabinets',
    keywords: ['cabinet', 'vanity', 'cupboard', 'drawer'],
    unit_of_measure: 'EA',
    coverage_per_unit: 3, // 3 LF per 36" cabinet
    retail_price: 219.00,
    contractor_price: 186.15,
    aisle: 'Aisle 29',
    bay: 'Bay 04',
    stock_level: 18,
    in_stock: true,
  },
  {
    sku: 'LW-CNT-09',
    model: 'allen + roth 8-ft Quartz Countertop',
    name: 'allen + roth 96-in x 25-in Prefabricated Carrara Quartz Countertop',
    description: 'Pre-polished eased-edge engineered quartz slab (~16 SF).',
    category: 'Countertops',
    keywords: ['countertop', 'granite', 'quartz', 'laminate top'],
    unit_of_measure: 'EA',
    coverage_per_unit: 16, // 16 SF per 8-ft slab
    retail_price: 499.00,
    contractor_price: 424.00,
    aisle: 'Aisle 30',
    bay: 'Bay 02',
    stock_level: 12,
    in_stock: true,
  },
  {
    sku: 'LW-FRM-10',
    model: '2-in x 4-in x 8-ft Kiln-Dried Stud',
    name: 'Severe Weather 2-in x 4-in x 8-ft Kiln-Dried Stud Framing Lumber',
    description: 'Structural framing stud for interior and exterior wall framing.',
    category: 'Framing',
    keywords: ['framing', 'stud', 'header', 'joist', 'rafter', 'lumber'],
    unit_of_measure: 'EA',
    coverage_per_unit: 8, // ~8 SF wall framing coverage per stud @ 16" OC
    retail_price: 3.98,
    contractor_price: 3.45,
    aisle: 'Aisle 21',
    bay: 'Bay 01',
    stock_level: 950,
    in_stock: true,
  },
  {
    sku: 'LW-HVC-11',
    model: 'Goodman 3-Ton 14.3 SEER2 Split AC',
    name: 'Goodman 3-Ton 14.3 SEER2 Central Split Air Conditioner & Coil',
    description: 'Complete residential HVAC condensing unit and evaporator coil.',
    category: 'HVAC',
    keywords: ['hvac', 'furnace', 'air conditioner', 'heat pump', 'thermostat', 'duct'],
    unit_of_measure: 'EA',
    coverage_per_unit: 1,
    retail_price: 2850.00,
    contractor_price: 2490.00,
    aisle: 'Aisle 26',
    bay: 'Bay 10',
    stock_level: 6,
    in_stock: true,
  },
  {
    sku: 'LW-ROF-12',
    model: 'Owens Corning Oakridge Shingles',
    name: 'Owens Corning Oakridge Architectural Roof Shingles (32.8-sq ft/Bundle)',
    description: 'Class A fire-rated fiberglass architectural asphalt shingles.',
    category: 'Roofing',
    keywords: ['roof', 'shingle', 'underlayment', 'flashing'],
    unit_of_measure: 'EA',
    coverage_per_unit: 32.8, // 32.8 SF per bundle
    retail_price: 41.50,
    contractor_price: 36.80,
    aisle: 'Aisle 22',
    bay: 'Bay 06',
    stock_level: 310,
    in_stock: true,
  },
  {
    sku: 'LW-EXT-13',
    model: 'James Hardie HardiePlank 8.25-in x 12-ft',
    name: 'James Hardie HardiePlank 8.25-in x 12-ft Fiber Cement Lap Siding',
    description: 'Primed fiber cement exterior lap siding plank.',
    category: 'Exterior Finish',
    keywords: ['siding', 'stucco', 'fascia', 'soffit', 'exterior'],
    unit_of_measure: 'EA',
    coverage_per_unit: 8.25, // ~8.25 SF per 12-ft plank
    retail_price: 14.98,
    contractor_price: 12.90,
    aisle: 'Aisle 20',
    bay: 'Bay 05',
    stock_level: 240,
    in_stock: true,
  },
  {
    sku: 'LW-FND-14',
    model: 'QUIKRETE 80-lb Concrete Mix',
    name: 'QUIKRETE 80-lb High Early Strength Concrete Mix',
    description: '4000 PSI structural concrete mix for foundation & footing repairs.',
    category: 'Foundation',
    keywords: ['foundation', 'concrete', 'footing', 'slab', 'masonry'],
    unit_of_measure: 'BAG',
    coverage_per_unit: 2, // ~2 SF @ 4" slab thickness per bag
    retail_price: 6.85,
    contractor_price: 5.95,
    aisle: 'Aisle 23',
    bay: 'Bay 12',
    stock_level: 480,
    in_stock: true,
  },
  {
    sku: 'LW-IWF-15',
    model: 'USG Sheetrock Plus 3 Joint Compound',
    name: 'USG Sheetrock 4.5-Gal Plus 3 Ready-Mixed Joint Compound',
    description: 'Lightweight interior wall finish joint compound pail.',
    category: 'Interior Wall Finish',
    keywords: ['joint compound', 'texture', 'skim coat', 'interior wall finish'],
    unit_of_measure: 'EA',
    coverage_per_unit: 450,
    retail_price: 22.98,
    contractor_price: 19.80,
    aisle: 'Aisle 12',
    bay: 'Bay 08',
    stock_level: 85,
    in_stock: true,
  },
  {
    sku: 'LW-EXC-16',
    model: 'NDS 4-in x 100-ft Perforated Drain Pipe',
    name: 'NDS 4-in x 100-ft Corrugated Perforated Foundation Drain Pipe',
    description: 'Heavy-duty HDPE perimeter drainage pipe for excavation & grading.',
    category: 'Excavation',
    keywords: ['excavation', 'drain', 'grading', 'trench'],
    unit_of_measure: 'ROLL',
    coverage_per_unit: 1,
    retail_price: 98.00,
    contractor_price: 84.00,
    aisle: 'Aisle 27',
    bay: 'Bay 09',
    stock_level: 22,
    in_stock: true,
  },
];

export interface LowesStoreInfo {
  store_id: string;
  store_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export const KNOWN_STORES: Record<string, LowesStoreInfo> = {
  '66208': {
    store_id: '0584',
    store_name: "Lowe's of Overland Park",
    address: '9500 Metcalf Ave',
    city: 'Overland Park',
    state: 'KS',
    zip: '66212',
    phone: '(913) 642-1200',
  },
  '66061': {
    store_id: '1534',
    store_name: "Lowe's of Olathe",
    address: '13950 S Black Bob Rd',
    city: 'Olathe',
    state: 'KS',
    zip: '66062',
    phone: '(913) 393-4700',
  },
  '64133': {
    store_id: '1190',
    store_name: "Lowe's of Kansas City East",
    address: '12200 E US Hwy 40',
    city: 'Independence',
    state: 'MO',
    zip: '64055',
    phone: '(816) 795-1900',
  },
  '64050': {
    store_id: '0721',
    store_name: "Lowe's of Independence",
    address: '19110 E Valley View Pkwy',
    city: 'Independence',
    state: 'MO',
    zip: '64055',
    phone: '(816) 795-8400',
  },
  '90210': {
    store_id: '1789',
    store_name: "Lowe's of Hollywood",
    address: '5600 W Sunset Blvd',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90028',
    phone: '(323) 463-5400',
  },
  '75001': {
    store_id: '1042',
    store_name: "Lowe's of North Dallas",
    address: '11920 Inwood Rd',
    city: 'Dallas',
    state: 'TX',
    zip: '75244',
    phone: '(972) 385-6200',
  },
  '60601': {
    store_id: '2310',
    store_name: "Lowe's of Central Chicago",
    address: '1360 N Ashland Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60622',
    phone: '(773) 645-4100',
  },
  '33101': {
    store_id: '1845',
    store_name: "Lowe's of Miami Brickell",
    address: '1851 SW 8th St',
    city: 'Miami',
    state: 'FL',
    zip: '33135',
    phone: '(305) 649-5300',
  },
  default: {
    store_id: '0100',
    store_name: "Lowe's Regional Commercial Pro Center",
    address: '1000 Lowe Blvd',
    city: 'Kansas City',
    state: 'MO',
    zip: '64108',
    phone: '(800) 445-6937',
  },
};

export interface RetailerProfile {
  id: SupplyRetailerId;
  name: string;
  skuPrefix: string;
  priceMultiplier: number;
  defaultSearchTemplate: string;
  storesByZip: Record<string, LowesStoreInfo>;
}

function buildBrandStores(
  brandPrefix: string,
  specs: Array<[zip: string, store_id: string, market: string, address: string, city: string, state: string, storeZip: string, phone: string]>
): Record<string, LowesStoreInfo> {
  const map: Record<string, LowesStoreInfo> = {};
  for (const [zip, store_id, market, address, city, state, storeZip, phone] of specs) {
    map[zip] = {
      store_id,
      store_name: `${brandPrefix} — ${market}`,
      address,
      city,
      state,
      zip: storeZip,
      phone,
    };
  }
  return map;
}

export const RETAILER_PROFILES: Record<SupplyRetailerId, RetailerProfile> = {
  lowes: {
    id: 'lowes',
    name: "Lowe's Pro Supply",
    skuPrefix: 'LW',
    priceMultiplier: 1.0,
    defaultSearchTemplate: 'https://www.lowes.com/search?searchTerm={query}',
    storesByZip: KNOWN_STORES,
  },
  homedepot: {
    id: 'homedepot',
    name: 'The Home Depot Pro Xtra',
    skuPrefix: 'HD',
    priceMultiplier: 0.99,
    defaultSearchTemplate: 'https://www.homedepot.com/s/{query}',
    storesByZip: buildBrandStores('Home Depot Pro', [
      ['66208', '2211', 'Overland Park', '11550 W 95th St', 'Overland Park', 'KS', '66214', '(913) 492-1900'],
      ['66061', '2214', 'Olathe', '14955 W 119th St', 'Olathe', 'KS', '66062', '(913) 768-4200'],
      ['64133', '3004', 'Independence / KC East', '18600 E 39th St S', 'Independence', 'MO', '64057', '(816) 795-7400'],
      ['64050', '3004', 'Independence', '18600 E 39th St S', 'Independence', 'MO', '64057', '(816) 795-7400'],
      ['90210', '0668', 'Hollywood / West LA', '5600 Sunset Blvd', 'Los Angeles', 'CA', '90028', '(323) 463-5000'],
      ['75001', '0589', 'North Dallas', '11682 Forest Central Dr', 'Dallas', 'TX', '75243', '(214) 343-1700'],
      ['60601', '1902', 'Lincoln Park Chicago', '2665 N Halsted St', 'Chicago', 'IL', '60614', '(773) 529-1400'],
      ['33101', '0206', 'Downtown Miami', '2999 SW 69th Ct', 'Miami', 'FL', '33155', '(305) 267-4900'],
      ['default', '2200', 'Regional Pro Desk', '1000 Pro Xtra Blvd', 'Kansas City', 'MO', '64108', '(800) 466-3337'],
    ]),
  },
  menards: {
    id: 'menards',
    name: 'Menards Commercial Pro',
    skuPrefix: 'MN',
    priceMultiplier: 0.96,
    defaultSearchTemplate: 'https://www.menards.com/main/search.html?search={query}',
    storesByZip: buildBrandStores('Menards', [
      ['66208', '3241', 'Kansas City KS', '1301 N 98th St', 'Kansas City', 'KS', '66111', '(913) 334-1200'],
      ['66061', '3312', 'Olathe South', '15100 W 151st St', 'Olathe', 'KS', '66062', '(913) 390-8100'],
      ['64133', '3198', 'Independence', '17500 E 40 Hwy', 'Independence', 'MO', '64055', '(816) 478-9200'],
      ['64050', '3198', 'Independence', '17500 E 40 Hwy', 'Independence', 'MO', '64055', '(816) 478-9200'],
      ['60601', '3064', 'Chicago Midtown', '2601 N Clybourn Ave', 'Chicago', 'IL', '60614', '(773) 878-2200'],
      ['default', '3001', 'Regional Contractor Desk', '5101 Menard Dr', 'Eau Claire', 'WI', '54703', '(800) 636-2737'],
    ]),
  },
  build_ferguson: {
    id: 'build_ferguson',
    name: 'Ferguson / Build.com Pro',
    skuPrefix: 'FG',
    priceMultiplier: 1.03,
    defaultSearchTemplate: 'https://www.build.com/search?term={query}',
    storesByZip: buildBrandStores('Ferguson Supply', [
      ['66208', '0412', 'Lenexa Pro Counter', '15700 W 108th St', 'Lenexa', 'KS', '66219', '(913) 492-3100'],
      ['66061', '0412', 'Lenexa Pro Counter', '15700 W 108th St', 'Lenexa', 'KS', '66219', '(913) 492-3100'],
      ['64133', '0418', 'Kansas City Trade Desk', '1650 E Truman Rd', 'Kansas City', 'MO', '64106', '(816) 471-5400'],
      ['64050', '0418', 'Kansas City Trade Desk', '1650 E Truman Rd', 'Kansas City', 'MO', '64106', '(816) 471-5400'],
      ['default', '0400', 'National Pro Distribution', '12500 Jefferson Ave', 'Newport News', 'VA', '23602', '(800) 375-3403'],
    ]),
  },
  abc_supply: {
    id: 'abc_supply',
    name: 'ABC Supply Pro',
    skuPrefix: 'ABC',
    priceMultiplier: 0.97,
    defaultSearchTemplate: 'https://www.abcsupply.com/?s={query}',
    storesByZip: buildBrandStores('ABC Supply Co.', [
      ['66208', '0642', 'Kansas City Metro Branch', '1100 E 14th Ave', 'North Kansas City', 'MO', '64116', '(816) 472-7800'],
      ['64133', '0642', 'Kansas City Metro Branch', '1100 E 14th Ave', 'North Kansas City', 'MO', '64116', '(816) 472-7800'],
      ['64050', '0642', 'Kansas City Metro Branch', '1100 E 14th Ave', 'North Kansas City', 'MO', '64116', '(816) 472-7800'],
      ['default', '0600', 'Regional Wholesale Branch', '1 ABC Pkwy', 'Beloit', 'WI', '53511', '(800) 422-2787'],
    ]),
  },
  custom: {
    id: 'custom',
    name: 'Custom Materials Supplier',
    skuPrefix: 'SUP',
    priceMultiplier: 1.0,
    defaultSearchTemplate: 'https://www.google.com/search?q={query}',
    storesByZip: {
      default: {
        store_id: 'CUSTOM',
        store_name: 'Custom Connected Supplier',
        address: 'Configured Supplier Account',
        city: 'Local Trade Branch',
        state: 'US',
        zip: '00000',
        phone: 'Configured in Connection Settings',
      },
    },
  },
};

export function getDefaultRetailerConnection(
  retailerId: SupplyRetailerId = 'lowes'
): RetailerConnectionConfig {
  const profile = RETAILER_PROFILES[retailerId] || RETAILER_PROFILES.lowes;
  return {
    retailer_id: profile.id,
    retailer_name: profile.name,
    price_tier: 'contractor_pro',
    custom_discount_pct: 0,
    store_search_url_template: profile.defaultSearchTemplate,
  };
}

export async function syncOrderWithSupplierEndpoint(
  order: ProcurementOrder,
  connection: RetailerConnectionConfig
): Promise<{ ok: boolean; statusText: string }> {
  const endpoint = connection.api_endpoint?.trim();
  if (!endpoint) {
    return {
      ok: false,
      statusText: 'Enter an HTTPS supplier webhook/API endpoint URL first.',
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(endpoint);
  } catch {
    return {
      ok: false,
      statusText: 'Invalid supplier endpoint URL.',
    };
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return {
      ok: false,
      statusText: 'Supplier endpoint must use http:// or https://.',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (connection.api_key?.trim()) {
      headers.Authorization = `Bearer ${connection.api_key.trim()}`;
    }
    const response = await fetch(parsedUrl.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        retailer_id: connection.retailer_id,
        retailer_name: connection.retailer_name,
        account_id: connection.account_id,
        order,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) {
      return {
        ok: false,
        statusText: `Endpoint responded HTTP ${response.status} (${response.statusText || 'Error'})`,
      };
    }
    return {
      ok: true,
      statusText: `Synced ${order.line_items.length} line items (HTTP ${response.status}).`,
    };
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : 'Network/CORS request blocked';
    return {
      ok: false,
      statusText: `Sync failed (${msg}). Verify endpoint CORS/reachability or export CSV.`,
    };
  }
}

export class LowesB2BClient {
  public apiKey: string | null = null;
  public isLiveMode: boolean = false;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.apiKey = apiKey;
      this.isLiveMode = true;
    }
  }

  public getStoreByZip(
    zip: string,
    retailerId: SupplyRetailerId = 'lowes'
  ): LowesStoreInfo {
    const profile = RETAILER_PROFILES[retailerId] || RETAILER_PROFILES.lowes;
    return profile.storesByZip[zip] || profile.storesByZip.default || KNOWN_STORES.default;
  }

  /**
   * Resolves appropriate waste factor percentage based on trade category.
   * - Drywall / Insulation: +10%
   * - Trim / Molding / Finish Carpentry: +15%
   * - Tile / Flooring / Carpet: +15%
   * - Others: +0%
   */
  public getWasteFactor(tradeCategory: TradeCategory): number {
    switch (tradeCategory) {
      case 'Drywall':
        return 10;
      case 'Finish Carpentry':
        return 15;
      case 'Carpet, Flooring':
      case 'Flooring':
        return 15;
      default:
        return 0;
    }
  }

  /**
   * Matches a DefectItem to a catalog SKU.
   */
  public matchCatalogProduct(defect: DefectItem): LowesProductSKU | null {
    const normalizedTrade =
      defect.trade_category === 'Flooring'
        ? 'Carpet, Flooring'
        : defect.trade_category === 'Plumbing'
        ? 'Plumbing Fixtures'
        : defect.trade_category;

    // 1. Direct trade category matching
    const categoryMatches = MOCK_BUILDER_CATALOG.filter(
      (p) => p.category.toLowerCase() === normalizedTrade.toLowerCase()
    );

    if (categoryMatches.length === 0) {
      // 2. Keyword fallback in description
      const descLower = defect.description.toLowerCase();
      const matched = MOCK_BUILDER_CATALOG.find(
        (p) =>
          descLower.includes(p.category.toLowerCase()) ||
          p.keywords?.some((k) => descLower.includes(k)) ||
          p.name.toLowerCase().includes(descLower.split(' ')[0])
      );
      return matched || MOCK_BUILDER_CATALOG[0];
    }

    return categoryMatches[0];
  }

  /**
   * Compiles all verified room defects into a structured Materials Procurement Order
   * for Lowe's or any contractor-selected supply retailer.
   */
  public generateProcurementOrder(
    rooms: RoomNode[],
    zipCode: string,
    connection?: RetailerConnectionConfig
  ): ProcurementOrder {
    const retailerId: SupplyRetailerId = connection?.retailer_id || 'lowes';
    const profile = RETAILER_PROFILES[retailerId] || RETAILER_PROFILES.lowes;
    const priceTier = connection?.price_tier || 'contractor_pro';
    const customDiscountPct = Math.max(0, Math.min(50, connection?.custom_discount_pct || 0));
    const searchTemplate =
      connection?.store_search_url_template?.trim() || profile.defaultSearchTemplate;

    const store = this.getStoreByZip(zipCode, retailerId);
    const storeDisplayName =
      retailerId === 'custom' && connection?.retailer_name?.trim()
        ? connection.retailer_name.trim()
        : store.store_name;

    const isDefaultLowesBehavior =
      !connection ||
      (retailerId === 'lowes' && priceTier === 'contractor_pro' && customDiscountPct === 0);

    const lineItems: ProcurementLineItem[] = [];

    for (const room of rooms) {
      for (const defect of room.deficiencies) {
        if (!defect.is_verified || defect.action === 'Remove' || defect.action === 'Keep') {
          // Only buy materials for 'Replace' or 'Add' actions
          continue;
        }

        const product = this.matchCatalogProduct(defect);
        if (!product) continue;

        const wastePct = this.getWasteFactor(defect.trade_category);
        const adjustedQuantity = defect.quantity * (1 + wastePct / 100);
        // Calculate required packaged units rounded up
        const orderUnits = Math.ceil(adjustedQuantity / product.coverage_per_unit);

        const basePrice =
          priceTier === 'retail' ? product.retail_price : product.contractor_price;
        const effectiveUnitPrice = isDefaultLowesBehavior
          ? product.contractor_price
          : Number(
              (basePrice * profile.priceMultiplier * (1 - customDiscountPct / 100)).toFixed(2)
            );
        const extendedCost = Number((orderUnits * effectiveUnitPrice).toFixed(2));
        const sku = isDefaultLowesBehavior
          ? product.sku
          : product.sku.replace(/^LW-/, `${profile.skuPrefix}-`);
        const productUrl = searchTemplate.replace(
          '{query}',
          encodeURIComponent(product.model || product.name)
        );

        lineItems.push({
          id: `line-${lineItems.length + 1}`,
          defect_id: defect.id,
          room_name: room.name,
          sku,
          product_name: product.name,
          aisle: product.aisle,
          bay: product.bay,
          raw_quantity: defect.quantity,
          waste_factor_pct: wastePct,
          adjusted_quantity: Number(adjustedQuantity.toFixed(2)),
          order_units: orderUnits,
          unit_price: effectiveUnitPrice,
          extended_cost: extendedCost,
          product_url: productUrl,
        });
      }
    }

    // Sort line items naturally by Aisle then Bay for optimal in-store contractor routing
    lineItems.sort((a, b) => {
      const aisleCompare = a.aisle.localeCompare(b.aisle, undefined, { numeric: true });
      if (aisleCompare !== 0) return aisleCompare;
      return a.bay.localeCompare(b.bay, undefined, { numeric: true });
    });

    const subtotal = Number(
      lineItems.reduce((acc, item) => acc + item.extended_cost, 0).toFixed(2)
    );
    const estimated_tax = Number((subtotal * 0.088).toFixed(2)); // ~8.8% average sales tax
    const total = Number((subtotal + estimated_tax).toFixed(2));

    // Compile aisle summary
    const aisleCounts: Record<string, number> = {};
    for (const item of lineItems) {
      aisleCounts[item.aisle] = (aisleCounts[item.aisle] || 0) + item.order_units;
    }
    const aisle_bay_summary = Object.entries(aisleCounts).map(([aisle, items_count]) => ({
      aisle,
      items_count,
    }));

    return {
      retailer_id: retailerId,
      retailer_name: connection?.retailer_name || profile.name,
      account_id: connection?.account_id,
      price_tier: priceTier,
      store_id: store.store_id,
      store_name: storeDisplayName,
      store_address: `${store.address}, ${store.city}, ${store.state} ${store.zip}`,
      store_phone: store.phone,
      line_items: lineItems,
      subtotal,
      estimated_tax,
      total,
      aisle_bay_summary,
    };
  }
}

export const lowesClient = new LowesB2BClient();
