import { Point2D, RoomDimensions, WallOpening, RoomNode } from '../../types/sprocket';

export interface SnapGuide {
  axis: 'x' | 'y';
  position_in: number;
  label: string;
}

export interface MagneticSnapResult {
  snappedPosition: Point2D;
  guides: SnapGuide[];
}

/**
 * Calculates polygon area using the Shoelace formula.
 * Input points are in inches. Returns square feet.
 */
export function calculatePolygonArea(points: Point2D[]): number {
  if (!points || points.length < 3) return 0;

  let areaInSqInches = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    areaInSqInches += points[i].x * points[j].y;
    areaInSqInches -= points[j].x * points[i].y;
  }

  areaInSqInches = Math.abs(areaInSqInches) / 2;
  return Number((areaInSqInches / 144).toFixed(2));
}

/**
 * Calculates room floor area in square feet.
 * Uses polygon if provided; otherwise length_ft * width_ft.
 */
export function calculateRoomFloorArea(
  dimensions: RoomDimensions,
  polygon?: Point2D[]
): number {
  if (polygon && polygon.length >= 3) {
    return calculatePolygonArea(polygon);
  }
  return Number((dimensions.length_ft * dimensions.width_ft).toFixed(2));
}

/**
 * Calculates Gross and Net wall surface areas in square feet.
 * Deducts all wall openings (doors, windows, cased openings).
 */
export function calculateWallAreas(
  dimensions: RoomDimensions,
  openings: WallOpening[] = []
): { gross_wall_area_sqft: number; net_wall_area_sqft: number; openings_area_sqft: number } {
  const { length_ft, width_ft, height_ft } = dimensions;
  
  // Perimeter in feet
  const perimeter_ft = 2 * (length_ft + width_ft);
  const gross_wall_area_sqft = Number((perimeter_ft * height_ft).toFixed(2));

  // Total area of wall openings in sqft (converted from inches)
  let openings_area_sqin = 0;
  for (const opening of openings) {
    openings_area_sqin += opening.width_in * opening.height_in;
  }
  const openings_area_sqft = Number((openings_area_sqin / 144).toFixed(2));

  const net_wall_area_sqft = Number(
    Math.max(0, gross_wall_area_sqft - openings_area_sqft).toFixed(2)
  );

  return {
    gross_wall_area_sqft,
    net_wall_area_sqft,
    openings_area_sqft,
  };
}

/**
 * Snaps a single dimension or coordinate in inches to a grid (default 1 foot = 12 inches).
 */
export function snapToGrid(valueInches: number, gridSizeInches: number = 12): number {
  return Math.round(valueInches / gridSizeInches) * gridSizeInches;
}

/**
 * Snaps a 2D point to the 1-foot grid.
 */
export function snapPointToGrid(p: Point2D, gridSizeInches: number = 12): Point2D {
  return {
    x: snapToGrid(p.x, gridSizeInches),
    y: snapToGrid(p.y, gridSizeInches),
  };
}

/**
 * Performs magnetic edge-snapping for an active room against all existing rooms.
 * Snaps within a threshold (default 12 inches / 1 foot).
 */
export function applyMagneticSnap(
  activeRoomId: string,
  proposedPos: Point2D,
  roomDimensions: RoomDimensions,
  otherRooms: RoomNode[],
  thresholdInches: number = 12
): MagneticSnapResult {
  const widthInches = roomDimensions.length_ft * 12;
  const heightInches = roomDimensions.width_ft * 12;

  let snappedX = proposedPos.x;
  let snappedY = proposedPos.y;
  const guides: SnapGuide[] = [];

  const activeLeft = proposedPos.x;
  const activeRight = proposedPos.x + widthInches;
  const activeTop = proposedPos.y;
  const activeBottom = proposedPos.y + heightInches;

  let minDeltaX = thresholdInches + 1;
  let targetSnapX: number | null = null;
  let snapLabelX = '';

  let minDeltaY = thresholdInches + 1;
  let targetSnapY: number | null = null;
  let snapLabelY = '';

  for (const other of otherRooms) {
    if (other.id === activeRoomId) continue;

    const oLeft = other.canvas_position.x;
    const oRight = other.canvas_position.x + other.dimensions.length_ft * 12;
    const oTop = other.canvas_position.y;
    const oBottom = other.canvas_position.y + other.dimensions.width_ft * 12;

    // Check X alignments:
    // 1. activeLeft snaps to oRight (placing room to the right)
    if (Math.abs(activeLeft - oRight) < minDeltaX) {
      minDeltaX = Math.abs(activeLeft - oRight);
      targetSnapX = oRight;
      snapLabelX = `Edge snap to ${other.name} (Right)`;
    }
    // 2. activeRight snaps to oLeft (placing room to the left)
    if (Math.abs(activeRight - oLeft) < minDeltaX) {
      minDeltaX = Math.abs(activeRight - oLeft);
      targetSnapX = oLeft - widthInches;
      snapLabelX = `Edge snap to ${other.name} (Left)`;
    }
    // 3. activeLeft snaps to oLeft (flush left)
    if (Math.abs(activeLeft - oLeft) < minDeltaX) {
      minDeltaX = Math.abs(activeLeft - oLeft);
      targetSnapX = oLeft;
      snapLabelX = `Flush Left with ${other.name}`;
    }
    // 4. activeRight snaps to oRight (flush right)
    if (Math.abs(activeRight - oRight) < minDeltaX) {
      minDeltaX = Math.abs(activeRight - oRight);
      targetSnapX = oRight - widthInches;
      snapLabelX = `Flush Right with ${other.name}`;
    }

    // Check Y alignments:
    // 1. activeTop snaps to oBottom (placing room below)
    if (Math.abs(activeTop - oBottom) < minDeltaY) {
      minDeltaY = Math.abs(activeTop - oBottom);
      targetSnapY = oBottom;
      snapLabelY = `Edge snap to ${other.name} (Bottom)`;
    }
    // 2. activeBottom snaps to oTop (placing room above)
    if (Math.abs(activeBottom - oTop) < minDeltaY) {
      minDeltaY = Math.abs(activeBottom - oTop);
      targetSnapY = oTop - heightInches;
      snapLabelY = `Edge snap to ${other.name} (Top)`;
    }
    // 3. activeTop snaps to oTop (flush top)
    if (Math.abs(activeTop - oTop) < minDeltaY) {
      minDeltaY = Math.abs(activeTop - oTop);
      targetSnapY = oTop;
      snapLabelY = `Flush Top with ${other.name}`;
    }
    // 4. activeBottom snaps to oBottom (flush bottom)
    if (Math.abs(activeBottom - oBottom) < minDeltaY) {
      minDeltaY = Math.abs(activeBottom - oBottom);
      targetSnapY = oBottom - heightInches;
      snapLabelY = `Flush Bottom with ${other.name}`;
    }
  }

  if (targetSnapX !== null && minDeltaX <= thresholdInches) {
    snappedX = targetSnapX;
    guides.push({
      axis: 'x',
      position_in: snappedX,
      label: snapLabelX,
    });
  } else {
    snappedX = snapToGrid(proposedPos.x, 12);
  }

  if (targetSnapY !== null && minDeltaY <= thresholdInches) {
    snappedY = targetSnapY;
    guides.push({
      axis: 'y',
      position_in: snappedY,
      label: snapLabelY,
    });
  } else {
    snappedY = snapToGrid(proposedPos.y, 12);
  }

  return {
    snappedPosition: { x: snappedX, y: snappedY },
    guides,
  };
}

/**
 * ANSI Z765 Outer Shell Auto-Buffer
 * When inspectors measure interior room dimensions (tape & eyeball), ANSI Z765 requires
 * calculating Gross Living Area (GLA) from the exterior perimeter, which includes
 * standard exterior wall thickness (6 inches / 0.5 ft).
 *
 * This function calculates:
 * 1. The exterior bounding box / outer perimeter hull of all above-grade rooms.
 * 2. Applies a 6-inch (0.5 ft) wall buffer to exterior edges.
 * 3. Returns the ANSI Z765 compliant Gross Living Area (GLA).
 */
export function calculateAnsiZ765GLA(
  rooms: RoomNode[],
  exteriorWallBufferInches: number = 6
): {
  interior_area_sqft: number;
  ansi_gla_sqft: number;
  exterior_wall_buffer_sqft: number;
  exterior_hull_bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
} {
  const aboveGradeRooms = rooms.filter(
    (r) => r.level === 'First Floor' || r.level === 'Second Floor'
  );

  if (aboveGradeRooms.length === 0) {
    return {
      interior_area_sqft: 0,
      ansi_gla_sqft: 0,
      exterior_wall_buffer_sqft: 0,
      exterior_hull_bounds: null,
    };
  }

  let interior_area_sqft = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const room of aboveGradeRooms) {
    interior_area_sqft += room.floor_area_sqft;
    const rLeft = room.canvas_position.x;
    const rTop = room.canvas_position.y;
    const rRight = rLeft + room.dimensions.length_ft * 12;
    const rBottom = rTop + room.dimensions.width_ft * 12;

    if (rLeft < minX) minX = rLeft;
    if (rTop < minY) minY = rTop;
    if (rRight > maxX) maxX = rRight;
    if (rBottom > maxY) maxY = rBottom;
  }

  // Calculate exterior perimeter in feet
  const hullWidthInches = maxX - minX;
  const hullHeightInches = maxY - minY;
  const hullWidthFt = hullWidthInches / 12;
  const hullHeightFt = hullHeightInches / 12;
  const exteriorPerimeterFt = 2 * (hullWidthFt + hullHeightFt);

  // Exterior wall buffer area in sqft:
  // perimeter * (buffer / 12) + 4 corner squares (buffer/12 * buffer/12)
  const bufferFt = exteriorWallBufferInches / 12;
  const exterior_wall_buffer_sqft = Number(
    (exteriorPerimeterFt * bufferFt + 4 * (bufferFt * bufferFt)).toFixed(2)
  );

  const ansi_gla_sqft = Number(
    (interior_area_sqft + exterior_wall_buffer_sqft).toFixed(2)
  );

  return {
    interior_area_sqft: Number(interior_area_sqft.toFixed(2)),
    ansi_gla_sqft,
    exterior_wall_buffer_sqft,
    exterior_hull_bounds: {
      minX: minX - exteriorWallBufferInches,
      minY: minY - exteriorWallBufferInches,
      maxX: maxX + exteriorWallBufferInches,
      maxY: maxY + exteriorWallBufferInches,
    },
  };
}

/**
 * Calculates Gross Building Area (GBA) including Basements and all levels with exterior buffer.
 */
export function calculateGBA(rooms: RoomNode[]): number {
  if (rooms.length === 0) return 0;
  let totalInterior = 0;
  for (const r of rooms) {
    totalInterior += r.floor_area_sqft;
  }
  // Standard exterior wall addition factor (~6-8% of interior area based on ANSI standards)
  return Number((totalInterior * 1.07).toFixed(2));
}
