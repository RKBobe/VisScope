import {
  QualityClass,
  ConditionClass,
  RegionalCostIndex,
  CraftsmanTradeAssembly,
  RoomNode,
  ProjectSummary,
  DefectItem,
} from '../../types/sprocket';

export const PRAIRIE_VILLAGE_COST_INDEX: RegionalCostIndex = {
  zip_code: '66208',
  city: 'Prairie Village',
  state: 'KS',
  material_modifier: -0.01, // -1.0%
  labor_modifier: 0.13,     // +13.0%
  equipment_modifier: 0.00, // 0.0%
};

export const COMMON_REGIONAL_INDICES: Record<string, RegionalCostIndex> = {
  '66208': PRAIRIE_VILLAGE_COST_INDEX,
  '90210': {
    zip_code: '90210',
    city: 'Beverly Hills',
    state: 'CA',
    material_modifier: 0.18,
    labor_modifier: 0.42,
    equipment_modifier: 0.15,
  },
  '75001': {
    zip_code: '75001',
    city: 'Dallas',
    state: 'TX',
    material_modifier: 0.02,
    labor_modifier: -0.04,
    equipment_modifier: -0.02,
  },
  '60601': {
    zip_code: '60601',
    city: 'Chicago',
    state: 'IL',
    material_modifier: 0.08,
    labor_modifier: 0.35,
    equipment_modifier: 0.10,
  },
  '33101': {
    zip_code: '33101',
    city: 'Miami',
    state: 'FL',
    material_modifier: 0.06,
    labor_modifier: 0.05,
    equipment_modifier: 0.04,
  },
};

/**
 * 27-Category Direct Cost Baseline Table (Derived from National Building Cost Manual & Craftsman Standards)
 */
export const CRAFTSMAN_27_BASELINE_TABLE: CraftsmanTradeAssembly[] = [
  {
    category: 'Excavation',
    trade_group: 'Excavation',
    base_material: 0,
    base_labor: 6624,
    base_equipment: 1907,
    total_base: 8531,
    standard_unit: 'EA',
    base_unit_rate: 8531,
  },
  {
    category: 'Foundation',
    trade_group: 'Foundation',
    base_material: 19728,
    base_labor: 28118,
    base_equipment: 4912,
    total_base: 52758,
    standard_unit: 'SF',
    base_unit_rate: 26.38,
  },
  {
    category: 'Framing',
    trade_group: 'Framing',
    base_material: 19730,
    base_labor: 25695,
    base_equipment: 0,
    total_base: 45425,
    standard_unit: 'SF',
    base_unit_rate: 22.71,
  },
  {
    category: 'Exterior Finish',
    trade_group: 'Exterior Finish',
    base_material: 15600,
    base_labor: 10443,
    base_equipment: 0,
    total_base: 26043,
    standard_unit: 'SF',
    base_unit_rate: 13.02,
  },
  {
    category: 'Roofing',
    trade_group: 'Roofing',
    base_material: 9400,
    base_labor: 7200,
    base_equipment: 450,
    total_base: 17050,
    standard_unit: 'SF',
    base_unit_rate: 8.53,
  },
  {
    category: 'Interior Wall Finish',
    trade_group: 'Interior Wall Finish',
    base_material: 11632,
    base_labor: 16178,
    base_equipment: 0,
    total_base: 27810,
    standard_unit: 'SF',
    base_unit_rate: 3.85,
  },
  {
    category: 'Carpet, Flooring',
    trade_group: 'Carpet, Flooring',
    base_material: 13333,
    base_labor: 8859,
    base_equipment: 0,
    total_base: 22192,
    standard_unit: 'SF',
    base_unit_rate: 11.10,
  },
  {
    category: 'Cabinets',
    trade_group: 'Cabinets',
    base_material: 14095,
    base_labor: 4022,
    base_equipment: 0,
    total_base: 18117,
    standard_unit: 'LF',
    base_unit_rate: 320.00,
  },
  {
    category: 'Countertops',
    trade_group: 'Countertops',
    base_material: 4286,
    base_labor: 3261,
    base_equipment: 0,
    total_base: 7547,
    standard_unit: 'SF',
    base_unit_rate: 85.00,
  },
  {
    category: 'Plumbing Fixtures',
    trade_group: 'Plumbing Fixtures',
    base_material: 12857,
    base_labor: 5707,
    base_equipment: 0,
    total_base: 18564,
    standard_unit: 'EA',
    base_unit_rate: 1250.00,
  },
  {
    category: 'Painting',
    trade_group: 'Painting',
    base_material: 4199,
    base_labor: 8902,
    base_equipment: 0,
    total_base: 13101,
    standard_unit: 'SF',
    base_unit_rate: 2.75,
  },
  {
    category: 'Doors & Windows',
    trade_group: 'Doors & Windows',
    base_material: 8231,
    base_labor: 4376,
    base_equipment: 0,
    total_base: 12607,
    standard_unit: 'EA',
    base_unit_rate: 450.00,
  },
  {
    category: 'Electrical Wiring & Fixtures',
    trade_group: 'Electrical',
    base_material: 8500,
    base_labor: 11200,
    base_equipment: 0,
    total_base: 19700,
    standard_unit: 'SF',
    base_unit_rate: 9.85,
  },
  {
    category: 'HVAC Heating & Cooling',
    trade_group: 'HVAC',
    base_material: 11500,
    base_labor: 7400,
    base_equipment: 500,
    total_base: 19400,
    standard_unit: 'EA',
    base_unit_rate: 14500.00,
  },
  {
    category: 'Drywall & Hanging',
    trade_group: 'Drywall',
    base_material: 6400,
    base_labor: 9800,
    base_equipment: 0,
    total_base: 16200,
    standard_unit: 'SF',
    base_unit_rate: 2.60,
  },
  {
    category: 'Finish Carpentry & Trim',
    trade_group: 'Finish Carpentry',
    base_material: 4500,
    base_labor: 6800,
    base_equipment: 0,
    total_base: 11300,
    standard_unit: 'LF',
    base_unit_rate: 8.50,
  },
];

/**
 * Quality Class Cost Multipliers (appraisal baseline)
 * Base Class 4 = standard builder grade = 1.00
 */
export const QUALITY_CLASS_MULTIPLIERS: Record<QualityClass, number> = {
  'Class 1': 2.45, // Architect-designed estate
  'Class 2': 1.80, // Custom high-end
  'Class 3': 1.35, // Semi-custom upgraded
  'Class 4': 1.00, // Standard tract / production builder
  'Class 5': 0.82, // Economy / basic
  'Class 6': 0.65, // Minimum low-cost
};

/**
 * Condition Class Cost-to-Cure Factor
 * Represents overall deferred maintenance % when not itemized
 */
export const CONDITION_CLASS_DEPRECIATION: Record<ConditionClass, number> = {
  'Class 1': 0.00, // Brand new
  'Class 2': 0.02, // Like new / remodeled
  'Class 3': 0.08, // Well maintained
  'Class 4': 0.18, // Adequately maintained
  'Class 5': 0.38, // Substantial deferred maintenance
  'Class 6': 0.70, // Severe structural / uninhabitable
};

/**
 * Base Replacement Cost per SQFT by Quality Class (Base index = 1.0)
 */
export const BASE_REPLACEMENT_COST_PER_SQFT: Record<QualityClass, number> = {
  'Class 1': 380,
  'Class 2': 285,
  'Class 3': 215,
  'Class 4': 160,
  'Class 5': 125,
  'Class 6': 95,
};

/**
 * Calculates Trade Direct Cost adjusted by Regional Modifiers.
 * Formula: (Base Mat * (1 + MatMod)) + (Base Lab * (1 + LabMod)) + (Base Equip * (1 + EquipMod))
 */
export function calculateTradeDirectCost(
  assembly: CraftsmanTradeAssembly,
  costIndex: RegionalCostIndex
): number {
  const adjustedMat = assembly.base_material * (1 + costIndex.material_modifier);
  const adjustedLab = assembly.base_labor * (1 + costIndex.labor_modifier);
  const adjustedEquip = assembly.base_equipment * (1 + costIndex.equipment_modifier);

  return Number((adjustedMat + adjustedLab + adjustedEquip).toFixed(2));
}

/**
 * Calculates Cost to Cure for a given trade assembly using deficiency percentage.
 * Formula: Trade Direct Cost * Deficiency %
 */
export function calculateAssemblyCostToCure(
  assembly: CraftsmanTradeAssembly,
  costIndex: RegionalCostIndex,
  deficiencyPercent: number
): number {
  const tradeDirectCost = calculateTradeDirectCost(assembly, costIndex);
  const deficiencyRatio = deficiencyPercent > 1 ? deficiencyPercent / 100 : deficiencyPercent;
  return Number((tradeDirectCost * deficiencyRatio).toFixed(2));
}

/**
 * Resolves adjusted unit price for a granular DefectItem based on trade and regional modifiers.
 */
export function getAdjustedUnitPrice(
  tradeCategory: string,
  _unit: string,
  costIndex: RegionalCostIndex,
  defaultRate?: number
): number {
  const matchedAssembly = CRAFTSMAN_27_BASELINE_TABLE.find(
    (a) => a.trade_group.toLowerCase() === tradeCategory.toLowerCase() ||
           a.category.toLowerCase().includes(tradeCategory.toLowerCase())
  );

  let baseRate = defaultRate || (matchedAssembly ? matchedAssembly.base_unit_rate : 25.0);

  // If unit is LF for trim, ensure realistic base rate
  if (tradeCategory.toLowerCase().includes('carpentry') || tradeCategory.toLowerCase().includes('baseboard')) {
    baseRate = 9.50;
  } else if (tradeCategory.toLowerCase().includes('drywall')) {
    baseRate = 3.25;
  } else if (tradeCategory.toLowerCase().includes('paint')) {
    baseRate = 2.85;
  } else if (tradeCategory.toLowerCase().includes('floor') || tradeCategory.toLowerCase().includes('carpet')) {
    baseRate = 12.00;
  }

  // Weight: 40% materials, 60% labor for standard repair tasks
  const adjustedRate =
    baseRate * 0.4 * (1 + costIndex.material_modifier) +
    baseRate * 0.6 * (1 + costIndex.labor_modifier);

  return Number(adjustedRate.toFixed(2));
}

/**
 * Calculates Room Cost Rollup:
 * 1. Base Replacement Cost = Area * Base $/SF * Quality Multiplier * Regional Combined Index
 * 2. Cost to Cure = Sum of all DefectItems in room (or Condition % of base if no defects)
 * 3. Room Total = Base Replacement Cost + Cost to Cure
 */
export function calculateRoomCostRollup(
  areaSqft: number,
  qualityClass: QualityClass,
  conditionClass: ConditionClass,
  deficiencies: DefectItem[],
  costIndex: RegionalCostIndex
): { base_replacement_cost: number; cost_to_cure: number; room_total: number } {
  const baseRatePerSqft = BASE_REPLACEMENT_COST_PER_SQFT[qualityClass] || 160;

  // Regional composite factor: 45% Material, 50% Labor, 5% Equip
  const compositeRegionalMultiplier =
    0.45 * (1 + costIndex.material_modifier) +
    0.50 * (1 + costIndex.labor_modifier) +
    0.05 * (1 + costIndex.equipment_modifier);

  const base_replacement_cost = Number(
    (areaSqft * baseRatePerSqft * compositeRegionalMultiplier).toFixed(2)
  );

  let cost_to_cure = 0;
  if (deficiencies && deficiencies.length > 0) {
    for (const defect of deficiencies) {
      cost_to_cure += defect.total_cost;
    }
  } else {
    // Fallback: estimate from condition class depreciation
    const conditionFactor = CONDITION_CLASS_DEPRECIATION[conditionClass] || 0;
    cost_to_cure = base_replacement_cost * conditionFactor;
  }
  cost_to_cure = Number(cost_to_cure.toFixed(2));

  const room_total = Number((base_replacement_cost + cost_to_cure).toFixed(2));

  return {
    base_replacement_cost,
    cost_to_cure,
    room_total,
  };
}

/**
 * Calculates full project cost summary with Craftsman Direct & Indirect breakdown.
 */
export function calculateProjectSummary(
  rooms: RoomNode[],
  _costIndex: RegionalCostIndex
): ProjectSummary {
  let totalBaseReplacement = 0;
  let totalCostToCure = 0;

  for (const room of rooms) {
    totalBaseReplacement += room.cost_rollup.base_replacement_cost;
    totalCostToCure += room.cost_rollup.cost_to_cure;
  }

  // Direct Cost Subtotal = Base Replacement + Cost to Cure
  const direct_cost_subtotal = Number((totalBaseReplacement + totalCostToCure).toFixed(2));

  // Indirect Costs (Permits, architectural, insurance, temporary utilities ~ 12%)
  const indirect_cost_subtotal = Number((direct_cost_subtotal * 0.12).toFixed(2));

  // Contractor Incentive / Profit & Overhead (~ 15%)
  const contractor_incentive = Number(
    ((direct_cost_subtotal + indirect_cost_subtotal) * 0.15).toFixed(2)
  );

  const total_project_cost = Number(
    (direct_cost_subtotal + indirect_cost_subtotal + contractor_incentive).toFixed(2)
  );

  const total_cost_to_cure = Number(totalCostToCure.toFixed(2));
  const post_renovation_value = total_project_cost;
  const as_is_value = Number(Math.max(0, post_renovation_value - total_cost_to_cure).toFixed(2));

  return {
    direct_cost_subtotal,
    indirect_cost_subtotal,
    contractor_incentive,
    total_project_cost,
    total_cost_to_cure,
    as_is_value,
    post_renovation_value,
  };
}
