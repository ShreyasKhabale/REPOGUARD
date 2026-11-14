import { DEMO_REPOSITORY } from '../data/demoData';
import { RepositoryInfo } from '../types/repoguard';

export interface DemoImportOutcome {
  ok: boolean;
  repository?: RepositoryInfo;
  message: string;
}

/**
 * Isolated Demo Mode simulator.
 * Never performs network requests or accesses the real FastAPI backend.
 */
export const demoSimulator = {
  async simulateRepositoryImport(normalizedGithubUrl: string): Promise<DemoImportOutcome> {
    await new Promise((resolve) => window.setTimeout(resolve, 400));
    if (normalizedGithubUrl === DEMO_REPOSITORY.url) {
      return {
        ok: true,
        repository: DEMO_REPOSITORY,
        message: `DEMO MODE: Loaded prepared Python repository ${DEMO_REPOSITORY.fullName}. Arbitrary live cloning requires the external FastAPI backend.`,
      };
    }
    return {
      ok: false,
      message: `Demo Mode only simulates the prepared repository (${DEMO_REPOSITORY.url}). Switch to Live FastAPI Backend mode to import ${normalizedGithubUrl}.`,
    };
  },

  async simulateStepDelay(ms = 450): Promise<void> {
    await new Promise((resolve) => window.setTimeout(resolve, ms));
  },
};
