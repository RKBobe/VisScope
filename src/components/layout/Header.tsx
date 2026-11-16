import React, { useState } from 'react';
import { SprocketProject } from '../../types/sprocket';
import { createMeshEngineBundle } from '../../services/exporters/bundleSerializer';
import {
  Compass,
  FileArchive,
  Calculator,
  ShoppingCart,
  CheckCircle2,
  Home,
  Save,
  Upload,
  FileSpreadsheet,
  ChevronDown,
  FolderOpen,
  Plus,
  Trash2,
  Sparkles,
  Printer,
} from 'lucide-react';

interface HeaderProps {
  project: SprocketProject;
  savedProjects?: SprocketProject[];
  geminiConfigured?: boolean;
  onOpenGeminiSettings?: () => void;
  onSelectProject?: (proj: SprocketProject) => void;
  onCreateNewProject?: () => void;
  onDeleteProject?: (projectId: string) => void;
  onOpenValuation: () => void;
  onOpenProcurement: () => void;
  onOpenIngestion: () => void;
  onOpenPropertyRecord: () => void;
  onOpenReport?: () => void;
  onSaveManual: () => void | Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  savedProjects = [],
  geminiConfigured = false,
  onOpenGeminiSettings,
  onSelectProject,
  onCreateNewProject,
  onDeleteProject,
  onOpenValuation,
  onOpenProcurement,
  onOpenIngestion,
  onOpenPropertyRecord,
  onOpenReport,
  onSaveManual,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);

  const handleManualSaveClick = async () => {
    await onSaveManual();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleExportMeshEngineBundle = async () => {
    try {
      setIsExporting(true);
      const zipBlob = await createMeshEngineBundle(project);
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `DataMesh_Sprocket_Bundle_${project.project_id}_${project.address.zip}.zip`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to create bundle:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Project Metadata */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-emerald-500 p-0.5 shadow-lg flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Compass className="w-5 h-5 text-sky-400" />
            </div>
          </div>
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-wide text-white">
                DataMesh <span className="text-sky-400 font-light">Sprocket</span>
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded border border-slate-700 font-mono">
                Core v1.0
              </span>
              <button
                type="button"
                onClick={() => setShowProjectMenu(!showProjectMenu)}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 px-2 py-0.5 rounded-lg flex items-center gap-1 font-medium transition max-w-[180px]"
                title="Switch or Create Saved Inspection Projects"
              >
                <FolderOpen className="w-3 h-3 shrink-0" />
                <span className="truncate">{project.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({Math.max(1, savedProjects.length)})
                </span>
                <ChevronDown className="w-3 h-3 shrink-0" />
              </button>
            </div>

            {showProjectMenu && (
              <div className="absolute left-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-3 py-2 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  <span>Saved Inspection Projects</span>
                  {onCreateNewProject && (
                    <button
                      type="button"
                      onClick={() => {
                        onCreateNewProject();
                        setShowProjectMenu(false);
                      }}
                      className="text-[11px] normal-case tracking-normal bg-sky-600 hover:bg-sky-500 text-white px-2 py-0.5 rounded flex items-center gap-1 font-semibold transition"
                    >
                      <Plus className="w-3 h-3" />
                      New Inspection Project
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-800">
                  {(savedProjects.length > 0 ? savedProjects : [project]).map((proj) => {
                    const isActive = proj.project_id === project.project_id;
                    return (
                      <div
                        key={proj.project_id}
                        className={`px-3 py-2 flex items-center justify-between gap-2 text-xs transition ${
                          isActive ? 'bg-sky-950/60' : 'hover:bg-slate-800/70'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProject?.(proj);
                            setShowProjectMenu(false);
                          }}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="font-semibold text-white truncate flex items-center gap-1.5">
                            <span>{proj.name}</span>
                            {isActive && (
                              <span className="text-[9px] bg-sky-600 text-white px-1.5 rounded font-mono">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate font-mono">
                            {proj.address.street}, {proj.address.city} • {proj.gla_sqft} SF
                          </div>
                        </button>
                        {savedProjects.length > 1 && onDeleteProject && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteProject(proj.project_id);
                            }}
                            title="Delete Saved Project"
                            className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onOpenPropertyRecord}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-300 transition text-left"
              title="Edit Property Address & Metadata"
            >
              <Home className="w-3 h-3 text-slate-500" />
              <span>{project.address.street}, {project.address.city}, {project.address.state} {project.address.zip}</span>
              {project.property_metadata?.parcel_id && (
                <span className="text-[10px] font-mono bg-sky-950/80 text-sky-300 border border-sky-800/80 px-1.5 py-0.2 rounded ml-1">
                  PIN: {project.property_metadata.parcel_id}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Live Metrics Tickers */}
        <div className="hidden lg:flex items-center gap-4 pl-4 border-l border-slate-800 font-mono text-xs">
          <div className="bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">ANSI GLA</span>
            <span className="text-sky-400 font-bold">{project.gla_sqft} SF</span>
          </div>

          <div className="bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Total Rooms</span>
            <span className="text-slate-300 font-bold">{project.rooms.length} Units</span>
          </div>

          <div className="bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Direct Cost</span>
            <span className="text-emerald-400 font-bold">
              ${project.summary.direct_cost_subtotal.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-950 px-3 py-1 rounded-lg border border-amber-900/40">
            <span className="text-[10px] text-amber-400 uppercase block">Cost to Cure</span>
            <span className="text-amber-400 font-bold">
              ${project.summary.total_cost_to_cure.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-950 px-3 py-1 rounded-lg border border-emerald-900/40">
            <span className="text-[10px] text-emerald-400 uppercase block">Post-Reno (RCN)</span>
            <span className="text-emerald-300 font-bold">
              ${project.summary.post_renovation_value.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-950 px-3 py-1 rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase block">As-Is Value</span>
            <span className="text-slate-100 font-bold">
              ${project.summary.as_is_value.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleManualSaveClick}
          className={`p-2 rounded-lg transition flex items-center gap-1 text-xs font-semibold ${
            saveSuccess
              ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/70'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title={saveSuccess ? 'Project Saved to IndexedDB!' : 'Save Project to IndexedDB'}
        >
          {saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden xl:inline">Saved!</span>
            </>
          ) : (
            <Save className="w-4 h-4" />
          )}
        </button>

        {/* Document Ingestion Trigger */}
        <button
          onClick={onOpenIngestion}
          className="bg-sky-950/90 hover:bg-sky-900 text-sky-200 border border-sky-700/80 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          title="Ingest Property Record Card, Blueprint PDF, or Image"
        >
          <Upload className="w-3.5 h-3.5 text-sky-400" />
          <span>Ingest File</span>
        </button>

        {/* Property Record Card & Data Fields Trigger */}
        <button
          onClick={onOpenPropertyRecord}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          title="View & Edit Prepopulated Property Data Fields"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Property</span> Fields
        </button>

        {/* Craftsman Valuation Modal Trigger */}
        <button
          onClick={onOpenValuation}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <Calculator className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Craftsman</span> Valuation
        </button>

        {/* Materials Supply Retailer Procurement Trigger */}
        <button
          onClick={onOpenProcurement}
          title={`Materials Supply Order (${project.supply_retailer?.retailer_name || "Lowe's Pro Supply"})`}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <ShoppingCart className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="hidden sm:inline max-w-[140px] truncate">
            {project.supply_retailer?.retailer_name || "Lowe's"}
          </span>{' '}
          Order
        </button>

        {/* Printable PDF Inspection Report Trigger */}
        {onOpenReport && (
          <button
            onClick={onOpenReport}
            title="Generate Printable PDF Property Inspection & Scope of Work Report"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">PDF</span> Report
          </button>
        )}

        {/* Gemini Multimodal AI Settings Trigger */}
        {onOpenGeminiSettings && (
          <button
            onClick={onOpenGeminiSettings}
            title="Configure Gemini Vision & Voice AI Adapter"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
              geminiConfigured
                ? 'bg-violet-950/80 hover:bg-violet-900 text-violet-200 border-violet-700/80'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden md:inline">Gemini AI</span>
            <span
              className={`w-2 h-2 rounded-full ${
                geminiConfigured ? 'bg-emerald-400' : 'bg-slate-600'
              }`}
            />
          </button>
        )}

        {/* MeshEngine Export Drop Bundle */}
        <button
          onClick={handleExportMeshEngineBundle}
          disabled={isExporting}
          className="bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-semibold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-sky-950 transition disabled:opacity-50"
        >
          {isExporting ? (
            <span>Packaging...</span>
          ) : exportSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>Bundle Exported!</span>
            </>
          ) : (
            <>
              <FileArchive className="w-4 h-4" />
              <span>MeshEngine Drop (.ZIP)</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
