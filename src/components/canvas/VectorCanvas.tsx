import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { RoomNode, Point2D, FloorLevel, RoomNodeType } from '../../types/sprocket';
import {
  applyMagneticSnap,
  calculateAnsiZ765GLA,
  calculatePolygonArea,
  snapPointToGrid,
  SnapGuide,
} from '../../services/math/geometry';
import {
  addSketchSegment,
  calculateSegmentLengthFt,
  findNextPopPoint,
  isPointNearStart,
  normalizeSketchToRoomPayload,
  SketchedRoomPayload,
} from '../../services/math/sketchEngine';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Trash2,
  PenTool,
  LayoutGrid,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Undo2,
  Check,
  X,
  Crosshair,
} from 'lucide-react';

interface VectorCanvasProps {
  rooms: RoomNode[];
  activeRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onUpdateRoomPosition: (roomId: string, newPos: Point2D) => void;
  onUpdateRoomDimensions: (roomId: string, length_ft: number, width_ft: number) => void;
  onDeleteRoom: (roomId: string) => void;
  showAnsiBuffer: boolean;
  onToggleAnsiBuffer: () => void;
  blueprintUnderlayUri?: string;
  currentLevel?: FloorLevel;
  sketchMode?: boolean;
  onToggleSketchMode?: (enabled: boolean) => void;
  onCompleteSketch?: (payload: SketchedRoomPayload) => void;
}

export const VectorCanvas: React.FC<VectorCanvasProps> = ({
  rooms,
  activeRoomId,
  onSelectRoom,
  onUpdateRoomPosition,
  onUpdateRoomDimensions,
  onDeleteRoom,
  showAnsiBuffer,
  onToggleAnsiBuffer,
  blueprintUnderlayUri,
  currentLevel = 'First Floor',
  sketchMode: controlledSketchMode,
  onToggleSketchMode,
  onCompleteSketch,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trashZoneRef = useRef<HTMLDivElement>(null);
  const lengthInputRef = useRef<HTMLInputElement>(null);

  // Sketch Mode State (supports controlled or uncontrolled usage)
  const [internalSketchMode, setInternalSketchMode] = useState(false);
  const isSketchMode = controlledSketchMode !== undefined ? controlledSketchMode : internalSketchMode;
  const setSketchMode = useCallback(
    (next: boolean) => {
      if (onToggleSketchMode) {
        onToggleSketchMode(next);
      } else {
        setInternalSketchMode(next);
      }
    },
    [onToggleSketchMode]
  );

  const [sketchPoints, setSketchPoints] = useState<Point2D[]>([]);
  const [sketchLengthInput, setSketchLengthInput] = useState<string>('');
  const [sketchAreaName, setSketchAreaName] = useState<string>('Sketched Area');
  const [sketchNodeType, setSketchNodeType] = useState<RoomNodeType>('interior_room');
  const [sketchStatusMsg, setSketchStatusMsg] = useState<string | null>(null);

  // Canvas Pan & Zoom State
  const [viewBox, setViewBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 800,
    height: 600,
  });

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point2D>({ x: 0, y: 0 });

  // Room Dragging State
  const [draggingRoomId, setDraggingRoomId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point2D>({ x: 0, y: 0 });
  const [activeSnapGuides, setActiveSnapGuides] = useState<SnapGuide[]>([]);
  const [isOverTrash, setIsOverTrash] = useState(false);

  // Room Resizing State
  const [resizingRoomId, setResizingRoomId] = useState<string | null>(null);
  const [resizeHandleType, setResizeHandleType] = useState<'right' | 'bottom' | 'corner' | null>(null);

  const [showGrid, setShowGrid] = useState(true);

  // Convert client screen coordinates to SVG viewBox coordinates (inches)
  const screenToSvgCoords = (clientX: number, clientY: number): Point2D => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const normalizedX = (clientX - rect.left) / rect.width;
    const normalizedY = (clientY - rect.top) / rect.height;

    return {
      x: viewBox.x + normalizedX * viewBox.width,
      y: viewBox.y + normalizedY * viewBox.height,
    };
  };

  // Flash temporary status message in Sketch HUD
  const flashSketchStatus = useCallback((msg: string) => {
    setSketchStatusMsg(msg);
  }, []);

  useEffect(() => {
    if (!sketchStatusMsg) return;
    const t = setTimeout(() => setSketchStatusMsg(null), 2400);
    return () => clearTimeout(t);
  }, [sketchStatusMsg]);

  // Clear sketch points when exiting Sketch Mode
  useEffect(() => {
    if (!isSketchMode) {
      setSketchPoints([]);
      setSketchLengthInput('');
      setSketchStatusMsg(null);
    }
  }, [isSketchMode]);

  const handleCommitSketch = useCallback(
    (pointsToCommit: Point2D[]) => {
      const payload = normalizeSketchToRoomPayload(pointsToCommit, {
        name: sketchAreaName,
        level: currentLevel,
        height_ft: 9,
        node_type: sketchNodeType,
        exclude_from_gla: sketchNodeType === 'accessory_structure',
      });
      if (!payload) {
        flashSketchStatus('Need at least 3 walls forming a closed area.');
        return;
      }
      onCompleteSketch?.(payload);
      setSketchPoints([]);
      setSketchLengthInput('');
      flashSketchStatus(`Added ${payload.name} (${payload.floor_area_sqft} SF)`);
    },
    [sketchAreaName, currentLevel, sketchNodeType, onCompleteSketch, flashSketchStatus]
  );

  const handleDropAnchorAtCenter = useCallback(() => {
    const centerPt = snapPointToGrid(
      {
        x: viewBox.x + viewBox.width / 2,
        y: viewBox.y + viewBox.height / 2,
      },
      12
    );
    setSketchPoints([centerPt]);
    setSketchLengthInput('');
    flashSketchStatus('Anchor placed. Type length + Arrow key (e.g. 20 →)');
    setTimeout(() => lengthInputRef.current?.focus(), 20);
  }, [viewBox, flashSketchStatus]);

  const handleSketchDirection = useCallback(
    (direction: 'right' | 'left' | 'up' | 'down') => {
      if (sketchPoints.length === 0) {
        handleDropAnchorAtCenter();
        return;
      }

      const trimmed = sketchLengthInput.trim();
      if (trimmed.length > 0) {
        const parsedLen = parseFloat(trimmed);
        if (!Number.isFinite(parsedLen) || parsedLen <= 0) {
          flashSketchStatus('Enter a valid positive wall length in feet.');
          return;
        }
        const nextPoints = addSketchSegment(sketchPoints, parsedLen, direction);
        setSketchLengthInput('');
        if (nextPoints.length >= 4 && isPointNearStart(nextPoints, 1)) {
          handleCommitSketch(nextPoints);
        } else {
          setSketchPoints(nextPoints);
        }
      } else {
        // Empty length + Arrow = TOTAL Sketch-style Pop Point snap!
        const pop = findNextPopPoint(sketchPoints, direction, rooms);
        if (!pop) {
          flashSketchStatus(`No pop-point alignment found going ${direction}. Type a length.`);
          return;
        }
        const nextPoints = [...sketchPoints, pop.point];
        flashSketchStatus(`Popped ${pop.length_ft}' → ${pop.alignedWithLabel}`);
        if (nextPoints.length >= 4 && isPointNearStart(nextPoints, 1)) {
          handleCommitSketch(nextPoints);
        } else {
          setSketchPoints(nextPoints);
        }
      }
    },
    [
      sketchPoints,
      sketchLengthInput,
      rooms,
      handleDropAnchorAtCenter,
      handleCommitSketch,
      flashSketchStatus,
    ]
  );

  // Keyboard shortcuts when Sketch Mode is active
  useEffect(() => {
    if (!isSketchMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isNameOrSelectFocused =
        activeEl &&
        (activeEl.id === 'sketch-area-name' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl.tagName === 'INPUT' && activeEl.id !== 'sketch-length-input') ||
          activeEl.tagName === 'TEXTAREA');

      if (isNameOrSelectFocused) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSketchDirection('right');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSketchDirection('left');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleSketchDirection('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleSketchDirection('down');
      } else if (e.key === 'c' || e.key === 'C') {
        if (sketchPoints.length >= 3) {
          e.preventDefault();
          handleCommitSketch(sketchPoints);
        }
      } else if (e.key === 'Backspace') {
        if (sketchLengthInput.length === 0 && sketchPoints.length > 0) {
          e.preventDefault();
          setSketchPoints((prev) => prev.slice(0, -1));
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (sketchPoints.length > 0) {
          setSketchPoints([]);
          setSketchLengthInput('');
          flashSketchStatus('Sketch cleared.');
        } else {
          setSketchMode(false);
        }
      } else if (
        /^[0-9.]$/.test(e.key) &&
        activeEl?.id !== 'sketch-length-input'
      ) {
        e.preventDefault();
        setSketchLengthInput((prev) => (e.key === '.' && prev.includes('.') ? prev : prev + e.key));
        lengthInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isSketchMode,
    sketchPoints,
    sketchLengthInput,
    handleSketchDirection,
    handleCommitSketch,
    flashSketchStatus,
    setSketchMode,
  ]);

  // Canvas Panning & Sketch Anchor Placement Handler
  const handlePointerDownBackground = (e: React.PointerEvent) => {
    const targetEl = e.target as HTMLElement;
    const isBg = targetEl.tagName === 'svg' || targetEl.id === 'canvas-bg';
    if (!isBg) return;

    if (isSketchMode && sketchPoints.length === 0) {
      const rawPt = screenToSvgCoords(e.clientX, e.clientY);
      const snappedPt = snapPointToGrid(rawPt, 12);
      setSketchPoints([snappedPt]);
      setSketchLengthInput('');
      flashSketchStatus('Anchor placed. Type length + Arrow key (e.g. 20 →)');
      setTimeout(() => lengthInputRef.current?.focus(), 20);
      return;
    }

    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    targetEl.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // 1. Handle Canvas Panning
    if (isPanning) {
      const dx = (e.clientX - panStart.x) * (viewBox.width / (containerRef.current?.clientWidth || 800));
      const dy = (e.clientY - panStart.y) * (viewBox.height / (containerRef.current?.clientHeight || 600));

      setViewBox((prev) => ({
        ...prev,
        x: prev.x - dx,
        y: prev.y - dy,
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const svgPos = screenToSvgCoords(e.clientX, e.clientY);

    // 2. Handle Room Dragging
    if (draggingRoomId) {
      // Check collision with Trash Can drop zone
      if (trashZoneRef.current) {
        const rect = trashZoneRef.current.getBoundingClientRect();
        const over = (
          e.clientX >= rect.left - 20 &&
          e.clientX <= rect.right + 20 &&
          e.clientY >= rect.top - 20 &&
          e.clientY <= rect.bottom + 20
        );
        setIsOverTrash(over);
      }

      const room = rooms.find((r) => r.id === draggingRoomId);
      if (!room) return;

      const proposedX = svgPos.x - dragOffset.x;
      const proposedY = svgPos.y - dragOffset.y;

      // Apply magnetic snap against other rooms
      const snapResult = applyMagneticSnap(
        room.id,
        { x: proposedX, y: proposedY },
        room.dimensions,
        rooms,
        14 // 14-inch magnetic threshold
      );

      setActiveSnapGuides(snapResult.guides);
      onUpdateRoomPosition(room.id, snapResult.snappedPosition);
      return;
    }

    // 3. Handle Room Resizing
    if (resizingRoomId && resizeHandleType) {
      const room = rooms.find((r) => r.id === resizingRoomId);
      if (!room) return;

      const currentX = room.canvas_position.x;
      const currentY = room.canvas_position.y;

      let newLengthFt = room.dimensions.length_ft;
      let newWidthFt = room.dimensions.width_ft;

      if (resizeHandleType === 'right' || resizeHandleType === 'corner') {
        const deltaXInches = svgPos.x - currentX;
        // Snap to nearest foot (12 inches), minimum 6 ft
        newLengthFt = Math.max(6, Math.round(deltaXInches / 12));
      }

      if (resizeHandleType === 'bottom' || resizeHandleType === 'corner') {
        const deltaYInches = svgPos.y - currentY;
        // Snap to nearest foot (12 inches), minimum 6 ft
        newWidthFt = Math.max(6, Math.round(deltaYInches / 12));
      }

      if (newLengthFt !== room.dimensions.length_ft || newWidthFt !== room.dimensions.width_ft) {
        onUpdateRoomDimensions(room.id, newLengthFt, newWidthFt);
      }
    }
  };

  const handlePointerUp = () => {
    if (draggingRoomId && isOverTrash) {
      onDeleteRoom(draggingRoomId);
    }
    setIsPanning(false);
    setDraggingRoomId(null);
    setResizingRoomId(null);
    setResizeHandleType(null);
    setActiveSnapGuides([]);
    setIsOverTrash(false);
  };

  // Zoom Helpers
  const handleZoom = (factor: number) => {
    setViewBox((prev) => {
      const newWidth = prev.width * factor;
      const newHeight = prev.height * factor;
      const dx = (newWidth - prev.width) / 2;
      const dy = (newHeight - prev.height) / 2;
      return {
        x: prev.x - dx,
        y: prev.y - dy,
        width: Math.max(200, Math.min(newWidth, 2400)),
        height: Math.max(150, Math.min(newHeight, 1800)),
      };
    });
  };

  const handleResetZoom = () => {
    if (rooms.length === 0) {
      setViewBox({ x: 0, y: 0, width: 800, height: 600 });
      return;
    }
    const minX = Math.min(...rooms.map((r) => r.canvas_position.x)) - 72;
    const minY = Math.min(...rooms.map((r) => r.canvas_position.y)) - 72;
    const maxX = Math.max(...rooms.map((r) => r.canvas_position.x + r.dimensions.length_ft * 12)) + 72;
    const maxY = Math.max(...rooms.map((r) => r.canvas_position.y + r.dimensions.width_ft * 12)) + 72;

    setViewBox({
      x: minX,
      y: minY,
      width: Math.max(600, maxX - minX),
      height: Math.max(450, maxY - minY),
    });
  };

  // Auto-fit viewBox when rooms list changes (e.g. after document ingestion or level switch)
  const roomIdsSignature = useMemo(() => rooms.map((r) => r.id).join('|'), [rooms]);
  useEffect(() => {
    handleResetZoom();
  }, [roomIdsSignature]);

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 0.92 : 1.08;
    handleZoom(factor);
  };

  // Compute ANSI Z765 Outer Shell
  const ansiData = useMemo(() => {
    return calculateAnsiZ765GLA(rooms, 6);
  }, [rooms]);

  // Live area calculation while sketching
  const liveSketchAreaSqFt = useMemo(() => {
    return sketchPoints.length >= 3 ? calculatePolygonArea(sketchPoints) : 0;
  }, [sketchPoints]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#090d16] overflow-hidden select-none touch-none"
      onWheel={handleWheel}
      onPointerDown={handlePointerDownBackground}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Top-Center Canvas Mode Switcher: Room Blocks vs Wall-by-Wall Sketch Mode */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-slate-900/95 backdrop-blur border border-slate-700/80 rounded-xl p-1 shadow-2xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setSketchMode(false)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            !isSketchMode
              ? 'bg-sky-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Standard drag-and-drop room blocks"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Room Blocks</span>
        </button>
        <button
          type="button"
          onClick={() => setSketchMode(true)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            isSketchMode
              ? 'bg-cyan-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="TOTAL Sketch-style keyboard wall-by-wall drawing (type length + Arrow key)"
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Sketch Mode</span>
        </button>
      </div>

      {/* Floating Wall-by-Wall Sketch HUD Bar */}
      {isSketchMode && (
        <div
          className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-3xl bg-slate-900/95 backdrop-blur-md border border-cyan-500/50 rounded-2xl p-3 shadow-2xl text-xs"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-wrap items-center gap-2">
            {/* Area Name */}
            <input
              id="sketch-area-name"
              type="text"
              value={sketchAreaName}
              onChange={(e) => setSketchAreaName(e.target.value)}
              placeholder="Area Name"
              className="w-32 sm:w-36 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-cyan-400 focus:outline-none"
              aria-label="Sketch Area Name"
            />

            {/* Area Type / GLA Classification */}
            <select
              value={sketchNodeType}
              onChange={(e) => setSketchNodeType(e.target.value as RoomNodeType)}
              aria-label="Sketch Area Classification"
              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 text-xs focus:border-cyan-400 focus:outline-none"
            >
              <option value="interior_room">Interior (GLA)</option>
              <option value="exterior_footprint">Footprint (GLA)</option>
              <option value="accessory_structure">Accessory (Non-GLA)</option>
            </select>

            {/* Wall Length Input */}
            <div className="relative flex items-center">
              <input
                ref={lengthInputRef}
                id="sketch-length-input"
                type="text"
                inputMode="decimal"
                value={sketchLengthInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*\.?\d*$/.test(val)) {
                    setSketchLengthInput(val);
                  }
                }}
                placeholder="Len (ft)"
                aria-label="Wall Length in Feet"
                className="w-20 bg-slate-950 border border-cyan-600/70 rounded-lg px-2.5 py-1.5 text-cyan-300 font-mono font-bold text-xs focus:border-cyan-400 focus:outline-none"
              />
              <span className="absolute right-2 text-[10px] text-slate-500 font-mono pointer-events-none">
                ft
              </span>
            </div>

            {/* On-Screen Directional Pad (Desktop & Tablet) */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => handleSketchDirection('left')}
                aria-label="Draw Wall Left"
                title="Draw Left (or Pop Point if length empty)"
                className="p-1.5 rounded bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleSketchDirection('up')}
                aria-label="Draw Wall Up"
                title="Draw Up (or Pop Point if length empty)"
                className="p-1.5 rounded bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white transition"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleSketchDirection('down')}
                aria-label="Draw Wall Down"
                title="Draw Down (or Pop Point if length empty)"
                className="p-1.5 rounded bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white transition"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleSketchDirection('right')}
                aria-label="Draw Wall Right"
                title="Draw Right (or Pop Point if length empty)"
                className="p-1.5 rounded bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white transition"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Start Anchor / Undo / Close / Cancel */}
            <div className="flex items-center gap-1.5 ml-auto">
              {sketchPoints.length === 0 ? (
                <button
                  type="button"
                  onClick={handleDropAnchorAtCenter}
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1 transition"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Start Here</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSketchPoints((prev) => prev.slice(0, -1))}
                    title="Undo Last Wall (Backspace)"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    aria-label="Undo Last Wall"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={sketchPoints.length < 3}
                    onClick={() => handleCommitSketch(sketchPoints)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold flex items-center gap-1 transition"
                    title="Close Polygon & Create Area (C)"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Close Area</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSketchPoints([]);
                      setSketchLengthInput('');
                    }}
                    title="Clear Active Sketch (Esc)"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/70 text-slate-400 hover:text-rose-300 transition"
                    aria-label="Clear Sketch"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Live Status / Shortcut Hint Line */}
          <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
            <span className="text-cyan-300 truncate">
              {sketchStatusMsg
                ? sketchStatusMsg
                : sketchPoints.length === 0
                ? 'Click canvas to drop start anchor (or click "Start Here")'
                : 'Type length + Arrow key (e.g. 20 →) • Empty + Arrow = Pop Point • C = Close'}
            </span>
            {sketchPoints.length >= 3 && (
              <span className="text-emerald-400 font-bold shrink-0 ml-2">
                Live: {liveSketchAreaSqFt} SF ({sketchPoints.length} pts)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Floating Toolbar Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-xl p-1.5 shadow-xl">
        <button
          onClick={() => handleZoom(0.85)}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleZoom(1.15)}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
          title="Fit Floor Plan"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
        <div className="w-full h-px bg-slate-800 my-0.5" />
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-2 rounded-lg transition ${
            showGrid ? 'text-sky-400 bg-sky-950/60' : 'text-slate-400 hover:bg-slate-800'
          }`}
          title="Toggle 1-ft Snapping Grid"
        >
          <Grid className="w-5 h-5" />
        </button>
        <button
          onClick={onToggleAnsiBuffer}
          className={`p-2 rounded-lg transition text-xs font-semibold ${
            showAnsiBuffer ? 'text-rose-400 bg-rose-950/60' : 'text-slate-400 hover:bg-slate-800'
          }`}
          title="Toggle ANSI Z765 Exterior Shell Buffer"
        >
          ANSI
        </button>
      </div>

      {/* Drag & Drop Trash Can Target */}
      <div
        ref={trashZoneRef}
        onClick={() => {
          if (activeRoomId) {
            onDeleteRoom(activeRoomId);
          }
        }}
        className={`absolute bottom-4 left-4 z-20 transition-all duration-200 select-none cursor-pointer flex items-center gap-2 rounded-2xl shadow-2xl border ${
          isOverTrash
            ? 'p-4 bg-rose-600 text-white border-rose-300 scale-110 shadow-rose-900/60 ring-4 ring-rose-500/50'
            : draggingRoomId
            ? 'p-3.5 bg-slate-900/95 text-rose-400 border-rose-600/70 shadow-2xl animate-pulse ring-2 ring-rose-500/20'
            : activeRoomId
            ? 'p-2.5 bg-slate-900/90 text-rose-400 border-slate-700/80 hover:border-rose-500/80 hover:bg-rose-950/40 hover:text-rose-300'
            : 'p-2.5 bg-slate-900/70 text-slate-500 border-slate-800/80 hover:border-slate-700 hover:text-slate-300'
        }`}
        title={
          draggingRoomId
            ? 'Drop room here to delete'
            : activeRoomId
            ? 'Click or drag room here to delete'
            : 'Trash Can (drag room here to delete)'
        }
      >
        <Trash2 className={`${draggingRoomId ? 'w-6 h-6' : 'w-5 h-5'} transition-all`} />
        {draggingRoomId && (
          <span className="text-xs font-bold uppercase tracking-wider">
            {isOverTrash ? 'Drop to Delete Room' : 'Drag here to delete'}
          </span>
        )}
        {!draggingRoomId && activeRoomId && (
          <span className="text-xs font-semibold hidden md:inline text-rose-300">
            Delete Selected
          </span>
        )}
      </div>

      {/* Dynamic Measurement Banner */}
      <div className="absolute bottom-4 right-4 z-20 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-xl px-4 py-2 shadow-xl hidden sm:flex items-center gap-4 text-xs font-mono">
        <div>
          <span className="text-slate-400">ANSI GLA: </span>
          <span className="text-sky-400 font-bold">{ansiData.ansi_gla_sqft} SF</span>
        </div>
        <div className="w-px h-4 bg-slate-700" />
        <div>
          <span className="text-slate-400">Interior Sum: </span>
          <span className="text-slate-200">{ansiData.interior_area_sqft} SF</span>
        </div>
        <div className="w-px h-4 bg-slate-700" />
        <div>
          <span className="text-slate-400">Ext. Buffer (+6"): </span>
          <span className="text-rose-400 font-medium">+{ansiData.exterior_wall_buffer_sqft} SF</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        className="w-full h-full cursor-grab active:cursor-grabbing"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      >
        <defs>
          {/* 1-Foot Grid Pattern (12 inches) */}
          <pattern
            id="sprocket-grid-1ft"
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
          >
            <rect width="12" height="12" fill="none" />
            <circle cx="12" cy="12" r="0.6" fill="#334155" />
          </pattern>
          {/* 5-Foot Major Grid Pattern (60 inches) */}
          <pattern
            id="sprocket-grid-5ft"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <rect width="60" height="60" fill="url(#sprocket-grid-1ft)" />
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#1e293b" strokeWidth="0.8" />
          </pattern>
        </defs>

        {/* Background Grid */}
        <rect
          id="canvas-bg"
          x={viewBox.x - 2000}
          y={viewBox.y - 2000}
          width={viewBox.width + 4000}
          height={viewBox.height + 4000}
          fill={showGrid ? 'url(#sprocket-grid-5ft)' : '#090d16'}
        />

        {/* Optional Blueprint / Sketch Underlay Image */}
        {blueprintUnderlayUri && ansiData.exterior_hull_bounds && (
          <image
            href={blueprintUnderlayUri}
            x={ansiData.exterior_hull_bounds.minX - 48}
            y={ansiData.exterior_hull_bounds.minY - 48}
            width={ansiData.exterior_hull_bounds.maxX - ansiData.exterior_hull_bounds.minX + 96}
            height={ansiData.exterior_hull_bounds.maxY - ansiData.exterior_hull_bounds.minY + 96}
            opacity={0.18}
            preserveAspectRatio="xMidYMid meet"
            pointerEvents="none"
          />
        )}

        {/* ANSI Z765 Outer Shell Buffer Visualization */}
        {showAnsiBuffer && ansiData.exterior_hull_bounds && (
          <g id="ansi-hull-layer" pointerEvents="none">
            <rect
              x={ansiData.exterior_hull_bounds.minX}
              y={ansiData.exterior_hull_bounds.minY}
              width={ansiData.exterior_hull_bounds.maxX - ansiData.exterior_hull_bounds.minX}
              height={ansiData.exterior_hull_bounds.maxY - ansiData.exterior_hull_bounds.minY}
              fill="rgba(244, 63, 94, 0.05)"
              stroke="#f43f5e"
              strokeWidth="2"
              strokeDasharray="6,4"
              rx="4"
            />
            <text
              x={ansiData.exterior_hull_bounds.minX + 8}
              y={ansiData.exterior_hull_bounds.minY - 6}
              fill="#f43f5e"
              fontSize="10"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              ANSI Z765 Perimeter Buffer (+6" Exterior Wall)
            </text>
          </g>
        )}

        {/* Real-time Magnetic Snap Guidelines */}
        {activeSnapGuides.map((guide, idx) => (
          <line
            key={`snap-guide-${idx}`}
            x1={guide.axis === 'x' ? guide.position_in : viewBox.x - 1000}
            y1={guide.axis === 'y' ? guide.position_in : viewBox.y - 1000}
            x2={guide.axis === 'x' ? guide.position_in : viewBox.x + viewBox.width + 1000}
            y2={guide.axis === 'y' ? guide.position_in : viewBox.y + viewBox.height + 1000}
            stroke="#ec4899"
            strokeWidth="1.5"
            strokeDasharray="4,4"
            pointerEvents="none"
          />
        ))}

        {/* Room Nodes */}
        {rooms.map((room) => {
          const isSelected = room.id === activeRoomId;
          const isExteriorFootprint = room.node_type === 'exterior_footprint';
          const isAccessory = room.node_type === 'accessory_structure' || room.exclude_from_gla;
          const rx = room.canvas_position.x;
          const ry = room.canvas_position.y;
          const rw = room.dimensions.length_ft * 12;
          const rh = room.dimensions.width_ft * 12;
          const cx = rx + rw / 2;
          const cy = ry + rh / 2;

          return (
            <g
              key={room.id}
              className="cursor-move group"
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelectRoom(room.id);
                setDraggingRoomId(room.id);
                const svgPos = screenToSvgCoords(e.clientX, e.clientY);
                setDragOffset({
                  x: svgPos.x - rx,
                  y: svgPos.y - ry,
                });
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              }}
            >
              {/* Room Body Box / Polygon */}
              {room.polygon_points && room.polygon_points.length >= 3 ? (
                <polygon
                  points={room.polygon_points
                    .map((pt) => `${rx + pt.x},${ry + pt.y}`)
                    .join(' ')}
                  strokeDasharray={isAccessory ? '6,4' : undefined}
                  className={`transition-colors duration-150 ${
                    isSelected
                      ? 'fill-slate-800 stroke-sky-400 stroke-[3]'
                      : isAccessory
                      ? 'fill-amber-950/30 stroke-amber-500/80 stroke-[2] hover:stroke-amber-400 hover:fill-amber-900/30'
                      : isExteriorFootprint
                      ? 'fill-emerald-950/35 stroke-emerald-400/90 stroke-[2.5] hover:stroke-emerald-300 hover:fill-emerald-900/35'
                      : 'fill-slate-900/90 stroke-slate-600 stroke-[2] hover:stroke-slate-400 hover:fill-slate-800/80'
                  }`}
                />
              ) : (
                <rect
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  rx="4"
                  strokeDasharray={isAccessory ? '6,4' : undefined}
                  className={`transition-colors duration-150 ${
                    isSelected
                      ? 'fill-slate-800 stroke-sky-400 stroke-[3]'
                      : isAccessory
                      ? 'fill-amber-950/30 stroke-amber-500/80 stroke-[2] hover:stroke-amber-400 hover:fill-amber-900/30'
                      : isExteriorFootprint
                      ? 'fill-emerald-950/35 stroke-emerald-400/90 stroke-[2.5] hover:stroke-emerald-300 hover:fill-emerald-900/35'
                      : 'fill-slate-900/90 stroke-slate-600 stroke-[2] hover:stroke-slate-400 hover:fill-slate-800/80'
                  }`}
                />
              )}

              {/* Footprint / Non-GLA Corner Tag */}
              {(isExteriorFootprint || isAccessory) && (
                <text
                  x={rx + 6}
                  y={ry + 12}
                  fill={isAccessory ? '#fbbf24' : '#34d399'}
                  fontSize="8.5"
                  fontWeight="700"
                  fontFamily="monospace"
                >
                  {isAccessory ? 'ACCESSORY / NON-GLA' : 'EXTERIOR FOOTPRINT'}
                </text>
              )}

              {/* Wall Openings */}
              {room.openings.map((opening) => {
                const side = opening.wall_side;
                const offset = opening.offset_in;
                const oWidth = opening.width_in;
                const isDoor = opening.type === 'door';
                const isCased = opening.type === 'cased_opening';
                const openingStroke = isDoor ? '#fbbf24' : isCased ? '#94a3b8' : '#60a5fa';
                const openingWidth = isDoor ? 3 : isCased ? 2.5 : 4;
                const openingDash = isCased ? '3,3' : undefined;

                let ox = rx;
                let oy = ry;

                if (side === 'top') {
                  ox = rx + offset;
                  oy = ry;
                  return (
                    <g key={opening.id}>
                      <line x1={ox} y1={oy} x2={ox + oWidth} y2={oy} stroke={openingStroke} strokeWidth={openingWidth} strokeDasharray={openingDash} strokeLinecap={isCased ? 'butt' : 'round'} />
                      {isDoor && (
                        <path d={`M ${ox} ${oy} A ${oWidth} ${oWidth} 0 0 1 ${ox + oWidth} ${oy - oWidth}`} fill="none" stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="3,3" />
                      )}
                    </g>
                  );
                } else if (side === 'bottom') {
                  ox = rx + offset;
                  oy = ry + rh;
                  return (
                    <g key={opening.id}>
                      <line x1={ox} y1={oy} x2={ox + oWidth} y2={oy} stroke={openingStroke} strokeWidth={openingWidth} strokeDasharray={openingDash} strokeLinecap={isCased ? 'butt' : 'round'} />
                      {isDoor && (
                        <path d={`M ${ox} ${oy} A ${oWidth} ${oWidth} 0 0 0 ${ox + oWidth} ${oy + oWidth}`} fill="none" stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="3,3" />
                      )}
                    </g>
                  );
                } else if (side === 'left') {
                  ox = rx;
                  oy = ry + offset;
                  return (
                    <g key={opening.id}>
                      <line x1={ox} y1={oy} x2={ox} y2={oy + oWidth} stroke={openingStroke} strokeWidth={openingWidth} strokeDasharray={openingDash} strokeLinecap={isCased ? 'butt' : 'round'} />
                      {isDoor && (
                        <path d={`M ${ox} ${oy} A ${oWidth} ${oWidth} 0 0 1 ${ox - oWidth} ${oy + oWidth}`} fill="none" stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="3,3" />
                      )}
                    </g>
                  );
                } else {
                  ox = rx + rw;
                  oy = ry + offset;
                  return (
                    <g key={opening.id}>
                      <line x1={ox} y1={oy} x2={ox} y2={oy + oWidth} stroke={openingStroke} strokeWidth={openingWidth} strokeDasharray={openingDash} strokeLinecap={isCased ? 'butt' : 'round'} />
                      {isDoor && (
                        <path d={`M ${ox} ${oy} A ${oWidth} ${oWidth} 0 0 0 ${ox + oWidth} ${oy + oWidth}`} fill="none" stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="3,3" />
                      )}
                    </g>
                  );
                }
              })}

              {/* Centroid Badge */}
              <g
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectRoom(room.id);
                }}
              >
                <rect
                  x={cx - 60}
                  y={cy - 28}
                  width="120"
                  height="56"
                  rx="6"
                  className={`${
                    isSelected
                      ? 'fill-slate-900 stroke-sky-400 stroke-2'
                      : 'fill-slate-900/95 stroke-slate-700 stroke-1'
                  } shadow-lg`}
                />
                <text
                  x={cx}
                  y={cy - 12}
                  fill="#f8fafc"
                  fontSize="12"
                  fontWeight="700"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {room.name}
                </text>
                <text
                  x={cx}
                  y={cy + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="500"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {room.dimensions.length_ft}' × {room.dimensions.width_ft}' ({room.floor_area_sqft} SF)
                </text>
                <text
                  x={cx}
                  y={cy + 19}
                  fill="#34d399"
                  fontSize="10.5"
                  fontWeight="700"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  Est: ${room.cost_rollup.room_total.toLocaleString()}
                </text>
              </g>

              {/* Interactive Resizing Handles (Shown when Selected) */}
              {isSelected && (
                <g>
                  {/* Right Edge Handle */}
                  <rect
                    x={rx + rw - 5}
                    y={ry + rh / 2 - 16}
                    width="10"
                    height="32"
                    rx="3"
                    fill="#38bdf8"
                    className="cursor-ew-resize hover:fill-sky-300"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setResizingRoomId(room.id);
                      setResizeHandleType('right');
                      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                    }}
                  />
                  {/* Bottom Edge Handle */}
                  <rect
                    x={rx + rw / 2 - 16}
                    y={ry + rh - 5}
                    width="32"
                    height="10"
                    rx="3"
                    fill="#38bdf8"
                    className="cursor-ns-resize hover:fill-sky-300"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setResizingRoomId(room.id);
                      setResizeHandleType('bottom');
                      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                    }}
                  />
                  {/* Corner Handle */}
                  <circle
                    cx={rx + rw}
                    cy={ry + rh}
                    r="8"
                    fill="#38bdf8"
                    stroke="#0f172a"
                    strokeWidth="2"
                    className="cursor-nwse-resize hover:fill-sky-300 shadow-md"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setResizingRoomId(room.id);
                      setResizeHandleType('corner');
                      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                    }}
                  />
                </g>
              )}
            </g>
          );
        })}

        {/* Active Wall-by-Wall Sketch Overlay Layer */}
        {isSketchMode && sketchPoints.length > 0 && (
          <g id="active-sketch-layer">
            {/* Pop-Point Alignment Crosshair Guides from Start Vertex */}
            <line
              x1={sketchPoints[0].x}
              y1={viewBox.y - 1000}
              x2={sketchPoints[0].x}
              y2={viewBox.y + viewBox.height + 1000}
              stroke="#22d3ee"
              strokeOpacity="0.22"
              strokeWidth="1"
              strokeDasharray="4,4"
              pointerEvents="none"
            />
            <line
              x1={viewBox.x - 1000}
              y1={sketchPoints[0].y}
              x2={viewBox.x + viewBox.width + 1000}
              y2={sketchPoints[0].y}
              stroke="#22d3ee"
              strokeOpacity="0.22"
              strokeWidth="1"
              strokeDasharray="4,4"
              pointerEvents="none"
            />

            {/* Semi-transparent polygon preview fill when >= 3 points */}
            {sketchPoints.length >= 3 && (
              <polygon
                points={sketchPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="rgba(34, 211, 238, 0.12)"
                stroke="none"
                pointerEvents="none"
              />
            )}

            {/* Dashed closing preview line back to Start Anchor */}
            {sketchPoints.length >= 3 && (() => {
              const first = sketchPoints[0];
              const last = sketchPoints[sketchPoints.length - 1];
              const closeLenFt = calculateSegmentLengthFt(last, first);
              const midX = (first.x + last.x) / 2;
              const midY = (first.y + last.y) / 2;
              return (
                <g pointerEvents="none">
                  <line
                    x1={last.x}
                    y1={last.y}
                    x2={first.x}
                    y2={first.y}
                    stroke="#34d399"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                  {closeLenFt > 0 && (
                    <text
                      x={midX}
                      y={midY - 6}
                      fill="#34d399"
                      fontSize="10"
                      fontWeight="700"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      Close: {closeLenFt}'
                    </text>
                  )}
                </g>
              );
            })()}

            {/* Drawn Wall Segments + Dimension Labels */}
            {sketchPoints.slice(0, -1).map((pt, idx) => {
              const next = sketchPoints[idx + 1];
              const segLenFt = calculateSegmentLengthFt(pt, next);
              const midX = (pt.x + next.x) / 2;
              const midY = (pt.y + next.y) / 2;
              return (
                <g key={`sketch-seg-${idx}`} pointerEvents="none">
                  <line
                    x1={pt.x}
                    y1={pt.y}
                    x2={next.x}
                    y2={next.y}
                    stroke="#22d3ee"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <rect
                    x={midX - 20}
                    y={midY - 14}
                    width="40"
                    height="14"
                    rx="3"
                    fill="#0f172a"
                    stroke="#0891b2"
                    strokeWidth="0.8"
                  />
                  <text
                    x={midX}
                    y={midY - 4}
                    fill="#67e8f9"
                    fontSize="9.5"
                    fontWeight="700"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {segLenFt}'
                  </text>
                </g>
              );
            })}

            {/* Start Anchor Point (Click to Close when >= 3 points) */}
            <circle
              cx={sketchPoints[0].x}
              cy={sketchPoints[0].y}
              r="7"
              fill="#10b981"
              stroke="#ecfdf5"
              strokeWidth="2"
              className={sketchPoints.length >= 3 ? 'cursor-pointer' : ''}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (sketchPoints.length >= 3) {
                  handleCommitSketch(sketchPoints);
                }
              }}
            />

            {/* Active Tip Cursor */}
            {sketchPoints.length > 1 && (
              <circle
                cx={sketchPoints[sketchPoints.length - 1].x}
                cy={sketchPoints[sketchPoints.length - 1].y}
                r="6"
                fill="#22d3ee"
                stroke="#0f172a"
                strokeWidth="2"
                pointerEvents="none"
              />
            )}
          </g>
        )}
      </svg>
    </div>
  );
};
