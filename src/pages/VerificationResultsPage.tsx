import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  Play,
  ShieldAlert,
  Terminal,
  XCircle,
} from 'lucide-react';
import { SessionPipelineNav } from '../components/SessionPipelineNav';
import { StatusIndicator } from '../components/StatusIndicator';
import { demoSimulator } from '../services/demoSimulator';
import { ApiError, repoguardApi } from '../services/repoguardApi';
import {
  AppView,
  DebuggingSession,
  ExecutionMode,
  PatchDecision,
  VerificationResult,
  VerificationStatus,
} from '../types/repoguard';

interface VerificationResultsPageProps {
  mode: ExecutionMode;
  session: DebuggingSession | null;
  onVerificationCompleted: (sessionId: string, verification: VerificationResult) => void;
  onRunDemoVerification: (sessionId: string) => void;
  onNavigate: (view: AppView) => void;
}

export const VerificationResultsPage: React.FC<VerificationResultsPageProps> = ({
  mode,
  session,
  onVerificationCompleted,
  onRunDemoVerification,
  onNavigate,
}) => {
  const [activeLogTab, setActiveLogTab] = useState<'patched' | 'original'>('patched');
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLogs, setCopiedLogs] = useState(false);

  useEffect(() => {
    setErrorMessage(null);
    setCopiedLogs(false);
    setActiveLogTab(session?.verification?.patchedTests ? 'patched' : 'original');
  }, [session?.id, session?.verification?.patchedTests]);

  if (!session) {
    return (
      <div className="p-10 rounded-lg border border-slate-800/90 bg-[#0B1220] text-center space-y-4">
        <Terminal className="w-8 h-8 text-cyan-400 mx-auto" />
        <h1 className="font-display text-xl font-bold text-slate-100">
          No verification session selected
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Choose a debugging session from Overview to inspect before-and-after test evidence.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="px-4 py-2 text-xs font-semibold rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
        >
          Go to Overview
        </button>
      </div>
    );
  }

  const verification = session.verification;
  const patchApproved = session.patch?.decision === PatchDecision.APPROVED;

  const handleRerunVerification = async () => {
    setErrorMessage(null);
    if (!session.patch || !patchApproved) {
      setErrorMessage(
        'Patch must be explicitly approved in the Code Patch Viewer before executing verification tests.'
      );
      return;
    }

    if (mode === ExecutionMode.DEMO || session.isDemoData) {
      setIsRunning(true);
      await demoSimulator.simulateStepDelay(650);
      setIsRunning(false);
      onRunDemoVerification(session.id);
      return;
    }

    setIsRunning(true);
    try {
      const res = await repoguardApi.verifyRepair({
        analysisId: session.id,
        patchId: session.patch.patchId,
        approvedByUser: true,
      });
      onVerificationCompleted(session.id, res.verification);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setErrorMessage(apiErr ? apiErr.message : 'Test verification request failed.');
    } finally {
      setIsRunning(false);
    }
  };

  if (!verification) {
    return (
      <div className="space-y-6">
        <SessionPipelineNav currentView="verification" session={session} onNavigate={onNavigate} />
        <div className="p-8 rounded-lg border border-slate-800/90 bg-[#0B1220] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-xl font-bold text-slate-100">{session.bugTitle}</h1>
              <p className="text-xs text-slate-400 mt-1">
                AI-generated patches remain NOT VERIFIED until test execution returns concrete
                evidence.
              </p>
            </div>
            <StatusIndicator status={VerificationStatus.NOT_VERIFIED} />
          </div>

          <div className="p-5 rounded-md border border-slate-800 bg-[#070B14] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-300 leading-relaxed">
              Review and approve the proposed diff in the Code Patch Viewer, then run the test
              verification suite.
            </div>
            <button
              type="button"
              onClick={() => onNavigate('patch')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Open Code Patch Viewer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const original = verification.originalTests;
  const patched = verification.patchedTests;
  const shownLogs =
    activeLogTab === 'patched' && patched
      ? patched.logs
      : original.logs;

  const handleCopyLogs = async () => {
    if (shownLogs.length === 0) return;
    try {
      await navigator.clipboard.writeText(shownLogs.join('\n'));
      setCopiedLogs(true);
      window.setTimeout(() => setCopiedLogs(false), 1800);
    } catch {
      setErrorMessage('Clipboard access was denied by the browser.');
    }
  };

  return (
    <div className="space-y-6">
      <SessionPipelineNav currentView="verification" session={session} onNavigate={onNavigate} />

      {/* Status Banner */}
      <div className="p-6 rounded-lg border border-slate-800/90 bg-[#0B1220] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-mono text-cyan-400">{session.repositoryFullName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{verification.sandboxEnvironment}</span>
              {verification.isSimulated && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-300 font-semibold">
                    Simulated Demo Output (Not Real Docker Execution)
                  </span>
                </>
              )}
            </div>
            <h1 className="font-display text-xl font-bold text-slate-100 leading-snug">
              Verification Evidence: {session.bugTitle}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <StatusIndicator status={verification.status} />

            <button
              type="button"
              onClick={handleRerunVerification}
              disabled={isRunning || !patchApproved}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
              title={!patchApproved ? 'Approve patch in Code Patch Viewer first' : 'Re-run verification tests'}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Run Verification</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        <div className="p-4 rounded-md border border-slate-800 bg-[#070B14] text-xs text-slate-200 leading-relaxed flex items-start gap-3">
          {verification.status === VerificationStatus.VERIFIED ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : verification.status === VerificationStatus.VERIFICATION_FAILED ? (
            <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          ) : verification.status === VerificationStatus.PARTIALLY_VERIFIED ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-semibold text-slate-100 mb-0.5">Verification Verdict</div>
            <p className="text-slate-300">{verification.statusReason}</p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-md border border-rose-500/40 bg-rose-950/30 flex items-center gap-2.5 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Equal-Height Before vs After Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <div className="p-6 rounded-lg border border-slate-800/90 bg-[#0B1220] flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-slate-100">
              Original Test Results (Pre-Patch)
            </h2>
            <span className="font-mono text-xs text-slate-400 tabular-nums shrink-0">
              {original.durationMs}ms
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded border border-slate-800 bg-[#070B14]">
              <div className="text-[11px] text-slate-400">Total Tests</div>
              <div className="font-mono text-2xl font-bold text-slate-100 tabular-nums mt-1">
                {original.total}
              </div>
            </div>
            <div className="p-3.5 rounded border border-slate-800 bg-[#070B14]">
              <div className="text-[11px] text-slate-400">Passed</div>
              <div className="font-mono text-2xl font-bold text-emerald-300 tabular-nums mt-1">
                {original.passed}
              </div>
            </div>
            <div className="p-3.5 rounded border border-rose-500/30 bg-rose-950/20">
              <div className="text-[11px] text-rose-300">Failed</div>
              <div className="font-mono text-2xl font-bold text-rose-300 tabular-nums mt-1">
                {original.failed}
              </div>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400 truncate pt-2 border-t border-slate-800/70">
            Command: <span className="text-slate-200">{original.command}</span>
          </div>
        </div>

        <div className="p-6 rounded-lg border border-slate-800/90 bg-[#0B1220] flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-slate-100">
              Patched Test Results (Post-Patch)
            </h2>
            <span className="font-mono text-xs text-slate-400 tabular-nums shrink-0">
              {patched ? `${patched.durationMs}ms` : 'Not executed'}
            </span>
          </div>

          {patched ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded border border-slate-800 bg-[#070B14]">
                  <div className="text-[11px] text-slate-400">Total</div>
                  <div className="font-mono text-2xl font-bold text-slate-100 tabular-nums mt-1">
                    {patched.total}
                  </div>
                </div>
                <div className="p-3.5 rounded border border-emerald-500/30 bg-emerald-950/20">
                  <div className="text-[11px] text-emerald-300">Passed</div>
                  <div className="font-mono text-2xl font-bold text-emerald-300 tabular-nums mt-1">
                    {patched.passed}
                  </div>
                </div>
                <div className="p-3.5 rounded border border-slate-800 bg-[#070B14]">
                  <div className="text-[11px] text-slate-400">Failed</div>
                  <div
                    className={`font-mono text-2xl font-bold tabular-nums mt-1 ${
                      patched.failed > 0 ? 'text-rose-300' : 'text-slate-200'
                    }`}
                  >
                    {patched.failed}
                  </div>
                </div>
                <div className="p-3.5 rounded border border-slate-800 bg-[#070B14]">
                  <div className="text-[11px] text-slate-400">Regressions</div>
                  <div
                    className={`font-mono text-2xl font-bold tabular-nums mt-1 ${
                      verification.regressionFailures > 0 ? 'text-rose-300' : 'text-cyan-300'
                    }`}
                  >
                    {verification.regressionFailures}
                  </div>
                </div>
              </div>
              <div className="text-xs font-mono text-slate-400 truncate pt-2 border-t border-slate-800/70">
                Command: <span className="text-slate-200">{patched.command}</span>
              </div>
            </>
          ) : (
            <div className="p-5 rounded-md border border-slate-800 bg-[#070B14] text-xs text-slate-300 space-y-3 my-auto">
              <p className="leading-relaxed">
                Post-patch verification has not been executed yet. Approve the proposed patch in the
                Code Patch Viewer to trigger test execution.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('patch')}
                className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Review &amp; Apply Patch</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Individual Test Case Matrix */}
      <div className="rounded-lg border border-slate-800/90 bg-[#0B1220] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Test Case Execution Matrix
          </h2>
          <span className="text-xs text-slate-400 tabular-nums">
            {verification.testCases.length} recorded cases
          </span>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 bg-[#090F1D] text-[11px] font-semibold text-slate-400">
                <th className="py-3 px-5">Test Case</th>
                <th className="py-3 px-4">File</th>
                <th className="py-3 px-4">Pre-Patch</th>
                <th className="py-3 px-4">Post-Patch</th>
                <th className="py-3 px-4">Regression</th>
                <th className="py-3 px-5 text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {verification.testCases.map((tc) => (
                <tr key={tc.id} className="hover:bg-[#111B2E]/60">
                  <td className="py-3 px-5">
                    <div className="font-mono text-slate-100">{tc.name}</div>
                    {tc.failureMessage && (
                      <div className="font-mono text-[11px] text-rose-300 mt-1">
                        {tc.failureMessage}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">{tc.file}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-mono font-semibold uppercase ${
                        tc.prePatchStatus === 'passed'
                          ? 'text-emerald-300'
                          : tc.prePatchStatus === 'failed'
                          ? 'text-rose-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {tc.prePatchStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-mono font-semibold uppercase ${
                        tc.postPatchStatus === 'passed'
                          ? 'text-emerald-300'
                          : tc.postPatchStatus === 'failed'
                          ? 'text-rose-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {tc.postPatchStatus === 'not_run' ? 'NOT RUN' : tc.postPatchStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {tc.isRegression ? (
                      <span className="font-semibold text-rose-300">REGRESSION</span>
                    ) : (
                      <span className="text-slate-500">None</span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-right font-mono text-slate-400 tabular-nums">
                    {tc.durationMs}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Test Case List */}
        <div className="md:hidden divide-y divide-slate-800/70">
          {verification.testCases.map((tc) => (
            <div key={tc.id} className="p-4 space-y-2 text-xs">
              <div className="font-mono font-medium text-slate-100 break-all">{tc.name}</div>
              <div className="font-mono text-[11px] text-slate-400">{tc.file}</div>
              {tc.failureMessage && (
                <div className="font-mono text-[11px] text-rose-300">{tc.failureMessage}</div>
              )}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono">
                <span className="text-slate-400">
                  Before:{' '}
                  <strong className={tc.prePatchStatus === 'passed' ? 'text-emerald-300' : 'text-rose-300'}>
                    {tc.prePatchStatus.toUpperCase()}
                  </strong>
                </span>
                <span className="text-slate-400">
                  After:{' '}
                  <strong
                    className={
                      tc.postPatchStatus === 'passed'
                        ? 'text-emerald-300'
                        : tc.postPatchStatus === 'failed'
                        ? 'text-rose-300'
                        : 'text-slate-400'
                    }
                  >
                    {tc.postPatchStatus === 'not_run' ? 'NOT RUN' : tc.postPatchStatus.toUpperCase()}
                  </strong>
                </span>
                <span className="text-slate-500 tabular-nums ml-auto">{tc.durationMs}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Runner Logs */}
      <div className="rounded-lg border border-slate-800/90 bg-[#0B1220] overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800/80 bg-[#090F1D] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Test Runner Output Logs</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 p-1 rounded-md bg-[#070B14] border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveLogTab('patched')}
                disabled={!patched}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer disabled:opacity-40 ${
                  activeLogTab === 'patched' && patched
                    ? 'bg-[#162238] text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Post-Patch Log
              </button>
              <button
                type="button"
                onClick={() => setActiveLogTab('original')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  activeLogTab === 'original' || !patched
                    ? 'bg-[#162238] text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pre-Patch Log
              </button>
            </div>

            {shownLogs.length > 0 && (
              <button
                type="button"
                onClick={handleCopyLogs}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-700 text-[11px] font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {copiedLogs ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Log</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <pre className="p-5 bg-[#070B14] font-mono text-xs leading-6 text-slate-200 overflow-x-auto max-h-80">
          {shownLogs.length > 0 ? shownLogs.join('\n') : 'No runner logs captured.'}
        </pre>
      </div>
    </div>
  );
};
