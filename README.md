# REPOGUARD — Autonomous Debugging & Verified Code Repair

> **"Don't just fix the bug. Prove the fix works."**

REPOGUARD is a React + TypeScript developer platform for autonomous bug investigation, targeted code patch review, and test-verified software repair. It is built to integrate with an external Python FastAPI backend that handles repository cloning, static/AI root-cause analysis, and isolated Docker/pytest verification.

---

## Core Product Principle

**AI-generated code is only a proposed repair. A repair becomes `VERIFIED` only after actual test execution provides evidence that it works and introduces zero regressions.**

- Proposed patches default to `NOT VERIFIED`.
- Original GitHub repositories are never modified automatically—developers must explicitly **Apply**, **Reject**, or **Rollback** proposed patches.
- **Demo Mode** (`src/services/demoSimulator.ts` + `src/data/demoData.ts`) is strictly isolated from **Live FastAPI Backend Mode** (`src/services/repoguardApi.ts`) and clearly labelled as simulated demonstration data.

---

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons**: Lucide React
- **Fonts**: Plus Jakarta Sans, Manrope, JetBrains Mono

---

## Project Structure

```text
.
├── .env.example                 # Environment variable template (safe to commit)
├── .gitignore                   # Ignores node_modules, dist, .env*, editor files, keys
├── index.html                   # HTML entry point & font imports
├── metadata.json                # Application metadata
├── package.json                 # Dependencies & npm scripts
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite configuration
└── src/
    ├── components/              # Reusable UI chrome & shared components
    │   ├── BackendConfigModal.tsx
    │   ├── BrandLogo.tsx
    │   ├── DashboardShell.tsx
    │   ├── SessionPipelineNav.tsx
    │   └── StatusIndicator.tsx
    ├── data/
    │   └── demoData.ts          # Prepared Python repo (acme-fintech/ledger-reconciler)
    ├── pages/                   # Application views
    │   ├── LandingPage.tsx
    │   ├── DashboardOverviewPage.tsx
    │   ├── RepositoryConnectionPage.tsx
    │   ├── BugSubmissionPage.tsx
    │   ├── AnalysisWorkspacePage.tsx
    │   ├── CodePatchViewerPage.tsx
    │   ├── VerificationResultsPage.tsx
    │   └── ReportsHistoryPage.tsx
    ├── services/
    │   ├── demoSimulator.ts     # Isolated Demo Mode simulation helpers
    │   └── repoguardApi.ts      # Centralized FastAPI HTTP client & normalizers
    ├── types/
    │   └── repoguard.ts         # Shared domain models & 6-endpoint Request/Response types
    ├── utils/
    │   └── reportExport.ts      # Markdown & JSON report formatting + download helpers
    ├── App.tsx                  # Top-level routing & isolated Demo/Live state stores
    ├── index.css                # Tailwind CSS v4 entry & dark developer theme tokens
    ├── main.tsx                 # React DOM mount
    └── vite-env.d.ts            # Typed import.meta.env definitions
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` (which is git-ignored):

```bash
cp .env.example .env
```

Update `VITE_REPOGUARD_API_BASE_URL` if your FastAPI backend is not running on `http://localhost:8000`:

```env
VITE_REPOGUARD_API_BASE_URL="http://localhost:8000"
VITE_REPOGUARD_API_TIMEOUT_MS="30000"
```

### 3. Start the development server

```bash
npm run dev
```

The app runs on `http://localhost:3000`.

### 4. Typecheck & build

```bash
npm run lint        # Standard TypeScript check
npm run typecheck   # Strict TypeScript check (--strict --noUnusedLocals --noUnusedParameters)
npm run build       # Production Vite bundle into dist/
```

---

## FastAPI Backend Integration Contract

All backend requests are centralized in `src/services/repoguardApi.ts` with `AbortController` timeouts, retry handling on idempotent `GET` calls, and strict verification status gating.

| Endpoint | Method | Request Interface | Response Interface |
| :--- | :--- | :--- | :--- |
| `/api/repository/import` | `POST` | `ImportRepositoryRequest` | `ImportRepositoryResponse` |
| `/api/analysis/start` | `POST` | `StartAnalysisRequest` | `StartAnalysisResponse` |
| `/api/analysis/{id}` | `GET` | `GetAnalysisRequest` | `GetAnalysisResponse` |
| `/api/repair/generate` | `POST` | `GenerateRepairRequest` | `GenerateRepairResponse` |
| `/api/repair/verify` | `POST` | `VerifyRepairRequest` | `VerifyRepairResponse` |
| `/api/report/{id}` | `GET` | `GetReportRequest` | `GetReportResponse` |

### Notes for Backend Integration

- Enable CORS on your FastAPI server for the frontend origin (`http://localhost:3000` in local dev).
- `/api/repository/import` should return `confirmedByBackend: true` (or `confirmed_by_backend: true`) alongside `fullName` (or `full_name`) once cloning/indexing succeeds.
- `/api/repair/verify` requires `approvedByUser: true` and must return `patchedTests` execution counts (`total`, `passed`, `failed`, `durationMs`, `logs`) before the frontend allows a `VERIFIED` status.

---

## Security & Secret Hygiene

- Never commit `.env`, `.env.local`, API keys, or GitHub Personal Access Tokens.
- All GitHub cloning, LLM reasoning, and Docker sandbox test execution must run on the external Python FastAPI backend—never expose provider API keys via `VITE_*` variables.
- Run `git status` before pushing to verify only source files and `.env.example` are staged.
