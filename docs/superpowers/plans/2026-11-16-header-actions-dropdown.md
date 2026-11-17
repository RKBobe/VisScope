# Header Actions & Dropdown Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize top toolbar action buttons in `Header.tsx` into pinned primary buttons (Save, Ingest File, and Gemini AI) plus two semantic dropdown menus (Tools and Export) to conserve header space and ensure all actions are visible.

**Architecture:** Refactor `src/components/layout/Header.tsx` to introduce `showToolsMenu` and `showExportMenu` states with outside-click and escape key dismissal. Retain all existing event handler props and status feedbacks while streamlining toolbar density into two compact contextual dropdowns.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-16-header-actions-dropdown-design.md`

## Global Constraints
- Pinned actions must include Save, Ingest File, and Gemini AI (Gemini button must remain visible with its connection status dot).
- Dropdown menus must close when an item is clicked, when clicking outside, or on `Escape` key press.
- Opening one dropdown must close any other open dropdowns (mutual exclusion).
- All existing modal trigger callbacks (`onOpenIngestion`, `onOpenPropertyRecord`, `onOpenValuation`, `onOpenProcurement`, `onOpenReport`, `onOpenGeminiSettings`, `onSaveManual`, `handleExportMeshEngineBundle`) must remain fully wired.
- Build (`npm run build`) and test suite (`npm test`) must pass with zero errors.

## Review Focus
1. Click-outside behavior: Clicking anywhere outside an open dropdown dismisses it without triggering unintended actions.
2. Escape key dismissal: Pressing `Escape` closes any open dropdown menu.
3. Export feedback visibility: MeshEngine packaging and export success states remain clear to the user even if the menu closes.
4. Gemini AI button visibility: Gemini button is never hidden or moved into a submenu across all standard desktop and laptop screen sizes.
5. Mobile / responsive compactness: Dropdown buttons gracefully adapt with proper padding and text truncation if necessary.

---

### Task 1: Refactor `Header.tsx` with "Tools" and "Export" Dropdown Menus

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Test: `src/components/layout/__tests__/Header.test.tsx` (new test file to verify header action triggers and dropdown interactions)

**Interfaces:**
- Consumes:
  - `HeaderProps` from `src/components/layout/Header.tsx`
  - Icons from `lucide-react`: `SlidersHorizontal`, `Download`, `Upload`, `Sparkles`, `Save`, `CheckCircle2`, `ChevronDown`, `FileSpreadsheet`, `Calculator`, `ShoppingCart`, `Printer`, `FileArchive`, `Compass`, `FolderOpen`, `Plus`, `Trash2`, `Home`
- Produces:
  - `Header` component with pinned Save, Ingest File, and Gemini AI buttons, plus "Tools" and "Export" dropdown menus.

- [ ] **Step 1: Write unit tests for Header dropdown behavior and action triggers**
  Create `src/components/layout/__tests__/Header.test.tsx` using Vitest and React Testing Library (or DOM testing) to verify:
  - Renders pinned buttons: Save, Ingest File, and Gemini AI.
  - "Tools" button toggles the Tools dropdown containing Property Fields, Craftsman Valuation, and Materials Order.
  - "Export" button toggles the Export dropdown containing PDF Report and MeshEngine Drop.
  - Clicking a dropdown item calls the corresponding callback and closes the menu.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/components/layout/__tests__/Header.test.tsx`
  Expected: FAIL (file or components under test do not yet match new dropdown structure)

- [ ] **Step 3: Implement dropdown menus and click-outside / escape listeners in `Header.tsx`**
  - Add `toolsMenuRef` and `exportMenuRef` using `useRef<HTMLDivElement>(null)`.
  - Add `useEffect` listener for `mousedown` to handle click-outside.
  - Add `useEffect` listener for `keydown` to close menus on `Escape`.
  - Replace the 8 horizontal buttons with:
    1. Save icon button
    2. Ingest File button
    3. Gemini AI button (with connection status indicator)
    4. Tools dropdown (Property Fields, Craftsman Valuation, Materials Supply Order)
    5. Export dropdown (PDF Inspection Report, MeshEngine Drop with loading/success indicators)

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run src/components/layout/__tests__/Header.test.tsx`
  Expected: PASS

- [ ] **Step 5: Run full test suite and build verification**
  Run: `npm test && npm run build`
  Expected: All tests pass and Vite build completes without errors.

- [ ] **Step 6: Commit changes**
  Run:
  ```bash
  git add src/components/layout/Header.tsx src/components/layout/__tests__/Header.test.tsx docs/superpowers/
  git commit -m "feat(header): group secondary actions into Tools and Export dropdowns while keeping Gemini AI visible"
  ```
