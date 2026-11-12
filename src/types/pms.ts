import { Task, TaskPriority, TaskCategory } from './task';

export type UserRole = 'Admission_Manager' | 'Consultant';

export type TeamName = 'Admission Team' | 'Counseling Team';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  avatar: string;
  phone?: string;
  team?: TeamName;
  activeDossiersCount?: number;
  pendingTasksCount?: number;
  completedTasksCount?: number;
  overdueTasksCount?: number;
  totalTasksCount?: number;
}

export type VisaStage =
  | 'Document_Gathering'
  | 'Apostille_Verification'
  | 'University_Submitted'
  | 'Admission_Granted'
  | 'Tuition_Paid'
  | 'CoA_Received'
  | 'Embassy_Visa_Filing'
  | 'Visa_Issued'
  | 'Rejected';

export type DegreeLevel =
  | 'Korean Language (D-4-1)'
  | 'Bachelor (D-2-2)'
  | 'Master (D-2-3)'
  | 'Doctorate (D-2-4)'
  | 'Exchange (D-2-6)';

export interface DocumentChecklistItem {
  id: string;
  name: string;
  nameKo?: string;
  required: boolean;
  status: 'Pending' | 'Collected' | 'Notarized' | 'Apostilled' | 'Verified';
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface StudentApplication {
  id: string; // e.g. STU-2027-001
  fullName: string;
  passportNumber: string;
  dateOfBirth?: string;
  nationality?: string;
  contactEmail: string;
  contactPhone: string;
  appliedUniversityId: string;
  appliedUniversityName: string;
  projectId: string;
  projectName: string;
  department: string;
  major: string;
  degreeLevel: DegreeLevel;
  intakeTerm: string; // e.g. "Spring 2027"
  visaStage: VisaStage;
  visaType: 'D-2' | 'D-4';
  assignedConsultantId: string;
  assignedConsultantName: string;
  submissionDate: string | null;
  admissionResult: 'Pending' | 'Accepted' | 'Waitlisted' | 'Rejected';
  certificateOfAdmissionNo: string | null;
  tuitionFeePaid: boolean;
  courierName: 'DHL Express' | 'EMS' | 'FedEx' | null;
  courierTrackingNumber: string | null;
  courierDispatchDate?: string | null;
  documentChecklist: DocumentChecklistItem[];
  programId?: string;
  programName?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface UniversityProgram {
  id: string;
  universityId: string;
  name: string;
  code: string;
  degreeLevel: DegreeLevel;
  duration: string;
  tuitionFeeKrw: number;
  tuitionFeeUsd?: number;
  applicationFeeKrw: number;
  requirements: string;
  languageOfInstruction: string;
  intakeTerms?: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt: string;
}

export interface UniversityRefundPolicy {
  universityId: string;
  appFeeRefundable: boolean;
  appFeeConditions: string;
  tuitionRefundPolicy: string;
  visaRejectionRefund: string;
  deadlinesDescription: string;
  refundProcessingTime: string;
  verificationStatus: 'Verified' | 'Pending Review' | 'Draft';
  lastVerifiedAt: string;
  verifiedBy: string;
  updatedAt: string;
}

export interface UniversityBankAccount {
  id: string;
  universityId: string;
  accountHolder: string;
  bankName: string;
  branchName: string;
  accountNumber: string;
  swiftCode: string;
  currency: 'KRW' | 'USD';
  paymentInstructions: string;
  isVirtualAccountSupported: boolean;
  verificationStatus: 'Verified' | 'Pending Review' | 'Draft';
  lastVerifiedAt: string;
  verifiedBy: string;
  updatedAt: string;
}

export interface UniversityDocument {
  id: string;
  universityId: string;
  title: string;
  category: 'Admission Guidelines' | 'Circular' | 'Visa & Immigration' | 'Tuition & Bank' | 'Application Form' | 'Syllabus';
  fileUrl: string;
  fileSize: string;
  fileFormat: string;
  intakeTerm?: string;
  verificationStatus: 'Verified' | 'Pending Review';
  uploadedAt: string;
  uploadedBy: string;
}

export interface KoreanUniversity {
  id: string; // e.g. UNI-SNU
  nameEn: string;
  nameKo: string;
  city: string; // Seoul, Daejeon, Busan, etc.
  ranking: string;
  websiteUrl: string;
  topikRequirement: string;
  ieltsRequirement: string;
  bankBalanceUsd: number; // e.g. 20000 for Seoul area, 16000 for regional
  accredited: boolean;
  standardIntakes: string[]; // e.g. ["Spring 2027", "Fall 2027"]
  notes: string;
  verificationStatus?: 'Verified' | 'Pending Review';
  lastVerifiedAt?: string;
  verifiedBy?: string;
  intakes?: AdmissionIntake[];
  programs?: UniversityProgram[];
  refundPolicy?: UniversityRefundPolicy;
  bankDetails?: UniversityBankAccount;
  documents?: UniversityDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface AdmissionIntake {
  id: string;
  universityId: string;
  universityName?: string;
  term: string; // "Spring 2027"
  academicYear: number;
  applicationStart: string;
  applicationDeadline: string;
  quota: number;
  enrolledCount?: number;
  status: 'Upcoming' | 'Open' | 'Closed' | 'Archived';
  requiredDocuments: string[];
  interviewDates?: string;
  resultAnnouncementDate?: string;
  tuitionPaymentDeadline?: string;
  documentDeadline?: string;
  visaSubmissionDeadline?: string;
  classesStartDate?: string;
  verificationStatus?: 'Verified' | 'Pending Review';
  lastVerifiedAt?: string;
}

export interface IntakeProject {
  id: string; // e.g. PRJ-SNU-2027S
  name: string;
  universityId: string;
  universityName: string;
  intakeTerm: string;
  academicYear: number;
  managerId: string;
  managerName: string;
  assignedConsultantIds: string[];
  startDate: string;
  deadline: string;
  status: 'Planning' | 'Active' | 'Under Review' | 'Completed' | 'Archived';
  targetQuota: number;
  studentCount: number;
  progressPercentage: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubtaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface PmsTask extends Task {
  projectId?: string;
  projectName?: string;
  studentId?: string;
  studentName?: string;
  universityId?: string;
  universityName?: string;
  assignedToId?: string;
  assignedToName?: string;
  assignedById?: string;
  assignedByName?: string;
  priority: TaskPriority;
  subtasks?: SubtaskItem[];
  stage?: string;
  team?: TeamName | string;
  assigneeAvatar?: string;
  assigneeTitle?: string;
  assigneeTeam?: string;
}

export interface InAppNotification {
  id: string;
  recipientId: string;
  recipientName: string;
  senderId: string;
  senderName: string;
  title: string;
  message: string;
  type: 'task_assigned' | 'task_completed' | 'deadline_warning' | 'visa_update' | 'application_submitted';
  targetEntity: 'task' | 'student' | 'project' | 'university';
  targetEntityId: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
}
