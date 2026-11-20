import React from 'react';
import {
  SprocketProject,
  RegionalCostIndex,
  TradeCategory,
  ALL_TRADE_CATEGORIES,
  STRUCTURAL_TRADE_CATEGORIES,
} from '../../types/sprocket';
import {
  CRAFTSMAN_27_BASELINE_TABLE,
  COMMON_REGIONAL_INDICES,
  calculateTradeDirectCost,
} from '../../services/math/valuation';
import {
  X,
  Calculator,
  MapPin,
  TrendingUp,
  Hammer,
  Check,
  Building,
} from 'lucide-react';

interface ValuationModalProps {
  project: SprocketProject;
  isOpen: boolean;
  onClose: () => void;
  onSelectCostIndex: (index: RegionalCostIndex) => void;
  onUpdateIncludedTrades?: (trades: TradeCategory[]) => void;
}

export const ValuationModal: React.FC<ValuationModalProps> = ({
  project,
  isOpen,
  onClose,
  onSelectCostIndex,
  onUpdateIncludedTrades,
}) => {
  if (!isOpen) return null;

  const costIndex = project.cost_index;
  const includedTrades = project.included_trade_categories || ALL_TRADE_CATEGORIES;

  const handleToggleTrade = (tradeGroup: TradeCategory) => {
    if (!onUpdateIncludedTrades) return;
    const isCurrentlyIncluded = includedTrades.includes(tradeGroup);
    const nextTrades = isCurrentlyIncluded
      ? includedTrades.filter((t) => t !== tradeGroup)
      : [...includedTrades, tradeGroup];
    onUpdateIncludedTrades(nextTrades);
  };

  const handleSelectAllTrades = () => {
    if (!onUpdateIncludedTrades) return;
    onUpdateIncludedTrades([...ALL_TRADE_CATEGORIES]);
  };

  const handleExcludeStructuralTrades = () => {
    if (!onUpdateIncludedTrades) return;
    const filtered = ALL_TRADE_CATEGORIES.filter(
      (t) => !STRUCTURAL_TRADE_CATEGORIES.includes(t)
    );
    onUpdateIncludedTrades(filtered);
  };

  // Remodel budget figures (distinctly indicated)
  const remodelBudget = project.summary.remodel_total_budget ?? project.summary.total_cost_to_cure;
  const remodelDirect = project.summary.remodel_scope_direct ?? project.summary.total_cost_to_cure;
  const remodelIndirect = project.summary.remodel_scope_indirect ?? Number((remodelDirect * 0.1).toFixed(2));
  const remodelFee = project.summary.remodel_contractor_fee ?? Number(((remodelDirect + remodelIndirect) * 0.15).toFixed(2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Deterministic Craftsman Valuation & Remodel Engine
                <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                  Quality {project.baseline_quality} / Condition {project.baseline_condition}
                </span>
                <span className="text-xs bg-sky-950 text-sky-400 border border-sky-800 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                  {project.project_type ? project.project_type.replace('_', ' ') : 'Remodel'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Full Property Valuation (Cost Approach) with distinct, granular Remodel Scope accounting.
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

        {/* Regional Selector & Trade Filter Quick Presets */}
        <div className="bg-slate-950/80 px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-400" />
            <span className="text-slate-400">Regional Modifier:</span>
            <span className="font-bold text-white">
              {costIndex.city}, {costIndex.state} ({costIndex.zip_code})
            </span>
            <select
              value={costIndex.zip_code}
              onChange={(e) => {
                const selected = COMMON_REGIONAL_INDICES[e.target.value];
                if (selected) onSelectCostIndex(selected);
              }}
              className="bg-slate-800 border border-slate-700 text-xs text-white rounded px-2 py-0.5 focus:border-sky-400 focus:outline-none"
            >
              {!COMMON_REGIONAL_INDICES[costIndex.zip_code] && (
                <option value={costIndex.zip_code}>
                  {costIndex.zip_code} - {costIndex.city}, {costIndex.state} (Custom)
                </option>
              )}
              {Object.values(COMMON_REGIONAL_INDICES).map((idx) => (
                <option key={idx.zip_code} value={idx.zip_code}>
                  {idx.zip_code} - {idx.city}, {idx.state}
                </option>
              ))}
            </select>
          </div>

          {/* Trade Filter Presets */}
          {onUpdateIncludedTrades && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-500 font-mono">Scope Filters:</span>
              <button
                type="button"
                onClick={handleExcludeStructuralTrades}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-medium transition"
                title="Exclude Foundation, Framing, and Excavation from remodel scope"
              >
                Remodel Only (Exclude Structural)
              </button>
              <button
                type="button"
                onClick={handleSelectAllTrades}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-medium transition"
                title="Include all 18 Craftsman direct trades"
              >
                Include All Trades
              </button>
            </div>
          )}
        </div>

        {/* Valuation Banners: As-Is vs Distinct Remodel Budget vs Post-Reno Value */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: As-Is Valuation */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Full Valuation: As-Is Property Basis
            </span>
            <span className="text-2xl font-extrabold text-slate-100 font-mono mt-1">
              ${project.summary.as_is_value.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500 mt-1">
              Pre-remodel baseline property valuation
            </span>
          </div>

          {/* Card 2: DISTINCT REMODEL & RENOVATION BUDGET */}
          <div className="bg-gradient-to-b from-emerald-950/40 to-slate-900 border-2 border-emerald-500/80 rounded-xl p-3.5 flex flex-col justify-between shadow-lg shadow-emerald-950/30">
            <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Hammer className="w-4 h-4 text-emerald-400" />
                Distinct Remodel / Renovation Scope
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0.2 rounded border border-emerald-500/40 font-bold uppercase">
                Active Scope
              </span>
            </span>
            <span className="text-2xl font-black text-emerald-300 font-mono mt-1">
              ${remodelBudget.toLocaleString()}
            </span>
            <span className="text-[11px] text-emerald-400/90 mt-1 flex items-center justify-between">
              <span>Direct scope: ${remodelDirect.toLocaleString()}</span>
              <span>Fee: ${remodelFee.toLocaleString()}</span>
            </span>
          </div>

          {/* Card 3: Post-Renovation Value */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-sky-400 font-bold flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              Full Valuation: Post-Renovation (RCN)
            </span>
            <span className="text-2xl font-extrabold text-sky-300 font-mono mt-1">
              ${project.summary.post_renovation_value.toLocaleString()}
            </span>
            <span className="text-[11px] text-sky-500/80 mt-1">
              Post-remodel Replacement Cost New
            </span>
          </div>
        </div>

        {/* Trade Assemblies Table with Granular Inclusion Toggles */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Craftsman Direct Trade Breakdown & Scope Inclusions
            </span>
            <span className="text-[11px] text-slate-500">
              Click &quot;Scope Status&quot; to include or exclude any category from the remodel scope
            </span>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-2 px-3">Trade Assembly</th>
                <th className="py-2 px-3">Scope Status</th>
                <th className="py-2 px-3 text-right">Base Materials</th>
                <th className="py-2 px-3 text-right">Base Labor</th>
                <th className="py-2 px-3 text-right">Base Equip</th>
                <th className="py-2 px-3 text-right">Total Base</th>
                <th className="py-2 px-3 text-right text-emerald-400 font-bold">
                  Regional Cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {CRAFTSMAN_27_BASELINE_TABLE.map((assembly, idx) => {
                const isIncluded = includedTrades.includes(assembly.trade_group);
                const isStructural = STRUCTURAL_TRADE_CATEGORIES.includes(assembly.trade_group);
                const regionalDirect = calculateTradeDirectCost(assembly, costIndex);

                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isIncluded
                        ? 'hover:bg-slate-800/40 text-slate-200'
                        : 'bg-slate-950/40 text-slate-500 opacity-60'
                    }`}
                  >
                    <td className="py-2 px-3 font-sans font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span>{assembly.category}</span>
                        {isStructural && (
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded font-mono">
                            Structural
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      {onUpdateIncludedTrades ? (
                        <button
                          type="button"
                          onClick={() => handleToggleTrade(assembly.trade_group)}
                          className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase transition flex items-center gap-1 border ${
                            isIncluded
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60 hover:bg-emerald-900'
                              : 'bg-slate-900 text-slate-500 border-slate-700 hover:text-slate-300'
                          }`}
                        >
                          {isIncluded ? (
                            <>
                              <Check className="w-2.5 h-2.5" />
                              <span>In Scope</span>
                            </>
                          ) : (
                            <span>Excluded</span>
                          )}
                        </button>
                      ) : (
                        <span
                          className={`text-[10px] font-sans font-bold uppercase ${
                            isIncluded ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          {isIncluded ? 'In Scope' : 'Excluded'}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      ${assembly.base_material.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right">
                      ${assembly.base_labor.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right">
                      ${assembly.base_equipment.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300">
                      ${assembly.total_base.toLocaleString()}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-bold ${
                        isIncluded ? 'text-emerald-400' : 'text-slate-600 line-through'
                      }`}
                    >
                      ${regionalDirect.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Footer / Distinct Remodel vs Full Breakdown */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">
              Remodel Direct Work
            </span>
            <span className="text-sm font-bold text-white mt-0.5 block font-mono">
              ${remodelDirect.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
              Remodel Indirect (10%)
            </span>
            <span className="text-sm font-bold text-slate-300 mt-0.5 block font-mono">
              ${remodelIndirect.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
              Contractor Fee (15%)
            </span>
            <span className="text-sm font-bold text-slate-300 mt-0.5 block font-mono">
              ${remodelFee.toLocaleString()}
            </span>
          </div>

          <div className="bg-emerald-950/50 p-2.5 rounded-xl border border-emerald-500/70">
            <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold block flex items-center gap-1">
              <Hammer className="w-3 h-3" />
              Total Remodel Scope
            </span>
            <span className="text-sm font-black text-emerald-300 mt-0.5 block font-mono">
              ${remodelBudget.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block flex items-center gap-1">
              <Building className="w-3 h-3 text-slate-400" />
              Full Structure RCN
            </span>
            <span className="text-sm font-bold text-slate-200 mt-0.5 block font-mono">
              ${project.summary.post_renovation_value.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
