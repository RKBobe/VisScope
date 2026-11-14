import React, { useState, useRef } from 'react';
import { IngestionGeometryMode } from '../../types/sprocket';
import {
  getBuiltInSampleIngestion,
  ingestDocumentFile,
} from '../../services/ingestion/documentIngestor';
import { IngestionResult } from '../../services/ingestion/types';
import {
  X,
  Upload,
  FileText,
  Layers,
  CheckCircle2,
  Building2,
  MapPin,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Box,
} from 'lucide-react';

interface DocumentIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyIngestion: (result: IngestionResult, mode: IngestionGeometryMode) => void;
}

export const DocumentIngestionModal: React.FC<DocumentIngestionModalProps> = ({
  isOpen,
  onClose,
  onApplyIngestion,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IngestionResult | null>(null);
  const [selectedMode, setSelectedMode] = useState<IngestionGeometryMode>('exterior_footprint_only');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      setError(null);
      const parsed = await ingestDocumentFile(file);
      setResult(parsed);
      setSelectedMode(parsed.recommended_mode);
    } catch (err: any) {
      setError(err?.message || 'Failed to parse document');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSample = (
    sampleId: 'johnson_county_prc' | 'jackson_county_prc' | 'truman_courthouse_cad'
  ) => {
    setError(null);
    const parsed = getBuiltInSampleIngestion(sampleId);
    setResult(parsed);
    setSelectedMode(parsed.recommended_mode);
  };

  const activePreviewRooms = result
    ? selectedMode === 'clear_interior_rooms' && result.interior_rooms.length > 0
      ? result.interior_rooms
      : result.exterior_footprint_rooms
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Document Ingestion & Editor Prepopulation
                <span className="text-[11px] bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded-full font-mono">
                  Tiered Footprint / Interior Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ingest County PRCs (Johnson Co CARDS, Jackson Co PrintDatalet), Architectural CAD Floor Plans, or MeshEngine bundles
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Dropzone + Reference Sample Loaders */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Drag & Drop File Upload */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileUpload(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="lg:col-span-5 border-2 border-dashed border-slate-700 hover:border-sky-500 bg-slate-950/60 hover:bg-slate-900/80 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.json,.xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <div className="w-11 h-11 rounded-full bg-sky-950/80 border border-sky-800 flex items-center justify-center text-sky-400 group-hover:scale-105 transition mb-2.5">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white">
                {isProcessing ? 'Extracting Document...' : 'Drop Property PDF, Blueprint, or Image'}
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                Supports County PRCs (.PDF), Architectural CAD Sets (.PDF), Sketches (.PNG/.JPG), or Manifests (.JSON)
              </span>
            </div>

            {/* 1-Click Client Reference Presets */}
            <div className="lg:col-span-7 bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Client Reference Documents (1-Click Test Presets)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Pre-verified against attached PDFs
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  onClick={() => handleLoadSample('johnson_county_prc')}
                  className="text-left p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/60 transition group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
                      Exterior Footprint
                    </span>
                    <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-400" />
                  </div>
                  <div className="text-xs font-bold text-white truncate">
                    Johnson Co. CARDS PRC
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    318 E Park St, Olathe KS
                  </div>
                  <div className="text-[10px] text-sky-400 font-mono mt-1">
                    1,152 SF GLA • Apex Sketch
                  </div>
                </button>

                <button
                  onClick={() => handleLoadSample('jackson_county_prc')}
                  className="text-left p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/60 transition group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
                      Exterior Footprint
                    </span>
                    <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-400" />
                  </div>
                  <div className="text-xs font-bold text-white truncate">
                    Jackson Co. PrintDatalet
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    7001 E 67th St, KCMO 64133
                  </div>
                  <div className="text-[10px] text-sky-400 font-mono mt-1">
                    4,736 SF GLA • 9 Sections
                  </div>
                </button>

                <button
                  onClick={() => handleLoadSample('truman_courthouse_cad')}
                  className="text-left p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/60 transition group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded border border-sky-800">
                      Interior + Footprint
                    </span>
                    <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-400" />
                  </div>
                  <div className="text-xs font-bold text-white truncate">
                    Truman Courthouse CAD
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    102 N Main St, Independence
                  </div>
                  <div className="text-[10px] text-sky-400 font-mono mt-1">
                    15 Rooms / 4 Floor Plates
                  </div>
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-rose-950/50 border border-rose-800 text-rose-300 px-4 py-3 rounded-xl text-xs">
              {error}
            </div>
          )}

          {/* Extracted Preview & Tiered Mode Selector */}
          {result && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Tiered Decision Banner */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">
                      {result.document_label}
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                      {Math.round(result.confidence * 100)}% Confidence
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{result.mode_reasoning}</p>
                </div>

                {/* Mode Switcher */}
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
                  <button
                    onClick={() => setSelectedMode('exterior_footprint_only')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      selectedMode === 'exterior_footprint_only'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>Exterior Footprint ({result.exterior_footprint_rooms.length})</span>
                  </button>
                  <button
                    onClick={() => {
                      if (result.has_clear_interior_rooms) {
                        setSelectedMode('clear_interior_rooms');
                      }
                    }}
                    disabled={!result.has_clear_interior_rooms}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      selectedMode === 'clear_interior_rooms'
                        ? 'bg-sky-600 text-white shadow'
                        : result.has_clear_interior_rooms
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 cursor-not-allowed'
                    }`}
                    title={
                      result.has_clear_interior_rooms
                        ? 'Populate individual interior rooms'
                        : 'Interior room dimensions are not available in this document; using Exterior Footprint'
                    }
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>
                      Clear Interior Rooms ({result.interior_rooms.length})
                    </span>
                  </button>
                </div>
              </div>

              {/* Two-Column Extracted Data + Geometry Table */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Extracted Property & Appraisal Data Fields */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-sky-400" />
                      Extracted Property & Tax Record Fields
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      Ready to Prepopulate
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Property Address</span>
                      <span className="font-semibold text-white">
                        {result.address.street}, {result.address.city}, {result.address.state}{' '}
                        {result.address.zip}
                      </span>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Parcel / Quick Ref</span>
                      <span className="font-mono text-sky-300">
                        {result.metadata.parcel_id || 'N/A'}{' '}
                        {result.metadata.quick_ref_id ? `(${result.metadata.quick_ref_id})` : ''}
                      </span>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Year Built & Style</span>
                      <span className="text-slate-200">
                        {result.metadata.year_built || 'N/A'} •{' '}
                        {result.metadata.architectural_style || 'Standard'}
                      </span>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">
                        Quality & Condition Mapping
                      </span>
                      <span className="text-emerald-300 font-semibold">
                        {result.baseline_quality} ({result.metadata.quality_grade_raw || 'Std'}) /{' '}
                        {result.baseline_condition} ({result.metadata.condition_cdu_raw || 'Avg'})
                      </span>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">
                        Reported Living Area / Rooms
                      </span>
                      <span className="font-mono text-white">
                        {result.metadata.total_living_area_reported_sqft?.toLocaleString() || 'N/A'}{' '}
                        SF
                        {result.metadata.total_rooms_reported
                          ? ` (${result.metadata.total_rooms_reported} Rms / ${result.metadata.bedrooms_reported ?? 0} BR / ${result.metadata.full_baths_reported ?? 0} BA)`
                          : ''}
                      </span>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">
                        Appraised / Market Total
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {result.metadata.appraised_total_value
                          ? `$${result.metadata.appraised_total_value.toLocaleString()}`
                          : result.metadata.rentable_area_reported_sqft
                          ? `${result.metadata.rentable_area_reported_sqft.toLocaleString()} SF Rentable`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded border border-slate-800 col-span-2">
                      <span className="text-[10px] text-slate-500 block">
                        Foundation / Exterior / Roof / HVAC
                      </span>
                      <span className="text-slate-300 text-[11px]">
                        {[
                          result.metadata.foundation_type,
                          result.metadata.exterior_wall_type,
                          result.metadata.roofing_material || result.metadata.roof_type,
                          result.metadata.heating_cooling_description,
                        ]
                          .filter(Boolean)
                          .join(' • ') || 'Standard Assemblies'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Canvas Nodes to Populate */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      Canvas Geometry Prepopulation ({activePreviewRooms.length} Sections)
                    </span>
                    <span className="text-[10px] font-mono text-sky-400">
                      {selectedMode === 'exterior_footprint_only'
                        ? 'Exterior Footprint Mode'
                        : 'Clear Interior Rooms Mode'}
                    </span>
                  </div>

                  <div className="flex-1 max-h-56 overflow-y-auto divide-y divide-slate-800/80 text-xs font-mono">
                    {activePreviewRooms.map((rm) => (
                      <div
                        key={rm.id}
                        className="py-2 px-1.5 flex items-center justify-between hover:bg-slate-900/60"
                      >
                        <div>
                          <div className="font-sans font-semibold text-slate-200 flex items-center gap-1.5">
                            <span>{rm.name}</span>
                            {rm.exclude_from_gla && (
                              <span className="text-[9px] font-mono bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded border border-amber-800">
                                Non-GLA
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">{rm.level}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sky-400 font-bold">
                            {rm.dimensions.length_ft}&apos; × {rm.dimensions.width_ft}&apos;
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {rm.floor_area_sqft.toLocaleString()} SF
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              Rule active: Clear interior data is used when present; otherwise exterior footprints are populated.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              disabled={!result}
              onClick={() => {
                if (result) {
                  onApplyIngestion(result, selectedMode);
                  onClose();
                }
              }}
              className="bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg transition"
            >
              <span>Prepopulate Editor & Data Fields</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
