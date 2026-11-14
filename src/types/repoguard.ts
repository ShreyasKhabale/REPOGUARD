export enum VerificationStatus {
  VERIFIED = 'VERIFIED',
  NOT_VERIFIED = 'NOT VERIFIED',
  PARTIALLY_VERIFIED = 'PARTIALLY VERIFIED',
  VERIFICATION_FAILED = 'VERIFICATION FAILED',
}

export enum ExecutionMode {
  DEMO = 'DEMO',
  LIVE_BACKEND = 'LIVE_BACKEND',
}

export enum AnalysisStageKey {
  REPOSITORY_ANALYSIS = 'repository_analysis',
  SOURCE_INSPECTION = 'source_inspection',
  ROOT_CAUSE = 'root_cause',
  BUG_REPRODUCTION = 'bug_reproduction',
  PATCH_GENERATION = 'patch_generation',
  VERIFICATION = 'verification',
}

export enum StageStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum PatchDecision {
  PROPOSED = 'proposed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ROLLED_BACK = 'rolled_back',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export type AppView =
  | 'landing'
  | 'dashboard'
  | 'repositories'
  | 'submit-bug'
  | 'workspace'
  | 'patch'
  | 'verification'
  | 'reports';

export interface RepositoryFileNode {
  path: string;
  name: string;
  type: 'file' | 'dir';
  language?: string;
  sizeBytes?: number;
  isRelevant?: boolean;
  content?: string;
  children?: RepositoryFileNode[];
}

export interface RepositoryInfo {
  id: string;
  url: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  commitSha: string;
  language: string;
  framework?: string;
  testRunner?: string;
  fileCount: number;
  importedAt: string;
  confirmedByBackend: boolean;
  isDemoData: boolean;
  structure: RepositoryFileNode[];
  relevantFiles: RepositoryFileNode[];
}

export interface ImportRepositoryRequest {
  repositoryUrl: string;
  branch?: string;
}

export interface ImportRepositoryResponse {
  repository: RepositoryInfo;
  message: string;
}

export interface AnalysisStageItem {
  key: AnalysisStageKey;
  order: number;
  title: string;
  description: string;
  status: StageStatus;
  durationMs?: number;
  completedAt?: string;
}

export interface RiskAssessment {
  level: RiskLevel;
  summary: string;
  blastRadius: string;
  sideEffects: string[];
}

export interface RootCauseAnalysis {
  summary: string;
  suspectedIssue: string;
  affectedFile: string;
  affectedFunction: string;
  affectedLines: string;
  reasoningSummary: string;
  riskAssessment: RiskAssessment;
}

export interface DiffLine {
  type: 'context' | 'removed' | 'added';
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
}

export interface FilePatch {
  filePath: string;
  language: string;
  addedCount: number;
  removedCount: number;
  originalCode: string;
  modifiedCode: string;
  diffLines: DiffLine[];
}

export interface CodePatch {
  patchId: string;
  analysisId: string;
  explanation: string;
  generatedAt: string;
  decision: PatchDecision;
  decisionUpdatedAt?: string;
  rejectionReason?: string;
  files: FilePatch[];
}

export interface TestCaseResult {
  id: string;
  name: string;
  file: string;
  prePatchStatus: 'passed' | 'failed' | 'skipped';
  postPatchStatus: 'passed' | 'failed' | 'skipped' | 'not_run';
  durationMs: number;
  isRegression: boolean;
  failureMessage?: string;
}

export interface TestSuiteSnapshot {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  command: string;
  executedAt: string;
  logs: string[];
}

export interface VerificationResult {
  verificationId: string;
  analysisId: string;
  status: VerificationStatus;
  statusReason: string;
  isSimulated: boolean;
  sandboxEnvironment: string;
  originalTests: TestSuiteSnapshot;
  patchedTests: TestSuiteSnapshot | null;
  regressionFailures: number;
  testCases: TestCaseResult[];
  verifiedAt?: string;
}

export interface DebuggingSession {
  id: string;
  reportId: string;
  repositoryId: string;
  repositoryFullName: string;
  language: string;
  bugTitle: string;
  bugDescription: string;
  errorLog: string;
  createdAt: string;
  updatedAt: string;
  isDemoData: boolean;
  stages: AnalysisStageItem[];
  relevantFilePaths: string[];
  rootCause: RootCauseAnalysis | null;
  patch: CodePatch | null;
  verification: VerificationResult | null;
  finalStatus: VerificationStatus;
}

export interface StartAnalysisRequest {
  repositoryId: string;
  bugTitle: string;
  bugDescription: string;
  errorLog: string;
  language: string;
}

export interface StartAnalysisResponse {
  analysisId: string;
  session: DebuggingSession;
}

export interface GetAnalysisRequest {
  analysisId: string;
}

export interface GetAnalysisResponse {
  session: DebuggingSession;
}

export interface GenerateRepairRequest {
  analysisId: string;
  repositoryId: string;
}

export interface GenerateRepairResponse {
  patch: CodePatch;
}

export interface VerifyRepairRequest {
  analysisId: string;
  patchId: string;
  approvedByUser: boolean;
}

export interface VerifyRepairResponse {
  verification: VerificationResult;
}

export interface GetReportRequest {
  reportId: string;
}

export interface DebuggingReport {
  reportId: string;
  analysisId: string;
  generatedAt: string;
  repository: {
    fullName: string;
    branch: string;
    commitSha: string;
    language: string;
  };
  bugTitle: string;
  bugDescription: string;
  errorLog: string;
  rootCause: RootCauseAnalysis | null;
  patch: CodePatch | null;
  verification: VerificationResult;
  finalStatus: VerificationStatus;
  isSimulated: boolean;
}

export interface GetReportResponse {
  report: DebuggingReport;
}

export interface ActivityFeedItem {
  id: string;
  timestamp: string;
  repositoryFullName: string;
  title: string;
  detail: string;
  status: VerificationStatus | 'IN_PROGRESS';
  sessionId: string;
  isDemoData: boolean;
}
