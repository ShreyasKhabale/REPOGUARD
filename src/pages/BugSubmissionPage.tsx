import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bug,
  GitBranch,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { DEMO_BUG_PRESET } from '../data/demoData';
import { demoSimulator } from '../services/demoSimulator';
import { ApiError, repoguardApi } from '../services/repoguardApi';
import {
  AppView,
  DebuggingSession,
  ExecutionMode,
  RepositoryInfo,
} from '../types/repoguard';

interface BugSubmissionPageProps {
  mode: ExecutionMode;
  repositories: RepositoryInfo[];
  preselectedRepoId: string | null;
  onAnalysisStarted: (session: DebuggingSession) => void;
  onCreateDemoAnalysis: (params: {
    repositoryId: string;
    bugTitle: string;
    bugDescription: string;
    errorLog: string;
    language: string;
  }) => void;
  onNavigate: (view: AppView) => void;
}

const LANGUAGES = ['Python', 'TypeScript', 'JavaScript', 'Go', 'Rust', 'Java'];

export const BugSubmissionPage: React.FC<BugSubmissionPageProps> = ({
  mode,
  repositories,
  preselectedRepoId,
  onAnalysisStarted,
  onCreateDemoAnalysis,
  onNavigate,
}) => {
  const defaultRepo =
    repositories.find((r) => r.id === preselectedRepoId) ?? repositories[0] ?? null;

  const [repositoryId, setRepositoryId] = useState<string>(defaultRepo?.id ?? '');
  const [bugTitle, setBugTitle] = useState<string>(
    mode === ExecutionMode.DEMO ? DEMO_BUG_PRESET.bugTitle : ''
  );
  const [language, setLanguage] = useState<string>(defaultRepo?.language || 'Python');
  const [bugDescription, setBugDescription] = useState<string>(
    mode === ExecutionMode.DEMO ? DEMO_BUG_PRESET.bugDescription : ''
  );
  const [errorLog, setErrorLog] = useState<string>(
    mode === ExecutionMode.DEMO ? DEMO_BUG_PRESET.errorLog : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const nextRepo =
      repositories.find((r) => r.id === preselectedRepoId) ?? repositories[0] ?? null;
    setRepositoryId(nextRepo?.id ?? '');
    if (nextRepo?.language) {
      setLanguage(nextRepo.language);
    }
  }, [preselectedRepoId, repositories]);

  useEffect(() => {
    setErrorMessage(null);
    if (mode === ExecutionMode.LIVE_BACKEND) {
      setBugTitle('');
      setBugDescription('');
      setErrorLog('');
    } else {
      setBugTitle(DEMO_BUG_PRESET.bugTitle);
      setBugDescription(DEMO_BUG_PRESET.bugDescription);
      setErrorLog(DEMO_BUG_PRESET.errorLog);
      setLanguage(DEMO_BUG_PRESET.language);
    }
  }, [mode]);

  const selectedRepo = repositories.find((r) => r.id === repositoryId) ?? defaultRepo;

  const handleLoadDemoPreset = () => {
    setBugTitle(DEMO_BUG_PRESET.bugTitle);
    setBugDescription(DEMO_BUG_PRESET.bugDescription);
    setErrorLog(DEMO_BUG_PRESET.errorLog);
    setLanguage(DEMO_BUG_PRESET.language);
    setErrorMessage(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!selectedRepo) {
      setErrorMessage('Select a connected repository first before starting an analysis.');
      return;
    }
    if (bugTitle.trim().length < 5) {
      setErrorMessage('Provide a descriptive bug title (at least 5 characters).');
      return;
    }
    if (bugDescription.trim().length < 15 && errorLog.trim().length < 15) {
      setErrorMessage('Provide either a detailed bug description or an error log / stack trace.');
      return;
    }

    if (mode === ExecutionMode.DEMO) {
      setIsSubmitting(true);
      await demoSimulator.simulateStepDelay(450);
      setIsSubmitting(false);
      onCreateDemoAnalysis({
        repositoryId: selectedRepo.id,
        bugTitle: bugTitle.trim(),
        bugDescription: bugDescription.trim(),
        errorLog: errorLog.trim(),
        language,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await repoguardApi.startAnalysis({
        repositoryId: selectedRepo.id,
        bugTitle: bugTitle.trim(),
        bugDescription: bugDescription.trim(),
        errorLog: errorLog.trim(),
        language,
      });
      onAnalysisStarted(response.session);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setErrorMessage(
        apiErr
          ? apiErr.message
          : 'Failed to submit bug analysis to FastAPI backend. Please verify connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (repositories.length === 0) {
    return (
      <div className="p-10 rounded-lg border border-slate-800/90 bg-[#0B1220] text-center space-y-4">
        <Bug className="w-8 h-8 text-cyan-400 mx-auto" />
        <h1 className="font-display text-xl font-bold text-slate-100">
          Connect a repository before submitting a bug
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          REPOGUARD requires a backend-confirmed GitHub repository to inspect source files,
          reproduce failures, and run verification tests.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('repositories')}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
        >
          <span>Go to Repository Connection</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-100 tracking-tight">
            Submit Bug for Autonomous Analysis
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Provide the failure symptoms and raw stack trace so REPOGUARD can isolate the root
            cause and synthesize a testable repair.
          </p>
        </div>

        {mode === ExecutionMode.DEMO && (
          <button
            type="button"
            onClick={handleLoadDemoPreset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md border border-slate-700 bg-[#0B1220] text-cyan-300 hover:border-cyan-500/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample Python Bug</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 p-6 rounded-lg border border-slate-800/90 bg-[#0B1220] space-y-5"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label htmlFor="bug-repo-select" className="block text-xs font-semibold text-slate-300">
                Target Repository
              </label>
              <select
                id="bug-repo-select"
                value={selectedRepo?.id ?? ''}
                onChange={(e) => {
                  setRepositoryId(e.target.value);
                  const found = repositories.find((r) => r.id === e.target.value);
                  if (found?.language) setLanguage(found.language);
                }}
                className="w-full px-3.5 py-2.5 text-sm font-mono rounded-md border border-slate-700/80 bg-[#070B14] text-slate-100 focus:border-cyan-400"
              >
                {repositories.map((repo) => (
                  <option key={repo.id} value={repo.id}>
                    {repo.fullName} ({repo.defaultBranch})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bug-language" className="block text-xs font-semibold text-slate-300">
                Programming Language
              </label>
              <select
                id="bug-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-md border border-slate-700/80 bg-[#070B14] text-slate-100 focus:border-cyan-400"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bug-title" className="block text-xs font-semibold text-slate-300">
              Bug Title
            </label>
            <input
              id="bug-title"
              type="text"
              value={bugTitle}
              onChange={(e) => setBugTitle(e.target.value)}
              placeholder="e.g., Settlement batch fails with floating-point discrepancy and naive datetime TypeError"
              className="w-full px-3.5 py-2.5 text-sm rounded-md border border-slate-700/80 bg-[#070B14] text-slate-100 placeholder:text-slate-500 focus:border-cyan-400"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bug-description" className="block text-xs font-semibold text-slate-300">
              Detailed Bug Description &amp; Expected Behavior
            </label>
            <textarea
              id="bug-description"
              rows={4}
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              placeholder="Describe how the bug manifests, expected vs actual output, and relevant conditions..."
              className="w-full px-3.5 py-2.5 text-sm rounded-md border border-slate-700/80 bg-[#070B14] text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bug-error-log" className="block text-xs font-semibold text-slate-300">
              Error Log / Stack Trace / Failing Test Output
            </label>
            <textarea
              id="bug-error-log"
              rows={8}
              value={errorLog}
              onChange={(e) => setErrorLog(e.target.value)}
              placeholder="Paste pytest output, Python traceback, or CI runner logs..."
              className="w-full px-3.5 py-3 text-xs font-mono rounded-md border border-slate-700/80 bg-[#070B14] text-slate-200 placeholder:text-slate-500 focus:border-cyan-400 leading-5"
            />
          </div>

          {errorMessage && (
            <div className="p-4 rounded-md border border-rose-500/40 bg-rose-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-rose-500/40 hover:bg-rose-900/40 font-semibold shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-slate-400">
              Endpoint: <code className="font-mono text-slate-300">POST /api/analysis/start</code>
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Starting Analysis...</span>
                </>
              ) : (
                <>
                  <span>Analyze Bug</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Right Contextual Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          {selectedRepo && (
            <div className="p-5 rounded-lg border border-slate-800/90 bg-[#0B1220] space-y-3.5">
              <h2 className="font-display text-sm font-semibold text-slate-100">
                Selected Repository Target
              </h2>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/70">
                  <span className="text-slate-400">Repository</span>
                  <span className="font-mono text-cyan-300 truncate max-w-[190px]">
                    {selectedRepo.fullName}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/70">
                  <span className="text-slate-400">Branch / Commit</span>
                  <span className="font-mono text-slate-200 inline-flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                    {selectedRepo.defaultBranch} · {selectedRepo.commitSha}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-400">Test Runner</span>
                  <span className="font-mono text-slate-200">
                    {selectedRepo.testRunner ?? 'Auto-detected'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="p-5 rounded-lg border border-slate-800/90 bg-[#0B1220] space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
              <ShieldCheck className="w-4 h-4" />
              <span>What Happens After Submission</span>
            </div>
            <ol className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <li className="flex gap-2.5">
                <span className="font-mono text-cyan-400 tabular-nums shrink-0">01.</span>
                <span>Maps stack frames to candidate source files and functions.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="font-mono text-cyan-400 tabular-nums shrink-0">02.</span>
                <span>Reproduces the baseline test failure prior to patching.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="font-mono text-cyan-400 tabular-nums shrink-0">03.</span>
                <span>Generates a minimal diff patch marked NOT VERIFIED.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="font-mono text-cyan-400 tabular-nums shrink-0">04.</span>
                <span>Requires your explicit approval before executing verification tests.</span>
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
};
