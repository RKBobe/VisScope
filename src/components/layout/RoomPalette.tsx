import React from 'react';
import { FloorLevel } from '../../types/sprocket';
import { Plus, Home, Utensils, Bed, Bath, Warehouse, Box } from 'lucide-react';

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
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 select-none">
      {/* Floor Level Selector Tabs */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-xl p-1 flex items-center gap-1 shadow-2xl">
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

      {/* Room Template Badges */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-2xl p-1.5 flex items-center gap-1.5 shadow-2xl overflow-x-auto max-w-[92vw]">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 flex items-center gap-1">
          <Plus className="w-3 h-3 text-sky-400" />
          Add Room:
        </span>
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
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition active:scale-95"
            >
              <Icon className="w-3.5 h-3.5 text-sky-400" />
              <span>{tmpl.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {tmpl.length_ft}'×{tmpl.width_ft}'
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
