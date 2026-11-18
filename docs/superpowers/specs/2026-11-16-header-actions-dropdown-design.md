# Header Actions & Dropdown Navigation — Design Specification

## 1. Intent & Problem Statement
In `src/components/layout/Header.tsx`, eight action buttons currently compete for horizontal space alongside the project selector, brand indicator, and live metric tickers. On laptops and standard desktop viewports, this causes crowding, clipped text, or awkward responsive hiding.

The objective is to reorganize these actions using industry-standard CAD/estimating software patterns:
- Keep high-frequency primary actions pinned to the header bar.
- Ensure the **Gemini AI** button remains directly visible on the header.
- Consolidate secondary inspection tools and output deliverables into two clean semantic dropdowns: **Tools** and **Export**.

---

## 2. Goals & Non-Goals

### Goals
- **Pinned Primary Actions:**
  - **Save:** Quick-action icon button with IndexedDB save feedback.
  - **Ingest File:** Primary entry point for importing plans, cards, and images.
  - **Gemini AI:** Explicitly pinned with live connection status pip (emerald when configured, slate when unconfigured).
- **"Tools" Dropdown (Property & Estimating Modals):**
  - *Property Fields* (opens `PropertyRecordModal`)
  - *Craftsman Valuation* (opens `ValuationModal`)
  - *Materials Order* (opens `LowesProcurementModal` / materials supply order)
- **"Export" Dropdown (Deliverables & Outputs):**
  - *PDF Report* (triggers `onOpenReport` for printable PDF scope of work)
  - *MeshEngine Drop (.ZIP)* (triggers `handleExportMeshEngineBundle`, displaying packaging / export status)
- **Accessible & Robust Dropdown Interaction:**
  - Click-outside dismiss and `Escape` key listeners.
  - Automatic mutual exclusion (opening one menu closes the other).
  - Closing dropdowns immediately when an action is clicked.
  - Visual feedback for disabled/exporting states.

### Non-Goals
- Altering the business logic or props of any underlying modal or exporter.
- Changing the project selector or live metric tickers.

---

## 3. Approaches Considered

| Approach | Description | Trade-offs | Decision |
|---|---|---|---|
| **1. Semantic Menus: "Tools" & "Export"** | Groups estimating/property editing modals under "Tools" and deliverables under "Export". Pins Save, Ingest, and Gemini AI. | Clean domain separation; reduces 8 buttons down to 3 buttons + 2 compact dropdowns (~50% width reduction). | **Selected (Recommended)** |
| **2. Single "Actions" / "More" Menu** | Pins Save, Ingest, Gemini AI, and MeshEngine Drop, putting all other items under one overflow menu. | Mixes reporting deliverables with inspection tools in one list. | Rejected |
| **3. Unified Command Menu** | Hides all modals and exports under a single menu, leaving only Save and Gemini AI on the bar. | Adds an unnecessary extra click to Ingest File. | Rejected |

---

## 4. Component Details (`src/components/layout/Header.tsx`)

### Layout Hierarchy
```
[Header]
  ├── Left: Brand ("DataMesh Sprocket") + Project Switcher Dropdown + Property Address/PIN
  ├── Center: Live Metrics Tickers (ANSI GLA, Rooms, Direct Cost, Cost to Cure, RCN, As-Is)
  └── Right (Action Cluster):
        ├── [Save] (Icon button)
        ├── [Ingest File] (Upload icon + text)
        ├── [Gemini AI] (Sparkles icon + status dot, always visible)
        ├── [Tools ▼] (Dropdown button)
        │     └── Dropdown Menu:
        │           ├── Property Fields (FileSpreadsheet icon)
        │           ├── Craftsman Valuation (Calculator icon)
        │           └── Materials Order (ShoppingCart icon)
        └── [Export ▼] (Dropdown button)
              └── Dropdown Menu:
                    ├── PDF Inspection Report (Printer icon)
                    └── MeshEngine Drop (.ZIP) (FileArchive icon + status state)
```

### Interactions & State
- `showToolsMenu: boolean`
- `showExportMenu: boolean`
- Click outside ref / event handlers to dismiss menus cleanly.
- Keyboard `Escape` dismiss.

---

## 5. Verification Plan
- `npm run build` or `npx tsc --noEmit` to verify type safety.
- Test menu open/close toggles, mutual exclusion, and click-outside dismissal.
- Verify clicking each item properly triggers its intended modal or action.
- Confirm Gemini button remains prominently visible with its connection status dot.
