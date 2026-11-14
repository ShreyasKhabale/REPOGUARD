import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { RiskLevel, VerificationStatus } from '../types/repoguard';

interface StatusIndicatorProps {
  status: VerificationStatus | 'IN_PROGRESS';
  compact?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, compact = false }) => {
  const baseClass = compact
    ? 'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border whitespace-nowrap shrink-0'
    : 'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold tracking-wide rounded border whitespace-nowrap shrink-0';

  switch (status) {
    case VerificationStatus.VERIFIED:
      return (
        <span className={`${baseClass} bg-emerald-950/50 border-emerald-500/35 text-emerald-300`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>VERIFIED</span>
        </span>
      );
    case VerificationStatus.PARTIALLY_VERIFIED:
      return (
        <span className={`${baseClass} bg-amber-950/50 border-amber-500/35 text-amber-300`}>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>PARTIALLY VERIFIED</span>
        </span>
      );
    case VerificationStatus.VERIFICATION_FAILED:
      return (
        <span className={`${baseClass} bg-rose-950/60 border-rose-500/40 text-rose-300`}>
          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>VERIFICATION FAILED</span>
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className={`${baseClass} bg-cyan-950/50 border-cyan-500/35 text-cyan-300`}>
          <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>ANALYZING</span>
        </span>
      );
    case VerificationStatus.NOT_VERIFIED:
    default:
      return (
        <span className={`${baseClass} bg-slate-900 border-slate-700 text-slate-300`}>
          <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>NOT VERIFIED</span>
        </span>
      );
  }
};

export const RiskIndicator: React.FC<{ level: RiskLevel }> = ({ level }) => {
  if (level === RiskLevel.HIGH) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded border bg-rose-950/50 border-rose-500/35 text-rose-300 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 text-rose-400" />
        <span>High Risk</span>
      </span>
    );
  }
  if (level === RiskLevel.MEDIUM) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded border bg-amber-950/50 border-amber-500/35 text-amber-300 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        <span>Medium Risk</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded border bg-cyan-950/40 border-cyan-500/30 text-cyan-300 whitespace-nowrap">
      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
      <span>Low Risk</span>
    </span>
  );
};
