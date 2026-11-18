import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import {
  SubscriptionTier,
  FeatureKey,
  TIER_ENTITLEMENTS,
  SUBSCRIPTION_PLANS,
  SubscriptionPlan,
} from '../types/subscription';

const STORAGE_TIER_KEY = 'vis_scope_subscription_tier_v1';

interface SubscriptionContextValue {
  tier: SubscriptionTier;
  plan: SubscriptionPlan;
  setTier: (tier: SubscriptionTier) => void;
  hasAccess: (feature: FeatureKey) => boolean;
  isUpgradeModalOpen: boolean;
  upgradeContextFeature: FeatureKey | null;
  openUpgradeModal: (feature?: FeatureKey) => void;
  closeUpgradeModal: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export const SubscriptionProvider: React.FC<{
  children: React.ReactNode;
  initialTier?: SubscriptionTier;
}> = ({ children, initialTier }) => {
  const [tier, setTierState] = useState<SubscriptionTier>(() => {
    if (initialTier) return initialTier;
    try {
      if (typeof window !== 'undefined') {
        const stored = window.localStorage?.getItem?.(STORAGE_TIER_KEY);
        if (stored === 'starter' || stored === 'pro' || stored === 'team') {
          return stored;
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
};

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  return context || DEFAULT_FALLBACK_VALUE;
}
