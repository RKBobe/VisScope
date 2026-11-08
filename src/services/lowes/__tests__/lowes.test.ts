import { describe, it, expect } from 'vitest';
import { LowesB2BClient } from '../lowesClient';
import { exportLowesPickSheetCSV } from '../pickSheetExporter';
import { RoomNode } from '../../../types/sprocket';

describe("Lowe's B2B Procurement Service", () => {
  const client = new LowesB2BClient();

  it('resolves correct store for Prairie Village 66208', () => {
    const store = client.getStoreByZip('66208');
    expect(store.store_id).toBe('0584');
    expect(store.store_name).toContain('Overland Park');
  });

  it('applies waste factor math correctly', () => {
    expect(client.getWasteFactor('Drywall')).toBe(10);
    expect(client.getWasteFactor('Finish Carpentry')).toBe(15);
    expect(client.getWasteFactor('Carpet, Flooring')).toBe(15);
    expect(client.getWasteFactor('Plumbing Fixtures')).toBe(0);
  });

  it('calculates order units with waste factor rounded up', () => {
    const mockRoom: RoomNode = {
      id: 'room-1',
      name: 'Master Bed',
      level: 'First Floor',
      dimensions: { length_ft: 15, width_ft: 15, height_ft: 9 },
      canvas_position: { x: 0, y: 0 },
      openings: [],
      floor_area_sqft: 225,
      gross_wall_area_sqft: 540,
      net_wall_area_sqft: 540,
      quality_class: 'Class 4',
      condition_class: 'Class 3',
      is_class_overridden: false,
      voice_transcript: '',
      photos: [],
      cost_rollup: { base_replacement_cost: 36000, cost_to_cure: 0, room_total: 36000 },
      deficiencies: [
        {
          id: 'def-1',
          trade_category: 'Drywall',
          action: 'Replace',
          description: 'Drywall ceiling repair',
          quantity: 70, // 70 SF drywall + 10% waste = 77 SF. Drywall sheet covers 32 SF => ceil(77 / 32) = 3 sheets
          unit: 'SF',
          unit_price: 3.25,
          total_cost: 227.50,
          is_verified: true,
        },
      ],
    };

    const order = client.generateProcurementOrder([mockRoom], '66208');
    expect(order.line_items.length).toBe(1);
    const item = order.line_items[0];
    expect(item.raw_quantity).toBe(70);
    expect(item.waste_factor_pct).toBe(10);
    expect(item.adjusted_quantity).toBe(77);
    expect(item.order_units).toBe(3); // 3 sheets
    expect(item.extended_cost).toBeGreaterThan(0);
  });

  it('exports valid CSV with Aisle and Bay headers', () => {
    const mockRoom: RoomNode = {
      id: 'room-1',
      name: 'Hallway',
      level: 'First Floor',
      dimensions: { length_ft: 10, width_ft: 4, height_ft: 9 },
      canvas_position: { x: 0, y: 0 },
      openings: [],
      floor_area_sqft: 40,
      gross_wall_area_sqft: 252,
      net_wall_area_sqft: 252,
      quality_class: 'Class 4',
      condition_class: 'Class 3',
      is_class_overridden: false,
      voice_transcript: '',
      photos: [],
      cost_rollup: { base_replacement_cost: 6400, cost_to_cure: 0, room_total: 6400 },
      deficiencies: [
        {
          id: 'def-2',
          trade_category: 'Finish Carpentry',
          action: 'Replace',
          description: 'Baseboard trim',
          quantity: 28, // 28 LF + 15% waste = 32.2 LF. 8 LF sticks => ceil(32.2 / 8) = 5 sticks
          unit: 'LF',
          unit_price: 10.20,
          total_cost: 285.60,
          is_verified: true,
        },
      ],
    };

    const order = client.generateProcurementOrder([mockRoom], '66208');
    const csv = exportLowesPickSheetCSV(order);
    expect(csv).toContain('Aisle');
    expect(csv).toContain('Bay');
    expect(csv).toContain('Subtotal');
    expect(csv).toContain('Total Purchase Order');
  });
});
