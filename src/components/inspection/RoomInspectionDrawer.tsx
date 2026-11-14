import React, { useState, useEffect, useRef } from 'react';
import {
  RoomNode,
  RoomNodeType,
  QualityClass,
  ConditionClass,
  FloorLevel,
  WallOpening,
  RoomPhoto,
  RegionalCostIndex,
  TradeCategory,
  ScopeAction,
} from '../../types/sprocket';
import { speechService } from '../../services/voice/speechService';
import { parseVoiceDefectTranscript, createDefectFromVoice, ParsedVoiceDefect } from '../../services/voice/intentParser';
import { compressImage } from '../../services/imageUtils';
import {
  X,
  Mic,
  MicOff,
  Plus,
  Trash2,
  CheckCircle2,
  Camera,
  Compass,
  DollarSign,
  Layers,
  Sparkles,
  DoorOpen,
  Eye,
  RefreshCw,
} from 'lucide-react';

interface RoomInspectionDrawerProps {
  room: RoomNode | null;
  costIndex: RegionalCostIndex;
  onClose: () => void;
  onUpdateRoom: (updated: RoomNode) => void;
  onDeleteRoom: (roomId: string) => void;
}

const QUALITY_CLASSES: QualityClass[] = [
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
];

const CONDITION_CLASSES: ConditionClass[] = [
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
];

const QUICK_VOICE_TEMPLATES = [
  'Replace 40 linear feet of baseboard',
  'Remove 150 square feet of carpet',
  'Install 2 ea plumbing fixtures',
  'Fix 80 sf drywall',
  'Paint 200 sq ft wall',
];

export const RoomInspectionDrawer: React.FC<RoomInspectionDrawerProps> = ({
  room,
  costIndex,
  onClose,
  onUpdateRoom,
  onDeleteRoom,
}) => {
  if (!room) return null;

  // Voice Push-to-Talk State
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(room.voice_transcript || '');
  const [parsedDefect, setParsedDefect] = useState<ParsedVoiceDefect | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Manual Defect Form State
  const [showAddDefect, setShowAddDefect] = useState(false);
  const [manualAction, setManualAction] = useState<ScopeAction>('Replace');
  const [manualTrade, setManualTrade] = useState<TradeCategory>('Finish Carpentry');
  const [manualDesc, setManualDesc] = useState('');
  const [manualQty, setManualQty] = useState(10);
  const [manualUnit, setManualUnit] = useState<'SF' | 'LF' | 'EA' | 'ALLOWANCE'>('LF');

  // Wall Opening Form State
  const [showAddOpening, setShowAddOpening] = useState(false);
  const [openType, setOpenType] = useState<'door' | 'window' | 'cased_opening'>('door');
  const [openSide, setOpenSide] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');
  const [openWidth, setOpenWidth] = useState(36);
  const [openHeight, setOpenHeight] = useState(80);
  const [openOffset, setOpenOffset] = useState(24);

  useEffect(() => {
    setTranscript(room.voice_transcript || '');
    setParsedDefect(null);
    setVoiceError(null);
  }, [room.id]);

  // Push-to-Talk Toggle
  const toggleSpeech = () => {
    if (isRecording) {
      speechService.stopListening();
      setIsRecording(false);
    } else {
      setVoiceError(null);
      speechService.startListening(
        (text, isFinal) => {
          setTranscript(text);
          const parsed = parseVoiceDefectTranscript(text);
          if (parsed) {
            setParsedDefect(parsed);
          }
          if (isFinal) {
            // Save transcript into room node
            onUpdateRoom({ ...room, voice_transcript: text });
          }
        },
        (err) => {
          setVoiceError(`Voice error: ${err}`);
          setIsRecording(false);
        }
      );
      setIsRecording(true);
    }
  };

  // Add parsed voice defect to room
  const handleAcceptVoiceDefect = () => {
    if (!parsedDefect) return;
    const newDefect = createDefectFromVoice(parsedDefect, costIndex);
    const updatedDefects = [...room.deficiencies, newDefect];

    onUpdateRoom({
      ...room,
      deficiencies: updatedDefects,
      voice_transcript: transcript,
    });
    setParsedDefect(null);
  };

  // Manual Defect Addition
  const handleAddManualDefect = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed: ParsedVoiceDefect = {
      rawTranscript: `${manualAction} ${manualQty} ${manualUnit} of ${manualDesc}`,
      action: manualAction,
      quantity: manualQty,
      unit: manualUnit,
      trade_category: manualTrade,
      description: manualDesc || `${manualTrade} repair`,
      confidence: 1.0,
    };
    const defect = createDefectFromVoice(parsed, costIndex);

    onUpdateRoom({
      ...room,
      deficiencies: [...room.deficiencies, defect],
    });
    setShowAddDefect(false);
    setManualDesc('');
  };

  const handleToggleDefectVerified = (defectId: string) => {
    const updated = room.deficiencies.map((d) =>
      d.id === defectId ? { ...d, is_verified: !d.is_verified } : d
    );
    onUpdateRoom({ ...room, deficiencies: updated });
  };

  const handleDeleteDefect = (defectId: string) => {
    const updated = room.deficiencies.filter((d) => d.id !== defectId);
    onUpdateRoom({ ...room, deficiencies: updated });
  };

  // Opening management
  const handleAddOpening = (e: React.FormEvent) => {
    e.preventDefault();
    const newOpening: WallOpening = {
      id: `open-${Date.now()}`,
      type: openType,
      wall_side: openSide,
      width_in: openWidth,
      height_in: openHeight,
      offset_in: openOffset,
    };
    onUpdateRoom({
      ...room,
      openings: [...room.openings, newOpening],
    });
    setShowAddOpening(false);
  };

  const handleDeleteOpening = (openingId: string) => {
    const updated = room.openings.filter((o) => o.id !== openingId);
    onUpdateRoom({ ...room, openings: updated });
  };

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [previewPhoto, setPreviewPhoto] = useState<RoomPhoto | null>(null);

  // Mobile Camera / Photo Capture Handler
  const handlePhotoCapture = async (
    direction: 'North' | 'South' | 'East' | 'West' | 'Defect',
    file: File
  ) => {
    try {
      const dataUri = await compressImage(file, 1600, 0.85);
      const azimuthMap: Record<string, number> = {
        North: 0,
        East: 90,
        South: 180,
        West: 270,
        Defect: 45,
      };

      const newPhoto: RoomPhoto = {
        id: `photo-${Date.now()}`,
        direction,
        azimuth_deg: azimuthMap[direction] || 0,
        timestamp: new Date().toISOString(),
        file_uri: dataUri,
      };

      const existingFiltered = room.photos.filter((p) => p.direction !== direction);
      onUpdateRoom({
        ...room,
        photos: [...existingFiltered, newPhoto],
      });
    } catch (err) {
      console.error('Failed to capture photo:', err);
    }
  };

  const handleDeletePhoto = (direction: string) => {
    const updated = room.photos.filter((p) => p.direction !== direction);
    onUpdateRoom({ ...room, photos: updated });
  };

  const triggerCamera = (direction: string) => {
    fileInputRefs.current[direction]?.click();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-30 w-full sm:w-[480px] bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
        <div className="flex-1 mr-3">
          <input
            type="text"
            value={room.name}
            onChange={(e) => onUpdateRoom({ ...room, name: e.target.value })}
            className="text-lg font-bold text-white bg-transparent border-b border-transparent hover:border-slate-600 focus:border-sky-400 focus:outline-none w-full px-1"
          />
          <div className="flex items-center gap-2 mt-1">
            <select
              value={room.level}
              onChange={(e) => onUpdateRoom({ ...room, level: e.target.value as FloorLevel })}
              className="text-xs bg-slate-700 text-slate-200 rounded px-2 py-0.5 border border-slate-600 focus:outline-none"
            >
              <option value="First Floor">First Floor</option>
              <option value="Second Floor">Second Floor</option>
              <option value="Basement">Basement</option>
              <option value="Attic">Attic</option>
            </select>
            <select
              value={room.node_type || 'interior_room'}
              onChange={(e) => {
                const nextType = e.target.value as RoomNodeType;
                onUpdateRoom({
                  ...room,
                  node_type: nextType,
                  exclude_from_gla: nextType === 'accessory_structure',
                });
              }}
              className="text-xs bg-slate-700 text-sky-300 rounded px-2 py-0.5 border border-slate-600 focus:outline-none"
            >
              <option value="interior_room">Interior Room</option>
              <option value="exterior_footprint">Exterior Footprint</option>
              <option value="accessory_structure">Accessory / Non-GLA</option>
            </select>
            <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(room.exclude_from_gla)}
                onChange={(e) =>
                  onUpdateRoom({
                    ...room,
                    exclude_from_gla: e.target.checked,
                  })
                }
                className="rounded border-slate-600 bg-slate-800 text-amber-500"
              />
              <span>Non-GLA</span>
            </label>
            <span className="text-xs text-emerald-400 font-semibold">
              Total: ${room.cost_rollup.room_total.toLocaleString()}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Parametric Dimensions & Area Card */}
        <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-sky-400" />
              Dimensions & Wall Areas
            </h3>
            <span className="text-xs font-mono bg-sky-950 text-sky-400 px-2 py-0.5 rounded border border-sky-800">
              1-FT Snapping
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Length (ft)</label>
              <input
                type="number"
                min="6"
                max="60"
                value={room.dimensions.length_ft}
                onChange={(e) =>
                  onUpdateRoom({
                    ...room,
                    dimensions: { ...room.dimensions, length_ft: Number(e.target.value) },
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-white focus:border-sky-400 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Width (ft)</label>
              <input
                type="number"
                min="6"
                max="60"
                value={room.dimensions.width_ft}
                onChange={(e) =>
                  onUpdateRoom({
                    ...room,
                    dimensions: { ...room.dimensions, width_ft: Number(e.target.value) },
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-white focus:border-sky-400 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Height (ft)</label>
              <input
                type="number"
                min="7"
                max="24"
                value={room.dimensions.height_ft}
                onChange={(e) =>
                  onUpdateRoom({
                    ...room,
                    dimensions: { ...room.dimensions, height_ft: Number(e.target.value) },
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-white focus:border-sky-400 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Area Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/60 font-mono">
            <div>
              <div className="text-slate-400">Floor Area</div>
              <div className="text-white font-bold text-sm mt-0.5">{room.floor_area_sqft} SF</div>
            </div>
            <div>
              <div className="text-slate-400">Gross Wall</div>
              <div className="text-slate-200 font-semibold text-sm mt-0.5">{room.gross_wall_area_sqft} SF</div>
            </div>
            <div>
              <div className="text-slate-400">Net Wall</div>
              <div className="text-emerald-400 font-bold text-sm mt-0.5">{room.net_wall_area_sqft} SF</div>
            </div>
          </div>
        </div>

        {/* Quality & Condition Ratings */}
        <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Craftsman Quality & Condition
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Quality Rating</label>
              <select
                value={room.quality_class}
                onChange={(e) =>
                  onUpdateRoom({
                    ...room,
                    quality_class: e.target.value as QualityClass,
                    is_class_overridden: true,
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-white focus:border-sky-400 focus:outline-none"
              >
                {QUALITY_CLASSES.map((qc) => (
                  <option key={qc} value={qc}>
                    {qc} (Q{qc.replace('Class ', '')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Condition Rating</label>
              <select
                value={room.condition_class}
                onChange={(e) =>
                  onUpdateRoom({
                    ...room,
                    condition_class: e.target.value as ConditionClass,
                    is_class_overridden: true,
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-white focus:border-sky-400 focus:outline-none"
              >
                {CONDITION_CLASSES.map((cc) => (
                  <option key={cc} value={cc}>
                    {cc} (C{cc.replace('Class ', '')})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Xact-Scope Push-to-Talk Scoping Engine */}
        <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Xact-Scope Voice Scoping
            </h3>
            <span className="text-xs text-amber-400 font-mono">Push-to-Talk</span>
          </div>

          {/* Voice Microphone Controller */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-900/80 rounded-xl border border-slate-700/60 mb-3">
            <button
              onClick={toggleSpeech}
              className={`p-4 rounded-full transition shadow-lg relative ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/40'
                  : 'bg-sky-600 hover:bg-sky-500 text-white'
              }`}
              title={isRecording ? 'Click to Stop Recording' : 'Push to Talk'}
            >
              {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            <span className="text-xs font-medium text-slate-300 mt-2">
              {isRecording ? 'Listening... Speak deficiency line item' : 'Tap to start voice scoping'}
            </span>
          </div>

          {/* Transcript Display */}
          {transcript && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 mb-3 font-mono">
              <span className="text-slate-500 block mb-1 font-sans text-[10px] uppercase tracking-wider">
                Transcript:
              </span>
              "{transcript}"
            </div>
          )}

          {/* Parsed Voice Intent Preview */}
          {parsedDefect && (
            <div className="bg-emerald-950/40 border border-emerald-700/60 p-3 rounded-lg mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Structured Intent Extracted
                </span>
                <span className="text-[10px] font-mono bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded">
                  {Math.round(parsedDefect.confidence * 100)}% match
                </span>
              </div>
              <div className="text-xs text-slate-200">
                <span className="font-semibold text-emerald-300">{parsedDefect.action}</span>{' '}
                {parsedDefect.quantity} {parsedDefect.unit} of{' '}
                <span className="text-sky-300">{parsedDefect.description}</span>{' '}
                <span className="text-slate-400">({parsedDefect.trade_category})</span>
              </div>
              <button
                onClick={handleAcceptVoiceDefect}
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-1.5 rounded transition"
              >
                + Add Spoken Line Item to Room
              </button>
            </div>
          )}

          {voiceError && (
            <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800 p-2 rounded mb-3">
              {voiceError}
            </div>
          )}

          {/* Quick Voice Simulation Buttons */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
              Sample Voice Phrases (Quick-Insert):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_VOICE_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTranscript(tmpl);
                    const parsed = parseVoiceDefectTranscript(tmpl);
                    if (parsed) setParsedDefect(parsed);
                  }}
                  className="text-[11px] bg-slate-700/60 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition border border-slate-600/40"
                >
                  "{tmpl}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Deficiency Checklist */}
        <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Room Deficiencies & Cost-to-Cure ({room.deficiencies.length})
            </h3>
            <button
              onClick={() => setShowAddDefect(!showAddDefect)}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Manual Item
            </button>
          </div>

          {/* Manual Add Form */}
          {showAddDefect && (
            <form
              onSubmit={handleAddManualDefect}
              className="p-3 bg-slate-900/90 rounded-lg border border-slate-700 mb-3 space-y-3"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Action</label>
                  <select
                    value={manualAction}
                    onChange={(e) => setManualAction(e.target.value as ScopeAction)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="Replace">Replace</option>
                    <option value="Remove">Remove</option>
                    <option value="Add">Add</option>
                    <option value="Keep">Keep</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Trade Category</label>
                  <select
                    value={manualTrade}
                    onChange={(e) => setManualTrade(e.target.value as TradeCategory)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="Finish Carpentry">Finish Carpentry</option>
                    <option value="Drywall">Drywall</option>
                    <option value="Carpet, Flooring">Carpet, Flooring</option>
                    <option value="Painting">Painting</option>
                    <option value="Plumbing Fixtures">Plumbing Fixtures</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Doors & Windows">Doors & Windows</option>
                    <option value="Cabinets">Cabinets</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Baseboard trim replacement"
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Quantity</label>
                  <input
                    type="number"
                    value={manualQty}
                    onChange={(e) => setManualQty(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Unit</label>
                  <select
                    value={manualUnit}
                    onChange={(e) => setManualUnit(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="LF">LF (Linear Feet)</option>
                    <option value="SF">SF (Square Feet)</option>
                    <option value="EA">EA (Each)</option>
                    <option value="ALLOWANCE">ALLOWANCE</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold py-1.5 rounded transition"
              >
                Save Line Item
              </button>
            </form>
          )}

          {/* Defect List */}
          {room.deficiencies.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-500">
              No deficiencies recorded. Use voice scoping above or add manual line items.
            </div>
          ) : (
            <div className="space-y-2">
              {room.deficiencies.map((defect) => (
                <div
                  key={defect.id}
                  className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/60 flex items-center justify-between text-xs"
                >
                  <div className="flex-1 mr-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          defect.action === 'Replace'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : defect.action === 'Remove'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : defect.action === 'Add'
                            ? 'bg-sky-950 text-sky-300 border border-sky-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {defect.action}
                      </span>
                      <span className="font-semibold text-slate-200">{defect.description}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {defect.quantity} {defect.unit} @ ${defect.unit_price.toFixed(2)} ={' '}
                      <span className="text-emerald-400 font-bold">
                        ${defect.total_cost.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleDefectVerified(defect.id)}
                      className={`p-1.5 rounded transition ${
                        defect.is_verified ? 'text-emerald-400' : 'text-slate-600'
                      }`}
                      title={defect.is_verified ? 'Verified' : 'Click to verify'}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDefect(defect.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                      title="Delete Defect"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wall Openings Manager (Doors & Windows) */}
        <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <DoorOpen className="w-4 h-4 text-amber-400" />
              Wall Openings ({room.openings.length})
            </h3>
            <button
              onClick={() => setShowAddOpening(!showAddOpening)}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Opening
            </button>
          </div>

          {showAddOpening && (
            <form
              onSubmit={handleAddOpening}
              className="p-3 bg-slate-900/90 rounded-lg border border-slate-700 mb-3 space-y-2 text-xs"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Type</label>
                  <select
                    value={openType}
                    onChange={(e) => setOpenType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="door">Door</option>
                    <option value="window">Window</option>
                    <option value="cased_opening">Cased Opening</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Wall Side</label>
                  <select
                    value={openSide}
                    onChange={(e) => setOpenSide(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="top">Top Wall</option>
                    <option value="bottom">Bottom Wall</option>
                    <option value="left">Left Wall</option>
                    <option value="right">Right Wall</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Width (in)</label>
                  <input
                    type="number"
                    value={openWidth}
                    onChange={(e) => setOpenWidth(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Height (in)</label>
                  <input
                    type="number"
                    value={openHeight}
                    onChange={(e) => setOpenHeight(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Offset (in)</label>
                  <input
                    type="number"
                    value={openOffset}
                    onChange={(e) => setOpenOffset(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold py-1.5 rounded transition mt-1"
              >
                Attach Opening
              </button>
            </form>
          )}

          {room.openings.length === 0 ? (
            <div className="text-center py-2 text-xs text-slate-500">
              No wall openings attached.
            </div>
          ) : (
            <div className="space-y-1.5">
              {room.openings.map((op) => (
                <div
                  key={op.id}
                  className="bg-slate-900/80 px-3 py-2 rounded border border-slate-700/60 flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <span className="font-semibold text-amber-400 capitalize">{op.type}</span> on{' '}
                    <span className="text-slate-300 capitalize">{op.wall_side}</span> wall
                    <div className="text-[11px] text-slate-400">
                      {op.width_in}"W × {op.height_in}"H (offset {op.offset_in}")
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteOpening(op.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cardinal Direction Photos (N, S, E, W + Defect) */}
        <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-sky-400" />
              Cardinal Photos (Mobile Camera)
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">UAD Compliant</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {(['North', 'East', 'South', 'West', 'Defect'] as const).map((dir) => {
              const photo = room.photos.find((p) => p.direction === dir);
              const azimuthMap: Record<string, number> = {
                North: 0,
                East: 90,
                South: 180,
                West: 270,
                Defect: 45,
              };

              return (
                <div
                  key={dir}
                  className={`bg-slate-900/90 border rounded-xl p-2.5 flex flex-col items-center justify-between transition-colors ${
                    photo ? 'border-slate-700/80 bg-slate-900' : 'border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  {/* Hidden Native Camera Input with capture="environment" for rear mobile camera */}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    ref={(el) => {
                      fileInputRefs.current[dir] = el;
                    }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handlePhotoCapture(dir, file);
                        e.target.value = '';
                      }
                    }}
                  />

                  {/* Header Title */}
                  <div className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1.5 px-0.5">
                    <span className="flex items-center gap-1">
                      <Compass className="w-3 h-3 text-sky-400" />
                      {dir === 'Defect' ? 'Defect' : `${dir} Wall`}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {azimuthMap[dir]}°
                    </span>
                  </div>

                  {photo ? (
                    <div className="w-full relative group">
                      <div className="h-24 w-full rounded-lg overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center relative">
                        <img
                          src={photo.file_uri}
                          alt={`${dir} Wall`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setPreviewPhoto(photo)}
                        />
                        {/* Hover / Touch Quick Action Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => setPreviewPhoto(photo)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg shadow"
                            title="View Fullscreen"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => triggerCamera(dir)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg shadow"
                            title="Retake Photo"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePhoto(dir)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg shadow"
                            title="Delete Photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-1 px-0.5">
                        <span className="text-[10px] text-emerald-400 font-mono">
                          Captured ({photo.azimuth_deg}°)
                        </span>
                        <button
                          onClick={() => triggerCamera(dir)}
                          className="text-[10px] text-slate-400 hover:text-sky-300 font-medium"
                        >
                          Retake
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => triggerCamera(dir)}
                      className="w-full h-24 border border-dashed border-slate-700 hover:border-sky-500 hover:bg-sky-950/20 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:text-sky-400 transition group p-2 text-center"
                    >
                      <Camera className="w-6 h-6 mb-1 text-slate-500 group-hover:text-sky-400 transition" />
                      <span className="text-[11px] font-semibold">Take Photo</span>
                      <span className="text-[9px] text-slate-500">Tap to activate camera</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Delete Room Button */}
        <div className="pt-2">
          <button
            onClick={() => onDeleteRoom(room.id)}
            className="w-full bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 border border-rose-800/60 rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Trash2 className="w-4 h-4" />
            Delete Room Block
          </button>
        </div>
      </div>

      {/* Lightbox Photo Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-3 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white">
                  {previewPhoto.direction} Facing Photo ({previewPhoto.azimuth_deg}°)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {room.name}
                </span>
              </div>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Full Image */}
            <div className="p-2 bg-slate-950 flex items-center justify-center overflow-hidden max-h-[70vh]">
              <img
                src={previewPhoto.file_uri}
                alt={previewPhoto.direction}
                className="max-w-full max-h-[68vh] object-contain rounded-lg"
              />
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Timestamp: {new Date(previewPhoto.timestamp).toLocaleString()}</span>
              <button
                onClick={() => {
                  triggerCamera(previewPhoto.direction);
                  setPreviewPhoto(null);
                }}
                className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Camera className="w-3.5 h-3.5" />
                Retake
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
