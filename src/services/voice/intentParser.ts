import { DefectItem, ScopeAction, TradeCategory, RegionalCostIndex } from '../../types/sprocket';
import { getAdjustedUnitPrice } from '../math/valuation';

export interface ParsedVoiceDefect {
  rawTranscript: string;
  action: ScopeAction;
  quantity: number;
  unit: 'SF' | 'LF' | 'EA' | 'ALLOWANCE';
  trade_category: TradeCategory;
  description: string;
  confidence: number;
}

const TRADE_KEYWORD_MAP: Array<{
  keywords: string[];
  trade: TradeCategory;
  defaultUnit: 'SF' | 'LF' | 'EA' | 'ALLOWANCE';
}> = [
  {
    keywords: ['baseboard', 'trim', 'molding', 'casing', 'crown molding', 'finish carpentry', 'door trim'],
    trade: 'Finish Carpentry',
    defaultUnit: 'LF',
  },
  {
    keywords: ['drywall', 'sheetrock', 'gypsum', 'plaster', 'wallboard'],
    trade: 'Drywall',
    defaultUnit: 'SF',
  },
  {
    keywords: ['paint', 'painting', 'primer', 'touch up', 'repaint'],
    trade: 'Painting',
    defaultUnit: 'SF',
  },
  {
    keywords: ['carpet', 'flooring', 'hardwood', 'laminate', 'tile', 'vinyl', 'plank'],
    trade: 'Carpet, Flooring',
    defaultUnit: 'SF',
  },
  {
    keywords: ['cabinet', 'vanity', 'cupboard', 'drawer', 'kitchen cabinets'],
    trade: 'Cabinets',
    defaultUnit: 'LF',
  },
  {
    keywords: ['countertop', 'granite', 'quartz', 'laminate top'],
    trade: 'Countertops',
    defaultUnit: 'SF',
  },
  {
    keywords: ['faucet', 'toilet', 'sink', 'shower', 'tub', 'plumbing fixture', 'valve', 'pipe', 'plumbing'],
    trade: 'Plumbing Fixtures',
    defaultUnit: 'EA',
  },
  {
    keywords: ['door', 'window', 'slider', 'bifold', 'cased opening', 'pre-hung'],
    trade: 'Doors & Windows',
    defaultUnit: 'EA',
  },
  {
    keywords: ['outlet', 'switch', 'wiring', 'panel', 'breaker', 'light fixture', 'recessed light', 'electrical'],
    trade: 'Electrical',
    defaultUnit: 'EA',
  },
  {
    keywords: ['framing', 'stud', 'header', 'joist', 'rafter', 'sill plate'],
    trade: 'Framing',
    defaultUnit: 'SF',
  },
  {
    keywords: ['hvac', 'furnace', 'air conditioner', 'duct', 'thermostat', 'heat pump'],
    trade: 'HVAC',
    defaultUnit: 'EA',
  },
  {
    keywords: ['roof', 'shingle', 'underlayment', 'flashing'],
    trade: 'Roofing',
    defaultUnit: 'SF',
  },
  {
    keywords: ['siding', 'stucco', 'brick', 'exterior finish', 'fascia', 'soffit'],
    trade: 'Exterior Finish',
    defaultUnit: 'SF',
  },
];

/**
 * Normalizes action keywords to standard ScopeAction.
 */
function normalizeAction(rawAction: string): ScopeAction {
  const lower = rawAction.toLowerCase();
  if (lower === 'replace' || lower === 'fix' || lower === 'repair' || lower === 'patch') {
    return 'Replace';
  }
  if (lower === 'remove' || lower === 'demo' || lower === 'tear out') {
    return 'Remove';
  }
  if (lower === 'install' || lower === 'add' || lower === 'put in' || lower === 'mount') {
    return 'Add';
  }
  if (lower === 'keep' || lower === 'leave' || lower === 'maintain') {
    return 'Keep';
  }
  return 'Replace';
}

/**
 * Normalizes unit strings into standardized 'SF' | 'LF' | 'EA' | 'ALLOWANCE'.
 */
function normalizeUnit(rawUnit?: string): 'SF' | 'LF' | 'EA' | 'ALLOWANCE' {
  if (!rawUnit) return 'EA';
  const lower = rawUnit.toLowerCase().replace(/\s+/g, '');
  if (lower.includes('sq') || lower.includes('square') || lower === 'sf') {
    return 'SF';
  }
  if (lower.includes('lin') || lower.includes('lf') || lower === 'feet' || lower === 'ft') {
    return 'LF';
  }
  if (lower.includes('unit') || lower.includes('ea') || lower.includes('each') || lower.includes('piece')) {
    return 'EA';
  }
  if (lower.includes('allow') || lower.includes('lump')) {
    return 'ALLOWANCE';
  }
  return 'EA';
}

/**
 * Deterministic offline rule & regex voice intent parser for Xact-Scope push-to-talk.
 */
export function parseVoiceDefectTranscript(transcript: string): ParsedVoiceDefect | null {
  if (!transcript || transcript.trim().length === 0) {
    return null;
  }

  const clean = transcript.trim();

  // Pattern: /(replace|remove|install|fix|repair|patch|demo|add|keep)\s+(\d+(\.\d+)?)\s*(sq\s*ft|square\s*feet|sf|linear\s*feet|lf|feet|ft|units?|ea)?\s*(of\s*)?([a-z0-9\s\-]+)/i
  const regex =
    /\b(replace|remove|install|fix|repair|patch|demo|add|put\s+in|mount|keep)\s+(\d+(?:\.\d+)?)\s*(sq\s*ft|square\s*feet|sf|linear\s*feet|lf|feet|ft|units?|ea)?\s*(?:of\s+)?([a-z0-9\s\-]+)/i;

  const match = clean.match(regex);

  if (match) {
    const rawAction = match[1];
    const quantity = parseFloat(match[2]);
    const rawUnit = match[3];
    const rawItem = match[4].trim();

    const action = normalizeAction(rawAction);
    let matchedTrade: TradeCategory = 'Finish Carpentry';
    let unit = normalizeUnit(rawUnit);
    let confidence = 0.85;

    // Detect trade category from item text
    const lowerItem = rawItem.toLowerCase();
    for (const mapping of TRADE_KEYWORD_MAP) {
      if (mapping.keywords.some((kw) => lowerItem.includes(kw))) {
        matchedTrade = mapping.trade;
        if (!rawUnit) {
          unit = mapping.defaultUnit;
        }
        confidence = 0.95;
        break;
      }
    }

    return {
      rawTranscript: clean,
      action,
      quantity,
      unit,
      trade_category: matchedTrade,
      description: rawItem.charAt(0).toUpperCase() + rawItem.slice(1),
      confidence,
    };
  }

  // Fallback heuristic: check if action + item without explicit quantity
  const simpleActionMatch = clean.match(/\b(replace|remove|install|fix|repair|demo|add|paint)\s+(?:the\s+)?([a-z0-9\s\-]+)/i);
  if (simpleActionMatch) {
    const rawAction = simpleActionMatch[1];
    const rawItem = simpleActionMatch[2].trim();
    const action = normalizeAction(rawAction);
    let matchedTrade: TradeCategory = 'Painting';
    let unit: 'SF' | 'LF' | 'EA' | 'ALLOWANCE' = 'EA';
    let confidence = 0.72;

    const lowerItem = rawItem.toLowerCase();
    for (const mapping of TRADE_KEYWORD_MAP) {
      if (mapping.keywords.some((kw) => lowerItem.includes(kw))) {
        matchedTrade = mapping.trade;
        unit = mapping.defaultUnit;
        confidence = 0.80;
        break;
      }
    }

    return {
      rawTranscript: clean,
      action,
      quantity: 1,
      unit,
      trade_category: matchedTrade,
      description: rawItem.charAt(0).toUpperCase() + rawItem.slice(1),
      confidence,
    };
  }

  return null;
}

/**
 * Parses voice transcripts with deterministic local regex, and falls back to a structured
 * endpoint if confidence < 0.70 and network connectivity is active.
 */
export async function normalizeVoiceIntentWithFallback(
  transcript: string,
  cloudEndpointUrl?: string
): Promise<ParsedVoiceDefect | null> {
  const localParsed = parseVoiceDefectTranscript(transcript);

  // If local parsed with high confidence, return immediately (zero cost, zero latency)
  if (localParsed && localParsed.confidence >= 0.70) {
    return localParsed;
  }

  // If confidence < 0.70 or no match, check if online & cloud endpoint provided
  if (typeof navigator !== 'undefined' && navigator.onLine && cloudEndpointUrl) {
    try {
      const response = await fetch(cloudEndpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });

      if (response.ok) {
        const cloudData = await response.json();
        if (cloudData && cloudData.action && cloudData.trade_category) {
          return {
            rawTranscript: transcript,
            action: cloudData.action,
            quantity: cloudData.quantity || 1,
            unit: cloudData.unit || 'EA',
            trade_category: cloudData.trade_category,
            description: cloudData.description || transcript,
            confidence: cloudData.confidence || 0.90,
          };
        }
      }
    } catch (err) {
      console.warn('Cloud intent normalization fallback failed:', err);
    }
  }

  return localParsed;
}
export function createDefectFromVoice(
  parsed: ParsedVoiceDefect,
  costIndex: RegionalCostIndex
): DefectItem {
  const unitPrice = getAdjustedUnitPrice(
    parsed.trade_category,
    parsed.unit,
    costIndex
  );

  const totalCost = Number((parsed.quantity * unitPrice).toFixed(2));

  return {
    id: `defect-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    trade_category: parsed.trade_category,
    action: parsed.action,
    description: `${parsed.action} ${parsed.quantity} ${parsed.unit} of ${parsed.description}`,
    quantity: parsed.quantity,
    unit: parsed.unit,
    unit_price: unitPrice,
    total_cost: totalCost,
    is_verified: true,
  };
}
