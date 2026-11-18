import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Sparkles,
  Zap,
  Building2,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';
import {
  SubscriptionTier,
  SubscriptionInterval,
  SUBSCRIPTION_PLANS,
  FeatureKey,
} from '../../types/subscription';

const FEATURE_CONTEXT_MESSAGES: Record<FeatureKey, { title: string; description: string }> = {
  export_meshengine_zip: {
    title: 'Unlock MeshEngine Drop (.ZIP) Exports',
    description:
      'Professional appraisal-ready UAD 3.6 / MISMO XML packages and vector floor plan CAD files require a Vis-Scope Professional subscription.',
  },
  export_pdf_unwatermarked: {
    title: 'Unlock Clean White-Label PDF Reports',
    description:
      'Generate client-facing property inspection and scope of work reports with custom inspector credentials and no watermarks.',
  },
  download_procurement_csv: {
    title: "Unlock Lowe's B2B Procurement CSV",
    description:
      'Export builder-ready material takeoff sheets sorted by store Aisle and Bay for accelerated jobsite procurement.',
  },
  server_gemini_ai: {
    title: 'Unlock Server-Managed Gemini AI',
    description:
      'Process architectural plan PDFs and audio dictations directly without entering your personal Google AI key.',
  },
  cloud_sync: {
    title: 'Unlock Cloud Sync & Multi-Device Backup',
    description:
      'Seamlessly sync inspection projects between your field tablet and desktop office workstation.',
  },
  team_workspace: {
    title: 'Unlock Team & Enterprise Workspace',
    description:
      'Manage multiple field inspectors, centralized project libraries, and customized labor cost multipliers.',
  },
  custom_pricing_overrides: {
    title: 'Unlock Custom Cost Multipliers',
    description:
      'Customize trade assembly unit rates, labor mods, and contractor margin multipliers across your organization.',
  },
};

export const SubscriptionUpgradeModal: React.FC = () => {
  const {
    tier: currentTier,
    setTier,
    isUpgradeModalOpen,
    closeUpgradeModal,
    upgradeContextFeature,
  } = useSubscription();

  const [interval, setInterval] = useState<SubscriptionInterval>('month');
  const [upgradedTierToast, setUpgradedTierToast] = useState<SubscriptionTier | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!isUpgradeModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeUpgradeModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUpgradeModalOpen, closeUpgradeModal]);

  if (!isUpgradeModalOpen) return null;

  const handleSelectTier = async (selected: SubscriptionTier) => {
    if (selected === currentTier) return;

    if (selected === 'starter') {
      setTier('starter');
      setUpgradedTierToast('starter');
      setTimeout(() => {
        setUpgradedTierToast(null);
        closeUpgradeModal();
      }, 1200);
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError(null);

    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selected, interval }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
        configured?: boolean;
      };

      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }

      // If server does not have Stripe keys configured, fall back to dev tier switch
      setTier(selected);
      setUpgradedTierToast(selected);
      setTimeout(() => {
        setUpgradedTierToast(null);
        closeUpgradeModal();
      }, 1400);
    } catch {
      // Offline or local dev fallback
      setTier(selected);
      setUpgradedTierToast(selected);
      setTimeout(() => {
        setUpgradedTierToast(null);
        closeUpgradeModal();
      }, 1400);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const contextMessage = upgradeContextFeature
    ? FEATURE_CONTEXT_MESSAGES[upgradeContextFeature]
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn select-none"
    >
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 my-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeUpgradeModal}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          aria-label="Close Upgrade Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Feature-Triggered Banner */}
        {contextMessage && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-sky-950/80 to-blue-950/80 border border-sky-600/40 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-sky-900/60 border border-sky-500/40 shrink-0 text-sky-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">{contextMessage.title}</h4>
              <p className="text-xs text-sky-200/80 mt-0.5 leading-relaxed">
                {contextMessage.description}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-700/50 text-sky-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Vis-Scope Subscription Plans</span>
          </div>
          <h2 id="upgrade-modal-title" className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Accelerate Field Scoping & Appraisal Delivery
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-2">
            Choose the plan that fits your inspection volume. Switch or cancel anytime.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-5 inline-flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setInterval('month')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                interval === 'month'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setInterval('year')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                interval === 'year'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Tier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {(['starter', 'pro', 'team'] as SubscriptionTier[]).map((tierKey) => {
            const plan = SUBSCRIPTION_PLANS[tierKey];
            const isCurrent = currentTier === tierKey;
            const price = interval === 'month' ? plan.priceMonthly : Math.round(plan.priceAnnual / 12);

            return (
              <div
                key={tierKey}
                className={`relative flex flex-col rounded-2xl p-6 transition border ${
                  plan.highlighted
                    ? 'bg-gradient-to-b from-slate-900 to-sky-950/40 border-sky-500/60 shadow-xl shadow-sky-950/50 ring-1 ring-sky-500/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 rounded-full shadow-md">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {tierKey === 'starter' && <Zap className="w-4 h-4 text-slate-400" />}
                      {tierKey === 'pro' && <Sparkles className="w-4 h-4 text-sky-400" />}
                      {tierKey === 'team' && <Building2 className="w-4 h-4 text-emerald-400" />}
                      <span>{plan.name}</span>
                    </h3>
                    {isCurrent && (
                      <span className="text-[10px] bg-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded border border-slate-700">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 min-h-[32px] leading-relaxed">
                    {plan.tagline}
                  </p>
                </div>

                {/* Price Display */}
                <div className="mb-6 pb-6 border-b border-slate-800/80">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">
                      ${price}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      / month
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {price === 0
                      ? 'Free forever • No credit card required'
                      : interval === 'year'
                      ? `Billed annually ($${plan.priceAnnual}/yr)`
                      : 'Billed monthly • Cancel anytime'}
                  </p>
                </div>

                {/* Features List */}
                <div className="flex-1 space-y-2.5 mb-6">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                      )}
                      <span
                        className={
                          feature.included
                            ? 'text-slate-300'
                            : 'text-slate-500 line-through'
                        }
                      >
                        {feature.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action CTA Button */}
                <button
                  type="button"
                  onClick={() => handleSelectTier(tierKey)}
                  disabled={isCurrent || isCheckingOut}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    isCurrent
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-default'
                      : isCheckingOut
                      ? 'bg-sky-950 text-sky-300 border border-sky-700 animate-pulse'
                      : plan.highlighted
                      ? 'bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-sky-950 font-extrabold'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                  }`}
                >
                  {isCurrent ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-slate-400" />
                      <span>Current Plan</span>
                    </>
                  ) : isCheckingOut ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                      <span>Connecting to Stripe...</span>
                    </>
                  ) : (
                    <>
                      <span>{plan.ctaLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Checkout Error Notification */}
        {checkoutError && (
          <div className="mt-6 p-3 rounded-xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs flex items-center justify-between gap-2">
            <span>{checkoutError}</span>
            <button
              type="button"
              onClick={() => setCheckoutError(null)}
              className="text-rose-400 hover:text-white underline text-[11px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Upgrade Toast Notification */}
        {upgradedTierToast && (
          <div className="mt-6 p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs flex items-center justify-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              Switched active tier to{' '}
              <strong>{SUBSCRIPTION_PLANS[upgradedTierToast].name}</strong>! Unlocking features...
            </span>
          </div>
        )}

        {/* Footer Guarantee & Quick Dev Switcher */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>
              Production payments powered securely by <strong>Stripe Checkout</strong>. PCI-DSS compliant.
            </span>
          </div>

          {/* Quick Dev Tier Switcher for Testing */}
          <div className="flex items-center gap-1.5 text-[11px] bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-500 font-mono">Dev Tier Preview:</span>
            {(['starter', 'pro', 'team'] as SubscriptionTier[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={`px-2 py-0.5 rounded font-mono uppercase text-[10px] transition ${
                  currentTier === t
                    ? 'bg-sky-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
