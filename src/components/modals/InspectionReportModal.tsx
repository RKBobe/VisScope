import React, { useState, useMemo } from 'react';
import { SprocketProject } from '../../types/sprocket';
import { generateFloorplanSVG } from '../../services/exporters/bundleSerializer';
import { lowesClient } from '../../services/lowes/lowesClient';
import { useSubscription } from '../../context/SubscriptionContext';
import {
  Printer,
  X,
  FileText,
  CheckCircle2,
  Building2,
  Calculator,
  ShoppingCart,
  Camera,
  Layers,
  CheckSquare,
  Square,
  Sun,
  Moon,
  Compass,
} from 'lucide-react';

interface InspectionReportModalProps {
  project: SprocketProject;
  isOpen: boolean;
  onClose: () => void;
}

export const InspectionReportModal: React.FC<InspectionReportModalProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  const { hasAccess, openUpgradeModal } = useSubscription();

  // Visibility toggles for customizable reporting
  const [includePropertyId, setIncludePropertyId] = useState(true);
  const [includeValuation, setIncludeValuation] = useState(true);
  const [includeFloorplan, setIncludeFloorplan] = useState(true);
  const [includeScopeOfWork, setIncludeScopeOfWork] = useState(true);
  const [includeProcurement, setIncludeProcurement] = useState(true);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [floorplanTheme, setFloorplanTheme] = useState<'light' | 'dark'>('light');

  // Compute multi-retailer procurement order
  const procurementOrder = useMemo(() => {
    return lowesClient.generateProcurementOrder(
      project.rooms,
      project.cost_index?.zip_code || project.address.zip,
      project.supply_retailer
    );
  }, [project.rooms, project.cost_index, project.address.zip, project.supply_retailer]);

  // Compute standards-compliant floorplan SVG
  const floorplanSvg = useMemo(() => {
    return generateFloorplanSVG(project, { theme: floorplanTheme, hideHeader: true });
  }, [project, floorplanTheme]);

  // Flatten all photos across rooms
  const allPhotos = useMemo(() => {
    return project.rooms.flatMap((r) =>
      (r.photos || []).map((p) => ({
        ...p,
        roomName: r.name,
      }))
    );
  }, [project.rooms]);

  // Flatten all deficiencies across rooms
  const allDeficiencies = useMemo(() => {
    return project.rooms.flatMap((r) =>
      (r.deficiencies || []).map((d) => ({
        ...d,
        roomName: r.name,
        roomLevel: r.level,
      }))
    );
  }, [project.rooms]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const reportDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const metadata = project.property_metadata;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-sm overflow-y-auto print:static print:bg-white print:p-0 print:overflow-visible">
      {/* Non-printing Control Toolbar */}
      <div className="sticky top-0 z-40 bg-slate-900 border-b border-slate-700 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xl no-print select-none">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Printable Property Inspection & Scope Report
              <span className="text-[10px] bg-sky-950 text-sky-400 border border-sky-800 px-2 py-0.5 rounded font-mono">
                ANSI Z765 Ready
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {project.name} • {project.address.street}, {project.address.city}
            </p>
          </div>
        </div>

        {/* Section Inclusion Toggles */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-300">
          <span className="text-slate-400 text-[11px] font-semibold mr-1">Sections:</span>
          <button
            type="button"
            onClick={() => setIncludePropertyId(!includePropertyId)}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] transition"
          >
            {includePropertyId ? <CheckSquare className="w-3.5 h-3.5 text-sky-400" /> : <Square className="w-3.5 h-3.5 text-slate-500" />}
            Property Info
          </button>

          <button
            type="button"
            onClick={() => setIncludeValuation(!includeValuation)}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] transition"
          >
            {includeValuation ? <CheckSquare className="w-3.5 h-3.5 text-sky-400" /> : <Square className="w-3.5 h-3.5 text-slate-500" />}
            Valuation
          </button>

          <button
            type="button"
            onClick={() => setIncludeFloorplan(!includeFloorplan)}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] transition"
          >
            {includeFloorplan ? <CheckSquare className="w-3.5 h-3.5 text-sky-400" /> : <Square className="w-3.5 h-3.5 text-slate-500" />}
            Floorplan
          </button>

          <button
            type="button"
            onClick={() => setIncludeScopeOfWork(!includeScopeOfWork)}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] transition"
          >
            {includeScopeOfWork ? <CheckSquare className="w-3.5 h-3.5 text-sky-400" /> : <Square className="w-3.5 h-3.5 text-slate-500" />}
            Scope
          </button>

          <button
            type="button"
            onClick={() => setIncludeProcurement(!includeProcurement)}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] transition"
          >
            {includeProcurement ? <CheckSquare className="w-3.5 h-3.5 text-sky-400" /> : <Square className="w-3.5 h-3.5 text-slate-500" />}
            Materials BOM
          </button>

          <button
            type="button"
            onClick={() => setIncludePhotos(!includePhotos)}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] transition"
          >
            {includePhotos ? <CheckSquare className="w-3.5 h-3.5 text-sky-400" /> : <Square className="w-3.5 h-3.5 text-slate-500" />}
            Photos ({allPhotos.length})
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Floorplan Theme Toggle */}
          <button
            type="button"
            onClick={() => setFloorplanTheme(floorplanTheme === 'light' ? 'dark' : 'light')}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs flex items-center gap-1.5 transition"
            title="Toggle Floorplan Print Theme (Light ink saver vs Dark blueprint)"
          >
            {floorplanTheme === 'light' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light Floorplan</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Dark Floorplan</span>
              </>
            )}
          </button>

          {/* Primary Print / Save as PDF Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-semibold px-4 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-lg shadow-sky-950 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Report Document Container */}
      <div className="w-full flex-1 p-4 sm:p-8 flex justify-center print:p-0 print:m-0">
        <div className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl p-8 sm:p-12 print:shadow-none print:border-none print:rounded-none print:p-0 print:max-w-none">
          
          {/* Starter Edition Watermark Banner */}
          {!hasAccess('export_pdf_unwatermarked') && (
            <div className="mb-6 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex flex-wrap items-center justify-between gap-3 print:border-amber-400">
              <div className="flex items-center gap-2">
                <span className="font-extrabold uppercase tracking-wider text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                  Starter Edition
                </span>
                <span className="font-medium text-amber-900">
                  Draft Scoping Preview • Upgrade to Professional for Official White-Label Appraisal Reports
                </span>
              </div>
              <button
                type="button"
                onClick={() => openUpgradeModal('export_pdf_unwatermarked')}
                className="print:hidden font-bold text-sky-700 hover:text-sky-900 underline text-xs shrink-0 cursor-pointer"
              >
                Upgrade to Remove Watermark
              </button>
            </div>
          )}

          {/* Document Header & Branding Banner */}
          <div className="border-b-2 border-slate-900 pb-6 mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-black text-xl tracking-wider text-slate-900">
                  VIS-<span className="text-sky-600 font-normal">SCOPE</span>
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300 font-mono font-semibold">
                  ANSI Z765-2021
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Property Inspection & Scope of Work Report
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Craftsman 3-Way Valuation • Architectural Spatial Geometry • Retailer Procurement Bill of Materials
              </p>
            </div>

            <div className="text-right font-mono text-xs text-slate-600 space-y-1">
              <div>
                <span className="text-slate-400 font-sans">Report Ref: </span>
                <span className="font-bold text-slate-900">RPT-{project.project_id}</span>
              </div>
              <div>
                <span className="text-slate-400 font-sans">Inspection Date: </span>
                <span className="font-bold text-slate-900">{reportDate}</span>
              </div>
              <div>
                <span className="text-slate-400 font-sans">Certified GLA: </span>
                <span className="font-bold text-emerald-700">{project.gla_sqft.toLocaleString()} SF</span>
              </div>
            </div>
          </div>

          {/* Section 1: Executive Summary & Property Identification */}
          {includePropertyId && (
            <div className="mb-8 print-avoid-break">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-4">
                <Building2 className="w-4 h-4 text-sky-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  1. Property Identification & Situs Summary
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Situs Address</span>
                  <span className="font-bold text-slate-900">{project.address.street}</span>
                  <span className="block text-slate-600">{project.address.city}, {project.address.state} {project.address.zip}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Parcel ID (PIN)</span>
                  <span className="font-mono font-bold text-slate-900">
                    {metadata?.parcel_id || 'N/A'}
                  </span>
                  {metadata?.quick_ref_id && (
                    <span className="block text-[10px] text-slate-500">Ref: {metadata.quick_ref_id}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Owner of Record</span>
                  <span className="font-semibold text-slate-900 truncate block">
                    {metadata?.owner_name || 'Owner on Record'}
                  </span>
                  <span className="text-[10px] text-slate-500">Tax Year: {metadata?.tax_year || 'Current'}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Year Built / Age</span>
                  <span className="font-bold text-slate-900">{metadata?.year_built || 'N/A'}</span>
                  <span className="block text-[10px] text-slate-500">
                    Stories: {metadata?.stories || '1.0'} • {metadata?.architectural_style || 'Craftsman'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Gross Living Area (GLA)</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">{project.gla_sqft.toLocaleString()} SF</span>
                  <span className="block text-[10px] text-slate-500">ANSI Z765 Finished Above-Grade</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Gross Building Area (GBA)</span>
                  <span className="font-mono font-bold text-slate-800">{project.gba_sqft.toLocaleString()} SF</span>
                  <span className="block text-[10px] text-slate-500">All Interior Levels Combined</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Room Count</span>
                  <span className="font-bold text-slate-900">{project.rooms.length} Units</span>
                  <span className="block text-[10px] text-slate-500">
                    {metadata?.bedrooms_reported ? `${metadata.bedrooms_reported} Bed` : ''}{' '}
                    {metadata?.full_baths_reported ? `• ${metadata.full_baths_reported} Full Bath` : ''}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Baseline Quality / Condition</span>
                  <span className="font-bold text-sky-800">{project.baseline_quality}</span>
                  <span className="block text-[10px] text-slate-500">Condition: {project.baseline_condition}</span>
                </div>
              </div>

              {/* County Assessment Summary Row if Present */}
              {(metadata?.appraised_total_value || metadata?.assessed_total_value) && (
                <div className="mt-3 grid grid-cols-4 gap-3 bg-amber-50/60 p-3 rounded-lg border border-amber-200/80 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-amber-800">County Appraised Land</span>
                    <span className="font-mono font-bold text-slate-800 block">
                      ${metadata?.appraised_land_value?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-amber-800">Appraised Building</span>
                    <span className="font-mono font-bold text-slate-800 block">
                      ${metadata?.appraised_building_value?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-amber-800">Total Appraised</span>
                    <span className="font-mono font-bold text-amber-900 block">
                      ${metadata?.appraised_total_value?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-amber-800">Assessed Value (Taxable)</span>
                    <span className="font-mono font-bold text-slate-800 block">
                      ${metadata?.assessed_total_value?.toLocaleString() || '0'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Craftsman 3-Way Valuation & Cost Approach Rollup */}
          {includeValuation && (
            <div className="mb-8 print-avoid-break">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    2. Craftsman 3-Way Valuation & Cost-to-Cure Summary
                  </h2>
                </div>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                  Cost Index: {project.cost_index.city}, {project.cost_index.state} ({project.cost_index.zip_code})
                </span>
              </div>

              {/* Valuation Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Direct Cost RCN</span>
                  <span className="text-base font-extrabold text-slate-900 font-mono">
                    ${project.summary.direct_cost_subtotal.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-slate-500 block">Base trade direct</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Indirect Costs</span>
                  <span className="text-base font-extrabold text-slate-900 font-mono">
                    ${project.summary.indirect_cost_subtotal.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-slate-500 block">Permits & architect</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">GC Incentive</span>
                  <span className="text-base font-extrabold text-slate-900 font-mono">
                    ${project.summary.contractor_incentive.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-slate-500 block">Contractor fee</span>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-semibold text-emerald-800 block">Total RCN</span>
                  <span className="text-base font-extrabold text-emerald-700 font-mono">
                    ${project.summary.post_renovation_value.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-emerald-600 block">Post-Renovation RCN</span>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-semibold text-amber-800 block">Cost to Cure</span>
                  <span className="text-base font-extrabold text-amber-700 font-mono">
                    ${project.summary.total_cost_to_cure.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-amber-600 block">Verified deficiencies</span>
                </div>

                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-semibold text-sky-800 block">As-Is Value</span>
                  <span className="text-base font-extrabold text-sky-900 font-mono">
                    ${project.summary.as_is_value.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-sky-700 block">RCN minus Cure</span>
                </div>
              </div>

              {/* Regional Multiplier Breakdown */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-4 font-mono">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-sans mr-2">Local Cost Modifiers:</span>
                  <span className="text-slate-700">
                    Materials: <strong className="text-slate-900">{(project.cost_index.material_modifier >= 0 ? '+' : '') + (project.cost_index.material_modifier * 100).toFixed(1)}%</strong> •{' '}
                    Labor: <strong className="text-slate-900">{(project.cost_index.labor_modifier >= 0 ? '+' : '') + (project.cost_index.labor_modifier * 100).toFixed(1)}%</strong> •{' '}
                    Equipment: <strong className="text-slate-900">{(project.cost_index.equipment_modifier >= 0 ? '+' : '') + (project.cost_index.equipment_modifier * 100).toFixed(1)}%</strong>
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-sans">
                  Deterministic Craftsman Cost Engine • Verified Zip Code Mapping
                </div>
              </div>
            </div>
          )}

          {/* Section 3: 2D Architectural Floorplan & Spatial Geometry */}
          {includeFloorplan && (
            <div className="mb-8 print-page-break">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-600" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    3. 2D Architectural Floorplan & Spatial Geometry
                  </h2>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  ANSI Z765-2021 Exterior Shell Buffer (6" Wall Offset Included)
                </span>
              </div>

              {/* Embedded Vector Floorplan */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-4 bg-slate-50 flex items-center justify-center p-2">
                <div
                  className="w-full max-h-[460px] flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: floorplanSvg.replace(/<\?xml.*?\?>/, '') }}
                />
              </div>

              {/* Room Schedule Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="py-2 px-3">Room Name</th>
                      <th className="py-2 px-3">Level</th>
                      <th className="py-2 px-3">Dimensions</th>
                      <th className="py-2 px-3 text-right">Floor Area</th>
                      <th className="py-2 px-3 text-right">Net Wall Area</th>
                      <th className="py-2 px-3 text-right">Base RCN</th>
                      <th className="py-2 px-3 text-right">Cost to Cure</th>
                      <th className="py-2 px-3 text-right">Room Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
                    {project.rooms.map((room) => (
                      <tr key={room.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-sans font-semibold text-slate-900">{room.name}</td>
                        <td className="py-2 px-3 font-sans text-slate-600">{room.level}</td>
                        <td className="py-2 px-3 text-slate-600">
                          {room.dimensions.length_ft}' × {room.dimensions.width_ft}' × {room.dimensions.height_ft}'
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-sky-700">{room.floor_area_sqft} SF</td>
                        <td className="py-2 px-3 text-right text-slate-600">{room.net_wall_area_sqft} SF</td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          ${room.cost_rollup.base_replacement_cost.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-amber-700">
                          ${room.cost_rollup.cost_to_cure.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          ${room.cost_rollup.room_total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t border-slate-200 font-mono text-xs font-bold text-slate-900">
                    <tr>
                      <td colSpan={3} className="py-2 px-3 font-sans">
                        Totals ({project.rooms.length} Units)
                      </td>
                      <td className="py-2 px-3 text-right text-sky-800">
                        {project.rooms.reduce((sum, r) => sum + r.floor_area_sqft, 0)} SF
                      </td>
                      <td className="py-2 px-3 text-right">
                        {project.rooms.reduce((sum, r) => sum + r.net_wall_area_sqft, 0)} SF
                      </td>
                      <td className="py-2 px-3 text-right">
                        ${project.rooms.reduce((sum, r) => sum + r.cost_rollup.base_replacement_cost, 0).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-amber-800">
                        ${project.summary.total_cost_to_cure.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-800">
                        ${project.summary.direct_cost_subtotal.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Section 4: Comprehensive Scope of Work & Deficiency Schedule */}
          {includeScopeOfWork && (
            <div className="mb-8 print-page-break">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    4. Scope of Work & Deficiencies Schedule
                  </h2>
                </div>
                <span className="text-xs font-mono text-amber-800 font-semibold">
                  {allDeficiencies.length} Items • Total Cost to Cure: ${project.summary.total_cost_to_cure.toLocaleString()}
                </span>
              </div>

              {allDeficiencies.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-xs">
                  No verified deficiency items or repairs identified. Property condition meets baseline standard.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
                      <tr>
                        <th className="py-2 px-3">Room / Space</th>
                        <th className="py-2 px-3">Trade Category</th>
                        <th className="py-2 px-3">Action</th>
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-3 text-right">Quantity</th>
                        <th className="py-2 px-3 text-right">Unit Price</th>
                        <th className="py-2 px-3 text-right">Total Cost</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {allDeficiencies.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-semibold text-slate-900">{item.roomName}</td>
                          <td className="py-2 px-3 text-slate-600">{item.trade_category}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                                item.action === 'Replace'
                                  ? 'bg-amber-100 text-amber-800'
                                  : item.action === 'Add'
                                  ? 'bg-sky-100 text-sky-800'
                                  : item.action === 'Remove'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {item.action}
                            </span>
                          </td>
                          <td className="py-2 px-3 max-w-xs">{item.description}</td>
                          <td className="py-2 px-3 text-right font-mono font-medium">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            ${item.unit_price.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">
                            ${item.total_cost.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                item.is_verified
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.is_verified ? 'Verified' : 'Estimated'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 border-t border-slate-200 font-mono text-xs font-bold text-slate-900">
                      <tr>
                        <td colSpan={6} className="py-2 px-3 text-right font-sans">
                          Cost-to-Cure Total:
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-amber-800">
                          ${project.summary.total_cost_to_cure.toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Section 5: Multi-Retailer Materials Procurement Bill of Materials */}
          {includeProcurement && (
            <div className="mb-8 print-page-break">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    5. Materials Procurement Bill of Materials (BOM)
                  </h2>
                </div>
                <span className="text-xs text-slate-600 font-medium">
                  Supplier: <strong>{procurementOrder.retailer_name || "Lowe's Pro Supply"}</strong>
                </span>
              </div>

              {/* Retailer Store Details Banner */}
              <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 mb-4 text-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-blue-950 block">{procurementOrder.store_name}</span>
                  <span className="text-blue-800">
                    {procurementOrder.store_address}
                  </span>
                </div>
                <div className="text-right font-mono text-blue-900">
                  <span className="block">Phone: {procurementOrder.store_phone}</span>
                  <span className="text-[10px] text-blue-700 font-sans">Store ID: {procurementOrder.store_id}</span>
                </div>
              </div>

              {procurementOrder.line_items.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-xs">
                  No materials procurement required for the active scope of work.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl mb-3">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
                      <tr>
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3">Product Name</th>
                        <th className="py-2 px-3">Aisle / Bay</th>
                        <th className="py-2 px-3 text-right">Takeoff Qty</th>
                        <th className="py-2 px-3 text-right">Waste %</th>
                        <th className="py-2 px-3 text-right">Order Units</th>
                        <th className="py-2 px-3 text-right">Unit Price</th>
                        <th className="py-2 px-3 text-right">Extended Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 font-mono">
                      {procurementOrder.line_items.map((line) => (
                        <tr key={line.id} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-semibold text-slate-900">{line.sku}</td>
                          <td className="py-2 px-3 font-sans text-slate-800 max-w-xs">{line.product_name}</td>
                          <td className="py-2 px-3 text-sky-800 font-semibold font-sans">
                            {line.aisle} • {line.bay}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">{line.raw_quantity}</td>
                          <td className="py-2 px-3 text-right text-slate-500">+{line.waste_factor_pct}%</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{line.order_units} EA</td>
                          <td className="py-2 px-3 text-right text-slate-600">${line.unit_price.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold text-blue-900">
                            ${line.extended_cost.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 border-t border-slate-200 font-mono text-xs font-bold text-slate-900">
                      <tr>
                        <td colSpan={7} className="py-2 px-3 text-right font-sans">
                          Materials Subtotal:
                        </td>
                        <td className="py-2 px-3 text-right font-bold">
                          ${procurementOrder.subtotal.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={7} className="py-2 px-3 text-right font-sans text-slate-600">
                          Estimated Sales Tax (8.8%):
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          ${procurementOrder.estimated_tax.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="bg-blue-50 text-blue-950">
                        <td colSpan={7} className="py-2 px-3 text-right font-sans font-extrabold">
                          Procurement Order Total:
                        </td>
                        <td className="py-2 px-3 text-right font-extrabold text-sm text-blue-900">
                          ${procurementOrder.total.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Section 6: Cardinal & Defect Photo Inspection Log */}
          {includePhotos && (
            <div className="mb-8 print-page-break">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-purple-600" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    6. Inspection Photos & Directional Compass Log
                  </h2>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {allPhotos.length} Photo{allPhotos.length !== 1 ? 's' : ''} Documented
                </span>
              </div>

              {allPhotos.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-xs">
                  No captured inspection photos in project records.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {allPhotos.map((photo, idx) => (
                    <div
                      key={photo.id || idx}
                      className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 print-avoid-break shadow-sm"
                    >
                      <div className="aspect-video bg-slate-900 relative overflow-hidden flex items-center justify-center">
                        <img
                          src={photo.file_uri}
                          alt={`${photo.roomName} - ${photo.direction}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-black/75 text-white text-[10px] font-mono px-2 py-0.5 rounded backdrop-blur-sm flex items-center gap-1">
                          <Compass className="w-3 h-3 text-sky-400" />
                          <span>{photo.direction} ({photo.azimuth_deg}°)</span>
                        </div>
                      </div>
                      <div className="p-2.5 text-xs">
                        <div className="font-semibold text-slate-900 truncate">{photo.roomName}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {photo.timestamp ? new Date(photo.timestamp).toLocaleString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 7: Certified Inspector Sign-Off & Attestation */}
          <div className="border-t-2 border-slate-300 pt-6 mt-8 print-avoid-break">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              7. Standards Compliance & Attestation
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed mb-6">
              This appraisal inspection and renovation scope report has been prepared according to ANSI Z765-2021
              standards for Single-Family Residential Gross Living Area calculation and National Building Cost Manual
              Craftsman 3-Way Valuation methodologies. All square footage figures represent above-grade finished areas
              with minimum 7-foot ceiling heights unless specifically noted.
            </p>

            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="border-t border-slate-400 pt-2 text-xs">
                <span className="font-bold text-slate-900 block">Inspecting Specialist / Estimator</span>
                <span className="text-slate-500 text-[10px] block mt-0.5">Signature & Credentials</span>
              </div>
              <div className="border-t border-slate-400 pt-2 text-xs">
                <span className="font-bold text-slate-900 block">Reviewing Supervisor / Certified Appraiser</span>
                <span className="text-slate-500 text-[10px] block mt-0.5">Date & Certification No.</span>
              </div>
            </div>

            <div className="mt-8 text-center text-[10px] text-slate-400 font-mono">
              Generated by Vis-Scope Core v1.0 • MeshEngine Spatial Pipeline • Confidential & Proprietary
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
