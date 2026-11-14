import React, { useEffect, useState } from 'react';
import { Server, ShieldCheck, X } from 'lucide-react';
import { ExecutionMode } from '../types/repoguard';
import { getApiBaseUrl, getDefaultApiBaseUrl, setCustomApiBaseUrl } from '../services/repoguardApi';

interface BackendConfigModalProps {
  isOpen: boolean;
  mode: ExecutionMode;
  onModeChange: (mode: ExecutionMode) => void;
  onClose: () => void;
}

export const BackendConfigModal: React.FC<BackendConfigModalProps> = ({
  isOpen,
  mode,
  onModeChange,
  onClose,
}) => {
  const [draftMode, setDraftMode] = useState<ExecutionMode>(mode);
  const [urlInput, setUrlInput] = useState<string>(getApiBaseUrl());
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraftMode(mode);
      setUrlInput(getApiBaseUrl());
      setValidationError(null);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setCustomApiBaseUrl(null);
      setUrlInput(getDefaultApiBaseUrl());
      setValidationError(null);
      onModeChange(draftMode);
      onClose();
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setValidationError('Backend URL must start with http:// or https://');
        return;
      }
      setCustomApiBaseUrl(trimmed);
      setValidationError(null);
      onModeChange(draftMode);
      onClose();
    } catch {
      setValidationError('Enter a valid URL such as http://localhost:8000');
    }
  };

  const handleReset = () => {
    setCustomApiBaseUrl(null);
    setUrlInput(getDefaultApiBaseUrl());
    setValidationError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backend-config-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-lg border border-slate-800 bg-[#0B1220] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4 text-cyan-400" />
            <h2 id="backend-config-title" className="font-display text-base font-semibold text-slate-100">
              Execution Mode &amp; FastAPI Endpoint
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 transition-colors cursor-pointer"
            aria-label="Close configuration dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Runtime Source
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDraftMode(ExecutionMode.DEMO)}
                className={`p-3.5 rounded-md border text-left transition-colors cursor-pointer ${
                  draftMode === ExecutionMode.DEMO
                    ? 'bg-cyan-950/40 border-cyan-500/60 text-slate-100'
                    : 'bg-[#070B14] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-sm font-semibold">Demo Mode</div>
                <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Simulated Python ledger repo &amp; pytest verification flow.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDraftMode(ExecutionMode.LIVE_BACKEND)}
                className={`p-3.5 rounded-md border text-left transition-colors cursor-pointer ${
                  draftMode === ExecutionMode.LIVE_BACKEND
                    ? 'bg-blue-950/50 border-blue-500/60 text-slate-100'
                    : 'bg-[#070B14] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-sm font-semibold">Live FastAPI Backend</div>
                <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Calls external Python FastAPI endpoints for real execution.
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="api-base-url" className="block text-xs font-semibold text-slate-300">
              FastAPI Base URL (VITE_REPOGUARD_API_BASE_URL)
            </label>
            <input
              id="api-base-url"
              type="url"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="http://localhost:8000"
              className="w-full px-3.5 py-2.5 text-sm font-mono rounded-md border border-slate-700/80 bg-[#070B14] text-slate-100 placeholder:text-slate-500 focus:border-cyan-400"
            />
            {validationError && (
              <p className="text-xs text-rose-400">{validationError}</p>
            )}
            <p className="text-xs text-slate-400 leading-relaxed">
              Configured endpoints: <code className="text-slate-300">/api/repository/import</code>,{' '}
              <code className="text-slate-300">/api/analysis/start</code>,{' '}
              <code className="text-slate-300">/api/repair/generate</code>,{' '}
              <code className="text-slate-300">/api/repair/verify</code>, and{' '}
              <code className="text-slate-300">/api/report/{'{id}'}</code>.
            </p>
          </div>

          <div className="flex items-start gap-2.5 p-3.5 rounded-md border border-slate-800 bg-[#070B14] text-xs text-slate-300 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              No API keys or GitHub credentials are stored in the browser. Repository cloning and
              Docker test sandboxing run exclusively on the external Python FastAPI backend.
            </span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Reset to Env Default
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
