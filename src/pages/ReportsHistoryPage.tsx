import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  Search,
} from 'lucide-react';
import { StatusIndicator } from '../components/StatusIndicator';
import { ApiError, repoguardApi } from '../services/repoguardApi';
import {
  AppView,
  DebuggingReport,
  DebuggingSession,
  ExecutionMode,
  VerificationStatus,
} from '../types/repoguard';
import {
  buildReportFromSession,
  formatReportAsMarkdown,
  triggerFileDownload,
} from '../utils/reportExport';

interface ReportsHistoryPageProps {
  mode: ExecutionMode;
  sessions: DebuggingSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string, targetView?: AppView) => void;
}

export const ReportsHistoryPage: React.FC<ReportsHistoryPageProps> = ({
  mode,
  sessions,
  activeSessionId,
  onSelectSession,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | VerificationStatus>('ALL');
  const [selectedReportSessionId, setSelectedReportSessionId] = useState<string | null>(
    activeSessionId ?? sessions[0]?.id ?? null
  );
  const [fetchedBackendReport, setFetchedBackendReport] = useState<DebuggingReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [exportConfirmFormat, setExportConfirmFormat] = useState<'md' | 'json' | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  // Sync selected report if mode switches or activeSessionId updates
  useEffect(() => {
    setFetchedBackendReport(null);
    setReportError(null);
    setExportConfirmFormat(null);
    setCopiedMarkdown(false);

    if (activeSessionId && sessions.some((s) => s.id === activeSessionId)) {
      setSelectedReportSessionId(activeSessionId);
    } else if (
      !selectedReportSessionId ||
      !sessions.some((s) => s.id === selectedReportSessionId)
    ) {
      setSelectedReportSessionId(sessions[0]?.id ?? null);
    }
  }, [activeSessionId, mode, sessions, selectedReportSessionId]);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sessions.filter((s) => {
      if (statusFilter !== 'ALL' && s.finalStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        s.bugTitle.toLowerCase().includes(q) ||
        s.repositoryFullName.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    });
  }, [sessions, searchQuery, statusFilter]);

  const activeSession =
    sessions.find((s) => s.id === selectedReportSessionId) ?? filteredSessions[0] ?? null;

  const activeReport: DebuggingReport | null = useMemo(() => {
    if (!activeSession) return null;
    if (
      fetchedBackendReport &&
      fetchedBackendReport.analysisId === activeSession.id
    ) {
      return fetchedBackendReport;
    }
    return buildReportFromSession(activeSession);
  }, [activeSession, fetchedBackendReport]);

  const handleLoadBackendReport = async (session: DebuggingSession) => {
    setSelectedReportSessionId(session.id);
    setReportError(null);
    setExportConfirmFormat(null);

    if (mode === ExecutionMode.DEMO || session.isDemoData) {
      setFetchedBackendReport(null);
      return;
    }

    setIsLoadingReport(true);
    try {
      const { report } = await repoguardApi.getReport({ reportId: session.reportId });
      setFetchedBackendReport(report);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setReportError(
        apiErr
          ? `${apiErr.message} Displaying locally cached session snapshot instead.`
          : 'Unable to fetch report from FastAPI GET /api/report/{id}. Displaying locally cached session snapshot.'
      );
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleConfirmExport = () => {
    if (!activeReport || !exportConfirmFormat) return;
    if (exportConfirmFormat === 'md') {
      const md = formatReportAsMarkdown(activeReport);
      triggerFileDownload(`${activeReport.reportId}.md`, md, 'text/markdown;charset=utf-8');
    } else {
      const json = JSON.stringify(activeReport, null, 2);
      triggerFileDownload(`${activeReport.reportId}.json`, json, 'application/json;charset=utf-8');
    }
    setExportConfirmFormat(null);
  };

  const handleCopyMarkdown = async () => {
    if (!activeReport) return;
    const md = formatReportAsMarkdown(activeReport);
    try {
      await navigator.clipboard.writeText(md);
      setCopiedMarkdown(true);
      window.setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch {
      setReportError('Clipboard access denied by browser. Use Export Markdown instead.');
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-100 tracking-tight">
            Debugging History &amp; Audit Reports
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Inspect previous debugging investigations, verification evidence, and exportable audit
            reports.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by repository, bug title, or session ID..."
            className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-md border border-slate-800 bg-[#0B1220] text-slate-100 placeholder:text-slate-500 focus:border-cyan-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 rounded-md bg-[#0B1220] border border-slate-800 self-start md:self-auto">
          {(
            [
              { id: 'ALL', label: 'All' },
              { id: VerificationStatus.VERIFIED, label: 'Verified' },
              { id: VerificationStatus.NOT_VERIFIED, label: 'Not Verified' },
              { id: VerificationStatus.VERIFICATION_FAILED, label: 'Failed' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#162238] text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Session History Table */}
        <div className="xl:col-span-5 rounded-lg border border-slate-800/90 bg-[#0B1220] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/80 bg-[#090F1D] text-xs font-semibold text-slate-200 flex items-center justify-between">
            <span>Recorded Sessions</span>
            <span className="font-mono text-slate-400 tabular-nums">{filteredSessions.length}</span>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No debugging history matches your search criteria.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {filteredSessions.map((session) => {
                const isSelected = activeSession?.id === session.id;
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => handleLoadBackendReport(session)}
                    className={`w-full p-4 text-left transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#121E33]' : 'hover:bg-[#10192B]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-100 leading-snug line-clamp-2">
                          {session.bugTitle}
                        </div>
                        <div className="text-xs text-slate-400 mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="font-mono text-cyan-400">
                            {session.repositoryFullName}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {formatDate(session.updatedAt)}
                          </span>
                          {session.isDemoData && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-300">Demo Data</span>
                            </>
                          )}
                        </div>
                      </div>
                      <StatusIndicator status={session.finalStatus} compact />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detailed Report Panel */}
        <div className="xl:col-span-7">
          {isLoadingReport ? (
            <div className="p-10 rounded-lg border border-slate-800/90 bg-[#0B1220] text-center space-y-3">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
              <div className="text-xs text-slate-300">Fetching report from FastAPI backend...</div>
            </div>
          ) : activeReport && activeSession ? (
            <div className="p-6 rounded-lg border border-slate-800/90 bg-[#0B1220] space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-800/80">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Report {activeReport.reportId}</span>
                    {activeReport.isSimulated && (
                      <span className="text-amber-300">· Simulated Demo</span>
                    )}
                  </div>
                  <h2 className="font-display text-lg font-bold text-slate-100 leading-snug">
                    {activeReport.bugTitle}
                  </h2>
                </div>
                <StatusIndicator status={activeReport.finalStatus} />
              </div>

              {reportError && (
                <div className="p-3 rounded border border-rose-500/40 bg-rose-950/30 flex items-center gap-2 text-xs text-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{reportError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded border border-slate-800 bg-[#070B14]">
                  <div className="text-slate-400">Repository</div>
                  <div className="font-mono text-slate-100 mt-1 truncate">
                    {activeReport.repository.fullName}
                  </div>
                </div>
                <div className="p-3.5 rounded border border-slate-800 bg-[#070B14]">
                  <div className="text-slate-400">Generated At</div>
                  <div className="font-mono text-slate-100 mt-1 tabular-nums">
                    {formatDate(activeReport.generatedAt)}
                  </div>
                </div>
              </div>

              {activeReport.rootCause && (
                <div className="space-y-1.5 text-xs pt-2 border-t border-slate-800/70">
                  <div className="font-semibold text-slate-300">Root-Cause Summary</div>
                  <p className="text-slate-300 leading-relaxed">{activeReport.rootCause.summary}</p>
                  <div className="font-mono text-cyan-300 pt-1">
                    {activeReport.rootCause.affectedFile} · {activeReport.rootCause.affectedFunction}
                  </div>
                </div>
              )}

              <div className="space-y-2 text-xs pt-2 border-t border-slate-800/70">
                <div className="font-semibold text-slate-300">Test Execution Proof</div>
                <div className="p-4 rounded border border-slate-800 bg-[#070B14] space-y-2">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-slate-400">Pre-Patch Baseline:</span>
                    <span className="font-mono text-slate-200 tabular-nums">
                      {activeReport.verification.originalTests.passed}/
                      {activeReport.verification.originalTests.total} passed (
                      {activeReport.verification.originalTests.failed} failed)
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-slate-400">Post-Patch Result:</span>
                    <span className="font-mono text-slate-200 tabular-nums">
                      {activeReport.verification.patchedTests
                        ? `${activeReport.verification.patchedTests.passed}/${activeReport.verification.patchedTests.total} passed (${activeReport.verification.regressionFailures} regressions)`
                        : 'Not executed'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Explicit Export Confirmation */}
              {exportConfirmFormat && (
                <div className="p-4 rounded border border-cyan-500/40 bg-cyan-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <span className="text-slate-200">
                    Confirm export of{' '}
                    <strong className="font-mono">
                      {activeReport.reportId}.{exportConfirmFormat}
                    </strong>{' '}
                    to your local device?
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setExportConfirmFormat(null)}
                      className="px-3 py-1.5 rounded border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmExport}
                      className="px-3.5 py-1.5 rounded bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 cursor-pointer"
                    >
                      Download File
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setExportConfirmFormat('md')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Markdown</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportConfirmFormat('json')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyMarkdown}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {copiedMarkdown ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Summary</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => onSelectSession(activeSession.id, 'workspace')}
                    className="text-slate-300 hover:text-cyan-300 cursor-pointer"
                  >
                    Open Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectSession(activeSession.id, 'verification')}
                    className="text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  >
                    Open Verification View
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 rounded-lg border border-slate-800/90 bg-[#0B1220] text-center text-xs text-slate-400">
              Select a debugging session on the left to inspect its full report.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
