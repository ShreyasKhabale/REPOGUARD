import React from 'react';
import { Activity, CheckSquare, FileDiff, FileText } from 'lucide-react';
import { AppView, DebuggingSession } from '../types/repoguard';

interface SessionPipelineNavProps {
  currentView: AppView;
  session: DebuggingSession;
  onNavigate: (view: AppView) => void;
}

const STEPS: {
  view: AppView;
  step: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { view: 'workspace', step: '01', label: 'Analysis & Root Cause', icon: Activity },
  { view: 'patch', step: '02', label: 'Code Patch Diff', icon: FileDiff },
  { view: 'verification', step: '03', label: 'Verification Proof', icon: CheckSquare },
  { view: 'reports', step: '04', label: 'Audit Report', icon: FileText },
];

export const SessionPipelineNav: React.FC<SessionPipelineNavProps> = ({
  currentView,
  session,
  onNavigate,
}) => {
  return (
    <div
      className="rounded-lg border border-slate-800/90 bg-[#0B1220] p-1.5 grid grid-cols-2 lg:grid-cols-4 gap-1.5"
      role="navigation"
      aria-label="Session workflow steps"
    >
      {STEPS.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.view;
        const hasPatch = Boolean(session.patch);
        const hasVerification = Boolean(session.verification);

        let metaText = 'Ready';
        if (item.view === 'workspace') {
          metaText = session.rootCause ? 'Root cause mapped' : 'Pending analysis';
        } else if (item.view === 'patch') {
          metaText = hasPatch ? `Decision: ${session.patch?.decision.replace('_', ' ')}` : 'Not generated';
        } else if (item.view === 'verification') {
          metaText = hasVerification ? session.finalStatus : 'Not verified';
        } else if (item.view === 'reports') {
          metaText = session.reportId;
        }

        return (
          <button
            key={item.view}
            type="button"
            onClick={() => onNavigate(item.view)}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md text-left transition-colors cursor-pointer min-w-0 ${
              isActive
                ? 'bg-[#131F36] border border-cyan-500/40 text-slate-100'
                : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#10192B]'
            }`}
          >
            <div
              className={`w-7 h-7 rounded flex items-center justify-center shrink-0 border ${
                isActive
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-[#070B14] border-slate-800 text-slate-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">
                <span className="font-mono text-[11px] text-cyan-400 mr-1.5 tabular-nums">
                  {item.step}
                </span>
                <span>{item.label}</span>
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">{metaText}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
