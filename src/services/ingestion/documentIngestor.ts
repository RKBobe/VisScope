import JSZip from 'jszip';
import {
  ConditionClass,
  DefectItem,
  FloorLevel,
  IngestionGeometryMode,
  PropertyMetadata,
  QualityClass,
  RoomNode,
  RoomNodeType,
  ScopeAction,
  SprocketProject,
  TradeCategory,
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
import {
  extractImageMetadataAndDimensions,
  extractPdfContent,
} from './pdfExtractor';
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

const EXCLUDED_ROOM_LABEL_TERMS = [
  'shelf',
  'cabinet',
  'counter',
  'table',
  'scale',
  'sheet',
  'page',
  'zoom',
  'paper',
  'dpi',
  'px',
  'pixel',
];

function extractExplicitRoomsFromText(
  text: string,
  quality_class: QualityClass,
  condition_class: ConditionClass,
  zip: string,
  city: string,
  state: string,
  fileName: string
): RoomNode[] {
  const roomRegex =
    /([A-Za-z][A-Za-z0-9 /&-]{2,28}?)[ \t]*[:\-]?[ \t]*(\d{1,2}(?:\.\d+)?)[ \t]*(?:'|ft\.?|feet)?[ \t]*[xX×][ \t]*(\d{1,2}(?:\.\d+)?)[ \t]*(?:'|ft\.?|feet)?(?=\s|$|,|;)/g;
  const rooms: RoomNode[] = [];
  let match: RegExpExecArray | null;
  let cursorX = 120;
  let cursorY = 120;

  while ((match = roomRegex.exec(text)) !== null) {
    const rawName = match[1].replace(/\s+/g, ' ').trim();
    const lowerName = rawName.toLowerCase();
    if (EXCLUDED_ROOM_LABEL_TERMS.some((term) => lowerName.includes(term))) {
      continue;
    }

    const length_ft = Number(match[2]);
    const width_ft = Number(match[3]);
    if (
      !Number.isFinite(length_ft) ||
      !Number.isFinite(width_ft) ||
      length_ft < 4 ||
      length_ft > 80 ||
      width_ft < 4 ||
      width_ft > 80
    ) {
      continue;
    }

    const level: FloorLevel = lowerName.includes('basement')
      ? 'Basement'
      : lowerName.includes('2nd') || lowerName.includes('second') || lowerName.includes('upper')
      ? 'Second Floor'
      : lowerName.includes('attic')
      ? 'Attic'
      : 'First Floor';

    const excludeFromGla =
      lowerName.includes('garage') ||
      lowerName.includes('porch') ||
      lowerName.includes('deck') ||
      lowerName.includes('patio') ||
      level === 'Basement' ||
      level === 'Attic';

    rooms.push(
      createIngestedRoomNode({
        id: `parsed-rm-${rooms.length + 1}`,
        name: rawName,
        level,
        length_ft,
        width_ft,
        height_ft: 9,
        x_in: cursorX,
        y_in: cursorY,
        node_type: excludeFromGla ? 'accessory_structure' : 'interior_room',
        exclude_from_gla: excludeFromGla,
        quality_class,
        condition_class,
        zip,
        city,
        state,
        source: fileName,
      })
    );

    cursorX += Math.round(length_ft * 12) + 12;
    if (cursorX > 900) {
      cursorX = 120;
      cursorY += 216;
    }
  }

  return rooms.length >= 2 ? rooms : [];
}

/**
 * Fallback parser for generic/unknown property documents or images.
 * Follows the client rule: extract clear fields and fall back to exterior footprint when interior rooms aren't clear.
 */
function parseGenericPropertyDocument(
  text: string,
  fileName: string,
  pageImages: string[] = [],
  imageAspectRatio?: number
): IngestionResult {
  const isImageFile = /\.(png|jpe?g|webp)$/i.test(fileName);
  const docType = isImageFile ? 'image_sketch' : 'generic_pdf';

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

  const ratio =
    typeof imageAspectRatio === 'number' && Number.isFinite(imageAspectRatio)
      ? Math.max(0.5, Math.min(2.5, imageAspectRatio))
      : 1.35;
  const lengthFt = Math.max(20, Math.round(Math.sqrt(reportedGla * ratio)));
  const widthFt = Math.max(16, Math.round(reportedGla / lengthFt));

  const qualityClass = mapRawQualityToClass(text.match(/Quality[:\s]*([A-Za-z+\-]+)/i)?.[1]);
  const conditionClass = mapRawConditionToClass(text.match(/Condition[:\s]*([A-Za-z+\-]+)/i)?.[1]);

  const parsedInteriorRooms = extractExplicitRoomsFromText(
    text,
    qualityClass,
    conditionClass,
    zip,
    city,
    state,
    fileName
  );
  const hasClearInterior = parsedInteriorRooms.length >= 2;
  const interiorGla = hasClearInterior
    ? parsedInteriorRooms
        .filter((r) => !r.exclude_from_gla && (r.level === 'First Floor' || r.level === 'Second Floor'))
        .reduce((acc, r) => acc + r.floor_area_sqft, 0)
    : reportedGla;

  const metadata: PropertyMetadata = {
    source_document_type: docType,
    source_file_name: fileName,
    ingestion_mode: hasClearInterior ? 'clear_interior_rooms' : 'exterior_footprint_only',
    ingestion_notes: hasClearInterior
      ? `Extracted ${parsedInteriorRooms.length} explicit room dimensions from document/text.`
      : 'Full interior room layout was not found in document. Generated scaled exterior building footprint from reported living area.',
    year_built: yearBuilt,
    total_living_area_reported_sqft: glaMatch ? reportedGla : interiorGla,
    main_floor_living_area_sqft: glaMatch ? reportedGla : interiorGla,
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
    document_type: docType,
    document_label: hasClearInterior
      ? 'Extracted Floorplan Rooms'
      : isImageFile
      ? 'Floorplan Image Sketch (Exterior Footprint + Underlay)'
      : 'Property Document (Exterior Footprint Fallback)',
    confidence: hasClearInterior ? 0.9 : 0.78,
    recommended_mode: hasClearInterior ? 'clear_interior_rooms' : 'exterior_footprint_only',
    mode_reasoning: hasClearInterior
      ? `Detected ${parsedInteriorRooms.length} explicit room dimension entries (e.g. Room LxW). Ready to populate interior layout.`
      : 'Full interior room breakdown is not clear in this file; defaulting to the exterior property footprint per client rule.',
    project_name: `Ingested — ${street}`,
    address: { street, city, state, zip },
    baseline_quality: qualityClass,
    baseline_condition: conditionClass,
    metadata,
    exterior_footprint_rooms: exteriorFootprintRooms,
    interior_rooms: parsedInteriorRooms,
    has_clear_interior_rooms: hasClearInterior,
    raw_extracted_text: text,
  };
}

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function extractXmlTag(block: string, tagName: string): string | undefined {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = block.match(regex);
  return match ? unescapeXml(match[1]) : undefined;
}

function extractXmlBlocks(xml: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, 'gi');
  return xml.match(regex) || [];
}

function mapXmlLevelType(rawLevel?: string): FloorLevel {
  const clean = (rawLevel || '').replace(/\s+/g, '').toLowerCase();
  if (clean.includes('second')) return 'Second Floor';
  if (clean.includes('basement')) return 'Basement';
  if (clean.includes('attic')) return 'Attic';
  return 'First Floor';
}

export function isUadXmlText(text: string, fileName: string = ''): boolean {
  const lowerName = fileName.toLowerCase();
  if (
    text.includes('MISMOVersionID') ||
    (text.includes('<MESSAGE') && text.includes('<PROPERTIES>')) ||
    text.includes('<GrossLivingAreaSquareFeetNumber>')
  ) {
    return true;
  }
  return lowerName.endsWith('.xml') && text.includes('<PROPERTY>');
}

export function parseUadXmlDocument(
  xmlText: string,
  fileName: string = 'uad_inspection_payload.xml'
): IngestionResult {
  const street = extractXmlTag(xmlText, 'AddressLineText') || '7550 Windsor St';
  const city = extractXmlTag(xmlText, 'CityName') || 'Prairie Village';
  const state = extractXmlTag(xmlText, 'StateCode') || 'KS';
  const zip = extractXmlTag(xmlText, 'PostalCode') || '66208';

  const propertyId = extractXmlTag(xmlText, 'PropertyIdentifier');
  const parcelId = extractXmlTag(xmlText, 'ParcelIdentifier') || propertyId;
  const quickRefId = extractXmlTag(xmlText, 'QuickRefIdentifier');
  const ownerName = extractXmlTag(xmlText, 'OwnerName');
  const legalDescription = extractXmlTag(xmlText, 'LegalDescriptionText');
  const yearBuiltStr = extractXmlTag(xmlText, 'YearBuiltNumber');
  const archStyle = extractXmlTag(xmlText, 'ArchitecturalStyleText');
  const lotSizeStr = extractXmlTag(xmlText, 'LotSizeSquareFeetNumber');
  const appraisedStr = extractXmlTag(xmlText, 'AppraisedTotalValueAmount');
  const rcnStr = extractXmlTag(xmlText, 'DwellingRCNAmount');
  const reportedGlaStr = extractXmlTag(xmlText, 'GrossLivingAreaSquareFeetNumber');

  const baselineQuality: QualityClass = mapRawQualityToClass(
    extractXmlTag(xmlText, 'BaselinePropertyQualityRating') || 'Q4'
  );
  const baselineCondition: ConditionClass = mapRawConditionToClass(
    extractXmlTag(xmlText, 'BaselinePropertyConditionRating') || 'C3'
  );

  const costIndex = resolveRegionalCostIndex(zip, city, state);
  const levelBlocks = extractXmlBlocks(xmlText, 'LEVEL');
  const rooms: RoomNode[] = [];
  let fallbackIndex = 0;

  for (const levelBlock of levelBlocks) {
    const level = mapXmlLevelType(extractXmlTag(levelBlock, 'FloorLevelType'));
    const roomBlocks = extractXmlBlocks(levelBlock, 'ROOM');

    for (const roomBlock of roomBlocks) {
      const id = extractXmlTag(roomBlock, 'RoomIdentifier') || `xml-room-${fallbackIndex + 1}`;
      const name = extractXmlTag(roomBlock, 'RoomTypeName') || `Room ${fallbackIndex + 1}`;
      const length_ft = Math.max(1, Number(extractXmlTag(roomBlock, 'LengthFeetNumber')) || 12);
      const width_ft = Math.max(1, Number(extractXmlTag(roomBlock, 'WidthFeetNumber')) || 12);
      const height_ft = Math.max(7, Number(extractXmlTag(roomBlock, 'CeilingHeightFeetNumber')) || 9);
      const areaAttr = Number(extractXmlTag(roomBlock, 'AreaSquareFeetNumber'));
      const floor_area_sqft =
        Number.isFinite(areaAttr) && areaAttr > 0
          ? areaAttr
          : Number((length_ft * width_ft).toFixed(2));

      const rawNodeType = extractXmlTag(roomBlock, 'RoomNodeType');
      const node_type: RoomNodeType =
        rawNodeType === 'exterior_footprint' ||
        rawNodeType === 'accessory_structure' ||
        rawNodeType === 'interior_room'
          ? rawNodeType
          : 'interior_room';
      const excludeFromGla = extractXmlTag(roomBlock, 'ExcludeFromGLAIndicator') === 'true';

      const posXRaw = extractXmlTag(roomBlock, 'CanvasPositionX');
      const posYRaw = extractXmlTag(roomBlock, 'CanvasPositionY');
      const canvas_position =
        posXRaw !== undefined && posYRaw !== undefined
          ? { x: Number(posXRaw) || 120, y: Number(posYRaw) || 120 }
          : {
              x: 120 + (fallbackIndex % 3) * 264,
              y: 120 + Math.floor(fallbackIndex / 3) * 240,
            };

      const quality_class = mapRawQualityToClass(
        extractXmlTag(roomBlock, 'RoomQualityRating') || baselineQuality
      );
      const condition_class = mapRawConditionToClass(
        extractXmlTag(roomBlock, 'RoomConditionRating') || baselineCondition
      );

      const defectBlocks = extractXmlBlocks(roomBlock, 'DEFICIENCY');
      const deficiencies: DefectItem[] = defectBlocks.map((db, dIdx) => {
        const actionRaw = (extractXmlTag(db, 'ScopeActionType') || 'Replace') as ScopeAction;
        const tradeRaw = (extractXmlTag(db, 'TradeCategoryDescription') ||
          'Finish Carpentry') as TradeCategory;
        const unitRaw = (extractXmlTag(db, 'UnitOfMeasureType') || 'EA') as
          | 'SF'
          | 'LF'
          | 'EA'
          | 'ALLOWANCE';
        const qty = Number(extractXmlTag(db, 'QuantityNumber')) || 1;
        const unitPrice = Number(extractXmlTag(db, 'UnitPriceAmount')) || 0;
        const totalCost = Number(extractXmlTag(db, 'TotalCostAmount')) || Number((qty * unitPrice).toFixed(2));
        const verified = extractXmlTag(db, 'VerifiedIndicator') !== 'false';

        return {
          id: extractXmlTag(db, 'DeficiencyIdentifier') || `${id}-def-${dIdx + 1}`,
          trade_category: tradeRaw,
          action: actionRaw,
          description: extractXmlTag(db, 'ItemDescription') || `${tradeRaw} scope`,
          quantity: qty,
          unit: unitRaw,
          unit_price: unitPrice,
          total_cost: totalCost,
          is_verified: verified,
        };
      });

      const wallAreas = calculateWallAreas({ length_ft, width_ft, height_ft }, []);
      const cost_rollup = calculateRoomCostRollup(
        floor_area_sqft,
        quality_class,
        condition_class,
        deficiencies,
        costIndex
      );

      rooms.push({
        id,
        name,
        level,
        node_type,
        exclude_from_gla: excludeFromGla,
        ingested_from_source: fileName,
        dimensions: { length_ft, width_ft, height_ft },
        canvas_position,
        openings: [],
        floor_area_sqft,
        gross_wall_area_sqft: wallAreas.gross_wall_area_sqft,
        net_wall_area_sqft: wallAreas.net_wall_area_sqft,
        quality_class,
        condition_class,
        is_class_overridden: false,
        voice_transcript: '',
        deficiencies,
        photos: [],
        cost_rollup,
      });

      fallbackIndex++;
    }
  }

  const allExterior =
    rooms.length > 0 && rooms.every((r) => r.node_type === 'exterior_footprint' || r.node_type === 'accessory_structure');
  const recommended_mode: IngestionGeometryMode = allExterior
    ? 'exterior_footprint_only'
    : 'clear_interior_rooms';

  const metadata: PropertyMetadata = {
    source_document_type: 'meshengine_bundle',
    source_file_name: fileName,
    ingestion_mode: recommended_mode,
    ingestion_notes: `Imported ${rooms.length} room/footprint sections from UAD 3.6 XML inspection payload.`,
    parcel_id: parcelId,
    quick_ref_id: quickRefId,
    owner_name: ownerName,
    legal_description: legalDescription,
    year_built: yearBuiltStr ? Number(yearBuiltStr) : undefined,
    architectural_style: archStyle,
    lot_size_sqft: lotSizeStr ? Number(lotSizeStr) : undefined,
    appraised_total_value: appraisedStr ? Number(appraisedStr) : undefined,
    dwelling_rcn_value: rcnStr ? Number(rcnStr) : undefined,
    total_living_area_reported_sqft: reportedGlaStr ? Number(reportedGlaStr) : undefined,
    total_rooms_reported: rooms.length || undefined,
  };

  return {
    document_type: 'meshengine_bundle',
    document_label: 'UAD 3.6 / MISMO 3.6 XML Inspection Payload',
    confidence: 0.99,
    recommended_mode,
    mode_reasoning:
      'Parsed UAD 3.6 / MISMO 3.6 XML hierarchy including levels, rooms, dimensions, and itemized deficiencies.',
    project_name: `UAD Import — ${street}`,
    address: { street, city, state, zip },
    baseline_quality: baselineQuality,
    baseline_condition: baselineCondition,
    metadata,
    exterior_footprint_rooms: rooms,
    interior_rooms: rooms,
    has_clear_interior_rooms: rooms.length > 0,
    raw_extracted_text: xmlText,
  };
}

function parseJsonManifestContent(rawJson: string, fileName: string): IngestionResult | null {
  try {
    const parsed = JSON.parse(rawJson);
    const proj: SprocketProject = parsed.project || parsed;
    if (proj && Array.isArray(proj.rooms)) {
      return {
        document_type: 'meshengine_bundle',
        document_label: 'MeshEngine Manifest JSON',
        confidence: 1.0,
        recommended_mode: 'clear_interior_rooms',
        mode_reasoning: 'MeshEngine JSON contains full room definitions and metadata.',
        project_name: proj.name || fileName,
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
          source_file_name: fileName,
        },
        exterior_footprint_rooms: proj.rooms,
        interior_rooms: proj.rooms,
        has_clear_interior_rooms: proj.rooms.length > 0,
      };
    }
  } catch {
    return null;
  }
  return null;
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

  // 4. Check for UAD 3.6 / MISMO 3.6 XML
  if (isUadXmlText(text, fileName)) {
    return parseUadXmlDocument(text, fileName);
  }

  // 5. Generic fallback (use clear fields + exterior footprint fallback)
  return parseGenericPropertyDocument(text, fileName, pageImages, payload.imageAspectRatio);
}

/**
 * Ingests a browser File object (.pdf, .png, .jpg, .webp, .json, .xml, .zip).
 */
export async function ingestDocumentFile(file: File): Promise<IngestionResult> {
  const nameLower = file.name.toLowerCase();

  // Handle MeshEngine ZIP drop bundle
  if (nameLower.endsWith('.zip')) {
    try {
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const manifestEntry =
        zip.file('manifest.json') ||
        Object.values(zip.files).find((f) => !f.dir && f.name.toLowerCase().endsWith('.json'));
      if (manifestEntry) {
        const jsonText = await manifestEntry.async('string');
        const parsedJson = parseJsonManifestContent(jsonText, file.name);
        if (parsedJson) return parsedJson;
      }

      const xmlEntry =
        zip.file('uad_inspection_payload.xml') ||
        Object.values(zip.files).find((f) => !f.dir && f.name.toLowerCase().endsWith('.xml'));
      if (xmlEntry) {
        const xmlText = await xmlEntry.async('string');
        if (isUadXmlText(xmlText, xmlEntry.name)) {
          return parseUadXmlDocument(xmlText, file.name);
        }
      }
    } catch {
      return parseGenericPropertyDocument(file.name, file.name);
    }
  }

  // Handle MeshEngine JSON manifest
  if (nameLower.endsWith('.json')) {
    const rawJson = await file.text();
    const parsedJson = parseJsonManifestContent(rawJson, file.name);
    if (parsedJson) return parsedJson;
    return parseGenericPropertyDocument(file.name, file.name);
  }

  // Handle UAD 3.6 / MISMO XML
  if (nameLower.endsWith('.xml')) {
    const rawXml = await file.text();
    if (isUadXmlText(rawXml, file.name)) {
      return parseUadXmlDocument(rawXml, file.name);
    }
    return parseGenericPropertyDocument(rawXml, file.name);
  }

  // Handle Image uploads (.png, .jpg, .jpeg, .webp)
  if (/\.(png|jpe?g|webp)$/i.test(nameLower)) {
    const [dataUrl, arrayBuffer] = await Promise.all([
      new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(file);
      }),
      file.arrayBuffer(),
    ]);
    const imageMeta = extractImageMetadataAndDimensions(new Uint8Array(arrayBuffer));
    const aspectRatio =
      imageMeta.width && imageMeta.height && imageMeta.height > 0
        ? imageMeta.width / imageMeta.height
        : undefined;
    const combinedImageText = [file.name, imageMeta.embeddedText].filter(Boolean).join('\n');
    return ingestDocumentTextOrBuffer({
      fileName: file.name,
      text: combinedImageText,
      pageImages: [dataUrl],
      imageAspectRatio: aspectRatio,
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
