import {
  AnalysisStageItem,
  AnalysisStageKey,
  CodePatch,
  DebuggingReport,
  DebuggingSession,
  GenerateRepairRequest,
  GenerateRepairResponse,
  GetAnalysisRequest,
  GetAnalysisResponse,
  GetReportRequest,
  GetReportResponse,
  ImportRepositoryRequest,
  ImportRepositoryResponse,
  PatchDecision,
  RepositoryInfo,
  StartAnalysisRequest,
  StartAnalysisResponse,
  StageStatus,
  VerificationResult,
  VerificationStatus,
  VerifyRepairRequest,
  VerifyRepairResponse,
} from '../types/repoguard';

const STORAGE_OVERRIDE_KEY = 'repoguard_api_base_url_override';

export const FASTAPI_ENDPOINTS = {
  IMPORT_REPOSITORY: '/api/repository/import',
  START_ANALYSIS: '/api/analysis/start',
  GET_ANALYSIS: (id: string) => `/api/analysis/${encodeURIComponent(id)}`,
  GENERATE_REPAIR: '/api/repair/generate',
  VERIFY_REPAIR: '/api/repair/verify',
  GET_REPORT: (id: string) => `/api/report/${encodeURIComponent(id)}`,
} as const;

export function getDefaultApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_REPOGUARD_API_BASE_URL;
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return 'http://localhost:8000';
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const override = window.sessionStorage.getItem(STORAGE_OVERRIDE_KEY);
    if (override && override.trim().length > 0) {
      return override.trim().replace(/\/+$/, '');
    }
  }
  return getDefaultApiBaseUrl();
}

export function setCustomApiBaseUrl(url: string | null): void {
  if (typeof window === 'undefined') return;
  if (!url || !url.trim()) {
    window.sessionStorage.removeItem(STORAGE_OVERRIDE_KEY);
  } else {
    window.sessionStorage.setItem(STORAGE_OVERRIDE_KEY, url.trim().replace(/\/+$/, ''));
  }
}

export function getApiTimeoutMs(): number {
  const raw = Number(import.meta.env.VITE_REPOGUARD_API_TIMEOUT_MS);
  if (Number.isFinite(raw) && raw >= 2000) {
    return raw;
  }
  return 30000;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly endpoint: string;
  public readonly retryable: boolean;
  public readonly detail?: string;

  constructor(params: {
    message: string;
    status: number;
    endpoint: string;
    retryable?: boolean;
    detail?: string;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.endpoint = params.endpoint;
    this.retryable =
      params.retryable ?? (params.status === 0 || params.status >= 500 || params.status === 429);
    this.detail = params.detail;
  }
}

interface RequestOptions {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  timeoutMs?: number;
  maxRetries?: number;
}

function assertNotDemoIdentifier(id: string, endpoint: string): void {
  if (id.startsWith('demo-') || id.startsWith('rep-demo-')) {
    throw new ApiError({
      message: 'Demo identifiers cannot be dispatched to the live FastAPI backend.',
      status: 400,
      endpoint,
      retryable: false,
    });
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeRequest<T>(options: RequestOptions): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${options.path}`;
  const timeoutMs = options.timeoutMs ?? getApiTimeoutMs();
  const maxRetries = options.maxRetries ?? (options.method === 'GET' ? 2 : 0);

  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);

      if (!response.ok) {
        let detail = '';
        try {
          const errJson = await response.json();
          detail = errJson?.detail || errJson?.message || JSON.stringify(errJson);
        } catch {
          detail = await response.text().catch(() => '');
        }

        const error = new ApiError({
          message: detail || `Backend responded with HTTP ${response.status} on ${options.path}`,
          status: response.status,
          endpoint: options.path,
          detail,
        });

        if (error.retryable && attempt < maxRetries) {
          lastError = error;
          await sleep(400 * Math.pow(2, attempt));
          continue;
        }
        throw error;
      }

      const data = await response.json();
      return data as T;
    } catch (err) {
      window.clearTimeout(timeoutId);

      if (err instanceof ApiError) {
        throw err;
      }

      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      const apiErr = new ApiError({
        message: isAbort
          ? `Request timed out after ${Math.round(timeoutMs / 1000)}s while calling ${options.path}.`
          : `Unable to reach REPOGUARD FastAPI backend at ${baseUrl}. Confirm the backend server is running and CORS allows this origin.`,
        status: isAbort ? 408 : 0,
        endpoint: options.path,
        retryable: true,
        detail: err instanceof Error ? err.message : String(err),
      });

      if (attempt < maxRetries) {
        lastError = apiErr;
        await sleep(400 * Math.pow(2, attempt));
        continue;
      }

      throw lastError ?? apiErr;
    }
  }

  throw lastError ?? new ApiError({ message: 'Unknown API error', status: 0, endpoint: options.path });
}

function defaultStages(): AnalysisStageItem[] {
  return [
    {
      key: AnalysisStageKey.REPOSITORY_ANALYSIS,
      order: 1,
      title: 'Repository analysis',
      description: 'Scanning repository layout, dependencies, and test suite discovery',
      status: StageStatus.PENDING,
    },
    {
      key: AnalysisStageKey.SOURCE_INSPECTION,
      order: 2,
      title: 'Source-code inspection',
      description: 'Indexing call graphs and locating candidate modules from stack trace',
      status: StageStatus.PENDING,
    },
    {
      key: AnalysisStageKey.ROOT_CAUSE,
      order: 3,
      title: 'Root-cause investigation',
      description: 'Isolating fault mechanism and identifying impacted function boundaries',
      status: StageStatus.PENDING,
    },
    {
      key: AnalysisStageKey.BUG_REPRODUCTION,
      order: 4,
      title: 'Bug reproduction',
      description: 'Executing baseline test suite in isolated container to confirm failure',
      status: StageStatus.PENDING,
    },
    {
      key: AnalysisStageKey.PATCH_GENERATION,
      order: 5,
      title: 'Patch generation',
      description: 'Synthesizing minimal targeted diff for explicit developer review',
      status: StageStatus.PENDING,
    },
    {
      key: AnalysisStageKey.VERIFICATION,
      order: 6,
      title: 'Verification',
      description: 'Re-running full test suite after patch to collect pass/regression proof',
      status: StageStatus.PENDING,
    },
  ];
}

function normalizeVerificationStatus(raw: unknown): VerificationStatus {
  const value = typeof raw === 'string' ? raw.toUpperCase().replace(/_/g, ' ').trim() : '';
  if (value === 'VERIFIED') return VerificationStatus.VERIFIED;
  if (value === 'PARTIALLY VERIFIED') return VerificationStatus.PARTIALLY_VERIFIED;
  if (value === 'VERIFICATION FAILED') return VerificationStatus.VERIFICATION_FAILED;
  return VerificationStatus.NOT_VERIFIED;
}

function enforceEvidenceGate(
  status: VerificationStatus,
  patchedTests: VerificationResult['patchedTests'],
  regressionFailures: number
): VerificationStatus {
  if (status !== VerificationStatus.VERIFIED) {
    return status;
  }
  if (!patchedTests || patchedTests.total <= 0) {
    return VerificationStatus.NOT_VERIFIED;
  }
  if (patchedTests.failed > 0 || regressionFailures > 0) {
    return VerificationStatus.VERIFICATION_FAILED;
  }
  return VerificationStatus.VERIFIED;
}

function normalizeRepositoryResponse(raw: Record<string, unknown>, fallbackUrl: string): ImportRepositoryResponse {
  const repoObj = (raw.repository ?? raw) as Record<string, unknown>;
  const fullName = String(repoObj.fullName ?? repoObj.full_name ?? '').trim();
  const confirmedFlag = repoObj.confirmedByBackend ?? repoObj.confirmed_by_backend;

  if (!fullName || confirmedFlag === false) {
    throw new ApiError({
      message: 'Backend response did not confirm repository import metadata.',
      status: 422,
      endpoint: FASTAPI_ENDPOINTS.IMPORT_REPOSITORY,
      retryable: false,
    });
  }

  const [parsedOwner, parsedName] = fullName.includes('/') ? fullName.split('/') : ['unknown', fullName];
  const repository: RepositoryInfo = {
    id: String(repoObj.id ?? `repo-${Date.now()}`),
    url: String(repoObj.url ?? fallbackUrl),
    owner: String(repoObj.owner ?? parsedOwner),
    name: String(repoObj.name ?? parsedName),
    fullName,
    defaultBranch: String(repoObj.defaultBranch ?? repoObj.default_branch ?? 'main'),
    commitSha: String(repoObj.commitSha ?? repoObj.commit_sha ?? 'HEAD'),
    language: String(repoObj.language ?? 'Unknown'),
    framework: repoObj.framework ? String(repoObj.framework) : undefined,
    testRunner:
      repoObj.testRunner || repoObj.test_runner
        ? String(repoObj.testRunner ?? repoObj.test_runner)
        : undefined,
    fileCount: Number(repoObj.fileCount ?? repoObj.file_count ?? 0),
    importedAt: String(repoObj.importedAt ?? repoObj.imported_at ?? new Date().toISOString()),
    confirmedByBackend: true,
    isDemoData: false,
    structure: Array.isArray(repoObj.structure) ? repoObj.structure : [],
    relevantFiles: Array.isArray(repoObj.relevantFiles ?? repoObj.relevant_files)
      ? ((repoObj.relevantFiles ?? repoObj.relevant_files) as RepositoryInfo['relevantFiles'])
      : [],
  };

  return {
    repository,
    message: String(raw.message ?? `Repository ${repository.fullName} imported and verified by backend.`),
  };
}

function normalizeSession(raw: Record<string, unknown>): DebuggingSession {
  const s = (raw.session ?? raw) as Record<string, unknown>;
  const patchRaw = s.patch as Record<string, unknown> | null | undefined;
  const verificationRaw = s.verification as Record<string, unknown> | null | undefined;

  const regressionFailures = Number(
    verificationRaw?.regressionFailures ?? verificationRaw?.regression_failures ?? 0
  );
  const patchedTests = (verificationRaw?.patchedTests ??
    verificationRaw?.patched_tests ??
    null) as VerificationResult['patchedTests'];

  const gatedVerStatus = verificationRaw
    ? enforceEvidenceGate(
        normalizeVerificationStatus(verificationRaw.status),
        patchedTests,
        regressionFailures
      )
    : VerificationStatus.NOT_VERIFIED;

  const normalizedVerification: VerificationResult | null = verificationRaw
    ? {
        verificationId: String(
          verificationRaw.verificationId ?? verificationRaw.verification_id ?? `ver-${Date.now()}`
        ),
        analysisId: String(verificationRaw.analysisId ?? verificationRaw.analysis_id ?? s.id ?? ''),
        status: gatedVerStatus,
        statusReason: String(
          verificationRaw.statusReason ??
            verificationRaw.status_reason ??
            'Status reported by backend test runner.'
        ),
        isSimulated: false,
        sandboxEnvironment: String(
          verificationRaw.sandboxEnvironment ??
            verificationRaw.sandbox_environment ??
            'FastAPI Isolated Runner'
        ),
        originalTests: (verificationRaw.originalTests ??
          verificationRaw.original_tests) as VerificationResult['originalTests'],
        patchedTests,
        regressionFailures,
        testCases: Array.isArray(verificationRaw.testCases ?? verificationRaw.test_cases)
          ? ((verificationRaw.testCases ?? verificationRaw.test_cases) as VerificationResult['testCases'])
          : [],
        verifiedAt: verificationRaw.verifiedAt ? String(verificationRaw.verifiedAt) : undefined,
      }
    : null;

  const finalStatus = enforceEvidenceGate(
    normalizeVerificationStatus(s.finalStatus ?? s.final_status ?? normalizedVerification?.status),
    patchedTests,
    regressionFailures
  );

  return {
    id: String(s.id ?? s.analysisId ?? s.analysis_id ?? `ana-${Date.now()}`),
    reportId: String(s.reportId ?? s.report_id ?? `rep-${s.id ?? Date.now()}`),
    repositoryId: String(s.repositoryId ?? s.repository_id ?? ''),
    repositoryFullName: String(
      s.repositoryFullName ?? s.repository_full_name ?? 'unknown/repository'
    ),
    language: String(s.language ?? 'Python'),
    bugTitle: String(s.bugTitle ?? s.bug_title ?? 'Untitled Bug Report'),
    bugDescription: String(s.bugDescription ?? s.bug_description ?? ''),
    errorLog: String(s.errorLog ?? s.error_log ?? ''),
    createdAt: String(s.createdAt ?? s.created_at ?? new Date().toISOString()),
    updatedAt: String(s.updatedAt ?? s.updated_at ?? new Date().toISOString()),
    isDemoData: false,
    stages:
      Array.isArray(s.stages) && s.stages.length > 0
        ? (s.stages as AnalysisStageItem[])
        : defaultStages(),
    relevantFilePaths: Array.isArray(s.relevantFilePaths ?? s.relevant_file_paths)
      ? ((s.relevantFilePaths ?? s.relevant_file_paths) as string[])
      : [],
    rootCause: (s.rootCause ?? s.root_cause ?? null) as DebuggingSession['rootCause'],
    patch: patchRaw
      ? ({
          ...(patchRaw as unknown as CodePatch),
          decision: (patchRaw.decision as PatchDecision) ?? PatchDecision.PROPOSED,
        })
      : null,
    verification: normalizedVerification,
    finalStatus,
  };
}

export const repoguardApi = {
  async importRepository(payload: ImportRepositoryRequest): Promise<ImportRepositoryResponse> {
    const raw = await executeRequest<Record<string, unknown>>({
      method: 'POST',
      path: FASTAPI_ENDPOINTS.IMPORT_REPOSITORY,
      body: payload,
    });
    return normalizeRepositoryResponse(raw, payload.repositoryUrl);
  },

  async startAnalysis(payload: StartAnalysisRequest): Promise<StartAnalysisResponse> {
    assertNotDemoIdentifier(payload.repositoryId, FASTAPI_ENDPOINTS.START_ANALYSIS);
    const raw = await executeRequest<Record<string, unknown>>({
      method: 'POST',
      path: FASTAPI_ENDPOINTS.START_ANALYSIS,
      body: payload,
    });
    const session = normalizeSession(raw);
    return {
      analysisId: String(raw.analysisId ?? raw.analysis_id ?? session.id),
      session,
    };
  },

  async getAnalysis(payload: GetAnalysisRequest): Promise<GetAnalysisResponse> {
    const path = FASTAPI_ENDPOINTS.GET_ANALYSIS(payload.analysisId);
    assertNotDemoIdentifier(payload.analysisId, path);
    const raw = await executeRequest<Record<string, unknown>>({
      method: 'GET',
      path,
    });
    return {
      session: normalizeSession(raw),
    };
  },

  async generateRepair(payload: GenerateRepairRequest): Promise<GenerateRepairResponse> {
    assertNotDemoIdentifier(payload.analysisId, FASTAPI_ENDPOINTS.GENERATE_REPAIR);
    const raw = await executeRequest<Record<string, unknown>>({
      method: 'POST',
      path: FASTAPI_ENDPOINTS.GENERATE_REPAIR,
      body: payload,
    });
    const patch = (raw.patch ?? raw) as unknown as CodePatch;
    return {
      patch: {
        ...patch,
        decision: patch.decision ?? PatchDecision.PROPOSED,
        files: Array.isArray(patch.files) ? patch.files : [],
      },
    };
  },

  async verifyRepair(payload: VerifyRepairRequest): Promise<VerifyRepairResponse> {
    assertNotDemoIdentifier(payload.analysisId, FASTAPI_ENDPOINTS.VERIFY_REPAIR);
    if (!payload.approvedByUser) {
      throw new ApiError({
        message: 'Explicit user approval is required before verifying or applying a patch.',
        status: 400,
        endpoint: FASTAPI_ENDPOINTS.VERIFY_REPAIR,
        retryable: false,
      });
    }
    const raw = await executeRequest<Record<string, unknown>>({
      method: 'POST',
      path: FASTAPI_ENDPOINTS.VERIFY_REPAIR,
      body: payload,
    });
    const v = (raw.verification ?? raw) as Record<string, unknown>;
    const patchedTests = (v.patchedTests ?? v.patched_tests ?? null) as VerificationResult['patchedTests'];
    const regressionFailures = Number(v.regressionFailures ?? v.regression_failures ?? 0);
    const status = enforceEvidenceGate(
      normalizeVerificationStatus(v.status),
      patchedTests,
      regressionFailures
    );

    return {
      verification: {
        verificationId: String(v.verificationId ?? v.verification_id ?? `ver-${Date.now()}`),
        analysisId: String(v.analysisId ?? v.analysis_id ?? payload.analysisId),
        status,
        statusReason: String(
          v.statusReason ?? v.status_reason ?? 'Verification completed by backend test runner.'
        ),
        isSimulated: false,
        sandboxEnvironment: String(
          v.sandboxEnvironment ?? v.sandbox_environment ?? 'Docker Pytest Sandbox'
        ),
        originalTests: (v.originalTests ?? v.original_tests) as VerificationResult['originalTests'],
        patchedTests,
        regressionFailures,
        testCases: Array.isArray(v.testCases ?? v.test_cases)
          ? ((v.testCases ?? v.test_cases) as VerificationResult['testCases'])
          : [],
        verifiedAt: v.verifiedAt ? String(v.verifiedAt) : new Date().toISOString(),
      },
    };
  },

  async getReport(payload: GetReportRequest): Promise<GetReportResponse> {
    const path = FASTAPI_ENDPOINTS.GET_REPORT(payload.reportId);
    assertNotDemoIdentifier(payload.reportId, path);
    const raw = await executeRequest<Record<string, unknown>>({
      method: 'GET',
      path,
    });
    const reportObj = (raw.report ?? raw) as Record<string, unknown>;
    const verificationRaw = (reportObj.verification ?? {}) as Record<string, unknown>;
    const patchedTests = (verificationRaw.patchedTests ??
      verificationRaw.patched_tests ??
      null) as VerificationResult['patchedTests'];
    const regressionFailures = Number(
      verificationRaw.regressionFailures ?? verificationRaw.regression_failures ?? 0
    );

    const finalStatus = enforceEvidenceGate(
      normalizeVerificationStatus(
        reportObj.finalStatus ?? reportObj.final_status ?? verificationRaw.status
      ),
      patchedTests,
      regressionFailures
    );

    const report: DebuggingReport = {
      reportId: String(reportObj.reportId ?? reportObj.report_id ?? payload.reportId),
      analysisId: String(reportObj.analysisId ?? reportObj.analysis_id ?? ''),
      generatedAt: String(reportObj.generatedAt ?? reportObj.generated_at ?? new Date().toISOString()),
      repository: (reportObj.repository as DebuggingReport['repository']) ?? {
        fullName: 'unknown/repository',
        branch: 'main',
        commitSha: 'HEAD',
        language: 'Python',
      },
      bugTitle: String(reportObj.bugTitle ?? reportObj.bug_title ?? 'Debugging Report'),
      bugDescription: String(reportObj.bugDescription ?? reportObj.bug_description ?? ''),
      errorLog: String(reportObj.errorLog ?? reportObj.error_log ?? ''),
      rootCause: (reportObj.rootCause ?? reportObj.root_cause ?? null) as DebuggingReport['rootCause'],
      patch: (reportObj.patch ?? null) as DebuggingReport['patch'],
      verification: {
        verificationId: String(verificationRaw.verificationId ?? `ver-${payload.reportId}`),
        analysisId: String(reportObj.analysisId ?? ''),
        status: finalStatus,
        statusReason: String(
          verificationRaw.statusReason ?? 'Reported by REPOGUARD backend.'
        ),
        isSimulated: false,
        sandboxEnvironment: String(verificationRaw.sandboxEnvironment ?? 'FastAPI Sandbox'),
        originalTests: verificationRaw.originalTests as VerificationResult['originalTests'],
        patchedTests,
        regressionFailures,
        testCases: Array.isArray(verificationRaw.testCases) ? verificationRaw.testCases : [],
        verifiedAt: verificationRaw.verifiedAt ? String(verificationRaw.verifiedAt) : undefined,
      },
      finalStatus,
      isSimulated: false,
    };

    return { report };
  },
};
