import React, { useState, useRef, useMemo } from 'react';
import { RoomNode, Point2D } from '../../types/sprocket';
import { applyMagneticSnap, calculateAnsiZ765GLA, SnapGuide } from '../../services/math/geometry';
import { ZoomIn, ZoomOut, Maximize2, Grid } from 'lucide-react';

interface VectorCanvasProps {
  rooms: RoomNode[];
  activeRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onUpdateRoomPosition: (roomId: string, newPos: Point2D) => void;
  onUpdateRoomDimensions: (roomId: string, length_ft: number, width_ft: number) => void;
  showAnsiBuffer: boolean;
  onToggleAnsiBuffer: () => void;
}

export const VectorCanvas: React.FC<VectorCanvasProps> = ({
  rooms,
  activeRoomId,
  onSelectRoom,
  onUpdateRoomPosition,
  onUpdateRoomDimensions,
  showAnsiBuffer,
  onToggleAnsiBuffer,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Canvas Panning Handler
  const handlePointerDownBackground = (e: React.PointerEvent) => {
    // Only pan if clicking directly on SVG background
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'canvas-bg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
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
    setIsPanning(false);
    setDraggingRoomId(null);
    setResizingRoomId(null);
    setResizeHandleType(null);
    setActiveSnapGuides([]);
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

      {/* Dynamic Measurement Banner */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-xl px-4 py-2 shadow-xl flex items-center gap-4 text-xs font-mono">
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

        {/* ANSI Z765 Outer Shell Buffer Visualization */}
        {showAnsiBuffer && ansiData.exterior_hull_bounds && (
          <g id="ansi-hull-layer">
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
          />
        ))}

        {/* Room Nodes */}
        {rooms.map((room) => {
          const isSelected = room.id === activeRoomId;
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
              {/* Room Body Box */}
              <rect
                x={rx}
                y={ry}
                width={rw}
                height={rh}
                rx="4"
                className={`transition-colors duration-150 ${
                  isSelected
                    ? 'fill-slate-800 stroke-sky-400 stroke-[3]'
                    : 'fill-slate-900/90 stroke-slate-600 stroke-[2] hover:stroke-slate-400 hover:fill-slate-800/80'
                }`}
              />

              {/* Wall Openings */}
              {room.openings.map((opening) => {
                const side = opening.wall_side;
                const offset = opening.offset_in;
                const oWidth = opening.width_in;

                let ox = rx;
                let oy = ry;

                if (side === 'top') {
                  ox = rx + offset;
                  oy = ry;
                  return (
                    <g key={opening.id}>
                      <line x1={ox} y1={oy} x2={ox + oWidth} y2={oy} stroke={opening.type === 'door' ? '#fbbf24' : '#60a5fa'} strokeWidth={opening.type === 'door' ? 3 : 4} strokeLinecap="round" />
                      {opening.type === 'door' && (
                        <path d={`M ${ox} ${oy} A ${oWidth} ${oWidth} 0 0 1 ${ox + oWidth} ${oy - oWidth}`} fill="none" stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="3,3" />
                      )}
                    </g>
                  );
                } else if (side === 'bottom') {
                  ox = rx + offset;
                  oy = ry + rh;
                  return (
                    <g key={opening.id}>
                      <line x1={ox} y1={oy} x2={ox + oWidth} y2={oy} stroke={opening.type === 'door' ? '#fbbf24' : '#60a5fa'} strokeWidth={opening.type === 'door' ? 3 : 4} strokeLinecap="round" />
                      {opening.type === 'door' && (
                        <path d={`M ${ox} ${oy} A ${oWidth} ${oWidth} 0 0 0 ${ox + oWidth} ${oy + oWidth}`} fill="none" stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="3,3" />
                      )}
                    </g>
                  );
                } else if (side === 'left') {
                  ox = rx;
                  oy = ry + offset;
                  return (
                    <g key={opening.id}>
                      <line x1={ox} y1={oy} x2={ox} y2={oy + oWidth} stroke={opening.type === 'door' ? '#fbbf24' : '#60a5fa'} strokeWidth={opening.type === 'door' ? 3 : 4} strokeLinecap="round" />
                      {opening.type === 'door' && (
                        <path d={`M ${ox} ${oy} A ${oWidth} ${oWidth} 0 0 1 ${ox - oWidth} ${oy + oWidth}`} fill="none" stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="3,3" />
                      )}
                    </g>
                  );
                } else {
                  ox = rx + rw;
                  oy = ry + offset;
                  return (
                    <g key={opening.id}>
                      <line x1={ox} y1={oy} x2={ox} y2={oy + oWidth} stroke={opening.type === 'door' ? '#fbbf24' : '#60a5fa'} strokeWidth={opening.type === 'door' ? 3 : 4} strokeLinecap="round" />
                      {opening.type === 'door' && (
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
      </svg>
    </div>
  );
};
