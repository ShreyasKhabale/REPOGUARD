import { useEffect, useState } from 'react';
import { BackendConfigModal } from './components/BackendConfigModal';
import { DashboardShell } from './components/DashboardShell';
import {
  createInitialDemoSessions,
  DEMO_PATCH,
  DEMO_POST_PATCH_VERIFICATION,
  DEMO_PRE_PATCH_VERIFICATION,
  DEMO_REPOSITORY,
  DEMO_SECONDARY_REPO,
  INITIAL_DEMO_ACTIVITIES,
} from './data/demoData';
import { AnalysisWorkspacePage } from './pages/AnalysisWorkspacePage';
import { BugSubmissionPage } from './pages/BugSubmissionPage';
import { CodePatchViewerPage } from './pages/CodePatchViewerPage';
import { DashboardOverviewPage } from './pages/DashboardOverviewPage';
import { LandingPage } from './pages/LandingPage';
import { ReportsHistoryPage } from './pages/ReportsHistoryPage';
import { RepositoryConnectionPage } from './pages/RepositoryConnectionPage';
import { VerificationResultsPage } from './pages/VerificationResultsPage';
import {
  ActivityFeedItem,
  AnalysisStageKey,
  AppView,
  CodePatch,
  DebuggingSession,
  ExecutionMode,
  PatchDecision,
  RepositoryInfo,
  RiskLevel,
  StageStatus,
  VerificationResult,
  VerificationStatus,
} from './types/repoguard';

const VALID_VIEWS: AppView[] = [
  'landing',
  'dashboard',
  'repositories',
  'submit-bug',
  'workspace',
  'patch',
  'verification',
  'reports',
];

function getInitialViewFromHash(): AppView {
  if (typeof window === 'undefined') return 'landing';
  const raw = window.location.hash.replace(/^#\/?/, '') as AppView;
  return VALID_VIEWS.includes(raw) ? raw : 'landing';
}

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(getInitialViewFromHash);
  const [mode, setMode] = useState<ExecutionMode>(ExecutionMode.DEMO);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Separate Demo state from Live Backend state so simulated data never leaks into real mode
  const [demoRepos, setDemoRepos] = useState<RepositoryInfo[]>([
    DEMO_REPOSITORY,
    DEMO_SECONDARY_REPO,
  ]);
  const [demoSessions, setDemoSessions] = useState<DebuggingSession[]>(() =>
    createInitialDemoSessions()
  );
  const [demoActivities, setDemoActivities] = useState<ActivityFeedItem[]>(
    INITIAL_DEMO_ACTIVITIES
  );

  const [liveRepos, setLiveRepos] = useState<RepositoryInfo[]>([]);
  const [liveSessions, setLiveSessions] = useState<DebuggingSession[]>([]);
  const [liveActivities, setLiveActivities] = useState<ActivityFeedItem[]>([]);

  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(DEMO_REPOSITORY.id);
  const [activeSessionId, setActiveSessionId] = useState<string | null>('demo-session-842');

  const repositories = mode === ExecutionMode.DEMO ? demoRepos : liveRepos;
  const sessions = mode === ExecutionMode.DEMO ? demoSessions : liveSessions;
  const activities = mode === ExecutionMode.DEMO ? demoActivities : liveActivities;

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentView(getInitialViewFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (view: AppView) => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      window.location.hash = view === 'landing' ? '' : view;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleModeChange = (nextMode: ExecutionMode) => {
    setMode(nextMode);
    if (nextMode === ExecutionMode.DEMO) {
      setSelectedRepoId(demoRepos[0]?.id ?? null);
      setActiveSessionId(demoSessions[0]?.id ?? null);
    } else {
      setSelectedRepoId(liveRepos[0]?.id ?? null);
      setActiveSessionId(liveSessions[0]?.id ?? null);
    }
  };

  const handleRepositoryImported = (repo: RepositoryInfo) => {
    if (mode === ExecutionMode.DEMO) {
      setDemoRepos((prev) =>
        prev.some((r) => r.id === repo.id) ? prev : [repo, ...prev]
      );
    } else {
      setLiveRepos((prev) =>
        prev.some((r) => r.id === repo.id) ? prev : [repo, ...prev]
      );
    }
    setSelectedRepoId(repo.id);
  };

  const handleAnalysisStarted = (session: DebuggingSession) => {
    setLiveSessions((prev) => [session, ...prev]);
    setLiveActivities((prev) => [
      {
        id: `act-${Date.now()}`,
        timestamp: session.createdAt,
        repositoryFullName: session.repositoryFullName,
        title: 'Analysis started on FastAPI backend',
        detail: session.bugTitle,
        status: VerificationStatus.NOT_VERIFIED,
        sessionId: session.id,
        isDemoData: false,
      },
      ...prev,
    ]);
    setActiveSessionId(session.id);
    navigate('workspace');
  };

  const handleCreateDemoAnalysis = (params: {
    repositoryId: string;
    bugTitle: string;
    bugDescription: string;
    errorLog: string;
    language: string;
  }) => {
    const repo = demoRepos.find((r) => r.id === params.repositoryId) ?? DEMO_REPOSITORY;
    const nowIso = new Date().toISOString();
    const id = `demo-session-${Date.now().toString().slice(-4)}`;

    const newSession: DebuggingSession = {
      id,
      reportId: `rep-${id}`,
      repositoryId: repo.id,
      repositoryFullName: repo.fullName,
      language: params.language,
      bugTitle: params.bugTitle,
      bugDescription: params.bugDescription,
      errorLog: params.errorLog,
      createdAt: nowIso,
      updatedAt: nowIso,
      isDemoData: true,
      relevantFilePaths: [
        'src/reconciler/settlement.py',
        'src/reconciler/models.py',
        'tests/test_settlement.py',
      ],
      stages: [
        {
          key: AnalysisStageKey.REPOSITORY_ANALYSIS,
          order: 1,
          title: 'Repository analysis',
          description: `Indexed ${repo.fileCount} files and detected ${repo.testRunner ?? 'pytest'}.`,
          status: StageStatus.COMPLETED,
          durationMs: 510,
          completedAt: nowIso,
        },
        {
          key: AnalysisStageKey.SOURCE_INSPECTION,
          order: 2,
          title: 'Source-code inspection',
          description: 'Matched traceback symbols to src/reconciler/settlement.py.',
          status: StageStatus.COMPLETED,
          durationMs: 740,
          completedAt: nowIso,
        },
        {
          key: AnalysisStageKey.ROOT_CAUSE,
          order: 3,
          title: 'Root-cause investigation',
          description: 'Isolated float accumulation drift and naive datetime handling.',
          status: StageStatus.COMPLETED,
          durationMs: 920,
          completedAt: nowIso,
        },
        {
          key: AnalysisStageKey.BUG_REPRODUCTION,
          order: 4,
          title: 'Bug reproduction',
          description: 'Confirmed 2 failing tests in baseline pytest execution (8/10 passed).',
          status: StageStatus.COMPLETED,
          durationMs: 412,
          completedAt: nowIso,
        },
        {
          key: AnalysisStageKey.PATCH_GENERATION,
          order: 5,
          title: 'Patch generation',
          description: 'Ready to synthesize targeted diff patch.',
          status: StageStatus.PENDING,
        },
        {
          key: AnalysisStageKey.VERIFICATION,
          order: 6,
          title: 'Verification',
          description: 'Awaiting patch generation, approval, and post-patch test run.',
          status: StageStatus.PENDING,
        },
      ],
      rootCause: {
        summary:
          'Binary float summation in reconcile_daily_settlements causes precision drift against expected cent totals, while normalize_cutoff fails to attach UTC tzinfo to naive datetimes.',
        suspectedIssue:
          'float(entry.amount_cents) / 100.0 + naive datetime comparison in settlement.py.',
        affectedFile: 'src/reconciler/settlement.py',
        affectedFunction: 'reconcile_daily_settlements / normalize_cutoff',
        affectedLines: 'Lines 7–31',
        reasoningSummary:
          'Stack trace frames pinpoint line 23 for the offset-naive TypeError and test_exact_decimal_accumulation for the 1042.1999999999998 IEEE-754 drift.',
        riskAssessment: {
          level: RiskLevel.LOW,
          summary: 'Localized to internal calculation and cutoff helper inside settlement.py.',
          blastRadius: 'Daily batch reconciliation totals and cutoff comparison.',
          sideEffects: ['Naive timestamps will be normalized to UTC.'],
        },
      },
      patch: null,
      verification: {
        ...DEMO_PRE_PATCH_VERIFICATION,
        verificationId: `ver-pre-${id}`,
        analysisId: id,
      },
      finalStatus: VerificationStatus.NOT_VERIFIED,
    };

    setDemoSessions((prev) => [newSession, ...prev]);
    setDemoActivities((prev) => [
      {
        id: `act-${Date.now()}`,
        timestamp: nowIso,
        repositoryFullName: repo.fullName,
        title: 'Demo root-cause analysis completed',
        detail: params.bugTitle,
        status: VerificationStatus.NOT_VERIFIED,
        sessionId: id,
        isDemoData: true,
      },
      ...prev,
    ]);
    setActiveSessionId(id);
    navigate('workspace');
  };

  const updateSessionInStore = (
    sessionId: string,
    updater: (s: DebuggingSession) => DebuggingSession
  ) => {
    const applyUpdate = (list: DebuggingSession[]) =>
      list.map((s) => (s.id === sessionId ? updater(s) : s));

    if (mode === ExecutionMode.DEMO) {
      setDemoSessions(applyUpdate);
    } else {
      setLiveSessions(applyUpdate);
    }
  };

  const handlePatchGenerated = (sessionId: string, patch: CodePatch) => {
    updateSessionInStore(sessionId, (s) => ({
      ...s,
      updatedAt: new Date().toISOString(),
      patch: { ...patch, decision: PatchDecision.PROPOSED },
      finalStatus: VerificationStatus.NOT_VERIFIED,
      stages: s.stages.map((st) =>
        st.key === AnalysisStageKey.PATCH_GENERATION
          ? { ...st, status: StageStatus.COMPLETED, durationMs: st.durationMs ?? 820 }
          : st
      ),
    }));
  };

  const handleTriggerDemoPatchGeneration = (sessionId: string) => {
    const nowIso = new Date().toISOString();
    const patch: CodePatch = {
      ...DEMO_PATCH,
      patchId: `demo-patch-${sessionId.slice(-4)}`,
      analysisId: sessionId,
      generatedAt: nowIso,
      decision: PatchDecision.PROPOSED,
    };
    handlePatchGenerated(sessionId, patch);
  };

  const handleUpdatePatchDecision = (
    sessionId: string,
    decision: PatchDecision,
    rejectionReason?: string
  ) => {
    const nowIso = new Date().toISOString();
    updateSessionInStore(sessionId, (s) => {
      if (!s.patch) return s;
      const resetVerification =
        decision === PatchDecision.ROLLED_BACK || decision === PatchDecision.REJECTED;

      return {
        ...s,
        updatedAt: nowIso,
        patch: {
          ...s.patch,
          decision,
          decisionUpdatedAt: nowIso,
          rejectionReason,
        },
        finalStatus: resetVerification ? VerificationStatus.NOT_VERIFIED : s.finalStatus,
        verification: resetVerification
          ? s.verification
            ? {
                ...s.verification,
                status: VerificationStatus.NOT_VERIFIED,
                statusReason:
                  decision === PatchDecision.ROLLED_BACK
                    ? 'Patch rolled back to original code; verification reset to NOT VERIFIED.'
                    : 'Proposed patch rejected by developer.',
                patchedTests: null,
              }
            : null
          : s.verification,
        stages: resetVerification
          ? s.stages.map((st) =>
              st.key === AnalysisStageKey.VERIFICATION
                ? { ...st, status: StageStatus.PENDING }
                : st
            )
          : s.stages,
      };
    });
  };

  const handleVerificationCompleted = (
    sessionId: string,
    verification: VerificationResult
  ) => {
    const nowIso = new Date().toISOString();
    updateSessionInStore(sessionId, (s) => ({
      ...s,
      updatedAt: nowIso,
      verification,
      finalStatus: verification.status,
      stages: s.stages.map((st) =>
        st.key === AnalysisStageKey.VERIFICATION
          ? {
              ...st,
              status:
                verification.status === VerificationStatus.VERIFIED
                  ? StageStatus.COMPLETED
                  : StageStatus.FAILED,
              durationMs: verification.patchedTests?.durationMs ?? 389,
              description: verification.statusReason,
            }
          : st
      ),
    }));

    const target = sessions.find((s) => s.id === sessionId);
    const activityItem: ActivityFeedItem = {
      id: `act-${Date.now()}`,
      timestamp: nowIso,
      repositoryFullName: target?.repositoryFullName ?? 'repository',
      title: `Verification ${verification.status}`,
      detail: verification.statusReason,
      status: verification.status,
      sessionId,
      isDemoData: verification.isSimulated,
    };

    if (mode === ExecutionMode.DEMO) {
      setDemoActivities((prev) => [activityItem, ...prev]);
    } else {
      setLiveActivities((prev) => [activityItem, ...prev]);
    }
  };

  const handleRunDemoVerification = (sessionId: string) => {
    const nowIso = new Date().toISOString();
    const simResult: VerificationResult = {
      ...DEMO_POST_PATCH_VERIFICATION,
      verificationId: `demo-ver-${sessionId.slice(-4)}`,
      analysisId: sessionId,
      verifiedAt: nowIso,
    };
    handleVerificationCompleted(sessionId, simResult);
  };

  const handleExploreDemo = () => {
    setMode(ExecutionMode.DEMO);
    setSelectedRepoId(DEMO_REPOSITORY.id);
    setActiveSessionId('demo-session-842');
    navigate('dashboard');
  };

  const handleLaunchGuidedDemo = () => {
    setMode(ExecutionMode.DEMO);
    setSelectedRepoId(DEMO_REPOSITORY.id);
    navigate('submit-bug');
  };

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? null;
  const activeRepository =
    repositories.find((r) => r.id === (activeSession?.repositoryId ?? selectedRepoId)) ??
    repositories[0] ??
    null;

  return (
    <>
      {currentView === 'landing' ? (
        <LandingPage
          onStartDebugging={() => navigate('dashboard')}
          onExploreDemo={handleExploreDemo}
          onNavigate={navigate}
        />
      ) : (
        <DashboardShell
          currentView={currentView}
          mode={mode}
          activeSessionTitle={activeSession?.bugTitle}
          onNavigate={navigate}
          onOpenConfig={() => setConfigModalOpen(true)}
        >
          {currentView === 'dashboard' && (
            <DashboardOverviewPage
              mode={mode}
              repositories={repositories}
              sessions={sessions}
              activities={activities}
              onSelectSession={(id, target = 'workspace') => {
                setActiveSessionId(id);
                navigate(target);
              }}
              onNavigate={navigate}
              onLaunchGuidedDemo={handleLaunchGuidedDemo}
            />
          )}

          {currentView === 'repositories' && (
            <RepositoryConnectionPage
              mode={mode}
              repositories={repositories}
              selectedRepoId={selectedRepoId}
              onSelectRepo={setSelectedRepoId}
              onRepositoryImported={handleRepositoryImported}
              onStartDebuggingWithRepo={(repoId) => {
                setSelectedRepoId(repoId);
                navigate('submit-bug');
              }}
              onSwitchToDemo={() => handleModeChange(ExecutionMode.DEMO)}
            />
          )}

          {currentView === 'submit-bug' && (
            <BugSubmissionPage
              mode={mode}
              repositories={repositories}
              preselectedRepoId={selectedRepoId}
              onAnalysisStarted={handleAnalysisStarted}
              onCreateDemoAnalysis={handleCreateDemoAnalysis}
              onNavigate={navigate}
            />
          )}

          {currentView === 'workspace' && (
            <AnalysisWorkspacePage
              mode={mode}
              session={activeSession}
              repository={activeRepository}
              onSessionUpdated={(updated) =>
                updateSessionInStore(updated.id, () => updated)
              }
              onPatchGenerated={handlePatchGenerated}
              onTriggerDemoPatchGeneration={handleTriggerDemoPatchGeneration}
              onNavigate={navigate}
            />
          )}

          {currentView === 'patch' && (
            <CodePatchViewerPage
              mode={mode}
              session={activeSession}
              onUpdatePatchDecision={handleUpdatePatchDecision}
              onPatchGenerated={handlePatchGenerated}
              onVerificationCompleted={handleVerificationCompleted}
              onRunDemoVerification={handleRunDemoVerification}
              onTriggerDemoPatchGeneration={handleTriggerDemoPatchGeneration}
              onNavigate={navigate}
            />
          )}

          {currentView === 'verification' && (
            <VerificationResultsPage
              mode={mode}
              session={activeSession}
              onVerificationCompleted={handleVerificationCompleted}
              onRunDemoVerification={handleRunDemoVerification}
              onNavigate={navigate}
            />
          )}

          {currentView === 'reports' && (
            <ReportsHistoryPage
              mode={mode}
              sessions={sessions}
              activeSessionId={activeSession?.id ?? null}
              onSelectSession={(id, target = 'verification') => {
                setActiveSessionId(id);
                navigate(target);
              }}
            />
          )}
        </DashboardShell>
      )}

      <BackendConfigModal
        isOpen={configModalOpen}
        mode={mode}
        onModeChange={handleModeChange}
        onClose={() => setConfigModalOpen(false)}
      />
    </>
  );
}
