import { describe, it, expect } from 'vitest';
import { parseVoiceDefectTranscript, createDefectFromVoice } from '../intentParser';
import { PRAIRIE_VILLAGE_COST_INDEX } from '../../math/valuation';

describe('Xact-Scope Voice Intent Parser', () => {
  it('parses baseboard replacement phrase correctly', () => {
    const input = 'Replace 40 linear feet of baseboard';
    const parsed = parseVoiceDefectTranscript(input);
    expect(parsed).not.toBeNull();
    expect(parsed?.action).toBe('Replace');
    expect(parsed?.quantity).toBe(40);
    expect(parsed?.unit).toBe('LF');
    expect(parsed?.trade_category).toBe('Finish Carpentry');
    expect(parsed?.description.toLowerCase()).toContain('baseboard');
    expect(parsed?.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('parses carpet removal with square feet unit', () => {
    const input = 'Remove 150 square feet of carpet';
    const parsed = parseVoiceDefectTranscript(input);
    expect(parsed).not.toBeNull();
    expect(parsed?.action).toBe('Remove');
    expect(parsed?.quantity).toBe(150);
    expect(parsed?.unit).toBe('SF');
    expect(parsed?.trade_category).toBe('Carpet, Flooring');
  });

  it('parses plumbing fixtures addition with units abbreviation', () => {
    const input = 'Install 2 ea plumbing fixtures';
    const parsed = parseVoiceDefectTranscript(input);
    expect(parsed).not.toBeNull();
    expect(parsed?.action).toBe('Add');
    expect(parsed?.quantity).toBe(2);
    expect(parsed?.unit).toBe('EA');
    expect(parsed?.trade_category).toBe('Plumbing Fixtures');
  });

  it('parses drywall repair with abbreviated sf unit', () => {
    const input = 'Fix 80 sf drywall';
    const parsed = parseVoiceDefectTranscript(input);
    expect(parsed).not.toBeNull();
    expect(parsed?.action).toBe('Replace');
    expect(parsed?.quantity).toBe(80);
    expect(parsed?.unit).toBe('SF');
    expect(parsed?.trade_category).toBe('Drywall');
  });

  it('generates a verified DefectItem with regional pricing', () => {
    const parsed = parseVoiceDefectTranscript('Replace 40 linear feet of baseboard')!;
    const defect = createDefectFromVoice(parsed, PRAIRIE_VILLAGE_COST_INDEX);
    expect(defect.is_verified).toBe(true);
    expect(defect.quantity).toBe(40);
    expect(defect.unit).toBe('LF');
    expect(defect.unit_price).toBeGreaterThan(0);
    expect(defect.total_cost).toBe(Number((40 * defect.unit_price).toFixed(2)));
  });
});
