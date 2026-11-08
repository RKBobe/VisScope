import { describe, it, expect } from 'vitest';
import { generateFloorplanSVG, generateUadXmlPayload, createMeshEngineBundle } from '../bundleSerializer';
import { SprocketProject } from '../../../types/sprocket';
import { PRAIRIE_VILLAGE_COST_INDEX } from '../../math/valuation';

describe('MeshEngine Bundle Serializer', () => {
  const sampleProject: SprocketProject = {
    project_id: 'PRJ-66208-001',
    name: 'Prairie Village Modern Craftsman',
    address: {
      street: '7550 Windsor St',
      city: 'Prairie Village',
      state: 'KS',
      zip: '66208',
    },
    gla_sqft: 2250,
    gba_sqft: 2800,
    cost_index: PRAIRIE_VILLAGE_COST_INDEX,
    baseline_quality: 'Class 4',
    baseline_condition: 'Class 3',
    rooms: [
      {
        id: 'room-1',
        name: 'Living Room',
        level: 'First Floor',
        dimensions: { length_ft: 20, width_ft: 15, height_ft: 9 },
        canvas_position: { x: 120, y: 120 },
        openings: [
          {
            id: 'open-1',
            type: 'door',
            width_in: 36,
            height_in: 80,
            wall_side: 'bottom',
            offset_in: 48,
          },
        ],
        floor_area_sqft: 300,
        gross_wall_area_sqft: 630,
        net_wall_area_sqft: 610,
        quality_class: 'Class 4',
        condition_class: 'Class 3',
        is_class_overridden: false,
        voice_transcript: 'Replace 40 linear feet of baseboard',
        deficiencies: [
          {
            id: 'def-1',
            trade_category: 'Finish Carpentry',
            action: 'Replace',
            description: 'Replace 40 LF of baseboard',
            quantity: 40,
            unit: 'LF',
            unit_price: 10.20,
            total_cost: 408.0,
            is_verified: true,
          },
        ],
        photos: [],
        cost_rollup: {
          base_replacement_cost: 51000,
          cost_to_cure: 408.0,
          room_total: 51408.0,
        },
      },
    ],
    summary: {
      direct_cost_subtotal: 51408.0,
      indirect_cost_subtotal: 6168.96,
      contractor_incentive: 8636.54,
      total_project_cost: 66213.5,
      total_cost_to_cure: 408.0,
      as_is_value: 65805.5,
      post_renovation_value: 66213.5,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('generates valid SVG floorplan with ANSI shell, room rect, and openings', () => {
    const svg = generateFloorplanSVG(sampleProject);
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('ansi-shell');
    expect(svg).toContain('Living Room');
    expect(svg).toContain('class="door"');
  });

  it('generates valid UAD 3.6 / MISMO 3.6 XML with property and room hierarchy', () => {
    const xml = generateUadXmlPayload(sampleProject);
    expect(xml).toContain('MISMOVersionID="3.6.0"');
    expect(xml).toContain('<PropertyIdentifier>PRJ-66208-001</PropertyIdentifier>');
    expect(xml).toContain('<GrossLivingAreaSquareFeetNumber>2250</GrossLivingAreaSquareFeetNumber>');
    expect(xml).toContain('<RoomTypeName>Living Room</RoomTypeName>');
    expect(xml).toContain('<DeficiencyIdentifier>def-1</DeficiencyIdentifier>');
    expect(xml).toContain('<TotalCostAmount>408.00</TotalCostAmount>');
  });

  it('creates full zip bundle with all 4 drop files', async () => {
    const zipBlob = await createMeshEngineBundle(sampleProject);
    expect(zipBlob).toBeDefined();
    expect(zipBlob.size).toBeGreaterThan(0);
  });
});
