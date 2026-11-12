import {
  GOOGLE_SHEETS_HEADERS,
  GoogleSheetRow,
  GoogleSpreadsheetItem,
  Task,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from '../types/task';

export function taskToSheetRowValues(task: Task): string[] {
  return [
    task.id,
    task.title,
    task.description,
    task.category,
    task.priority,
    task.taskDate,
    task.scheduledTime ? `${task.deadline} ${task.scheduledTime}` : task.deadline,
    task.status,
    task.createdAt,
    task.completedAt || '',
    task.notes,
    task.lastUpdated,
  ];
}

export function sheetRowValuesToTask(values: string[], rowIndex: number): Task | null {
  const id = (values[0] || '').trim();
  const title = (values[1] || '').trim();
  if (!id || !title || id === 'Task ID') {
    return null;
  }

  const rawCategory = (values[3] || 'Work').trim();
  const validCategories: TaskCategory[] = ['Personal', 'Work', 'Study', 'Business', 'Other'];
  const category: TaskCategory = validCategories.includes(rawCategory as TaskCategory)
    ? (rawCategory as TaskCategory)
    : 'Other';

  const rawPriority = (values[4] || 'Medium').trim();
  const validPriorities: TaskPriority[] = ['High', 'Medium', 'Low'];
  const priority: TaskPriority = validPriorities.includes(rawPriority as TaskPriority)
    ? (rawPriority as TaskPriority)
    : 'Medium';

  const today = new Date().toISOString().slice(0, 10);
  const taskDate = (values[5] || today).trim().slice(0, 10);
  const rawDeadline = (values[6] || taskDate).trim();
  const deadlineParts = rawDeadline.split(' ');
  const deadline = deadlineParts[0] || taskDate;
  const scheduledTime = deadlineParts[1] || undefined;

  const rawStatus = (values[7] || 'Pending').trim();
  const status: TaskStatus = rawStatus === 'Completed' ? 'Completed' : 'Pending';

  const nowIso = new Date().toISOString();
  const createdAt = (values[8] || nowIso).trim();
  const completedAt = (values[9] || '').trim() || null;
  const notes = (values[10] || '').trim();
  const lastUpdated = (values[11] || nowIso).trim();

  return {
    id,
    title,
    description: (values[2] || '').trim(),
    category,
    priority,
    taskDate,
    deadline,
    scheduledTime,
    status,
    createdAt,
    completedAt: status === 'Completed' ? completedAt || nowIso : null,
    notes,
    lastUpdated,
    syncState: 'synced',
    sheetRowNumber: rowIndex,
  };
}

export function tasksToGoogleSheetRows(tasks: Task[]): GoogleSheetRow[] {
  return tasks.map((task, idx) => ({
    rowNumber: idx + 2,
    taskId: task.id,
    taskTitle: task.title,
    description: task.description,
    category: task.category,
    priority: task.priority,
    taskDate: task.taskDate,
    deadline: task.scheduledTime ? `${task.deadline} ${task.scheduledTime}` : task.deadline,
    status: task.status,
    createdAt: task.createdAt,
    completedAt: task.completedAt || '',
    notes: task.notes,
    lastUpdated: task.lastUpdated,
  }));
}

/**
 * Deduplicate tasks by Task ID, keeping the one with the latest lastUpdated timestamp
 */
export function deduplicateTasks(tasks: Task[]): Task[] {
  const map = new Map<string, Task>();
  for (const task of tasks) {
    if (!task.id) continue;
    const existing = map.get(task.id);
    if (!existing) {
      map.set(task.id, task);
    } else {
      const existingTime = new Date(existing.lastUpdated || 0).getTime();
      const candidateTime = new Date(task.lastUpdated || 0).getTime();
      if (candidateTime >= existingTime) {
        map.set(task.id, task);
      }
    }
  }
  return Array.from(map.values()).map((t, idx) => ({
    ...t,
    sheetRowNumber: idx + 2,
  }));
}

/**
 * Real Google Sheets API v4: Ensure headers A1:L1 exist on the selected worksheet
 */
export async function ensureLiveGoogleSheetHeaders(
  accessToken: string,
  spreadsheetId: string,
  worksheet: string
): Promise<void> {
  const range = `${worksheet}!A1:L1`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: [[...GOOGLE_SHEETS_HEADERS]],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Sheets API header initialization failed (${response.status}): ${errText}`);
  }
}

/**
 * Real Google Sheets API v4: Pull existing tasks from Google Sheets (A2:L1000)
 */
export async function pullTasksFromLiveGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  worksheet: string
): Promise<Task[]> {
  const range = `${worksheet}!A2:L1000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(range)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to load tasks from Google Sheets (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rows: string[][] = data.values || [];
  const parsedTasks: Task[] = [];

  rows.forEach((row, index) => {
    const t = sheetRowValuesToTask(row, index + 2);
    if (t) {
      parsedTasks.push(t);
    }
  });

  return deduplicateTasks(parsedTasks);
}

/**
 * Real Google Sheets API v4: Synchronize all tasks to Google Sheets without duplicates
 */
export async function pushTasksToLiveGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  worksheet: string,
  tasks: Task[]
): Promise<void> {
  const deduplicated = deduplicateTasks(tasks);

  // 1. Clear existing range A1:L1000 so deleted tasks are removed cleanly
  const clearRange = `${worksheet}!A1:L1000`;
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(clearRange)}:clear`;

  await fetch(clearUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  // 2. Write headers + all task rows atomically
  const values = [
    [...GOOGLE_SHEETS_HEADERS],
    ...deduplicated.map((t) => taskToSheetRowValues(t)),
  ];

  const updateRange = `${worksheet}!A1:L${values.length}`;
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`;

  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: updateRange,
      majorDimension: 'ROWS',
      values,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Sheets sync failed (${response.status}): ${errText}`);
  }
}

/**
 * Real Google Sheets API v4: Create a brand-new Google Spreadsheet with required headers
 */
export async function createLiveGoogleSpreadsheet(
  accessToken: string,
  title: string,
  worksheetName: string,
  initialTasks: Task[]
): Promise<GoogleSpreadsheetItem> {
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const response = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        {
          properties: {
            title: worksheetName,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create Google Spreadsheet (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;

  // Populate headers and existing tasks
  await pushTasksToLiveGoogleSheet(accessToken, spreadsheetId, worksheetName, initialTasks);

  return {
    spreadsheetId,
    title: data.properties?.title || title,
    url: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    worksheets: (data.sheets || []).map((s: any) => s.properties?.title || worksheetName),
    updatedAt: new Date().toISOString(),
    isLiveApi: true,
  };
}

/**
 * Fetch metadata (title & worksheets) for a real Google Spreadsheet ID
 */
export async function fetchLiveSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<GoogleSpreadsheetItem> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Could not inspect Spreadsheet ID (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const worksheets = (data.sheets || []).map((s: any) => s.properties?.title).filter(Boolean);

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Connected Google Spreadsheet',
    url: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    worksheets: worksheets.length > 0 ? worksheets : ['Sheet1'],
    updatedAt: new Date().toISOString(),
    isLiveApi: true,
  };
}

/**
 * Export tasks to Google Sheets-compatible CSV
 */
export function exportTasksToCsv(tasks: Task[]): string {
  const escapeCsvCell = (val: string) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = [
    GOOGLE_SHEETS_HEADERS.map(escapeCsvCell).join(','),
    ...tasks.map((t) => taskToSheetRowValues(t).map(escapeCsvCell).join(',')),
  ];
  return rows.join('\n');
}

/**
 * Parse Google Sheets CSV export into deduplicated tasks
 */
export function parseTasksFromCsv(csvText: string): Task[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length <= 1) return [];

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const parsed: Task[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const task = sheetRowValuesToTask(values, i + 1);
    if (task) {
      parsed.push(task);
    }
  }
  return deduplicateTasks(parsed);
}
