import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  SprocketProject,
  RoomNode,
  Point2D,
  FloorLevel,
  RegionalCostIndex,
  IngestionGeometryMode,
  PropertyMetadata,
  QualityClass,
  ConditionClass,
  RetailerConnectionConfig,
} from './types/sprocket';
import {
  loadSavedProject,
  saveProject,
  createInitialProject,
  listSavedProjects,
  createBlankProject,
  deleteProjectFromStore,
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
  resolveRegionalCostIndex,
  getAdjustedUnitPrice,
} from './services/math/valuation';
import { applyIngestionToProject } from './services/ingestion/documentIngestor';
import { IngestionResult } from './services/ingestion/types';
import {
  GeminiConnectionConfig,
  checkServerGeminiEnvStatus,
  getCachedGeminiConfig,
  isGeminiConfigured,
  loadGeminiConfig,
  saveGeminiConfig,
} from './services/ai/geminiClient';
import { Header } from './components/layout/Header';
import { RoomPalette } from './components/layout/RoomPalette';
import { VectorCanvas } from './components/canvas/VectorCanvas';
import { RoomInspectionDrawer } from './components/inspection/RoomInspectionDrawer';
import { ValuationModal } from './components/modals/ValuationModal';
import { LowesProcurementModal } from './components/modals/LowesProcurementModal';
import { DocumentIngestionModal } from './components/modals/DocumentIngestionModal';
import { PropertyRecordModal } from './components/modals/PropertyRecordModal';
import { GeminiSettingsModal } from './components/modals/GeminiSettingsModal';
import { InspectionReportModal } from './components/modals/InspectionReportModal';
import { SubscriptionUpgradeModal } from './components/modals/SubscriptionUpgradeModal';
import { SubscriptionProvider } from './context/SubscriptionContext';

const AppContent: React.FC = () => {
  const [project, setProject] = useState<SprocketProject>(createInitialProject());
  const [savedProjects, setSavedProjects] = useState<SprocketProject[]>([]);
  const [geminiConfig, setGeminiConfig] = useState<GeminiConnectionConfig>(() =>
    getCachedGeminiConfig()
  );
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<FloorLevel>('First Floor');
  const [showAnsiBuffer, setShowAnsiBuffer] = useState<boolean>(true);

  // Modals state
  const [isValuationOpen, setIsValuationOpen] = useState(false);
  const [isProcurementOpen, setIsProcurementOpen] = useState(false);
  const [isIngestionOpen, setIsIngestionOpen] = useState(false);
  const [isPropertyRecordOpen, setIsPropertyRecordOpen] = useState(false);
  const [isGeminiSettingsOpen, setIsGeminiSettingsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Initial load from IndexedDB & server .env proxy check
  useEffect(() => {
    loadSavedProject().then((loaded) => {
      setProject(loaded);
      listSavedProjects().then(setSavedProjects);
    });
    loadGeminiConfig().then(async (loadedConfig) => {
      await checkServerGeminiEnvStatus(loadedConfig.proxyUrl || '/api/gemini');
      setGeminiConfig(getCachedGeminiConfig());
    });
  }, []);

  // Save to IndexedDB whenever project updates
  useEffect(() => {
    saveProject(project).then(() => {
      listSavedProjects().then(setSavedProjects);
    });
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
      Attic: 0,
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
      const indexChanged =
        costIndex.zip_code !== project.cost_index.zip_code ||
        costIndex.material_modifier !== project.cost_index.material_modifier ||
        costIndex.labor_modifier !== project.cost_index.labor_modifier ||
        costIndex.equipment_modifier !== project.cost_index.equipment_modifier;

      const updatedRooms = rooms.map((room) => {
        const prevRoom = project.rooms.find((pr) => pr.id === room.id);
        const dimensionsChanged =
          !prevRoom ||
          prevRoom.dimensions.length_ft !== room.dimensions.length_ft ||
          prevRoom.dimensions.width_ft !== room.dimensions.width_ft ||
          prevRoom.polygon_points !== room.polygon_points;

        const floor_area_sqft =
          room.ingested_from_source && !dimensionsChanged && room.floor_area_sqft > 0
            ? room.floor_area_sqft
            : calculateRoomFloorArea(room.dimensions, room.polygon_points);

        const wallAreas = calculateWallAreas(room.dimensions, room.openings);

        const updatedDeficiencies = indexChanged
          ? room.deficiencies.map((def) => {
              if (def.action === 'Keep') {
                return { ...def, unit_price: 0, total_cost: 0 };
              }
              const unit_price = getAdjustedUnitPrice(def.trade_category, def.unit, costIndex);
              const total_cost = Number((def.quantity * unit_price).toFixed(2));
              return { ...def, unit_price, total_cost };
            })
          : room.deficiencies;

        const cost_rollup = calculateRoomCostRollup(
          floor_area_sqft,
          room.quality_class,
          room.condition_class,
          updatedDeficiencies,
          costIndex
        );

        return {
          ...room,
          deficiencies: updatedDeficiencies,
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

  // Update room position on canvas (and keep ANSI GLA synced)
  const handleUpdateRoomPosition = (roomId: string, newPos: Point2D) => {
    setProject((prev) => {
      const updated = prev.rooms.map((r) =>
        r.id === roomId ? { ...r, canvas_position: newPos } : r
      );
      const ansi = calculateAnsiZ765GLA(updated, 6);
      return {
        ...prev,
        rooms: updated,
        gla_sqft: ansi.ansi_gla_sqft,
        updated_at: new Date().toISOString(),
      };
    });
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

  // Switch saved project
  const handleSelectProject = (selected: SprocketProject) => {
    setProject(selected);
    setActiveRoomId(null);
    setCurrentLevel('First Floor');
  };

  // Create new blank project in multi-project IndexedDB store
  const handleCreateNewProject = () => {
    const next = createBlankProject(`Inspection #${savedProjects.length + 1}`);
    setProject(next);
    setActiveRoomId(null);
    setCurrentLevel('First Floor');
  };

  // Delete project from IndexedDB store
  const handleDeleteProject = async (projectId: string) => {
    const remaining = await deleteProjectFromStore(projectId);
    setSavedProjects(remaining);
    if (projectId === project.project_id && remaining[0]) {
      setProject(remaining[0]);
      setActiveRoomId(null);
      setCurrentLevel('First Floor');
    }
  };

  // Persist user's chosen supply retailer configuration on active project
  const handleUpdateSupplyRetailer = (config: RetailerConnectionConfig) => {
    setProject((prev) => ({
      ...prev,
      supply_retailer: config,
      updated_at: new Date().toISOString(),
    }));
  };

  // Apply ingested document to project state
  const handleApplyIngestion = (result: IngestionResult, mode: IngestionGeometryMode) => {
    const nextProject = applyIngestionToProject(project, result, mode);
    setProject(nextProject);
    setCurrentLevel('First Floor');
    setActiveRoomId(null);
  };

  // Update project address, property metadata, and baseline quality/condition from PropertyRecordModal
  const handleUpdateProjectMetadata = (
    updatedAddress: SprocketProject['address'],
    updatedMetadata: PropertyMetadata,
    baselineQuality: QualityClass,
    baselineCondition: ConditionClass
  ) => {
    const nextCostIndex = resolveRegionalCostIndex(
      updatedAddress.zip,
      updatedAddress.city,
      updatedAddress.state
    );
    const updatedRooms = project.rooms.map((r) =>
      r.is_class_overridden
        ? r
        : {
            ...r,
            quality_class: baselineQuality,
            condition_class: baselineCondition,
          }
    );
    const recomputed = recomputeProject(updatedRooms, nextCostIndex);
    setProject({
      ...recomputed,
      address: updatedAddress,
      property_metadata: updatedMetadata,
      baseline_quality: baselineQuality,
      baseline_condition: baselineCondition,
    });
  };

  const handleSaveGeminiConfig = async (nextConfig: GeminiConnectionConfig) => {
    setGeminiConfig(nextConfig);
    await saveGeminiConfig(nextConfig);
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[#090d16] text-slate-100 overflow-hidden font-sans print:h-auto print:w-auto print:overflow-visible print:bg-white">
      {/* Top Header */}
      <div className="print:hidden">
        <Header
          project={project}
          savedProjects={savedProjects}
          geminiConfigured={isGeminiConfigured(geminiConfig)}
          onOpenGeminiSettings={() => setIsGeminiSettingsOpen(true)}
          onSelectProject={handleSelectProject}
          onCreateNewProject={handleCreateNewProject}
          onDeleteProject={handleDeleteProject}
          onOpenValuation={() => setIsValuationOpen(true)}
          onOpenProcurement={() => setIsProcurementOpen(true)}
          onOpenIngestion={() => setIsIngestionOpen(true)}
          onOpenPropertyRecord={() => setIsPropertyRecordOpen(true)}
          onOpenReport={() => setIsReportOpen(true)}
          onSaveManual={() => saveProject(project)}
        />
      </div>

      {/* Main Vector Canvas Workspace */}
      <main className="relative flex-1 w-full h-full overflow-hidden print:hidden">
        <VectorCanvas
          rooms={currentLevelRooms}
          activeRoomId={activeRoomId}
          onSelectRoom={(id) => setActiveRoomId(id)}
          onUpdateRoomPosition={handleUpdateRoomPosition}
          onUpdateRoomDimensions={handleUpdateRoomDimensions}
          onDeleteRoom={handleDeleteRoom}
          showAnsiBuffer={showAnsiBuffer}
          onToggleAnsiBuffer={() => setShowAnsiBuffer(!showAnsiBuffer)}
          blueprintUnderlayUri={project.property_metadata?.blueprint_underlay_data_uri}
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
      <div className="print:hidden">
        <RoomInspectionDrawer
          room={activeRoom}
          costIndex={project.cost_index}
          baselineQuality={project.baseline_quality}
          baselineCondition={project.baseline_condition}
          onClose={() => setActiveRoomId(null)}
          onUpdateRoom={handleUpdateRoom}
          onDeleteRoom={handleDeleteRoom}
        />
      </div>

      {/* Craftsman Valuation Modal */}
      <ValuationModal
        project={project}
        isOpen={isValuationOpen}
        onClose={() => setIsValuationOpen(false)}
        onSelectCostIndex={handleSelectCostIndex}
      />

      {/* Materials Supply Pro Procurement Modal */}
      <LowesProcurementModal
        project={project}
        isOpen={isProcurementOpen}
        onClose={() => setIsProcurementOpen(false)}
        onUpdateSupplyRetailer={handleUpdateSupplyRetailer}
      />

      {/* Document Ingestion & Prepopulation Modal */}
      <DocumentIngestionModal
        isOpen={isIngestionOpen}
        onClose={() => setIsIngestionOpen(false)}
        onApplyIngestion={handleApplyIngestion}
      />

      {/* Property Record & Appraisal Data Fields Modal */}
      <PropertyRecordModal
        project={project}
        isOpen={isPropertyRecordOpen}
        onClose={() => setIsPropertyRecordOpen(false)}
        onUpdateProjectMetadata={handleUpdateProjectMetadata}
      />

      {/* Gemini Multimodal AI Adapter Settings Modal */}
      <GeminiSettingsModal
        isOpen={isGeminiSettingsOpen}
        onClose={() => setIsGeminiSettingsOpen(false)}
        config={geminiConfig}
        onSaveConfig={handleSaveGeminiConfig}
      />

      {/* Printable PDF Property Inspection & Scope of Work Report Modal */}
      <InspectionReportModal
        project={project}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />

      {/* Subscription Tiers & Upgrade Modal */}
      <SubscriptionUpgradeModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <SubscriptionProvider>
      <AppContent />
    </SubscriptionProvider>
  );
};

export default App;
