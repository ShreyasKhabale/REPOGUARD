import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Columns2,
  FileDiff,
  Loader2,
  RotateCcw,
  Rows3,
  ShieldAlert,
  Wrench,
  XCircle,
} from 'lucide-react';
import { SessionPipelineNav } from '../components/SessionPipelineNav';
import { StatusIndicator } from '../components/StatusIndicator';
import { demoSimulator } from '../services/demoSimulator';
import { ApiError, repoguardApi } from '../services/repoguardApi';
import {
  AppView,
  CodePatch,
  DebuggingSession,
  ExecutionMode,
  PatchDecision,
  VerificationResult,
} from '../types/repoguard';

interface CodePatchViewerPageProps {
  mode: ExecutionMode;
  session: DebuggingSession | null;
  onUpdatePatchDecision: (
    sessionId: string,
    decision: PatchDecision,
    rejectionReason?: string
  ) => void;
  onPatchGenerated: (sessionId: string, patch: CodePatch) => void;
  onVerificationCompleted: (sessionId: string, verification: VerificationResult) => void;
  onRunDemoVerification: (sessionId: string) => void;
  onTriggerDemoPatchGeneration: (sessionId: string) => void;
  onNavigate: (view: AppView) => void;
}

export const CodePatchViewerPage: React.FC<CodePatchViewerPageProps> = ({
  mode,
  session,
  onUpdatePatchDecision,
  onPatchGenerated,
  onVerificationCompleted,
  onRunDemoVerification,
  onTriggerDemoPatchGeneration,
  onNavigate,
}) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [confirmApplyOpen, setConfirmApplyOpen] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedFileIndex(0);
    setConfirmApplyOpen(false);
    setConfirmRejectOpen(false);
    setRejectionNote('');
    setErrorMessage(null);
  }, [session?.id]);

  if (!session) {
    return (
      <div className="p-10 rounded-lg border border-slate-800/90 bg-[#0B1220] text-center space-y-4">
        <FileDiff className="w-8 h-8 text-cyan-400 mx-auto" />
        <h1 className="font-display text-xl font-bold text-slate-100">
          No debugging session selected
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Select a debugging session from Overview or submit a new bug to inspect a proposed patch.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="px-4 py-2 text-xs font-semibold rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
        >
          Return to Overview
        </button>
      </div>
    );
  }

  const handleGenerateFromEmpty = async () => {
    setErrorMessage(null);
    if (mode === ExecutionMode.DEMO || session.isDemoData) {
      setIsGenerating(true);
      await demoSimulator.simulateStepDelay(450);
      setIsGenerating(false);
      onTriggerDemoPatchGeneration(session.id);
      return;
    }

    setIsGenerating(true);
    try {
      const res = await repoguardApi.generateRepair({
        analysisId: session.id,
        repositoryId: session.repositoryId,
      });
      onPatchGenerated(session.id, res.patch);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setErrorMessage(apiErr ? apiErr.message : 'Failed to generate code repair patch.');
    } finally {
      setIsGenerating(false);
    }
  };

  const patch: CodePatch | null = session.patch;

  if (!patch || patch.files.length === 0) {
    return (
      <div className="space-y-6">
        <SessionPipelineNav currentView="patch" session={session} onNavigate={onNavigate} />
        <div className="p-10 rounded-lg border border-slate-800/90 bg-[#0B1220] text-center space-y-4">
          <FileDiff className="w-8 h-8 text-cyan-400 mx-auto" />
          <h1 className="font-display text-xl font-bold text-slate-100">
            No code patch generated yet for this session
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Synthesize a proposed patch for{' '}
            <span className="text-slate-200 font-medium">{session.bugTitle}</span> or return to
            the Analysis Workspace.
          </p>
          {errorMessage && (
            <div className="max-w-lg mx-auto p-3 rounded border border-rose-500/40 bg-rose-950/30 text-xs text-rose-200">
              {errorMessage}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleGenerateFromEmpty}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Patch...</span>
                </>
              ) : (
                <>
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Generate Proposed Patch</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('workspace')}
              className="px-4 py-2 text-xs font-semibold rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Back to Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  const safeIndex = selectedFileIndex < patch.files.length ? selectedFileIndex : 0;
  const activeFile = patch.files[safeIndex];
  const isApproved = patch.decision === PatchDecision.APPROVED;
  const isRejected = patch.decision === PatchDecision.REJECTED;
  const isRolledBack = patch.decision === PatchDecision.ROLLED_BACK;

  const handleConfirmApply = () => {
    onUpdatePatchDecision(session.id, PatchDecision.APPROVED);
    setConfirmApplyOpen(false);
    setErrorMessage(null);
  };

  const handleConfirmReject = () => {
    onUpdatePatchDecision(session.id, PatchDecision.REJECTED, rejectionNote.trim() || undefined);
    setConfirmRejectOpen(false);
    setRejectionNote('');
  };

  const handleRollback = () => {
    onUpdatePatchDecision(session.id, PatchDecision.ROLLED_BACK);
  };

  const handleRunVerification = async () => {
    if (!isApproved) {
      setErrorMessage('Explicitly approve and apply the patch before executing verification tests.');
      return;
    }

    setErrorMessage(null);

    if (mode === ExecutionMode.DEMO || session.isDemoData) {
      setIsVerifying(true);
      await demoSimulator.simulateStepDelay(650);
      setIsVerifying(false);
      onRunDemoVerification(session.id);
      onNavigate('verification');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await repoguardApi.verifyRepair({
        analysisId: session.id,
        patchId: patch.patchId,
        approvedByUser: true,
      });
      onVerificationCompleted(session.id, response.verification);
      onNavigate('verification');
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setErrorMessage(
        apiErr ? apiErr.message : 'Verification request failed on FastAPI backend.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const originalLines = activeFile.originalCode.split('\n');
  const modifiedLines = activeFile.modifiedCode.split('\n');

  return (
    <div className="space-y-6">
      <SessionPipelineNav currentView="patch" session={session} onNavigate={onNavigate} />

      {/* Header & Approval Banner */}
      <div className="p-6 rounded-lg border border-slate-800/90 bg-[#0B1220] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-mono text-cyan-400">{session.repositoryFullName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">Patch {patch.patchId}</span>
              <span aria-hidden="true">·</span>
              <span>
                Decision:{' '}
                <strong className="text-slate-200 uppercase">
                  {patch.decision.replace('_', ' ')}
                </strong>
              </span>
            </div>
            <h1 className="font-display text-xl font-bold text-slate-100">
              Code Patch Review &amp; Approval Gate
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <StatusIndicator status={session.finalStatus} />

            {!isApproved && (
              <button
                type="button"
                onClick={() => {
                  setConfirmRejectOpen(false);
                  setConfirmApplyOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors whitespace-nowrap cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Apply Patch</span>
              </button>
            )}

            {!isRejected && !isApproved && (
              <button
                type="button"
                onClick={() => {
                  setConfirmApplyOpen(false);
                  setConfirmRejectOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md border border-rose-500/40 bg-rose-950/30 text-rose-200 hover:bg-rose-950/50 transition-colors whitespace-nowrap cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject Patch</span>
              </button>
            )}

            {isApproved && (
              <>
                <button
                  type="button"
                  onClick={handleRollback}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Rollback Patch</span>
                </button>
                <button
                  type="button"
                  onClick={handleRunVerification}
                  disabled={isVerifying}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Running Tests...</span>
                    </>
                  ) : (
                    <>
                      <span>Execute Verification Suite</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Explicit Approval Confirmation Box */}
        {confirmApplyOpen && (
          <div className="p-4 rounded-md border border-cyan-500/40 bg-cyan-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <div className="font-semibold text-cyan-200">
                Confirm Patch Staging (Explicit Developer Approval)
              </div>
              <p className="text-slate-300 leading-relaxed">
                Applying this patch stages changes inside the verification sandbox only. REPOGUARD
                never pushes or modifies your original GitHub repository automatically.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmApplyOpen(false)}
                className="px-3.5 py-2 text-xs font-medium rounded border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApply}
                className="px-4 py-2 text-xs font-semibold rounded bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer"
              >
                Confirm &amp; Stage Patch
              </button>
            </div>
          </div>
        )}

        {/* Reject Confirmation Box */}
        {confirmRejectOpen && (
          <div className="p-4 rounded-md border border-rose-500/40 bg-rose-950/25 space-y-3">
            <div className="text-xs font-semibold text-rose-200">
              Reject Proposed Patch
            </div>
            <input
              type="text"
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="Optional reason (e.g., alters public signature or misses edge case)"
              className="w-full px-3.5 py-2 text-xs rounded border border-slate-700 bg-[#070B14] text-slate-100 placeholder:text-slate-500 focus:border-rose-400"
            />
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmRejectOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium rounded border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-rose-500 text-white hover:bg-rose-400 cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        )}

        {(isRejected || isRolledBack) && (
          <div className="p-3.5 rounded-md border border-amber-500/35 bg-amber-950/25 flex items-center gap-2.5 text-xs text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {isRejected
                ? `Patch rejected${patch.rejectionReason ? `: ${patch.rejectionReason}` : '.'} Repository remains untouched.`
                : 'Patch has been rolled back to the original baseline code. Verification status reset to NOT VERIFIED.'}
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-md border border-rose-500/40 bg-rose-950/30 flex items-center gap-2.5 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-300 leading-relaxed">
          <span className="font-semibold text-slate-100">Patch Explanation: </span>
          {patch.explanation}
        </div>
      </div>

      {/* Changed File Tabs & Diff Mode Switcher */}
      <div className="rounded-lg border border-slate-800/90 bg-[#0B1220] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800/80 bg-[#090F1D] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {patch.files.map((file, idx) => (
              <button
                key={file.filePath}
                type="button"
                onClick={() => setSelectedFileIndex(idx)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                  idx === safeIndex
                    ? 'bg-[#162238] text-cyan-300 border border-cyan-500/35'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <span className="truncate max-w-[240px] sm:max-w-none">{file.filePath}</span>
                <span className="text-emerald-400 tabular-nums shrink-0">+{file.addedCount}</span>
                <span className="text-rose-400 tabular-nums shrink-0">-{file.removedCount}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-md bg-[#070B14] border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('unified')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'unified'
                  ? 'bg-[#162238] text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Rows3 className="w-3.5 h-3.5" />
              <span>Unified Diff</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-[#162238] text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
          </div>
        </div>

        {/* Diff Body */}
        {viewMode === 'unified' ? (
          <div className="bg-[#070B14] overflow-x-auto font-mono text-xs leading-6 py-2">
            {activeFile.diffLines.map((line, i) => {
              const rowClass =
                line.type === 'added'
                  ? 'bg-emerald-950/35 text-emerald-200'
                  : line.type === 'removed'
                  ? 'bg-rose-950/40 text-rose-200'
                  : 'text-slate-300';
              const sign = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
              const signColor =
                line.type === 'added'
                  ? 'text-emerald-400'
                  : line.type === 'removed'
                  ? 'text-rose-400'
                  : 'text-slate-600';

              return (
                <div key={i} className={`flex min-w-max ${rowClass}`}>
                  <span className="w-12 px-2 text-right text-slate-600 select-none tabular-nums border-r border-slate-800/60 shrink-0">
                    {line.oldLineNumber ?? ''}
                  </span>
                  <span className="w-12 px-2 text-right text-slate-600 select-none tabular-nums border-r border-slate-800/60 shrink-0">
                    {line.newLineNumber ?? ''}
                  </span>
                  <span className={`w-6 text-center select-none shrink-0 ${signColor}`}>
                    {sign}
                  </span>
                  <span className="pr-6 whitespace-pre">{line.content}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-slate-800 bg-[#070B14]">
            <div className="overflow-x-auto">
              <div className="px-4 py-2.5 border-b border-slate-800/80 bg-[#090F1D] text-[11px] font-semibold text-rose-300">
                Original Code ({activeFile.filePath})
              </div>
              <div className="font-mono text-xs leading-6 py-2">
                {originalLines.map((line, idx) => {
                  const isRemoved = activeFile.diffLines.some(
                    (d) => d.type === 'removed' && d.oldLineNumber === idx + 1
                  );
                  return (
                    <div
                      key={idx}
                      className={`flex min-w-max ${isRemoved ? 'bg-rose-950/40 text-rose-200' : 'text-slate-300'}`}
                    >
                      <span className="w-11 px-2 text-right text-slate-600 select-none tabular-nums shrink-0">
                        {idx + 1}
                      </span>
                      <span className="pr-4 whitespace-pre">{line}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="px-4 py-2.5 border-b border-slate-800/80 bg-[#090F1D] text-[11px] font-semibold text-emerald-300">
                Proposed Modified Code ({activeFile.filePath})
              </div>
              <div className="font-mono text-xs leading-6 py-2">
                {modifiedLines.map((line, idx) => {
                  const isAdded = activeFile.diffLines.some(
                    (d) => d.type === 'added' && d.newLineNumber === idx + 1
                  );
                  return (
                    <div
                      key={idx}
                      className={`flex min-w-max ${
                        isAdded ? 'bg-emerald-950/35 text-emerald-200' : 'text-slate-300'
                      }`}
                    >
                      <span className="w-11 px-2 text-right text-slate-600 select-none tabular-nums shrink-0">
                        {idx + 1}
                      </span>
                      <span className="pr-4 whitespace-pre">{line}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
