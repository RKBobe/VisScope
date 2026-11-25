import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FloorLevel, SprocketProject } from '../../types/sprocket';
import {
  Compass,
  X,
  Search,
  Plus,
  Save,
  Printer,
  FileArchive,
  Calculator,
  SlidersHorizontal,
  ShoppingCart,
  Upload,
  Sparkles,
  Building2,
  Layers,
  Home,
  Utensils,
  Bed,
  Bath,
  Warehouse,
  Box,
  CheckCircle2,
  FolderOpen,
  ArrowRight,
  PenTool,
} from 'lucide-react';

export interface QuickActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: SprocketProject;
  savedProjects?: SprocketProject[];
  onSelectProject?: (proj: SprocketProject) => void;
  onCreateNewProject: () => void;
  onSaveManual: () => void | Promise<void>;
  onExportBundle?: () => void;
  onOpenReport: () => void;
  onOpenValuation: () => void;
  onOpenPropertyRecord: () => void;
  onOpenProcurement: () => void;
  onOpenIngestion: () => void;
  onOpenGeminiSettings: () => void;
  onOpenUpgradeModal: () => void;
  currentLevel: FloorLevel;
  onSelectLevel: (lvl: FloorLevel) => void;
  showAnsiBuffer: boolean;
  onToggleAnsiBuffer: () => void;
  sketchMode?: boolean;
  onToggleSketchMode?: () => void;
  onAddRoom: (template: {
    name: string;
    length_ft: number;
    width_ft: number;
    height_ft: number;
    level: FloorLevel;
  }) => void;
  roomsCountPerLevel: Record<FloorLevel, number>;
}

interface ActionItem {
  id: string;
  category: 'Project & Files' | 'Appraisal Tools' | 'Floor Levels' | 'Room Templates';
  title: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  run: () => void;
}

const ROOM_TEMPLATES = [
  { name: 'Living Room', length_ft: 20, width_ft: 16, height_ft: 9, icon: Home },
  { name: 'Kitchen', length_ft: 18, width_ft: 14, height_ft: 9, icon: Utensils },
  { name: 'Bedroom', length_ft: 14, width_ft: 12, height_ft: 9, icon: Bed },
  { name: 'Bathroom', length_ft: 10, width_ft: 8, height_ft: 9, icon: Bath },
  { name: 'Basement Rec', length_ft: 24, width_ft: 18, height_ft: 8, icon: Warehouse },
  { name: 'Custom Room', length_ft: 12, width_ft: 12, height_ft: 9, icon: Box },
];

const FLOOR_LEVELS: FloorLevel[] = ['First Floor', 'Second Floor', 'Basement', 'Attic'];

export const QuickActionsModal: React.FC<QuickActionsModalProps> = ({
  isOpen,
  onClose,
  project,
  savedProjects = [],
  onSelectProject,
  onCreateNewProject,
  onSaveManual,
  onExportBundle,
  onOpenReport,
  onOpenValuation,
  onOpenPropertyRecord,
  onOpenProcurement,
  onOpenIngestion,
  onOpenGeminiSettings,
  onOpenUpgradeModal,
  currentLevel,
  onSelectLevel,
  showAnsiBuffer,
  onToggleAnsiBuffer,
  sketchMode = false,
  onToggleSketchMode,
  onAddRoom,
  roomsCountPerLevel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSavedSuccess(false);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleManualSave = async () => {
    try {
      await onSaveManual();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save project:', err);
    }
  };

  const actionItems: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [
      // 1. Project & Files
      {
        id: 'new-project',
        category: 'Project & Files',
        title: 'New Inspection Project',
        description: 'Choose template (clean appraisal, remodel, casualty) & start a new inspection.',
        icon: Plus,
        iconColor: 'text-sky-400',
        iconBg: 'bg-sky-950/80 border-sky-800/80',
        run: () => {
          onClose();
          onCreateNewProject();
        },
      },
      ...(savedProjects.length > 1
        ? savedProjects
            .filter((p) => p.project_id !== project.project_id)
            .map((p) => ({
              id: `switch-proj-${p.project_id}`,
              category: 'Project & Files' as const,
              title: `Switch to: ${p.name}`,
              description: `Open saved project at ${p.address.street}, ${p.address.city} (${p.gla_sqft} SF).`,
              badge: 'Saved Project',
              badgeColor: 'bg-slate-800 text-sky-300 border-slate-700',
              icon: FolderOpen,
              iconColor: 'text-sky-400',
              iconBg: 'bg-slate-900 border-slate-800',
              run: () => {
                onClose();
                onSelectProject?.(p);
              },
            }))
        : []),
      {
        id: 'save-project',
        category: 'Project & Files',
        title: savedSuccess ? 'Project Saved to Storage!' : 'Save Project to Storage',
        description: 'Persist current rooms, measurements, and appraisal metadata directly to IndexedDB.',
        badge: savedSuccess ? 'Saved' : 'Local DB',
        badgeColor: savedSuccess ? 'bg-emerald-950 text-emerald-300 border-emerald-600' : 'bg-slate-800 text-slate-300 border-slate-700',
        icon: savedSuccess ? CheckCircle2 : Save,
        iconColor: savedSuccess ? 'text-emerald-400' : 'text-slate-300',
        iconBg: savedSuccess ? 'bg-emerald-950 border-emerald-700' : 'bg-slate-800 border-slate-700',
        run: () => {
          handleManualSave();
        },
      },
      {
        id: 'inspection-report',
        category: 'Project & Files',
        title: 'Printable PDF Inspection Report',
        description: 'Generate comprehensive printable inspection report & itemized scope of work.',
        badge: 'Print / PDF',
        badgeColor: 'bg-sky-950 text-sky-300 border-sky-700',
        icon: Printer,
        iconColor: 'text-sky-400',
        iconBg: 'bg-sky-950/80 border-sky-800/80',
        run: () => {
          onClose();
          onOpenReport();
        },
      },
      {
        id: 'export-bundle',
        category: 'Project & Files',
        title: 'Export DataMesh Bundle (.ZIP)',
        description: 'Package vector SVG CAD plans, room photos, and JSON inspection ledger into a ZIP archive.',
        badge: 'CAD / ZIP',
        badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
        icon: FileArchive,
        iconColor: 'text-emerald-400',
        iconBg: 'bg-emerald-950/80 border-emerald-800/80',
        run: () => {
          onClose();
          if (onExportBundle) onExportBundle();
        },
      },

      // 2. Appraisal Tools
      {
        id: 'craftsman-valuation',
        category: 'Appraisal Tools',
        title: 'Craftsman Valuation Calculator',
        description: 'Review direct reconstruction costs, regional cost indices, trade inclusions, and as-is values.',
        badge: 'Valuation',
        badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
        icon: Calculator,
        iconColor: 'text-emerald-400',
        iconBg: 'bg-emerald-950/80 border-emerald-800/80',
        run: () => {
          onClose();
          onOpenValuation();
        },
      },
      {
        id: 'property-record',
        category: 'Appraisal Tools',
        title: 'Property Record & Appraisal Fields',
        description: 'Edit parcel APN, gross living area (GLA), year built, baseline quality & condition classes.',
        badge: 'Metadata',
        badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-700',
        icon: SlidersHorizontal,
        iconColor: 'text-indigo-400',
        iconBg: 'bg-indigo-950/80 border-indigo-800/80',
        run: () => {
          onClose();
          onOpenPropertyRecord();
        },
      },
      {
        id: 'materials-procurement',
        category: 'Appraisal Tools',
        title: "Lowe's Materials Procurement",
        description: 'Generate live contractor pick sheets, SKU maps, and trade material estimates.',
        badge: "Lowe's Pro",
        badgeColor: 'bg-blue-950 text-blue-300 border-blue-700',
        icon: ShoppingCart,
        iconColor: 'text-blue-400',
        iconBg: 'bg-blue-950/80 border-blue-800/80',
        run: () => {
          onClose();
          onOpenProcurement();
        },
      },
      {
        id: 'document-ingestion',
        category: 'Appraisal Tools',
        title: 'Ingest File & Floor Plan',
        description: 'Extract room geometry and parcel data from PDF blueprints, appraisal cards, or sketches.',
        badge: 'OCR & Vision',
        badgeColor: 'bg-sky-950 text-sky-300 border-sky-700',
        icon: Upload,
        iconColor: 'text-sky-400',
        iconBg: 'bg-sky-950/80 border-sky-800/80',
        run: () => {
          onClose();
          onOpenIngestion();
        },
      },
      {
        id: 'gemini-settings',
        category: 'Appraisal Tools',
        title: 'Gemini Multimodal AI Settings',
        description: 'Configure Gemini Vision, voice inspection parsing, and backend AI model proxies.',
        badge: 'AI Vision',
        badgeColor: 'bg-violet-950 text-violet-300 border-violet-700',
        icon: Sparkles,
        iconColor: 'text-violet-400',
        iconBg: 'bg-violet-950/80 border-violet-800/80',
        run: () => {
          onClose();
          onOpenGeminiSettings();
        },
      },
      {
        id: 'subscription-upgrades',
        category: 'Appraisal Tools',
        title: 'Subscription Tiers & Upgrades',
        description: 'Manage Starter, Professional, and Team firm licensing with Stripe checkout.',
        badge: 'Billing',
        badgeColor: 'bg-amber-950 text-amber-300 border-amber-700',
        icon: Building2,
        iconColor: 'text-amber-400',
        iconBg: 'bg-amber-950/80 border-amber-800/80',
        run: () => {
          onClose();
          onOpenUpgradeModal();
        },
      },

      // 3. Floor Levels & Canvas
      ...FLOOR_LEVELS.map((lvl) => ({
        id: `level-${lvl.toLowerCase().replace(' ', '-')}`,
        category: 'Floor Levels' as const,
        title: `Switch to ${lvl}`,
        description: `View and inspect rooms on ${lvl}. Currently contains ${roomsCountPerLevel[lvl] || 0} room(s).`,
        badge: currentLevel === lvl ? 'Active Level' : `${roomsCountPerLevel[lvl] || 0} rooms`,
        badgeColor: currentLevel === lvl ? 'bg-sky-600 text-white border-sky-500' : 'bg-slate-800 text-slate-400 border-slate-700',
        icon: Layers,
        iconColor: currentLevel === lvl ? 'text-sky-400' : 'text-slate-400',
        iconBg: currentLevel === lvl ? 'bg-sky-950/80 border-sky-700' : 'bg-slate-900 border-slate-800',
        run: () => {
          onSelectLevel(lvl);
          onClose();
        },
      })),
      {
        id: 'toggle-ansi-buffer',
        category: 'Floor Levels',
        title: showAnsiBuffer ? 'Hide ANSI Z765 Buffer Overlay' : 'Show ANSI Z765 Buffer Overlay',
        description: 'Toggle the exterior wall perimeter envelope guideline on the 2D vector canvas.',
        badge: showAnsiBuffer ? 'Enabled' : 'Disabled',
        badgeColor: showAnsiBuffer ? 'bg-rose-950 text-rose-300 border-rose-700' : 'bg-slate-800 text-slate-400 border-slate-700',
        icon: Compass,
        iconColor: showAnsiBuffer ? 'text-rose-400' : 'text-slate-400',
        iconBg: showAnsiBuffer ? 'bg-rose-950/70 border-rose-800' : 'bg-slate-900 border-slate-800',
        run: () => {
          onToggleAnsiBuffer();
          onClose();
        },
      },
      ...(onToggleSketchMode
        ? [
            {
              id: 'toggle-sketch-mode',
              category: 'Floor Levels' as const,
              title: sketchMode
                ? 'Exit Wall-by-Wall Sketch Mode'
                : 'Enter Wall-by-Wall Sketch Mode',
              description:
                'Draw custom L-shaped/polygon footprints using keyboard wall lengths, arrow keys, and Pop Points.',
              badge: sketchMode ? 'Active' : 'Sketcher',
              badgeColor: sketchMode
                ? 'bg-cyan-600 text-white border-cyan-500'
                : 'bg-cyan-950 text-cyan-300 border-cyan-700',
              icon: PenTool,
              iconColor: 'text-cyan-400',
              iconBg: 'bg-cyan-950/70 border-cyan-800',
              run: () => {
                onToggleSketchMode();
                onClose();
              },
            },
          ]
        : []),

      // 4. Room Templates
      ...ROOM_TEMPLATES.map((tmpl) => ({
        id: `add-room-${tmpl.name.toLowerCase().replace(' ', '-')}`,
        category: 'Room Templates' as const,
        title: `Add ${tmpl.name} (${tmpl.length_ft}' × ${tmpl.width_ft}')`,
        description: `Place a ${tmpl.length_ft}' × ${tmpl.width_ft}' ${tmpl.name.toLowerCase()} onto the ${currentLevel}.`,
        badge: `${tmpl.length_ft * tmpl.width_ft} SF`,
        badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
        icon: tmpl.icon,
        iconColor: 'text-emerald-400',
        iconBg: 'bg-emerald-950/70 border-emerald-800/70',
        run: () => {
          onAddRoom({
            name: tmpl.name,
            length_ft: tmpl.length_ft,
            width_ft: tmpl.width_ft,
            height_ft: tmpl.height_ft,
            level: currentLevel,
          });
          onClose();
        },
      })),
    ];

    return items;
  }, [
    project,
    savedProjects,
    onSelectProject,
    savedSuccess,
    showAnsiBuffer,
    currentLevel,
    roomsCountPerLevel,
    onClose,
    onCreateNewProject,
    onOpenReport,
    onExportBundle,
    onOpenValuation,
    onOpenPropertyRecord,
    onOpenProcurement,
    onOpenIngestion,
    onOpenGeminiSettings,
    onOpenUpgradeModal,
    onSelectLevel,
    onToggleAnsiBuffer,
    sketchMode,
    onToggleSketchMode,
    onAddRoom,
  ]);

  // Filter actions based on search
  const filteredActions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return actionItems;
    return actionItems.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }, [actionItems, searchQuery]);

  // Group by category
  const groupedActions = useMemo(() => {
    const groups: Record<string, ActionItem[]> = {};
    for (const item of filteredActions) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filteredActions]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-actions-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-emerald-500 p-0.5 shadow-lg flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Compass className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="quick-actions-title" className="text-base font-bold text-white">
                  Vis-Scope Command Center
                </h2>
                <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded-full font-mono font-semibold">
                  {project.name}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direct access to all activatable buttons, modals, floor levels, and CAD actions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Command Center"
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800/80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search actions, tools, exports, levels, or rooms... (e.g. Valuation, Report, Basement)"
              className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Action Grid Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {Object.keys(groupedActions).length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <div className="text-sm font-semibold text-slate-300">
                No matching actions found
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Try searching with different terms like "Valuation", "PDF", "Basement", or "Lowe's".
              </p>
            </div>
          ) : (
            Object.entries(groupedActions).map(([category, items]) => (
              <div key={category} className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/70 pb-1.5">
                  <span>{category}</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {items.length} {items.length === 1 ? 'action' : 'actions'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {items.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.run}
                        className="text-left p-3 rounded-xl bg-slate-950/50 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 flex items-start gap-3 transition group focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <div
                          className={`w-9 h-9 rounded-xl ${item.iconBg} border flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}
                        >
                          <IconComponent className={`w-4 h-4 ${item.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5 mb-0.5">
                            <span className="font-semibold text-xs text-white group-hover:text-sky-300 transition truncate">
                              {item.title}
                            </span>
                            {item.badge && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded border font-mono font-medium shrink-0 ${
                                  item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-sky-400 shrink-0 self-center opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-6 py-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-mono text-[11px] text-slate-400">
              Active Scope: {project.project_type ? project.project_type.replace('_', ' ') : 'Remodel'} • Level: {currentLevel}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 text-[10px]">
              ESC
            </kbd>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActionsModal;
