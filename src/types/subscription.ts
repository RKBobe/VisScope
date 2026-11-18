export type SubscriptionTier = 'starter' | 'pro' | 'team';

export type SubscriptionInterval = 'month' | 'year';

export type FeatureKey =
  | 'export_meshengine_zip'
  | 'export_pdf_unwatermarked'
  | 'download_procurement_csv'
  | 'server_gemini_ai'
  | 'cloud_sync'
  | 'team_workspace'
  | 'custom_pricing_overrides';

export interface PlanFeature {
  label: string;
  included: boolean;
  tooltip?: string;
}

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceAnnual: number;
  badge?: string;
  highlighted?: boolean;
  ctaLabel: string;
  features: PlanFeature[];
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    tagline: 'Essential parametric floor plan sketching and local field estimation.',
    priceMonthly: 0,
    priceAnnual: 0,
    ctaLabel: 'Current Plan',
    features: [
      { label: 'Unlimited 2D Vector Canvas & 1-ft Snapping', included: true },
      { label: 'ANSI Z765 Outer Shell Auto-Buffer', included: true },
      { label: 'Craftsman National Cost Baseline Engine', included: true },
      { label: 'Offline Push-to-Talk Voice Scoping', included: true },
      { label: 'Local Browser Storage (IndexedDB)', included: true },
      { label: 'Gemini AI via Client BYOK Key Only', included: true },
      { label: 'Printable PDF Inspection Report (Watermarked)', included: true },
      { label: 'MeshEngine Drop Bundle (.ZIP with UAD 3.6 XML)', included: false },
      { label: "Lowe's B2B Aisle/Bay Procurement CSV Download", included: false },
      { label: 'Cloud Project Backup & Multi-Device Sync', included: false },
    ],
  },
  pro: {
    id: 'pro',
    name: 'Professional',
    tagline: 'For independent appraisers, home inspectors, and general contractors.',
    priceMonthly: 39,
    priceAnnual: 390,
    badge: 'Most Popular',
    highlighted: true,
    ctaLabel: 'Upgrade to Pro',
    features: [
      { label: 'Everything in Starter', included: true },
      { label: 'MeshEngine Drop Bundle (.ZIP with UAD 3.6 XML & SVG)', included: true },
      { label: 'Clean, Unwatermarked PDF Reports with Custom Credentials', included: true },
      { label: "Lowe's B2B Aisle & Bay Routed CSV Download", included: true },
      { label: 'Regional Zip Code Multipliers (Craftsman 27 Trades)', included: true },
      { label: 'Included Server Gemini AI (50 floor plan/voice scans/mo)', included: true },
      { label: 'Cloud Project Backup & Device Restore', included: true },
      { label: 'Priority Support & Regular Price Index Updates', included: true },
    ],
  },
  team: {
    id: 'team',
    name: 'Team / Firm',
    tagline: 'For appraisal management companies, inspection crews, and regional builders.',
    priceMonthly: 149,
    priceAnnual: 1490,
    badge: '5 Seats Included',
    ctaLabel: 'Upgrade to Team',
    features: [
      { label: 'Everything in Professional', included: true },
      { label: '5 Team Inspector Seats Included ($25/mo per extra seat)', included: true },
      { label: 'Centralized Team Project Repository & Permissions', included: true },
      { label: 'Custom Labor & Material Cost Multiplier Overrides', included: true },
      { label: 'High-Volume / Unlimited Server Gemini AI Processing', included: true },
      { label: 'Direct MeshEngine API / Webhook Automation', included: true },
      { label: 'Dedicated Account Manager & SLA Guarantee', included: true },
    ],
  },
};

export const TIER_ENTITLEMENTS: Record<SubscriptionTier, Record<FeatureKey, boolean>> = {
  starter: {
    export_meshengine_zip: false,
    export_pdf_unwatermarked: false,
    download_procurement_csv: false,
    server_gemini_ai: false,
    cloud_sync: false,
    team_workspace: false,
    custom_pricing_overrides: false,
  },
  pro: {
    export_meshengine_zip: true,
    export_pdf_unwatermarked: true,
    download_procurement_csv: true,
    server_gemini_ai: true,
    cloud_sync: true,
    team_workspace: false,
    custom_pricing_overrides: false,
  },
  team: {
    export_meshengine_zip: true,
    export_pdf_unwatermarked: true,
    download_procurement_csv: true,
    server_gemini_ai: true,
    cloud_sync: true,
    team_workspace: true,
    custom_pricing_overrides: true,
  },
};
