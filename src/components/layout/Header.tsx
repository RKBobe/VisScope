import React, { useState, useEffect, useRef } from 'react';
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
  SlidersHorizontal,
  Download,
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
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up any pending timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
    };
  }, []);

  // Conditionally listen for click-outside and escape key only when a menu is open
  useEffect(() => {
    if (!showToolsMenu && !showExportMenu && !showProjectMenu) return;

    const handlePointerDown = (event: PointerEvent | MouseEvent) => {
      const target = event.target as Node;
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(target)) {
        setShowToolsMenu(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(target)) {
        setShowExportMenu(false);
      }
      if (projectMenuRef.current && !projectMenuRef.current.contains(target)) {
        setShowProjectMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowToolsMenu(false);
        setShowExportMenu(false);
        setShowProjectMenu(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showToolsMenu, showExportMenu, showProjectMenu]);

  const handleManualSaveClick = async () => {
    try {
      await onSaveManual();
      setSaveSuccess(true);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Manual save failed:', err);
    }
  };

  const handleExportMeshEngineBundle = async () => {
    let url: string | null = null;
    try {
      setIsExporting(true);
      const zipBlob = await createMeshEngineBundle(project);
      url = URL.createObjectURL(zipBlob);
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
      if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
      exportTimerRef.current = setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to create bundle:', err);
    } finally {
      if (url) {
        URL.revokeObjectURL(url);
      }
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
          <div className="relative" ref={projectMenuRef}>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-wide text-white">
                DataMesh <span className="text-sky-400 font-light">Sprocket</span>
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded border border-slate-700 font-mono">
                Core v1.0
              </span>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={showProjectMenu}
                onClick={() => {
                  setShowProjectMenu(!showProjectMenu);
                  setShowToolsMenu(false);
                  setShowExportMenu(false);
                }}
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
              <div
                role="menu"
                className="absolute left-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden"
              >
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
                          role="menuitem"
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

      {/* Action Buttons Cluster */}
      <div className="flex items-center gap-2">
        {/* Manual Save Button */}
        <button
          onClick={handleManualSaveClick}
          aria-label="Save Project to IndexedDB"
          className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-semibold ${
            saveSuccess
              ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/70'
              : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
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

        {/* Document Ingestion Trigger (Pinned) */}
        <button
          onClick={onOpenIngestion}
          className="bg-sky-950/90 hover:bg-sky-900 text-sky-200 border border-sky-700/80 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          title="Ingest Property Record Card, Blueprint PDF, or Image"
        >
          <Upload className="w-3.5 h-3.5 text-sky-400" />
          <span>Ingest File</span>
        </button>

        {/* Gemini Multimodal AI Settings Trigger (Pinned - Always Visible) */}
        {onOpenGeminiSettings && (
          <button
            onClick={onOpenGeminiSettings}
            title="Configure Gemini Vision & Voice AI Adapter"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
              geminiConfigured
                ? 'bg-violet-950/80 hover:bg-violet-900 text-violet-200 border-violet-700/80 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Gemini AI</span>
            <span
              className={`w-2 h-2 rounded-full ${
                geminiConfigured ? 'bg-emerald-400' : 'bg-slate-600'
              }`}
            />
          </button>
        )}

        {/* Tools Dropdown Menu (Property Fields, Valuation, Materials Order) */}
        <div className="relative" ref={toolsMenuRef}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={showToolsMenu}
            onClick={() => {
              setShowToolsMenu(!showToolsMenu);
              setShowExportMenu(false);
              setShowProjectMenu(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
              showToolsMenu
                ? 'bg-slate-700 text-white border-slate-600 ring-1 ring-sky-500/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Inspection & Estimating Tools"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
            <span>Tools</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${
                showToolsMenu ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showToolsMenu && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800"
            >
              <div className="p-1">
                {/* Property Record Card & Data Fields Trigger */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowToolsMenu(false);
                    onOpenPropertyRecord();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2.5 transition text-xs group"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-950/60 border border-amber-800/60 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-white group-hover:text-amber-300 transition">
                      Property Fields
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      View & edit prepopulated record data
                    </div>
                  </div>
                </button>

                {/* Craftsman Valuation Modal Trigger */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowToolsMenu(false);
                    onOpenValuation();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2.5 transition text-xs group"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center shrink-0">
                    <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-white group-hover:text-emerald-300 transition">
                      Craftsman Valuation
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Replacement cost & depreciation model
                    </div>
                  </div>
                </button>

                {/* Materials Supply Retailer Procurement Trigger */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowToolsMenu(false);
                    onOpenProcurement();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2.5 transition text-xs group"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-950/60 border border-blue-800/60 flex items-center justify-center shrink-0">
                    <ShoppingCart className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-white group-hover:text-blue-300 transition">
                      Materials Order
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {project.supply_retailer?.retailer_name || "Lowe's Pro Supply"} pick sheet
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Export Dropdown Menu (PDF Report & MeshEngine ZIP Bundle) */}
        <div className="relative" ref={exportMenuRef}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={showExportMenu}
            onClick={() => {
              setExportSuccess(false);
              setShowExportMenu(!showExportMenu);
              setShowToolsMenu(false);
              setShowProjectMenu(false);
            }}
            disabled={isExporting}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
              isExporting
                ? 'bg-sky-950/80 text-sky-300 border-sky-700 animate-pulse'
                : exportSuccess
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                : showExportMenu
                ? 'bg-slate-700 text-white border-slate-600 ring-1 ring-sky-500/50'
                : 'bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white border-transparent shadow-lg shadow-sky-950'
            }`}
            title="Export Inspection Reports & Data Bundles"
          >
            {isExporting ? (
              <>
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                <span>Packaging...</span>
              </>
            ) : exportSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Exported!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown
                  className={`w-3 h-3 text-slate-200 transition-transform duration-150 ${
                    showExportMenu ? 'rotate-180' : ''
                  }`}
                />
              </>
            )}
          </button>

          {showExportMenu && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800"
            >
              <div className="p-1">
                {/* Printable PDF Inspection Report Trigger */}
                {onOpenReport && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowExportMenu(false);
                      onOpenReport();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2.5 transition text-xs group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-sky-950/60 border border-sky-800/60 flex items-center justify-center shrink-0">
                      <Printer className="w-3.5 h-3.5 text-sky-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white group-hover:text-sky-300 transition">
                        PDF Inspection Report
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Printable scope of work & defect report
                      </div>
                    </div>
                  </button>
                )}

                {/* MeshEngine Export Drop Bundle */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowExportMenu(false);
                    handleExportMeshEngineBundle();
                  }}
                  disabled={isExporting}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2.5 transition text-xs group disabled:opacity-50"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center shrink-0">
                    <FileArchive className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-white group-hover:text-emerald-300 transition">
                      MeshEngine Drop (.ZIP)
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Complete project bundle & CAD assets
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
