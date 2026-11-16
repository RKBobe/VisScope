import React, { useEffect, useState } from 'react';
import {
  checkServerGeminiEnvStatus,
  clearStoredGeminiKey,
  DEFAULT_GEMINI_MODELS,
  fetchAvailableGeminiModels,
  GeminiConnectionConfig,
} from '../../services/ai/geminiClient';
import {
  X,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  KeyRound,
  Server,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

interface GeminiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GeminiConnectionConfig;
  onSaveConfig: (next: GeminiConnectionConfig) => void;
}

export const GeminiSettingsModal: React.FC<GeminiSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [draft, setDraft] = useState<GeminiConnectionConfig>(config);
  const [availableModels, setAvailableModels] = useState<string[]>(DEFAULT_GEMINI_MODELS);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [serverEnvConfigured, setServerEnvConfigured] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(config);
      setStatusMessage(null);
      if (config.model && !availableModels.includes(config.model)) {
        setAvailableModels((prev) => [config.model, ...prev]);
      }
      void checkServerGeminiEnvStatus(config.proxyUrl || '/api/gemini').then((res) => {
        setServerEnvConfigured(res.configured);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearKey = async () => {
    const cleared = await clearStoredGeminiKey();
    setDraft((prev) => ({
      ...prev,
      apiKey: '',
      enabled: serverEnvConfigured ? prev.enabled : false,
    }));
    onSaveConfig({
      ...cleared,
      apiKey: '',
    });
    setStatusMessage({
      ok: true,
      text: 'Browser session API key cleared from memory and sessionStorage.',
    });
  };

  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    setStatusMessage(null);
    const res = await fetchAvailableGeminiModels({
      ...draft,
      enabled: true,
    });
    if (res.ok && res.models.length > 0) {
      const merged = Array.from(new Set([...res.models, ...DEFAULT_GEMINI_MODELS]));
      setAvailableModels(merged);
      const bestModel = res.models.includes(draft.model) ? draft.model : res.models[0];
      const nextConfig: GeminiConnectionConfig = {
        ...draft,
        apiKey: draft.apiKey.trim(),
        model: bestModel,
        proxyUrl: draft.proxyUrl?.trim() || undefined,
        enabled: true,
      };
      setDraft(nextConfig);
      onSaveConfig(nextConfig);
      setStatusMessage({
        ok: true,
        text: `${res.message} Active model: ${bestModel} (saved).`,
      });
    } else {
      setStatusMessage({ ok: res.ok, text: res.message });
    }
    setIsFetchingModels(false);
  };

  const handleClose = () => {
    if (draft.apiKey.trim() && draft.apiKey.trim() !== config.apiKey.trim()) {
      onSaveConfig({
        ...draft,
        apiKey: draft.apiKey.trim(),
        model: draft.model.trim() || DEFAULT_GEMINI_MODELS[0],
        proxyUrl: draft.proxyUrl?.trim() || undefined,
        enabled: true,
      });
    }
    onClose();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      ...draft,
      apiKey: draft.apiKey.trim(),
      model: draft.model.trim() || DEFAULT_GEMINI_MODELS[0],
      proxyUrl: draft.proxyUrl?.trim() || undefined,
    });
    onClose();
  };

  const selectOptions = Array.from(
    new Set([draft.model, ...availableModels].filter((m) => Boolean(m && m.trim())))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-500/15 border border-violet-500/30 rounded-xl text-violet-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Gemini Multimodal AI Adapter
                <span className="text-[10px] font-mono bg-violet-950 text-violet-300 border border-violet-800 px-2 py-0.5 rounded-full">
                  Hybrid Direct / Proxy
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Powers Floorplan Vision OCR, natural-language scope normalization, and MediaRecorder audio transcription
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          {/* Enable Switch */}
          <label className="flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 cursor-pointer">
            <div>
              <div className="font-semibold text-white">Enable Gemini Multimodal AI</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Automatically assist when regex voice parsing confidence is low or when running Floorplan Vision
              </div>
            </div>
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500"
            />
          </label>

          {/* Server .env Status Banner */}
          {serverEnvConfigured && (
            <div className="bg-emerald-950/50 border border-emerald-800/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-emerald-300">
              <div className="flex items-center gap-2 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Server `.env` Key Active (`/api/gemini`)</span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700/80">
                Browser secret free
              </span>
            </div>
          )}

          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                Fallback Browser Key (ephemeral sessionStorage — cleared on tab close)
              </label>
              {draft.apiKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold transition"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear Key
                </button>
              )}
            </div>
            <input
              type="password"
              placeholder={
                serverEnvConfigured
                  ? 'Optional — leave blank to use server .env GEMINI_API_KEY'
                  : 'AIza... (or configure GEMINI_API_KEY in .env for server proxy)'
              }
              value={draft.apiKey}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  apiKey: e.target.value,
                  enabled: e.target.value.trim() ? true : draft.enabled,
                })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-violet-400 focus:outline-none"
            />
          </div>

          {/* Model Selection + Live /v1beta/models Refresh */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold">Gemini Model ID</label>
              <button
                type="button"
                onClick={handleFetchModels}
                disabled={isFetchingModels}
                className="text-[11px] bg-violet-950 hover:bg-violet-900 disabled:opacity-50 text-violet-300 border border-violet-700/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-semibold transition"
              >
                <RefreshCw className={`w-3 h-3 ${isFetchingModels ? 'animate-spin' : ''}`} />
                {isFetchingModels ? 'Fetching Models...' : 'Fetch Live Models / Test Key'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={draft.model}
                onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono focus:border-violet-400 focus:outline-none"
              >
                {selectOptions.map((modelId) => (
                  <option key={modelId} value={modelId}>
                    {modelId}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Or enter custom model ID"
                value={draft.model}
                onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-sky-300 font-mono focus:border-violet-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Optional Proxy Endpoint */}
          <div>
            <label className="text-slate-300 font-semibold flex items-center gap-1.5 mb-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              Optional Backend Proxy URL (Option C Production Route)
            </label>
            <input
              type="text"
              placeholder="e.g. /api/gemini or https://your-api.example.com/gemini"
              value={draft.proxyUrl || ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  proxyUrl: e.target.value,
                  enabled: e.target.value.trim() ? true : draft.enabled,
                })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-400 focus:outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              When populated, requests route through your proxy URL instead of calling generativelanguage.googleapis.com directly from the browser.
            </p>
          </div>

          {statusMessage && (
            <div
              className={`px-3 py-2 rounded-lg border text-[11px] flex items-center gap-2 ${
                statusMessage.ok
                  ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                  : 'bg-amber-950/50 border-amber-800 text-amber-300'
              }`}
            >
              {statusMessage.ok && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition"
            >
              Save Gemini Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
