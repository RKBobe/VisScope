export type QualityClass = 'Class 1' | 'Class 2' | 'Class 3' | 'Class 4' | 'Class 5' | 'Class 6';
export type ConditionClass = 'Class 1' | 'Class 2' | 'Class 3' | 'Class 4' | 'Class 5' | 'Class 6';
export type ScopeAction = 'Keep' | 'Remove' | 'Replace' | 'Add';
export type FloorLevel = 'First Floor' | 'Second Floor' | 'Basement' | 'Attic';
export type RoomNodeType = 'interior_room' | 'exterior_footprint' | 'accessory_structure';

export type ProjectScopeType =
  | 'clean_appraisal'
  | 'remodel'
  | 'casualty_loss'
  | 'pre_purchase'
  | 'pre_listing'
  | 'new_construction';

export type InspectionTemplateId =
  | 'clean_appraisal'
  | 'remodel_renovation'
  | 'fire_damage'
  | 'flood_damage'
  | 'pre_purchase'
  | 'pre_listing'
  | 'new_construction'
  | 'custom';

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

export const ALL_TRADE_CATEGORIES: TradeCategory[] = [
  'Excavation',
  'Foundation',
  'Framing',
  'Interior Wall Finish',
  'Carpet, Flooring',
  'Cabinets',
  'Countertops',
  'Plumbing Fixtures',
  'Painting',
  'Doors & Windows',
  'Roofing',
  'Electrical',
  'HVAC',
  'Drywall',
  'Flooring',
  'Plumbing',
  'Finish Carpentry',
  'Exterior Finish',
];

export const STRUCTURAL_TRADE_CATEGORIES: TradeCategory[] = [
  'Excavation',
  'Foundation',
  'Framing',
  'Exterior Finish',
  'Roofing',
];

export const REMODEL_DEFAULT_TRADE_CATEGORIES: TradeCategory[] = [
  'Interior Wall Finish',
  'Carpet, Flooring',
  'Cabinets',
  'Countertops',
  'Plumbing Fixtures',
  'Painting',
  'Doors & Windows',
  'Electrical',
  'HVAC',
  'Drywall',
  'Flooring',
  'Plumbing',
  'Finish Carpentry',
];

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
  node_type?: RoomNodeType;
  structure_code?: string;
  exclude_from_gla?: boolean;
  ingested_from_source?: string;
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

export interface BuildingPermitRecord {
  number: string;
  amount: number;
  type: string;
  issue_date: string;
  status: string;
  pct_complete?: number;
}

export interface DwellingComponentRecord {
  code?: string;
  description: string;
  units?: number;
  pct?: number;
  quality?: string;
  year?: number;
}

export type IngestionDocumentType =
  | 'johnson_county_prc'
  | 'jackson_county_prc'
  | 'architectural_floorplan'
  | 'generic_pdf'
  | 'image_sketch'
  | 'meshengine_bundle'
  | 'manual';

export type IngestionGeometryMode = 'exterior_footprint_only' | 'clear_interior_rooms';

export interface PropertyMetadata {
  source_document_type?: IngestionDocumentType;
  source_file_name?: string;
  ingestion_mode?: IngestionGeometryMode;
  ingestion_notes?: string;
  parcel_id?: string;
  quick_ref_id?: string;
  tax_year?: number;
  owner_name?: string;
  legal_description?: string;
  neighborhood_code?: string;
  zoning?: string;
  property_class?: string;
  lot_size_sqft?: number;
  lot_size_acres?: number;
  year_built?: number;
  architectural_style?: string;
  stories?: string;
  total_living_area_reported_sqft?: number;
  main_floor_living_area_sqft?: number;
  upper_floor_living_area_sqft?: number;
  basement_type?: string;
  basement_area_sqft?: number;
  total_rooms_reported?: number;
  bedrooms_reported?: number;
  full_baths_reported?: number;
  half_baths_reported?: number;
  foundation_type?: string;
  exterior_wall_type?: string;
  roof_type?: string;
  roofing_material?: string;
  heating_cooling_description?: string;
  plumbing_fixtures_count?: number;
  plumbing_rough_ins_count?: number;
  fireplaces_count?: number;
  garage_description?: string;
  quality_grade_raw?: string;
  condition_cdu_raw?: string;
  appraised_land_value?: number;
  appraised_building_value?: number;
  appraised_total_value?: number;
  assessed_total_value?: number;
  dwelling_rcn_value?: number;
  percent_good?: number;
  architect_firm?: string;
  drawing_scheme?: string;
  drawing_scale?: string;
  usable_area_reported_sqft?: number;
  rentable_area_reported_sqft?: number;
  blueprint_underlay_data_uri?: string;
  permits?: BuildingPermitRecord[];
  components?: DwellingComponentRecord[];
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
  // Distinct Remodel & Renovation Accounting
  remodel_scope_direct?: number;     // Direct cost of remodel trade assemblies & deficiencies
  remodel_scope_indirect?: number;   // Remodel-specific indirect costs (permits, dumpster, clean-up)
  remodel_contractor_fee?: number;   // Remodel contractor profit & overhead
  remodel_total_budget?: number;     // Total remodel investment
  structural_base_cost?: number;     // Existing foundation, framing, and building envelope base
}

export type SupplyRetailerId =
  | 'lowes'
  | 'homedepot'
  | 'menards'
  | 'build_ferguson'
  | 'abc_supply'
  | 'custom';

export interface RetailerConnectionConfig {
  retailer_id: SupplyRetailerId;
  retailer_name: string;
  account_id?: string;
  api_endpoint?: string;
  api_key?: string;
  price_tier: 'contractor_pro' | 'retail';
  custom_discount_pct?: number;
  store_search_url_template: string;
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
  project_type?: ProjectScopeType;
  template_id?: InspectionTemplateId;
  included_trade_categories?: TradeCategory[];
  supply_retailer?: RetailerConnectionConfig;
  property_metadata?: PropertyMetadata;
  meshengine_sync?: {
    loan_id: string;
    revision_id?: string;
    order_type?: 'initial_prefill' | 'reinspection_dispatch';
    discrepancies?: Array<{
      code: string;
      severity: string;
      message: string;
      field?: string | null;
      expected_value?: unknown;
      reported_value?: unknown;
      room_id?: string | null;
      underwriter_note?: string | null;
      allowed_cost?: number | null;
    }>;
    attachments?: Array<{
      name: string;
      bucket_key: string;
      content_type?: string;
      sha256?: string | null;
      download_url?: string | null;
    }>;
    last_synced_at?: string;
  };
  rooms: RoomNode[];
  summary: ProjectSummary;
  created_at: string;
  updated_at: string;
}

// Multi-Retailer & B2B Procurement Contracts
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
  product_url?: string;
}

export interface ProcurementOrder {
  retailer_id?: SupplyRetailerId;
  retailer_name?: string;
  account_id?: string;
  price_tier?: 'contractor_pro' | 'retail';
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
