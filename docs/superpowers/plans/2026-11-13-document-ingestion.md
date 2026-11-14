# Document Ingestion & Prepopulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable DataMesh Sprocket to ingest Property Record Cards (Johnson County CARDS, Jackson County PrintDatalet), Architectural Floor Plan PDFs (Truman Courthouse CAD set), images, and XML/JSON bundles to prepopulate project data fields and the 2D vector canvas using a tiered rule (use clear interior data when available; fall back to exterior building footprints when interior room dimensions are unavailable).

**Architecture:** We extend `SprocketProject` and `RoomNode` in `src/types/sprocket.ts` to store rich property/appraisal metadata, `Attic` floor level support, and node classification (`interior_room`, `exterior_footprint`, `accessory_structure`). A modular client-side ingestion pipeline in `src/services/ingestion/` uses `pdfjs-dist` (plus raw stream/OCR recovery for broken PDF font encodings like Jackson County's PrintDatalet) and specialized parsers to produce structured `IngestionResult` payloads. Two new modals (`DocumentIngestionModal` and `PropertyRecordModal`) plus updated canvas rendering in `VectorCanvas.tsx` allow users to ingest files, preview/toggle between exterior footprints and interior rooms, and edit all property record fields.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Vitest, `pdfjs-dist`

**Spec:** `docs/superpowers/specs/2026-11-13-document-ingestion-design.md`

## Global Constraints

- Pure client-side execution in Vite/React without requiring a custom backend server.
- All existing Vitest unit test suites (`geometry.test.ts`, `valuation.test.ts`, `intentParser.test.ts`, `lowes.test.ts`, `bundleSerializer.test.ts`) must continue to pass without regression.
- Never fabricate interior room partitions when a source document only supplies exterior sketch dimensions and aggregate room counts.
- Exclude non-living accessory structures (`exclude_from_gla: true`: garages, decks, open/enclosed porches) from ANSI Z765 Gross Living Area (GLA).

## Review Focus

- **Garbled PDF Font Streams (Jackson County PrintDatalet):** Chromium-printed Datalet PDFs contain shifted/custom glyph mappings where standard `pdf.js` text extraction emits symbols (`!)* '+),`); the extractor must inspect both raw PDF streams/URLs and decoded/OCR text so Jackson County PDFs parse reliably.
- **Exterior Footprint GLA Double-Counting:** Exterior footprints from County PRCs already represent outside wall dimensions; `calculateAnsiZ765GLA` must not add an extra +6" buffer to `exterior_footprint` rooms or include decks/garages (`exclude_from_gla: true`) in GLA.
- **CAD Furniture Dimensions vs. Room Dimensions:** Architectural sheets (Truman Courthouse) contain many `W x L` callouts in inches for furniture (`18 x 36`, `36 x 72`); the parser must not mistake furniture dimensions in inches for room dimensions in feet.
- **Level Switching with `Attic`:** Adding `'Attic'` to `FloorLevel` requires `RoomPalette`, `RoomInspectionDrawer`, `App.tsx`, and `bundleSerializer.ts` to include `'Attic'` in level counts and selectors so no runtime `undefined` key errors occur.
- **Empty / Unrecognized PDF Upload:** Uploading an arbitrary PDF with no recognizable dimensions must gracefully fall back to a default exterior footprint shell with whatever address/metadata text was found rather than throwing an unhandled error.

---

### Task 1: Domain Types, Regional Cost Indices & Exterior Footprint Geometry Math

**Files:**
- Modify: `src/types/sprocket.ts`
- Modify: `src/services/math/geometry.ts`
- Modify: `src/services/math/valuation.ts`
- Modify: `src/services/math/__tests__/geometry.test.ts`

**Interfaces:**
- Produces in `src/types/sprocket.ts`:
  - `FloorLevel = 'First Floor' | 'Second Floor' | 'Basement' | 'Attic'`
  - `RoomNodeType = 'interior_room' | 'exterior_footprint' | 'accessory_structure'`
  - `BuildingPermitRecord`, `DwellingComponentRecord`, `PropertyMetadata`
  - Extended `RoomNode` (`node_type?: RoomNodeType`, `structure_code?: string`, `exclude_from_gla?: boolean`)
  - Extended `SprocketProject` (`property_metadata?: PropertyMetadata`)
- Produces in `src/services/math/valuation.ts`:
  - `resolveRegionalCostIndex(zip?: string, city?: string, state?: string): RegionalCostIndex`
  - `mapRawQualityToClass(rawQuality?: string): QualityClass`
  - `mapRawConditionToClass(rawCondition?: string): ConditionClass`

- [ ] **Step 1: Write failing tests in `src/services/math/__tests__/geometry.test.ts` and `src/services/math/__tests__/valuation.test.ts`**

Add test cases verifying:
1. `calculateAnsiZ765GLA` excludes rooms with `exclude_from_gla: true` (e.g., `Wood Deck w/ Roof` 152 SF, `Frame Garage` 1224 SF) and does not add the +6" buffer when above-grade rooms have `node_type: 'exterior_footprint'` (e.g., 960 SF + 192 SF = 1152 SF exact GLA).
2. `resolveRegionalCostIndex` resolves Olathe KS (`66061`), Kansas City MO (`64133`), and Independence MO (`64050`).
3. `mapRawQualityToClass` maps `'Fair+'` -> `'Class 5'`, `'B--B-'` -> `'Class 3'`, and `mapRawConditionToClass` maps `'PR'` -> `'Class 5'`, `'4-AVERAGE'` -> `'Class 4'`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/math/__tests__/geometry.test.ts src/services/math/__tests__/valuation.test.ts`
Expected: FAIL with missing functions/properties.

- [ ] **Step 3: Implement schema extensions in `src/types/sprocket.ts` and math helpers in `src/services/math/geometry.ts` and `src/services/math/valuation.ts`**

Update `calculateAnsiZ765GLA` so `aboveGradeRooms` filters out `r.exclude_from_gla === true`, and if all `aboveGradeRooms` have `r.node_type === 'exterior_footprint'`, `exterior_wall_buffer_sqft` is `0` and `ansi_gla_sqft === interior_area_sqft`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/math/__tests__/geometry.test.ts src/services/math/__tests__/valuation.test.ts`
Expected: PASS

---

### Task 2: Document Ingestion Engine & Parsers (Johnson County, Jackson County, Architectural CAD, XML/JSON)

**Files:**
- Create: `src/services/ingestion/types.ts`
- Create: `src/services/ingestion/pdfExtractor.ts`
- Create: `src/services/ingestion/parsers/johnsonCountyParser.ts`
- Create: `src/services/ingestion/parsers/jacksonCountyParser.ts`
- Create: `src/services/ingestion/parsers/architecturalPlanParser.ts`
- Create: `src/services/ingestion/documentIngestor.ts`
- Create: `src/services/ingestion/__tests__/documentIngestor.test.ts`

**Interfaces:**
- Consumes: `SprocketProject`, `PropertyMetadata`, `RoomNode`, `FloorLevel`, `QualityClass`, `ConditionClass` from `src/types/sprocket.ts`
- Produces in `src/services/ingestion/documentIngestor.ts`:
  - `ingestDocumentTextOrBuffer(input: { fileName: string; text?: string; rawBytes?: Uint8Array; pageImages?: string[] }): Promise<IngestionResult>`
  - `ingestDocumentFile(file: File): Promise<IngestionResult>`
  - `getBuiltInSampleIngestion(sampleId: 'johnson_county_prc' | 'jackson_county_prc' | 'truman_courthouse_cad'): IngestionResult`
  - `applyIngestionToProject(currentProject: SprocketProject, result: IngestionResult, modeOverride?: 'exterior_footprint_only' | 'clear_interior_rooms'): SprocketProject`

- [ ] **Step 1: Write failing tests in `src/services/ingestion/__tests__/documentIngestor.test.ts`**

Write tests verifying:
1. **Johnson County CARDS PRC ingestion**: Given the OCR/text of the Olathe KS PRC (`000318 E PARK ST, OLATHE, KS`, `Parcel ID: 046-097-35-0-10-01-009.00-0`, `Quick Ref: R27504`, `Year Built: 1900`, `Total Living Area: 1152`, `Main Floor Living Area: 960`, `Total Basement Area 424`, `Wood Deck with Roof 152`), `ingestDocumentTextOrBuffer` classifies it as `'johnson_county_prc'`, sets `recommended_mode` to `'exterior_footprint_only'`, extracts all property metadata fields (including permit `23-0922BR`, appraised total `$166,000`, RCN `$162,313`), and generates the exterior footprint rooms (`Detached SFR Unit` `24'×40'`, `Second Floor` `24'×8'`, `Wood Deck w/ Roof` `19'×8'` excluded from GLA, `Partial Basement` `424 SF` on `Basement`) yielding `1,152 SF` ANSI GLA.
2. **Jackson County PrintDatalet PRC ingestion (both clean text and garbled PrintDatalet stream with `jacksongov.org` pin `46610030500000000`)**: Classifies as `'jackson_county_prc'`, sets `recommended_mode` to `'exterior_footprint_only'`, extracts `7001 E 67TH ST`, `KANSAS CITY, MO 64133`, `THOMAS ALFRED C JR & LILLY R`, `Year Built: 1950`, `03-RANCH`, `Living Area: 4736`, Market Total `$169,280`, Assessed `$32,164`, and generates the 9 exterior building footprint sections (`Main Building` `61'×28'`, `FR GR` `36'×34'`, `1S FR` wings, `EFP`/`OFP` porches) with garages/porches marked `exclude_from_gla: true`.
3. **Architectural CAD Floor Plan Set (Truman Courthouse)**: Classifies as `'architectural_floorplan'`, extracts `102 NORTH MAIN STREET, INDEPENDENCE, MO 64050`, `Piper-Wind Architects, Inc.`, Rentable Area `35,400 SF`, Usable Area `19,000 SF`, provides both `clear_interior_rooms` (Historical Society rooms across `Basement`, `First Floor`, `Second Floor`, `Attic` without confusing furniture inch callouts like `18 x 36` for room feet) and `exterior_footprint_only` fallback floor plates, and allows toggling between them in `applyIngestionToProject`.
4. **Unrecognized / sparse document fallback**: Gracefully produces a valid `IngestionResult` with `'exterior_footprint_only'` mode and no thrown errors.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/ingestion/__tests__/documentIngestor.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Install `pdfjs-dist` and implement the ingestion modules**

Install `pdfjs-dist` (`npm install pdfjs-dist`) and implement `types.ts`, `pdfExtractor.ts`, `johnsonCountyParser.ts`, `jacksonCountyParser.ts`, `architecturalPlanParser.ts`, and `documentIngestor.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/ingestion/__tests__/documentIngestor.test.ts`
Expected: PASS

---

### Task 3: UI Integration — Ingestion Modal, Property Record Modal, Canvas Footprint Styling & UAD XML Export

**Files:**
- Create: `src/components/modals/DocumentIngestionModal.tsx`
- Create: `src/components/modals/PropertyRecordModal.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/RoomPalette.tsx`
- Modify: `src/components/inspection/RoomInspectionDrawer.tsx`
- Modify: `src/components/canvas/VectorCanvas.tsx`
- Modify: `src/services/exporters/bundleSerializer.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `ingestDocumentFile`, `getBuiltInSampleIngestion`, `applyIngestionToProject` from `src/services/ingestion/documentIngestor.ts`
- Produces:
  - `DocumentIngestionModal` (upload PDF/Image/XML/JSON, 1-click sample loaders for the 3 client PDFs, mode toggle between `Exterior Footprint Only` and `Clear Interior Rooms`, preview of extracted fields & footprint blocks)
  - `PropertyRecordModal` (editable form for all `PropertyMetadata` fields, parcel info, building systems, county tax values, permits, and baseline quality/condition)
  - Updated `VectorCanvas` (renders `exterior_footprint` and `accessory_structure` badges/borders and optional blueprint underlay)

- [ ] **Step 1: Implement `DocumentIngestionModal.tsx` and `PropertyRecordModal.tsx`**

Build both modals matching the dark slate/sky/emerald aesthetic of `ValuationModal.tsx`.

- [ ] **Step 2: Update `Header.tsx`, `RoomPalette.tsx`, `RoomInspectionDrawer.tsx`, `VectorCanvas.tsx`, `bundleSerializer.ts`, and `App.tsx`**

- Add **"Ingest Document"** button and **"Property Record"** button (plus Parcel ID / Source badge) to `Header.tsx`.
- Add `'Attic'` level tab support to `RoomPalette.tsx`, `RoomInspectionDrawer.tsx`, `App.tsx`, and `bundleSerializer.ts`.
- Add `node_type` (`Interior Room` | `Exterior Footprint` | `Accessory / Non-GLA`) and `exclude_from_gla` controls to `RoomInspectionDrawer.tsx`.
- Update `VectorCanvas.tsx` to style `exterior_footprint` nodes (emerald/teal perimeter outline + `"EXTERIOR FOOTPRINT"` pill) and `accessory_structure` nodes (amber dashed outline + `"NON-GLA / ACCESSORY"` pill) and auto-fit the viewBox when a new document is ingested.
- Include `property_metadata` in `bundleSerializer.ts` UAD XML and `manifest.json` exports.

- [ ] **Step 3: Run full test suite and production build to verify zero TypeScript or runtime errors**

Run: `npm test && npm run build`
Expected: All Vitest test suites PASS and `tsc -b && vite build` succeeds with 0 errors.
