import { describe, it, expect } from 'vitest';
import {
  calculateTradeDirectCost,
  calculateAssemblyCostToCure,
  calculateRoomCostRollup,
  calculateProjectSummary,
  PRAIRIE_VILLAGE_COST_INDEX,
  CRAFTSMAN_27_BASELINE_TABLE,
  resolveRegionalCostIndex,
  mapRawQualityToClass,
  mapRawConditionToClass,
} from '../valuation';
import { RoomNode } from '../../../types/sprocket';

describe('Valuation & Craftsman Cost Engine', () => {
  it('calculates regional direct trade cost for Prairie Village KS 66208', () => {
    // Check Foundation from table:
    // Base Mat $19,728, Base Lab $28,118, Base Equip $4,912
    // Modifiers: Mat -1% (-0.01), Lab +13% (+0.13), Equip 0.0% (0.00)
    // Mat = 19728 * 0.99 = 19530.72
    // Lab = 28118 * 1.13 = 31773.34
    // Equip = 4912 * 1.00 = 4912.00
    // Total = 19530.72 + 31773.34 + 4912.00 = 56216.06
    const foundation = CRAFTSMAN_27_BASELINE_TABLE.find((a) => a.category === 'Foundation')!;
    const directCost = calculateTradeDirectCost(foundation, PRAIRIE_VILLAGE_COST_INDEX);
    expect(directCost).toBe(56216.06);
  });

  it('calculates cost to cure deficiency percentage correctly', () => {
    // Exterior Finish: Base Mat 15600, Base Lab 10443, Base Equip 0
    // Prairie Village: Mat -1% = 15444.00, Lab +13% = 11800.59 => Total = 27244.59
    // 50% deficiency => 27244.59 * 0.5 = 13622.30
    const exterior = CRAFTSMAN_27_BASELINE_TABLE.find((a) => a.category === 'Exterior Finish')!;
    const cureCost = calculateAssemblyCostToCure(exterior, PRAIRIE_VILLAGE_COST_INDEX, 50);
    expect(cureCost).toBe(13622.30);
  });

  it('calculates room cost rollup with base replacement and deficiencies', () => {
    const deficiencies = [
      {
        id: 'def-1',
        trade_category: 'Finish Carpentry' as const,
        action: 'Replace' as const,
        description: 'Replace 40 linear feet of baseboard',
        quantity: 40,
        unit: 'LF' as const,
        unit_price: 10.20,
        total_cost: 408.00,
        is_verified: true,
      },
    ];

    const rollup = calculateRoomCostRollup(
      200, // 200 sqft
      'Class 4', // $160/sqft base
      'Class 3',
      deficiencies,
      PRAIRIE_VILLAGE_COST_INDEX
    );

    expect(rollup.cost_to_cure).toBe(408.00);
    expect(rollup.base_replacement_cost).toBeGreaterThan(0);
    expect(rollup.room_total).toBe(rollup.base_replacement_cost + rollup.cost_to_cure);
  });

  it('calculates project summary with direct, indirect, and contractor incentive', () => {
    const dummyRoom: RoomNode = {
      id: 'room-1',
      name: 'Great Room',
      level: 'First Floor',
      dimensions: { length_ft: 20, width_ft: 20, height_ft: 9 },
      canvas_position: { x: 0, y: 0 },
      openings: [],
      floor_area_sqft: 400,
      gross_wall_area_sqft: 720,
      net_wall_area_sqft: 720,
      quality_class: 'Class 4',
      condition_class: 'Class 3',
      is_class_overridden: false,
      voice_transcript: '',
      deficiencies: [],
      photos: [],
      cost_rollup: {
        base_replacement_cost: 68000,
        cost_to_cure: 2500,
        room_total: 70500,
      },
    };

    const summary = calculateProjectSummary([dummyRoom], PRAIRIE_VILLAGE_COST_INDEX);
    expect(summary.direct_cost_subtotal).toBe(70500);
    expect(summary.indirect_cost_subtotal).toBe(8460); // 12% of 70500
    expect(summary.contractor_incentive).toBe(11844); // 15% of (70500 + 8460)
    expect(summary.total_project_cost).toBe(90804);
    expect(summary.total_cost_to_cure).toBe(2500);
    expect(summary.post_renovation_value).toBe(90804);
    expect(summary.as_is_value).toBe(88304); // 90804 - 2500
  });

  it('resolves KC metro regional cost indices and maps county quality/condition grades', () => {
    const olathe = resolveRegionalCostIndex('66061', 'Olathe', 'KS');
    expect(olathe.city).toBe('Olathe');
    expect(olathe.state).toBe('KS');

    const kcmo = resolveRegionalCostIndex('64133', 'Kansas City', 'MO');
    expect(kcmo.zip_code).toBe('64133');
    expect(kcmo.state).toBe('MO');

    const independence = resolveRegionalCostIndex('64050', 'Independence', 'MO');
    expect(independence.city).toBe('Independence');

    expect(mapRawQualityToClass('Fair+')).toBe('Class 5');
    expect(mapRawQualityToClass('B--B-')).toBe('Class 3');
    expect(mapRawConditionToClass('PR')).toBe('Class 5');
    expect(mapRawConditionToClass('4-AVERAGE')).toBe('Class 4');
  });

  it('excludes unverified and Keep defects from room cost_to_cure', () => {
    const defects = [
      {
        id: 'def-verified',
        trade_category: 'Drywall' as const,
        action: 'Replace' as const,
        description: 'Drywall patch',
        quantity: 50,
        unit: 'SF' as const,
        unit_price: 3.5,
        total_cost: 175,
        is_verified: true,
      },
      {
        id: 'def-unverified',
        trade_category: 'Painting' as const,
        action: 'Replace' as const,
        description: 'Unverified painting item',
        quantity: 100,
        unit: 'SF' as const,
        unit_price: 3.0,
        total_cost: 300,
        is_verified: false,
      },
      {
        id: 'def-keep',
        trade_category: 'Finish Carpentry' as const,
        action: 'Keep' as const,
        description: 'Existing trim',
        quantity: 40,
        unit: 'LF' as const,
        unit_price: 10.0,
        total_cost: 400,
        is_verified: true,
      },
    ];

    const rollup = calculateRoomCostRollup(
      200,
      'Class 4',
      'Class 3',
      defects,
      PRAIRIE_VILLAGE_COST_INDEX
    );

    expect(rollup.cost_to_cure).toBe(175);
  });

  it('distinctly breaks out remodel scope budget while maintaining full property valuation', () => {
    const dummyRoom: RoomNode = {
      id: 'room-remodel',
      name: 'Kitchen',
      level: 'First Floor',
      dimensions: { length_ft: 18, width_ft: 14, height_ft: 9 },
      canvas_position: { x: 0, y: 0 },
      openings: [],
      floor_area_sqft: 252,
      gross_wall_area_sqft: 576,
      net_wall_area_sqft: 576,
      quality_class: 'Class 4',
      condition_class: 'Class 3',
      is_class_overridden: false,
      voice_transcript: '',
      deficiencies: [
        {
          id: 'def-kitchen-1',
          trade_category: 'Cabinets',
          action: 'Replace',
          description: 'New Shaker Cabinets',
          quantity: 20,
          unit: 'LF',
          unit_price: 320,
          total_cost: 6400,
          is_verified: true,
        },
        {
          id: 'def-kitchen-2',
          trade_category: 'Carpet, Flooring',
          action: 'Replace',
          description: 'Porcelain Tile',
          quantity: 250,
          unit: 'SF',
          unit_price: 12,
          total_cost: 3000,
          is_verified: true,
        },
      ],
      photos: [],
      cost_rollup: {
        base_replacement_cost: 42840,
        cost_to_cure: 9400,
        room_total: 52240,
      },
    };

    // Calculate with remodel mode and remodel trade inclusions
    const summary = calculateProjectSummary(
      [dummyRoom],
      PRAIRIE_VILLAGE_COST_INDEX,
      'remodel',
      ['Cabinets', 'Carpet, Flooring', 'Painting']
    );

    // Full property valuation is maintained
    expect(summary.structural_base_cost).toBe(42840);
    expect(summary.post_renovation_value).toBeGreaterThan(50000);
    expect(summary.as_is_value).toBeCloseTo(summary.post_renovation_value - summary.total_cost_to_cure, 2);

    // Distinct Remodel Accounting is clearly indicated
    expect(summary.remodel_scope_direct).toBe(9400); // 6400 + 3000
    expect(summary.remodel_scope_indirect).toBe(940); // 10%
    expect(summary.remodel_contractor_fee).toBe(1551); // 15% of (9400 + 940)
    expect(summary.remodel_total_budget).toBe(11891); // 9400 + 940 + 1551

    // Remodel mode sets direct_cost_subtotal to the remodel scope rather than ground-up new construction
    expect(summary.direct_cost_subtotal).toBe(9400);
    expect(summary.total_project_cost).toBe(11891);
  });

  it('filters out excluded trade categories from remodel scope', () => {
    const dummyRoom: RoomNode = {
      id: 'room-filter',
      name: 'Basement Room',
      level: 'Basement',
      dimensions: { length_ft: 20, width_ft: 20, height_ft: 8 },
      canvas_position: { x: 0, y: 0 },
      openings: [],
      floor_area_sqft: 400,
      gross_wall_area_sqft: 640,
      net_wall_area_sqft: 640,
      quality_class: 'Class 4',
      condition_class: 'Class 4',
      is_class_overridden: false,
      voice_transcript: '',
      deficiencies: [
        {
          id: 'def-foundation',
          trade_category: 'Foundation',
          action: 'Replace',
          description: 'Foundation underpin',
          quantity: 1,
          unit: 'ALLOWANCE',
          unit_price: 15000,
          total_cost: 15000,
          is_verified: true,
        },
        {
          id: 'def-paint',
          trade_category: 'Painting',
          action: 'Replace',
          description: 'Repaint walls',
          quantity: 600,
          unit: 'SF',
          unit_price: 2.5,
          total_cost: 1500,
          is_verified: true,
        },
      ],
      photos: [],
      cost_rollup: {
        base_replacement_cost: 0,
        cost_to_cure: 0,
        room_total: 0,
      },
    };

    // When Foundation is excluded from the scope:
    const rollup = calculateRoomCostRollup(
      400,
      'Class 4',
      'Class 4',
      dummyRoom.deficiencies,
      PRAIRIE_VILLAGE_COST_INDEX,
      'remodel',
      ['Painting', 'Drywall'] // Foundation is NOT included
    );

    // Only Painting ($1500) is included; Foundation ($15000) is excluded
    expect(rollup.cost_to_cure).toBe(1500);
  });
});
