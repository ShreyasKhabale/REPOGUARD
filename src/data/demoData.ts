import {
  ActivityFeedItem,
  AnalysisStageKey,
  CodePatch,
  DebuggingSession,
  PatchDecision,
  RepositoryInfo,
  RiskLevel,
  StageStatus,
  VerificationResult,
  VerificationStatus,
} from '../types/repoguard';

const SETTLEMENT_ORIGINAL = `from datetime import datetime, timezone
from typing import Iterable
from .models import SettlementEntry, ReconciliationSummary


def normalize_cutoff(ts: datetime) -> datetime:
    if ts.tzinfo is None:
        return ts
    return ts.astimezone(timezone.utc)


def reconcile_daily_settlements(
    entries: Iterable[SettlementEntry],
    cutoff_utc: datetime,
    expected_total: float,
) -> ReconciliationSummary:
    """Aggregate cleared entries up to cutoff_utc and verify batch balance."""
    normalized_cutoff = normalize_cutoff(cutoff_utc)
    running_total = 0.0
    matched_ids: list[str] = []

    for entry in entries:
        entry_ts = normalize_cutoff(entry.settled_at)
        if entry_ts <= normalized_cutoff and entry.status == "CLEARED":
            running_total += float(entry.amount_cents) / 100.0
            matched_ids.append(entry.id)

    discrepancy = abs(running_total - expected_total)
    is_balanced = discrepancy == 0.0

    return ReconciliationSummary(
        matched_count=len(matched_ids),
        total_amount=running_total,
        expected_amount=expected_total,
        discrepancy=discrepancy,
        is_balanced=is_balanced,
    )`;

const SETTLEMENT_MODIFIED = `from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Iterable
from .models import SettlementEntry, ReconciliationSummary

CENTS_QUANT = Decimal("0.01")


def normalize_cutoff(ts: datetime) -> datetime:
    if ts.tzinfo is None:
        return ts.replace(tzinfo=timezone.utc)
    return ts.astimezone(timezone.utc)


def reconcile_daily_settlements(
    entries: Iterable[SettlementEntry],
    cutoff_utc: datetime,
    expected_total: float | Decimal,
) -> ReconciliationSummary:
    """Aggregate cleared entries up to cutoff_utc and verify exact decimal batch balance."""
    normalized_cutoff = normalize_cutoff(cutoff_utc)
    expected_dec = Decimal(str(expected_total)).quantize(CENTS_QUANT, rounding=ROUND_HALF_UP)
    running_total = Decimal("0.00")
    matched_ids: list[str] = []

    for entry in entries:
        entry_ts = normalize_cutoff(entry.settled_at)
        if entry_ts <= normalized_cutoff and entry.status == "CLEARED":
            running_total += (Decimal(entry.amount_cents) / Decimal(100)).quantize(
                CENTS_QUANT, rounding=ROUND_HALF_UP
            )
            matched_ids.append(entry.id)

    discrepancy = abs(running_total - expected_dec)
    is_balanced = discrepancy == Decimal("0.00")

    return ReconciliationSummary(
        matched_count=len(matched_ids),
        total_amount=float(running_total),
        expected_amount=float(expected_dec),
        discrepancy=float(discrepancy),
        is_balanced=is_balanced,
    )`;

const MODELS_CODE = `from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class SettlementEntry:
    id: str
    settled_at: datetime
    amount_cents: int
    status: str


@dataclass(frozen=True)
class ReconciliationSummary:
    matched_count: int
    total_amount: float
    expected_amount: float
    discrepancy: float
    is_balanced: bool`;

const TEST_SETTLEMENT_CODE = `from datetime import datetime, timezone, timedelta
from src.reconciler.models import SettlementEntry
from src.reconciler.settlement import reconcile_daily_settlements


def test_exact_decimal_accumulation():
    cutoff = datetime(2026, 11, 10, 23, 59, tzinfo=timezone.utc)
    entries = [
        SettlementEntry("tx-1", datetime(2026, 11, 10, 12, 0, tzinfo=timezone.utc), 34740, "CLEARED"),
        SettlementEntry("tx-2", datetime(2026, 11, 10, 14, 30, tzinfo=timezone.utc), 34740, "CLEARED"),
        SettlementEntry("tx-3", datetime(2026, 11, 10, 18, 15, tzinfo=timezone.utc), 34740, "CLEARED"),
    ]
    summary = reconcile_daily_settlements(entries, cutoff, expected_total=1042.20)
    assert summary.is_balanced is True
    assert summary.discrepancy == 0.0


def test_mixed_naive_and_aware_timestamps():
    cutoff = datetime(2026, 11, 10, 23, 59, tzinfo=timezone.utc)
    entries = [
        SettlementEntry("tx-4", datetime(2026, 11, 10, 21, 0), 15000, "CLEARED"),
        SettlementEntry(
            "tx-5",
            datetime(2026, 11, 10, 22, 0, tzinfo=timezone(timedelta(hours=-2))),
            5000,
            "CLEARED",
        ),
    ]
    summary = reconcile_daily_settlements(entries, cutoff, expected_total=150.00)
    assert summary.matched_count == 1
    assert summary.is_balanced is True`;

const PYPROJECT_CODE = `[project]
name = "ledger-reconciler"
version = "0.4.2"
requires-python = ">=3.12"
dependencies = []

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-v --tb=short"`;

export const DEMO_REPOSITORY: RepositoryInfo = {
  id: 'demo-repo-ledger',
  url: 'https://github.com/acme-fintech/ledger-reconciler',
  owner: 'acme-fintech',
  name: 'ledger-reconciler',
  fullName: 'acme-fintech/ledger-reconciler',
  defaultBranch: 'main',
  commitSha: '8f3a91c',
  language: 'Python',
  framework: 'Python 3.12 · Pure Stdlib',
  testRunner: 'pytest 8.3.3',
  fileCount: 14,
  importedAt: '2026-11-13T18:10:00Z',
  confirmedByBackend: true,
  isDemoData: true,
  structure: [
    {
      path: 'src',
      name: 'src',
      type: 'dir',
      children: [
        {
          path: 'src/reconciler',
          name: 'reconciler',
          type: 'dir',
          children: [
            {
              path: 'src/reconciler/__init__.py',
              name: '__init__.py',
              type: 'file',
              language: 'Python',
              sizeBytes: 120,
            },
            {
              path: 'src/reconciler/models.py',
              name: 'models.py',
              type: 'file',
              language: 'Python',
              sizeBytes: 418,
              isRelevant: true,
              content: MODELS_CODE,
            },
            {
              path: 'src/reconciler/settlement.py',
              name: 'settlement.py',
              type: 'file',
              language: 'Python',
              sizeBytes: 1142,
              isRelevant: true,
              content: SETTLEMENT_ORIGINAL,
            },
          ],
        },
      ],
    },
    {
      path: 'tests',
      name: 'tests',
      type: 'dir',
      children: [
        {
          path: 'tests/test_settlement.py',
          name: 'test_settlement.py',
          type: 'file',
          language: 'Python',
          sizeBytes: 1084,
          isRelevant: true,
          content: TEST_SETTLEMENT_CODE,
        },
      ],
    },
    {
      path: 'pyproject.toml',
      name: 'pyproject.toml',
      type: 'file',
      language: 'TOML',
      sizeBytes: 164,
      isRelevant: true,
      content: PYPROJECT_CODE,
    },
  ],
  relevantFiles: [
    {
      path: 'src/reconciler/settlement.py',
      name: 'settlement.py',
      type: 'file',
      language: 'Python',
      sizeBytes: 1142,
      isRelevant: true,
      content: SETTLEMENT_ORIGINAL,
    },
    {
      path: 'src/reconciler/models.py',
      name: 'models.py',
      type: 'file',
      language: 'Python',
      sizeBytes: 418,
      isRelevant: true,
      content: MODELS_CODE,
    },
    {
      path: 'tests/test_settlement.py',
      name: 'test_settlement.py',
      type: 'file',
      language: 'Python',
      sizeBytes: 1084,
      isRelevant: true,
      content: TEST_SETTLEMENT_CODE,
    },
    {
      path: 'pyproject.toml',
      name: 'pyproject.toml',
      type: 'file',
      language: 'TOML',
      sizeBytes: 164,
      isRelevant: true,
      content: PYPROJECT_CODE,
    },
  ],
};

export const DEMO_SECONDARY_REPO: RepositoryInfo = {
  id: 'demo-repo-queue',
  url: 'https://github.com/acme-fintech/worker-backoff',
  owner: 'acme-fintech',
  name: 'worker-backoff',
  fullName: 'acme-fintech/worker-backoff',
  defaultBranch: 'main',
  commitSha: '2c41e09',
  language: 'Python',
  framework: 'FastAPI · asyncio',
  testRunner: 'pytest-asyncio',
  fileCount: 22,
  importedAt: '2026-11-12T14:25:00Z',
  confirmedByBackend: true,
  isDemoData: true,
  structure: [],
  relevantFiles: [],
};

export const DEMO_BUG_PRESET = {
  bugTitle: 'Daily settlement reconciliation fails with IEEE-754 drift and naive datetime TypeError',
  bugDescription:
    'During end-of-day batch settlement, reconcile_daily_settlements reports a discrepancy on exact cent totals (e.g. 347.40 * 3 evaluates to 1042.1999999999998) and raises TypeError when comparing timezone-naive entry timestamps against timezone-aware UTC cutoffs.',
  errorLog: `FAILED tests/test_settlement.py::test_exact_decimal_accumulation - AssertionError: assert False is True
  > assert summary.is_balanced is True
  E AssertionError: summary.total_amount=1042.1999999999998, discrepancy=2.2737367544323206e-13
FAILED tests/test_settlement.py::test_mixed_naive_and_aware_timestamps - TypeError: can't compare offset-naive and offset-aware datetimes
  File "src/reconciler/settlement.py", line 23, in reconcile_daily_settlements
    if entry_ts <= normalized_cutoff and entry.status == "CLEARED":
TypeError: can't compare offset-naive and offset-aware datetimes`,
  language: 'Python',
};

export const DEMO_PATCH: CodePatch = {
  patchId: 'demo-patch-842',
  analysisId: 'demo-session-842',
  explanation:
    'Replace binary float accumulation with fixed-point Decimal arithmetic quantized to 0.01 (ROUND_HALF_UP), and attach timezone.utc to naive datetimes inside normalize_cutoff() so all comparisons are timezone-aware UTC.',
  generatedAt: '2026-11-13T18:14:22Z',
  decision: PatchDecision.PROPOSED,
  files: [
    {
      filePath: 'src/reconciler/settlement.py',
      language: 'Python',
      addedCount: 9,
      removedCount: 7,
      originalCode: SETTLEMENT_ORIGINAL,
      modifiedCode: SETTLEMENT_MODIFIED,
      diffLines: [
        { type: 'context', oldLineNumber: 1, newLineNumber: 1, content: 'from datetime import datetime, timezone' },
        { type: 'added', oldLineNumber: null, newLineNumber: 2, content: 'from decimal import Decimal, ROUND_HALF_UP' },
        { type: 'context', oldLineNumber: 2, newLineNumber: 3, content: 'from typing import Iterable' },
        { type: 'context', oldLineNumber: 3, newLineNumber: 4, content: 'from .models import SettlementEntry, ReconciliationSummary' },
        { type: 'context', oldLineNumber: 4, newLineNumber: 5, content: '' },
        { type: 'added', oldLineNumber: null, newLineNumber: 6, content: 'CENTS_QUANT = Decimal("0.01")' },
        { type: 'context', oldLineNumber: 5, newLineNumber: 7, content: '' },
        { type: 'context', oldLineNumber: 6, newLineNumber: 8, content: '' },
        { type: 'context', oldLineNumber: 7, newLineNumber: 9, content: 'def normalize_cutoff(ts: datetime) -> datetime:' },
        { type: 'context', oldLineNumber: 8, newLineNumber: 10, content: '    if ts.tzinfo is None:' },
        { type: 'removed', oldLineNumber: 9, newLineNumber: null, content: '        return ts' },
        { type: 'added', oldLineNumber: null, newLineNumber: 11, content: '        return ts.replace(tzinfo=timezone.utc)' },
        { type: 'context', oldLineNumber: 10, newLineNumber: 12, content: '    return ts.astimezone(timezone.utc)' },
        { type: 'context', oldLineNumber: 11, newLineNumber: 13, content: '' },
        { type: 'context', oldLineNumber: 12, newLineNumber: 14, content: '' },
        { type: 'context', oldLineNumber: 13, newLineNumber: 15, content: 'def reconcile_daily_settlements(' },
        { type: 'context', oldLineNumber: 14, newLineNumber: 16, content: '    entries: Iterable[SettlementEntry],' },
        { type: 'context', oldLineNumber: 15, newLineNumber: 17, content: '    cutoff_utc: datetime,' },
        { type: 'removed', oldLineNumber: 16, newLineNumber: null, content: '    expected_total: float,' },
        { type: 'added', oldLineNumber: null, newLineNumber: 18, content: '    expected_total: float | Decimal,' },
        { type: 'context', oldLineNumber: 17, newLineNumber: 19, content: ') -> ReconciliationSummary:' },
        { type: 'removed', oldLineNumber: 18, newLineNumber: null, content: '    """Aggregate cleared entries up to cutoff_utc and verify batch balance."""' },
        { type: 'added', oldLineNumber: null, newLineNumber: 20, content: '    """Aggregate cleared entries up to cutoff_utc and verify exact decimal batch balance."""' },
        { type: 'context', oldLineNumber: 19, newLineNumber: 21, content: '    normalized_cutoff = normalize_cutoff(cutoff_utc)' },
        { type: 'added', oldLineNumber: null, newLineNumber: 22, content: '    expected_dec = Decimal(str(expected_total)).quantize(CENTS_QUANT, rounding=ROUND_HALF_UP)' },
        { type: 'removed', oldLineNumber: 20, newLineNumber: null, content: '    running_total = 0.0' },
        { type: 'added', oldLineNumber: null, newLineNumber: 23, content: '    running_total = Decimal("0.00")' },
        { type: 'context', oldLineNumber: 21, newLineNumber: 24, content: '    matched_ids: list[str] = []' },
        { type: 'context', oldLineNumber: 22, newLineNumber: 25, content: '' },
        { type: 'context', oldLineNumber: 23, newLineNumber: 26, content: '    for entry in entries:' },
        { type: 'context', oldLineNumber: 24, newLineNumber: 27, content: '        entry_ts = normalize_cutoff(entry.settled_at)' },
        { type: 'context', oldLineNumber: 25, newLineNumber: 28, content: '        if entry_ts <= normalized_cutoff and entry.status == "CLEARED":' },
        { type: 'removed', oldLineNumber: 26, newLineNumber: null, content: '            running_total += float(entry.amount_cents) / 100.0' },
        { type: 'added', oldLineNumber: null, newLineNumber: 29, content: '            running_total += (Decimal(entry.amount_cents) / Decimal(100)).quantize(' },
        { type: 'added', oldLineNumber: null, newLineNumber: 30, content: '                CENTS_QUANT, rounding=ROUND_HALF_UP' },
        { type: 'added', oldLineNumber: null, newLineNumber: 31, content: '            )' },
        { type: 'context', oldLineNumber: 27, newLineNumber: 32, content: '            matched_ids.append(entry.id)' },
        { type: 'context', oldLineNumber: 28, newLineNumber: 33, content: '' },
        { type: 'removed', oldLineNumber: 29, newLineNumber: null, content: '    discrepancy = abs(running_total - expected_total)' },
        { type: 'removed', oldLineNumber: 30, newLineNumber: null, content: '    is_balanced = discrepancy == 0.0' },
        { type: 'added', oldLineNumber: null, newLineNumber: 34, content: '    discrepancy = abs(running_total - expected_dec)' },
        { type: 'added', oldLineNumber: null, newLineNumber: 35, content: '    is_balanced = discrepancy == Decimal("0.00")' },
      ],
    },
  ],
};

export const DEMO_PRE_PATCH_VERIFICATION: VerificationResult = {
  verificationId: 'demo-ver-842-pre',
  analysisId: 'demo-session-842',
  status: VerificationStatus.NOT_VERIFIED,
  statusReason:
    'Proposed patch has not been executed against the test suite yet. Baseline reproduction confirmed 2 failing tests.',
  isSimulated: true,
  sandboxEnvironment: 'DEMO SIMULATION · Python 3.12 / pytest 8.3.3',
  originalTests: {
    total: 10,
    passed: 8,
    failed: 2,
    skipped: 0,
    durationMs: 412,
    command: 'pytest tests/ -v --tb=short',
    executedAt: '2026-11-13T18:13:55Z',
    logs: [
      '$ pytest tests/ -v --tb=short',
      '============================= test session starts ==============================',
      'platform linux -- Python 3.12.7, pytest-8.3.3, pluggy-1.5.0',
      'collected 10 items',
      'tests/test_settlement.py::test_exact_decimal_accumulation FAILED         [ 10%]',
      'tests/test_settlement.py::test_mixed_naive_and_aware_timestamps FAILED  [ 20%]',
      'tests/test_settlement.py::test_ignores_pending_entries PASSED            [ 30%]',
      'tests/test_settlement.py::test_empty_batch_returns_zero PASSED           [ 40%]',
      'tests/test_settlement.py::test_cutoff_inclusive_boundary PASSED          [ 50%]',
      'tests/test_models.py::test_entry_immutability PASSED                     [ 60%]',
      'tests/test_models.py::test_summary_fields PASSED                         [ 70%]',
      'tests/test_fees.py::test_flat_fee_deduction PASSED                       [ 80%]',
      'tests/test_fees.py::test_refund_reversal PASSED                          [ 90%]',
      'tests/test_fees.py::test_batch_checksum PASSED                           [100%]',
      '=========================== short test summary info ============================',
      'FAILED tests/test_settlement.py::test_exact_decimal_accumulation - AssertionError: assert False is True',
      'FAILED tests/test_settlement.py::test_mixed_naive_and_aware_timestamps - TypeError: can\'t compare offset-naive and offset-aware datetimes',
      '========================= 2 failed, 8 passed in 0.41s ==========================',
    ],
  },
  patchedTests: null,
  regressionFailures: 0,
  testCases: [
    {
      id: 'tc-1',
      name: 'test_exact_decimal_accumulation',
      file: 'tests/test_settlement.py',
      prePatchStatus: 'failed',
      postPatchStatus: 'not_run',
      durationMs: 38,
      isRegression: false,
      failureMessage: 'AssertionError: summary.total_amount=1042.1999999999998 != 1042.20',
    },
    {
      id: 'tc-2',
      name: 'test_mixed_naive_and_aware_timestamps',
      file: 'tests/test_settlement.py',
      prePatchStatus: 'failed',
      postPatchStatus: 'not_run',
      durationMs: 22,
      isRegression: false,
      failureMessage: "TypeError: can't compare offset-naive and offset-aware datetimes",
    },
    {
      id: 'tc-3',
      name: 'test_ignores_pending_entries',
      file: 'tests/test_settlement.py',
      prePatchStatus: 'passed',
      postPatchStatus: 'not_run',
      durationMs: 14,
      isRegression: false,
    },
    {
      id: 'tc-4',
      name: 'test_empty_batch_returns_zero',
      file: 'tests/test_settlement.py',
      prePatchStatus: 'passed',
      postPatchStatus: 'not_run',
      durationMs: 11,
      isRegression: false,
    },
    {
      id: 'tc-5',
      name: 'test_cutoff_inclusive_boundary',
      file: 'tests/test_settlement.py',
      prePatchStatus: 'passed',
      postPatchStatus: 'not_run',
      durationMs: 16,
      isRegression: false,
    },
  ],
};

export const DEMO_POST_PATCH_VERIFICATION: VerificationResult = {
  verificationId: 'demo-ver-842-post',
  analysisId: 'demo-session-842',
  status: VerificationStatus.VERIFIED,
  statusReason:
    'Simulated test execution confirms both failing reproduction tests now pass and all 8 existing regression tests remain green (10/10 passed).',
  isSimulated: true,
  sandboxEnvironment: 'DEMO SIMULATION · Python 3.12 / pytest 8.3.3',
  originalTests: DEMO_PRE_PATCH_VERIFICATION.originalTests,
  patchedTests: {
    total: 10,
    passed: 10,
    failed: 0,
    skipped: 0,
    durationMs: 389,
    command: 'pytest tests/ -v --tb=short',
    executedAt: '2026-11-13T18:15:08Z',
    logs: [
      '$ pytest tests/ -v --tb=short',
      '============================= test session starts ==============================',
      'platform linux -- Python 3.12.7, pytest-8.3.3, pluggy-1.5.0',
      'collected 10 items',
      'tests/test_settlement.py::test_exact_decimal_accumulation PASSED         [ 10%]',
      'tests/test_settlement.py::test_mixed_naive_and_aware_timestamps PASSED  [ 20%]',
      'tests/test_settlement.py::test_ignores_pending_entries PASSED            [ 30%]',
      'tests/test_settlement.py::test_empty_batch_returns_zero PASSED           [ 40%]',
      'tests/test_settlement.py::test_cutoff_inclusive_boundary PASSED          [ 50%]',
      'tests/test_models.py::test_entry_immutability PASSED                     [ 60%]',
      'tests/test_models.py::test_summary_fields PASSED                         [ 70%]',
      'tests/test_fees.py::test_flat_fee_deduction PASSED                       [ 80%]',
      'tests/test_fees.py::test_refund_reversal PASSED                          [ 90%]',
      'tests/test_fees.py::test_batch_checksum PASSED                           [100%]',
      '============================== 10 passed in 0.39s ==============================',
    ],
  },
  regressionFailures: 0,
  verifiedAt: '2026-11-13T18:15:08Z',
  testCases: [
    {
      id: 'tc-1',
      name: 'test_exact_decimal_accumulation',
      file: 'tests/test_settlement.py',
      prePatchStatus: 'failed',
      postPatchStatus: 'passed',
      durationMs: 34,
      isRegression: false,
    },
    {
      id: 'tc-2',
      name: 'test_mixed_naive_and_aware_timestamps',
      file: 'tests/test_settlement.py',
      prePatchStatus: 'failed',
      postPatchStatus: 'passed',
      durationMs: 19,
      isRegression: false,
    },
    {
      id: 'tc-3',
      name: 'test_ignores_pending_entries',
      file: 'tests/test_settlement.py',
      prePatchStatus: 'passed',
      postPatchStatus: 'passed',
      durationMs: 13,
      isRegression: false,
    },
    {
      id: 'tc-4',
      name: 'test_empty_batch_returns_zero',
      file: 'tests/test_settlement.py',
      prePatchStatus: 'passed',
      postPatchStatus: 'passed',
      durationMs: 10,
      isRegression: false,
    },
    {
      id: 'tc-5',
      name: 'test_cutoff_inclusive_boundary',
      file: 'tests/test_settlement.py',
      prePatchStatus: 'passed',
      postPatchStatus: 'passed',
      durationMs: 15,
      isRegression: false,
    },
    {
      id: 'tc-6',
      name: 'test_entry_immutability',
      file: 'tests/test_models.py',
      prePatchStatus: 'passed',
      postPatchStatus: 'passed',
      durationMs: 8,
      isRegression: false,
    },
    {
      id: 'tc-7',
      name: 'test_summary_fields',
      file: 'tests/test_models.py',
      prePatchStatus: 'passed',
      postPatchStatus: 'passed',
      durationMs: 9,
      isRegression: false,
    },
    {
      id: 'tc-8',
      name: 'test_flat_fee_deduction',
      file: 'tests/test_fees.py',
      prePatchStatus: 'passed',
      postPatchStatus: 'passed',
      durationMs: 12,
      isRegression: false,
    },
    {
      id: 'tc-9',
      name: 'test_refund_reversal',
      file: 'tests/test_fees.py',
      prePatchStatus: 'passed',
      postPatchStatus: 'passed',
      durationMs: 11,
      isRegression: false,
    },
    {
      id: 'tc-10',
      name: 'test_batch_checksum',
      file: 'tests/test_fees.py',
      prePatchStatus: 'passed',
      postPatchStatus: 'passed',
      durationMs: 14,
      isRegression: false,
    },
  ],
};

export function createInitialDemoSessions(): DebuggingSession[] {
  return [
    {
      id: 'demo-session-842',
      reportId: 'rep-demo-842',
      repositoryId: DEMO_REPOSITORY.id,
      repositoryFullName: DEMO_REPOSITORY.fullName,
      language: 'Python',
      bugTitle: DEMO_BUG_PRESET.bugTitle,
      bugDescription: DEMO_BUG_PRESET.bugDescription,
      errorLog: DEMO_BUG_PRESET.errorLog,
      createdAt: '2026-11-13T18:12:00Z',
      updatedAt: '2026-11-13T18:15:08Z',
      isDemoData: true,
      relevantFilePaths: ['src/reconciler/settlement.py', 'src/reconciler/models.py', 'tests/test_settlement.py'],
      stages: [
        {
          key: AnalysisStageKey.REPOSITORY_ANALYSIS,
          order: 1,
          title: 'Repository analysis',
          description: 'Parsed pyproject.toml, mapped 14 files, detected pytest 8.3.3 runner.',
          status: StageStatus.COMPLETED,
          durationMs: 620,
          completedAt: '2026-11-13T18:12:12Z',
        },
        {
          key: AnalysisStageKey.SOURCE_INSPECTION,
          order: 2,
          title: 'Source-code inspection',
          description: 'Traced stack frames to src/reconciler/settlement.py and SettlementEntry model.',
          status: StageStatus.COMPLETED,
          durationMs: 840,
          completedAt: '2026-11-13T18:12:34Z',
        },
        {
          key: AnalysisStageKey.ROOT_CAUSE,
          order: 3,
          title: 'Root-cause investigation',
          description: 'Identified binary float accumulation drift and unattached tzinfo on naive datetimes.',
          status: StageStatus.COMPLETED,
          durationMs: 1120,
          completedAt: '2026-11-13T18:13:10Z',
        },
        {
          key: AnalysisStageKey.BUG_REPRODUCTION,
          order: 4,
          title: 'Bug reproduction',
          description: 'Reproduced 2 failures out of 10 tests in baseline suite.',
          status: StageStatus.COMPLETED,
          durationMs: 412,
          completedAt: '2026-11-13T18:13:55Z',
        },
        {
          key: AnalysisStageKey.PATCH_GENERATION,
          order: 5,
          title: 'Patch generation',
          description: 'Generated quantized Decimal fix and UTC tzinfo normalization patch.',
          status: StageStatus.COMPLETED,
          durationMs: 950,
          completedAt: '2026-11-13T18:14:22Z',
        },
        {
          key: AnalysisStageKey.VERIFICATION,
          order: 6,
          title: 'Verification',
          description: 'Executed post-patch suite: 10/10 tests passed, 0 regressions.',
          status: StageStatus.COMPLETED,
          durationMs: 389,
          completedAt: '2026-11-13T18:15:08Z',
        },
      ],
      rootCause: {
        summary:
          'Binary IEEE-754 floating-point summation in reconcile_daily_settlements introduces sub-cent representation error, while normalize_cutoff leaves naive timestamps without tzinfo.',
        suspectedIssue:
          'Float accumulation (float(amount_cents) / 100.0) followed by exact equality comparison (discrepancy == 0.0) combined with offset-naive vs offset-aware datetime comparison.',
        affectedFile: 'src/reconciler/settlement.py',
        affectedFunction: 'reconcile_daily_settlements / normalize_cutoff',
        affectedLines: 'Lines 7–31',
        reasoningSummary:
          '1) Dividing integer cents by 100.0 produces binary floats that cannot represent 0.10 or 347.40 exactly. 2) Strict equality discrepancy == 0.0 fails on 2.27e-13 drift. 3) normalize_cutoff returned naive datetime objects unchanged, causing Python to raise TypeError when comparing <= normalized_cutoff.',
        riskAssessment: {
          level: RiskLevel.LOW,
          summary: 'Isolated to two functions within settlement.py; external dataclass types remain unchanged.',
          blastRadius: 'Daily reconciliation batch summary calculation and cutoff timestamp filter.',
          sideEffects: [
            'Naive timestamps are now interpreted as UTC rather than raising TypeError.',
            'Public return fields on ReconciliationSummary preserve float types for backward compatibility.',
          ],
        },
      },
      patch: {
        ...DEMO_PATCH,
        decision: PatchDecision.APPROVED,
        decisionUpdatedAt: '2026-11-13T18:14:50Z',
      },
      verification: DEMO_POST_PATCH_VERIFICATION,
      finalStatus: VerificationStatus.VERIFIED,
    },
    {
      id: 'demo-session-839',
      reportId: 'rep-demo-839',
      repositoryId: DEMO_SECONDARY_REPO.id,
      repositoryFullName: DEMO_SECONDARY_REPO.fullName,
      language: 'Python',
      bugTitle: 'Exponential retry jitter overflows asyncio.sleep timeout ceiling',
      bugDescription:
        'When consecutive downstream 503 responses exceed 9 retries, compute_backoff_seconds returns an unbounded float that exceeds worker task lease.',
      errorLog: `FAILED tests/test_backoff.py::test_backoff_respects_max_cap - AssertionError: assert 1024.41 <= 300.0`,
      createdAt: '2026-11-12T15:04:00Z',
      updatedAt: '2026-11-12T15:09:14Z',
      isDemoData: true,
      relevantFilePaths: ['src/worker/backoff.py', 'tests/test_backoff.py'],
      stages: [
        {
          key: AnalysisStageKey.REPOSITORY_ANALYSIS,
          order: 1,
          title: 'Repository analysis',
          description: 'Indexed 22 Python files and pytest-asyncio configuration.',
          status: StageStatus.COMPLETED,
          durationMs: 540,
        },
        {
          key: AnalysisStageKey.SOURCE_INSPECTION,
          order: 2,
          title: 'Source-code inspection',
          description: 'Inspected compute_backoff_seconds in src/worker/backoff.py.',
          status: StageStatus.COMPLETED,
          durationMs: 710,
        },
        {
          key: AnalysisStageKey.ROOT_CAUSE,
          order: 3,
          title: 'Root-cause investigation',
          description: 'Jitter offset was added after min(delay, max_seconds) clamp.',
          status: StageStatus.COMPLETED,
          durationMs: 890,
        },
        {
          key: AnalysisStageKey.BUG_REPRODUCTION,
          order: 4,
          title: 'Bug reproduction',
          description: 'Confirmed failure in test_backoff_respects_max_cap.',
          status: StageStatus.COMPLETED,
          durationMs: 360,
        },
        {
          key: AnalysisStageKey.PATCH_GENERATION,
          order: 5,
          title: 'Patch generation',
          description: 'Generated clamp-after-jitter patch.',
          status: StageStatus.COMPLETED,
          durationMs: 780,
        },
        {
          key: AnalysisStageKey.VERIFICATION,
          order: 6,
          title: 'Verification',
          description: '1 regression failure detected in test_zero_jitter_contract.',
          status: StageStatus.FAILED,
          durationMs: 410,
        },
      ],
      rootCause: {
        summary: 'Additive jitter applied after the upper bound cap pushed total sleep duration above max_seconds.',
        suspectedIssue: 'return min(base * (2 ** attempt), max_seconds) + jitter allows overshoot up to +jitter.',
        affectedFile: 'src/worker/backoff.py',
        affectedFunction: 'compute_backoff_seconds',
        affectedLines: 'Lines 18–26',
        reasoningSummary: 'Clamping must wrap the sum of exponential delay and random jitter.',
        riskAssessment: {
          level: RiskLevel.MEDIUM,
          summary: 'Alters retry pacing under high contention; must preserve deterministic zero-jitter mode.',
          blastRadius: 'All async HTTP retry loops in worker pool.',
          sideEffects: ['May reduce maximum retry spread if jitter range is clamped asymmetrically.'],
        },
      },
      patch: {
        patchId: 'demo-patch-839',
        analysisId: 'demo-session-839',
        explanation: 'Wrap delay + jitter inside min(..., max_seconds) and enforce non-negative floor.',
        generatedAt: '2026-11-12T15:07:30Z',
        decision: PatchDecision.ROLLED_BACK,
        decisionUpdatedAt: '2026-11-12T15:09:14Z',
        files: [
          {
            filePath: 'src/worker/backoff.py',
            language: 'Python',
            addedCount: 2,
            removedCount: 1,
            originalCode: 'return min(base * (2 ** attempt), max_seconds) + jitter',
            modifiedCode: 'raw_delay = (base * (2 ** attempt)) + jitter\nreturn max(0.0, min(raw_delay, max_seconds))',
            diffLines: [
              { type: 'context', oldLineNumber: 21, newLineNumber: 21, content: 'def compute_backoff_seconds(attempt: int, base: float, max_seconds: float, jitter: float) -> float:' },
              { type: 'removed', oldLineNumber: 22, newLineNumber: null, content: '    return min(base * (2 ** attempt), max_seconds) + jitter' },
              { type: 'added', oldLineNumber: null, newLineNumber: 22, content: '    raw_delay = (base * (2 ** attempt)) + jitter' },
              { type: 'added', oldLineNumber: null, newLineNumber: 23, content: '    return max(0.0, min(raw_delay, max_seconds))' },
            ],
          },
        ],
      },
      verification: {
        verificationId: 'demo-ver-839',
        analysisId: 'demo-session-839',
        status: VerificationStatus.VERIFICATION_FAILED,
        statusReason:
          'Target bug test passed, but 1 regression failure was introduced in test_zero_jitter_contract when base=0.0. Patch rolled back.',
        isSimulated: true,
        sandboxEnvironment: 'DEMO SIMULATION · Python 3.12 / pytest-asyncio',
        originalTests: {
          total: 14,
          passed: 13,
          failed: 1,
          skipped: 0,
          durationMs: 520,
          command: 'pytest tests/ -v',
          executedAt: '2026-11-12T15:06:10Z',
          logs: [
            '$ pytest tests/ -v',
            'FAILED tests/test_backoff.py::test_backoff_respects_max_cap',
            '========================= 1 failed, 13 passed in 0.52s =========================',
          ],
        },
        patchedTests: {
          total: 14,
          passed: 13,
          failed: 1,
          skipped: 0,
          durationMs: 495,
          command: 'pytest tests/ -v',
          executedAt: '2026-11-12T15:08:40Z',
          logs: [
            '$ pytest tests/ -v',
            'tests/test_backoff.py::test_backoff_respects_max_cap PASSED',
            'tests/test_backoff.py::test_zero_jitter_contract FAILED',
            'E AssertionError: Expected 0.0 when base=0.0, received 0.412',
            '========================= 1 failed, 13 passed in 0.50s =========================',
          ],
        },
        regressionFailures: 1,
        testCases: [
          {
            id: 'b-1',
            name: 'test_backoff_respects_max_cap',
            file: 'tests/test_backoff.py',
            prePatchStatus: 'failed',
            postPatchStatus: 'passed',
            durationMs: 28,
            isRegression: false,
          },
          {
            id: 'b-2',
            name: 'test_zero_jitter_contract',
            file: 'tests/test_backoff.py',
            prePatchStatus: 'passed',
            postPatchStatus: 'failed',
            durationMs: 19,
            isRegression: true,
            failureMessage: 'AssertionError: Expected 0.0 when base=0.0, received 0.412',
          },
        ],
      },
      finalStatus: VerificationStatus.VERIFICATION_FAILED,
    },
    {
      id: 'demo-session-835',
      reportId: 'rep-demo-835',
      repositoryId: DEMO_REPOSITORY.id,
      repositoryFullName: DEMO_REPOSITORY.fullName,
      language: 'Python',
      bugTitle: 'Duplicate idempotency key accepted when batch spans midnight boundary',
      bugDescription:
        'Concurrent settlement jobs crossing 00:00 UTC bypass partition-scoped deduplication check.',
      errorLog: `AssertionError: Expected IntegrityError for duplicate idempotency_key="idem-991a"`,
      createdAt: '2026-11-11T10:18:00Z',
      updatedAt: '2026-11-11T10:21:40Z',
      isDemoData: true,
      relevantFilePaths: ['src/reconciler/settlement.py'],
      stages: [
        {
          key: AnalysisStageKey.REPOSITORY_ANALYSIS,
          order: 1,
          title: 'Repository analysis',
          description: 'Analyzed repository structure.',
          status: StageStatus.COMPLETED,
          durationMs: 490,
        },
        {
          key: AnalysisStageKey.SOURCE_INSPECTION,
          order: 2,
          title: 'Source-code inspection',
          description: 'Located deduplication lookup.',
          status: StageStatus.COMPLETED,
          durationMs: 650,
        },
        {
          key: AnalysisStageKey.ROOT_CAUSE,
          order: 3,
          title: 'Root-cause investigation',
          description: 'Lookup key scoped by UTC date string instead of global key.',
          status: StageStatus.COMPLETED,
          durationMs: 820,
        },
        {
          key: AnalysisStageKey.BUG_REPRODUCTION,
          order: 4,
          title: 'Bug reproduction',
          description: 'Reproduced duplicate acceptance.',
          status: StageStatus.COMPLETED,
          durationMs: 330,
        },
        {
          key: AnalysisStageKey.PATCH_GENERATION,
          order: 5,
          title: 'Patch generation',
          description: 'Patch generated and awaiting developer approval.',
          status: StageStatus.COMPLETED,
          durationMs: 610,
        },
        {
          key: AnalysisStageKey.VERIFICATION,
          order: 6,
          title: 'Verification',
          description: 'Awaiting explicit approval before running post-patch verification.',
          status: StageStatus.PENDING,
        },
      ],
      rootCause: {
        summary: 'Deduplication set keyed by (date_str, idempotency_key) allowed duplicates across midnight UTC.',
        suspectedIssue: 'Key tuple includes entry.settled_at.date(), breaking cross-day uniqueness.',
        affectedFile: 'src/reconciler/settlement.py',
        affectedFunction: 'deduplicate_entries',
        affectedLines: 'Lines 42–49',
        reasoningSummary: 'Idempotency keys are globally unique identifiers and must not be partitioned by settlement date.',
        riskAssessment: {
          level: RiskLevel.LOW,
          summary: 'Minimal memory footprint change for in-batch set.',
          blastRadius: 'In-memory deduplication helper.',
          sideEffects: ['None expected.'],
        },
      },
      patch: {
        patchId: 'demo-patch-835',
        analysisId: 'demo-session-835',
        explanation: 'Index seen idempotency keys globally rather than per-UTC date.',
        generatedAt: '2026-11-11T10:21:40Z',
        decision: PatchDecision.PROPOSED,
        files: [
          {
            filePath: 'src/reconciler/settlement.py',
            language: 'Python',
            addedCount: 1,
            removedCount: 1,
            originalCode: 'key = (entry.settled_at.date(), entry.id)',
            modifiedCode: 'key = entry.id',
            diffLines: [
              { type: 'removed', oldLineNumber: 45, newLineNumber: null, content: '    key = (entry.settled_at.date(), entry.id)' },
              { type: 'added', oldLineNumber: null, newLineNumber: 45, content: '    key = entry.id' },
            ],
          },
        ],
      },
      verification: {
        verificationId: 'demo-ver-835',
        analysisId: 'demo-session-835',
        status: VerificationStatus.NOT_VERIFIED,
        statusReason: 'Patch proposed by AI, not yet approved or tested against verification suite.',
        isSimulated: true,
        sandboxEnvironment: 'DEMO SIMULATION · Python 3.12 / pytest 8.3.3',
        originalTests: {
          total: 10,
          passed: 9,
          failed: 1,
          skipped: 0,
          durationMs: 390,
          command: 'pytest tests/ -v',
          executedAt: '2026-11-11T10:20:55Z',
          logs: ['$ pytest tests/ -v', 'FAILED tests/test_dedup.py::test_cross_midnight_idempotency'],
        },
        patchedTests: null,
        regressionFailures: 0,
        testCases: [
          {
            id: 'd-1',
            name: 'test_cross_midnight_idempotency',
            file: 'tests/test_dedup.py',
            prePatchStatus: 'failed',
            postPatchStatus: 'not_run',
            durationMs: 24,
            isRegression: false,
            failureMessage: 'AssertionError: Duplicate idempotency key accepted',
          },
        ],
      },
      finalStatus: VerificationStatus.NOT_VERIFIED,
    },
  ];
}

export const INITIAL_DEMO_ACTIVITIES: ActivityFeedItem[] = [
  {
    id: 'act-1',
    timestamp: '2026-11-13T18:15:08Z',
    repositoryFullName: 'acme-fintech/ledger-reconciler',
    title: 'Verification passed (10/10 tests)',
    detail: 'Decimal quantization and UTC normalization patch verified with 0 regressions.',
    status: VerificationStatus.VERIFIED,
    sessionId: 'demo-session-842',
    isDemoData: true,
  },
  {
    id: 'act-2',
    timestamp: '2026-11-12T15:09:14Z',
    repositoryFullName: 'acme-fintech/worker-backoff',
    title: 'Verification failed & patch rolled back',
    detail: 'Regression detected in test_zero_jitter_contract; original code preserved.',
    status: VerificationStatus.VERIFICATION_FAILED,
    sessionId: 'demo-session-839',
    isDemoData: true,
  },
  {
    id: 'act-3',
    timestamp: '2026-11-11T10:21:40Z',
    repositoryFullName: 'acme-fintech/ledger-reconciler',
    title: 'Patch awaiting developer approval',
    detail: 'Proposed fix generated for cross-midnight idempotency; verification not yet run.',
    status: VerificationStatus.NOT_VERIFIED,
    sessionId: 'demo-session-835',
    isDemoData: true,
  },
];
