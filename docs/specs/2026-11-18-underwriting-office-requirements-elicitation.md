# Vis-Scope Office Edition: Underwriting & Collateral Desk Review Platform
## Business Architecture & Stakeholder Requirements Elicitation Document

* **Version:** 1.0 (Draft for Stakeholder Elicitation)
* **Date:** November 2026
* **Status:** Under Review / Confidential
* **Prepared For:** Underwriting Leadership, Collateral Risk Officers, Chief Credit Officers, Appraisal Management Teams, Technology & Product Leadership
* **PDF Export:** [`Vis-Scope_Underwriting_Requirements.pdf`](file:///C:/Users/Kyle/development/visScope/Vis-Scope_Underwriting_Requirements.pdf)

---

### Executive Summary & Purpose

The existing **Vis-Scope Field Client (Core v1.0)** is optimized for high-mobility, touch-first jobsites—allowing inspectors and contractors to model ANSI Z765 vector floor plans, capture photo defects, voice-dictate scopes of work, and generate material pick sheets. 

The **Office Edition** serves an entirely distinct operational purpose: **collateral risk validation, public record discrepancy reconciliation, cost audit, and loan/rehab decisioning**.

This document outlines the theoretical architecture, workflow specifications, and structured elicitation questions for extending the Vis-Scope inspection ecosystem into an **Office Edition** for **Underwriters, Desk Reviewers, and Risk Officers**.

---

### 1. Operational Vectors: Field vs. Office

| Vector | Vis-Scope Field Client (Existing) | Vis-Scope Office Edition (Proposed) |
| :--- | :--- | :--- |
| **Primary User** | Field Inspector, Fee Appraiser, General Contractor | Collateral Underwriter, Desk Reviewer, Risk Officer |
| **Operating Environment** | iPad / Android Tablet / Laptop on jobsite | Multi-monitor Desktop Workstation (Chrome / Edge) |
| **Core Activity** | Data capture, perimeter measurement, photo tagging | Audit reconciliation, risk scoring, variance adjudication |
| **Primary Concern** | Field speed, touch accuracy, offline IndexedDB resilience | Fraud prevention, unpermitted space, valuation accuracy |
| **Primary Deliverables** | MeshEngine CAD ZIP, Lowe's B2B pick sheet, draft report | Underwriting Sign-Off Memo, Escrow Determination, MISMO Review XML |

---

### 2. Architectural Topology: Monorepo Persona Routing

To eliminate schema drift and guarantee zero duplication of core calculation logic, the Office Edition will be integrated directly into the Vis-Scope codebase under a dedicated route (`/office` or `/review`) backed by role-based access controls (RBAC):

* **Shared Core Engine (Reused):**
  * **ANSI Z765 Standards Engine:** Consistent Gross Living Area (GLA) calculations.
  * **Craftsman 2026 Valuation Index:** Shared trade assembly cost multipliers.
  * **Gemini 3.0 Multimodal Pipeline:** AI extraction for tax cards and blueprint PDFs.
  * **UAD 3.6 / MISMO 3.4 Serializers:** Standards-compliant appraisal export packages.
* **Office-Specific Capabilities (New):**
  * **Multi-Project Pipeline Queue:** Triage, sorting, and SLA assignment.
  * **Split-Screen Auditor:** Vector floor plan vs. county tax card side-by-side.
  * **Automated Underwriting Rules (AUR):** Instant discrepancy & risk flags.
  * **Redline Adjustment Layer:** Non-destructive underwriter cost overrides.

---

### 3. Proposed Functional Modules

#### Module A: Triage Pipeline & Inspection Queue
* Configurable multi-project filtering by Loan Officer, Loan Number, Property State, and SLA urgency.
* Automated Risk Score Badge (Low, Moderate, High, Fatal) calculated upon upload.
* Status lifecycle: `Submitted` → `In Desk Review` → `Flagged / Pending Revision` → `Approved` → `Declined`.

#### Module B: Split-Screen Discrepancy Reconciliation Auditor
* **Left Pane (Field Reality):** Interactive vector CAD floor plan with room dimensions, GLA total, condition ratings (C1–C6), and defect photos.
* **Right Pane (Public Record Reality):** Ingested County Assessor property card, historical MLS data, or permitted blueprint drawings.
* **Automated Optical Comparison:** Visual highlighting of unpermitted additions and square footage discrepancies.

#### Module C: Automated Underwriting Rules Engine (AUR)
* **GLA Variance Threshold:** Field GLA differs from County Tax Record by > 10.0% flags unpermitted additions.
* **Cost-to-Cure Ratio:** Total repairs exceed 15.0% of As-Is Value triggers mandatory repair escrow holdback.
* **Severe Condition Class:** C5 or C6 condition ratings trigger hard loan stops.
* **Below-Grade GLA Trap:** Below-grade basement space included in Above-Grade GLA triggers automatic ANSI compliance flag.

#### Module D: Non-Destructive Underwriter Adjustment Layer
* **Dual-Column Scope Accounting:** Displays `Field Estimate ($)` alongside `Underwriter Allowed ($)`.
* **Mandatory Reason Codes:** E.g., *"Local trade index correction"*, *"Cosmetic only—deferred maintenance"*, *"Excessive margin"*.
* **Automated Escrow Calculator:** Computes lender holdback reserves (110% to 150% of approved repairs).

#### Module E: Decision Memo & Secondary Market Compliance Exports
* **Underwriting Decision Memo (PDF):** Formal, signed risk determination document itemizing approved repairs, required escrows, and loan conditions.
* **Fannie Mae Form 1004D / Completion Certificate Integration:** Pre-populated inspection audit.
* **MISMO 3.4 / 3.6 Desk Review XML:** Direct export for ingestion into Encompass, Black Knight, or proprietary LOS platforms.

---

### 4. Stakeholder Questionnaire & Decision Matrix

1. **Lending Environment & Core Audience:** Private / Hard Money vs. Conventional GSE vs. AMC vs. Insurance?
2. **Data Synchronization Topology:** Real-Time Cloud Central Database vs. MeshEngine (.ZIP) file upload vs. LOS Webhook bridge?
3. **GLA Variance Tolerances:** 5.0% vs. 10.0% vs. absolute square footage (e.g. 200 SF)?
4. **Scope & Cost Adjustments Authority:** Non-destructive override layer vs. direct editing vs. reject & re-submit only?
5. **Required Holdback / Escrow Calculations:** Flat 150% multiplier vs. tiered by trade category vs. discretionary?
6. **LOS Integrations:** ICE Mortgage Technology (Encompass) vs. Black Knight / Empower vs. custom REST APIs?
7. **Automated Defect Vision Verification (Gemini 3.0):** Photo condition verification, blueprint vs CAD cross-check, permit document ingestion?
8. **RBAC Hierarchy:** Field Inspector vs. Desk Reviewer vs. Senior Underwriting Manager vs. Enterprise Admin?

---

### 5. Implementation Roadmap

* **Phase 1: Core Desk Review (Sprints 1–2):** Split-screen Auditor, Pipeline table, Variance calculators.
* **Phase 2: Adjudication & AUR (Sprints 3–4):** Automated Rules Engine, Adjustment Ledger, Escrow Calc, Decision Memo PDF.
* **Phase 3: Real-Time Sync & LOS (Sprints 5–6):** Two-way Re-Inspection Dispatch Loop, Cloud Database Sync, Encompass Connectors.
