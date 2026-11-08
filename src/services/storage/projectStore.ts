import { get, set } from 'idb-keyval';
import { SprocketProject, RoomNode } from '../../types/sprocket';
import { PRAIRIE_VILLAGE_COST_INDEX, calculateProjectSummary } from '../math/valuation';
import { calculateAnsiZ765GLA, calculateGBA } from '../math/geometry';

const STORAGE_KEY = 'datamesh_sprocket_active_project';

export const INITIAL_ROOMS: RoomNode[] = [
  {
    id: 'room-1',
    name: 'Living Room',
    level: 'First Floor',
    dimensions: { length_ft: 20, width_ft: 16, height_ft: 9 },
    canvas_position: { x: 120, y: 120 },
    openings: [
      { id: 'op-1', type: 'door', width_in: 36, height_in: 80, wall_side: 'bottom', offset_in: 72 },
      { id: 'op-2', type: 'window', width_in: 48, height_in: 60, wall_side: 'top', offset_in: 48 },
    ],
    floor_area_sqft: 320,
    gross_wall_area_sqft: 648,
    net_wall_area_sqft: 608,
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
    photos: [
      {
        id: 'p-1',
        file_uri: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="100%" height="100%" fill="%231e293b"/><text x="50%" y="50%" fill="%2338bdf8" text-anchor="middle" font-size="16">North Facing Wall</text></svg>',
        direction: 'North',
        azimuth_deg: 0,
        timestamp: new Date().toISOString(),
      },
    ],
    cost_rollup: {
      base_replacement_cost: 54400,
      cost_to_cure: 408.0,
      room_total: 54808.0,
    },
  },
  {
    id: 'room-2',
    name: 'Kitchen / Dining',
    level: 'First Floor',
    dimensions: { length_ft: 18, width_ft: 16, height_ft: 9 },
    canvas_position: { x: 360, y: 120 }, // Snapped flush right with Living Room
    openings: [
      { id: 'op-3', type: 'window', width_in: 60, height_in: 48, wall_side: 'top', offset_in: 60 },
      { id: 'op-4', type: 'cased_opening', width_in: 60, height_in: 84, wall_side: 'left', offset_in: 36 },
    ],
    floor_area_sqft: 288,
    gross_wall_area_sqft: 612,
    net_wall_area_sqft: 557,
    quality_class: 'Class 4',
    condition_class: 'Class 3',
    is_class_overridden: false,
    voice_transcript: 'Install 2 ea plumbing fixtures and replace 60 sq ft of tile flooring',
    deficiencies: [
      {
        id: 'def-2',
        trade_category: 'Plumbing Fixtures',
        action: 'Add',
        description: 'Install 2 EA kitchen sink faucet & disposer',
        quantity: 2,
        unit: 'EA',
        unit_price: 650.00,
        total_cost: 1300.0,
        is_verified: true,
      },
      {
        id: 'def-3',
        trade_category: 'Carpet, Flooring',
        action: 'Replace',
        description: 'Replace 60 SF of porcelain kitchen tile',
        quantity: 60,
        unit: 'SF',
        unit_price: 13.50,
        total_cost: 810.0,
        is_verified: true,
      },
    ],
    photos: [],
    cost_rollup: {
      base_replacement_cost: 48960,
      cost_to_cure: 2110.0,
      room_total: 51070.0,
    },
  },
  {
    id: 'room-3',
    name: 'Primary Bedroom',
    level: 'First Floor',
    dimensions: { length_ft: 16, width_ft: 14, height_ft: 9 },
    canvas_position: { x: 120, y: 312 }, // Snapped flush bottom with Living Room
    openings: [
      { id: 'op-5', type: 'door', width_in: 32, height_in: 80, wall_side: 'top', offset_in: 24 },
      { id: 'op-6', type: 'window', width_in: 36, height_in: 60, wall_side: 'bottom', offset_in: 48 },
    ],
    floor_area_sqft: 224,
    gross_wall_area_sqft: 540,
    net_wall_area_sqft: 507,
    quality_class: 'Class 4',
    condition_class: 'Class 4',
    is_class_overridden: false,
    voice_transcript: 'Replace 80 sf drywall ceiling damage',
    deficiencies: [
      {
        id: 'def-4',
        trade_category: 'Drywall',
        action: 'Replace',
        description: 'Replace 80 SF drywall ceiling repair',
        quantity: 80,
        unit: 'SF',
        unit_price: 3.50,
        total_cost: 280.0,
        is_verified: true,
      },
    ],
    photos: [],
    cost_rollup: {
      base_replacement_cost: 38080,
      cost_to_cure: 280.0,
      room_total: 38360.0,
    },
  },
];

export function createInitialProject(): SprocketProject {
  const rooms = [...INITIAL_ROOMS];
  const costIndex = PRAIRIE_VILLAGE_COST_INDEX;
  const ansi = calculateAnsiZ765GLA(rooms, 6);
  const gba = calculateGBA(rooms);
  const summary = calculateProjectSummary(rooms, costIndex);

  return {
    project_id: 'PRJ-66208-001',
    name: 'Prairie Village Field Inspection',
    address: {
      street: '7550 Windsor St',
      city: 'Prairie Village',
      state: 'KS',
      zip: '66208',
    },
    gla_sqft: ansi.ansi_gla_sqft,
    gba_sqft: gba,
    cost_index: costIndex,
    baseline_quality: 'Class 4',
    baseline_condition: 'Class 3',
    rooms,
    summary,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function loadSavedProject(): Promise<SprocketProject> {
  try {
    const saved = await get<SprocketProject>(STORAGE_KEY);
    if (saved && saved.rooms && saved.rooms.length > 0) {
      return saved;
    }
  } catch (err) {
    console.warn('Could not load project from IndexedDB:', err);
  }
  return createInitialProject();
}

export async function saveProject(project: SprocketProject): Promise<void> {
  try {
    await set(STORAGE_KEY, {
      ...project,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not save project to IndexedDB:', err);
  }
}
