import { describe, it, expect } from 'vitest';
import {
  calculatePolygonArea,
  calculateWallAreas,
  snapToGrid,
  applyMagneticSnap,
  calculateAnsiZ765GLA,
} from '../geometry';
import { RoomNode, WallOpening } from '../../../types/sprocket';

describe('Geometry & Parametric Topology Math', () => {
  it('calculates polygon area correctly using Shoelace formula', () => {
    // 10ft x 10ft box in inches = 120in x 120in -> 100 sqft
    const square = [
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 120 },
      { x: 0, y: 120 },
    ];
    expect(calculatePolygonArea(square)).toBe(100);
  });

  it('calculates gross and net wall area with openings deducted', () => {
    // Room 15ft length, 12ft width, 8ft height
    // Perimeter = 2 * (15 + 12) = 54 ft
    // Gross Wall Area = 54 * 8 = 432 sqft
    const dimensions = { length_ft: 15, width_ft: 12, height_ft: 8 };

    // Opening 1: Door 36" x 80" = 2880 sqin = 20 sqft
    // Opening 2: Window 36" x 48" = 1728 sqin = 12 sqft
    const openings: WallOpening[] = [
      { id: '1', type: 'door', width_in: 36, height_in: 80, wall_side: 'bottom', offset_in: 24 },
      { id: '2', type: 'window', width_in: 36, height_in: 48, wall_side: 'top', offset_in: 48 },
    ];

    const result = calculateWallAreas(dimensions, openings);
    expect(result.gross_wall_area_sqft).toBe(432);
    expect(result.openings_area_sqft).toBe(32); // 20 + 12
    expect(result.net_wall_area_sqft).toBe(400); // 432 - 32
  });

  it('snaps coordinates to 1-foot grid (12 inches)', () => {
    expect(snapToGrid(0)).toBe(0);
    expect(snapToGrid(5)).toBe(0);
    expect(snapToGrid(6)).toBe(12);
    expect(snapToGrid(11)).toBe(12);
    expect(snapToGrid(23)).toBe(24);
    expect(snapToGrid(25)).toBe(24);
  });

  it('applies magnetic edge-snapping to adjacent room', () => {
    const existingRoom: RoomNode = {
      id: 'room-1',
      name: 'Living Room',
      level: 'First Floor',
      dimensions: { length_ft: 15, width_ft: 20, height_ft: 9 }, // 180" x 240"
      canvas_position: { x: 120, y: 120 },
      openings: [],
      floor_area_sqft: 300,
      gross_wall_area_sqft: 630,
      net_wall_area_sqft: 630,
      quality_class: 'Class 4',
      condition_class: 'Class 3',
      is_class_overridden: false,
      voice_transcript: '',
      deficiencies: [],
      photos: [],
      cost_rollup: { base_replacement_cost: 48000, cost_to_cure: 0, room_total: 48000 },
    };

    // Active room positioned close to existing room's right edge (120 + 180 = 300 inches)
    // Proposed pos: x = 305 (within 12-inch threshold of 300), y = 125 (within 12 inches of 120)
    const proposed = { x: 305, y: 125 };
    const activeDim = { length_ft: 10, width_ft: 12, height_ft: 9 };

    const snapResult = applyMagneticSnap('room-2', proposed, activeDim, [existingRoom], 12);
    // Should snap X to 300 (flush against right edge of room 1)
    expect(snapResult.snappedPosition.x).toBe(300);
    // Should snap Y to 120 (flush top with room 1)
    expect(snapResult.snappedPosition.y).toBe(120);
    expect(snapResult.guides.length).toBeGreaterThan(0);
  });

  it('calculates ANSI Z765 exterior wall buffer GLA', () => {
    const room1: RoomNode = {
      id: 'room-1',
      name: 'Room 1',
      level: 'First Floor',
      dimensions: { length_ft: 20, width_ft: 30, height_ft: 9 }, // 600 sqft interior
      canvas_position: { x: 0, y: 0 },
      openings: [],
      floor_area_sqft: 600,
      gross_wall_area_sqft: 900,
      net_wall_area_sqft: 900,
      quality_class: 'Class 4',
      condition_class: 'Class 3',
      is_class_overridden: false,
      voice_transcript: '',
      deficiencies: [],
      photos: [],
      cost_rollup: { base_replacement_cost: 96000, cost_to_cure: 0, room_total: 96000 },
    };

    const ansiResult = calculateAnsiZ765GLA([room1], 6);
    expect(ansiResult.interior_area_sqft).toBe(600);
    // Perimeter = 2 * (20 + 30) = 100 ft
    // 6-inch buffer = 0.5 ft
    // Buffer area = 100 * 0.5 + 4 * (0.5 * 0.5) = 50 + 1 = 51 sqft
    expect(ansiResult.exterior_wall_buffer_sqft).toBe(51);
    expect(ansiResult.ansi_gla_sqft).toBe(651);
  });
});
