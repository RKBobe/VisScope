import { get, set } from 'idb-keyval';
import {
  ConditionClass,
  FloorLevel,
  PropertyMetadata,
  QualityClass,
  RoomNode,
  ScopeAction,
  TradeCategory,
} from '../../types/sprocket';
import { createIngestedRoomNode } from '../ingestion/parsers/johnsonCountyParser';
import type { IngestionResult } from '../ingestion/types';
import type { ParsedVoiceDefect } from '../voice/intentParser';

export interface GeminiConnectionConfig {
  apiKey: string;
  model: string;
  proxyUrl?: string;
  enabled: boolean;
}

export interface RoomVoiceContext {
  name?: string;
  floor_area_sqft?: number;
  net_wall_area_sqft?: number;
}

export type GeminiInlinePart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export const DEFAULT_GEMINI_MODELS: string[] = [
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
];

const STORAGE_GEMINI_KEY = 'datamesh_sprocket_gemini_config_v1';

const VALID_TRADE_CATEGORIES: TradeCategory[] = [
  'Excavation',
  'Foundation',
  'Framing',
  'Interior Wall Finish',
  'Carpet, Flooring',
  'Cabinets',
  'Countertops',
  'Plumbing Fixtures',
  'Painting',
  'Doors & Windows',
  'Roofing',
  'Electrical',
  'HVAC',
  'Drywall',
  'Flooring',
  'Plumbing',
  'Finish Carpentry',
  'Exterior Finish',
];

const VALID_SCOPE_ACTIONS: ScopeAction[] = ['Keep', 'Remove', 'Replace', 'Add'];
const VALID_UNITS = ['SF', 'LF', 'EA', 'ALLOWANCE'] as const;

function readInitialEnvConfig(): GeminiConnectionConfig {
  const metaEnv =
    typeof import.meta !== 'undefined'
      ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      : undefined;
  const envKey = metaEnv?.VITE_GEMINI_API_KEY?.trim() || '';
  const envProxy = metaEnv?.VITE_GEMINI_PROXY_URL?.trim() || '';
  return {
    apiKey: envKey,
    model: DEFAULT_GEMINI_MODELS[0],
    proxyUrl: envProxy || undefined,
    enabled: Boolean(envKey || envProxy),
  };
}

let cachedConfig: GeminiConnectionConfig = readInitialEnvConfig();

/**
 * Returns the current in-memory Gemini connection configuration synchronously.
 */
export function getCachedGeminiConfig(): GeminiConnectionConfig {
  return { ...cachedConfig };
}

/**
 * Loads the persisted Gemini configuration from IndexedDB (falling back to cached env defaults).
 */
export async function loadGeminiConfig(): Promise<GeminiConnectionConfig> {
  try {
    const stored = await get<GeminiConnectionConfig>(STORAGE_GEMINI_KEY);
    if (stored && typeof stored === 'object') {
      cachedConfig = {
        apiKey: typeof stored.apiKey === 'string' ? stored.apiKey : '',
        model: typeof stored.model === 'string' && stored.model.trim() ? stored.model.trim() : DEFAULT_GEMINI_MODELS[0],
        proxyUrl: typeof stored.proxyUrl === 'string' && stored.proxyUrl.trim() ? stored.proxyUrl.trim() : undefined,
        enabled: Boolean(stored.enabled),
      };
      return { ...cachedConfig };
    }
  } catch {
    // Ignore IndexedDB unavailability in Node/headless environments
  }
  return { ...cachedConfig };
}

/**
 * Persists the Gemini configuration in IndexedDB and updates the synchronous cache.
 */
export async function saveGeminiConfig(config: GeminiConnectionConfig): Promise<void> {
  const normalized: GeminiConnectionConfig = {
    apiKey: config.apiKey.trim(),
    model: config.model.trim() || DEFAULT_GEMINI_MODELS[0],
    proxyUrl: config.proxyUrl?.trim() || undefined,
    enabled: config.enabled,
  };
  cachedConfig = normalized;
  try {
    await set(STORAGE_GEMINI_KEY, normalized);
  } catch {
    // Ignore IndexedDB errors outside browser contexts
  }
}

/**
 * Checks whether Gemini AI is enabled and has either an API key or a backend proxy URL.
 */
export function isGeminiConfigured(config?: GeminiConnectionConfig): boolean {
  const cfg = config || cachedConfig;
  if (!cfg.enabled) return false;
  return Boolean(cfg.apiKey.trim() || cfg.proxyUrl?.trim());
}

function stripMarkdownJsonFences(raw: string): string {
  let cleaned = raw.trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    cleaned = fenced[1].trim();
  }
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
  }
  return cleaned;
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^,]+?);base64,([\s\S]+)$/i);
  if (!match) return null;
  const cleanMime = match[1].split(';')[0].trim() || 'audio/webm';
  return {
    mimeType: cleanMime,
    data: match[2].trim(),
  };
}

function normalizeScopeAction(raw: unknown): ScopeAction {
  if (typeof raw === 'string') {
    const found = VALID_SCOPE_ACTIONS.find((a) => a.toLowerCase() === raw.trim().toLowerCase());
    if (found) return found;
  }
  return 'Replace';
}

function normalizeTradeCategory(raw: unknown): TradeCategory {
  if (typeof raw === 'string') {
    const clean = raw.trim().toLowerCase();
    const exact = VALID_TRADE_CATEGORIES.find((t) => t.toLowerCase() === clean);
    if (exact) return exact;
    if (clean.includes('paint')) return 'Painting';
    if (clean.includes('drywall') || clean.includes('sheetrock')) return 'Drywall';
    if (clean.includes('floor') || clean.includes('carpet') || clean.includes('tile')) return 'Carpet, Flooring';
    if (clean.includes('trim') || clean.includes('baseboard') || clean.includes('carpentry')) return 'Finish Carpentry';
    if (clean.includes('plumb')) return 'Plumbing Fixtures';
    if (clean.includes('electr')) return 'Electrical';
    if (clean.includes('door') || clean.includes('window')) return 'Doors & Windows';
    if (clean.includes('cabinet')) return 'Cabinets';
    if (clean.includes('counter')) return 'Countertops';
    if (clean.includes('hvac')) return 'HVAC';
    if (clean.includes('roof')) return 'Roofing';
  }
  return 'Drywall';
}

function normalizeUnit(raw: unknown): 'SF' | 'LF' | 'EA' | 'ALLOWANCE' {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    if ((VALID_UNITS as readonly string[]).includes(upper)) {
      return upper as 'SF' | 'LF' | 'EA' | 'ALLOWANCE';
    }
    if (upper === 'SQFT' || upper === 'SQ FT') return 'SF';
    if (upper === 'LNFT' || upper === 'LINEAR FT') return 'LF';
  }
  return 'EA';
}

function normalizeQualityClass(raw: unknown, fallback: QualityClass = 'Class 4'): QualityClass {
  if (typeof raw === 'string') {
    const digit = raw.match(/[1-6]/)?.[0];
    if (digit) return `Class ${digit}` as QualityClass;
  }
  return fallback;
}

function normalizeFloorLevel(raw: unknown): FloorLevel {
  if (typeof raw === 'string') {
    const clean = raw.toLowerCase();
    if (clean.includes('basement') || clean.includes('lower')) return 'Basement';
    if (clean.includes('second') || clean.includes('2nd') || clean.includes('upper')) return 'Second Floor';
    if (clean.includes('attic')) return 'Attic';
  }
  return 'First Floor';
}

function modelSortRank(modelId: string): number {
  const lower = modelId.toLowerCase();
  if (lower.includes('gemini-4')) return 0;
  if (lower.includes('gemini-3')) return 1;
  if (lower.includes('gemini-2.5')) return 2;
  return 3;
}

/**
 * Fetches live Gemini model IDs supporting generateContent from Google's API or configured proxy.
 */
export async function fetchAvailableGeminiModels(
  config?: GeminiConnectionConfig
): Promise<{ ok: boolean; models: string[]; message: string }> {
  const cfg = config || cachedConfig;
  const proxy = cfg.proxyUrl?.trim();
  const key = cfg.apiKey.trim();

  if (!proxy && !key) {
    return {
      ok: false,
      models: [...DEFAULT_GEMINI_MODELS],
      message: 'Enter a Gemini API Key or Backend Proxy URL first.',
    };
  }

  const endpoint = proxy
    ? `${proxy}${proxy.includes('?') ? '&' : '?'}action=models`
    : `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;

  const headers: Record<string, string> = {};
  if (proxy && key) {
    headers.Authorization = `Bearer ${key}`;
  }

  try {
    const response = await fetch(endpoint, { method: 'GET', headers });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return {
        ok: false,
        models: [...DEFAULT_GEMINI_MODELS],
        message: `HTTP ${response.status} listing models${errBody ? `: ${errBody.slice(0, 140)}` : ''}`,
      };
    }

    const data = (await response.json()) as {
      models?: Array<{ name?: string; supportedGenerationMethods?: string[] } | string>;
    };
    const rawList = data.models || [];
    const filtered: string[] = [];

    for (const entry of rawList) {
      if (typeof entry === 'string') {
        filtered.push(entry.replace(/^models\//, ''));
        continue;
      }
      const methods = entry.supportedGenerationMethods || [];
      if (!entry.name) continue;
      if (methods.length === 0 || methods.includes('generateContent')) {
        const cleanId = entry.name.replace(/^models\//, '');
        const lowerId = cleanId.toLowerCase();
        const isExcluded = ['tts', 'image', 'embedding', 'aqa', 'computer-use', 'robotics'].some(
          (token) => lowerId.includes(token)
        );
        if (cleanId.startsWith('gemini-') && !isExcluded) {
          filtered.push(cleanId);
        }
      }
    }

    const uniqueSorted = Array.from(new Set(filtered)).sort((a, b) => {
      const rankDiff = modelSortRank(a) - modelSortRank(b);
      if (rankDiff !== 0) return rankDiff;
      return a.localeCompare(b);
    });

    if (uniqueSorted.length === 0) {
      return {
        ok: false,
        models: [...DEFAULT_GEMINI_MODELS],
        message: 'Connected, but no generateContent Gemini models were returned.',
      };
    }

    return {
      ok: true,
      models: uniqueSorted,
      message: `Loaded ${uniqueSorted.length} live Gemini models.`,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Network error';
    return {
      ok: false,
      models: [...DEFAULT_GEMINI_MODELS],
      message: `Failed to fetch models: ${reason}`,
    };
  }
}

/**
 * Sends a structured JSON multimodal generateContent request via proxy URL or direct Gemini REST API.
 */
export async function callGeminiGenerateContent(params: {
  parts: GeminiInlinePart[];
  systemInstruction: string;
  config?: GeminiConnectionConfig;
}): Promise<string> {
  const cfg = params.config || cachedConfig;
  if (!cfg.enabled) {
    throw new Error('Gemini AI is disabled in settings.');
  }

  const proxy = cfg.proxyUrl?.trim();
  const key = cfg.apiKey.trim();
  const model = cfg.model.trim() || DEFAULT_GEMINI_MODELS[0];

  if (!proxy && !key) {
    throw new Error('Gemini API key or proxy URL is required.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  let endpoint: string;
  let bodyPayload: Record<string, unknown>;

  if (proxy) {
    endpoint = proxy;
    if (key) {
      headers.Authorization = `Bearer ${key}`;
    }
    bodyPayload = {
      model,
      systemInstruction: params.systemInstruction,
      parts: params.parts,
    };
  } else {
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(key)}`;
    bodyPayload = {
      systemInstruction: {
        parts: [{ text: params.systemInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: params.parts,
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    };
  }

  let response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(bodyPayload),
  });

  // Auto-resolve an available model on HTTP 404 (e.g. preview model unavailable on key)
  if (response.status === 404 && !proxy) {
    const modelsResult = await fetchAvailableGeminiModels(cfg);
    if (modelsResult.ok && modelsResult.models.length > 0) {
      const fallbackModel =
        modelsResult.models.find((m) => m !== model && m.includes('flash')) ||
        modelsResult.models[0];
      if (fallbackModel && fallbackModel !== model) {
        cachedConfig = { ...cachedConfig, model: fallbackModel };
        void saveGeminiConfig(cachedConfig);
        const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          fallbackModel
        )}:generateContent?key=${encodeURIComponent(key)}`;
        response = await fetch(fallbackEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload),
        });
      }
    }
  }

  // Compatibility retry on HTTP 400 (omitting systemInstruction & responseMimeType, avoiding specialized preview/tts/image models)
  if (response.status === 400 && !proxy) {
    const compatModel = /(tts|image|preview)/i.test(model) ? 'gemini-2.5-flash' : model;
    const compatEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      compatModel
    )}:generateContent?key=${encodeURIComponent(key)}`;
    const compatBodyPayload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: params.systemInstruction }, ...params.parts],
        },
      ],
      generationConfig: {
        temperature: 0.1,
      },
    };
    response = await fetch(compatEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(compatBodyPayload),
    });
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini request failed (HTTP ${response.status}): ${errText.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    text?: string;
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string; thought?: boolean }>;
      };
    }>;
  };

  if (typeof payload.text === 'string' && payload.text.trim()) {
    return stripMarkdownJsonFences(payload.text);
  }

  const rawParts = payload.candidates?.[0]?.content?.parts || [];
  const answerParts = rawParts.filter((p) => !p.thought);
  const partsToJoin = answerParts.length > 0 ? answerParts : rawParts;
  const partsText = partsToJoin
    .map((p) => p.text || '')
    .join('\n')
    .trim();

  if (!partsText) {
    throw new Error('Gemini returned an empty response payload.');
  }

  return stripMarkdownJsonFences(partsText);
}

function buildRoomContextText(roomContext?: RoomVoiceContext): string {
  if (!roomContext) return 'No room measurements supplied.';
  return `Active room context: Name="${roomContext.name || 'Room'}", Floor Area=${
    roomContext.floor_area_sqft ?? 'unknown'
  } SF, Net Wall Area=${roomContext.net_wall_area_sqft ?? 'unknown'} SF.`;
}

function parseVoiceDefectFromJson(
  rawJson: string,
  rawTranscript: string,
  fallbackConfidence: number
): ParsedVoiceDefect | null {
  try {
    const parsed = JSON.parse(rawJson) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;

    const quantityNum = Number(parsed.quantity);
    const quantity = Number.isFinite(quantityNum) && quantityNum > 0 ? quantityNum : 1;
    const confidenceNum = Number(parsed.confidence);
    const confidence =
      Number.isFinite(confidenceNum) && confidenceNum > 0 && confidenceNum <= 1
        ? confidenceNum
        : fallbackConfidence;

    const description =
      typeof parsed.description === 'string' && parsed.description.trim()
        ? parsed.description.trim()
        : rawTranscript;

    return {
      rawTranscript:
        typeof parsed.transcript === 'string' && parsed.transcript.trim()
          ? parsed.transcript.trim()
          : rawTranscript,
      action: normalizeScopeAction(parsed.action),
      quantity,
      unit: normalizeUnit(parsed.unit),
      trade_category: normalizeTradeCategory(parsed.trade_category),
      description,
      confidence,
    };
  } catch {
    return null;
  }
}

const VOICE_SYSTEM_PROMPT = `You are a residential rehab & appraisal scope parser for DataMesh Sprocket.
Convert the inspector's note into a single JSON object with keys:
- "action": one of "Keep", "Remove", "Replace", "Add"
- "trade_category": one of ${VALID_TRADE_CATEGORIES.map((t) => `"${t}"`).join(', ')}
- "quantity": positive number (use floor_area_sqft if the user refers to the whole floor, or net_wall_area_sqft for all walls when no explicit number is stated)
- "unit": one of "SF", "LF", "EA", "ALLOWANCE"
- "description": concise professional line-item description
- "confidence": number 0.0 to 1.0
Return valid JSON only.`;

/**
 * Normalizes natural-language inspection voice notes into a structured ParsedVoiceDefect via Gemini.
 */
export async function parseVoiceScopeWithGemini(
  transcript: string,
  roomContext?: RoomVoiceContext,
  config?: GeminiConnectionConfig,
  throwOnError: boolean = false
): Promise<ParsedVoiceDefect | null> {
  const cleaned = transcript.trim();
  if (!cleaned) return null;

  try {
    const jsonText = await callGeminiGenerateContent({
      systemInstruction: VOICE_SYSTEM_PROMPT,
      parts: [
        {
          text: `${buildRoomContextText(roomContext)}\nInspector note: "${cleaned}"`,
        },
      ],
      config,
    });
    const result = parseVoiceDefectFromJson(jsonText, cleaned, 0.92);
    if (!result && throwOnError) {
      throw new Error(`Gemini returned unparseable scope JSON: ${jsonText.slice(0, 140)}`);
    }
    return result;
  } catch (err) {
    console.warn('Gemini voice scope parse failed:', err);
    if (throwOnError) {
      throw err instanceof Error ? err : new Error(String(err));
    }
    return null;
  }
}

/**
 * Sends recorded browser audio (MediaRecorder data URL) to Gemini to transcribe and extract a defect item.
 */
export async function transcribeAndParseAudioWithGemini(
  audioDataUrl: string,
  roomContext?: RoomVoiceContext,
  config?: GeminiConnectionConfig
): Promise<{ transcript: string; defect: ParsedVoiceDefect | null }> {
  const inline = parseDataUrl(audioDataUrl);
  if (!inline) {
    throw new Error('Invalid recorded audio data URI.');
  }

  const audioSystemPrompt = `Listen to this property inspector audio clip and return a JSON object with:
- "transcript": verbatim text transcript of what the inspector spoke
- "action": one of "Keep", "Remove", "Replace", "Add"
- "trade_category": one of ${VALID_TRADE_CATEGORIES.map((t) => `"${t}"`).join(', ')}
- "quantity": positive number
- "unit": one of "SF", "LF", "EA", "ALLOWANCE"
- "description": concise scope description
- "confidence": number 0.0 to 1.0
Return valid JSON only.`;

  const jsonText = await callGeminiGenerateContent({
    systemInstruction: audioSystemPrompt,
    parts: [
      { text: `${buildRoomContextText(roomContext)}\nTranscribe and structure the defect note.` },
      { inlineData: inline },
    ],
    config,
  });

  const parsedObj = JSON.parse(jsonText) as Record<string, unknown>;
  const transcript =
    typeof parsedObj.transcript === 'string' && parsedObj.transcript.trim()
      ? parsedObj.transcript.trim()
      : 'Audio dictation';

  const defect = parseVoiceDefectFromJson(jsonText, transcript, 0.9);
  return { transcript, defect };
}

/**
 * Analyzes floorplan images or scanned property record PDF page images using Gemini Vision
 * and maps the extracted structure into a complete IngestionResult.
 */
export async function extractDocumentWithGeminiVision(
  params: {
    fileName: string;
    pageImages: string[];
    hintText?: string;
  },
  config?: GeminiConnectionConfig
): Promise<IngestionResult> {
  const imageParts: GeminiInlinePart[] = params.pageImages
    .slice(0, 3)
    .map(parseDataUrl)
    .filter((p): p is { mimeType: string; data: string } => p !== null)
    .map((inlineData) => ({ inlineData }));

  if (imageParts.length === 0 && !params.hintText?.trim()) {
    throw new Error('Provide at least one rendered page/floorplan image or hint text for Gemini Vision.');
  }

  const visionPrompt = `Analyze this property record card, architectural floorplan, or residential sketch.
Extract all visible address, parcel, valuation, quality/condition (Class 1 best to Class 6 poor), and interior room dimensions (or exterior building footprint if interior rooms are not shown).
Return a strict JSON object with keys:
{
  "project_name": string,
  "address": { "street": string, "city": string, "state": string, "zip": string },
  "baseline_quality": "Class 1"|"Class 2"|"Class 3"|"Class 4"|"Class 5"|"Class 6",
  "baseline_condition": "Class 1"|"Class 2"|"Class 3"|"Class 4"|"Class 5"|"Class 6",
  "metadata": {
    "parcel_id": string|null,
    "owner_name": string|null,
    "year_built": number|null,
    "total_living_area_reported_sqft": number|null,
    "lot_size_sqft": number|null,
    "appraised_total_value": number|null,
    "architectural_style": string|null
  },
  "rooms": [
    {
      "name": string,
      "level": "First Floor"|"Second Floor"|"Basement"|"Attic",
      "length_ft": number,
      "width_ft": number,
      "height_ft": number,
      "exclude_from_gla": boolean
    }
  ]
}`;

  const textPrompt = `Source file: ${params.fileName}${
    params.hintText?.trim() ? `\nAdditional extracted/manual text:\n${params.hintText.trim()}` : ''
  }`;

  const rawJson = await callGeminiGenerateContent({
    systemInstruction: visionPrompt,
    parts: [{ text: textPrompt }, ...imageParts],
    config,
  });

  const data = JSON.parse(rawJson) as Record<string, unknown>;
  const rawAddr = (data.address as Record<string, unknown> | undefined) || {};
  const address = {
    street: typeof rawAddr.street === 'string' && rawAddr.street.trim() ? rawAddr.street.trim() : '100 Main St',
    city: typeof rawAddr.city === 'string' && rawAddr.city.trim() ? rawAddr.city.trim() : 'Prairie Village',
    state: typeof rawAddr.state === 'string' && rawAddr.state.trim() ? rawAddr.state.trim() : 'KS',
    zip: typeof rawAddr.zip === 'string' && rawAddr.zip.trim() ? rawAddr.zip.trim() : '66208',
  };

  const baseline_quality = normalizeQualityClass(data.baseline_quality, 'Class 4');
  const baseline_condition = normalizeQualityClass(data.baseline_condition, 'Class 3') as ConditionClass;
  const rawMeta = (data.metadata as Record<string, unknown> | undefined) || {};
  const rawRooms = Array.isArray(data.rooms) ? (data.rooms as Array<Record<string, unknown>>) : [];

  const interior_rooms: RoomNode[] = [];
  let cursorX = 120;
  let cursorY = 120;

  for (const r of rawRooms) {
    const length_ft = Math.max(4, Math.min(200, Number(r.length_ft) || 14));
    const width_ft = Math.max(4, Math.min(200, Number(r.width_ft) || 12));
    const height_ft = Math.max(6, Math.min(30, Number(r.height_ft) || 9));
    const level = normalizeFloorLevel(r.level);
    const exclude_from_gla =
      typeof r.exclude_from_gla === 'boolean'
        ? r.exclude_from_gla
        : level === 'Basement' || level === 'Attic';

    const roomNode = createIngestedRoomNode({
      id: `ai-rm-${interior_rooms.length + 1}`,
      name: typeof r.name === 'string' && r.name.trim() ? r.name.trim() : `Room ${interior_rooms.length + 1}`,
      level,
      length_ft,
      width_ft,
      height_ft,
      x_in: cursorX,
      y_in: cursorY,
      node_type: exclude_from_gla ? 'accessory_structure' : 'interior_room',
      exclude_from_gla,
      quality_class: baseline_quality,
      condition_class: baseline_condition,
      zip: address.zip,
      city: address.city,
      state: address.state,
      source: `${params.fileName} (Gemini Vision)`,
    });

    interior_rooms.push(roomNode);
    cursorX += Math.round(length_ft * 12) + 12;
    if (cursorX > 920) {
      cursorX = 120;
      cursorY += Math.round(width_ft * 12) + 24;
    }
  }

  const reportedLivingArea =
    typeof rawMeta.total_living_area_reported_sqft === 'number' &&
    rawMeta.total_living_area_reported_sqft > 0
      ? rawMeta.total_living_area_reported_sqft
      : interior_rooms
          .filter((r) => !r.exclude_from_gla && (r.level === 'First Floor' || r.level === 'Second Floor'))
          .reduce((acc, r) => acc + r.floor_area_sqft, 0) || 1600;

  const has_clear_interior_rooms = interior_rooms.length >= 2;

  const exteriorLength = Math.max(20, Math.round(Math.sqrt(reportedLivingArea * 1.35)));
  const exteriorWidth = Math.max(16, Math.round(reportedLivingArea / exteriorLength));

  const exterior_footprint_rooms: RoomNode[] = [
    createIngestedRoomNode({
      id: `ai-fp-${Date.now()}`,
      name: 'Exterior Property Footprint',
      level: 'First Floor',
      length_ft: exteriorLength,
      width_ft: exteriorWidth,
      height_ft: 9,
      x_in: 180,
      y_in: 120,
      node_type: 'exterior_footprint',
      structure_code: 'EXT-SHELL',
      exclude_from_gla: false,
      area_override_sqft: reportedLivingArea,
      quality_class: baseline_quality,
      condition_class: baseline_condition,
      zip: address.zip,
      city: address.city,
      state: address.state,
      source: `${params.fileName} (Gemini Vision)`,
    }),
  ];

  const metadata: PropertyMetadata = {
    source_document_type: params.fileName.toLowerCase().endsWith('.pdf')
      ? 'architectural_floorplan'
      : 'image_sketch',
    source_file_name: params.fileName,
    ingestion_mode: has_clear_interior_rooms ? 'clear_interior_rooms' : 'exterior_footprint_only',
    ingestion_notes: `Extracted with Gemini Vision (${cfgOrModelLabel(config)}).`,
    parcel_id: typeof rawMeta.parcel_id === 'string' ? rawMeta.parcel_id : undefined,
    owner_name: typeof rawMeta.owner_name === 'string' ? rawMeta.owner_name : undefined,
    year_built: typeof rawMeta.year_built === 'number' ? rawMeta.year_built : undefined,
    total_living_area_reported_sqft: reportedLivingArea,
    lot_size_sqft: typeof rawMeta.lot_size_sqft === 'number' ? rawMeta.lot_size_sqft : undefined,
    appraised_total_value:
      typeof rawMeta.appraised_total_value === 'number' ? rawMeta.appraised_total_value : undefined,
    architectural_style:
      typeof rawMeta.architectural_style === 'string' ? rawMeta.architectural_style : undefined,
    blueprint_underlay_data_uri: params.pageImages[0],
  };

  return {
    document_type: metadata.source_document_type || 'image_sketch',
    document_label: 'Gemini Vision Multimodal Extraction',
    confidence: 0.93,
    recommended_mode: has_clear_interior_rooms ? 'clear_interior_rooms' : 'exterior_footprint_only',
    mode_reasoning: has_clear_interior_rooms
      ? `Gemini Vision detected ${interior_rooms.length} room polygons/dimensions.`
      : 'Gemini Vision extracted property metadata and exterior footprint.',
    project_name:
      typeof data.project_name === 'string' && data.project_name.trim()
        ? data.project_name.trim()
        : `Ingested — ${address.street}`,
    address,
    baseline_quality,
    baseline_condition,
    metadata,
    exterior_footprint_rooms,
    interior_rooms,
    has_clear_interior_rooms,
    raw_extracted_text: params.hintText,
  };
}

function cfgOrModelLabel(config?: GeminiConnectionConfig): string {
  return (config?.model || cachedConfig.model || DEFAULT_GEMINI_MODELS[0]).trim();
}
