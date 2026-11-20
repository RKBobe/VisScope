import {
  InspectionTemplateId,
  ProjectScopeType,
  QualityClass,
  ConditionClass,
  TradeCategory,
  ALL_TRADE_CATEGORIES,
  REMODEL_DEFAULT_TRADE_CATEGORIES,
} from '../../types/sprocket';

export interface InspectionTemplateDefinition {
  id: InspectionTemplateId;
  name: string;
  category: 'Appraisal & Valuation' | 'Renovation & Rehab' | 'Casualty & Insurance' | 'Transaction Due Diligence';
  badge: string;
  badge_color: string;
  description: string;
  project_type: ProjectScopeType;
  default_quality: QualityClass;
  default_condition: ConditionClass;
  default_included_trades: TradeCategory[];
  recommended_for: string;
  starter_rooms: Array<{
    name: string;
    level: 'First Floor' | 'Second Floor' | 'Basement' | 'Attic';
    length_ft: number;
    width_ft: number;
    height_ft: number;
  }>;
}

export const INSPECTION_TEMPLATES: InspectionTemplateDefinition[] = [
  {
    id: 'clean_appraisal',
    name: 'Clean Appraisal (As-Is Market Valuation)',
    category: 'Appraisal & Valuation',
    badge: 'Standard Appraisal',
    badge_color: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    description:
      'Standard market value inspection for lending, refinancing, or portfolio auditing. Appraises full property value and ANSI Z765 GLA without assuming ongoing construction.',
    project_type: 'clean_appraisal',
    default_quality: 'Class 4',
    default_condition: 'Class 3',
    default_included_trades: ALL_TRADE_CATEGORIES,
    recommended_for: 'Mortgage refinancing, purchase appraisals, portfolio valuation, and baseline inspections.',
    starter_rooms: [
      { name: 'Living Room', level: 'First Floor', length_ft: 20, width_ft: 16, height_ft: 9 },
      { name: 'Kitchen / Dining', level: 'First Floor', length_ft: 18, width_ft: 14, height_ft: 9 },
      { name: 'Primary Bedroom', level: 'First Floor', length_ft: 16, width_ft: 14, height_ft: 9 },
      { name: 'Bathroom', level: 'First Floor', length_ft: 10, width_ft: 8, height_ft: 9 },
    ],
  },
  {
    id: 'remodel_renovation',
    name: 'Remodel & Renovation (Rehab / Fix & Flip)',
    category: 'Renovation & Rehab',
    badge: 'Remodel Scope',
    badge_color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description:
      'Interior modernization, kitchen/bath remodels, cosmetic refreshes, and rehab scopes. Distinctly separates the active remodel budget from existing foundations and exterior walls.',
    project_type: 'remodel',
    default_quality: 'Class 3',
    default_condition: 'Class 4',
    default_included_trades: REMODEL_DEFAULT_TRADE_CATEGORIES,
    recommended_for: 'Fix & flip investors, home renovation loans, draw schedules, and contractor scopes of work.',
    starter_rooms: [
      { name: 'Kitchen (Remodel)', level: 'First Floor', length_ft: 18, width_ft: 16, height_ft: 9 },
      { name: 'Primary Bath (Remodel)', level: 'First Floor', length_ft: 12, width_ft: 10, height_ft: 9 },
      { name: 'Living Room (Flooring & Paint)', level: 'First Floor', length_ft: 20, width_ft: 16, height_ft: 9 },
    ],
  },
  {
    id: 'fire_damage',
    name: 'Fire Damage (Insurance Casualty Scope)',
    category: 'Casualty & Insurance',
    badge: 'Insurance Casualty',
    badge_color: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    description:
      'Post-casualty scope covering smoke remediation, burnt framing repairs, electrical rewiring, sheetrock tear-out, insulation, and finish reconstruction.',
    project_type: 'casualty_loss',
    default_quality: 'Class 4',
    default_condition: 'Class 5',
    default_included_trades: [
      'Framing',
      'Drywall',
      'Interior Wall Finish',
      'Electrical',
      'Painting',
      'Roofing',
      'Doors & Windows',
      'HVAC',
      'Carpet, Flooring',
      'Finish Carpentry',
    ],
    recommended_for: 'Insurance claim adjusters, casualty loss appraisals, remediation contractors, and lender loss mitigation.',
    starter_rooms: [
      { name: 'Fire Origin Zone', level: 'First Floor', length_ft: 16, width_ft: 14, height_ft: 9 },
      { name: 'Smoke Affected Area', level: 'First Floor', length_ft: 20, width_ft: 16, height_ft: 9 },
    ],
  },
  {
    id: 'flood_damage',
    name: 'Flood & Water Damage (Insurance Scope)',
    category: 'Casualty & Insurance',
    badge: 'Water Casualty',
    badge_color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    description:
      'Flood, pipe burst, and storm surge inspection. Focuses on bottom 4-foot drywall cuts, flooring extraction, mold remediation, vanity replacements, and subfloor drying.',
    project_type: 'casualty_loss',
    default_quality: 'Class 4',
    default_condition: 'Class 5',
    default_included_trades: [
      'Drywall',
      'Carpet, Flooring',
      'Cabinets',
      'Countertops',
      'Plumbing Fixtures',
      'Painting',
      'Doors & Windows',
      'Finish Carpentry',
      'Electrical',
    ],
    recommended_for: 'Flood insurance loss documentation, burst pipe casualty estimates, and FEMA disaster inspections.',
    starter_rooms: [
      { name: 'Flooded Lower Level', level: 'First Floor', length_ft: 24, width_ft: 16, height_ft: 9 },
      { name: 'Affected Bathroom', level: 'First Floor', length_ft: 10, width_ft: 8, height_ft: 9 },
    ],
  },
  {
    id: 'pre_purchase',
    name: 'Pre-Purchase (Buyer Inspection & Escrow)',
    category: 'Transaction Due Diligence',
    badge: 'Buyer Due Diligence',
    badge_color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description:
      'Home inspection & buyer due-diligence appraisal. Identifies deferred maintenance, aging HVAC/roofing, and generates an itemized repair credit / escrow list.',
    project_type: 'pre_purchase',
    default_quality: 'Class 4',
    default_condition: 'Class 4',
    default_included_trades: [
      'Roofing',
      'HVAC',
      'Plumbing Fixtures',
      'Electrical',
      'Doors & Windows',
      'Carpet, Flooring',
      'Painting',
      'Finish Carpentry',
    ],
    recommended_for: 'Home buyers, real estate agents, home inspectors, and escrow holdback negotiations.',
    starter_rooms: [
      { name: 'Main Level Living', level: 'First Floor', length_ft: 20, width_ft: 16, height_ft: 9 },
      { name: 'Kitchen & Mechanicals', level: 'First Floor', length_ft: 18, width_ft: 14, height_ft: 9 },
    ],
  },
  {
    id: 'pre_listing',
    name: 'Pre-Listing (Seller High-ROI Refresh)',
    category: 'Transaction Due Diligence',
    badge: 'Seller Refresh',
    badge_color: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    description:
      'Targeted pre-sale valuation. Focuses on high-return cosmetic updates: interior/exterior paint, luxury vinyl plank flooring, hardware, and minor staging punch-list items.',
    project_type: 'pre_listing',
    default_quality: 'Class 3',
    default_condition: 'Class 3',
    default_included_trades: [
      'Painting',
      'Carpet, Flooring',
      'Countertops',
      'Finish Carpentry',
      'Doors & Windows',
      'Plumbing Fixtures',
    ],
    recommended_for: 'Listing agents, sellers preparing a property for market, and light cosmetic pre-listing flips.',
    starter_rooms: [
      { name: 'Entry & Living', level: 'First Floor', length_ft: 20, width_ft: 16, height_ft: 9 },
      { name: 'Kitchen Refresh', level: 'First Floor', length_ft: 16, width_ft: 14, height_ft: 9 },
    ],
  },
  {
    id: 'new_construction',
    name: 'New Construction (Ground-Up Build)',
    category: 'Appraisal & Valuation',
    badge: 'Ground-Up RCN',
    badge_color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    description:
      'Complete ground-up structural Replacement Cost New (RCN). Calculates site excavation, concrete foundation, structural timber framing, roofing, and full mechanical envelope.',
    project_type: 'new_construction',
    default_quality: 'Class 3',
    default_condition: 'Class 1',
    default_included_trades: ALL_TRADE_CATEGORIES,
    recommended_for: 'Construction-to-permanent loans, architectural builder estimates, and ground-up cost approach appraisals.',
    starter_rooms: [
      { name: 'Great Room', level: 'First Floor', length_ft: 22, width_ft: 18, height_ft: 10 },
      { name: 'Kitchen & Pantry', level: 'First Floor', length_ft: 18, width_ft: 16, height_ft: 10 },
      { name: 'Primary Suite', level: 'First Floor', length_ft: 18, width_ft: 15, height_ft: 10 },
    ],
  },
];

export function getInspectionTemplate(
  templateId?: InspectionTemplateId
): InspectionTemplateDefinition {
  const match = INSPECTION_TEMPLATES.find((t) => t.id === templateId);
  return match || INSPECTION_TEMPLATES[0]; // Defaults to clean_appraisal
}

export function getDefaultTradeCategoriesForTemplate(
  templateId?: InspectionTemplateId
): TradeCategory[] {
  const tpl = getInspectionTemplate(templateId);
  return [...tpl.default_included_trades];
}
