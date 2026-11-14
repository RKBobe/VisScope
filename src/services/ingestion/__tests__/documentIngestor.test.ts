import { describe, it, expect } from 'vitest';
import {
  ingestDocumentTextOrBuffer,
  getBuiltInSampleIngestion,
  applyIngestionToProject,
} from '../documentIngestor';
import { createInitialProject } from '../../storage/projectStore';

const JOHNSON_COUNTY_PRC_SAMPLE_TEXT = `
Parcel ID: 046-097-35-0-10-01-009.00-0 Quick Ref: R27504 Tax Year: 2026
Johnson County Appraiser CARDS Property Record Card
PROPERTY SITUS ADDRESS
000318 E PARK ST, OLATHE, KS
GENERAL PROPERTY INFORMATION
Prop Class: R - Residential
Living Units: 1
Zoning: C-2
Neighborhood: 149
LEGAL DESCRIPTION
OLATHE LT 28 BLK 48 OLC 1146
BUILDING PERMITS
23-0922BR $40,000.00 IR - Interior Remodel 9/14/2023 Closed 100
CURRENT APPRAISED VALUE
R 32,290 133,710 166,000
MARKET LAND INFORMATION
Sqft 2 - Secondary Site 3886.00 0 357 9,400 4 1 1.00 32,290
DWELLING INFORMATION
Res Type: Single-Family Residence
Quality: Fair+
Year Built: 1900
MS Style: 1 1/2 Story Finished
Total Living Area: 1152
Calculated Area: 960
Main Floor Living Area: 960
CDU: PR
COMP SALES INFORMATION
Arch Style: Bungalow
Bsmt Type: Partial
Total Rooms: 7 Bedrooms: 4
Full Baths: 1
Foundation: 4 - Stone
IMPROVEMENT COST SUMMARY
Dwelling RCN: 162,313
Percent Good: 37
Building Value: 72,070
DWELLING COMPONENTS
116 Frame, Siding/Shingle 100
208 Composition Shingle 100
313 Wall Furnace 100
601 Plumbing Fixtures 5
602 Plumbing Rough-ins 1
622 Raised Subfloor 1,040
801 Total Basement Area 424
906 Wood Deck with Roof 152
APEX SKETCH
Detached SFR Unit 960 sf 24.0' 40.0'
Second Floor 192.0 sf 24.0 8.0
Wood Deck w/ Roof 152.0 sf 19.0 8.0
`;

const JACKSON_COUNTY_GARBLED_TEXT_SAMPLE = `
!  " # $ % & ' ( (! #!
!)* '+), - -
:0083 DD8J;/4B)BB+33C )Bx3<?9<AC<,9D )0)/+03D,4?0 )0)/+0C)38*84?46610030500000000&938 $ &0)*5+), - -
https://publicaccess.jacksongov.org/Datalets/PrintDatalet.aspx?pin=46610030500000000&gsp=PROFILEALL&taxyear=2026&jur=048&ownseq=0&car=1
`;

const TRUMAN_COURTHOUSE_CAD_SAMPLE_TEXT = `
PIPER-WIND ARCHITECTS, INC. 2121 CENTRAL STREET, SUITE 143 KANSAS CITY, MISSOURI 64108
JACKSON COUNTY HISTORIC TRUMAN COURTHOUSE
102 NORTH MAIN STREET
INDEPENDENCE, MISSOURI 64050
INTERIOR RENOVATION
SCHEME 4 - HISTORICAL SOCIETY
1ST FLOOR SE QUADRANT
1/8" = 1'-0"
RETAIL VAULT
DISPLAY
MEETING
OFFICE
BOOKSTORE ANTIQUE COUNTER 24 x 96
DISPLAY CABINET HARBIN BROTHERS 36 x 120 X 30
SHELF ZEPHYR 18 x 36
2ND FLOOR SE QUADRANT
RESEARCH
PROCESSING
VAULT
LOWER LEVEL NW QUADRANT
BREAK ROOM
STORAGE
HIGH DENSITY FILE SYTEM
`;

describe('Document Ingestion & Tiered Editor Prepopulation Engine', () => {
  it('ingests Johnson County CARDS PRC and populates exterior footprints (1,152 SF GLA) + property fields', async () => {
    const result = await ingestDocumentTextOrBuffer({
      fileName: 'JoCo_R27504_PRC.pdf',
      text: JOHNSON_COUNTY_PRC_SAMPLE_TEXT,
    });

    expect(result.document_type).toBe('johnson_county_prc');
    expect(result.recommended_mode).toBe('exterior_footprint_only');
    expect(result.address.street).toBe('318 E PARK ST');
    expect(result.address.city).toBe('Olathe');
    expect(result.address.state).toBe('KS');
    expect(result.metadata.parcel_id).toBe('046-097-35-0-10-01-009.00-0');
    expect(result.metadata.quick_ref_id).toBe('R27504');
    expect(result.metadata.year_built).toBe(1900);
    expect(result.metadata.total_living_area_reported_sqft).toBe(1152);
    expect(result.metadata.bedrooms_reported).toBe(4);
    expect(result.metadata.full_baths_reported).toBe(1);
    expect(result.metadata.total_rooms_reported).toBe(7);
    expect(result.metadata.appraised_total_value).toBe(166000);
    expect(result.metadata.dwelling_rcn_value).toBe(162313);
    expect(result.metadata.permits?.length).toBeGreaterThan(0);
    expect(result.metadata.permits?.[0].number).toBe('23-0922BR');

    const baseProject = createInitialProject();
    const updatedProject = applyIngestionToProject(baseProject, result);

    // Must use exterior footprints (not fabricated interior rooms)
    expect(updatedProject.gla_sqft).toBe(1152);
    expect(updatedProject.baseline_quality).toBe('Class 5'); // Fair+
    expect(updatedProject.baseline_condition).toBe('Class 5'); // PR

    // Check Wood Deck is excluded from GLA and Basement is on Basement level
    const deckNode = updatedProject.rooms.find((r) => r.name.includes('Wood Deck'));
    expect(deckNode).toBeDefined();
    expect(deckNode?.exclude_from_gla).toBe(true);
    expect(deckNode?.floor_area_sqft).toBe(152);

    const basementNode = updatedProject.rooms.find((r) => r.level === 'Basement');
    expect(basementNode).toBeDefined();
    expect(basementNode?.floor_area_sqft).toBe(424);
  });

  it('recovers Jackson County PrintDatalet PRC even from garbled font streams and populates 9 exterior footprint sections', async () => {
    const result = await ingestDocumentTextOrBuffer({
      fileName: 'JacksonCounty_46610030500000000.pdf',
      text: JACKSON_COUNTY_GARBLED_TEXT_SAMPLE,
    });

    expect(result.document_type).toBe('jackson_county_prc');
    expect(result.recommended_mode).toBe('exterior_footprint_only');
    expect(result.address.street).toBe('7001 E 67TH ST');
    expect(result.address.city).toBe('Kansas City');
    expect(result.address.state).toBe('MO');
    expect(result.address.zip).toBe('64133');
    expect(result.metadata.parcel_id).toBe('46610030500000000');
    expect(result.metadata.owner_name).toBe('THOMAS ALFRED C JR & LILLY R');
    expect(result.metadata.year_built).toBe(1950);
    expect(result.metadata.total_living_area_reported_sqft).toBe(4736);
    expect(result.metadata.appraised_total_value).toBe(169280);
    expect(result.metadata.assessed_total_value).toBe(32164);

    // Should have all 9 exterior footprint sections from Page 3 sketch
    expect(result.exterior_footprint_rooms.length).toBe(9);

    const baseProject = createInitialProject();
    const updatedProject = applyIngestionToProject(baseProject, result);

    // Garage and porches are excluded from GLA; Living sections sum to 4,736 SF
    expect(updatedProject.gla_sqft).toBe(4736);
    const garage = updatedProject.rooms.find((r) => r.name.includes('Garage'));
    expect(garage?.exclude_from_gla).toBe(true);
    expect(garage?.floor_area_sqft).toBe(1224);
  });

  it('ingests Architectural CAD Floor Plan (Truman Courthouse) with clear interior rooms and supports exterior footprint fallback', async () => {
    const result = await ingestDocumentTextOrBuffer({
      fileName: 'Truman_Courthouse_G003_Scheme4.pdf',
      text: TRUMAN_COURTHOUSE_CAD_SAMPLE_TEXT,
    });

    expect(result.document_type).toBe('architectural_floorplan');
    expect(result.recommended_mode).toBe('clear_interior_rooms');
    expect(result.address.street).toBe('102 NORTH MAIN STREET');
    expect(result.address.city).toBe('Independence');
    expect(result.address.state).toBe('MO');
    expect(result.address.zip).toBe('64050');
    expect(result.metadata.architect_firm).toContain('Piper-Wind');
    expect(result.metadata.rentable_area_reported_sqft).toBe(35400);
    expect(result.metadata.usable_area_reported_sqft).toBe(19000);

    // Ensure furniture callouts in inches (e.g., 18 x 36 shelf) were NOT turned into rooms
    const shelfRoom = result.interior_rooms.find((r) => r.name.toUpperCase().includes('ZEPHYR'));
    expect(shelfRoom).toBeUndefined();

    // Clear interior mode populates named rooms across Basement, First Floor, Second Floor, Attic
    const baseProject = createInitialProject();
    const interiorProject = applyIngestionToProject(baseProject, result, 'clear_interior_rooms');
    expect(interiorProject.rooms.length).toBeGreaterThanOrEqual(10);
    expect(interiorProject.rooms.some((r) => r.name.includes('Bookstore'))).toBe(true);
    expect(interiorProject.rooms.some((r) => r.name.includes('Research'))).toBe(true);

    // Fallback to Exterior Footprint mode populates building floor plates
    const footprintProject = applyIngestionToProject(baseProject, result, 'exterior_footprint_only');
    expect(footprintProject.rooms.every((r) => r.node_type === 'exterior_footprint')).toBe(true);
    expect(footprintProject.rooms.some((r) => r.level === 'Attic')).toBe(true);
  });

  it('gracefully falls back to exterior footprint shell on unknown/sparse document text', async () => {
    const result = await ingestDocumentTextOrBuffer({
      fileName: 'Unknown_Parcel_Scan.pdf',
      text: 'Property Address: 450 Main St, Overland Park, KS 66212\nLiving Area: 1,800 SF\nYear Built: 1978',
    });

    expect(result.recommended_mode).toBe('exterior_footprint_only');
    expect(result.exterior_footprint_rooms.length).toBeGreaterThan(0);
    expect(result.address.street).toContain('450 Main St');
  });

  it('provides built-in sample ingestions for all 3 client document types', () => {
    const joco = getBuiltInSampleIngestion('johnson_county_prc');
    const jackson = getBuiltInSampleIngestion('jackson_county_prc');
    const truman = getBuiltInSampleIngestion('truman_courthouse_cad');

    expect(joco.document_type).toBe('johnson_county_prc');
    expect(jackson.document_type).toBe('jackson_county_prc');
    expect(truman.document_type).toBe('architectural_floorplan');
  });

  it('does not hijack unrelated generic architectural PDFs with 1/8" scale into Truman Courthouse rooms', async () => {
    const genericBlueprintText = `
      CUSTOM RESIDENCE RENOVATION
      Property Address: 8800 Mission Rd, Leawood, KS 66206
      Scale: 1/8" = 1'-0"
      Total Living Area: 2,400 SF
      SHELF ZEPHYR 18 x 36
    `;

    const result = await ingestDocumentTextOrBuffer({
      fileName: 'Leawood_Residence_Blueprint.pdf',
      text: genericBlueprintText,
    });

    // Must NOT inject Truman Courthouse address or Bookstore room
    expect(result.address.street).toContain('8800 Mission Rd');
    expect(result.recommended_mode).toBe('exterior_footprint_only');
    expect(result.interior_rooms.some((r) => r.name.includes('Bookstore'))).toBe(false);
    expect(result.exterior_footprint_rooms[0].floor_area_sqft).toBe(2400);
  });
});
