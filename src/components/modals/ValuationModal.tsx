import React from 'react';
import { SprocketProject, RegionalCostIndex } from '../../types/sprocket';
import {
  CRAFTSMAN_27_BASELINE_TABLE,
  COMMON_REGIONAL_INDICES,
  calculateTradeDirectCost,
} from '../../services/math/valuation';
import { X, Calculator, MapPin, TrendingUp, ShieldAlert } from 'lucide-react';

interface ValuationModalProps {
  project: SprocketProject;
  isOpen: boolean;
  onClose: () => void;
  onSelectCostIndex: (index: RegionalCostIndex) => void;
}

export const ValuationModal: React.FC<ValuationModalProps> = ({
  project,
  isOpen,
  onClose,
  onSelectCostIndex,
}) => {
  if (!isOpen) return null;

  const costIndex = project.cost_index;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Deterministic Craftsman Valuation Engine
                <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                  Quality {project.baseline_quality} / Condition {project.baseline_condition}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cost Approach valuation adjusted by National Building Cost Manual standards & regional indices
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

        {/* Regional Selector Bar */}
        <div className="bg-slate-950/80 px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs">
            <MapPin className="w-4 h-4 text-sky-400" />
            <span className="text-slate-400">Active Regional Cost Modifier:</span>
            <span className="font-bold text-white">
              {costIndex.city}, {costIndex.state} ({costIndex.zip_code})
            </span>
            <span className="text-slate-500 font-mono">
              [Mat: {(costIndex.material_modifier * 100).toFixed(1)}%, Lab:{' '}
              {(costIndex.labor_modifier * 100).toFixed(1)}%, Equip:{' '}
              {(costIndex.equipment_modifier * 100).toFixed(1)}%]
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Preset Zip:</span>
            <select
              value={costIndex.zip_code}
              onChange={(e) => {
                const selected = COMMON_REGIONAL_INDICES[e.target.value];
                if (selected) onSelectCostIndex(selected);
              }}
              className="bg-slate-800 border border-slate-700 text-xs text-white rounded px-2.5 py-1 focus:border-sky-400 focus:outline-none"
            >
              {Object.values(COMMON_REGIONAL_INDICES).map((idx) => (
                <option key={idx.zip_code} value={idx.zip_code}>
                  {idx.zip_code} - {idx.city}, {idx.state}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Valuation 3-Way Comparison Banner: As-Is vs Cost-to-Cure vs Post */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              As-Is Valuation Basis
            </span>
            <span className="text-xl font-extrabold text-slate-100 font-mono mt-1">
              ${project.summary.as_is_value.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500 mt-1">
              RCN minus Total Cost-to-Cure
            </span>
          </div>

          <div className="bg-amber-950/20 border border-amber-800/60 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Total Cost to Cure (Renovation)
            </span>
            <span className="text-xl font-extrabold text-amber-400 font-mono mt-1">
              ${project.summary.total_cost_to_cure.toLocaleString()}
            </span>
            <span className="text-[11px] text-amber-500/80 mt-1">
              Direct deficiency & maintenance scope
            </span>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-700/60 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Post-Renovation Value (RCN)
            </span>
            <span className="text-xl font-extrabold text-emerald-300 font-mono mt-1">
              ${project.summary.post_renovation_value.toLocaleString()}
            </span>
            <span className="text-[11px] text-emerald-500/80 mt-1">
              Replacement Cost New (Direct + Indirect + Incentive)
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Trade Assembly</th>
                <th className="py-2.5 px-3 text-right">Base Materials</th>
                <th className="py-2.5 px-3 text-right">Base Labor</th>
                <th className="py-2.5 px-3 text-right">Base Equip</th>
                <th className="py-2.5 px-3 text-right">Total Base</th>
                <th className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                  Regional Direct Cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {CRAFTSMAN_27_BASELINE_TABLE.map((assembly, idx) => {
                const regionalDirect = calculateTradeDirectCost(assembly, costIndex);
                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 font-sans font-semibold text-slate-200">
                      {assembly.category}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      ${assembly.base_material.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      ${assembly.base_labor.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      ${assembly.base_equipment.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300">
                      ${assembly.total_base.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-400 font-bold">
                      ${regionalDirect.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Footer / Rollup Breakdown */}
        <div className="p-4 sm:p-6 bg-slate-950 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
              Direct Cost Subtotal
            </span>
            <span className="text-sm font-bold text-white mt-1 block font-mono">
              ${project.summary.direct_cost_subtotal.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
              Indirect Costs (12%)
            </span>
            <span className="text-sm font-bold text-slate-300 mt-1 block font-mono">
              ${project.summary.indirect_cost_subtotal.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
              Contractor Profit (15%)
            </span>
            <span className="text-sm font-bold text-slate-300 mt-1 block font-mono">
              ${project.summary.contractor_incentive.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-900 p-3 rounded-xl border border-amber-900/60">
            <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              Total Cost to Cure
            </span>
            <span className="text-sm font-bold text-amber-400 mt-1 block font-mono">
              ${project.summary.total_cost_to_cure.toLocaleString()}
            </span>
          </div>

          <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-700/60 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Total Project Cost
            </span>
            <span className="text-base font-extrabold text-emerald-300 mt-0.5 block font-mono">
              ${project.summary.total_project_cost.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
