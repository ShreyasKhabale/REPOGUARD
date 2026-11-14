import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bug,
  CheckCircle2,
  FolderGit2,
  GitBranch,
  Layers,
  Play,
  XCircle,
} from 'lucide-react';
import { StatusIndicator } from '../components/StatusIndicator';
import {
  ActivityFeedItem,
  AppView,
  DebuggingSession,
  ExecutionMode,
  RepositoryInfo,
  VerificationStatus,
} from '../types/repoguard';

interface DashboardOverviewPageProps {
  mode: ExecutionMode;
  repositories: RepositoryInfo[];
  sessions: DebuggingSession[];
  activities: ActivityFeedItem[];
  onSelectSession: (sessionId: string, targetView?: AppView) => void;
  onNavigate: (view: AppView) => void;
  onLaunchGuidedDemo: () => void;
}

export const DashboardOverviewPage: React.FC<DashboardOverviewPageProps> = ({
  mode,
  repositories,
  sessions,
  activities,
  onSelectSession,
  onNavigate,
  onLaunchGuidedDemo,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | VerificationStatus>('ALL');

  const stats = useMemo(() => {
    const verified = sessions.filter((s) => s.finalStatus === VerificationStatus.VERIFIED).length;
    const failed = sessions.filter(
      (s) => s.finalStatus === VerificationStatus.VERIFICATION_FAILED
    ).length;
    return {
      repos: repositories.length,
      analyses: sessions.length,
      verified,
      failed,
    };
  }, [repositories, sessions]);

  const filteredSessions = useMemo(() => {
    if (statusFilter === 'ALL') return sessions;
    return sessions.filter((s) => s.finalStatus === statusFilter);
  }, [sessions, statusFilter]);

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-100 tracking-tight">
            Debugging &amp; Verification Overview
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {mode === ExecutionMode.DEMO
              ? 'Displaying prepared sample metrics and simulated debugging sessions (Demo Data).'
              : 'Live workspace metrics synchronized with your configured Python FastAPI backend.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {mode === ExecutionMode.DEMO && (
            <button
              type="button"
              onClick={onLaunchGuidedDemo}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md border border-cyan-500/40 bg-cyan-950/30 text-cyan-200 hover:bg-cyan-950/50 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-cyan-400" />
              <span>Run Guided Demo Flow</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('repositories')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors whitespace-nowrap cursor-pointer"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Connect Repository</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-5 rounded-lg border border-slate-800/90 bg-[#0B1220] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Connected Repositories</span>
            <FolderGit2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-slate-100 tabular-nums mt-3">
            {stats.repos}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {mode === ExecutionMode.DEMO ? 'Demo sample repositories' : 'Backend-confirmed repos'}
          </div>
        </div>

        <div className="p-5 rounded-lg border border-slate-800/90 bg-[#0B1220] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Total Analyses</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-slate-100 tabular-nums mt-3">
            {stats.analyses}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {mode === ExecutionMode.DEMO ? 'Demo debugging runs' : 'Submitted investigations'}
          </div>
        </div>

        <div className="p-5 rounded-lg border border-slate-800/90 bg-[#0B1220] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Verified Repairs</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-emerald-300 tabular-nums mt-3">
            {stats.verified}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Backed by passing test evidence
          </div>
        </div>

        <div className="p-5 rounded-lg border border-slate-800/90 bg-[#0B1220] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Failed Verifications</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-rose-300 tabular-nums mt-3">
            {stats.failed}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Blocked patches or regressions
          </div>
        </div>
      </div>

      {/* Main Split: Recent Debugging Sessions + Connected Repos & Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 rounded-lg border border-slate-800/90 bg-[#0B1220] overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-100">
                Recent Debugging Sessions
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select a session to open its root-cause workspace, diff patch, or test evidence.
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-md bg-[#070B14] border border-slate-800 self-start sm:self-auto">
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
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
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

          {filteredSessions.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <Bug className="w-7 h-7 text-slate-500 mx-auto" />
              <div className="text-sm font-medium text-slate-200">
                No debugging sessions match this filter
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Connect a GitHub repository and submit a bug report or switch filters to inspect
                existing sessions.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('submit-bug')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
              >
                <span>Submit Bug Report</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-[11px] font-semibold text-slate-400 bg-[#090F1D]">
                      <th className="py-3 px-5">Bug &amp; Repository</th>
                      <th className="py-3 px-4">Language</th>
                      <th className="py-3 px-4">Updated</th>
                      <th className="py-3 px-4">Verification Status</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs">
                    {filteredSessions.map((session) => (
                      <tr
                        key={session.id}
                        className="hover:bg-[#111B2E]/65 transition-colors"
                      >
                        <td className="py-3.5 px-5 max-w-xs">
                          <div className="font-medium text-slate-100 truncate">
                            {session.bugTitle}
                          </div>
                          <div className="text-slate-400 mt-1 flex items-center gap-1.5">
                            <span className="font-mono">{session.repositoryFullName}</span>
                            {session.isDemoData && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-amber-300/90">Demo Data</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                          {session.language}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono tabular-nums whitespace-nowrap">
                          {formatTimestamp(session.updatedAt)}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusIndicator status={session.finalStatus} compact />
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onSelectSession(session.id, 'workspace')}
                            className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Session List */}
              <div className="md:hidden divide-y divide-slate-800/70">
                {filteredSessions.map((session) => (
                  <div key={session.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-100 leading-snug">
                          {session.bugTitle}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 font-mono truncate">
                          {session.repositoryFullName}
                          {session.isDemoData ? ' · Demo Data' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <StatusIndicator status={session.finalStatus} compact />
                      <button
                        type="button"
                        onClick={() => onSelectSession(session.id, 'workspace')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right Column: Connected Repositories & Recent Activity */}
        <div className="xl:col-span-4 space-y-6">
          <div className="rounded-lg border border-slate-800/90 bg-[#0B1220] p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/70">
              <h2 className="font-display text-base font-semibold text-slate-100">
                Connected Repositories
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('repositories')}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                Manage
              </button>
            </div>
            {repositories.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                <p>No repositories confirmed by backend yet.</p>
                <button
                  type="button"
                  onClick={() => onNavigate('repositories')}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                >
                  Import a GitHub repository
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/70">
                {repositories.map((repo) => (
                  <div key={repo.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-100 truncate">
                        {repo.fullName}
                      </span>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {repo.language}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
                      <GitBranch className="w-3 h-3 text-slate-500" />
                      <span>{repo.defaultBranch}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{repo.fileCount} files</span>
                      {repo.isDemoData && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-300/90">Demo</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-800/90 bg-[#0B1220] p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/70">
              <h2 className="font-display text-base font-semibold text-slate-100">
                Recent Activity
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                All Reports
              </button>
            </div>
            {activities.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No activity recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-800/70">
                {activities.slice(0, 5).map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => onSelectSession(act.sessionId, 'verification')}
                    className="w-[calc(100%+1rem)] -mx-2 px-2.5 py-3 text-left hover:bg-[#111B2E]/60 transition-colors rounded-md cursor-pointer block"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-200 truncate">{act.title}</span>
                      <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
                        {formatTimestamp(act.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {act.detail}
                    </p>
                    <div className="mt-1.5 text-[11px] font-mono text-slate-500">
                      {act.repositoryFullName} {act.isDemoData ? '· Demo Data' : ''}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
