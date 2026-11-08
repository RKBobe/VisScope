import JSZip from 'jszip';
import { SprocketProject } from '../../types/sprocket';
import { lowesClient } from '../lowes/lowesClient';
import { exportLowesPickSheetCSV } from '../lowes/pickSheetExporter';
import { calculateAnsiZ765GLA } from '../math/geometry';

/**
 * Generates a standalone, standards-compliant SVG floor plan document string.
 */
export function generateFloorplanSVG(project: SprocketProject): string {
  const rooms = project.rooms;
  const ansiData = calculateAnsiZ765GLA(rooms, 6);

  // Compute viewBox bounding box in inches
  let minX = 0;
  let minY = 0;
  let maxX = 1200; // 100 ft
  let maxY = 960;  // 80 ft

  if (rooms.length > 0) {
    minX = Math.min(...rooms.map((r) => r.canvas_position.x)) - 48;
    minY = Math.min(...rooms.map((r) => r.canvas_position.y)) - 48;
    maxX = Math.max(...rooms.map((r) => r.canvas_position.x + r.dimensions.length_ft * 12)) + 48;
    maxY = Math.max(...rooms.map((r) => r.canvas_position.y + r.dimensions.width_ft * 12)) + 48;
  }

  const width = Math.max(800, maxX - minX);
  const height = Math.max(600, maxY - minY);

  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="100%" height="100%">
  <defs>
    <style>
      .room-rect { fill: #1e293b; stroke: #38bdf8; stroke-width: 3; }
      .room-rect:hover { fill: #334155; }
      .room-label { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: 700; font-size: 14px; fill: #f8fafc; text-anchor: middle; }
      .room-sub { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: 500; font-size: 11px; fill: #94a3b8; text-anchor: middle; }
      .room-cost { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: 600; font-size: 11px; fill: #34d399; text-anchor: middle; }
      .door { stroke: #fbbf24; stroke-width: 3; fill: none; }
      .door-arc { stroke: #fbbf24; stroke-width: 1.5; stroke-dasharray: 4,4; fill: none; }
      .window { stroke: #60a5fa; stroke-width: 4; stroke-linecap: round; }
      .cased { stroke: #94a3b8; stroke-width: 2; stroke-dasharray: 3,3; }
      .ansi-shell { stroke: #f43f5e; stroke-width: 2.5; stroke-dasharray: 6,4; fill: none; }
      .grid-line { stroke: #1e293b; stroke-width: 0.75; }
      .header-text { font-family: sans-serif; font-size: 16px; font-weight: bold; fill: #e2e8f0; }
    </style>
  </defs>

  <!-- Background Canvas -->
  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#090d16" />

  <!-- Title / Legend Banner -->
  <g id="header-legend" transform="translate(${minX + 24}, ${minY + 36})">
    <text class="header-text">${project.name} | ${project.address.street}, ${project.address.city}, ${project.address.state} ${project.address.zip}</text>
    <text y="20" class="room-sub">GLA: ${project.gla_sqft} SF (ANSI Z765) | GBA: ${project.gba_sqft} SF | Direct Cost: $${project.summary.direct_cost_subtotal.toLocaleString()}</text>
  </g>
`;

  // Draw ANSI Z765 exterior shell if present
  if (ansiData.exterior_hull_bounds) {
    const { minX: bMinX, minY: bMinY, maxX: bMaxX, maxY: bMaxY } = ansiData.exterior_hull_bounds;
    const bWidth = bMaxX - bMinX;
    const bHeight = bMaxY - bMinY;
    svgContent += `
  <!-- ANSI Z765 Exterior Shell Buffer (6" Wall Offset) -->
  <rect class="ansi-shell" x="${bMinX}" y="${bMinY}" width="${bWidth}" height="${bHeight}" rx="4" />
`;
  }

  // Draw Rooms
  for (const room of rooms) {
    const rx = room.canvas_position.x;
    const ry = room.canvas_position.y;
    const rw = room.dimensions.length_ft * 12;
    const rh = room.dimensions.width_ft * 12;
    const cx = rx + rw / 2;
    const cy = ry + rh / 2;

    svgContent += `
  <!-- Room: ${room.name} -->
  <g id="room-${room.id}">
    <rect class="room-rect" x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="4" />
    
    <!-- Centroid Badge -->
    <rect x="${cx - 65}" y="${cy - 30}" width="130" height="60" rx="6" fill="#0f172a" fill-opacity="0.9" stroke="#334155" stroke-width="1.5" />
    <text class="room-label" x="${cx}" y="${cy - 12}">${room.name}</text>
    <text class="room-sub" x="${cx}" y="${cy + 6}">${room.dimensions.length_ft}' x ${room.dimensions.width_ft}' (${room.floor_area_sqft} SF)</text>
    <text class="room-cost" x="${cx}" y="${cy + 22}">Est: $${room.cost_rollup.room_total.toLocaleString()}</text>
`;

    // Draw Wall Openings
    for (const opening of room.openings) {
      const side = opening.wall_side;
      const offset = opening.offset_in;
      const oWidth = opening.width_in;

      let ox = rx;
      let oy = ry;

      if (side === 'top') {
        ox = rx + offset;
        oy = ry;
        if (opening.type === 'door') {
          svgContent += `    <line class="door" x1="${ox}" y1="${oy}" x2="${ox + oWidth}" y2="${oy}" />\n`;
          svgContent += `    <path class="door-arc" d="M ${ox} ${oy} A ${oWidth} ${oWidth} 0 0 1 ${ox + oWidth} ${oy - oWidth}" />\n`;
        } else if (opening.type === 'window') {
          svgContent += `    <line class="window" x1="${ox}" y1="${oy}" x2="${ox + oWidth}" y2="${oy}" />\n`;
        } else {
          svgContent += `    <line class="cased" x1="${ox}" y1="${oy}" x2="${ox + oWidth}" y2="${oy}" />\n`;
        }
      } else if (side === 'bottom') {
        ox = rx + offset;
        oy = ry + rh;
        if (opening.type === 'door') {
          svgContent += `    <line class="door" x1="${ox}" y1="${oy}" x2="${ox + oWidth}" y2="${oy}" />\n`;
          svgContent += `    <path class="door-arc" d="M ${ox} ${oy} A ${oWidth} ${oWidth} 0 0 0 ${ox + oWidth} ${oy + oWidth}" />\n`;
        } else if (opening.type === 'window') {
          svgContent += `    <line class="window" x1="${ox}" y1="${oy}" x2="${ox + oWidth}" y2="${oy}" />\n`;
        } else {
          svgContent += `    <line class="cased" x1="${ox}" y1="${oy}" x2="${ox + oWidth}" y2="${oy}" />\n`;
        }
      } else if (side === 'left') {
        ox = rx;
        oy = ry + offset;
        if (opening.type === 'door') {
          svgContent += `    <line class="door" x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + oWidth}" />\n`;
          svgContent += `    <path class="door-arc" d="M ${ox} ${oy} A ${oWidth} ${oWidth} 0 0 1 ${ox - oWidth} ${oy + oWidth}" />\n`;
        } else if (opening.type === 'window') {
          svgContent += `    <line class="window" x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + oWidth}" />\n`;
        } else {
          svgContent += `    <line class="cased" x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + oWidth}" />\n`;
        }
      } else if (side === 'right') {
        ox = rx + rw;
        oy = ry + offset;
        if (opening.type === 'door') {
          svgContent += `    <line class="door" x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + oWidth}" />\n`;
          svgContent += `    <path class="door-arc" d="M ${ox} ${oy} A ${oWidth} ${oWidth} 0 0 0 ${ox + oWidth} ${oy + oWidth}" />\n`;
        } else if (opening.type === 'window') {
          svgContent += `    <line class="window" x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + oWidth}" />\n`;
        } else {
          svgContent += `    <line class="cased" x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + oWidth}" />\n`;
        }
      }
    }

    svgContent += `  </g>\n`;
  }

  svgContent += `</svg>\n`;
  return svgContent;
}

/**
 * Generates an appraisal-compliant UAD 3.6 / MISMO 3.6 XML inspection document.
 */
export function generateUadXmlPayload(project: SprocketProject): string {
  const timestamp = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<MESSAGE xmlns="http://www.mismo.org/residential/2009/schemas"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         MISMOVersionID="3.6.0">
  <ABOUT_VERSIONS>
    <ABOUT_VERSION>
      <DataMeshSprocketEngineVersion>1.0.0</DataMeshSprocketEngineVersion>
      <CreatedDatetime>${timestamp}</CreatedDatetime>
    </ABOUT_VERSION>
  </ABOUT_VERSIONS>
  <PROPERTIES>
    <PROPERTY>
      <IDENTIFICATION>
        <PropertyIdentifier>${project.project_id}</PropertyIdentifier>
      </IDENTIFICATION>
      <ADDRESS>
        <AddressLineText>${escapeXml(project.address.street)}</AddressLineText>
        <CityName>${escapeXml(project.address.city)}</CityName>
        <StateCode>${escapeXml(project.address.state)}</StateCode>
        <PostalCode>${escapeXml(project.address.zip)}</PostalCode>
      </ADDRESS>
      <STRUCTURE>
        <STRUCTURE_ANALYSIS>
          <GrossLivingAreaSquareFeetNumber>${project.gla_sqft}</GrossLivingAreaSquareFeetNumber>
          <GrossBuildingAreaSquareFeetNumber>${project.gba_sqft}</GrossBuildingAreaSquareFeetNumber>
          <BaselinePropertyQualityRating>${project.baseline_quality.replace('Class ', 'Q')}</BaselinePropertyQualityRating>
          <BaselinePropertyConditionRating>${project.baseline_condition.replace('Class ', 'C')}</BaselinePropertyConditionRating>
          <CostApproachTotalDirectCostAmount>${project.summary.direct_cost_subtotal.toFixed(2)}</CostApproachTotalDirectCostAmount>
          <CostApproachTotalProjectCostAmount>${project.summary.total_project_cost.toFixed(2)}</CostApproachTotalProjectCostAmount>
          <TotalCostToCureDeficiencyAmount>${project.summary.total_cost_to_cure.toFixed(2)}</TotalCostToCureDeficiencyAmount>
        </STRUCTURE_ANALYSIS>
        <LEVELS>
`;

  // Group rooms by Level
  const levels = ['First Floor', 'Second Floor', 'Basement'] as const;
  for (const level of levels) {
    const levelRooms = project.rooms.filter((r) => r.level === level);
    if (levelRooms.length === 0) continue;

    const levelSqft = levelRooms.reduce((acc, r) => acc + r.floor_area_sqft, 0);

    xml += `          <LEVEL>
            <FloorLevelType>${level.replace(' ', '')}</FloorLevelType>
            <LevelGrossSquareFeetNumber>${levelSqft.toFixed(2)}</LevelGrossSquareFeetNumber>
            <ROOMS>
`;

    for (const room of levelRooms) {
      xml += `              <ROOM>
                <RoomIdentifier>${room.id}</RoomIdentifier>
                <RoomTypeName>${escapeXml(room.name)}</RoomTypeName>
                <LengthFeetNumber>${room.dimensions.length_ft}</LengthFeetNumber>
                <WidthFeetNumber>${room.dimensions.width_ft}</WidthFeetNumber>
                <CeilingHeightFeetNumber>${room.dimensions.height_ft}</CeilingHeightFeetNumber>
                <AreaSquareFeetNumber>${room.floor_area_sqft}</AreaSquareFeetNumber>
                <NetWallAreaSquareFeetNumber>${room.net_wall_area_sqft}</NetWallAreaSquareFeetNumber>
                <RoomQualityRating>${room.quality_class.replace('Class ', 'Q')}</RoomQualityRating>
                <RoomConditionRating>${room.condition_class.replace('Class ', 'C')}</RoomConditionRating>
                <BaseReplacementCostAmount>${room.cost_rollup.base_replacement_cost.toFixed(2)}</BaseReplacementCostAmount>
                <CostToCureAmount>${room.cost_rollup.cost_to_cure.toFixed(2)}</CostToCureAmount>
                <DEFICIENCIES>
`;

      for (const defect of room.deficiencies) {
        xml += `                  <DEFICIENCY>
                    <DeficiencyIdentifier>${defect.id}</DeficiencyIdentifier>
                    <TradeCategoryDescription>${escapeXml(defect.trade_category)}</TradeCategoryDescription>
                    <ScopeActionType>${defect.action}</ScopeActionType>
                    <ItemDescription>${escapeXml(defect.description)}</ItemDescription>
                    <QuantityNumber>${defect.quantity}</QuantityNumber>
                    <UnitOfMeasureType>${defect.unit}</UnitOfMeasureType>
                    <UnitPriceAmount>${defect.unit_price.toFixed(2)}</UnitPriceAmount>
                    <TotalCostAmount>${defect.total_cost.toFixed(2)}</TotalCostAmount>
                    <VerifiedIndicator>${defect.is_verified}</VerifiedIndicator>
                  </DEFICIENCY>
`;
      }

      xml += `                </DEFICIENCIES>
              </ROOM>
`;
    }

    xml += `            </ROOMS>
          </LEVEL>
`;
  }

  xml += `        </LEVELS>
      </STRUCTURE>
    </PROPERTY>
  </PROPERTIES>
</MESSAGE>
`;

  return xml;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Creates the entire flat-file ingestion bundle as a downloadable ZIP package.
 */
export async function createMeshEngineBundle(project: SprocketProject): Promise<Blob> {
  const zip = new JSZip();

  // 1. manifest.json
  const manifestData = {
    generator: 'DataMesh Sprocket Core System v1.0.0',
    exported_at: new Date().toISOString(),
    project,
  };
  zip.file('manifest.json', JSON.stringify(manifestData, null, 2));

  // 2. floorplan.svg
  const floorplanSvg = generateFloorplanSVG(project);
  zip.file('floorplan.svg', floorplanSvg);

  // 3. uad_inspection_payload.xml
  const uadXml = generateUadXmlPayload(project);
  zip.file('uad_inspection_payload.xml', uadXml);

  // 4. lowes_materials_buy_sheet.csv
  const procurementOrder = lowesClient.generateProcurementOrder(
    project.rooms,
    project.address.zip
  );
  const lowesCsv = exportLowesPickSheetCSV(procurementOrder);
  zip.file('lowes_materials_buy_sheet.csv', lowesCsv);

  // Generate downloadable Blob
  return await zip.generateAsync({ type: 'blob' });
}
