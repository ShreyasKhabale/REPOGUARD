import { DebuggingReport, DebuggingSession } from '../types/repoguard';

export function buildReportFromSession(session: DebuggingSession, commitSha = 'HEAD'): DebuggingReport {
  return {
    reportId: session.reportId,
    analysisId: session.id,
    generatedAt: session.updatedAt,
    repository: {
      fullName: session.repositoryFullName,
      branch: 'main',
      commitSha,
      language: session.language,
    },
    bugTitle: session.bugTitle,
    bugDescription: session.bugDescription,
    errorLog: session.errorLog,
    rootCause: session.rootCause,
    patch: session.patch,
    verification: session.verification ?? {
      verificationId: `unverified-${session.id}`,
      analysisId: session.id,
      status: session.finalStatus,
      statusReason: 'No verification execution has been completed for this session.',
      isSimulated: session.isDemoData,
      sandboxEnvironment: session.isDemoData ? 'DEMO SIMULATION' : 'FastAPI Runner',
      originalTests: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        durationMs: 0,
        command: 'N/A',
        executedAt: session.createdAt,
        logs: [],
      },
      patchedTests: null,
      regressionFailures: 0,
      testCases: [],
    },
    finalStatus: session.finalStatus,
    isSimulated: session.isDemoData,
  };
}

export function formatReportAsMarkdown(report: DebuggingReport): string {
  const lines: string[] = [
    `# REPOGUARD Verification Report — ${report.reportId}`,
    '',
    `- **Status**: ${report.finalStatus}`,
    `- **Execution Mode**: ${report.isSimulated ? 'DEMO SIMULATION (Simulated Demonstration Data)' : 'LIVE FASTAPI BACKEND'}`,
    `- **Repository**: ${report.repository.fullName} (${report.repository.branch} @ ${report.repository.commitSha})`,
    `- **Language**: ${report.repository.language}`,
    `- **Generated At**: ${report.generatedAt}`,
    '',
    `## Bug Summary`,
    `**${report.bugTitle}**`,
    '',
    report.bugDescription,
    '',
    '### Error Log',
    '```',
    report.errorLog || 'No error log provided.',
    '```',
    '',
  ];

  if (report.rootCause) {
    lines.push(
      '## Root-Cause Analysis',
      `- **Affected File**: \`${report.rootCause.affectedFile}\` (${report.rootCause.affectedLines})`,
      `- **Affected Function**: \`${report.rootCause.affectedFunction}\``,
      `- **Risk Level**: ${report.rootCause.riskAssessment.level}`,
      '',
      report.rootCause.summary,
      '',
      `**AI Reasoning Summary**: ${report.rootCause.reasoningSummary}`,
      ''
    );
  }

  if (report.patch) {
    lines.push(
      '## Proposed Code Patch',
      `- **Patch ID**: ${report.patch.patchId}`,
      `- **Developer Decision**: ${report.patch.decision.toUpperCase()}`,
      `- **Explanation**: ${report.patch.explanation}`,
      ''
    );
    for (const file of report.patch.files) {
      lines.push(`### \`${file.filePath}\` (+${file.addedCount} / -${file.removedCount})`, '```diff');
      for (const d of file.diffLines) {
        const prefix = d.type === 'added' ? '+' : d.type === 'removed' ? '-' : ' ';
        lines.push(`${prefix} ${d.content}`);
      }
      lines.push('```', '');
    }
  }

  lines.push(
    '## Verification Evidence',
    `- **Final Status**: ${report.verification.status}`,
    `- **Environment**: ${report.verification.sandboxEnvironment}`,
    `- **Assessment**: ${report.verification.statusReason}`,
    `- **Pre-Patch Tests**: ${report.verification.originalTests.passed}/${report.verification.originalTests.total} passed (${report.verification.originalTests.failed} failed, ${report.verification.originalTests.durationMs}ms)`
  );

  if (report.verification.patchedTests) {
    lines.push(
      `- **Post-Patch Tests**: ${report.verification.patchedTests.passed}/${report.verification.patchedTests.total} passed (${report.verification.patchedTests.failed} failed, ${report.verification.patchedTests.durationMs}ms)`,
      `- **Regression Failures**: ${report.verification.regressionFailures}`
    );
  } else {
    lines.push('- **Post-Patch Tests**: Not executed');
  }

  return lines.join('\n');
}

export function triggerFileDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
