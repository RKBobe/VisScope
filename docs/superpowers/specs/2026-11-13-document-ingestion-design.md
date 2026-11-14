# Document Ingestion & Editor Prepopulation — Design Specification

## 1. Intent & Problem Statement
DataMesh Sprocket needs to ingest property tax records, appraisal cards, and architectural floor plan documents (specifically County Appraiser Property Record Cards like Johnson County KS CARDS, Jackson County MO PrintDatalet, architectural CAD sets like the Historic Truman Courthouse, as well as images and MeshEngine JSON/UAD XML files) to prepopulate both:
1. **The 2D Parametric Vector Canvas (`VectorCanvas`)**, and
2. **Project & Property Data Fields (`SprocketProject`)**.

### Core Client Rule: Tiered Geometry Population
- **Use Clear Interior Information When Available:** When a document provides clear interior room or zone definitions and dimensions/areas (such as architectural floor plan room layouts or departmental area schedules), populate those individual interior rooms/zones onto their corresponding floor levels (`Basement`, `First Floor`, `Second Floor`, `Attic`).
- **Fallback to Exterior Footprint When Full Interior Picture Is Unavailable:** When a document only provides aggregate room counts without interior room dimensions (such as County Property Record Cards with Apex or Datalet exterior building sketches, or un-dimensioned floor plates), **never hallucinate interior room partitions**. Instead, populate the exact **exterior footprint sections** (main dwelling footprint, second-story footprint, basement footprint, and accessory structures like garages, decks, and porches) onto the canvas at their true dimensions and relative placement.

---

## 2. Goals, Non-Goals & Constraints

### Goals
- **Multi-Format Client-Side Ingestion:** Ingest `.pdf`, `.png`/`.jpg`/`.webp`, `.json` (MeshEngine manifest), and `.xml` (UAD 3.6 / MISMO 3.6) directly in the browser without requiring a backend server.
- **Resilient PDF Parsing (Clean Text + Broken CMap / Garbled Font + Vector CAD):**
  - Extract selectable PDF text and rasterize sketch/plan pages via `pdfjs-dist`.
  - Detect broken/garbled PDF font encodings (such as Jackson County MO PrintDatalet Chromium PDFs) and recover via raw PDF stream inspection + local OCR (`tesseract.js`) or optional Vision LLM API.
- **Complete Property Record Data Model & Editor UI:**
  - Expand `SprocketProject` with `PropertyMetadata` covering Parcel ID, Quick Ref, Tax Year, Owner, Legal Description, Lot Size, Year Built, Style, Stories, Reported GLA, Basement Type/Area, Bed/Bath/Room counts, Foundation, Exterior Wall, Roof, HVAC, Plumbing Fixtures, Fireplaces, Building Permits, Dwelling Components, and County Appraised/Market Values (Land, Building, Total, Assessed, RCN, % Good).
  - Automatically map County Quality & Condition ratings (e.g., `Fair+`, `PR`, `B--B-`, `4-AVERAGE`) to Sprocket's `Class 1–6` baseline ratings and match the property's ZIP/City/State to a `RegionalCostIndex`.
- **Accurate ANSI Z765 GLA & Accessory Structure Handling:**
  - Distinguish `interior_room`, `exterior_footprint`, and `accessory_structure` nodes on `RoomNode`.
  - Exclude non-living accessory structures (garages, open/enclosed porches, wood decks) from above-grade GLA (`exclude_from_gla: true`).
  - Avoid double-applying the +6" exterior wall buffer when above-grade nodes are already `exterior_footprint` measurements.
- **Interactive Review & Property Data Editing:**
  - Provide a `DocumentIngestionModal` with drag-and-drop upload, 1-click reference presets for the 3 client document types, extracted field preview, and mode toggle (`Exterior Footprint Only` vs. `Clear Interior Rooms`).
  - Provide a `PropertyRecordModal` accessible from the header so users can inspect and edit all prepopulated property data fields at any time.

### Non-Goals
- Automatic CAD wall-line vectorization from arbitrary unlabelled raster pixels without scale or text labels (handled instead via exterior footprint fallback + optional canvas blueprint underlay).
- Mandatory cloud backend dependency.

---

## 3. Approaches Considered (Build vs. Buy/Reuse)

| Approach | Description | Trade-offs | Decision |
|---|---|---|---|
| **A. Hybrid Local Browser Pipeline (`pdfjs-dist` + `tesseract.js` + Deterministic County/CAD Parsers + Optional Vision API)** | Uses Mozilla `pdfjs-dist` for PDF text & page rendering, `tesseract.js` fallback for garbled/scanned pages, deterministic parsers for Johnson County CARDS, Jackson County PrintDatalet, Architectural CAD sets, and UAD XML/JSON, plus optional Gemini Vision API key support. | Zero backend infrastructure cost; works offline/locally out of the box; deterministic 100% accuracy on the client's target document types. Adds `pdfjs-dist` to bundle (lazy-loaded). | **Selected (Recommended)** |
| **B. Cloud-Only Vision LLM Backend** | Sends every uploaded PDF to a remote multimodal LLM endpoint. | Requires backend proxy & paid API keys; fails when offline or without credentials. | Rejected as mandatory dependency (supported as optional enhancement). |
| **C. Custom Scratch PDF Binary Parser** | Hand-rolling a PDF lexer/parser in TypeScript. | Violates "Do Not Reinvent the Wheel"; brittle on compressed streams (`FlateDecode`). | Rejected. |

---

## 4. Detailed Component & Data Design

### 4.1 Schema Extensions (`src/types/sprocket.ts`)
- `FloorLevel`: `'First Floor' | 'Second Floor' | 'Basement' | 'Attic'`
- `RoomNodeType`: `'interior_room' | 'exterior_footprint' | 'accessory_structure'`
- `RoomNode` additions:
  - `node_type?: RoomNodeType`
  - `structure_code?: string`
  - `exclude_from_gla?: boolean`
- `PropertyMetadata` attached to `SprocketProject.property_metadata`:
  - Identification & Situs (`parcel_id`, `quick_ref_id`, `tax_year`, `owner_name`, `legal_description`, `neighborhood_code`, `zoning`, `property_class`, `lot_size_sqft`, `lot_size_acres`)
  - Structure & Room Counts (`year_built`, `architectural_style`, `stories`, `total_living_area_reported_sqft`, `main_floor_living_area_sqft`, `upper_floor_living_area_sqft`, `basement_type`, `basement_area_sqft`, `total_rooms_reported`, `bedrooms_reported`, `full_baths_reported`, `half_baths_reported`)
  - Systems & Construction (`foundation_type`, `exterior_wall_type`, `roof_type`, `roofing_material`, `heating_cooling_description`, `plumbing_fixtures_count`, `plumbing_rough_ins_count`, `fireplaces_count`, `garage_description`)
  - Valuation & Assessment (`quality_grade_raw`, `condition_cdu_raw`, `appraised_land_value`, `appraised_building_value`, `appraised_total_value`, `assessed_total_value`, `dwelling_rcn_value`, `percent_good`)
  - Architectural Metadata (`architect_firm`, `drawing_scheme`, `drawing_scale`, `usable_area_reported_sqft`, `rentable_area_reported_sqft`, `blueprint_underlay_data_uri`)
  - `permits: BuildingPermitRecord[]` and `components: DwellingComponentRecord[]`

### 4.2 Target Document Mapping Rules
1. **Johnson County Appraiser CARDS PRC (`000318 E PARK ST, OLATHE, KS`)**:
   - **Data Fields**: Parcel `046-097-35-0-10-01-009.00-0`, Quick Ref `R27504`, Tax Year `2026`, Zoning `C-2`, Lot `3,886 SF`, Year Built `1900`, Style `1 1/2 Story Finished / Bungalow`, Quality `Fair+` (`Class 5`), Condition `PR` (`Class 5`), Total Living Area `1,152 SF`, Main Floor `960 SF`, Basement `Partial (424 SF)`, Foundation `4 - Stone`, Rooms `7`, Beds `4`, Full Baths `1`, HVAC `Wall Furnace`, Roof `Composition Shingle`, Exterior `Frame, Siding/Shingle`, Plumbing `5 Fixtures + 1 Rough-in`, Permit `23-0922BR ($40,000 Interior Remodel)`, Appraised Land `$32,290`, Building `$133,710`, Total `$166,000`, RCN `$162,313` (`37%` good).
   - **Canvas Geometry (`exterior_footprint_only`)**:
     - `Detached SFR Unit`: `24' × 40'` (`960 SF`, `First Floor`, `exterior_footprint`)
     - `Wood Deck w/ Roof`: `19' × 8'` (`152 SF`, `First Floor`, `accessory_structure`, `exclude_from_gla: true`, snapped below main unit)
     - `Second Floor`: `24' × 8'` (`192 SF`, `Second Floor`, `exterior_footprint`)
     - `Partial Basement`: `24' × 18'` (`424 SF`, `Basement`, `exterior_footprint`, `exclude_from_gla: true`)
2. **Jackson County MO PrintDatalet PRC (`7001 E 67TH ST, KANSAS CITY, MO 64133`)**:
   - **Data Fields**: Parcel `46610030500000000`, Alt ID `4672681`, Owner `THOMAS ALFRED C JR & LILLY R`, NBHD `RKC03100`, Lot `31,799 SF` (`0.73 Acres`), Year Built `1950`, Style `03-RANCH`, Stories `1`, Exterior `04-BLOCK`, Roof `M-MANSARD / CP-COMP`, Quality Grade `B--B-` (`Class 3`), Condition `4-AVERAGE / AV-AVERAGE` (`Class 4`), Reported Living Area `4,736 SF`, Beds `4`, Full Baths `2`, Total Fixtures `8`, Basement `4-FULL`, Heat `3-CENTRAL W/ AIR (4-FORCED AIR, 2-GAS)`, Fireplaces `1 Masonry`, Market Land `$19,730`, Market Building `$149,550`, Market Total `$169,280`, Assessed Total `$32,164`.
   - **Canvas Geometry (`exterior_footprint_only`)**:
     - Places all 9 exterior sketch sections from Page 3 in their exact multi-wing spatial arrangement on `First Floor` (with `Main Building` `61'×28'`, `1S FR` wings `21'×34'`, `40'×34'`, `10'×24'`, `1S FR Lower/Wing` `21'×34'`, `FR GR Frame Garage` `36'×34'`, `EFP` porches `10'×10'` & `10'×12'`, and `OFP` porches `42'×6'` & `4'×12'`).
3. **Architectural Renovation Floor Plan Set (`Jackson County Historic Truman Courthouse, 102 N Main St, Independence, MO 64050`)**:
   - **Data Fields**: Architect `Piper-Wind Architects, Inc.`, Project `1311`, Scheme `Scheme 4 - Historical Society`, Scale `1/8" = 1'-0"`, Total Rentable Floor Area `35,400 SF`, Total Usable Area `19,000 SF`, Historical Society Area `4,163 SF`.
   - **Canvas Geometry**:
     - **Clear Interior Rooms Mode (Default)**: Populates the clearly delineated rooms per level (`First Floor`: `Bookstore`, `Display Gallery`, `Retail Vault`, `Meeting Room`, `Historical Society Office`, `Elevator Lobby`; `Second Floor`: `Research Room`, `Processing Area`, `Archive Vault`, `Archivist Office`, `2nd Floor Elevator Lobby`; `Basement`: `Historical Society High-Density Storage`, `NW Archival Storage`, `Break Room`, `Unisex Restrooms`; `Attic`: `Attic Mechanical / Envelope`).
     - **Exterior Footprint Mode (Fallback / Toggleable)**: Populates the exterior floor plates (`Basement Level Footprint`, `First Floor Footprint`, `Second Floor Footprint`, `Attic Footprint`) from sheet `G-003`.
