import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCode2,
  GitBranch,
  Loader2,
  RefreshCw,
  Wrench,
  XCircle,
} from 'lucide-react';
import { SessionPipelineNav } from '../components/SessionPipelineNav';
import { RiskIndicator, StatusIndicator } from '../components/StatusIndicator';
import { demoSimulator } from '../services/demoSimulator';
import { ApiError, repoguardApi } from '../services/repoguardApi';
import {
  AppView,
  CodePatch,
  DebuggingSession,
  ExecutionMode,
  RepositoryInfo,
  StageStatus,
} from '../types/repoguard';

interface AnalysisWorkspacePageProps {
  mode: ExecutionMode;
  session: DebuggingSession | null;
  repository: RepositoryInfo | null;
  onSessionUpdated: (session: DebuggingSession) => void;
  onPatchGenerated: (sessionId: string, patch: CodePatch) => void;
  onTriggerDemoPatchGeneration: (sessionId: string) => void;
  onNavigate: (view: AppView) => void;
}

export const AnalysisWorkspacePage: React.FC<AnalysisWorkspacePageProps> = ({
  mode,
  session,
  repository,
  onSessionUpdated,
  onPatchGenerated,
  onTriggerDemoPatchGeneration,
  onNavigate,
}) => {
  const [isPolling, setIsPolling] = useState(false);
  const [isGeneratingPatch, setIsGeneratingPatch] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedAction, setLastFailedAction] = useState<'poll' | 'generate' | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  useEffect(() => {
    setSelectedFilePath(null);
    setErrorMessage(null);
    setLastFailedAction(null);
  }, [session?.id]);

  const handleRefreshAnalysis = useCallback(async () => {
    if (!session || mode === ExecutionMode.DEMO || session.isDemoData) return;
    setErrorMessage(null);
    setLastFailedAction(null);
    setIsPolling(true);
    try {
      const { session: updated } = await repoguardApi.getAnalysis({ analysisId: session.id });
      onSessionUpdated(updated);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setLastFailedAction('poll');
      setErrorMessage(apiErr ? apiErr.message : 'Unable to refresh analysis state from backend.');
    } finally {
      setIsPolling(false);
    }
  }, [mode, onSessionUpdated, session]);

  // Auto-poll live backend while early investigation stages are in progress
  useEffect(() => {
    if (!session || mode !== ExecutionMode.LIVE_BACKEND || session.isDemoData) return;
    const hasActiveEarlyStage = session.stages
      .slice(0, 4)
      .some((st) => st.status === StageStatus.RUNNING || st.status === StageStatus.PENDING);

    if (!hasActiveEarlyStage || session.rootCause) return;

    const timer = window.setInterval(() => {
      void handleRefreshAnalysis();
    }, 3500);
    return () => window.clearInterval(timer);
  }, [handleRefreshAnalysis, mode, session]);

  if (!session) {
    return (
      <div className="p-10 rounded-lg border border-slate-800/90 bg-[#0B1220] text-center space-y-4">
        <Clock className="w-8 h-8 text-cyan-400 mx-auto" />
        <h1 className="font-display text-xl font-bold text-slate-100">
          No active analysis session selected
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Submit a new bug report or pick an existing debugging session from the Overview dashboard.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('submit-bug')}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
          >
            Submit New Bug
          </button>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 text-xs font-semibold rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            View Overview
          </button>
        </div>
      </div>
    );
  }

  const handleGeneratePatch = async () => {
    setErrorMessage(null);
    setLastFailedAction(null);
    if (mode === ExecutionMode.DEMO || session.isDemoData) {
      setIsGeneratingPatch(true);
      await demoSimulator.simulateStepDelay(500);
      setIsGeneratingPatch(false);
      onTriggerDemoPatchGeneration(session.id);
      onNavigate('patch');
      return;
    }

    setIsGeneratingPatch(true);
    try {
      const res = await repoguardApi.generateRepair({
        analysisId: session.id,
        repositoryId: session.repositoryId,
      });
      onPatchGenerated(session.id, res.patch);
      onNavigate('patch');
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setLastFailedAction('generate');
      setErrorMessage(apiErr ? apiErr.message : 'Failed to generate code repair patch.');
    } finally {
      setIsGeneratingPatch(false);
    }
  };

  const activeFileObj = repository?.relevantFiles.find(
    (f) => f.path === (selectedFilePath ?? session.relevantFilePaths[0])
  );

  return (
    <div className="space-y-6">
      <SessionPipelineNav currentView="workspace" session={session} onNavigate={onNavigate} />

      {/* Header */}
      <div className="p-6 rounded-lg border border-slate-800/90 bg-[#0B1220] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-mono text-cyan-400">{session.repositoryFullName}</span>
            <span aria-hidden="true">·</span>
            <span>{session.language}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">ID: {session.id}</span>
            {session.isDemoData && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-300 font-semibold">Simulated Demo Session</span>
              </>
            )}
          </div>
          <h1 className="font-display text-xl font-bold text-slate-100 leading-snug">
            {session.bugTitle}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <StatusIndicator status={session.finalStatus} />

          {mode === ExecutionMode.LIVE_BACKEND && !session.isDemoData && (
            <button
              type="button"
              onClick={handleRefreshAnalysis}
              disabled={isPolling}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin' : ''}`} />
              <span>Sync Backend</span>
            </button>
          )}

          {session.patch ? (
            <button
              type="button"
              onClick={() => onNavigate('patch')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>Inspect Code Patch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGeneratePatch}
              disabled={isGeneratingPatch}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
            >
              {isGeneratingPatch ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Patch...</span>
                </>
              ) : (
                <>
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Generate Repair Patch</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-md border border-rose-500/40 bg-rose-950/30 flex items-center justify-between gap-3 text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={lastFailedAction === 'generate' ? handleGeneratePatch : handleRefreshAnalysis}
            className="px-3 py-1 rounded border border-rose-500/40 hover:bg-rose-900/40 font-semibold cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* 6-Stage Analysis Progress Timeline */}
      <div className="p-6 rounded-lg border border-slate-800/90 bg-[#0B1220]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Analysis &amp; Verification Timeline
          </h2>
          <span className="text-xs text-slate-400">6-stage deterministic pipeline</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {session.stages.map((stage) => {
            const isDone = stage.status === StageStatus.COMPLETED;
            const isFailed = stage.status === StageStatus.FAILED;
            const isRunning = stage.status === StageStatus.RUNNING;

            return (
              <div
                key={stage.key}
                className={`p-4 rounded-md border flex flex-col justify-between ${
                  isFailed
                    ? 'border-rose-500/40 bg-rose-950/15'
                    : isDone
                    ? 'border-slate-700/80 bg-[#070B14]'
                    : isRunning
                    ? 'border-cyan-500/50 bg-cyan-950/20'
                    : 'border-slate-800/80 bg-[#070B14]/70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs text-slate-400 tabular-nums">
                      Stage 0{stage.order}
                    </span>
                    {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {isFailed && <XCircle className="w-4 h-4 text-rose-400" />}
                    {isRunning && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
                    {stage.status === StageStatus.PENDING && (
                      <Clock className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <div className="text-sm font-semibold text-slate-100">{stage.title}</div>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{stage.description}</p>
                </div>
                {stage.durationMs !== undefined && (
                  <div className="mt-3 pt-2 border-t border-slate-800/70 font-mono text-[11px] text-slate-500 tabular-nums">
                    {stage.durationMs}ms
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Root-Cause Investigation & Repository Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          {session.rootCause ? (
            <div className="p-6 rounded-lg border border-slate-800/90 bg-[#0B1220] space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
                <h2 className="font-display text-base font-semibold text-slate-100">
                  Root-Cause Investigation
                </h2>
                <RiskIndicator level={session.rootCause.riskAssessment.level} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-md border border-slate-800 bg-[#070B14]">
                  <div className="text-slate-400 mb-1">Affected File</div>
                  <div className="font-mono text-cyan-300 break-all">
                    {session.rootCause.affectedFile}
                  </div>
                  <div className="font-mono text-slate-500 mt-1">
                    {session.rootCause.affectedLines}
                  </div>
                </div>

                <div className="p-3.5 rounded-md border border-slate-800 bg-[#070B14]">
                  <div className="text-slate-400 mb-1">Affected Function</div>
                  <div className="font-mono text-slate-100 break-all">
                    {session.rootCause.affectedFunction}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-slate-300">Suspected Issue</h3>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {session.rootCause.suspectedIssue}
                </p>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-slate-300">Root-Cause Explanation</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {session.rootCause.summary}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-300">AI Reasoning Summary</h3>
                <p className="text-xs text-slate-300 leading-relaxed p-4 rounded-md border border-slate-800 bg-[#070B14]">
                  {session.rootCause.reasoningSummary}
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-800/80">
                <h3 className="text-xs font-semibold text-slate-300">Risk &amp; Blast Radius</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {session.rootCause.riskAssessment.summary}
                </p>
                <div className="text-xs text-slate-400">
                  Blast radius:{' '}
                  <span className="text-slate-200">
                    {session.rootCause.riskAssessment.blastRadius}
                  </span>
                </div>
                {session.rootCause.riskAssessment.sideEffects.length > 0 && (
                  <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 pt-1">
                    {session.rootCause.riskAssessment.sideEffects.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-lg border border-slate-800/90 bg-[#0B1220] space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>Waiting for root-cause investigation output...</span>
              </div>
              <div className="space-y-2.5 animate-pulse">
                <div className="h-4 bg-slate-800 rounded w-3/4" />
                <div className="h-4 bg-slate-800 rounded w-full" />
                <div className="h-4 bg-slate-800 rounded w-5/6" />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Repository Context, Relevant Files & Error Log */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 rounded-lg border border-slate-800/90 bg-[#0B1220] space-y-3">
            <h2 className="font-display text-base font-semibold text-slate-100">
              Repository Information
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/70">
                <span className="text-slate-400">Repository</span>
                <span className="font-mono text-slate-200">{session.repositoryFullName}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/70">
                <span className="text-slate-400">Branch / Commit</span>
                <span className="font-mono text-slate-200 inline-flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                  {repository?.defaultBranch ?? 'main'} · {repository?.commitSha ?? 'HEAD'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400">Test Runner</span>
                <span className="font-mono text-slate-200">
                  {repository?.testRunner ?? 'pytest'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-lg border border-slate-800/90 bg-[#0B1220] space-y-3">
            <h2 className="font-display text-base font-semibold text-slate-100">
              Relevant Source Files
            </h2>
            {session.relevantFilePaths.length === 0 ? (
              <p className="text-xs text-slate-400">No candidate files indexed yet.</p>
            ) : (
              <div className="space-y-1.5">
                {session.relevantFilePaths.map((filePath) => {
                  const active = (selectedFilePath ?? session.relevantFilePaths[0]) === filePath;
                  return (
                    <button
                      key={filePath}
                      type="button"
                      onClick={() => setSelectedFilePath(filePath)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-mono text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#132038] text-cyan-300 border border-cyan-500/30'
                          : 'bg-[#070B14] text-slate-300 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <FileCode2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{filePath}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeFileObj?.content && (
              <div className="mt-3 rounded border border-slate-800 bg-[#070B14] max-h-60 overflow-auto p-3.5 font-mono text-[11px] leading-5 text-slate-300">
                <pre>{activeFileObj.content}</pre>
              </div>
            )}
          </div>

          <div className="p-5 rounded-lg border border-slate-800/90 bg-[#0B1220] space-y-3">
            <h2 className="font-display text-base font-semibold text-slate-100">
              Submitted Error Log
            </h2>
            <pre className="p-3.5 rounded-md border border-slate-800 bg-[#070B14] font-mono text-[11px] leading-5 text-rose-200 overflow-x-auto max-h-56">
              {session.errorLog || 'No error log submitted.'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
