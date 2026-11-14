import React, { useState } from 'react';
import {
  Activity,
  Bug,
  CheckSquare,
  FileDiff,
  FolderGit2,
  History,
  Home,
  LayoutDashboard,
  Menu,
  Plus,
  Server,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { AppView, ExecutionMode } from '../types/repoguard';
import { getApiBaseUrl } from '../services/repoguardApi';

interface DashboardShellProps {
  currentView: AppView;
  mode: ExecutionMode;
  activeSessionTitle?: string;
  onNavigate: (view: AppView) => void;
  onOpenConfig: () => void;
  children: React.ReactNode;
}

const WORKSPACE_NAV: { id: AppView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'repositories', label: 'Repositories', icon: FolderGit2 },
  { id: 'submit-bug', label: 'Submit Bug', icon: Bug },
];

const PIPELINE_NAV: { id: AppView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'workspace', label: 'Analysis Workspace', icon: Activity },
  { id: 'patch', label: 'Code Patch Viewer', icon: FileDiff },
  { id: 'verification', label: 'Verification Results', icon: CheckSquare },
  { id: 'reports', label: 'History & Reports', icon: History },
];

const VIEW_TITLES: Record<AppView, string> = {
  landing: 'Landing',
  dashboard: 'Developer Overview',
  repositories: 'Repository Connection',
  'submit-bug': 'Bug Submission',
  workspace: 'Analysis Workspace',
  patch: 'Code Patch Viewer',
  verification: 'Verification Results',
  reports: 'Debugging History & Reports',
};

export const DashboardShell: React.FC<DashboardShellProps> = ({
  currentView,
  mode,
  activeSessionTitle,
  onNavigate,
  onOpenConfig,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (view: AppView) => {
    onNavigate(view);
    setMobileOpen(false);
  };

  const renderNavButton = (item: {
    id: AppView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }) => {
    const Icon = item.icon;
    const active = currentView === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleNav(item.id)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
          active
            ? 'bg-[#121E33] text-cyan-200 border border-cyan-500/35'
            : 'text-slate-400 hover:text-slate-100 hover:bg-[#0E1628] border border-transparent'
        }`}
      >
        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#090F1D] border-r border-slate-800/80">
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80 shrink-0">
        <button
          type="button"
          onClick={() => handleNav('landing')}
          className="text-left rounded cursor-pointer"
          title="Return to Landing Page"
        >
          <BrandLogo size="sm" />
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-2 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
          aria-label="Close navigation menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto" aria-label="Workspace navigation">
        <div className="space-y-1">
          <div className="px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-slate-500">
            Workspace
          </div>
          {WORKSPACE_NAV.map(renderNavButton)}
        </div>

        <div className="space-y-1 pt-2 border-t border-slate-800/70">
          <div className="px-3 pb-1.5 pt-2 text-[11px] font-semibold tracking-wide text-slate-500">
            Repair Pipeline
          </div>
          {PIPELINE_NAV.map(renderNavButton)}
        </div>
      </nav>

      <div className="p-3.5 border-t border-slate-800/80 space-y-2 shrink-0">
        <button
          type="button"
          onClick={onOpenConfig}
          className="w-full p-3 rounded-md border border-slate-800 bg-[#0B1220] hover:border-slate-700 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-200 mb-1">
            <span>{mode === ExecutionMode.DEMO ? 'Demo Mode Active' : 'FastAPI Backend'}</span>
            <Server className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-[11px] font-mono text-slate-400 truncate">
            {mode === ExecutionMode.DEMO ? 'Prepared Python Sandbox' : getApiBaseUrl()}
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleNav('landing')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-[#0E1628] transition-colors cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Back to Landing Page</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10">{sidebarContent}</div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80 bg-[#070B14]/95 backdrop-blur-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-md border border-slate-800 bg-[#0B1220] text-slate-300 hover:text-white cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 hidden sm:inline whitespace-nowrap">REPOGUARD</span>
              <span className="text-slate-700 hidden sm:inline">/</span>
              <span className="font-display font-semibold text-slate-100 truncate">
                {VIEW_TITLES[currentView]}
              </span>
              {activeSessionTitle && (
                <>
                  <span className="text-slate-700 hidden md:inline">/</span>
                  <span className="text-xs text-slate-400 truncate max-w-[260px] hidden md:inline">
                    {activeSessionTitle}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenConfig}
              className={`px-3 py-2 rounded-md border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === ExecutionMode.DEMO
                  ? 'border-amber-500/40 bg-amber-950/35 text-amber-200 hover:bg-amber-950/55'
                  : 'border-cyan-500/40 bg-cyan-950/35 text-cyan-200 hover:bg-cyan-950/55'
              }`}
            >
              {mode === ExecutionMode.DEMO ? 'DEMO MODE' : 'LIVE BACKEND'}
            </button>
            <button
              type="button"
              onClick={() => handleNav('submit-bug')}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Analysis</span>
              <span className="sm:hidden">Analyze</span>
            </button>
          </div>
        </header>

        {/* Unambiguous Demo Mode vs Live Execution Notice */}
        {mode === ExecutionMode.DEMO && (
          <div className="px-4 sm:px-6 lg:px-8 py-2.5 border-b border-amber-500/25 bg-amber-950/20 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200">
            <div className="leading-relaxed">
              <strong className="font-semibold">DEMO MODE — Simulated Demonstration Data:</strong>{' '}
              Using prepared Python repository{' '}
              <code className="font-mono text-amber-100">acme-fintech/ledger-reconciler</code>.
              Test results shown here are simulated and not executed in a live Docker sandbox.
            </div>
            <button
              type="button"
              onClick={onOpenConfig}
              className="text-amber-300 hover:text-amber-100 underline underline-offset-2 font-medium whitespace-nowrap cursor-pointer"
            >
              Connect FastAPI Backend
            </button>
          </div>
        )}

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
