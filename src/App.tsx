import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  SprocketProject,
  RoomNode,
  Point2D,
  FloorLevel,
  RegionalCostIndex,
} from './types/sprocket';
import {
  loadSavedProject,
  saveProject,
  createInitialProject,
} from './services/storage/projectStore';
import {
  calculateRoomFloorArea,
  calculateWallAreas,
  calculateAnsiZ765GLA,
  calculateGBA,
  snapToGrid,
} from './services/math/geometry';
import {
  calculateRoomCostRollup,
  calculateProjectSummary,
} from './services/math/valuation';
import { Header } from './components/layout/Header';
import { RoomPalette } from './components/layout/RoomPalette';
import { VectorCanvas } from './components/canvas/VectorCanvas';
import { RoomInspectionDrawer } from './components/inspection/RoomInspectionDrawer';
import { ValuationModal } from './components/modals/ValuationModal';
import { LowesProcurementModal } from './components/modals/LowesProcurementModal';

export const App: React.FC = () => {
  const [project, setProject] = useState<SprocketProject>(createInitialProject());
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<FloorLevel>('First Floor');
  const [showAnsiBuffer, setShowAnsiBuffer] = useState<boolean>(true);

  // Modals state
  const [isValuationOpen, setIsValuationOpen] = useState(false);
  const [isProcurementOpen, setIsProcurementOpen] = useState(false);

  // Initial load from IndexedDB
  useEffect(() => {
    loadSavedProject().then((loaded) => {
      setProject(loaded);
    });
  }, []);

  // Save to IndexedDB whenever project updates
  useEffect(() => {
    saveProject(project);
  }, [project]);

  // Active room instance
  const activeRoom = useMemo(() => {
    return project.rooms.find((r) => r.id === activeRoomId) || null;
  }, [project.rooms, activeRoomId]);

  // Filter rooms by current level for canvas rendering
  const currentLevelRooms = useMemo(() => {
    return project.rooms.filter((r) => r.level === currentLevel);
  }, [project.rooms, currentLevel]);

  // Counts of rooms per level for palette badges
  const roomsCountPerLevel = useMemo(() => {
    const counts: Record<FloorLevel, number> = {
      'First Floor': 0,
      'Second Floor': 0,
      Basement: 0,
    };
    for (const r of project.rooms) {
      if (counts[r.level] !== undefined) {
        counts[r.level]++;
      }
    }
    return counts;
  }, [project.rooms]);

  // Helper to re-derive all room-level and project-level rollups
  const recomputeProject = useCallback(
    (rooms: RoomNode[], costIndex: RegionalCostIndex = project.cost_index): SprocketProject => {
      const updatedRooms = rooms.map((room) => {
        const floor_area_sqft = calculateRoomFloorArea(room.dimensions, room.polygon_points);
        const wallAreas = calculateWallAreas(room.dimensions, room.openings);
        const cost_rollup = calculateRoomCostRollup(
          floor_area_sqft,
          room.quality_class,
          room.condition_class,
          room.deficiencies,
          costIndex
        );

        return {
          ...room,
          floor_area_sqft,
          gross_wall_area_sqft: wallAreas.gross_wall_area_sqft,
          net_wall_area_sqft: wallAreas.net_wall_area_sqft,
          cost_rollup,
        };
      });

      const ansi = calculateAnsiZ765GLA(updatedRooms, 6);
      const gba = calculateGBA(updatedRooms);
      const summary = calculateProjectSummary(updatedRooms, costIndex);

      return {
        ...project,
        cost_index: costIndex,
        rooms: updatedRooms,
        gla_sqft: ansi.ansi_gla_sqft,
        gba_sqft: gba,
        summary,
        updated_at: new Date().toISOString(),
      };
    },
    [project]
  );

  // Update room position on canvas
  const handleUpdateRoomPosition = (roomId: string, newPos: Point2D) => {
    const updated = project.rooms.map((r) =>
      r.id === roomId ? { ...r, canvas_position: newPos } : r
    );
    setProject((prev) => ({
      ...prev,
      rooms: updated,
    }));
  };

  // Update room dimensions from canvas resize handle
  const handleUpdateRoomDimensions = (roomId: string, length_ft: number, width_ft: number) => {
    const updated = project.rooms.map((r) =>
      r.id === roomId
        ? {
            ...r,
            dimensions: {
              ...r.dimensions,
              length_ft,
              width_ft,
            },
          }
        : r
    );
    setProject(recomputeProject(updated));
  };

  // Update entire room node from drawer
  const handleUpdateRoom = (updatedRoom: RoomNode) => {
    const updatedRooms = project.rooms.map((r) => (r.id === updatedRoom.id ? updatedRoom : r));
    setProject(recomputeProject(updatedRooms));
  };

  // Delete room
  const handleDeleteRoom = (roomId: string) => {
    const remaining = project.rooms.filter((r) => r.id !== roomId);
    setProject(recomputeProject(remaining));
    if (activeRoomId === roomId) {
      setActiveRoomId(null);
    }
  };

  // Add room template from palette
  const handleAddRoom = (template: {
    name: string;
    length_ft: number;
    width_ft: number;
    height_ft: number;
    level: FloorLevel;
  }) => {
    // Find clean snapped position (default offset based on existing room count)
    const existingOnLevel = project.rooms.filter((r) => r.level === template.level);
    let nextX = 120;
    let nextY = 120;

    if (existingOnLevel.length > 0) {
      const lastRoom = existingOnLevel[existingOnLevel.length - 1];
      nextX = snapToGrid(lastRoom.canvas_position.x + lastRoom.dimensions.length_ft * 12 + 24, 12);
      nextY = snapToGrid(lastRoom.canvas_position.y, 12);

      // Wrap if too far right
      if (nextX > 900) {
        nextX = 120;
        nextY = snapToGrid(lastRoom.canvas_position.y + lastRoom.dimensions.width_ft * 12 + 24, 12);
      }
    }

    const newRoom: RoomNode = {
      id: `room-${Date.now()}`,
      name: `${template.name} ${existingOnLevel.length + 1}`,
      level: template.level,
      dimensions: {
        length_ft: template.length_ft,
        width_ft: template.width_ft,
        height_ft: template.height_ft,
      },
      canvas_position: { x: nextX, y: nextY },
      openings: [],
      floor_area_sqft: template.length_ft * template.width_ft,
      gross_wall_area_sqft: 2 * (template.length_ft + template.width_ft) * template.height_ft,
      net_wall_area_sqft: 2 * (template.length_ft + template.width_ft) * template.height_ft,
      quality_class: project.baseline_quality,
      condition_class: project.baseline_condition,
      is_class_overridden: false,
      voice_transcript: '',
      deficiencies: [],
      photos: [],
      cost_rollup: {
        base_replacement_cost: 0,
        cost_to_cure: 0,
        room_total: 0,
      },
    };

    const updated = [...project.rooms, newRoom];
    setProject(recomputeProject(updated));
    setActiveRoomId(newRoom.id);
  };

  // Switch regional index in valuation modal
  const handleSelectCostIndex = (newIndex: RegionalCostIndex) => {
    setProject(recomputeProject(project.rooms, newIndex));
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[#090d16] text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <Header
        project={project}
        onOpenValuation={() => setIsValuationOpen(true)}
        onOpenProcurement={() => setIsProcurementOpen(true)}
        onSaveManual={() => saveProject(project)}
      />

      {/* Main Vector Canvas Workspace */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <VectorCanvas
          rooms={currentLevelRooms}
          activeRoomId={activeRoomId}
          onSelectRoom={(id) => setActiveRoomId(id)}
          onUpdateRoomPosition={handleUpdateRoomPosition}
          onUpdateRoomDimensions={handleUpdateRoomDimensions}
          onDeleteRoom={handleDeleteRoom}
          showAnsiBuffer={showAnsiBuffer}
          onToggleAnsiBuffer={() => setShowAnsiBuffer(!showAnsiBuffer)}
        />

        {/* Floating Room Template Palette */}
        <RoomPalette
          currentLevel={currentLevel}
          onSelectLevel={(lvl) => {
            setCurrentLevel(lvl);
            setActiveRoomId(null);
          }}
          onAddRoom={handleAddRoom}
          roomsCountPerLevel={roomsCountPerLevel}
        />
      </main>

      {/* Room Inspection Drawer */}
      <RoomInspectionDrawer
        room={activeRoom}
        costIndex={project.cost_index}
        onClose={() => setActiveRoomId(null)}
        onUpdateRoom={handleUpdateRoom}
        onDeleteRoom={handleDeleteRoom}
      />

      {/* Craftsman Valuation Modal */}
      <ValuationModal
        project={project}
        isOpen={isValuationOpen}
        onClose={() => setIsValuationOpen(false)}
        onSelectCostIndex={handleSelectCostIndex}
      />

      {/* Lowe's B2B Pro Procurement Modal */}
      <LowesProcurementModal
        project={project}
        isOpen={isProcurementOpen}
        onClose={() => setIsProcurementOpen(false)}
      />
    </div>
  );
};

export default App;
