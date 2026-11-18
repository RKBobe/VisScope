import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import {
  SubscriptionTier,
  FeatureKey,
  TIER_ENTITLEMENTS,
  SUBSCRIPTION_PLANS,
  SubscriptionPlan,
} from '../types/subscription';

const STORAGE_TIER_KEY = 'vis_scope_subscription_tier_v1';
const PARTNER_ACCESS_KEY = 'vis_scope_partner_access_v1';

export const VALID_PARTNER_CODES = [
  'PARTNER',
  'VISPARTNER',
  'VIS-PARTNER',
  'VIP',
  'TEAM',
  'VIS-TEAM-2026',
];

interface SubscriptionContextValue {
  tier: SubscriptionTier;
  plan: SubscriptionPlan;
  setTier: (tier: SubscriptionTier) => void;
  hasAccess: (feature: FeatureKey) => boolean;
  isUpgradeModalOpen: boolean;
  upgradeContextFeature: FeatureKey | null;
  openUpgradeModal: (feature?: FeatureKey) => void;
  closeUpgradeModal: () => void;
  isPartner: boolean;
  unlockPartnerAccess: (code?: string) => boolean;
  revokePartnerAccess: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export const SubscriptionProvider: React.FC<{
  children: React.ReactNode;
  initialTier?: SubscriptionTier;
}> = ({ children, initialTier }) => {
  const [isPartner, setIsPartner] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        // 1. Check existing stored partner flag
        if (window.localStorage?.getItem?.(PARTNER_ACCESS_KEY) === 'true') {
          return true;
        }

        // 2. Check URL query parameters (e.g. ?partner=true, ?access=partner, ?tier=team, ?partner_code=...)
        if (window.location?.search) {
          const params = new URLSearchParams(window.location.search);
          const partnerParam = params.get('partner')?.toLowerCase();
          const vipParam = params.get('vip')?.toLowerCase();
          const accessParam = params.get('access')?.toLowerCase();
          const tierParam = params.get('tier')?.toLowerCase();
          const codeParam = (params.get('code') || params.get('partner_code') || '').trim().toUpperCase();

          const hasValidParam =
            partnerParam === 'true' ||
            partnerParam === '1' ||
            vipParam === 'true' ||
            accessParam === 'partner' ||
            tierParam === 'team' ||
            (codeParam.length > 0 &&
              (VALID_PARTNER_CODES.includes(codeParam) ||
                codeParam === (import.meta.env?.VITE_PARTNER_CODE || '').toUpperCase()));

          if (hasValidParam) {
            window.localStorage?.setItem?.(PARTNER_ACCESS_KEY, 'true');
            window.localStorage?.setItem?.(STORAGE_TIER_KEY, 'team');

            // Clean query parameters from address bar cleanly
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete('partner');
              url.searchParams.delete('vip');
              url.searchParams.delete('access');
              url.searchParams.delete('tier');
              url.searchParams.delete('code');
              url.searchParams.delete('partner_code');
              window.history.replaceState(
                {},
                document.title,
                url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash
              );
            } catch {
              // Ignore history error
            }
            return true;
          }
        }
      }
    } catch {
      // Ignore storage/search error
    }
    return false;
  });

  const [tier, setTierState] = useState<SubscriptionTier>(() => {
    if (initialTier) return initialTier;
    if (isPartner) return 'team';

    try {
      if (typeof window !== 'undefined') {
        if (window.localStorage?.getItem?.(PARTNER_ACCESS_KEY) === 'true') {
          return 'team';
        }

        const stored = window.localStorage?.getItem?.(STORAGE_TIER_KEY);
        if (stored === 'starter' || stored === 'pro' || stored === 'team') {
          return stored;
        }

        // Check if an instance default tier was injected (e.g. VITE_DEFAULT_TIER=team)
        const envDefault = import.meta.env?.VITE_DEFAULT_TIER;
        if (envDefault === 'pro' || envDefault === 'team') {
          return envDefault;
        }
      }
    } catch {
      // Fallback on storage errors
    }
    return 'starter';
  });

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeContextFeature, setUpgradeContextFeature] = useState<FeatureKey | null>(null);

  const setTier = useCallback((newTier: SubscriptionTier) => {
    setTierState(newTier);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage?.setItem?.(STORAGE_TIER_KEY, newTier);
      }
    } catch {
      // Ignore
    }
  }, []);

  const hasAccess = useCallback(
    (feature: FeatureKey): boolean => {
      const tierEntitlements = TIER_ENTITLEMENTS[tier];
      return Boolean(tierEntitlements && tierEntitlements[feature]);
    },
    [tier]
  );

  const openUpgradeModal = useCallback((feature?: FeatureKey) => {
    setUpgradeContextFeature(feature || null);
    setIsUpgradeModalOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(false);
    setUpgradeContextFeature(null);
  }, []);

  const unlockPartnerAccess = useCallback((enteredCode?: string): boolean => {
    const normalized = (enteredCode || '').trim().toUpperCase();
    const envCode = (import.meta.env?.VITE_PARTNER_CODE || '').trim().toUpperCase();

    const isValid =
      !enteredCode ||
      VALID_PARTNER_CODES.includes(normalized) ||
      (envCode.length > 0 && normalized === envCode);

    if (isValid) {
      setIsPartner(true);
      setTierState('team');
      try {
        if (typeof window !== 'undefined') {
          window.localStorage?.setItem?.(PARTNER_ACCESS_KEY, 'true');
          window.localStorage?.setItem?.(STORAGE_TIER_KEY, 'team');
        }
      } catch {
        // Ignore
      }
      return true;
    }
    return false;
  }, []);

  const revokePartnerAccess = useCallback(() => {
    setIsPartner(false);
    setTierState('starter');
    try {
      if (typeof window !== 'undefined') {
        window.localStorage?.removeItem?.(PARTNER_ACCESS_KEY);
        window.localStorage?.setItem?.(STORAGE_TIER_KEY, 'starter');
      }
    } catch {
      // Ignore
    }
  }, []);

  const plan = useMemo(() => SUBSCRIPTION_PLANS[tier], [tier]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      tier,
      plan,
      setTier,
      hasAccess,
      isUpgradeModalOpen,
      upgradeContextFeature,
      openUpgradeModal,
      closeUpgradeModal,
      isPartner,
      unlockPartnerAccess,
      revokePartnerAccess,
    }),
    [
      tier,
      plan,
      setTier,
      hasAccess,
      isUpgradeModalOpen,
      upgradeContextFeature,
      openUpgradeModal,
      closeUpgradeModal,
      isPartner,
      unlockPartnerAccess,
      revokePartnerAccess,
    ]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

const DEFAULT_FALLBACK_VALUE: SubscriptionContextValue = {
  tier: 'starter',
  plan: SUBSCRIPTION_PLANS.starter,
  setTier: () => {},
  hasAccess: (feature: FeatureKey) => TIER_ENTITLEMENTS.starter[feature] ?? false,
  isUpgradeModalOpen: false,
  upgradeContextFeature: null,
  openUpgradeModal: () => {},
  closeUpgradeModal: () => {},
  isPartner: false,
  unlockPartnerAccess: () => false,
  revokePartnerAccess: () => {},
};

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  return context || DEFAULT_FALLBACK_VALUE;
}
