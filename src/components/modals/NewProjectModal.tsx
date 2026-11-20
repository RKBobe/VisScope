import React, { useState } from 'react';
import {
  InspectionTemplateId,
  TradeCategory,
  ALL_TRADE_CATEGORIES,
  STRUCTURAL_TRADE_CATEGORIES,
  REMODEL_DEFAULT_TRADE_CATEGORIES,
  QualityClass,
  ConditionClass,
} from '../../types/sprocket';
import {
  INSPECTION_TEMPLATES,
  getInspectionTemplate,
  getDefaultTradeCategoriesForTemplate,
} from '../../services/templates/inspectionTemplates';
import {
  X,
  Plus,
  ClipboardList,
  Hammer,
  Flame,
  Droplets,
  Home,
  Tag,
  Building,
  Check,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (options: {
    templateId: InspectionTemplateId;
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    includedTrades: TradeCategory[];
    baselineQuality: QualityClass;
    baselineCondition: ConditionClass;
  }) => void;
  defaultProjectNumber?: number;
}

const TEMPLATE_ICONS: Record<InspectionTemplateId, React.FC<{ className?: string }>> = {
  clean_appraisal: ClipboardList,
  remodel_renovation: Hammer,
  fire_damage: Flame,
  flood_damage: Droplets,
  pre_purchase: Home,
  pre_listing: Tag,
  new_construction: Building,
  custom: SlidersHorizontal,
};

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  defaultProjectNumber = 1,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<InspectionTemplateId>('remodel_renovation');
  const [projectName, setProjectName] = useState(`Inspection #${defaultProjectNumber}`);
  const [street, setStreet] = useState('100 Main St');
  const [city, setCity] = useState('Overland Park');
  const [state, setState] = useState('KS');
  const [zip, setZip] = useState('66212');

  const activeTemplate = getInspectionTemplate(selectedTemplateId);

  const [includedTrades, setIncludedTrades] = useState<TradeCategory[]>(() =>
    getDefaultTradeCategoriesForTemplate('remodel_renovation')
  );
  const [quality, setQuality] = useState<QualityClass>(activeTemplate.default_quality);
  const [condition, setCondition] = useState<ConditionClass>(activeTemplate.default_condition);

  if (!isOpen) return null;

  const handleSelectTemplate = (tplId: InspectionTemplateId) => {
    setSelectedTemplateId(tplId);
    const tpl = getInspectionTemplate(tplId);
    setIncludedTrades(getDefaultTradeCategoriesForTemplate(tplId));
    setQuality(tpl.default_quality);
    setCondition(tpl.default_condition);
    setProjectName(`${tpl.name.split(' (')[0]} #${defaultProjectNumber}`);
  };

  const handleToggleTrade = (trade: TradeCategory) => {
    setIncludedTrades((prev) =>
      prev.includes(trade) ? prev.filter((t) => t !== trade) : [...prev, trade]
    );
  };

  const handleSelectAllTrades = () => {
    setIncludedTrades([...ALL_TRADE_CATEGORIES]);
  };

  const handleSelectRemodelTradesOnly = () => {
    setIncludedTrades([...REMODEL_DEFAULT_TRADE_CATEGORIES]);
  };

  const handleResetTradesToTemplate = () => {
    setIncludedTrades(getDefaultTradeCategoriesForTemplate(selectedTemplateId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateProject({
      templateId: selectedTemplateId,
      name: projectName.trim() || `Inspection #${defaultProjectNumber}`,
      street: street.trim() || '100 Main St',
      city: city.trim() || 'Overland Park',
      state: state.trim() || 'KS',
      zip: zip.trim() || '66212',
      includedTrades,
      baselineQuality: quality,
      baselineCondition: condition,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn select-none"
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 my-8 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          aria-label="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-950 text-sky-400 border border-sky-800">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                New Inspection Project
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select your appraisal purpose, template scope, and customize active cost categories.
              </p>
            </div>
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* 1. Template Selector Cards */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2.5">
              1. Select Project Inspection Template
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {INSPECTION_TEMPLATES.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id;
                const IconComponent = TEMPLATE_ICONS[tpl.id] || ClipboardList;

                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl.id)}
                    className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-b from-sky-950/70 to-slate-900 border-sky-500 shadow-lg shadow-sky-950/40 ring-1 ring-sky-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${tpl.badge_color}`}
                        >
                          {tpl.badge}
                        </span>
                      </div>
                      <div className="font-bold text-xs text-white leading-snug">{tpl.name}</div>
                      <div className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {tpl.description}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>{tpl.default_included_trades.length} active trades</span>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-sky-400 font-bold font-sans">
                          <Check className="w-3 h-3" /> Selected
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Granular Cost Categories / Include-Exclude Customization */}
          <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                  <span>2. Included Cost Categories in Scope ({includedTrades.length} of {ALL_TRADE_CATEGORIES.length})</span>
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Unnecessary structural categories (e.g. foundation, framing) are excluded from remodel scopes by default, but you can customize any trade here.
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={handleSelectRemodelTradesOnly}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-medium transition"
                >
                  Remodel Trades Only
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllTrades}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-medium transition"
                >
                  Include All
                </button>
                <button
                  type="button"
                  onClick={handleResetTradesToTemplate}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            {/* Trade Category Pill Checkboxes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800">
              {ALL_TRADE_CATEGORIES.map((trade) => {
                const isIncluded = includedTrades.includes(trade);
                const isStructural = STRUCTURAL_TRADE_CATEGORIES.includes(trade);

                return (
                  <button
                    key={trade}
                    type="button"
                    onClick={() => handleToggleTrade(trade)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between gap-1.5 transition text-left border ${
                      isIncluded
                        ? 'bg-sky-950/80 text-sky-200 border-sky-600/70 shadow-sm'
                        : 'bg-slate-900/60 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-400'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1">
                      {trade}
                      {isStructural && <span className="text-[9px] text-amber-500/80 font-normal">(Shell)</span>}
                    </span>
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] shrink-0 ${
                        isIncluded ? 'bg-sky-600 text-white font-bold' : 'border border-slate-700'
                      }`}
                    >
                      {isIncluded && <Check className="w-2.5 h-2.5" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Project Name & Address */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2.5">
              3. Project Identity & Location
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Project / File Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Windsor St Remodel"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Street Address</label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="e.g. 7550 Windsor St"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Prairie Village"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="KS"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">ZIP Code</label>
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="66208"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Configured as <strong>{activeTemplate.name}</strong> with {activeTemplate.starter_rooms.length} starter rooms.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-sky-950 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Start Project</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
