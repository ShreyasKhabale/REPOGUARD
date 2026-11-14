import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  FileCode2,
  Folder,
  FolderGit2,
  GitBranch,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { DEMO_REPOSITORY } from '../data/demoData';
import { demoSimulator } from '../services/demoSimulator';
import { ApiError, repoguardApi } from '../services/repoguardApi';
import {
  ExecutionMode,
  RepositoryFileNode,
  RepositoryInfo,
} from '../types/repoguard';

interface RepositoryConnectionPageProps {
  mode: ExecutionMode;
  repositories: RepositoryInfo[];
  selectedRepoId: string | null;
  onSelectRepo: (repoId: string) => void;
  onRepositoryImported: (repo: RepositoryInfo) => void;
  onStartDebuggingWithRepo: (repoId: string) => void;
  onSwitchToDemo: () => void;
}

function validateGithubRepoInput(raw: string): { valid: boolean; normalizedUrl?: string; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, error: 'Enter a GitHub repository URL such as https://github.com/owner/repo.' };
  }

  const shorthandMatch = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/.exec(trimmed);
  if (shorthandMatch) {
    return {
      valid: true,
      normalizedUrl: `https://github.com/${shorthandMatch[1]}/${shorthandMatch[2].replace(/\.git$/, '')}`,
    };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { valid: false, error: 'Repository URL must use https://.' };
    }
    if (parsed.hostname.toLowerCase() !== 'github.com' && parsed.hostname.toLowerCase() !== 'www.github.com') {
      return { valid: false, error: 'Only public github.com repository URLs are supported.' };
    }
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length < 2) {
      return { valid: false, error: 'URL must include both owner and repository name (github.com/owner/repo).' };
    }
    const owner = segments[0];
    const repoName = segments[1].replace(/\.git$/, '');
    return {
      valid: true,
      normalizedUrl: `https://github.com/${owner}/${repoName}`,
    };
  } catch {
    return { valid: false, error: 'Invalid URL format. Example: https://github.com/psf/requests' };
  }
}

const FileTreeView: React.FC<{
  nodes: RepositoryFileNode[];
  selectedFilePath: string | null;
  onSelectFile: (node: RepositoryFileNode) => void;
  depth?: number;
}> = ({ nodes, selectedFilePath, onSelectFile, depth = 0 }) => {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => {
        if (node.type === 'dir') {
          return (
            <li key={node.path}>
              <div
                className="flex items-center gap-2 py-1.5 px-2 text-xs text-slate-300 font-mono"
                style={{ paddingLeft: `${depth * 14 + 8}px` }}
              >
                <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{node.name}/</span>
              </div>
              {node.children && node.children.length > 0 && (
                <FileTreeView
                  nodes={node.children}
                  selectedFilePath={selectedFilePath}
                  onSelectFile={onSelectFile}
                  depth={depth + 1}
                />
              )}
            </li>
          );
        }

        const isSelected = selectedFilePath === node.path;
        return (
          <li key={node.path}>
            <button
              type="button"
              onClick={() => onSelectFile(node)}
              style={{ paddingLeft: `${depth * 14 + 8}px` }}
              className={`w-full flex items-center justify-between gap-2 py-1.5 pr-2.5 rounded text-xs font-mono text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#132038] text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#111B2E]'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <FileCode2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{node.name}</span>
              </span>
              {node.isRelevant && (
                <span className="text-[10px] font-sans font-semibold text-cyan-400 shrink-0">
                  Relevant
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export const RepositoryConnectionPage: React.FC<RepositoryConnectionPageProps> = ({
  mode,
  repositories,
  selectedRepoId,
  onSelectRepo,
  onRepositoryImported,
  onStartDebuggingWithRepo,
  onSwitchToDemo,
}) => {
  const [repoUrl, setRepoUrl] = useState(
    mode === ExecutionMode.DEMO ? DEMO_REPOSITORY.url : ''
  );
  const [branch, setBranch] = useState('main');
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<RepositoryFileNode | null>(null);
  const [copiedFile, setCopiedFile] = useState(false);

  const selectedRepo = repositories.find((r) => r.id === selectedRepoId) ?? repositories[0] ?? null;

  useEffect(() => {
    setErrorMessage(null);
    setStatusMessage(null);
    setActiveFile(null);
    setCopiedFile(false);
    setRepoUrl(mode === ExecutionMode.DEMO ? DEMO_REPOSITORY.url : '');
  }, [mode]);

  useEffect(() => {
    setActiveFile(null);
    setCopiedFile(false);
  }, [selectedRepo?.id]);

  const displayedFile =
    activeFile ??
    selectedRepo?.relevantFiles[0] ??
    null;

  const handleCopySource = async () => {
    if (!displayedFile?.content) return;
    try {
      await navigator.clipboard.writeText(displayedFile.content);
      setCopiedFile(true);
      window.setTimeout(() => setCopiedFile(false), 1800);
    } catch {
      setErrorMessage('Clipboard access was denied by the browser.');
    }
  };

  const handleImport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const validation = validateGithubRepoInput(repoUrl);
    if (!validation.valid || !validation.normalizedUrl) {
      setErrorMessage(validation.error ?? 'Invalid GitHub repository URL.');
      return;
    }

    if (mode === ExecutionMode.DEMO) {
      setIsImporting(true);
      const outcome = await demoSimulator.simulateRepositoryImport(validation.normalizedUrl);
      setIsImporting(false);
      if (outcome.ok && outcome.repository) {
        onRepositoryImported(outcome.repository);
        onSelectRepo(outcome.repository.id);
        setActiveFile(outcome.repository.relevantFiles[0] ?? null);
        setStatusMessage(outcome.message);
      } else {
        setErrorMessage(outcome.message);
      }
      return;
    }

    setIsImporting(true);
    try {
      const response = await repoguardApi.importRepository({
        repositoryUrl: validation.normalizedUrl,
        branch: branch.trim() || 'main',
      });
      onRepositoryImported(response.repository);
      onSelectRepo(response.repository.id);
      setActiveFile(response.repository.relevantFiles[0] ?? null);
      setStatusMessage(response.message);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setErrorMessage(
        apiErr
          ? apiErr.message
          : 'Failed to import repository from FastAPI backend. Repository was not marked as imported.'
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-100 tracking-tight">
          Connect Public GitHub Repository
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Validate and index a repository through the Python FastAPI backend before starting a
          debugging session.
        </p>
      </div>

      {/* Import Form */}
      <form
        onSubmit={handleImport}
        className="p-6 rounded-lg border border-slate-800/90 bg-[#0B1220] space-y-4"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 space-y-1.5">
            <label htmlFor="github-repo-url" className="block text-xs font-semibold text-slate-300">
              Public GitHub Repository URL
            </label>
            <input
              id="github-repo-url"
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
              className="w-full px-3.5 py-2.5 text-sm font-mono rounded-md border border-slate-700/80 bg-[#070B14] text-slate-100 placeholder:text-slate-500 focus:border-cyan-400"
            />
          </div>

          <div className="lg:col-span-3 space-y-1.5">
            <label htmlFor="github-branch" className="block text-xs font-semibold text-slate-300">
              Target Branch
            </label>
            <input
              id="github-branch"
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full px-3.5 py-2.5 text-sm font-mono rounded-md border border-slate-700/80 bg-[#070B14] text-slate-100 placeholder:text-slate-500 focus:border-cyan-400"
            />
          </div>

          <div className="lg:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={isImporting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <span>Import Repo</span>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            Endpoint: <code className="font-mono text-slate-300">POST /api/repository/import</code> ·
            No GitHub credentials stored in browser code.
          </span>
          {mode === ExecutionMode.DEMO && (
            <button
              type="button"
              onClick={() => setRepoUrl(DEMO_REPOSITORY.url)}
              className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
            >
              Fill Demo Python Repo URL
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="p-4 rounded-md border border-rose-500/40 bg-rose-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handleImport()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-rose-500/40 hover:bg-rose-900/40 font-semibold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
              {mode === ExecutionMode.LIVE_BACKEND && (
                <button
                  type="button"
                  onClick={onSwitchToDemo}
                  className="text-cyan-300 hover:text-cyan-200 font-semibold underline cursor-pointer"
                >
                  Use Demo Mode
                </button>
              )}
            </div>
          </div>
        )}

        {statusMessage && (
          <div className="p-3.5 rounded-md border border-emerald-500/35 bg-emerald-950/25 flex items-center gap-2.5 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </form>

      {/* Repository Inspector */}
      {selectedRepo ? (
        <div className="space-y-6">
          {repositories.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              {repositories.map((repo) => (
                <button
                  key={repo.id}
                  type="button"
                  onClick={() => {
                    onSelectRepo(repo.id);
                    setActiveFile(repo.relevantFiles[0] ?? null);
                  }}
                  className={`px-3.5 py-2 rounded-md border text-xs font-mono transition-colors cursor-pointer ${
                    selectedRepo.id === repo.id
                      ? 'bg-[#121E33] border-cyan-500/50 text-cyan-300'
                      : 'bg-[#0B1220] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {repo.fullName}
                </button>
              ))}
            </div>
          )}

          {/* Metadata Header */}
          <div className="p-6 rounded-lg border border-slate-800/90 bg-[#0B1220] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>Owner: {selectedRepo.owner}</span>
                <span aria-hidden="true">·</span>
                <span>Language: {selectedRepo.language}</span>
                {selectedRepo.testRunner && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Runner: {selectedRepo.testRunner}</span>
                  </>
                )}
                {selectedRepo.isDemoData && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-300 font-semibold">Demo Repository</span>
                  </>
                )}
              </div>
              <h2 className="font-display text-xl font-bold text-slate-100 flex items-center gap-2.5">
                <FolderGit2 className="w-5 h-5 text-cyan-400 shrink-0" />
                <span className="font-mono break-all">{selectedRepo.fullName}</span>
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
                <span className="inline-flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                  <span>{selectedRepo.defaultBranch}</span>
                </span>
                <span>Commit: {selectedRepo.commitSha}</span>
                <span className="tabular-nums">{selectedRepo.fileCount} indexed files</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onStartDebuggingWithRepo(selectedRepo.id)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Start New Debugging Session</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Equal-Height Structure & Source File Viewer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-4 rounded-lg border border-slate-800/90 bg-[#0B1220] overflow-hidden flex flex-col lg:h-[460px]">
              <div className="px-4 py-3 border-b border-slate-800/80 bg-[#090F1D] flex items-center justify-between text-xs font-semibold text-slate-200 shrink-0">
                <span>Detected Project Structure</span>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                  {selectedRepo.fileCount} files
                </span>
              </div>
              <div className="p-3 overflow-y-auto flex-1">
                {selectedRepo.structure.length > 0 ? (
                  <FileTreeView
                    nodes={selectedRepo.structure}
                    selectedFilePath={displayedFile?.path ?? null}
                    onSelectFile={(node) => setActiveFile(node)}
                  />
                ) : selectedRepo.relevantFiles.length > 0 ? (
                  <FileTreeView
                    nodes={selectedRepo.relevantFiles}
                    selectedFilePath={displayedFile?.path ?? null}
                    onSelectFile={(node) => setActiveFile(node)}
                  />
                ) : (
                  <p className="text-xs text-slate-400 p-3 leading-relaxed">
                    Directory tree summary loaded. Submit a bug description to index candidate
                    source files.
                  </p>
                )}
              </div>
            </div>

            <div className="lg:col-span-8 rounded-lg border border-slate-800/90 bg-[#0B1220] overflow-hidden flex flex-col lg:h-[460px]">
              <div className="px-4 py-3 border-b border-slate-800/80 bg-[#090F1D] flex items-center justify-between gap-3 shrink-0">
                <span className="font-mono text-xs font-medium text-slate-200 truncate">
                  {displayedFile ? displayedFile.path : 'Source File Preview'}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  {displayedFile?.language && (
                    <span className="text-xs text-slate-400">{displayedFile.language}</span>
                  )}
                  {displayedFile?.content && (
                    <button
                      type="button"
                      onClick={handleCopySource}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-700 text-[11px] font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {copiedFile ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 bg-[#070B14] overflow-auto">
                {displayedFile?.content ? (
                  <pre className="p-4 font-mono text-xs leading-6 text-slate-200">
                    <code>
                      {displayedFile.content.split('\n').map((line, idx) => (
                        <div key={idx} className="flex">
                          <span className="w-10 pr-4 text-right text-slate-600 select-none tabular-nums shrink-0">
                            {idx + 1}
                          </span>
                          <span className="whitespace-pre">{line}</span>
                        </div>
                      ))}
                    </code>
                  </pre>
                ) : (
                  <div className="p-10 text-center text-xs text-slate-400">
                    Select a relevant source file from the project tree to inspect its source code.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-10 rounded-lg border border-slate-800/90 bg-[#0B1220] text-center space-y-2">
          <FolderGit2 className="w-7 h-7 text-slate-500 mx-auto" />
          <div className="text-sm font-medium text-slate-200">No confirmed repositories yet</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Enter a public GitHub repository URL above to import it through your FastAPI backend, or
            switch to Demo Mode to explore the prepared Python repository.
          </p>
        </div>
      )}
    </div>
  );
};
