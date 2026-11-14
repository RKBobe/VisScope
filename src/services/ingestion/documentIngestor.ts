import {
  IngestionGeometryMode,
  PropertyMetadata,
  RoomNode,
  SprocketProject,
} from '../../types/sprocket';
import {
  calculateAnsiZ765GLA,
  calculateGBA,
  calculateRoomFloorArea,
  calculateWallAreas,
} from '../math/geometry';
import {
  calculateProjectSummary,
  calculateRoomCostRollup,
  mapRawConditionToClass,
  mapRawQualityToClass,
  resolveRegionalCostIndex,
} from '../math/valuation';
import { extractPdfContent } from './pdfExtractor';
import {
  isArchitecturalFloorPlanText,
  parseArchitecturalFloorPlan,
} from './parsers/architecturalPlanParser';
import {
  isJacksonCountyPrcText,
  parseJacksonCountyPrc,
} from './parsers/jacksonCountyParser';
import {
  createIngestedRoomNode,
  isJohnsonCountyPrcText,
  parseJohnsonCountyPrc,
} from './parsers/johnsonCountyParser';
import { IngestionResult, RawDocumentPayload } from './types';

/**
 * Fallback parser for generic/unknown property documents or images.
 * Follows the client rule: extract clear fields and fall back to exterior footprint when interior rooms aren't clear.
 */
function parseGenericPropertyDocument(
  text: string,
  fileName: string,
  pageImages: string[] = []
): IngestionResult {
  const addrMatch = text.match(
    /(\d+\s+[A-Za-z0-9\s.]+?),\s*([A-Za-z\s]+),\s*([A-Z]{2})\s*(\d{5})?/
  );
  const street = addrMatch ? addrMatch[1].replace(/.*Address:\s*/i, '').trim() : '100 Main St';
  const city = addrMatch ? addrMatch[2].trim() : 'Prairie Village';
  const state = addrMatch ? addrMatch[3].trim() : 'KS';
  const zip = addrMatch?.[4] ? addrMatch[4].trim() : '66208';

  const glaMatch = text.match(/(?:Living Area|GLA|Sq\s*Ft|Area)[:\s]*([\d,]{3,6})/i);
  const reportedGla = glaMatch ? Number(glaMatch[1].replace(/,/g, '')) : 1600;

  const yearMatch = text.match(/Year Built[:\s]*(\d{4})/i);
  const yearBuilt = yearMatch ? Number(yearMatch[1]) : undefined;

  const lengthFt = Math.max(20, Math.round(Math.sqrt(reportedGla * 1.35)));
  const widthFt = Math.max(16, Math.round(reportedGla / lengthFt));

  const qualityClass = mapRawQualityToClass(text.match(/Quality[:\s]*([A-Za-z+\-]+)/i)?.[1]);
  const conditionClass = mapRawConditionToClass(text.match(/Condition[:\s]*([A-Za-z+\-]+)/i)?.[1]);

  const metadata: PropertyMetadata = {
    source_document_type: 'generic_pdf',
    source_file_name: fileName,
    ingestion_mode: 'exterior_footprint_only',
    ingestion_notes:
      'Full interior room layout was not found in document. Generated scaled exterior building footprint from reported living area.',
    year_built: yearBuilt,
    total_living_area_reported_sqft: reportedGla,
    main_floor_living_area_sqft: reportedGla,
    blueprint_underlay_data_uri: pageImages[0],
  };

  const exteriorFootprintRooms: RoomNode[] = [
    createIngestedRoomNode({
      id: `gen-fp-${Date.now()}`,
      name: 'Exterior Property Footprint',
      level: 'First Floor',
      length_ft: lengthFt,
      width_ft: widthFt,
      height_ft: 9,
      x_in: 180,
      y_in: 120,
      node_type: 'exterior_footprint',
      structure_code: 'EXT-SHELL',
      exclude_from_gla: false,
      area_override_sqft: reportedGla,
      quality_class: qualityClass,
      condition_class: conditionClass,
      zip,
      city,
      state,
      source: fileName,
    }),
  ];

  return {
    document_type: 'generic_pdf',
    document_label: 'Property Document (Exterior Footprint Fallback)',
    confidence: 0.78,
    recommended_mode: 'exterior_footprint_only',
    mode_reasoning:
      'Full interior room breakdown is not clear in this file; defaulting to the exterior property footprint per client rule.',
    project_name: `Ingested — ${street}`,
    address: { street, city, state, zip },
    baseline_quality: qualityClass,
    baseline_condition: conditionClass,
    metadata,
    exterior_footprint_rooms: exteriorFootprintRooms,
    interior_rooms: [],
    has_clear_interior_rooms: false,
    raw_extracted_text: text,
  };
}

/**
 * Ingests pre-extracted text or raw bytes (used by both browser file uploads and unit tests).
 */
export async function ingestDocumentTextOrBuffer(
  payload: RawDocumentPayload
): Promise<IngestionResult> {
  let text = payload.text || '';
  let pageImages = payload.pageImages || [];

  if (!text && payload.rawBytes) {
    const extracted = await extractPdfContent(payload.rawBytes);
    text = extracted.combinedText;
    if (pageImages.length === 0) {
      pageImages = extracted.pageImages;
    }
  }

  const fileName = payload.fileName || 'uploaded_document.pdf';

  // 1. Check for Johnson County Appraiser CARDS PRC
  if (isJohnsonCountyPrcText(text, fileName)) {
    return parseJohnsonCountyPrc(text, fileName, pageImages);
  }

  // 2. Check for Jackson County MO PrintDatalet PRC
  if (isJacksonCountyPrcText(text, fileName)) {
    return parseJacksonCountyPrc(text, fileName, pageImages);
  }

  // 3. Check for Architectural CAD Floor Plan Set (e.g. Truman Courthouse)
  if (isArchitecturalFloorPlanText(text, fileName)) {
    return parseArchitecturalFloorPlan(text, fileName, pageImages);
  }

  // 4. Generic fallback (use clear fields + exterior footprint fallback)
  return parseGenericPropertyDocument(text, fileName, pageImages);
}

/**
 * Ingests a browser File object (.pdf, .png, .jpg, .webp, .json, .xml).
 */
export async function ingestDocumentFile(file: File): Promise<IngestionResult> {
  const nameLower = file.name.toLowerCase();

  // Handle MeshEngine JSON manifest
  if (nameLower.endsWith('.json')) {
    try {
      const rawJson = await file.text();
      const parsed = JSON.parse(rawJson);
      const proj: SprocketProject = parsed.project || parsed;
      if (proj && proj.rooms) {
        return {
          document_type: 'meshengine_bundle',
          document_label: 'MeshEngine Manifest JSON',
          confidence: 1.0,
          recommended_mode: 'clear_interior_rooms',
          mode_reasoning: 'MeshEngine JSON contains full room definitions and metadata.',
          project_name: proj.name || file.name,
          address: proj.address || {
            street: '7550 Windsor St',
            city: 'Prairie Village',
            state: 'KS',
            zip: '66208',
          },
          baseline_quality: proj.baseline_quality || 'Class 4',
          baseline_condition: proj.baseline_condition || 'Class 3',
          metadata: proj.property_metadata || {
            source_document_type: 'meshengine_bundle',
            source_file_name: file.name,
          },
          exterior_footprint_rooms: proj.rooms,
          interior_rooms: proj.rooms,
          has_clear_interior_rooms: true,
        };
      }
    } catch {
      return parseGenericPropertyDocument(file.name, file.name);
    }
  }

  // Handle Image uploads (.png, .jpg, .jpeg, .webp)
  if (/\.(png|jpe?g|webp)$/i.test(nameLower)) {
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });
    return ingestDocumentTextOrBuffer({
      fileName: file.name,
      text: file.name,
      pageImages: [dataUrl],
    });
  }

  // Handle PDF / XML / Text
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  return ingestDocumentTextOrBuffer({
    fileName: file.name,
    rawBytes: bytes,
  });
}

/**
 * Built-in 1-click reference samples for the 3 client document types.
 */
export function getBuiltInSampleIngestion(
  sampleId: 'johnson_county_prc' | 'jackson_county_prc' | 'truman_courthouse_cad'
): IngestionResult {
  if (sampleId === 'johnson_county_prc') {
    return parseJohnsonCountyPrc(
      'Parcel ID: 046-097-35-0-10-01-009.00-0 Quick Ref: R27504 Tax Year: 2026\n000318 E PARK ST, OLATHE, KS\nTotal Living Area: 1152\nMain Floor Living Area: 960\nTotal Basement Area 424',
      'JoCo_CARDS_R27504_318_E_Park_St.pdf'
    );
  }
  if (sampleId === 'jackson_county_prc') {
    return parseJacksonCountyPrc(
      'PARID: 46610030500000000\n7001 E 67TH ST KANSAS CITY MO 64133',
      'JacksonCo_Datalet_7001_E_67th_St.pdf'
    );
  }
  return parseArchitecturalFloorPlan(
    'JACKSON COUNTY HISTORIC TRUMAN COURTHOUSE\n102 NORTH MAIN STREET INDEPENDENCE, MISSOURI 64050\nPIPER-WIND ARCHITECTS, INC.',
    'Truman_Courthouse_G003_Scheme4.pdf'
  );
}

/**
 * Applies an IngestionResult to a SprocketProject, enforcing the client's tiered rule
 * (or an explicit modeOverride selected by the user in the Ingestion Modal).
 */
export function applyIngestionToProject(
  currentProject: SprocketProject,
  result: IngestionResult,
  modeOverride?: IngestionGeometryMode
): SprocketProject {
  const effectiveMode: IngestionGeometryMode =
    modeOverride ??
    (result.recommended_mode === 'clear_interior_rooms' && result.has_clear_interior_rooms
      ? 'clear_interior_rooms'
      : 'exterior_footprint_only');

  const sourceRooms =
    effectiveMode === 'clear_interior_rooms' && result.interior_rooms.length > 0
      ? result.interior_rooms
      : result.exterior_footprint_rooms;

  const costIndex = resolveRegionalCostIndex(
    result.address.zip,
    result.address.city,
    result.address.state
  );

  const recomputedRooms = sourceRooms.map((room) => {
    const floor_area_sqft =
      room.floor_area_sqft || calculateRoomFloorArea(room.dimensions, room.polygon_points);
    const wallAreas = calculateWallAreas(room.dimensions, room.openings);
    const cost_rollup = calculateRoomCostRollup(
      floor_area_sqft,
      room.quality_class,
      room.condition_class,
      room.deficiencies,
      costIndex
    );

    return {
      ...room,
      floor_area_sqft,
      gross_wall_area_sqft: wallAreas.gross_wall_area_sqft,
      net_wall_area_sqft: wallAreas.net_wall_area_sqft,
      cost_rollup,
    };
  });

  const ansi = calculateAnsiZ765GLA(recomputedRooms, 6);
  const gba = calculateGBA(recomputedRooms);
  const summary = calculateProjectSummary(recomputedRooms, costIndex);

  return {
    ...currentProject,
    project_id: result.metadata.parcel_id || result.metadata.quick_ref_id || currentProject.project_id,
    name: result.project_name,
    address: { ...result.address },
    cost_index: costIndex,
    baseline_quality: result.baseline_quality,
    baseline_condition: result.baseline_condition,
    property_metadata: {
      ...result.metadata,
      ingestion_mode: effectiveMode,
    },
    rooms: recomputedRooms,
    gla_sqft: ansi.ansi_gla_sqft,
    gba_sqft: gba,
    summary,
    updated_at: new Date().toISOString(),
  };
}
