import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCode2,
  GitBranch,
  Menu,
  Play,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  X,
  XCircle,
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { AppView } from '../types/repoguard';

interface LandingPageProps {
  onStartDebugging: () => void;
  onExploreDemo: () => void;
  onNavigate: (view: AppView) => void;
}

type PreviewStage = 'reproduce' | 'root_cause' | 'patch' | 'verify';

const PREVIEW_STAGES: {
  id: PreviewStage;
  step: string;
  label: string;
  summary: string;
}[] = [
  {
    id: 'reproduce',
    step: '01',
    label: 'Reproduce',
    summary: 'Confirm baseline test failure in isolated runner before touching source code.',
  },
  {
    id: 'root_cause',
    step: '02',
    label: 'Root Cause',
    summary: 'Trace stack frames to exact module, line range, and failure mechanism.',
  },
  {
    id: 'patch',
    step: '03',
    label: 'Patch Diff',
    summary: 'Review proposed minimal diff with explicit developer approval controls.',
  },
  {
    id: 'verify',
    step: '04',
    label: 'Verify',
    summary: 'Execute full test suite post-patch to prove fix and detect regressions.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartDebugging,
  onExploreDemo,
  onNavigate,
}) => {
  const [activePreview, setActivePreview] = useState<PreviewStage>('verify');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col">
      {/* Top Bar: 3-zone contract */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#070B14]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="whitespace-nowrap shrink-0 rounded"
          >
            <BrandLogo size="md" />
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <a
              href="#workflow"
              className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Workflow
            </a>
            <a
              href="#capabilities"
              className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Capabilities
            </a>
            <a
              href="#verification"
              className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Verification
            </a>
            <a
              href="#architecture"
              className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Architecture
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onStartDebugging}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Start Debugging</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-md border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
              aria-label="Toggle navigation links"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-slate-800/80 bg-[#0A101D] px-4 py-3 flex flex-col gap-1 text-sm font-medium text-slate-300">
            {[
              { href: '#workflow', label: 'Workflow' },
              { href: '#capabilities', label: 'Capabilities' },
              { href: '#verification', label: 'Verification' },
              { href: '#architecture', label: 'Architecture' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-md hover:bg-[#111B2E] hover:text-cyan-300 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main id="top" className="flex-1">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-20 lg:pt-20 lg:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-sm font-semibold text-cyan-400 tracking-wide mb-4">
                Autonomous Debugging &amp; Verified Code Repair
              </p>
              <h1
                className="font-display font-bold tracking-tight text-slate-50 leading-[1.08] mb-6"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.55rem)', textWrap: 'balance' }}
              >
                Find the Bug. Fix the Code. Verify the Result.
              </h1>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-[54ch] mb-4">
                Don&apos;t just fix the bug. Prove the fix works. REPOGUARD connects to your GitHub
                repository, isolates root causes from real error logs, drafts targeted patches, and
                runs before-and-after test suites before any change is accepted.
              </p>
              <p className="text-sm text-slate-400 max-w-[56ch] leading-relaxed mb-8">
                Built for engineering teams who treat AI-generated patches as unverified hypotheses
                until test execution produces concrete evidence.
              </p>

              <div className="flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={onStartDebugging}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Start Debugging</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onExploreDemo}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-md border border-slate-700 bg-[#0B1220] text-slate-100 hover:border-cyan-500/60 hover:bg-[#10192B] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Play className="w-4 h-4 text-cyan-400" />
                  <span>Explore Demo</span>
                </button>
              </div>

              <div className="mt-10 pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-6 max-w-lg">
                <div>
                  <div className="font-mono text-base sm:text-lg font-semibold text-slate-100 tabular-nums">
                    6 Stages
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Inspect to proof pipeline</div>
                </div>
                <div>
                  <div className="font-mono text-base sm:text-lg font-semibold text-slate-100 tabular-nums">
                    Before / After
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Regression-checked tests</div>
                </div>
                <div>
                  <div className="font-mono text-base sm:text-lg font-semibold text-slate-100 tabular-nums">
                    Zero Auto-Push
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Explicit approval gate</div>
                </div>
              </div>
            </div>

            {/* Interactive Product Workflow Illustration */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="flex-1 rounded-lg border border-slate-800 bg-[#0B1220] overflow-hidden flex flex-col">
                <div className="px-5 py-3.5 border-b border-slate-800/90 bg-[#090F1D] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-300 min-w-0">
                    <GitBranch className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">acme-fintech/ledger-reconciler · main</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400 whitespace-nowrap shrink-0">
                    Interactive Preview
                  </span>
                </div>

                {/* Stage Switcher */}
                <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-800/80 bg-[#0A111F]">
                  {PREVIEW_STAGES.map((stage) => {
                    const isActive = activePreview === stage.id;
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => setActivePreview(stage.id)}
                        className={`px-3.5 py-3 text-left border-b-2 transition-colors cursor-pointer ${
                          isActive
                            ? 'border-cyan-400 bg-[#111B2E] text-slate-100'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#0E1729]'
                        }`}
                      >
                        <div className="font-mono text-[11px] text-cyan-400 tabular-nums">
                          {stage.step}
                        </div>
                        <div className="text-xs font-semibold truncate mt-0.5">{stage.label}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Stage Content */}
                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-5">
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {PREVIEW_STAGES.find((s) => s.id === activePreview)?.summary}
                  </p>

                  {activePreview === 'reproduce' && (
                    <div className="rounded-md border border-slate-800 bg-[#070B14] p-4 font-mono text-xs space-y-2.5 overflow-x-auto">
                      <div className="text-slate-400">$ pytest tests/ -v --tb=short</div>
                      <div className="flex items-center gap-2 text-rose-300">
                        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>test_exact_decimal_accumulation FAILED</span>
                      </div>
                      <div className="flex items-center gap-2 text-rose-300">
                        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>test_mixed_naive_and_aware_timestamps FAILED</span>
                      </div>
                      <div className="text-slate-400 pt-2 border-t border-slate-800/80">
                        AssertionError: 1042.1999999999998 != 1042.20 · 2 failed, 8 passed
                      </div>
                    </div>
                  )}

                  {activePreview === 'root_cause' && (
                    <div className="rounded-md border border-slate-800 bg-[#070B14] p-4 space-y-3 text-xs">
                      <div className="flex items-center justify-between text-slate-400 font-mono">
                        <span>src/reconciler/settlement.py</span>
                        <span>Lines 7–31</span>
                      </div>
                      <div className="text-slate-200 leading-relaxed">
                        Binary float accumulation (<code className="text-cyan-300">float(amount_cents) / 100.0</code>) introduces sub-cent precision drift before strict equality comparison. Additionally, <code className="text-cyan-300">normalize_cutoff</code> returns naive datetimes without UTC <code className="text-cyan-300">tzinfo</code>.
                      </div>
                      <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-slate-400">
                        <span>Blast radius: reconcile_daily_settlements</span>
                        <span className="text-cyan-300 font-semibold">Low Risk</span>
                      </div>
                    </div>
                  )}

                  {activePreview === 'patch' && (
                    <div className="rounded-md border border-slate-800 bg-[#070B14] overflow-hidden font-mono text-xs">
                      <div className="px-3.5 py-2.5 border-b border-slate-800 text-slate-400 flex items-center justify-between">
                        <span>src/reconciler/settlement.py</span>
                        <span className="tabular-nums">+9 / -7 lines</span>
                      </div>
                      <div className="p-3.5 space-y-1.5 overflow-x-auto">
                        <div className="px-2 py-0.5 bg-rose-950/50 text-rose-300 whitespace-pre">
                          -     running_total += float(entry.amount_cents) / 100.0
                        </div>
                        <div className="px-2 py-0.5 bg-emerald-950/45 text-emerald-300 whitespace-pre">
                          +     running_total += (Decimal(entry.amount_cents) / Decimal(100)).quantize(CENTS_QUANT)
                        </div>
                        <div className="px-2 py-0.5 bg-rose-950/50 text-rose-300 whitespace-pre">
                          -     if ts.tzinfo is None: return ts
                        </div>
                        <div className="px-2 py-0.5 bg-emerald-950/45 text-emerald-300 whitespace-pre">
                          +     if ts.tzinfo is None: return ts.replace(tzinfo=timezone.utc)
                        </div>
                      </div>
                    </div>
                  )}

                  {activePreview === 'verify' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-md border border-slate-800 bg-[#070B14] p-4">
                          <div className="text-xs text-slate-400 mb-1">Before Patch</div>
                          <div className="font-mono text-base font-semibold text-rose-300 tabular-nums">
                            8 / 10 Passed
                          </div>
                          <div className="text-xs text-slate-400 mt-1 tabular-nums">
                            2 failed · 412ms
                          </div>
                        </div>
                        <div className="rounded-md border border-emerald-500/35 bg-emerald-950/20 p-4">
                          <div className="text-xs text-emerald-300 mb-1">After Patch</div>
                          <div className="font-mono text-base font-semibold text-emerald-200 tabular-nums">
                            10 / 10 Passed
                          </div>
                          <div className="text-xs text-emerald-300/80 mt-1 tabular-nums">
                            0 regressions · 389ms
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2.5 rounded-md border border-emerald-500/35 bg-emerald-950/30 text-xs">
                        <span className="inline-flex items-center gap-2 font-semibold text-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Status: VERIFIED</span>
                        </span>
                        <span className="text-emerald-300/90">Evidence recorded</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-3.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                    <span>Click any stage above to inspect the workflow</span>
                    <button
                      type="button"
                      onClick={onExploreDemo}
                      className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open full interactive demo</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="workflow" className="border-t border-slate-800/80 bg-[#0A101D]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-24">
            <div className="max-w-2xl mb-12">
              <p className="text-sm font-semibold text-cyan-400 mb-2">Verification Pipeline</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
                Six auditable stages from traceback to proof
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  num: '01.',
                  title: 'Repository Ingestion',
                  desc: 'Validate public GitHub repository URLs, map source directories, and detect language and test runners through the FastAPI backend.',
                },
                {
                  num: '02.',
                  title: 'Source-Code Inspection',
                  desc: 'Parse error logs and trace stack frames directly to candidate modules, dataclasses, and configuration files.',
                },
                {
                  num: '03.',
                  title: 'Root-Cause Investigation',
                  desc: 'Document the underlying fault mechanism, affected function boundaries, and operational blast radius before writing code.',
                },
                {
                  num: '04.',
                  title: 'Baseline Bug Reproduction',
                  desc: 'Run the existing test suite in an isolated execution environment to confirm the failure exists prior to repair.',
                },
                {
                  num: '05.',
                  title: 'Patch Diff Generation',
                  desc: 'Produce a minimal, human-reviewable diff with explicit Apply, Reject, and Rollback controls. No silent repository writes.',
                },
                {
                  num: '06.',
                  title: 'Post-Patch Verification',
                  desc: 'Execute tests after applying the approved patch, compare before-and-after outcomes, and assign VERIFIED only on passing evidence.',
                },
              ].map((step) => (
                <div
                  key={step.num}
                  className="p-6 rounded-lg border border-slate-800/90 bg-[#0B1220] flex flex-col justify-between"
                >
                  <div>
                    <div className="font-mono text-sm font-semibold text-cyan-400 mb-3 tabular-nums">
                      {step.num}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-slate-100 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Capabilities Bento Grid */}
        <section id="capabilities" className="border-t border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-24">
            <div className="max-w-2xl mb-12">
              <p className="text-sm font-semibold text-cyan-400 mb-2">Platform Capabilities</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
                Engineered for real debugging workflows, not chat prompts
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-6 sm:p-7 rounded-lg border border-slate-800 bg-[#0B1220] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 text-cyan-400 text-sm font-semibold mb-3">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Evidence-Gated Verification</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-100 mb-3">
                    AI-generated patches start as NOT VERIFIED
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-2xl mb-6">
                    Every proposed patch enters a strict verification lifecycle. REPOGUARD separates
                    patch synthesis from test execution so developers can see exact pre-patch
                    failures, post-patch passes, regression counts, and raw runner logs side by side.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-5 border-t border-slate-800/80 text-xs">
                  <div className="p-3.5 rounded-md border border-emerald-500/30 bg-emerald-950/20">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>VERIFIED</span>
                    </div>
                    <p className="text-[11px] text-emerald-200/75 mt-1">
                      Target tests pass with 0 regressions.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-md border border-amber-500/30 bg-amber-950/20">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>PARTIAL</span>
                    </div>
                    <p className="text-[11px] text-amber-200/75 mt-1">
                      Partial pass or skipped suite assertions.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-md border border-rose-500/30 bg-rose-950/20">
                    <div className="flex items-center gap-1.5 font-semibold text-rose-300">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>FAILED</span>
                    </div>
                    <p className="text-[11px] text-rose-200/75 mt-1">
                      Post-patch failure or regression found.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-md border border-slate-700 bg-slate-900/80">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                      <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>NOT VERIFIED</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Proposed patch not tested yet.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-7 rounded-lg border border-slate-800 bg-[#0B1220] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 text-blue-400 text-sm font-semibold mb-3">
                    <FileCode2 className="w-4 h-4" />
                    <span>Diff &amp; Rollback Control</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-100 mb-3">
                    Human approval before every mutation
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Inspect unified or split line diffs, review affected modules, and explicitly
                    apply, reject, or roll back patches without ever auto-committing to GitHub.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Unified &amp; Split Views</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('patch')}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Inspect Diff Viewer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-6 sm:p-7 rounded-lg border border-slate-800 bg-[#0B1220] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 text-cyan-400 text-sm font-semibold mb-3">
                    <Terminal className="w-4 h-4" />
                    <span>FastAPI Backend Contract</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-100 mb-3">
                    Ready for Python &amp; Docker sandboxes
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Typed TypeScript API client configured via environment variable for repository
                    import, async analysis polling, repair synthesis, isolated verification, and
                    exportable Markdown/JSON audit reports.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-2 p-6 sm:p-7 rounded-lg border border-slate-800 bg-[#0B1220] flex flex-col justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-400 mb-2">
                    Prepared Python Demo Repository
                  </p>
                  <h3 className="font-display text-xl font-bold text-slate-100 mb-3">
                    Experience the complete repair loop in Demo Mode
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                    Test the platform immediately using the prepared{' '}
                    <code className="text-cyan-300">acme-fintech/ledger-reconciler</code> Python
                    repository. Walk through repository inspection, bug submission, root-cause
                    reasoning, patch diff review, and simulated before-and-after pytest output.
                  </p>
                </div>
                <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={onExploreDemo}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
                  >
                    <span>Launch Demo Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('reports')}
                    className="text-xs font-semibold text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    View Sample Audit Reports
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Verification & Architecture Section */}
        <section id="verification" className="border-t border-slate-800/80 bg-[#0A101D]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <p className="text-sm font-semibold text-cyan-400 mb-2">Core Principle</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight mb-4">
                Verification is the product
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6">
                AI-generated code is only a proposed repair. A repair becomes verified only after
                actual test execution provides evidence that it works and introduces zero
                regressions.
              </p>
              <button
                type="button"
                onClick={onStartDebugging}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer"
              >
                <span>Open Developer Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div id="architecture" className="lg:col-span-7 rounded-lg border border-slate-800 bg-[#0B1220] overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800/80 bg-[#090F1D]">
                <h3 className="font-display text-base font-semibold text-slate-100">
                  External FastAPI Integration Endpoints
                </h3>
              </div>
              <div className="divide-y divide-slate-800/80 text-xs">
                {[
                  { method: 'POST', path: '/api/repository/import', desc: 'Clone & index public GitHub repo metadata and file tree' },
                  { method: 'POST', path: '/api/analysis/start', desc: 'Submit bug description + error log to begin 6-stage pipeline' },
                  { method: 'GET', path: '/api/analysis/{id}', desc: 'Poll stage progression, root cause, and risk assessment' },
                  { method: 'POST', path: '/api/repair/generate', desc: 'Generate minimal proposed diff patch for developer review' },
                  { method: 'POST', path: '/api/repair/verify', desc: 'Execute pre/post-patch test suite in isolated backend sandbox' },
                  { method: 'GET', path: '/api/report/{id}', desc: 'Fetch complete verification evidence and exportable audit report' },
                ].map((ep) => (
                  <div
                    key={ep.path}
                    className="px-6 py-3.5 grid grid-cols-1 sm:grid-cols-[64px_210px_1fr] items-start sm:items-center gap-2 sm:gap-4"
                  >
                    <span className="font-mono px-2 py-0.5 rounded bg-[#070B14] border border-slate-700 text-cyan-300 font-semibold w-14 text-center">
                      {ep.method}
                    </span>
                    <span className="font-mono text-slate-100 truncate">{ep.path}</span>
                    <span className="text-slate-400">{ep.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070B14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <BrandLogo size="sm" />
            <span>Don&apos;t just fix the bug. Prove the fix works.</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onStartDebugging}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={onExploreDemo}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Demo Mode
            </button>
            <button
              type="button"
              onClick={() => onNavigate('repositories')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Connect Repository
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
