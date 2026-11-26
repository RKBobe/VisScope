import React, { useState, useEffect } from 'react';
import { Compass, Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';

interface InviteGateProps {
  children: React.ReactNode;
}

export const InviteGate: React.FC<InviteGateProps> = ({ children }) => {
  const { setTier } = useSubscription();
  const [status, setStatus] = useState<'checking' | 'locked' | 'unlocked'>('unlocked');
  const [inviteCode, setInviteCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const checkAuthStatus = async () => {
      try {
        const res = await fetch('/api/auth/status', {
          method: 'GET',
          credentials: 'same-origin',
        });
        if (!res.ok) {
          // Dev server or offline PWA mode without auth endpoint -> stay unlocked
          if (active) setStatus('unlocked');
          return;
        }
        const data = (await res.json()) as {
          inviteGateEnabled?: boolean;
          authenticated?: boolean;
        };

        if (!active) return;

        if (data.inviteGateEnabled && !data.authenticated) {
          setStatus('locked');
        } else {
          setStatus('unlocked');
          if (data.inviteGateEnabled && data.authenticated) {
            setTier('team');
          }
        }
      } catch {
        // Offline or local dev without server.js -> allow offline PWA access
        if (active) setStatus('unlocked');
      }
    };

    checkAuthStatus();
    return () => {
      active = false;
    };
  }, [setTier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inviteCode.trim();
    if (!trimmed) {
      setErrorMsg('Please enter your internal pilot invite code.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ code: trimmed }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        authenticated?: boolean;
        error?: string;
      };

      if (res.ok && data.authenticated) {
        setTier('team');
        setStatus('unlocked');
      } else {
        setErrorMsg(data.error || 'Invalid invite code. Please check with your team administrator.');
      }
    } catch {
      setErrorMsg('Unable to verify invite code right now. Check your network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'unlocked') {
    return <>{children}</>;
  }

  return (
    <div className="w-screen h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-6 bg-slate-950/70 border-b border-slate-800 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-emerald-500 p-0.5 shadow-lg mb-3">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Compass className="w-6 h-6 text-sky-400" />
            </div>
          </div>
          <h1 className="text-lg font-extrabold text-white tracking-wide">
            Vis-<span className="text-sky-400 font-light">Scope</span>
          </h1>
          <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] bg-sky-950/80 text-sky-300 border border-sky-800/80 px-2.5 py-0.5 rounded-full font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Internal Invite-Only Pilot</span>
          </div>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            Enter your team invite access code to unlock the inspection workspace and AI proxy.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label
              htmlFor="invite-code-input"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              Invite Access Code
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="invite-code-input"
                type="password"
                autoFocus
                autoComplete="off"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter invite code..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 text-xs text-rose-300 bg-rose-950/50 border border-rose-800/70 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition"
          >
            <span>{isSubmitting ? 'Verifying...' : 'Unlock Pilot Workspace'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default InviteGate;
