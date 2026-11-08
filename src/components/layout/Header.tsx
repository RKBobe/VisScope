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
} from 'lucide-react';

interface HeaderProps {
  project: SprocketProject;
  onOpenValuation: () => void;
  onOpenProcurement: () => void;
  onSaveManual: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  onOpenValuation,
  onOpenProcurement,
  onSaveManual,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

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
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-wide text-white">
                DataMesh <span className="text-sky-400 font-light">Sprocket</span>
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded border border-slate-700 font-mono">
                Core v1.0
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Home className="w-3 h-3 text-slate-500" />
              <span>{project.address.street}, {project.address.city}, {project.address.state} {project.address.zip}</span>
            </div>
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
          onClick={onSaveManual}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          title="Save Project to IndexedDB"
        >
          <Save className="w-4 h-4" />
        </button>

        {/* Craftsman Valuation Modal Trigger */}
        <button
          onClick={onOpenValuation}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <Calculator className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Craftsman</span> Valuation
        </button>

        {/* Lowe's B2B Procurement Trigger */}
        <button
          onClick={onOpenProcurement}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <ShoppingCart className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Lowe's</span> B2B Order
        </button>

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
