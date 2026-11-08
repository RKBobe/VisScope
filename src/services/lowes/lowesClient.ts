import {
  LowesProductSKU,
  ProcurementLineItem,
  ProcurementOrder,
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
  '90210': {
    store_id: '1789',
    store_name: "Lowe's of Hollywood",
    address: '5600 W Sunset Blvd',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90028',
    phone: '(323) 463-5400',
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

export class LowesB2BClient {
  public apiKey: string | null = null;
  public isLiveMode: boolean = false;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.apiKey = apiKey;
      this.isLiveMode = true;
    }
  }

  public getStoreByZip(zip: string): LowesStoreInfo {
    return KNOWN_STORES[zip] || KNOWN_STORES.default;
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
    // 1. Direct trade category matching
    const categoryMatches = MOCK_BUILDER_CATALOG.filter(
      (p) => p.category.toLowerCase() === defect.trade_category.toLowerCase()
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
   * Compiles all verified room defects into a structured Lowe's B2B Procurement Order.
   */
  public generateProcurementOrder(rooms: RoomNode[], zipCode: string): ProcurementOrder {
    const store = this.getStoreByZip(zipCode);
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
        const extendedCost = Number((orderUnits * product.contractor_price).toFixed(2));

        lineItems.push({
          id: `line-${lineItems.length + 1}`,
          defect_id: defect.id,
          room_name: room.name,
          sku: product.sku,
          product_name: product.name,
          aisle: product.aisle,
          bay: product.bay,
          raw_quantity: defect.quantity,
          waste_factor_pct: wastePct,
          adjusted_quantity: Number(adjustedQuantity.toFixed(2)),
          order_units: orderUnits,
          unit_price: product.contractor_price,
          extended_cost: extendedCost,
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
      store_id: store.store_id,
      store_name: store.store_name,
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
