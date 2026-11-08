import { describe, it, expect } from 'vitest';
import {
  calculateTradeDirectCost,
  calculateAssemblyCostToCure,
  calculateRoomCostRollup,
  calculateProjectSummary,
  PRAIRIE_VILLAGE_COST_INDEX,
  CRAFTSMAN_27_BASELINE_TABLE,
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
});
