# SheetSync Tasks — Architecture, Google Sheets Setup & Windows PC Build Guide

## 1. System Architecture & Two-Way Google Sheets Synchronization

- **Frontend Desktop Workspace**: React 19 + TypeScript + Tailwind CSS v4 optimized for 1440px PC viewports with full Light/Dark mode support.
- **Local Offline Persistence**: Express + Local SQLite/JSON Disk Store (`data/sheetsync_sqlite_store.json`) paired with browser `localStorage` caching and an offline `SyncQueue` so you can create, edit, reschedule, and confirm tasks even without an internet connection.
- **Google Sheets API v4 Engine (`src/services/googleSheetsService.ts`)**:
  - Uses the exact 12 required columns in Row 1 (`A1:L1`):
    `Task ID | Task Title | Description | Category | Priority | Task Date | Deadline | Status | Created At | Completed At | Notes | Last Updated`
  - **Zero Duplicates Guarantee**: Every task has a unique `Task ID` (e.g., `TSK-1001`). Synchronization reconciles rows strictly by `Task ID` and `Last Updated` timestamp.
  - **Offline Recovery**: Network interruptions queue mutations locally (`Sync Failed` state) and automatically flush queued operations when internet connectivity is restored.

---

## 2. Step-by-Step Google Cloud Console & API Configuration

1. Visit [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Open **APIs & Services → Library** and enable:
   - **Google Sheets API**
   - **Google Drive API**
3. Open **APIs & Services → OAuth consent screen**:
   - Choose **External** (or Internal for Google Workspace).
   - Add scopes:
     - `https://www.googleapis.com/auth/spreadsheets`
     - `https://www.googleapis.com/auth/drive.readonly`
   - Add your Google account (`samiul.wecare@gmail.com`) as a Test User.
4. Open **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:3000` (and your deployed URL)
5. Copy the **OAuth 2.0 Client ID**, open the **Google Sheets Connection → Google OAuth 2.0 & API Settings** tab inside the app, paste your Client ID, and click **Sign in with Google OAuth 2.0**.

---

## 3. Running Locally & Building the Windows PC Application

```bash
# Install dependencies
npm install

# Run the full-stack PC application on http://localhost:3000
npm run dev

# Build production web assets
npm run build

# Package as a standalone Windows PC executable (.exe) via Electron
npx electron-builder --win --x64
```
