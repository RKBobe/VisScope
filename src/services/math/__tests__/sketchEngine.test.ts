import { describe, it, expect } from 'vitest';
import {
  addSketchSegment,
  calculatePolygonPerimeterFt,
  calculateSegmentLengthFt,
  computeNextSketchPoint,
  findNextPopPoint,
  isPointNearStart,
  normalizeSketchToRoomPayload,
} from '../sketchEngine';
import { INITIAL_ROOMS } from '../../storage/projectStore';

describe('sketchEngine — Wall-by-Wall Appraisal Sketching Math', () => {
  it('computes exact cardinal and 45-degree diagonal wall segments', () => {
    const start = { x: 120, y: 120 };

    // 20 ft Right = +240 inches X
    const p1 = computeNextSketchPoint(start, 20, 'right');
    expect(p1).toEqual({ x: 360, y: 120 });
    expect(calculateSegmentLengthFt(start, p1)).toBe(20);

    // 14.5 ft Down = +174 inches Y
    const p2 = computeNextSketchPoint(p1, 14.5, 'down');
    expect(p2).toEqual({ x: 360, y: 294 });
    expect(calculateSegmentLengthFt(p1, p2)).toBe(14.5);

    // 10 ft 45-degree diagonal preserves exact 10.0 ft wall length
    const pDiag = computeNextSketchPoint(start, 10, 'down_right');
    expect(calculateSegmentLengthFt(start, pDiag)).toBeCloseTo(10, 1);
  });

  it('draws an L-shaped polygon and computes exact Shoelace area and perimeter', () => {
    // Draw an L-shape:
    // 30' right, 10' down, 20' left, 10' down, 10' left, (auto-close 20' up)
    // Area = (30 * 10) + (10 * 10) = 400 SF
    // Perimeter = 30 + 10 + 20 + 10 + 10 + 20 = 100 LF
    let pts = [{ x: 120, y: 120 }];
    pts = addSketchSegment(pts, 30, 'right');
    pts = addSketchSegment(pts, 10, 'down');
    pts = addSketchSegment(pts, 20, 'left');
    pts = addSketchSegment(pts, 10, 'down');
    pts = addSketchSegment(pts, 10, 'left');

    const payload = normalizeSketchToRoomPayload(pts, {
      name: 'First Floor L-Shape',
      level: 'First Floor',
      height_ft: 9,
      node_type: 'exterior_footprint',
    });

    expect(payload).not.toBeNull();
    expect(payload!.floor_area_sqft).toBe(400);
    expect(payload!.perimeter_ft).toBe(100);
    expect(payload!.gross_wall_area_sqft).toBe(900);
    expect(payload!.dimensions.length_ft).toBe(30);
    expect(payload!.dimensions.width_ft).toBe(20);
    expect(payload!.canvas_position).toEqual({ x: 120, y: 120 });
    expect(payload!.polygon_points[0]).toEqual({ x: 0, y: 0 });
    expect(payload!.exclude_from_gla).toBe(false);
  });

  it('finds TOTAL Sketch-style Pop Points aligned with start vertex or other rooms', () => {
    // Draw 20' right, 16' down, then pop LEFT to align with Start Point
    let pts = [{ x: 120, y: 120 }];
    pts = addSketchSegment(pts, 20, 'right'); // (360, 120)
    pts = addSketchSegment(pts, 16, 'down'); // (360, 312)

    const popLeft = findNextPopPoint(pts, 'left', []);
    expect(popLeft).not.toBeNull();
    expect(popLeft!.point).toEqual({ x: 120, y: 312 });
    expect(popLeft!.length_ft).toBe(20);
    expect(popLeft!.alignedWithLabel).toBe('Start Point');

    // Now add popped point and pop UP to close back to Start Point
    pts = [...pts, popLeft!.point];
    const popUp = findNextPopPoint(pts, 'up', []);
    expect(popUp).not.toBeNull();
    expect(popUp!.point).toEqual({ x: 120, y: 120 });
    expect(popUp!.length_ft).toBe(16);

    // Closing point is detected as near start
    pts = [...pts, popUp!.point];
    expect(isPointNearStart(pts, 1)).toBe(true);

    // Normalizing strips duplicate closing vertex cleanly
    const payload = normalizeSketchToRoomPayload(pts, {
      name: 'Popped Rect',
      level: 'First Floor',
    });
    expect(payload!.polygon_points.length).toBe(4);
    expect(payload!.floor_area_sqft).toBe(320);
  });

  it('finds Pop Points aligned with existing rooms on the same floor', () => {
    // Living Room in INITIAL_ROOMS is at x=120, length=20' (right edge = 360)
    const pts = [{ x: 60, y: 400 }];
    const popRight = findNextPopPoint(pts, 'right', INITIAL_ROOMS);
    expect(popRight).not.toBeNull();
    expect(popRight!.point.x).toBe(120);
    expect(popRight!.length_ft).toBe(5);
  });

  it('marks accessory structures as exclude_from_gla by default', () => {
    let pts = [{ x: 0, y: 0 }];
    pts = addSketchSegment(pts, 22, 'right');
    pts = addSketchSegment(pts, 20, 'down');
    pts = addSketchSegment(pts, 22, 'left');

    const garage = normalizeSketchToRoomPayload(pts, {
      name: 'Attached Garage',
      level: 'First Floor',
      node_type: 'accessory_structure',
    });

    expect(garage).not.toBeNull();
    expect(garage!.exclude_from_gla).toBe(true);
    expect(garage!.floor_area_sqft).toBe(440);
    expect(calculatePolygonPerimeterFt(garage!.polygon_points, true)).toBe(84);
  });
});
