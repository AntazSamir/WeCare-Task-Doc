import {
  AuditLogEntry,
  InAppNotification,
  IntakeProject,
  KoreanUniversity,
  PmsTask,
  StudentApplication,
  UniversityBankAccount,
  UniversityDocument,
  UniversityProgram,
  UniversityRefundPolicy,
  UserProfile,
  UserRole,
  VisaStage,
} from '../types/pms';

let currentSessionUser: UserProfile = {
  id: 'USR-ADMIN',
  name: 'Samiul Alam',
  email: 'samiul.wecare@gmail.com',
  role: 'Admission_Manager',
  title: 'Head of Admissions & Visa Processing',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
};

export function setSessionUser(user: UserProfile) {
  currentSessionUser = user;
  try {
    localStorage.setItem('pms_session_user', JSON.stringify(user));
  } catch {}
}

export function getSessionUser(): UserProfile {
  try {
    const saved = localStorage.getItem('pms_session_user');
    if (saved) {
      currentSessionUser = JSON.parse(saved);
    }
  } catch {}
  return currentSessionUser;
}

function getAuthHeaders(): HeadersInit {
  const user = getSessionUser();
  return {
    'Content-Type': 'application/json',
    'x-user-id': user.id,
    'x-user-role': user.role,
  };
}

// Request desktop browser notification permission
export async function requestDesktopNotificationPermission(): Promise<boolean> {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
  }
  return false;
}

// Trigger native OS notification
export function showDesktopNotification(title: string, message: string) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: message,
        icon: '/assets/logo.png',
      });
    } catch {}
  }
}

// Subscribe to real-time Server-Sent Events stream
export function subscribeToNotificationStream(
  userId: string,
  onNotification: (notif: InAppNotification) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const eventSource = new EventSource(`/api/notifications/stream?userId=${encodeURIComponent(userId)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'NOTIFICATION' || data.type === 'NOTIFICATION_BROADCAST') {
        const notif = data.data as InAppNotification;
        onNotification(notif);
        showDesktopNotification(notif.title, notif.message);
      }
    } catch (e) {
      console.warn('Failed to parse SSE payload', e);
    }
  };

  eventSource.onerror = () => {
    // SSE will automatically retry connection
  };

  return () => {
    eventSource.close();
  };
}

// ==========================================
// API CLIENT CALLS
// ==========================================
export async function fetchTeam(): Promise<UserProfile[]> {
  const res = await fetch('/api/team', { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch team members');
  return res.json();
}

export async function fetchUniversities(): Promise<KoreanUniversity[]> {
  const res = await fetch('/api/universities', { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch universities');
  return res.json();
}

export async function createUniversity(data: Partial<KoreanUniversity>): Promise<void> {
  const res = await fetch('/api/universities', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(err.message || err.error || 'Failed to create university');
  }
}

export async function updateUniversity(id: string, data: Partial<KoreanUniversity>): Promise<void> {
  const res = await fetch(`/api/universities/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update university');
}

export async function fetchUniversityDetails(id: string): Promise<KoreanUniversity & { applicants?: any[] }> {
  const res = await fetch(`/api/universities/${id}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch university details');
  return res.json();
}

export async function verifyUniversity(id: string): Promise<{ verifiedAt: string; verifiedBy: string }> {
  const res = await fetch(`/api/universities/${id}/verify`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to verify university');
  return res.json();
}

export async function updateRefundPolicy(universityId: string, data: Partial<UniversityRefundPolicy>): Promise<void> {
  const res = await fetch(`/api/universities/${universityId}/refund-policy`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update refund policy');
}

export async function updateBankDetails(universityId: string, data: Partial<UniversityBankAccount>): Promise<void> {
  const res = await fetch(`/api/universities/${universityId}/bank-details`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update bank details');
}

export async function createProgram(universityId: string, data: Partial<UniversityProgram>): Promise<{ id: string }> {
  const res = await fetch(`/api/universities/${universityId}/programs`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to create program');
  }
  return res.json();
}

export async function updateProgram(universityId: string, programId: string, data: Partial<UniversityProgram>): Promise<void> {
  const res = await fetch(`/api/universities/${universityId}/programs/${programId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update program');
}

export async function deleteProgram(universityId: string, programId: string): Promise<void> {
  const res = await fetch(`/api/universities/${universityId}/programs/${programId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete program');
}

export async function createUniversityDocument(universityId: string, data: Partial<UniversityDocument>): Promise<{ id: string }> {
  const res = await fetch(`/api/universities/${universityId}/documents`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to upload document');
  }
  return res.json();
}

export async function deleteUniversityDocument(universityId: string, docId: string): Promise<void> {
  const res = await fetch(`/api/universities/${universityId}/documents/${docId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete document');
}

export async function createIntake(data: any): Promise<void> {
  const res = await fetch('/api/intakes', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create intake');
}

export async function updateIntake(intakeId: string, data: any): Promise<void> {
  const res = await fetch(`/api/intakes/${intakeId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update intake');
}

export async function fetchProjects(): Promise<IntakeProject[]> {
  const res = await fetch('/api/projects', { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch intake projects');
  return res.json();
}

export async function createProject(data: Partial<IntakeProject>): Promise<void> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(err.message || err.error || 'Failed to create project');
  }
}

export async function fetchStudents(): Promise<StudentApplication[]> {
  const res = await fetch('/api/students', { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch student dossiers');
  return res.json();
}

export async function createStudent(data: Partial<StudentApplication>): Promise<{ id: string }> {
  const res = await fetch('/api/students', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(err.message || err.error || 'Failed to register student');
  }
  return res.json();
}

export async function updateStudent(id: string, data: Partial<StudentApplication>): Promise<void> {
  const res = await fetch(`/api/students/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update student dossier');
}

export async function updateStudentStage(id: string, visaStage: VisaStage, notes?: string): Promise<void> {
  const res = await fetch(`/api/students/${id}/stage`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ visaStage, notes }),
  });
  if (!res.ok) throw new Error('Failed to advance visa stage');
}

export async function fetchPmsTasks(): Promise<PmsTask[]> {
  const res = await fetch('/api/tasks', { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function createPmsTask(data: Partial<PmsTask>): Promise<{ id: string }> {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create task');
  return res.json();
}

export async function togglePmsTask(id: string, notes?: string): Promise<void> {
  const res = await fetch(`/api/tasks/${id}/toggle`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error('Failed to toggle task');
}

export async function deletePmsTask(id: string): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete task');
}

export async function fetchNotifications(userId?: string): Promise<InAppNotification[]> {
  const res = await fetch(`/api/notifications?userId=${encodeURIComponent(userId || getSessionUser().id)}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await fetch(`/api/notifications/${id}/read`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await fetch('/api/notifications/read-all', {
    method: 'POST',
    headers: getAuthHeaders(),
  });
}

export async function fetchAuditLogs(): Promise<AuditLogEntry[]> {
  const res = await fetch('/api/audit-logs', { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}

export async function fetchAnalytics(): Promise<any> {
  const res = await fetch('/api/analytics', { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function triggerBackup(): Promise<{ ok: boolean; backupFile: string }> {
  const res = await fetch('/api/backup', {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Backup failed or forbidden');
  return res.json();
}

export async function createEmployee(data: Partial<UserProfile>): Promise<{ id: string }> {
  const res = await fetch('/api/team', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(err.error || 'Failed to create employee');
  }
  return res.json();
}

export async function updateEmployee(id: string, data: Partial<UserProfile>): Promise<void> {
  const res = await fetch(`/api/team/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(err.error || 'Failed to update employee');
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  const res = await fetch(`/api/team/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(err.error || 'Failed to delete employee');
  }
}

export async function updatePmsTask(id: string, data: Partial<PmsTask>): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(err.error || 'Failed to update task');
  }
}

export async function reassignPmsTask(
  id: string,
  data: { assignedToId?: string; team?: string; deadline?: string; priority?: string; status?: string }
): Promise<void> {
  const res = await fetch(`/api/tasks/${id}/reassign`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(err.error || 'Failed to reassign task');
  }
}

export async function assignBulkTasks(data: {
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  taskDate: string;
  deadline?: string;
  scheduledTime?: string;
  notes?: string;
  assignedTeam?: string;
  assignedToIds?: string[];
  assignedToId?: string;
  projectId?: string;
  studentId?: string;
  universityId?: string;
  subtasks?: any[];
}): Promise<{ ok: boolean; id: string; createdIds?: string[] }> {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(err.error || 'Failed to assign tasks');
  }
  return res.json();
}

