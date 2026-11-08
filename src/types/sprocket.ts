export type QualityClass = 'Class 1' | 'Class 2' | 'Class 3' | 'Class 4' | 'Class 5' | 'Class 6';
export type ConditionClass = 'Class 1' | 'Class 2' | 'Class 3' | 'Class 4' | 'Class 5' | 'Class 6';
export type ScopeAction = 'Keep' | 'Remove' | 'Replace' | 'Add';
export type FloorLevel = 'First Floor' | 'Basement' | 'Second Floor';

export type TradeCategory =
  | 'Excavation'
  | 'Foundation'
  | 'Framing'
  | 'Interior Wall Finish'
  | 'Carpet, Flooring'
  | 'Cabinets'
  | 'Countertops'
  | 'Plumbing Fixtures'
  | 'Painting'
  | 'Doors & Windows'
  | 'Roofing'
  | 'Electrical'
  | 'HVAC'
  | 'Drywall'
  | 'Flooring'
  | 'Plumbing'
  | 'Finish Carpentry'
  | 'Exterior Finish';

export interface Point2D {
  x: number; // inches
  y: number; // inches
}

export interface WallOpening {
  id: string;
  type: 'door' | 'window' | 'cased_opening';
  width_in: number;
  height_in: number;
  wall_side: 'top' | 'bottom' | 'left' | 'right';
  offset_in: number; // Distance from the start edge of the wall side (top/bottom: left->right, left/right: top->bottom)
}

export interface DefectItem {
  id: string;
  trade_category: TradeCategory;
  action: ScopeAction;
  description: string;
  quantity: number;
  unit: 'SF' | 'LF' | 'EA' | 'ALLOWANCE';
  unit_price: number;
  total_cost: number;
  is_verified: boolean;
}

export interface RoomPhoto {
  id: string;
  file_uri: string;
  direction: 'North' | 'South' | 'East' | 'West' | 'Defect';
  azimuth_deg: number;
  timestamp: string;
  defect_id?: string;
}

export interface RoomCostRollup {
  base_replacement_cost: number;
  cost_to_cure: number;
  room_total: number;
}

export interface RoomDimensions {
  length_ft: number;
  width_ft: number;
  height_ft: number;
}

export interface RoomNode {
  id: string;
  name: string;
  level: FloorLevel;
  dimensions: RoomDimensions;
  canvas_position: Point2D; // In inches
  polygon_points?: Point2D[]; // Optional arbitrary polygon (inches) for L-shape or angled rooms
  openings: WallOpening[];
  floor_area_sqft: number;
  gross_wall_area_sqft: number;
  net_wall_area_sqft: number;
  quality_class: QualityClass;
  condition_class: ConditionClass;
  is_class_overridden: boolean;
  voice_transcript: string;
  deficiencies: DefectItem[];
  photos: RoomPhoto[];
  cost_rollup: RoomCostRollup;
}

export interface RegionalCostIndex {
  zip_code: string;
  city: string;
  state: string;
  material_modifier: number; // e.g. -0.01 for -1%
  labor_modifier: number;    // e.g. +0.13 for +13%
  equipment_modifier: number; // e.g. 0.00 for 0%
}

export interface CraftsmanTradeAssembly {
  category: string;
  trade_group: TradeCategory;
  base_material: number;
  base_labor: number;
  base_equipment: number;
  total_base: number;
  standard_unit: 'SF' | 'LF' | 'EA' | 'ALLOWANCE';
  base_unit_rate: number;
  deficiency_percent?: number;
}

export interface ProjectSummary {
  direct_cost_subtotal: number;
  indirect_cost_subtotal: number;
  contractor_incentive: number;
  total_project_cost: number;
  total_cost_to_cure: number;
  as_is_value: number; // Post-Renovation (RCN) minus Cost to Cure
  post_renovation_value: number; // Replacement Cost New (RCN)
}

export interface SprocketProject {
  project_id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  gla_sqft: number; // Gross Living Area (above grade)
  gba_sqft: number; // Gross Building Area (all levels)
  cost_index: RegionalCostIndex;
  baseline_quality: QualityClass;
  baseline_condition: ConditionClass;
  rooms: RoomNode[];
  summary: ProjectSummary;
  created_at: string;
  updated_at: string;
}

// Lowe's B2B Procurement Contracts
export interface LowesProductSKU {
  sku: string;
  model: string;
  name: string;
  description: string;
  category: TradeCategory;
  keywords?: string[];
  unit_of_measure: 'EA' | 'SF' | 'LF' | 'BAG' | 'ROLL' | 'CAN';
  coverage_per_unit: number; // e.g. 32 for 4x8 drywall sheet (32 SF), 8 for 8ft trim (8 LF)
  retail_price: number;
  contractor_price: number;
  aisle: string;
  bay: string;
  stock_level: number;
  in_stock: boolean;
}

export interface ProcurementLineItem {
  id: string;
  defect_id: string;
  room_name: string;
  sku: string;
  product_name: string;
  aisle: string;
  bay: string;
  raw_quantity: number;
  waste_factor_pct: number; // 10 or 15
  adjusted_quantity: number;
  order_units: number; // Packaged units rounded up
  unit_price: number;
  extended_cost: number;
}

export interface ProcurementOrder {
  store_id: string;
  store_name: string;
  store_address: string;
  store_phone: string;
  line_items: ProcurementLineItem[];
  subtotal: number;
  estimated_tax: number;
  total: number;
  aisle_bay_summary: {
    aisle: string;
    items_count: number;
  }[];
}
