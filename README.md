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
- Sheets outbox queue for document handover records (counselor tab, receiver tab, master tab)

### 🔔 Real-Time Notifications
- Server-Sent Events (SSE) push notifications to recipients
- Notification drawer with read/unread state

### 🌗 Light / Dark / System Theme
- Full dark mode across every page, table, modal, calendar, and sidebar
- Light / Dark / System selector in Settings — preference persisted across sessions
- Flash-of-wrong-theme prevention (synchronous script before first paint)

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS v4 (CSS variables / design tokens) |
| Charts | Recharts |
| Icons | Lucide React |
| Animation | Motion (Framer Motion) |
| Backend | Express.js (Node / TSX) |
| Database | SQLite via `better-sqlite3` (WAL mode, FK constraints) |
| AI | Google Gemini API (`@google/genai`) |
| Sheets | Google Sheets API v4 + Google OAuth 2.0 |
| Build | Vite 8 |
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
GEMINI_API_KEY="your-gemini-api-key"
APP_URL="http://localhost:3000"
```

> `GEMINI_API_KEY` is required for AI-assisted features. Get one at [aistudio.google.com](https://aistudio.google.com/).

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
│   ├── App.tsx                  # Root component, routing, state, theme logic
│   ├── index.css                # Tailwind v4 + CSS design tokens (light & dark)
│   ├── components/
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
│       └── dateUtils.ts
├── data/                        # SQLite database & auto-backups (git-ignored runtime files)
├── electron/
│   └── main.cjs                 # Electron main process
├── tests/
│   └── handoverBackend.test.ts
├── server.ts                    # Express + Vite dev server entry point
├── index.html
├── vite.config.ts
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

## 🧪 Running Tests

```bash
npx tsx tests/handoverBackend.test.ts
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
