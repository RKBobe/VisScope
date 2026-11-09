import React, { useState } from 'react';
import { FloorLevel } from '../../types/sprocket';
import {
  Plus,
  Home,
  Utensils,
  Bed,
  Bath,
  Warehouse,
  Box,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';

interface RoomPaletteProps {
  currentLevel: FloorLevel;
  onSelectLevel: (level: FloorLevel) => void;
  onAddRoom: (template: {
    name: string;
    length_ft: number;
    width_ft: number;
    height_ft: number;
    level: FloorLevel;
  }) => void;
  roomsCountPerLevel: Record<FloorLevel, number>;
}

const TEMPLATES = [
  { name: 'Living Room', length_ft: 20, width_ft: 16, height_ft: 9, icon: Home },
  { name: 'Kitchen', length_ft: 18, width_ft: 14, height_ft: 9, icon: Utensils },
  { name: 'Bedroom', length_ft: 14, width_ft: 12, height_ft: 9, icon: Bed },
  { name: 'Bathroom', length_ft: 10, width_ft: 8, height_ft: 9, icon: Bath },
  { name: 'Basement Rec', length_ft: 24, width_ft: 18, height_ft: 8, icon: Warehouse },
  { name: 'Custom Room', length_ft: 12, width_ft: 12, height_ft: 9, icon: Box },
];

export const RoomPalette: React.FC<RoomPaletteProps> = ({
  currentLevel,
  onSelectLevel,
  onAddRoom,
  roomsCountPerLevel,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Left-Side Custom Rooms Palette */}
      <div className="absolute top-4 left-4 z-20 select-none">
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200">
          {/* Header Bar */}
          <div className="px-3 py-2.5 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-sky-400" />
              {!isCollapsed && (
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Rooms Menu
                </span>
              )}
            </div>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-700 rounded transition"
              title={isCollapsed ? 'Expand Rooms Menu' : 'Collapse Rooms Menu'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Room Templates List */}
          <div className="p-2 flex flex-col gap-1.5 max-h-[70vh] overflow-y-auto">
            {TEMPLATES.map((tmpl, idx) => {
              const Icon = tmpl.icon;
              return (
                <button
                  key={idx}
                  onClick={() =>
                    onAddRoom({
                      name: tmpl.name,
                      length_ft: tmpl.length_ft,
                      width_ft: tmpl.width_ft,
                      height_ft: tmpl.height_ft,
                      level: currentLevel,
                    })
                  }
                  className={`bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/70 rounded-xl transition flex items-center active:scale-95 group ${
                    isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2 gap-2.5 justify-between'
                  }`}
                  title={`${tmpl.name} (${tmpl.length_ft}' × ${tmpl.width_ft}')`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-sky-400 group-hover:text-sky-300 shrink-0" />
                    {!isCollapsed && (
                      <span className="text-xs font-semibold whitespace-nowrap">
                        {tmpl.name}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700/60 ml-2">
                      {tmpl.length_ft}'×{tmpl.width_ft}'
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Center Floor Level Tabs */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 select-none">
        <div className="bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-xl p-1 flex items-center gap-1 shadow-2xl">
          <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 border-r border-slate-800 mr-1">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Level:</span>
          </div>
          {(['First Floor', 'Second Floor', 'Basement'] as FloorLevel[]).map((level) => {
            const isActive = currentLevel === level;
            const count = roomsCountPerLevel[level] || 0;
            return (
              <button
                key={level}
                onClick={() => onSelectLevel(level)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{level}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-sky-800 text-sky-200' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
