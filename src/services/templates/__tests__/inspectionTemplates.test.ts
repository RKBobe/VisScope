import { describe, it, expect } from 'vitest';
import {
  INSPECTION_TEMPLATES,
  getInspectionTemplate,
  getDefaultTradeCategoriesForTemplate,
} from '../inspectionTemplates';
import { STRUCTURAL_TRADE_CATEGORIES } from '../../../types/sprocket';

describe('Inspection Templates Engine', () => {
  it('provides all 7 industry-standard appraisal and inspection templates', () => {
    expect(INSPECTION_TEMPLATES).toHaveLength(7);

    const ids = INSPECTION_TEMPLATES.map((t) => t.id);
    expect(ids).toContain('clean_appraisal');
    expect(ids).toContain('remodel_renovation');
    expect(ids).toContain('fire_damage');
    expect(ids).toContain('flood_damage');
    expect(ids).toContain('pre_purchase');
    expect(ids).toContain('pre_listing');
    expect(ids).toContain('new_construction');

    const cleanTpl = getInspectionTemplate('clean_appraisal');
    expect(cleanTpl.name).toBe('Clean Appraisal (As-Is Market Valuation)');
    expect(STRUCTURAL_TRADE_CATEGORIES).toContain('Foundation');
  });

  it('excludes unnecessary structural trades from remodel scope by default', () => {
    const remodelTrades = getDefaultTradeCategoriesForTemplate('remodel_renovation');

    // Remodel should NOT include Excavation or Foundation by default
    expect(remodelTrades).not.toContain('Excavation');
    expect(remodelTrades).not.toContain('Foundation');

    // But should include interior remodel trades
    expect(remodelTrades).toContain('Cabinets');
    expect(remodelTrades).toContain('Countertops');
    expect(remodelTrades).toContain('Carpet, Flooring');
    expect(remodelTrades).toContain('Painting');
    expect(remodelTrades).toContain('Plumbing Fixtures');
  });

  it('includes full structural envelope for new construction', () => {
    const newConstTrades = getDefaultTradeCategoriesForTemplate('new_construction');

    expect(newConstTrades).toContain('Excavation');
    expect(newConstTrades).toContain('Foundation');
    expect(newConstTrades).toContain('Framing');
    expect(newConstTrades).toContain('Roofing');
    expect(newConstTrades).toContain('Exterior Finish');
  });

  it('tailors casualty templates appropriately', () => {
    const fireTrades = getDefaultTradeCategoriesForTemplate('fire_damage');
    expect(fireTrades).toContain('Framing');
    expect(fireTrades).toContain('Drywall');
    expect(fireTrades).toContain('Electrical');
    expect(fireTrades).not.toContain('Excavation');

    const floodTrades = getDefaultTradeCategoriesForTemplate('flood_damage');
    expect(floodTrades).toContain('Drywall');
    expect(floodTrades).toContain('Carpet, Flooring');
    expect(floodTrades).toContain('Cabinets');
    expect(floodTrades).not.toContain('Roofing');
  });
});
