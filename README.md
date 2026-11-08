# DataMesh Sprocket Core System

> Professional-grade, touch-friendly residential property inspection, parametric floor plan modeling, voice-guided deficiency scoping, and renovation costing application.

**DataMesh Sprocket** operates as a standalone field client for tape & eyeball property inspections and an upstream ingestion provider for the **MeshEngine / DataMesh Labs** ecosystem.

---

## Key System Capabilities

### 1. Parametric 2D Vector Canvas (`src/components/canvas/`)
- **1-Foot Snapping Grid**: Touch and mouse interactions snap cleanly to a 12-inch grid.
- **Magnetic Edge-Snapping**: Automatic alignment guides snap room walls flush or edge-to-edge when within a 14-inch threshold.
- **ANSI Z765 Outer Shell Auto-Buffer**: Automatically computes the exterior perimeter hull and applies a 6-inch exterior wall boundary buffer to compute Gross Living Area (GLA) accurately from interior tape measurements.
- **Wall Openings**: Visualizes doors (with swing arcs), windows, and cased openings directly on the vector canvas with wall deductions.
- **Centroid Badges**: Interactive badges showing room name, dimensions, sqft, and real-time calculated total cost ($).

### 2. Xact-Scope Voice Scoping (`src/services/voice/`)
- **Push-to-Talk Web Speech API**: Client-side speech-to-text recording bound to the active room context.
- **Offline Tokenized Rule & Regex Intent Parser**: Extracts structured repair line items directly on device without mandatory cloud connection:
  - Pattern: `/(replace|remove|install|fix|add|keep)\s+(\d+(\.\d+)?)\s*(sq\s*ft|square\s*feet|sf|linear\s*feet|lf|feet|ft|units?|ea)?\s*(of\s*)?([a-z\s]+)/i`
  - Example: `"Replace 40 linear feet of baseboard"` $\to$ `{ action: 'Replace', quantity: 40, unit: 'LF', trade: 'Finish Carpentry', description: 'Baseboard' }`
- **One-Click Line Item Ingestion**: Converts spoken phrases into verified `DefectItem` objects with regional unit pricing.

### 3. Craftsman Valuation Engine (`src/services/math/valuation.ts`)
- **27-Category Direct Cost Baseline**: Pre-seeded with National Building Cost Manual standards.
- **Regional Zip Code Multipliers**:
  $$\text{Trade Direct Cost} = (\text{Base Mat} \times (1 + \text{MatMod})) + (\text{Base Lab} \times (1 + \text{LabMod})) + (\text{Base Equip} \times (1 + \text{EquipMod}))$$
  *(Prairie Village 66208: Mat $-1.0\%$, Lab $+13.0\%$, Equip $0.0\%$)*
- **Cost to Cure Calculation**: $\sum (\text{Trade Direct Cost} \times \text{Deficiency \%})$ plus itemized repair scoping.
- **Appraisal Rollups**: Direct costs, indirect costs ($12\%$), contractor incentive ($15\%$), and total project cost.

### 4. Lowe's B2B Pro Procurement (`src/services/lowes/`)
- **Dual-Mode Client**: Offline pre-seeded builder catalog (1/2" Gypsum drywall, primed MDF baseboards, 12/2 Romex, porcelain tile, pre-hung doors, paint) with live REST API adapter.
- **Waste Factor Calculations**:
  - Drywall / Insulation: $+10\%$
  - Trim / Molding / Baseboard: $+15\%$
  - Tile / Flooring: $+15\%$
- **Aisle & Bay Routing**: Compiles a contractor pick sheet CSV grouped and sorted by in-store Aisle and Bay.

### 5. MeshEngine Flat-File Drop Bundle (`src/services/exporters/`)
Generates a downloadable ZIP containing all four required ingestion assets:
1. `manifest.json`: Full project hierarchy, GLA, GBA, room rollups, and Craftsman summaries.
2. `floorplan.svg`: Standalone vector floor plan with ANSI Z765 exterior buffer.
3. `uad_inspection_payload.xml`: Appraisal-compliant MISMO 3.6 / UAD 3.6 XML inspection dataset.
4. `lowes_materials_buy_sheet.csv`: Contractor procurement pick list.

---

## Quick Start

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Run Unit Test Suites (Vitest)
```bash
npm test
```

### Production Build
```bash
npm run build
```

---

## Project Structure

```
src/
├── types/
│   └── sprocket.ts              # Core domain models & Lowe's B2B contracts
├── services/
│   ├── math/
│   │   ├── geometry.ts          # Shoelace area, wall deductions, grid & magnetic snap, ANSI hull
│   │   ├── valuation.ts         # Craftsman 27-category engine, regional indices, rollups
│   │   └── __tests__/           # Geometry & Valuation unit test suites
│   ├── voice/
│   │   ├── speechService.ts     # Push-to-talk Web Speech API controller
│   │   ├── intentParser.ts      # Offline tokenized regex intent parser
│   │   └── __tests__/           # Voice parser test suites
│   ├── lowes/
│   │   ├── lowesClient.ts       # B2B client, store locator, waste multipliers
│   │   ├── pickSheetExporter.ts # Aisle/Bay sorted CSV exporter
│   │   └── __tests__/           # Procurement test suites
│   ├── exporters/
│   │   ├── bundleSerializer.ts  # MeshEngine ZIP bundle, SVG, UAD 3.6 XML
│   │   └── __tests__/           # Serializer test suites
│   └── storage/
│       └── projectStore.ts      # IndexedDB persistence (idb-keyval)
├── components/
│   ├── canvas/
│   │   └── VectorCanvas.tsx     # Touch-first interactive SVG canvas
│   ├── inspection/
│   │   └── RoomInspectionDrawer.tsx # Push-to-talk drawer, defects & cardinal photos
│   ├── modals/
│   │   ├── ValuationModal.tsx   # Craftsman Cost Approach matrix & zip selector
│   │   └── LowesProcurementModal.tsx # Pick sheet, store info & CSV export
│   └── layout/
│       ├── Header.tsx           # Live metric tickers & export triggers
│       └── RoomPalette.tsx      # Bottom room templates & level selector
├── App.tsx                      # Root state orchestrator & reactive rollups
└── main.tsx                     # Entry point
```
