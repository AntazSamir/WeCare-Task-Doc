# WeCare Korean Student Visa Consultancy — PMS & Task Manager

> **Centralized Project Management System** for South Korean university admissions, D-2/D-4 student visa processing, document verification, apostille coordination, DHL dispatch tracking, and team task orchestration — with two-way Google Sheets synchronization.

---

## ✨ Feature Overview

### 🎓 University & Intake Management
- Directory of Korean universities (SNU, Yonsei, Korea University, KAIST, SKKU, and more)
- Intake season tracking with application deadlines, quotas, and verification status
- University programs, refund policies, and bank account details per institution
- Document library per university (guides, CoA templates, visa forms)

### 👨‍🎓 Student Dossier & Visa Pipeline
- Full student application records: passport, degree level, visa type (D-2 / D-4), and intake term
- Per-student document checklist with verification, apostille, and notarization status
- Visa stage tracker: `Document Gathering → University Submitted → CoA Received → Visa Approved`
- DHL courier dispatch tracking per student

### 📋 Task Management
- Create, assign, reschedule, and complete tasks with priorities (`Urgent / High / Medium / Low`)
- My Day, Upcoming, Calendar, and All Tasks views
- Subtask support within individual tasks
- Overdue detection with dashboard widgets
- Optimistic task execution with automatic rollback on network failure

### 📂 Document Handover & Acknowledgement
- Formal counselor → admission document handover records with package seal numbers
- Acknowledgement workflow: `Pending Receipt → Accepted / Partially Received / Disputed`
- Follow-up deliveries for missing or disputed items
- Immutable event log (append-only audit trail — records cannot be modified or deleted)
- Handover request system: Admission team requests specific documents from counselors

### 📊 Executive Dashboard
- Weekly completion trend chart (Recharts)
- Upcoming deadlines widget
- Overdue task widget
- Project-level progress tracking

### 🔄 Google Sheets Two-Way Sync
- Bi-directional sync of tasks to any Google Spreadsheet via Google Sheets API v4 / OAuth 2.0
- Zero-duplicate guarantee — rows reconciled by unique `Task ID` + `Last Updated`
- Offline queue: mutations written locally when disconnected and flushed on reconnect
- Non-blocking background sync with live status badges (`Synced`, `Syncing`, `Failed`)
- Sheets outbox queue for document handover records (counselor tab, receiver tab, master tab)

### 🔔 Real-Time Notifications
- Server-Sent Events (SSE) push notifications to recipients
- Notification drawer with read/unread state

### 🌗 Light / Dark / System Theme
- Full dark mode across every page, table, modal, calendar, and sidebar
- Light / Dark / System selector in Settings — preference persisted across sessions
- Flash-of-wrong-theme prevention (synchronous script before first paint)

### ⚡ Smooth Transitions & Ergonomic UI Architecture
- **Motion System**: Subtle, fluid CSS animations (`animate-page-enter`, `animate-modal-backdrop`, `animate-modal-card`, `animate-drawer-enter`, `animate-tab-enter`, `animate-dropdown-enter`) with 150ms–240ms duration and `cubic-bezier(0.16, 1, 0.3, 1)` easing.
- **Accessibility & Motion Safety**: Native `@media (prefers-reduced-motion: reduce)` support that disables animations for users requiring reduced motion.
- **Consistent Compact Controls**: Standardized 28px control height (`h-[28px] box-border`) across all toolbars, search bars, segmented pills, and dropdown triggers (`MorphSelect`) for high-density professional productivity.
- **Flicker-Free Layouts**: Optimized keying and state persistence to prevent unwanted card re-renders and layout shifts.

---

## ⚡ Performance Architecture & UX Optimization

SheetSync PMS is engineered for instant interactions, lightweight asset payloads, and high fault tolerance:

### 1. Code-Splitting & Bundle Reduction (81% Smaller Initial Load)
- **Monolithic vs Chunked**: Initial JavaScript bundle reduced from **1,356.8 kB** to **258.8 kB** (**81% reduction**).
- **Vendor Splitting**: Isolated heavy libraries into dedicated browser-cacheable chunks via Vite/Rollup `manualChunks`:
  - `react-vendor` (React 19, React DOM, scheduler)
  - `recharts-vendor` (Recharts & D3 graphics engine, loaded strictly on demand)
  - `icons-vendor` (Lucide React tree-shaken icons)
- **Dynamic View & Modal Code-Splitting**: All major views (`ExecutiveDashboard`, `CalendarView`, `GoogleSheetsPanel`, `StudentDossierList`, `IntakeProjectsView`, `UniversityDirectoryView`, `TeamTaskManagementView`, `DocumentHandoverView`) and modal dialogs (`EnhancedTaskModal`, `StudentDossierModal`, `NewStudentModal`, `TaskFormModal`, `CompletionConfirmModal`, `NotificationDrawer`) are imported dynamically via `React.lazy()` with skeleton fallbacks.

| Metric | Monolithic (Before) | Optimized (After) | Improvement |
|---|---|---|---|
| **Initial JS Entry** | 1,356.8 kB | 258.8 kB | **-81%** |
| **Gzip Compressed Entry** | ~340 kB | 70.2 kB | **-79%** |
| **Build Execution Time** | ~1.4s | 863ms | **38% faster** |
| **Rollup Chunk Warnings** | 1 Warning (>500 kB) | 0 Warnings (Clean) | **100% resolved** |

### 2. Zero-Latency Stale-While-Revalidate (SWR)
- **Instant Paint**: The UI synchronously hydrates state from `localStorage` cache in **0ms**, eliminating initial loading spinners or layout shifts.
- **Background Revalidation**: Asynchronously fetches fresh data from `/api/state` and `/api/pms/state` without locking user controls or causing visual flicker.
- **Background Google Sheets Sync**: Two-way sync operates silently in the background with clear status badges (`Synced` / `Syncing` / `Failed`).

### 3. Optimistic UI with Automatic State Rollback
- **0ms Mutation Response**: Task creation, completion toggles, subtask changes, and archive deletions update React state immediately.
- **Fault-Tolerant Rollback**: If a server or network operation fails, the application automatically reverts state to its prior snapshot and triggers an alert toast with diagnostic context.
- **Action Guarding**: Submission buttons (`TaskFormModal`, `CompletionConfirmModal`) disable instantly upon click with an active saving indicator, preventing double-submissions.

### 4. Input Ergonomics & List Pagination
- **250ms Debounced Search**: A zero-dependency `useDebounce` hook buffers typing across the global task search, team task filters, student dossier query, and university directory, keeping frame rates at a steady 60 FPS.
- **Archive & Task Pagination**: Team Task Management and Completed Archives paginate at 25 items/page with quick navigation pills, preventing DOM bloat during large intake seasons.

### 5. Fault Tolerance & Error Boundaries
- **Component Error Boundary**: `ErrorBoundary.tsx` traps runtime exceptions, displays contextual fallback diagnostics, and provides a 1-click state reset button to ensure the application never renders a blank white screen.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Architecture | Code-split routes, Stale-While-Revalidate caching, Optimistic UI with rollback, ErrorBoundary |
| Styling | Tailwind CSS v4 (CSS variables / design tokens, zero-runtime CSS animations) |
| Charts | Recharts (dynamic vendor chunk) |
| Icons | Lucide React (tree-shaken vendor chunk) |
| Backend | Express.js (Node / TSX) |
| Database | SQLite via `better-sqlite3` (WAL mode, FK constraints) |
| Sheets | Google Sheets API v4 + Google OAuth 2.0 |
| Build | Vite 8 (Rollup `manualChunks` partitioning) |
| Desktop | Electron (optional Windows `.exe` packaging) |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18 or later
- **npm** 10 or later (or `bun`)
- A Google Cloud project with **Google Sheets API** and **Google Drive API** enabled (for Sheets sync)

### 1. Clone the Repository

```bash
git clone https://github.com/AntazSamir/WeCare-Task-Doc.git
cd WeCare-Task-Doc
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
APP_URL="http://localhost:3000"
```

### 4. Run the Development Server

```bash
npm run dev
```

The app starts at **http://localhost:3000**

The SQLite database (`data/consultancy_pms.sqlite`) is created and seeded automatically on first run with sample universities, intake seasons, team members, and student applications.

### 5. Build for Production

```bash
npm run build
```

### 6. Package as Windows Desktop App (Electron)

```bash
npx electron-builder --win --x64
```

---

## 📁 Project Structure

```
WeCare-Task-Doc/
├── server/
│   ├── db.ts                    # SQLite schema, migrations, seed data
│   ├── handoverService.ts       # Document handover & request business logic
│   └── sheetsQueue.ts           # Google Sheets outbox queue processor
├── src/
│   ├── App.tsx                  # Root component, routing, SWR state, theme logic
│   ├── index.css                # Tailwind v4 + CSS design tokens (light & dark)
│   ├── components/
│   │   ├── ErrorBoundary.tsx    # Catch-all runtime error boundary
│   │   ├── ExecutiveDashboard.tsx
│   │   ├── StudentDossierList.tsx
│   │   ├── StudentDossierModal.tsx
│   │   ├── IntakeProjectsView.tsx
│   │   ├── UniversityDirectoryView.tsx
│   │   ├── TeamTaskManagementView.tsx
│   │   ├── DocumentHandoverView.tsx
│   │   ├── AdmissionHandoverDashboard.tsx
│   │   ├── CounselorHandoverDashboard.tsx
│   │   ├── CreateHandoverModal.tsx
│   │   ├── HandoverDetailModal.tsx
│   │   ├── CreateDocumentRequestModal.tsx
│   │   ├── RequestDetailModal.tsx
│   │   ├── CalendarView.tsx
│   │   ├── GoogleSheetsPanel.tsx
│   │   ├── NotificationDrawer.tsx
│   │   └── ...
│   ├── services/
│   │   ├── googleSheetsService.ts
│   │   └── pmsService.ts
│   ├── types/
│   │   ├── task.ts
│   │   └── pms.ts
│   └── utils/
│       ├── dateUtils.ts
│       └── useDebounce.ts       # Zero-dependency 250ms debouncing hook
├── data/                        # SQLite database & auto-backups (git-ignored runtime files)
├── electron/
│   └── main.cjs                 # Electron main process
├── tests/
│   └── handoverBackend.test.ts
├── server.ts                    # Express + Vite dev server entry point
├── index.html
├── vite.config.ts               # Rollup manualChunks configuration
└── .env.example
```

---

## 🔄 Google Sheets Integration Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Enable **Google Sheets API** and **Google Drive API**.
3. Create an **OAuth 2.0 Client ID** (Web application type).
   - Add `http://localhost:3000` to Authorized JavaScript Origins.
4. In the app, navigate to **Google Sheets Connection** → **Google OAuth 2.0 & API Settings**.
5. Paste your Client ID and click **Sign in with Google OAuth 2.0**.
6. Select a spreadsheet and worksheet — the app initializes headers automatically.

The sync engine uses these 12 columns:

| Task ID | Task Title | Description | Category | Priority | Task Date | Deadline | Status | Created At | Completed At | Notes | Last Updated |

---

## 🗄️ Database Schema (Key Tables)

| Table | Purpose |
|---|---|
| `users` | Team members (Admission Managers & Consultants) |
| `universities` | Korean university directory |
| `admission_intakes` | Intake seasons per university |
| `university_programs` | Degree programs, fees, and requirements |
| `intake_projects` | Admission intake projects assigned to managers |
| `student_applications` | Student dossiers with visa pipeline stage |
| `tasks` | Team tasks with priority, deadline, and subtasks |
| `document_handovers` | Counselor → Admission document handover records |
| `document_requests` | Admission → Counselor document requests |
| `handover_events` | Immutable audit event log |
| `sheets_sync_queue` | Google Sheets outbox queue |
| `notifications` | In-app real-time notifications |
| `audit_logs` | General system audit trail |

> ⚠️ Handover records and their event logs are **immutable by database trigger** — they cannot be modified or deleted once created.

---

## 🎨 Theme & Design Tokens

The UI uses centralized CSS variables defined in `src/index.css` for both light and dark modes. No inline color literals in components.

**Dark Mode Palette**

| Token | Value |
|---|---|
| Main Background | `#0B1220` |
| Sidebar | `#0F1B2D` |
| Card Background | `#172438` |
| Border | `#2A3B52` |
| Primary Text | `#F1F5FB` |
| Primary Blue | `#3B82F6` |
| Success | `#22C55E` |
| Warning | `#F5B942` |
| Danger | `#F05252` |

**Light Mode Palette**

| Token | Value |
|---|---|
| Main Background | `#F4F2EE` |
| Card Background | `#FFFFFF` |
| Border | `#E3EAF3` |
| Primary Text | `#172B4D` |

---

## 🧪 Running Tests & Quality Checks

```bash
# Run backend test suite
npx tsx tests/handoverBackend.test.ts

# Strict TypeScript type check
npx tsc --noEmit

# Production bundle build
npm run build
```

---

## 👥 Roles

| Role | Description |
|---|---|
| **Admission Manager** | Oversees intake projects, reviews handovers, creates document requests, manages all tasks |
| **Consultant** | Manages assigned students, submits document handovers, receives requests from Admission |

---

## 📄 License

Private — WeCare Consultancy internal tooling. All rights reserved.
