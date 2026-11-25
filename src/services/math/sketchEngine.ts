import { Point2D, RoomNode, RoomNodeType, FloorLevel } from '../../types/sprocket';
import { calculatePolygonArea } from './geometry';

export type SketchDirection =
  | 'right'
  | 'left'
  | 'up'
  | 'down'
  | 'up_right'
  | 'up_left'
  | 'down_right'
  | 'down_left';

export interface PopPointResult {
  point: Point2D;
  length_ft: number;
  alignedWithLabel: string;
}

export interface SketchedRoomPayload {
  name: string;
  level: FloorLevel;
  node_type: RoomNodeType;
  exclude_from_gla: boolean;
  canvas_position: Point2D;
  polygon_points: Point2D[];
  dimensions: {
    length_ft: number;
    width_ft: number;
    height_ft: number;
  };
  floor_area_sqft: number;
  perimeter_ft: number;
  gross_wall_area_sqft: number;
}

const INCHES_PER_FOOT = 12;

/**
 * Calculates Euclidean distance between two points (in inches) and returns feet.
 */
export function calculateSegmentLengthFt(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distInches = Math.hypot(dx, dy);
  return Number((distInches / INCHES_PER_FOOT).toFixed(2));
}

/**
 * Calculates total perimeter of a polygon (in inches) and returns feet.
 */
export function calculatePolygonPerimeterFt(points: Point2D[], closed: boolean = true): number {
  if (!points || points.length < 2) return 0;
  let totalInches = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalInches += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  if (closed && points.length >= 3) {
    const first = points[0];
    const last = points[points.length - 1];
    totalInches += Math.hypot(first.x - last.x, first.y - last.y);
  }
  return Number((totalInches / INCHES_PER_FOOT).toFixed(2));
}

/**
 * Computes the next vertex from a starting point, wall length in feet, and direction.
 */
export function computeNextSketchPoint(
  from: Point2D,
  lengthFt: number,
  direction: SketchDirection
): Point2D {
  const distIn = lengthFt * INCHES_PER_FOOT;
  const diagIn = distIn / Math.SQRT2;

  let dx = 0;
  let dy = 0;

  switch (direction) {
    case 'right':
      dx = distIn;
      break;
    case 'left':
      dx = -distIn;
      break;
    case 'down':
      dy = distIn;
      break;
    case 'up':
      dy = -distIn;
      break;
    case 'up_right':
      dx = diagIn;
      dy = -diagIn;
      break;
    case 'up_left':
      dx = -diagIn;
      dy = -diagIn;
      break;
    case 'down_right':
      dx = diagIn;
      dy = diagIn;
      break;
    case 'down_left':
      dx = -diagIn;
      dy = diagIn;
      break;
  }

  return {
    x: Number((from.x + dx).toFixed(2)),
    y: Number((from.y + dy).toFixed(2)),
  };
}

/**
 * Appends a new wall segment to the active sketch vertex list.
 * Ignores non-positive lengths or empty point arrays.
 */
export function addSketchSegment(
  points: Point2D[],
  lengthFt: number,
  direction: SketchDirection
): Point2D[] {
  if (!points.length || !Number.isFinite(lengthFt) || lengthFt <= 0) {
    return points;
  }
  const currentTip = points[points.length - 1];
  const nextPoint = computeNextSketchPoint(currentTip, lengthFt, direction);
  return [...points, nextPoint];
}

/**
 * TOTAL Sketch-style "Pop Point" snap finder:
 * Scans all vertices in the active sketch and corners of existing rooms on the floor
 * to find the nearest aligned X or Y coordinate in the requested cardinal direction.
 */
export function findNextPopPoint(
  points: Point2D[],
  direction: 'right' | 'left' | 'up' | 'down',
  otherRooms: RoomNode[] = []
): PopPointResult | null {
  if (!points.length) return null;

  const currentTip = points[points.length - 1];
  const isHorizontal = direction === 'right' || direction === 'left';
  const currentCoord = isHorizontal ? currentTip.x : currentTip.y;
  const EPSILON = 0.5; // half-inch tolerance to avoid snapping to self

  interface Candidate {
    coord: number;
    label: string;
  }

  const sketchCandidates: Candidate[] = [];
  const roomCandidates: Candidate[] = [];

  // 1. Collect all vertices from the active sketch (highest priority for squaring off shapes)
  points.forEach((pt, idx) => {
    const coord = isHorizontal ? pt.x : pt.y;
    sketchCandidates.push({
      coord,
      label: idx === 0 ? 'Start Point' : `Vertex #${idx + 1}`,
    });
  });

  // 2. Collect corners / polygon vertices from existing rooms on the same floor
  for (const room of otherRooms) {
    const rx = room.canvas_position.x;
    const ry = room.canvas_position.y;

    if (room.polygon_points && room.polygon_points.length >= 3) {
      for (const pt of room.polygon_points) {
        roomCandidates.push({
          coord: isHorizontal ? rx + pt.x : ry + pt.y,
          label: room.name,
        });
      }
    } else {
      const rw = room.dimensions.length_ft * INCHES_PER_FOOT;
      const rh = room.dimensions.width_ft * INCHES_PER_FOOT;
      if (isHorizontal) {
        roomCandidates.push({ coord: rx, label: `${room.name} (Left)` });
        roomCandidates.push({ coord: rx + rw, label: `${room.name} (Right)` });
      } else {
        roomCandidates.push({ coord: ry, label: `${room.name} (Top)` });
        roomCandidates.push({ coord: ry + rh, label: `${room.name} (Bottom)` });
      }
    }
  }

  const pickNearest = (list: Candidate[]): { candidate: Candidate; delta: number } | null => {
    let best: Candidate | null = null;
    let bestDelta = Infinity;
    for (const c of list) {
      const delta =
        direction === 'right' || direction === 'down'
          ? c.coord - currentCoord
          : currentCoord - c.coord;

      if (delta > EPSILON && delta < bestDelta) {
        bestDelta = delta;
        best = c;
      }
    }
    return best ? { candidate: best, delta: bestDelta } : null;
  };

  // Prefer snapping to the active sketch's own vertices first, then fall back to other rooms
  const match = pickNearest(sketchCandidates) || pickNearest(roomCandidates);
  if (!match) return null;

  const { candidate: best, delta: bestDelta } = match;

  const snappedPoint: Point2D = isHorizontal
    ? { x: Number(best.coord.toFixed(2)), y: currentTip.y }
    : { x: currentTip.x, y: Number(best.coord.toFixed(2)) };

  return {
    point: snappedPoint,
    length_ft: Number((bestDelta / INCHES_PER_FOOT).toFixed(2)),
    alignedWithLabel: best.label,
  };
}

/**
 * Checks if two points are close enough to be considered the same vertex (auto-close threshold).
 */
export function isPointNearStart(points: Point2D[], thresholdInches: number = 6): boolean {
  if (points.length < 3) return false;
  const first = points[0];
  const last = points[points.length - 1];
  return Math.hypot(last.x - first.x, last.y - first.y) <= thresholdInches;
}

/**
 * Converts a closed sketch polygon into a normalized RoomNode payload
 * with relative polygon_points, exact Shoelace area, and perimeter-based wall area.
 */
export function normalizeSketchToRoomPayload(
  rawPoints: Point2D[],
  options: {
    name: string;
    level: FloorLevel;
    height_ft?: number;
    node_type?: RoomNodeType;
    exclude_from_gla?: boolean;
  }
): SketchedRoomPayload | null {
  if (!rawPoints || rawPoints.length < 3) return null;

  // Strip duplicate closing vertex if user drew back onto the start point
  const points = [...rawPoints];
  if (points.length > 3 && isPointNearStart(points, 1)) {
    points.pop();
  }

  if (points.length < 3) return null;

  const areaSqFt = calculatePolygonArea(points);
  if (areaSqFt <= 0) return null;

  const minX = Math.min(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxX = Math.max(...points.map((p) => p.x));
  const maxY = Math.max(...points.map((p) => p.y));

  const relativePolygon: Point2D[] = points.map((p) => ({
    x: Number((p.x - minX).toFixed(2)),
    y: Number((p.y - minY).toFixed(2)),
  }));

  const length_ft = Math.max(1, Number(((maxX - minX) / INCHES_PER_FOOT).toFixed(2)));
  const width_ft = Math.max(1, Number(((maxY - minY) / INCHES_PER_FOOT).toFixed(2)));
  const height_ft = options.height_ft && options.height_ft > 0 ? options.height_ft : 9;

  const perimeter_ft = calculatePolygonPerimeterFt(relativePolygon, true);
  const gross_wall_area_sqft = Number((perimeter_ft * height_ft).toFixed(2));
  const node_type = options.node_type || 'interior_room';
  const exclude_from_gla =
    options.exclude_from_gla !== undefined
      ? options.exclude_from_gla
      : node_type === 'accessory_structure';

  return {
    name: options.name.trim() || 'Sketched Area',
    level: options.level,
    node_type,
    exclude_from_gla,
    canvas_position: {
      x: Number(minX.toFixed(2)),
      y: Number(minY.toFixed(2)),
    },
    polygon_points: relativePolygon,
    dimensions: {
      length_ft,
      width_ft,
      height_ft,
    },
    floor_area_sqft: areaSqFt,
    perimeter_ft,
    gross_wall_area_sqft,
  };
}
