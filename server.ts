import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db, initDatabase, createBackupSnapshot, buildIntakeDocumentsForStudent, syncIntakeStudentApplications } from './server/db';
import {
  acknowledgeDocumentHandover,
  cancelDocumentRequest,
  createDocumentHandover,
  createDocumentRequest,
  getDocumentRequestById,
  getHandoverById,
  getHandoverStats,
  listDocumentRequests,
  listHandovers,
  submitHandoverFollowUp,
} from './server/handoverService';
import {
  processSheetsOutbox,
  recoverInterruptedSyncJobs,
  setRuntimeOAuthAccessToken,
} from './server/sheetsQueue';

const portArgIndex = process.argv.indexOf('--port');
const portFromArg = portArgIndex !== -1 ? parseInt(process.argv[portArgIndex + 1], 10) : NaN;
const PORT = !isNaN(portFromArg) ? portFromArg : (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

// Initialize relational SQLite database & recover any interrupted outbox jobs
initDatabase();
const recoveredJobs = recoverInterruptedSyncJobs(db, 0, true);
if (recoveredJobs > 0) {
  console.log(`[Sheets Outbox] Recovered ${recoveredJobs} interrupted sync job(s) on startup.`);
}

// SSE Connected Clients (userId -> Set<Response>)
const sseClients = new Map<string, Set<Response>>();

function broadcastNotification(recipientId: string, notification: any) {
  // Send to specific recipient
  const userClients = sseClients.get(recipientId);
  if (userClients) {
    const payload = `data: ${JSON.stringify({ type: 'NOTIFICATION', data: notification })}\n\n`;
    for (const client of userClients) {
      client.write(payload);
    }
  }

  // Also notify admins if recipient was not admin
  if (recipientId !== 'USR-ADMIN') {
    const adminClients = sseClients.get('USR-ADMIN');
    if (adminClients) {
      const payload = `data: ${JSON.stringify({ type: 'NOTIFICATION_BROADCAST', data: notification })}\n\n`;
      for (const client of adminClients) {
        client.write(payload);
      }
    }
  }
}

// Security Middleware: Extract User & Enforce RBAC
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    role: 'Admission_Manager' | 'Consultant';
    team: 'Admission Team' | 'Counseling Team' | string;
  };
}

function authMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const userId = (req.headers['x-user-id'] as string) || 'USR-ADMIN';
  const userRow = db.prepare("SELECT id, name, role, COALESCE(team, 'Admission Team') as team FROM users WHERE id = ?").get(userId) as any;

  const sheetsToken = req.headers['x-sheets-access-token'] as string | undefined;
  if (sheetsToken) {
    setRuntimeOAuthAccessToken(sheetsToken);
  }

  if (userRow) {
    req.user = {
      id: userRow.id,
      name: userRow.name,
      role: userRow.role,
      team: userRow.team || 'Admission Team',
    };
  } else {
    req.user = {
      id: 'USR-ADMIN',
      name: 'Samiul Alam',
      role: 'Admission_Manager',
      team: 'Admission Team',
    };
  }
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'Admission_Manager') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'This operation requires Admission Manager / Administrator permissions.',
    });
  }
  next();
}

function logAudit(
  actorId: string,
  actorName: string,
  actorRole: string,
  action: string,
  entityType: string,
  entityId: string,
  details: string
) {
  const id = 'AUD-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  db.prepare(`
    INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, actorId, actorName, actorRole, action, entityType, entityId, details, new Date().toISOString());
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(authMiddleware);

  // ==========================================
  // REAL-TIME NOTIFICATIONS (Server-Sent Events)
  // ==========================================
  app.get('/api/notifications/stream', (req: AuthenticatedRequest, res: Response) => {
    const userId = (req.query.userId as string) || req.user?.id || 'USR-ADMIN';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!sseClients.has(userId)) {
      sseClients.set(userId, new Set());
    }
    sseClients.get(userId)!.add(res);

    // Initial heartbeat
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', userId, timestamp: new Date().toISOString() })}\n\n`);

    req.on('close', () => {
      const userSet = sseClients.get(userId);
      if (userSet) {
        userSet.delete(res);
        if (userSet.size === 0) {
          sseClients.delete(userId);
        }
      }
    });
  });

  // ==========================================
  // TEAM & USERS API
  // ==========================================
  app.get('/api/team', (_req: Request, res: Response) => {
    const today = new Date().toISOString().slice(0, 10);
    const users = db.prepare(`SELECT id, name, email, role, title, avatar, phone, COALESCE(team, 'Admission Team') as team FROM users ORDER BY team ASC, role DESC, name ASC`).all() as any[];
    const stats = db.prepare(`
      SELECT 
        u.id,
        (SELECT COUNT(*) FROM student_applications WHERE assigned_consultant_id = u.id) as active_dossiers,
        (SELECT COUNT(*) FROM tasks WHERE assigned_to_id = u.id) as total_tasks,
        (SELECT COUNT(*) FROM tasks WHERE assigned_to_id = u.id AND status = 'Pending') as pending_tasks,
        (SELECT COUNT(*) FROM tasks WHERE assigned_to_id = u.id AND status = 'Completed') as completed_tasks,
        (SELECT COUNT(*) FROM tasks WHERE assigned_to_id = u.id AND status = 'Pending' AND deadline < ?) as overdue_tasks
      FROM users u
    `).all(today) as any[];

    const statsMap = new Map(stats.map((s) => [s.id, s]));
    const result = users.map((u: any) => {
      const s = statsMap.get(u.id);
      return {
        ...u,
        team: u.team || 'Admission Team',
        activeDossiersCount: s?.active_dossiers || 0,
        totalTasksCount: s?.total_tasks || 0,
        pendingTasksCount: s?.pending_tasks || 0,
        completedTasksCount: s?.completed_tasks || 0,
        overdueTasksCount: s?.overdue_tasks || 0,
      };
    });

    res.json(result);
  });

  app.post('/api/team', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { name, email, role, title, avatar, phone, team } = req.body;
    if (!name || !email || !role || !title) {
      return res.status(400).json({ error: 'Name, email, role, and title are required.' });
    }

    const id = 'USR-' + (team === 'Counseling Team' ? 'CNS-' : 'ADM-') + Date.now().toString(36).toUpperCase().slice(-5);
    const now = new Date().toISOString();
    const defaultAvatar = avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80';

    try {
      db.prepare(`
        INSERT INTO users (id, name, email, role, title, avatar, phone, team, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        name.trim(),
        email.trim().toLowerCase(),
        role,
        title.trim(),
        defaultAvatar,
        phone?.trim() || null,
        team || 'Admission Team',
        now
      );

      logAudit(req.user!.id, req.user!.name, req.user!.role, 'CREATE_EMPLOYEE', 'user', id, `Added employee ${name} to ${team || 'Admission Team'}`);
      res.json({ ok: true, id });
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'An employee with this email address already exists.' });
      }
      res.status(500).json({ error: err.message || 'Failed to create employee.' });
    }
  });

  app.put('/api/team/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { name, email, role, title, avatar, phone, team } = req.body;

    try {
      db.prepare(`
        UPDATE users SET
          name = COALESCE(?, name),
          email = COALESCE(?, email),
          role = COALESCE(?, role),
          title = COALESCE(?, title),
          avatar = COALESCE(?, avatar),
          phone = COALESCE(?, phone),
          team = COALESCE(?, team)
        WHERE id = ?
      `).run(
        name ? name.trim() : null,
        email ? email.trim().toLowerCase() : null,
        role || null,
        title ? title.trim() : null,
        avatar || null,
        phone !== undefined ? phone?.trim() : null,
        team || null,
        id
      );

      logAudit(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_EMPLOYEE', 'user', id, `Updated employee profile for ${name || id}`);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update employee.' });
    }
  });

  app.delete('/api/team/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    if (id === 'USR-ADMIN') {
      return res.status(400).json({ error: 'Cannot delete primary head administrator.' });
    }

    try {
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
      logAudit(req.user!.id, req.user!.name, req.user!.role, 'DELETE_EMPLOYEE', 'user', id, `Removed employee ID ${id}`);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete employee.' });
    }
  });

  // ==========================================
  // UNIVERSITIES & INTAKES API
  // ==========================================
  app.get('/api/universities', (_req: Request, res: Response) => {
    const unis = db.prepare('SELECT * FROM universities ORDER BY ranking ASC').all() as any[];
    const intakes = db.prepare('SELECT * FROM admission_intakes ORDER BY application_deadline ASC').all() as any[];
    const programs = db.prepare('SELECT id, university_id, name, code, degree_level, duration, tuition_fee_krw, tuition_fee_usd, application_fee_krw, language_of_instruction FROM university_programs WHERE is_active = 1').all() as any[];
    const refundPolicies = db.prepare('SELECT * FROM university_refund_policies').all() as any[];
    const bankAccounts = db.prepare('SELECT * FROM university_bank_accounts').all() as any[];
    const documents = db.prepare('SELECT * FROM university_documents').all() as any[];

    const mapped = unis.map((u) => {
      const uniIntakes = intakes
        .filter((i) => i.university_id === u.id)
        .map((i) => ({
          id: i.id,
          universityId: i.university_id,
          term: i.term,
          academicYear: i.academic_year,
          applicationStart: i.application_start,
          applicationDeadline: i.application_deadline,
          quota: i.quota,
          status: i.status,
          requiredDocuments: JSON.parse(i.required_documents || '[]'),
          interviewDates: i.interview_dates,
          resultAnnouncementDate: i.result_announcement_date,
          tuitionPaymentDeadline: i.tuition_payment_deadline,
          documentDeadline: i.document_deadline,
          visaSubmissionDeadline: i.visa_submission_deadline,
          classesStartDate: i.classes_start_date,
          verificationStatus: i.verification_status || 'Verified',
          lastVerifiedAt: i.last_verified_at,
        }));

      const uniPrograms = programs
        .filter((p) => p.university_id === u.id)
        .map((p) => ({
          id: p.id,
          universityId: p.university_id,
          name: p.name,
          code: p.code,
          degreeLevel: p.degree_level,
          duration: p.duration,
          tuitionFeeKrw: p.tuition_fee_krw,
          tuitionFeeUsd: p.tuition_fee_usd,
          applicationFeeKrw: p.application_fee_krw,
          languageOfInstruction: p.language_of_instruction,
        }));

      const refundPolicy = refundPolicies.find((r) => r.university_id === u.id);
      const bankDetails = bankAccounts.find((b) => b.university_id === u.id);
      const uniDocs = documents.filter((d) => d.university_id === u.id).map((d) => ({
        id: d.id,
        universityId: d.university_id,
        title: d.title,
        category: d.category,
        fileUrl: d.file_url,
        fileSize: d.file_size,
        fileFormat: d.file_format,
        intakeTerm: d.intake_term,
        verificationStatus: d.verification_status,
        uploadedAt: d.uploaded_at,
        uploadedBy: d.uploaded_by,
      }));

      return {
        id: u.id,
        nameEn: u.name_en,
        nameKo: u.name_ko,
        city: u.city,
        ranking: u.ranking,
        websiteUrl: u.website_url,
        topikRequirement: u.topik_requirement,
        ieltsRequirement: u.ielts_requirement,
        bankBalanceUsd: u.bank_balance_usd,
        accredited: Boolean(u.accredited),
        notes: u.notes,
        verificationStatus: u.verification_status || 'Verified',
        lastVerifiedAt: u.last_verified_at || u.updated_at,
        verifiedBy: u.verified_by || 'Samiul Alam (Head of Admissions)',
        intakes: uniIntakes,
        programs: uniPrograms,
        refundPolicy: refundPolicy
          ? {
              universityId: refundPolicy.university_id,
              appFeeRefundable: Boolean(refundPolicy.app_fee_refundable),
              appFeeConditions: refundPolicy.app_fee_conditions,
              tuitionRefundPolicy: refundPolicy.tuition_refund_policy,
              visaRejectionRefund: refundPolicy.visa_rejection_refund,
              deadlinesDescription: refundPolicy.deadlines_description,
              refundProcessingTime: refundPolicy.refund_processing_time,
              verificationStatus: refundPolicy.verification_status || 'Verified',
              lastVerifiedAt: refundPolicy.last_verified_at,
              verifiedBy: refundPolicy.verified_by,
              updatedAt: refundPolicy.updated_at,
            }
          : undefined,
        bankDetails: bankDetails
          ? {
              id: bankDetails.id,
              universityId: bankDetails.university_id,
              accountHolder: bankDetails.account_holder,
              bankName: bankDetails.bank_name,
              branchName: bankDetails.branch_name,
              accountNumber: bankDetails.account_number,
              swiftCode: bankDetails.swift_code,
              currency: bankDetails.currency,
              paymentInstructions: bankDetails.payment_instructions,
              isVirtualAccountSupported: Boolean(bankDetails.is_virtual_account_supported),
              verificationStatus: bankDetails.verification_status || 'Verified',
              lastVerifiedAt: bankDetails.last_verified_at,
              verifiedBy: bankDetails.verified_by,
              updatedAt: bankDetails.updated_at,
            }
          : undefined,
        documents: uniDocs,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      };
    });

    res.json(mapped);
  });

  app.get('/api/universities/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const u = db.prepare('SELECT * FROM universities WHERE id = ?').get(id) as any;
    if (!u) {
      return res.status(404).json({ error: 'University not found' });
    }

    const intakes = db.prepare('SELECT * FROM admission_intakes WHERE university_id = ? ORDER BY application_deadline ASC').all(id) as any[];
    const programs = db.prepare('SELECT * FROM university_programs WHERE university_id = ? AND is_active = 1 ORDER BY degree_level ASC, name ASC').all(id) as any[];
    const refundPolicy = db.prepare('SELECT * FROM university_refund_policies WHERE university_id = ?').get(id) as any;
    const bankDetails = db.prepare('SELECT * FROM university_bank_accounts WHERE university_id = ?').get(id) as any;
    const documents = db.prepare('SELECT * FROM university_documents WHERE university_id = ? ORDER BY uploaded_at DESC').all(id) as any[];

    // Applicants linked to this university
    const applicants = db.prepare(`
      SELECT 
        s.id, s.full_name, s.passport_number, s.department, s.major, s.degree_level,
        s.intake_term, s.visa_stage, s.admission_result, s.created_at,
        u.name as consultant_name
      FROM student_applications s
      JOIN users u ON s.assigned_consultant_id = u.id
      WHERE s.applied_university_id = ?
      ORDER BY s.created_at DESC
    `).all(id) as any[];

    res.json({
      id: u.id,
      nameEn: u.name_en,
      nameKo: u.name_ko,
      city: u.city,
      ranking: u.ranking,
      websiteUrl: u.website_url,
      topikRequirement: u.topik_requirement,
      ieltsRequirement: u.ielts_requirement,
      bankBalanceUsd: u.bank_balance_usd,
      accredited: Boolean(u.accredited),
      notes: u.notes,
      verificationStatus: u.verification_status || 'Verified',
      lastVerifiedAt: u.last_verified_at || u.updated_at,
      verifiedBy: u.verified_by || 'Samiul Alam (Head of Admissions)',
      intakes: intakes.map((i) => ({
        id: i.id,
        universityId: i.university_id,
        term: i.term,
        academicYear: i.academic_year,
        applicationStart: i.application_start,
        applicationDeadline: i.application_deadline,
        quota: i.quota,
        status: i.status,
        requiredDocuments: JSON.parse(i.required_documents || '[]'),
        interviewDates: i.interview_dates,
        resultAnnouncementDate: i.result_announcement_date,
        tuitionPaymentDeadline: i.tuition_payment_deadline,
        documentDeadline: i.document_deadline,
        visaSubmissionDeadline: i.visa_submission_deadline,
        classesStartDate: i.classes_start_date,
        verificationStatus: i.verification_status || 'Verified',
        lastVerifiedAt: i.last_verified_at,
      })),
      programs: programs.map((p) => ({
        id: p.id,
        universityId: p.university_id,
        name: p.name,
        code: p.code,
        degreeLevel: p.degree_level,
        duration: p.duration,
        tuitionFeeKrw: p.tuition_fee_krw,
        tuitionFeeUsd: p.tuition_fee_usd,
        applicationFeeKrw: p.application_fee_krw,
        requirements: p.requirements,
        languageOfInstruction: p.language_of_instruction,
        intakeTerms: JSON.parse(p.intake_terms || '[]'),
        isActive: Boolean(p.is_active),
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
      refundPolicy: refundPolicy
        ? {
            universityId: refundPolicy.university_id,
            appFeeRefundable: Boolean(refundPolicy.app_fee_refundable),
            appFeeConditions: refundPolicy.app_fee_conditions,
            tuitionRefundPolicy: refundPolicy.tuition_refund_policy,
            visaRejectionRefund: refundPolicy.visa_rejection_refund,
            deadlinesDescription: refundPolicy.deadlines_description,
            refundProcessingTime: refundPolicy.refund_processing_time,
            verificationStatus: refundPolicy.verification_status || 'Verified',
            lastVerifiedAt: refundPolicy.last_verified_at,
            verifiedBy: refundPolicy.verified_by,
            updatedAt: refundPolicy.updated_at,
          }
        : null,
      bankDetails: bankDetails
        ? {
            id: bankDetails.id,
            universityId: bankDetails.university_id,
            accountHolder: bankDetails.account_holder,
            bankName: bankDetails.bank_name,
            branchName: bankDetails.branch_name,
            accountNumber: bankDetails.account_number,
            swiftCode: bankDetails.swift_code,
            currency: bankDetails.currency,
            paymentInstructions: bankDetails.payment_instructions,
            isVirtualAccountSupported: Boolean(bankDetails.is_virtual_account_supported),
            verificationStatus: bankDetails.verification_status || 'Verified',
            lastVerifiedAt: bankDetails.last_verified_at,
            verifiedBy: bankDetails.verified_by,
            updatedAt: bankDetails.updated_at,
          }
        : null,
      documents: documents.map((d) => ({
        id: d.id,
        universityId: d.university_id,
        title: d.title,
        category: d.category,
        fileUrl: d.file_url,
        fileSize: d.file_size,
        fileFormat: d.file_format,
        intakeTerm: d.intake_term,
        verificationStatus: d.verification_status,
        uploadedAt: d.uploaded_at,
        uploadedBy: d.uploaded_by,
      })),
      applicants: applicants.map((a) => ({
        id: a.id,
        fullName: a.full_name,
        passportNumber: a.passport_number,
        department: a.department,
        major: a.major,
        degreeLevel: a.degree_level,
        intakeTerm: a.intake_term,
        visaStage: a.visa_stage,
        admissionResult: a.admission_result,
        consultantName: a.consultant_name,
        createdAt: a.created_at,
      })),
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    });
  });

  app.post('/api/universities', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const {
      nameEn,
      nameKo,
      city,
      ranking,
      websiteUrl,
      topikRequirement,
      ieltsRequirement,
      bankBalanceUsd,
      accredited,
      notes,
      intake,
      program,
      bankDetails,
      refundPolicy,
      initialDocument,
    } = req.body;

    if (!nameEn || !city) {
      return res.status(400).json({ error: 'University English name and city are required.' });
    }

    let id = 'UNI-' + nameEn.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
    if (!id || id === 'UNI-') {
      id = 'UNI-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    const existing = db.prepare('SELECT id FROM universities WHERE id = ?').get(id);
    if (existing) {
      id = `${id}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const now = new Date().toISOString();
    const verifier = req.user!.name + (req.user!.role === 'Admission_Manager' ? ' (Head of Admissions)' : '');

    // 1. Insert University Record
    db.prepare(`
      INSERT INTO universities (
        id, name_en, name_ko, city, ranking, website_url,
        topik_requirement, ielts_requirement, bank_balance_usd,
        accredited, notes, verification_status, last_verified_at,
        verified_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Verified', ?, ?, ?, ?)
    `).run(
      id,
      nameEn.trim(),
      nameKo?.trim() || nameEn.trim(),
      city.trim(),
      ranking?.trim() || 'Top Tier University',
      websiteUrl?.trim() || 'https://www.studyinkorea.go.kr',
      topikRequirement?.trim() || 'TOPIK Level 3 or higher',
      ieltsRequirement?.trim() || 'IELTS 5.5 minimum',
      Number(bankBalanceUsd) || 20000,
      accredited !== undefined ? (accredited ? 1 : 0) : 1,
      notes?.trim() || '',
      now,
      verifier,
      now,
      now
    );

    // 2. Insert Initial Admission Intake & Deadlines
    const intakeTerm = intake?.term?.trim() || 'Spring 2027';
    const academicYear = Number(intake?.academicYear) || 2027;
    const intakeId = `INT-${id.replace('UNI-', '')}-${academicYear}${intakeTerm.startsWith('Spring') ? 'S' : intakeTerm.startsWith('Fall') ? 'F' : 'T'}`;
    const stdDocs = JSON.stringify([
      'Valid Passport Copy',
      'Apostilled High School / Degree Certificate',
      'Apostilled Official Transcripts',
      `Bank Balance Certificate ($${Number(bankBalanceUsd) || 20000} USD, 30 days valid)`,
      'Family Relationship Certificate (Birth Certificate)',
      'Study Plan & Statement of Purpose',
      'TOPIK or English Test Score Report',
    ]);

    db.prepare(`
      INSERT OR REPLACE INTO admission_intakes (
        id, university_id, term, academic_year, application_start,
        application_deadline, quota, status, required_documents,
        interview_dates, result_announcement_date, tuition_payment_deadline,
        document_deadline, visa_submission_deadline, classes_start_date,
        verification_status, last_verified_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Verified', ?)
    `).run(
      intakeId,
      id,
      intakeTerm,
      academicYear,
      intake?.applicationStart || '2026-08-01',
      intake?.applicationDeadline || '2026-09-30',
      Number(intake?.quota) || 30,
      intake?.status || 'Open',
      intake?.requiredDocuments ? JSON.stringify(intake.requiredDocuments) : stdDocs,
      intake?.interviewDates || '2026-10-15 ~ 2026-10-20',
      intake?.resultAnnouncementDate || '2026-11-15',
      intake?.tuitionPaymentDeadline || '2026-12-10',
      intake?.documentDeadline || '2026-10-05',
      intake?.visaSubmissionDeadline || '2027-01-10',
      intake?.classesStartDate || '2027-03-02',
      now
    );

    // 3. Insert Initial Academic / Language Program
    const programId = `PRG-${id.replace('UNI-', '')}-01`;
    const programName = program?.name?.trim() || 'Korean Language Regular Program (KLP)';
    const programCode = program?.code?.trim() || (programName.includes('Korean Language') ? 'KLP' : 'UG-01');
    const degreeLevel = program?.degreeLevel || 'Korean Language (D-4-1)';
    const duration = program?.duration || (degreeLevel.includes('D-4') ? '4 Quarters (1 Year)' : '4 Years (8 Semesters)');
    const tuitionFeeKrw = Number(program?.tuitionFeeKrw) || (degreeLevel.includes('D-4') ? 1730000 : 3800000);
    const tuitionFeeUsd = Number(program?.tuitionFeeUsd) || Math.round(tuitionFeeKrw / 1320);
    const appFeeKrw = Number(program?.applicationFeeKrw) || (degreeLevel.includes('D-4') ? 80000 : 100000);
    const requirements = program?.requirements?.trim() || (
      degreeLevel.includes('D-4')
        ? 'High school diploma or higher, valid passport (6+ months), apostilled academic documents.'
        : 'High school graduation with 70%+ GPA, apostilled diploma & transcripts, language certificate.'
    );
    const languageOfInstruction = program?.languageOfInstruction || (degreeLevel.includes('D-4') ? 'Korean' : 'Korean / English');
    const termsJson = JSON.stringify(program?.intakeTerms || [intakeTerm]);

    db.prepare(`
      INSERT OR REPLACE INTO university_programs (
        id, university_id, name, code, degree_level, duration,
        tuition_fee_krw, tuition_fee_usd, application_fee_krw,
        requirements, language_of_instruction, intake_terms, is_active,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      programId,
      id,
      programName,
      programCode,
      degreeLevel,
      duration,
      tuitionFeeKrw,
      tuitionFeeUsd,
      appFeeKrw,
      requirements,
      languageOfInstruction,
      termsJson,
      now,
      now
    );

    // 4. Insert University Bank Account & Wire Instructions
    const bankId = `BNK-${id.replace('UNI-', '')}-01`;
    const bankName = bankDetails?.bankName?.trim() || 'Hana Bank';
    const accountHolder = bankDetails?.accountHolder?.trim() || nameEn.trim();
    const branchName = bankDetails?.branchName?.trim() || `${city.split(' ')[0]} Campus Branch`;
    const accountNumber = bankDetails?.accountNumber?.trim() || `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100000 + Math.random() * 900000)}-${Math.floor(10000 + Math.random() * 90000)}`;
    const swiftCode = bankDetails?.swiftCode?.trim() || (
      bankName.toLowerCase().includes('kookmin') || bankName.toLowerCase().includes('kb') ? 'CZNBKRSE' :
      bankName.toLowerCase().includes('shinhan') ? 'SHBKKRSE' :
      bankName.toLowerCase().includes('woori') ? 'HVBKKRSE' :
      'HNBNKRSE'
    );
    const currency = bankDetails?.currency || 'KRW';
    const paymentInstructions = bankDetails?.paymentInstructions?.trim() || (
      `1. Remit in ${currency} via international telegraphic wire transfer.\n` +
      `2. Strictly enter the student's Application Number and Passport Name in the remittance remark/memo.\n` +
      `3. Wire charge code MUST be set to "OUR" (all intermediary and receiving bank fees borne by remitter).\n` +
      `4. Provide SWIFT MT103 confirmation receipt to the International Admissions Office within 48 hours of payment.`
    );
    const isVirtualAccount = bankDetails?.isVirtualAccountSupported !== undefined ? (bankDetails.isVirtualAccountSupported ? 1 : 0) : 1;

    db.prepare(`
      INSERT OR REPLACE INTO university_bank_accounts (
        id, university_id, account_holder, bank_name, branch_name,
        account_number, swift_code, currency, payment_instructions,
        is_virtual_account_supported, verification_status, last_verified_at,
        verified_by, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Verified', ?, ?, ?)
    `).run(
      bankId,
      id,
      accountHolder,
      bankName,
      branchName,
      accountNumber,
      swiftCode,
      currency,
      paymentInstructions,
      isVirtualAccount,
      now,
      verifier,
      now
    );

    // 5. Insert Refund Policy Guidelines
    const appFeeRefundable = refundPolicy?.appFeeRefundable ? 1 : 0;
    const appFeeConditions = refundPolicy?.appFeeConditions?.trim() || (
      appFeeRefundable ? 'Refundable if application is withdrawn before document evaluation begins.' : 'Application fee is non-refundable once online portal submission is finalized.'
    );
    const tuitionRefund = refundPolicy?.tuitionRefundPolicy?.trim() || (
      'Prior to semester opening day: 100% tuition refund minus bank processing charges (KRW 50,000).\n' +
      '• Within 30 days of start: 5/6 refund.\n' +
      '• 31 to 60 days: 2/3 refund.\n' +
      '• 61 to 90 days: 1/2 refund.\n' +
      '• Beyond 90 days: Non-refundable.'
    );
    const visaRejection = refundPolicy?.visaRejectionRefund?.trim() || (
      '100% tuition fee is refunded if the student visa (D-2 / D-4) is refused by Korean Embassy/Immigration upon submitting the official refusal confirmation certificate.'
    );
    const deadlinesDesc = refundPolicy?.deadlinesDescription?.trim() || (
      'Formal cancellation request and refund application form must be submitted through the university International Office before the designated semester start date.'
    );
    const processingTime = refundPolicy?.refundProcessingTime?.trim() || '14 to 21 business days via international wire transfer to student account.';

    db.prepare(`
      INSERT OR REPLACE INTO university_refund_policies (
        university_id, app_fee_refundable, app_fee_conditions,
        tuition_refund_policy, visa_rejection_refund, deadlines_description,
        refund_processing_time, verification_status, last_verified_at,
        verified_by, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Verified', ?, ?, ?)
    `).run(
      id,
      appFeeRefundable,
      appFeeConditions,
      tuitionRefund,
      visaRejection,
      deadlinesDesc,
      processingTime,
      now,
      verifier,
      now
    );

    // 6. Insert Standard University Admission Documents
    const docInsert = db.prepare(`
      INSERT OR REPLACE INTO university_documents (
        id, university_id, title, category, file_url,
        file_size, file_format, intake_term, verification_status,
        uploaded_at, uploaded_by
      )
      VALUES (?, ?, ?, ?, ?, ?, 'PDF', ?, 'Verified', ?, ?)
    `);

    docInsert.run(
      `DOC-${id.replace('UNI-', '')}-01`,
      id,
      initialDocument?.title?.trim() || `${nameEn} International Admission Guidelines & Application Guide`,
      initialDocument?.category?.trim() || 'Admission Guidelines',
      initialDocument?.fileUrl?.trim() || websiteUrl || 'https://www.studyinkorea.go.kr',
      '2.4 MB',
      intakeTerm,
      now,
      verifier
    );
    docInsert.run(
      `DOC-${id.replace('UNI-', '')}-02`,
      id,
      'Standard International Student Application Form & Financial Affidavit',
      'Application Form',
      websiteUrl || 'https://www.studyinkorea.go.kr',
      '1.1 MB',
      intakeTerm,
      now,
      verifier
    );
    docInsert.run(
      `DOC-${id.replace('UNI-', '')}-03`,
      id,
      'Ministry of Justice Korean Visa (D-2/D-4) Document Apostille Requirements',
      'Visa & Immigration',
      'https://www.hikorea.go.kr',
      '850 KB',
      intakeTerm,
      now,
      verifier
    );

    logAudit(req.user!.id, req.user!.name, req.user!.role, 'CREATE_UNIVERSITY', 'university', id, `Added partner institution ${nameEn} (${city}) with complete intake, program, banking, and refund guidelines`);
    res.json({ ok: true, id });
  });

  app.put('/api/universities/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { nameEn, nameKo, city, ranking, websiteUrl, topikRequirement, ieltsRequirement, bankBalanceUsd, notes } = req.body;

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE universities SET
        name_en = COALESCE(?, name_en),
        name_ko = COALESCE(?, name_ko),
        city = COALESCE(?, city),
        ranking = COALESCE(?, ranking),
        website_url = COALESCE(?, website_url),
        topik_requirement = COALESCE(?, topik_requirement),
        ielts_requirement = COALESCE(?, ielts_requirement),
        bank_balance_usd = COALESCE(?, bank_balance_usd),
        notes = COALESCE(?, notes),
        last_verified_at = ?,
        verified_by = ?,
        updated_at = ?
      WHERE id = ?
    `).run(nameEn, nameKo, city, ranking, websiteUrl, topikRequirement, ieltsRequirement, bankBalanceUsd, notes, now, req.user!.name, now, id);

    logAudit(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_UNIVERSITY', 'university', id, `Updated university requirements for ${id}`);
    res.json({ ok: true });
  });

  app.put('/api/universities/:id/verify', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const now = new Date().toISOString();
    const verifier = req.user!.name + (req.user!.role === 'Admission_Manager' ? ' (Head of Admissions)' : '');

    db.prepare(`
      UPDATE universities SET
        verification_status = 'Verified',
        last_verified_at = ?,
        verified_by = ?,
        updated_at = ?
      WHERE id = ?
    `).run(now, verifier, now, id);

    // Also update sub-records
    db.prepare(`UPDATE university_refund_policies SET verification_status = 'Verified', last_verified_at = ?, verified_by = ? WHERE university_id = ?`).run(now, verifier, id);
    db.prepare(`UPDATE university_bank_accounts SET verification_status = 'Verified', last_verified_at = ?, verified_by = ? WHERE university_id = ?`).run(now, verifier, id);
    db.prepare(`UPDATE admission_intakes SET verification_status = 'Verified', last_verified_at = ? WHERE university_id = ?`).run(now, id);

    logAudit(req.user!.id, req.user!.name, req.user!.role, 'VERIFY_UNIVERSITY', 'university', id, `Officially re-verified university requirements and banking for ${id}`);
    res.json({ ok: true, verifiedAt: now, verifiedBy: verifier });
  });

  app.put('/api/universities/:id/refund-policy', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { appFeeRefundable, appFeeConditions, tuitionRefundPolicy, visaRejectionRefund, deadlinesDescription, refundProcessingTime } = req.body;
    const now = new Date().toISOString();
    const verifier = req.user!.name;

    db.prepare(`
      INSERT OR REPLACE INTO university_refund_policies (
        university_id, app_fee_refundable, app_fee_conditions, tuition_refund_policy,
        visa_rejection_refund, deadlines_description, refund_processing_time,
        verification_status, last_verified_at, verified_by, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Verified', ?, ?, ?)
    `).run(
      id,
      appFeeRefundable ? 1 : 0,
      appFeeConditions || 'Application fee is non-refundable.',
      tuitionRefundPolicy || '100% refund prior to class start; pro-rated refund within 30/60/90 days.',
      visaRejectionRefund || 'Full tuition refund upon presenting official Korean diplomatic mission visa refusal notice.',
      deadlinesDescription || 'Written notice required 7 days before semester commencement.',
      refundProcessingTime || '14 to 21 business days via international telegraphic wire.',
      now,
      verifier,
      now
    );

    logAudit(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_REFUND_POLICY', 'university', id, `Updated refund policy for ${id}`);
    res.json({ ok: true });
  });

  app.put('/api/universities/:id/bank-details', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { accountHolder, bankName, branchName, accountNumber, swiftCode, currency, paymentInstructions, isVirtualAccountSupported } = req.body;
    const now = new Date().toISOString();
    const verifier = req.user!.name;
    const bankId = 'BNK-' + id.replace('UNI-', '') + '-01';

    db.prepare(`
      INSERT OR REPLACE INTO university_bank_accounts (
        id, university_id, account_holder, bank_name, branch_name, account_number,
        swift_code, currency, payment_instructions, is_virtual_account_supported,
        verification_status, last_verified_at, verified_by, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Verified', ?, ?, ?)
    `).run(
      bankId,
      id,
      accountHolder || 'Office of International Affairs',
      bankName || 'Shinhan Bank',
      branchName || 'Main Campus Branch',
      accountNumber || 'Virtual Account Issued Upon Acceptance',
      swiftCode || 'SHBKKRSE',
      currency || 'KRW',
      paymentInstructions || 'Include student ID and name in wire memo. Sender pays all transfer fees (OUR mode).',
      isVirtualAccountSupported ? 1 : 0,
      now,
      verifier,
      now
    );

    logAudit(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_BANK_DETAILS', 'university', id, `Updated institutional bank remittance details for ${id}`);
    res.json({ ok: true });
  });

  app.post('/api/universities/:id/programs', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { name, code, degreeLevel, duration, tuitionFeeKrw, tuitionFeeUsd, applicationFeeKrw, requirements, languageOfInstruction, intakeTerms } = req.body;
    if (!name || !degreeLevel) {
      return res.status(400).json({ error: 'Program name and degree level are required.' });
    }

    const programId = 'PRG-' + id.replace('UNI-', '') + '-' + Date.now().toString(36).toUpperCase().slice(-5);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO university_programs (
        id, university_id, name, code, degree_level, duration, tuition_fee_krw, tuition_fee_usd,
        application_fee_krw, requirements, language_of_instruction, intake_terms, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      programId,
      id,
      name.trim(),
      code?.trim() || 'PROG',
      degreeLevel,
      duration?.trim() || '4 Years (8 Semesters)',
      Number(tuitionFeeKrw) || 0,
      Number(tuitionFeeUsd) || 0,
      Number(applicationFeeKrw) || 100000,
      requirements?.trim() || 'High school diploma, TOPIK Level 3 or IELTS 6.0',
      languageOfInstruction?.trim() || 'Korean',
      JSON.stringify(intakeTerms || ['Spring 2027', 'Fall 2027']),
      now,
      now
    );

    logAudit(req.user!.id, req.user!.name, req.user!.role, 'CREATE_PROGRAM', 'program', programId, `Added program "${name}" to ${id}`);
    res.json({ ok: true, id: programId });
  });

  app.put('/api/universities/:id/programs/:programId', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id, programId } = req.params;
    const { name, code, degreeLevel, duration, tuitionFeeKrw, tuitionFeeUsd, applicationFeeKrw, requirements, languageOfInstruction, intakeTerms, isActive } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE university_programs SET
        name = COALESCE(?, name),
        code = COALESCE(?, code),
        degree_level = COALESCE(?, degree_level),
        duration = COALESCE(?, duration),
        tuition_fee_krw = COALESCE(?, tuition_fee_krw),
        tuition_fee_usd = COALESCE(?, tuition_fee_usd),
        application_fee_krw = COALESCE(?, application_fee_krw),
        requirements = COALESCE(?, requirements),
        language_of_instruction = COALESCE(?, language_of_instruction),
        intake_terms = COALESCE(?, intake_terms),
        is_active = COALESCE(?, is_active),
        updated_at = ?
      WHERE id = ? AND university_id = ?
    `).run(
      name,
      code,
      degreeLevel,
      duration,
      tuitionFeeKrw,
      tuitionFeeUsd,
      applicationFeeKrw,
      requirements,
      languageOfInstruction,
      intakeTerms ? JSON.stringify(intakeTerms) : null,
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      now,
      programId,
      id
    );

    logAudit(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_PROGRAM', 'program', programId, `Updated program ${programId} for ${id}`);
    res.json({ ok: true });
  });

  app.delete('/api/universities/:id/programs/:programId', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id, programId } = req.params;
    db.prepare('DELETE FROM university_programs WHERE id = ? AND university_id = ?').run(programId, id);
    logAudit(req.user!.id, req.user!.name, req.user!.role, 'DELETE_PROGRAM', 'program', programId, `Removed program ${programId} from ${id}`);
    res.json({ ok: true });
  });

  app.post('/api/universities/:id/documents', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { title, category, fileUrl, fileSize, fileFormat, intakeTerm } = req.body;
    if (!title || !fileUrl) {
      return res.status(400).json({ error: 'Document title and file URL are required.' });
    }

    const docId = 'DOC-' + id.replace('UNI-', '') + '-' + Date.now().toString(36).toUpperCase().slice(-5);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO university_documents (
        id, university_id, title, category, file_url, file_size, file_format, intake_term, verification_status, uploaded_at, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Verified', ?, ?)
    `).run(
      docId,
      id,
      title.trim(),
      category || 'Admission Guidelines',
      fileUrl.trim(),
      fileSize?.trim() || '1.5 MB',
      fileFormat?.trim() || 'PDF',
      intakeTerm?.trim() || 'Spring 2027',
      now,
      req.user!.name
    );

    logAudit(req.user!.id, req.user!.name, req.user!.role, 'UPLOAD_UNIVERSITY_DOC', 'document', docId, `Added document "${title}" to ${id}`);
    res.json({ ok: true, id: docId });
  });

  app.delete('/api/universities/:id/documents/:docId', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id, docId } = req.params;
    db.prepare('DELETE FROM university_documents WHERE id = ? AND university_id = ?').run(docId, id);
    logAudit(req.user!.id, req.user!.name, req.user!.role, 'DELETE_UNIVERSITY_DOC', 'document', docId, `Deleted document ${docId} from ${id}`);
    res.json({ ok: true });
  });

  app.post('/api/intakes', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { universityId, term, academicYear, applicationStart, applicationDeadline, quota, requiredDocuments, interviewDates, resultAnnouncementDate, tuitionPaymentDeadline, documentDeadline, visaSubmissionDeadline, classesStartDate } = req.body;
    if (!universityId || !term || !applicationDeadline) {
      return res.status(400).json({ error: 'University, intake term, and application deadline are required.' });
    }

    const id = 'INT-' + universityId.replace('UNI-', '') + '-' + term.replace(/\s+/g, '').toUpperCase();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO admission_intakes (
        id, university_id, term, academic_year, application_start, application_deadline, quota, status, required_documents,
        interview_dates, result_announcement_date, tuition_payment_deadline, document_deadline, visa_submission_deadline, classes_start_date, verification_status, last_verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?, ?, ?, ?, ?, ?, 'Verified', ?)
    `).run(
      id,
      universityId,
      term,
      Number(academicYear) || 2027,
      applicationStart || new Date().toISOString().slice(0, 10),
      applicationDeadline,
      Number(quota) || 30,
      JSON.stringify(requiredDocuments || ['Valid Passport Copy', 'Apostilled Diploma', 'Bank Balance Certificate']),
      interviewDates || 'To be scheduled',
      resultAnnouncementDate || null,
      tuitionPaymentDeadline || null,
      documentDeadline || null,
      visaSubmissionDeadline || null,
      classesStartDate || null,
      now
    );

    logAudit(req.user!.id, req.user!.name, req.user!.role, 'CREATE_INTAKE', 'intake', id, `Added intake ${term} for ${universityId} (Quota: ${quota})`);
    res.json({ ok: true, id });
  });

  app.put('/api/intakes/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { term, academicYear, applicationStart, applicationDeadline, quota, status, requiredDocuments, interviewDates, resultAnnouncementDate, tuitionPaymentDeadline, documentDeadline, visaSubmissionDeadline, classesStartDate } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE admission_intakes SET
        term = COALESCE(?, term),
        academic_year = COALESCE(?, academic_year),
        application_start = COALESCE(?, application_start),
        application_deadline = COALESCE(?, application_deadline),
        quota = COALESCE(?, quota),
        status = COALESCE(?, status),
        required_documents = COALESCE(?, required_documents),
        interview_dates = COALESCE(?, interview_dates),
        result_announcement_date = COALESCE(?, result_announcement_date),
        tuition_payment_deadline = COALESCE(?, tuition_payment_deadline),
        document_deadline = COALESCE(?, document_deadline),
        visa_submission_deadline = COALESCE(?, visa_submission_deadline),
        classes_start_date = COALESCE(?, classes_start_date),
        verification_status = 'Verified',
        last_verified_at = ?
      WHERE id = ?
    `).run(
      term,
      academicYear,
      applicationStart,
      applicationDeadline,
      quota,
      status,
      requiredDocuments ? JSON.stringify(requiredDocuments) : null,
      interviewDates,
      resultAnnouncementDate,
      tuitionPaymentDeadline,
      documentDeadline,
      visaSubmissionDeadline,
      classesStartDate,
      now,
      id
    );

    logAudit(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_INTAKE', 'intake', id, `Updated intake schedule/deadlines for ${id}`);
    res.json({ ok: true });
  });

  // ==========================================
  // INTAKE PROJECTS & WORKSPACE API
  // ==========================================
  const VALID_INTAKE_WORKFLOW_STAGES = [
    'Student Registered',
    'Document Collection',
    'Document Verification',
    'Notarization / Apostille',
    'Application Preparation',
    'Ready for Submission',
    'Submitted to University',
    'Additional Documents Requested',
    'Admission Result Received',
    'Tuition Payment',
    'CoA Received',
  ] as const;

  const VALID_INTAKE_DOC_STATUSES = [
    'Missing',
    'Incorrect',
    'Pending',
    'Collected',
    'Notarized',
    'Apostilled',
    'Verified',
  ] as const;

  function computeDocumentReadiness(docs: any[]) {
    const required = (docs || []).filter((d) => d.required !== false);
    const totalRequired = required.length || (docs || []).length;
    const verifiedCount = (required.length > 0 ? required : docs || []).filter((d) => d.status === 'Verified').length;
    const missingCount = (docs || []).filter((d) => d.status === 'Missing').length;
    const incorrectCount = (docs || []).filter((d) => d.status === 'Incorrect').length;
    const pendingCount = (docs || []).filter((d) => d.status === 'Pending' || d.status === 'Collected').length;
    const notarizedCount = (docs || []).filter((d) => d.notarized || d.status === 'Notarized' || d.status === 'Apostilled' || d.status === 'Verified').length;
    const apostilledCount = (docs || []).filter((d) => d.apostilled || d.status === 'Apostilled' || (String(d.name || '').toLowerCase().includes('apostille') && d.status === 'Verified')).length;
    const readinessPercentage = totalRequired > 0 ? Math.round((verifiedCount / totalRequired) * 100) : 0;
    const isSubmissionReady = totalRequired > 0 && verifiedCount === totalRequired && missingCount === 0 && incorrectCount === 0;
    return {
      totalDocs: (docs || []).length,
      totalRequired,
      verifiedCount,
      missingCount,
      incorrectCount,
      pendingCount,
      notarizedCount,
      apostilledCount,
      readinessPercentage,
      isSubmissionReady,
    };
  }

  app.get('/api/projects', (_req: AuthenticatedRequest, res: Response) => {
    const projects = db.prepare(`
      SELECT 
        p.*,
        u.name_en as university_name,
        m.name as manager_name,
        (
          SELECT COUNT(DISTINCT student_id) FROM (
            SELECT id as student_id FROM student_applications WHERE project_id = p.id
            UNION
            SELECT student_id FROM intake_student_applications WHERE project_id = p.id
          )
        ) as student_count
      FROM intake_projects p
      JOIN universities u ON p.university_id = u.id
      JOIN users m ON p.manager_id = m.id
      ORDER BY p.deadline ASC
    `).all() as any[];

    const consultants = db.prepare('SELECT project_id, user_id FROM project_consultants').all() as any[];
    const consultantMap = new Map<string, string[]>();
    for (const c of consultants) {
      if (!consultantMap.has(c.project_id)) consultantMap.set(c.project_id, []);
      consultantMap.get(c.project_id)!.push(c.user_id);
    }

    const mapped = projects.map((p) => ({
      id: p.id,
      name: p.name,
      universityId: p.university_id,
      universityName: p.university_name,
      intakeId: p.intake_id || null,
      intakeTerm: p.intake_term,
      academicYear: p.academic_year,
      managerId: p.manager_id,
      managerName: p.manager_name,
      assignedConsultantIds: consultantMap.get(p.id) || [],
      startDate: p.start_date,
      deadline: p.deadline,
      status: p.status,
      targetQuota: p.target_quota,
      studentCount: p.student_count || 0,
      progressPercentage: p.progress_percentage || 0,
      notes: p.notes,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    res.json(mapped);
  });

  app.post('/api/projects', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { name, universityId, intakeTerm, academicYear, deadline, targetQuota, assignedConsultantIds, notes } = req.body;
    if (!name || !universityId || !deadline) {
      return res.status(400).json({ error: 'Project name, university, and deadline are required.' });
    }

    const id = 'PRJ-' + universityId.replace('UNI-', '') + '-' + Date.now().toString(36).toUpperCase().slice(-4);
    const now = new Date().toISOString();
    const resolvedTerm = intakeTerm || 'Spring 2027';
    const matchedIntake = db.prepare(
      'SELECT id FROM admission_intakes WHERE university_id = ? AND term = ? LIMIT 1'
    ).get(universityId, resolvedTerm) as { id: string } | undefined;

    db.prepare(`
      INSERT INTO intake_projects (id, name, university_id, intake_id, intake_term, academic_year, manager_id, status, start_date, deadline, target_quota, progress_percentage, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, 0, ?, ?, ?)
    `).run(
      id,
      name.trim(),
      universityId,
      matchedIntake?.id || null,
      resolvedTerm,
      Number(academicYear) || 2027,
      req.user!.id,
      now.slice(0, 10),
      deadline,
      Number(targetQuota) || 25,
      notes || '',
      now,
      now
    );

    if (Array.isArray(assignedConsultantIds)) {
      const insertConsultant = db.prepare('INSERT OR IGNORE INTO project_consultants (project_id, user_id, assigned_at) VALUES (?, ?, ?)');
      for (const uid of assignedConsultantIds) {
        insertConsultant.run(id, uid, now);
      }
    }

    logAudit(req.user!.id, req.user!.name, req.user!.role, 'CREATE_PROJECT', 'project', id, `Created intake project "${name}"`);
    res.json({ ok: true, id });
  });

  app.get('/api/projects/:id/workspace', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const isConsultant = req.user?.role === 'Consultant';
    const userId = req.user!.id;

    // Ensure any students directly on student_applications.project_id are synced cleanly
    syncIntakeStudentApplications();

    const p = db.prepare(`
      SELECT p.*, u.name_en as university_name, m.name as manager_name, m.email as manager_email,
             m.title as manager_title, m.avatar as manager_avatar
      FROM intake_projects p
      JOIN universities u ON p.university_id = u.id
      JOIN users m ON p.manager_id = m.id
      WHERE p.id = ?
    `).get(id) as any;

    if (!p) {
      return res.status(404).json({ error: 'Intake campaign not found.' });
    }

    // Assigned consultants
    const consultantRows = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.title, u.avatar, u.phone, COALESCE(u.team, 'Admission Team') as team
      FROM project_consultants pc
      JOIN users u ON pc.user_id = u.id
      WHERE pc.project_id = ?
      ORDER BY u.name ASC
    `).all(id) as any[];

    // Matched Admission Intake schedule
    const intakeRow = db.prepare(`
      SELECT * FROM admission_intakes
      WHERE id = ? OR (university_id = ? AND term = ?)
      ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END
      LIMIT 1
    `).get(p.intake_id || '', p.university_id, p.intake_term, p.intake_id || '') as any;

    const admissionIntake = intakeRow
      ? {
          id: intakeRow.id,
          universityId: intakeRow.university_id,
          term: intakeRow.term,
          academicYear: intakeRow.academic_year,
          applicationStart: intakeRow.application_start,
          applicationDeadline: intakeRow.application_deadline,
          quota: intakeRow.quota,
          status: intakeRow.status,
          requiredDocuments: JSON.parse(intakeRow.required_documents || '[]'),
          interviewDates: intakeRow.interview_dates,
          resultAnnouncementDate: intakeRow.result_announcement_date,
          tuitionPaymentDeadline: intakeRow.tuition_payment_deadline,
          documentDeadline: intakeRow.document_deadline,
          visaSubmissionDeadline: intakeRow.visa_submission_deadline,
          classesStartDate: intakeRow.classes_start_date,
          verificationStatus: intakeRow.verification_status || 'Verified',
          lastVerifiedAt: intakeRow.last_verified_at,
        }
      : null;

    // University details (only real DB rows)
    const uniRow = db.prepare('SELECT * FROM universities WHERE id = ?').get(p.university_id) as any;
    const programs = db.prepare('SELECT * FROM university_programs WHERE university_id = ? AND is_active = 1 ORDER BY degree_level ASC, name ASC').all(p.university_id) as any[];
    const refundPolicy = db.prepare('SELECT * FROM university_refund_policies WHERE university_id = ?').get(p.university_id) as any;
    const bankDetails = db.prepare('SELECT * FROM university_bank_accounts WHERE university_id = ?').get(p.university_id) as any;
    const uniDocs = db.prepare('SELECT * FROM university_documents WHERE university_id = ? ORDER BY uploaded_at DESC').all(p.university_id) as any[];

    const university = uniRow
      ? {
          id: uniRow.id,
          nameEn: uniRow.name_en,
          nameKo: uniRow.name_ko,
          city: uniRow.city,
          ranking: uniRow.ranking,
          websiteUrl: uniRow.website_url,
          topikRequirement: uniRow.topik_requirement,
          ieltsRequirement: uniRow.ielts_requirement,
          bankBalanceUsd: uniRow.bank_balance_usd,
          accredited: Boolean(uniRow.accredited),
          notes: uniRow.notes,
          verificationStatus: uniRow.verification_status || 'Verified',
          lastVerifiedAt: uniRow.last_verified_at || uniRow.updated_at,
          verifiedBy: uniRow.verified_by,
          programs: programs.map((pr) => ({
            id: pr.id,
            universityId: pr.university_id,
            name: pr.name,
            code: pr.code,
            degreeLevel: pr.degree_level,
            duration: pr.duration,
            tuitionFeeKrw: pr.tuition_fee_krw,
            tuitionFeeUsd: pr.tuition_fee_usd,
            applicationFeeKrw: pr.application_fee_krw,
            requirements: pr.requirements,
            languageOfInstruction: pr.language_of_instruction,
            intakeTerms: JSON.parse(pr.intake_terms || '[]'),
            isActive: Boolean(pr.is_active),
            updatedAt: pr.updated_at,
          })),
          refundPolicy: refundPolicy
            ? {
                universityId: refundPolicy.university_id,
                appFeeRefundable: Boolean(refundPolicy.app_fee_refundable),
                appFeeConditions: refundPolicy.app_fee_conditions,
                tuitionRefundPolicy: refundPolicy.tuition_refund_policy,
                visaRejectionRefund: refundPolicy.visa_rejection_refund,
                deadlinesDescription: refundPolicy.deadlines_description,
                refundProcessingTime: refundPolicy.refund_processing_time,
                verificationStatus: refundPolicy.verification_status || 'Verified',
                lastVerifiedAt: refundPolicy.last_verified_at,
                verifiedBy: refundPolicy.verified_by,
                updatedAt: refundPolicy.updated_at,
              }
            : null,
          bankDetails: bankDetails
            ? {
                id: bankDetails.id,
                universityId: bankDetails.university_id,
                accountHolder: bankDetails.account_holder,
                bankName: bankDetails.bank_name,
                branchName: bankDetails.branch_name,
                accountNumber: bankDetails.account_number,
                swiftCode: bankDetails.swift_code,
                currency: bankDetails.currency,
                paymentInstructions: bankDetails.payment_instructions,
                isVirtualAccountSupported: Boolean(bankDetails.is_virtual_account_supported),
                verificationStatus: bankDetails.verification_status || 'Verified',
                lastVerifiedAt: bankDetails.last_verified_at,
                verifiedBy: bankDetails.verified_by,
                updatedAt: bankDetails.updated_at,
              }
            : null,
          documents: uniDocs.map((d) => ({
            id: d.id,
            universityId: d.university_id,
            title: d.title,
            category: d.category,
            fileUrl: d.file_url,
            fileSize: d.file_size,
            fileFormat: d.file_format,
            intakeTerm: d.intake_term,
            verificationStatus: d.verification_status,
            uploadedAt: d.uploaded_at,
            uploadedBy: d.uploaded_by,
          })),
        }
      : null;

    // Enrolled students via intake_student_applications (RBAC filtered for Consultant)
    let studentQuery = `
      SELECT
        isa.id as intake_app_id,
        isa.project_id as app_project_id,
        isa.student_id,
        isa.assigned_consultant_id as isa_consultant_id,
        isa.program_id as isa_program_id,
        isa.program_name as isa_program_name,
        isa.workflow_stage,
        isa.stage_status,
        isa.workflow_dates_json,
        isa.stage_history_json,
        isa.documents_json,
        isa.stage_notes,
        isa.submitted_by,
        isa.submitted_at,
        isa.completed_by,
        isa.completed_at,
        isa.created_at as enrolled_at,
        isa.updated_at as app_updated_at,
        s.*,
        u.name_en as university_name,
        proj.name as primary_project_name,
        c.name as consultant_name,
        c.avatar as consultant_avatar,
        (SELECT COUNT(*) FROM document_handovers h WHERE h.student_id = s.id) as handover_count
      FROM intake_student_applications isa
      JOIN student_applications s ON isa.student_id = s.id
      JOIN universities u ON s.applied_university_id = u.id
      JOIN intake_projects proj ON s.project_id = proj.id
      JOIN users c ON COALESCE(isa.assigned_consultant_id, s.assigned_consultant_id) = c.id
      WHERE isa.project_id = ?
    `;
    const stuParams: any[] = [id];
    if (isConsultant) {
      studentQuery += ' AND (s.assigned_consultant_id = ? OR isa.assigned_consultant_id = ?)';
      stuParams.push(userId, userId);
    }
    studentQuery += ' ORDER BY isa.updated_at DESC';

    const rawApplications = db.prepare(studentQuery).all(...stuParams) as any[];
    const applications = rawApplications.map((row) => {
      const intakeDocs = JSON.parse(row.documents_json || '[]');
      const fallbackChecklist = JSON.parse(row.checklist_json || '[]');
      const resolvedDocs =
        intakeDocs.length > 0
          ? intakeDocs
          : buildIntakeDocumentsForStudent(admissionIntake?.requiredDocuments || [], fallbackChecklist);
      const readiness = computeDocumentReadiness(resolvedDocs);
      const stageIndex = VALID_INTAKE_WORKFLOW_STAGES.indexOf(row.workflow_stage);
      const workflowProgress =
        stageIndex >= 0
          ? Math.round(((stageIndex + 1) / VALID_INTAKE_WORKFLOW_STAGES.length) * 100)
          : 9;

      return {
        intakeAppId: row.intake_app_id,
        projectId: id,
        studentId: row.student_id,
        isPrimaryProject: row.project_id === id,
        workflowStage: row.workflow_stage,
        stageStatus: row.stage_status,
        workflowProgress,
        workflowDates: JSON.parse(row.workflow_dates_json || '{}'),
        stageHistory: JSON.parse(row.stage_history_json || '[]'),
        intakeDocuments: resolvedDocs,
        readiness,
        stageNotes: row.stage_notes || '',
        submittedBy: row.submitted_by || null,
        submittedAt: row.submitted_at || null,
        completedBy: row.completed_by || null,
        completedAt: row.completed_at || null,
        enrolledAt: row.enrolled_at,
        appUpdatedAt: row.app_updated_at,
        handoverCount: row.handover_count || 0,
        student: {
          id: row.id,
          fullName: row.full_name,
          passportNumber: row.passport_number,
          dateOfBirth: row.date_of_birth,
          nationality: row.nationality,
          contactEmail: row.contact_email,
          contactPhone: row.contact_phone,
          appliedUniversityId: row.applied_university_id,
          appliedUniversityName: row.university_name,
          projectId: row.project_id,
          projectName: row.primary_project_name,
          department: row.department,
          major: row.major,
          degreeLevel: row.degree_level,
          intakeTerm: row.intake_term,
          programId: row.isa_program_id || row.program_id,
          programName: row.isa_program_name || row.program_name,
          visaStage: row.visa_stage,
          visaType: row.visa_type,
          assignedConsultantId: row.isa_consultant_id || row.assigned_consultant_id,
          assignedConsultantName: row.consultant_name,
          submissionDate: row.submission_date,
          admissionResult: row.admission_result,
          certificateOfAdmissionNo: row.certificate_of_admission_no,
          tuitionFeePaid: Boolean(row.tuition_fee_paid),
          courierName: row.courier_name,
          courierTrackingNumber: row.courier_tracking_number,
          courierDispatchDate: row.courier_dispatch_date,
          documentChecklist: fallbackChecklist,
          notes: row.notes,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
      };
    });

    // Existing students eligible to be added (not already assigned to this intake)
    let availQuery = `
      SELECT s.id, s.full_name, s.passport_number, s.major, s.degree_level, s.intake_term,
             s.assigned_consultant_id, c.name as consultant_name, u.name_en as university_name
      FROM student_applications s
      JOIN users c ON s.assigned_consultant_id = c.id
      LEFT JOIN universities u ON s.applied_university_id = u.id
      WHERE s.id NOT IN (SELECT student_id FROM intake_student_applications WHERE project_id = ?)
    `;
    const availParams: any[] = [id];
    if (isConsultant) {
      availQuery += ' AND s.assigned_consultant_id = ?';
      availParams.push(userId);
    }
    availQuery += ' ORDER BY s.full_name ASC';
    const availableStudents = (db.prepare(availQuery).all(...availParams) as any[]).map((st) => ({
      id: st.id,
      fullName: st.full_name,
      passportNumber: st.passport_number,
      major: st.major,
      degreeLevel: st.degree_level,
      intakeTerm: st.intake_term,
      assignedConsultantId: st.assigned_consultant_id,
      consultantName: st.consultant_name,
      universityName: st.university_name,
    }));

    // Tasks linked to this intake project (respecting RBAC)
    let taskQuery = `
      SELECT t.*, s.full_name as student_name, u.name_en as university_name,
             a.name as assigned_to_name, a.avatar as assignee_avatar, a.title as assignee_title,
             COALESCE(t.team, a.team, 'Admission Team') as computed_team, b.name as assigned_by_name
      FROM tasks t
      LEFT JOIN student_applications s ON t.student_id = s.id
      LEFT JOIN universities u ON t.university_id = u.id
      LEFT JOIN users a ON t.assigned_to_id = a.id
      LEFT JOIN users b ON t.assigned_by_id = b.id
      WHERE t.project_id = ?
    `;
    const taskParams: any[] = [id];
    if (isConsultant) {
      taskQuery += ' AND (t.assigned_to_id = ? OR t.team = (SELECT team FROM users WHERE id = ?) OR t.assigned_to_id IS NULL)';
      taskParams.push(userId, userId);
    }
    taskQuery += ' ORDER BY t.status ASC, t.deadline ASC';
    const projectTasks = (db.prepare(taskQuery).all(...taskParams) as any[]).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      category: t.category,
      priority: t.priority,
      taskDate: t.task_date,
      deadline: t.deadline,
      scheduledTime: t.scheduled_time,
      status: t.status,
      createdAt: t.created_at,
      completedAt: t.completed_at,
      notes: t.notes || '',
      lastUpdated: t.last_updated,
      syncState: t.sync_state,
      sheetRowNumber: t.sheet_row_number,
      projectId: t.project_id,
      projectName: p.name,
      studentId: t.student_id,
      studentName: t.student_name,
      universityId: t.university_id,
      universityName: t.university_name,
      assignedToId: t.assigned_to_id,
      assignedToName: t.assigned_to_name,
      assigneeAvatar: t.assignee_avatar,
      assigneeTitle: t.assignee_title,
      team: t.computed_team,
      assignedById: t.assigned_by_id,
      assignedByName: t.assigned_by_name,
      subtasks: JSON.parse(t.subtasks_json || '[]'),
    }));

    // Activity history across project, intake schedule, enrolled students, linked tasks, and handovers
    const enrolledStudentIds = applications.map((a) => a.studentId);
    const linkedTaskIds = projectTasks.map((t) => t.id);

    const allCandidateLogs = db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY timestamp DESC
      LIMIT 400
    `).all() as any[];

    const studentSet = new Set(enrolledStudentIds);
    const taskSet = new Set(linkedTaskIds);
    const handoverIdsForStudents = new Set<string>();
    if (enrolledStudentIds.length > 0) {
      const hRows = db.prepare(`SELECT id, student_id FROM document_handovers`).all() as any[];
      for (const h of hRows) {
        if (studentSet.has(h.student_id)) handoverIdsForStudents.add(h.id);
      }
    }

    const activities = allCandidateLogs.filter((log) => {
      if (log.entity_type === 'project' && log.entity_id === id) return true;
      if (admissionIntake && log.entity_type === 'intake' && log.entity_id === admissionIntake.id) return true;
      if (log.entity_type === 'student' && studentSet.has(log.entity_id)) return true;
      if (log.entity_type === 'task' && taskSet.has(log.entity_id)) return true;
      if (log.entity_type === 'handover' && handoverIdsForStudents.has(log.entity_id)) return true;
      return false;
    }).map((l) => ({
      id: l.id,
      actorId: l.actor_id,
      actorName: l.actor_name,
      actorRole: l.actor_role,
      action: l.action,
      entityType: l.entity_type,
      entityId: l.entity_id,
      details: l.details,
      timestamp: l.timestamp,
    }));

    // Total quota & enrollment summary (full cohort counts even when consultant is viewing filtered subset)
    const totalApplicantRow = db.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN workflow_stage IN ('Admission Result Received', 'Tuition Payment', 'CoA Received') OR stage_status = 'Completed' THEN 1 ELSE 0 END) as enrolled_count,
             SUM(CASE WHEN workflow_stage IN ('Submitted to University', 'Additional Documents Requested', 'Admission Result Received', 'Tuition Payment', 'CoA Received') THEN 1 ELSE 0 END) as submitted_count
      FROM intake_student_applications
      WHERE project_id = ?
    `).get(id) as any;

    const todayStr = new Date().toISOString().slice(0, 10);
    const pendingTaskCount = projectTasks.filter((t) => t.status === 'Pending').length;
    const overdueTaskCount = projectTasks.filter((t) => t.status === 'Pending' && t.deadline < todayStr).length;
    const avgProgress =
      applications.length > 0
        ? Math.round(applications.reduce((acc, a) => acc + a.workflowProgress, 0) / applications.length)
        : p.progress_percentage || 0;

    res.json({
      project: {
        id: p.id,
        name: p.name,
        universityId: p.university_id,
        universityName: p.university_name,
        intakeId: admissionIntake?.id || p.intake_id || null,
        intakeTerm: p.intake_term,
        academicYear: p.academic_year,
        managerId: p.manager_id,
        managerName: p.manager_name,
        managerEmail: p.manager_email,
        managerTitle: p.manager_title,
        managerAvatar: p.manager_avatar,
        assignedConsultantIds: consultantRows.map((c) => c.id),
        consultants: consultantRows,
        startDate: p.start_date,
        deadline: p.deadline,
        status: p.status,
        targetQuota: p.target_quota,
        studentCount: totalApplicantRow?.total || 0,
        enrolledCount: totalApplicantRow?.enrolled_count || 0,
        submittedCount: totalApplicantRow?.submitted_count || 0,
        availableSeats: Math.max(0, (p.target_quota || 0) - (totalApplicantRow?.total || 0)),
        progressPercentage: avgProgress,
        notes: p.notes || '',
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      },
      admissionIntake,
      university,
      applications,
      availableStudents,
      tasks: projectTasks,
      taskSummary: {
        total: projectTasks.length,
        pending: pendingTaskCount,
        completed: projectTasks.length - pendingTaskCount,
        overdue: overdueTaskCount,
      },
      activities,
    });
  });

  app.put('/api/projects/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM intake_projects WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Intake campaign not found.' });
    }

    const { name, status, deadline, startDate, targetQuota, notes, intakeTerm, assignedConsultantIds } = req.body;
    const allowedStatuses = ['Planning', 'Active', 'Under Review', 'Completed', 'Archived'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid intake status value.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE intake_projects SET
        name = COALESCE(?, name),
        status = COALESCE(?, status),
        deadline = COALESCE(?, deadline),
        start_date = COALESCE(?, start_date),
        target_quota = COALESCE(?, target_quota),
        notes = COALESCE(?, notes),
        intake_term = COALESCE(?, intake_term),
        updated_at = ?
      WHERE id = ?
    `).run(
      name ? String(name).trim() : null,
      status || null,
      deadline || null,
      startDate || null,
      targetQuota !== undefined ? Number(targetQuota) : null,
      notes !== undefined ? String(notes).trim() : null,
      intakeTerm || null,
      now,
      id
    );

    if (Array.isArray(assignedConsultantIds)) {
      const tx = db.transaction((ids: string[]) => {
        db.prepare('DELETE FROM project_consultants WHERE project_id = ?').run(id);
        const ins = db.prepare('INSERT OR IGNORE INTO project_consultants (project_id, user_id, assigned_at) VALUES (?, ?, ?)');
        for (const uid of ids) {
          ins.run(id, uid, now);
        }
      });
      tx(assignedConsultantIds);
      logAudit(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_PROJECT_TEAM', 'project', id, `Updated consultant team assignments (${assignedConsultantIds.length} member(s))`);
    }

    if (deadline && deadline !== existing.deadline) {
      logAudit(req.user!.id, req.user!.name, req.user!.role, 'DEADLINE_CHANGED', 'project', id, `Application deadline updated from ${existing.deadline} to ${deadline}`);
    }
    if (status && status !== existing.status) {
      logAudit(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_PROJECT_STATUS', 'project', id, `Changed intake status from "${existing.status}" to "${status}"`);
    } else if (!deadline || deadline === existing.deadline) {
      if (!Array.isArray(assignedConsultantIds)) {
        logAudit(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_PROJECT', 'project', id, `Updated intake campaign configuration for ${id}`);
      }
    }

    res.json({ ok: true });
  });

  app.post('/api/projects/:id/students', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { studentId, assignedConsultantId, programId, programName, notes } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required.' });
    }

    const project = db.prepare('SELECT * FROM intake_projects WHERE id = ?').get(id) as any;
    if (!project) {
      return res.status(404).json({ error: 'Intake campaign not found.' });
    }

    const student = db.prepare('SELECT * FROM student_applications WHERE id = ?').get(studentId) as any;
    if (!student) {
      return res.status(404).json({ error: 'Student application not found.' });
    }

    if (req.user?.role === 'Consultant' && student.assigned_consultant_id !== req.user.id) {
      return res.status(403).json({ error: 'You are only authorized to assign students on your own roster.' });
    }

    // Strict duplicate check
    const existingApp = db.prepare('SELECT id FROM intake_student_applications WHERE project_id = ? AND student_id = ?').get(id, studentId);
    if (existingApp) {
      return res.status(409).json({
        error: 'Duplicate assignment prevented',
        message: `${student.full_name} is already assigned to this intake campaign.`,
      });
    }

    const intakeRow = db.prepare(
      'SELECT required_documents FROM admission_intakes WHERE id = ? OR (university_id = ? AND term = ?) LIMIT 1'
    ).get(project.intake_id || '', project.university_id, project.intake_term) as any;

    const reqDocs = intakeRow ? JSON.parse(intakeRow.required_documents || '[]') : [];
    const existingChecklist = JSON.parse(student.checklist_json || '[]');
    const docs = buildIntakeDocumentsForStudent(reqDocs, existingChecklist);

    const now = new Date().toISOString();
    const todayStr = now.slice(0, 10);
    const appId = `ISA-${id}-${studentId}`;
    const consultantId = assignedConsultantId || student.assigned_consultant_id;

    const history = [
      {
        id: 'STG-' + Date.now().toString(36),
        stage: 'Student Registered',
        status: 'In Progress',
        date: todayStr,
        actorName: req.user!.name,
        notes: notes?.trim() || `Assigned existing student ${student.full_name} to ${project.name}`,
        timestamp: now,
      },
    ];

    db.prepare(`
      INSERT INTO intake_student_applications (
        id, project_id, student_id, assigned_consultant_id, program_id, program_name,
        workflow_stage, stage_status, workflow_dates_json, stage_history_json,
        documents_json, stage_notes, added_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'Student Registered', 'In Progress', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      appId,
      id,
      studentId,
      consultantId,
      programId || student.program_id || null,
      programName || student.program_name || null,
      JSON.stringify({ registeredDate: todayStr }),
      JSON.stringify(history),
      JSON.stringify(docs),
      notes?.trim() || '',
      req.user!.id,
      now,
      now
    );

    logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'ASSIGN_STUDENT_TO_INTAKE',
      'project',
      id,
      `Assigned ${student.full_name} (${student.id}) to intake ${project.name}`
    );

    res.status(201).json({ ok: true, id: appId });
  });

  app.delete('/api/projects/:id/students/:studentId', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id, studentId } = req.params;
    const student = db.prepare('SELECT full_name, project_id FROM student_applications WHERE id = ?').get(studentId) as any;
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    if (student.project_id === id) {
      return res.status(400).json({
        error: 'Cannot remove primary cohort student directly; reassign their primary campaign from Student Dossiers if moving cohorts.',
      });
    }
    db.prepare('DELETE FROM intake_student_applications WHERE project_id = ? AND student_id = ?').run(id, studentId);
    logAudit(req.user!.id, req.user!.name, req.user!.role, 'REMOVE_STUDENT_FROM_INTAKE', 'project', id, `Removed ${student.full_name} (${studentId}) from intake campaign ${id}`);
    res.json({ ok: true });
  });

  app.put('/api/projects/:id/students/:studentId/workflow', (req: AuthenticatedRequest, res: Response) => {
    const { id, studentId } = req.params;
    const {
      workflowStage,
      stageStatus,
      stageDate,
      remarks,
      admissionResult,
      tuitionFeePaid,
      certificateOfAdmissionNo,
      assignedConsultantId,
    } = req.body;

    if (!workflowStage || !(VALID_INTAKE_WORKFLOW_STAGES as readonly string[]).includes(workflowStage)) {
      return res.status(400).json({ error: 'A valid workflow stage is required.' });
    }

    const appRow = db.prepare(`
      SELECT isa.*, s.full_name, s.assigned_consultant_id as stu_consultant_id
      FROM intake_student_applications isa
      JOIN student_applications s ON isa.student_id = s.id
      WHERE isa.project_id = ? AND isa.student_id = ?
    `).get(id, studentId) as any;

    if (!appRow) {
      return res.status(404).json({ error: 'Student application record not found in this intake.' });
    }

    if (
      req.user?.role === 'Consultant' &&
      appRow.stu_consultant_id !== req.user.id &&
      appRow.assigned_consultant_id !== req.user.id
    ) {
      return res.status(403).json({ error: 'You are only authorized to record workflow progress for students assigned to you.' });
    }

    const now = new Date().toISOString();
    const effectiveDate = stageDate || now.slice(0, 10);
    const dates = JSON.parse(appRow.workflow_dates_json || '{}');
    const history = JSON.parse(appRow.stage_history_json || '[]');

    const dateKeyMap: Record<string, string> = {
      'Student Registered': 'registeredDate',
      'Document Collection': 'collectionDate',
      'Document Verification': 'verificationDate',
      'Notarization / Apostille': 'apostilleDate',
      'Application Preparation': 'preparationDate',
      'Ready for Submission': 'readyDate',
      'Submitted to University': 'submittedDate',
      'Additional Documents Requested': 'additionalDocsDate',
      'Admission Result Received': 'resultDate',
      'Tuition Payment': 'tuitionPaidDate',
      'CoA Received': 'coaReceivedDate',
    };
    const dateKey = dateKeyMap[workflowStage];
    if (dateKey) dates[dateKey] = effectiveDate;

    const resolvedStatus =
      stageStatus ||
      (workflowStage === 'CoA Received'
        ? 'Completed'
        : workflowStage === 'Submitted to University'
        ? 'Submitted'
        : workflowStage === 'Additional Documents Requested'
        ? 'Action Required'
        : 'In Progress');

    history.unshift({
      id: 'STG-' + Date.now().toString(36),
      stage: workflowStage,
      status: resolvedStatus,
      date: effectiveDate,
      actorName: req.user!.name,
      notes: remarks?.trim() || '',
      timestamp: now,
    });

    const submittedBy = workflowStage === 'Submitted to University' ? req.user!.name : appRow.submitted_by;
    const submittedAt = workflowStage === 'Submitted to University' ? now : appRow.submitted_at;
    const completedBy = workflowStage === 'CoA Received' ? req.user!.name : appRow.completed_by;
    const completedAt = workflowStage === 'CoA Received' ? now : appRow.completed_at;

    db.prepare(`
      UPDATE intake_student_applications SET
        workflow_stage = ?,
        stage_status = ?,
        workflow_dates_json = ?,
        stage_history_json = ?,
        stage_notes = COALESCE(?, stage_notes),
        assigned_consultant_id = COALESCE(?, assigned_consultant_id),
        submitted_by = ?,
        submitted_at = ?,
        completed_by = ?,
        completed_at = ?,
        updated_at = ?
      WHERE project_id = ? AND student_id = ?
    `).run(
      workflowStage,
      resolvedStatus,
      JSON.stringify(dates),
      JSON.stringify(history),
      remarks !== undefined ? String(remarks).trim() : null,
      assignedConsultantId || null,
      submittedBy,
      submittedAt,
      completedBy,
      completedAt,
      now,
      id,
      studentId
    );

    // Sync milestone fields safely back to student_applications without altering unrelated columns
    const stageToVisa: Partial<Record<string, string>> = {
      'Document Collection': 'Document_Gathering',
      'Notarization / Apostille': 'Apostille_Verification',
      'Submitted to University': 'University_Submitted',
      'Admission Result Received': 'Admission_Granted',
      'Tuition Payment': 'Tuition_Paid',
      'CoA Received': 'CoA_Received',
    };
    const nextVisaStage = stageToVisa[workflowStage] || null;

    db.prepare(`
      UPDATE student_applications SET
        visa_stage = COALESCE(?, visa_stage),
        submission_date = CASE WHEN ? = 'Submitted to University' THEN ? ELSE submission_date END,
        admission_result = COALESCE(?, admission_result),
        tuition_fee_paid = CASE WHEN ? IS NOT NULL THEN ? ELSE tuition_fee_paid END,
        certificate_of_admission_no = COALESCE(?, certificate_of_admission_no),
        updated_at = ?
      WHERE id = ?
    `).run(
      nextVisaStage,
      workflowStage,
      effectiveDate,
      admissionResult || null,
      tuitionFeePaid !== undefined ? 1 : null,
      tuitionFeePaid ? 1 : 0,
      certificateOfAdmissionNo || null,
      now,
      studentId
    );

    const auditAction =
      workflowStage === 'Submitted to University'
        ? 'APPLICATION_SUBMITTED'
        : workflowStage === 'Admission Result Received' || workflowStage === 'Additional Documents Requested'
        ? 'UNIVERSITY_RESPONSE'
        : workflowStage === 'CoA Received'
        ? 'COA_RECORDED'
        : 'WORKFLOW_STAGE_UPDATED';

    logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      auditAction,
      'project',
      id,
      `${appRow.full_name} (${studentId}) moved to "${workflowStage}" [${resolvedStatus}] on ${effectiveDate}${remarks ? ` — ${remarks}` : ''}`
    );

    if (req.user?.role === 'Consultant') {
      const notif = {
        id: 'NTF-' + Date.now().toString(36),
        recipient_id: 'USR-ADMIN',
        sender_id: req.user.id,
        title: `Intake Workflow Updated: ${appRow.full_name}`,
        message: `${req.user.name} recorded "${workflowStage}" for ${appRow.full_name} in ${id}.`,
        type: 'application_submitted',
        target_entity: 'project',
        target_entity_id: id,
        read_status: 0,
        created_at: now,
      };
      db.prepare('INSERT INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        notif.id, notif.recipient_id, notif.sender_id, notif.title, notif.message, notif.type, notif.target_entity, notif.target_entity_id, 0, now
      );
      broadcastNotification('USR-ADMIN', notif);
    }

    res.json({ ok: true });
  });

  app.put('/api/projects/:id/students/:studentId/documents', (req: AuthenticatedRequest, res: Response) => {
    const { id, studentId } = req.params;
    const { docId, docName, status, notarized, apostilled, remarks } = req.body;

    if (!status || !(VALID_INTAKE_DOC_STATUSES as readonly string[]).includes(status)) {
      return res.status(400).json({ error: 'Valid document status is required.' });
    }

    const appRow = db.prepare(`
      SELECT isa.*, s.full_name, s.assigned_consultant_id as stu_consultant_id, s.checklist_json
      FROM intake_student_applications isa
      JOIN student_applications s ON isa.student_id = s.id
      WHERE isa.project_id = ? AND isa.student_id = ?
    `).get(id, studentId) as any;

    if (!appRow) {
      return res.status(404).json({ error: 'Student application not found in this intake.' });
    }

    if (
      req.user?.role === 'Consultant' &&
      appRow.stu_consultant_id !== req.user.id &&
      appRow.assigned_consultant_id !== req.user.id
    ) {
      return res.status(403).json({ error: 'You are only authorized to update documents for students assigned to you.' });
    }

    const now = new Date().toISOString();
    const docs = JSON.parse(appRow.documents_json || '[]') as any[];
    let targetName = docName || docId;
    let prevStatus = 'Pending';

    let found = false;
    const updatedDocs = docs.map((d) => {
      if ((docId && d.id === docId) || (docName && d.name === docName)) {
        found = true;
        targetName = d.name;
        prevStatus = d.status;
        return {
          ...d,
          status,
          collected: ['Collected', 'Notarized', 'Apostilled', 'Verified'].includes(status),
          notarized: notarized !== undefined ? Boolean(notarized) : ['Notarized', 'Apostilled', 'Verified'].includes(status),
          apostilled: apostilled !== undefined ? Boolean(apostilled) : status === 'Apostilled',
          verified: status === 'Verified',
          remarks: remarks !== undefined ? String(remarks).trim() : d.remarks || '',
          verifiedBy: status === 'Verified' ? req.user!.name : d.verifiedBy,
          verifiedAt: status === 'Verified' ? now : d.verifiedAt,
          updatedBy: req.user!.name,
          updatedAt: now,
        };
      }
      return d;
    });

    if (!found && docName) {
      updatedDocs.push({
        id: docId || 'idoc-' + Date.now().toString(36),
        name: String(docName).trim(),
        required: true,
        status,
        collected: ['Collected', 'Notarized', 'Apostilled', 'Verified'].includes(status),
        notarized: Boolean(notarized) || ['Notarized', 'Apostilled', 'Verified'].includes(status),
        apostilled: Boolean(apostilled) || status === 'Apostilled',
        verified: status === 'Verified',
        remarks: remarks ? String(remarks).trim() : '',
        verifiedBy: status === 'Verified' ? req.user!.name : null,
        verifiedAt: status === 'Verified' ? now : null,
        updatedBy: req.user!.name,
        updatedAt: now,
      });
    }

    db.prepare(`
      UPDATE intake_student_applications SET documents_json = ?, updated_at = ?
      WHERE project_id = ? AND student_id = ?
    `).run(JSON.stringify(updatedDocs), now, id, studentId);

    // Sync compatible status back to student_applications.checklist_json
    try {
      const checklist = JSON.parse(appRow.checklist_json || '[]') as any[];
      const mappedLegacyStatus =
        status === 'Missing' || status === 'Incorrect' ? 'Pending' : status;
      const syncedChecklist = checklist.map((c) => {
        const cname = String(c.name || '').toLowerCase();
        const tname = String(targetName || '').toLowerCase();
        if (c.id === docId || cname === tname || cname.includes(tname) || tname.includes(cname)) {
          return {
            ...c,
            status: mappedLegacyStatus,
            verifiedBy: req.user!.name,
            verifiedAt: now,
            notes: remarks !== undefined ? String(remarks).trim() : c.notes,
          };
        }
        return c;
      });
      db.prepare('UPDATE student_applications SET checklist_json = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(syncedChecklist), now, studentId);
    } catch {
      // Ignore checklist sync error if malformed
    }

    logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'DOCUMENT_STATUS_UPDATED',
      'project',
      id,
      `${appRow.full_name}: "${targetName}" changed from ${prevStatus} to ${status}${remarks ? ` (${remarks})` : ''}`
    );

    res.json({ ok: true, documents: updatedDocs, readiness: computeDocumentReadiness(updatedDocs) });
  });

  app.post('/api/projects/:id/activity', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { type, message } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Activity message is required.' });
    }
    const project = db.prepare('SELECT id FROM intake_projects WHERE id = ?').get(id);
    if (!project) {
      return res.status(404).json({ error: 'Intake campaign not found.' });
    }

    const action =
      type === 'University Response'
        ? 'UNIVERSITY_RESPONSE'
        : type === 'Team Activity'
        ? 'TEAM_ACTIVITY'
        : 'INTAKE_REMARK';

    logAudit(req.user!.id, req.user!.name, req.user!.role, action, 'project', id, String(message).trim());
    res.status(201).json({ ok: true });
  });

  // ==========================================
  // STUDENT APPLICATION DOSSIERS API (CRM)
  // ==========================================
  app.get('/api/students', (req: AuthenticatedRequest, res: Response) => {
    const isConsultant = req.user?.role === 'Consultant';
    let query = `
      SELECT 
        s.*,
        u.name_en as university_name,
        p.name as project_name,
        c.name as consultant_name
      FROM student_applications s
      JOIN universities u ON s.applied_university_id = u.id
      JOIN intake_projects p ON s.project_id = p.id
      JOIN users c ON s.assigned_consultant_id = c.id
    `;

    // Strict Backend RBAC: Consultants only see dossiers assigned to them
    const params: any[] = [];
    if (isConsultant) {
      query += ' WHERE s.assigned_consultant_id = ?';
      params.push(req.user!.id);
    }
    query += ' ORDER BY s.created_at DESC';

    const rows = db.prepare(query).all(...params) as any[];
    const mapped = rows.map((s) => ({
      id: s.id,
      fullName: s.full_name,
      passportNumber: s.passport_number,
      dateOfBirth: s.date_of_birth,
      nationality: s.nationality,
      contactEmail: s.contact_email,
      contactPhone: s.contact_phone,
      appliedUniversityId: s.applied_university_id,
      appliedUniversityName: s.university_name,
      projectId: s.project_id,
      projectName: s.project_name,
      department: s.department,
      major: s.major,
      degreeLevel: s.degree_level,
      intakeTerm: s.intake_term,
      programId: s.program_id,
      programName: s.program_name,
      visaStage: s.visa_stage,
      visaType: s.visa_type,
      assignedConsultantId: s.assigned_consultant_id,
      assignedConsultantName: s.consultant_name,
      submissionDate: s.submission_date,
      admissionResult: s.admission_result,
      certificateOfAdmissionNo: s.certificate_of_admission_no,
      tuitionFeePaid: Boolean(s.tuition_fee_paid),
      courierName: s.courier_name,
      courierTrackingNumber: s.courier_tracking_number,
      courierDispatchDate: s.courier_dispatch_date,
      documentChecklist: JSON.parse(s.checklist_json || '[]'),
      notes: s.notes,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));

    res.json(mapped);
  });

  app.post('/api/students', (req: AuthenticatedRequest, res: Response) => {
    const {
      fullName,
      passportNumber,
      dateOfBirth,
      nationality,
      contactEmail,
      contactPhone,
      appliedUniversityId,
      projectId,
      department,
      major,
      degreeLevel,
      intakeTerm,
      programId,
      programName,
      visaType,
      assignedConsultantId,
      notes,
    } = req.body;

    if (!fullName || !passportNumber || !appliedUniversityId || !projectId) {
      return res.status(400).json({ error: 'Student full name, passport, university, and project are required.' });
    }

    const countRow = db.prepare('SELECT COUNT(*) as count FROM student_applications').get() as { count: number };
    const id = `STU-2027-${String(countRow.count + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();
    const consultantId = assignedConsultantId || (req.user?.role === 'Consultant' ? req.user.id : 'USR-CONSULTANT-1');

    const defaultChecklist = [
      { id: 'c1', name: 'Valid Passport Copy (>= 6 mo)', required: true, status: 'Pending' },
      { id: 'c2', name: 'Apostilled High School / Degree Certificate', required: true, status: 'Pending' },
      { id: 'c3', name: 'Official Academic Transcripts (Notarized)', required: true, status: 'Pending' },
      { id: 'c4', name: 'Bank Balance Certificate ($20,000 USD)', required: true, status: 'Pending' },
      { id: 'c5', name: 'Family Relationship Certificate (Birth Certificate)', required: true, status: 'Pending' },
      { id: 'c6', name: 'Statement of Purpose / Study Plan', required: true, status: 'Pending' },
      { id: 'c7', name: 'Language Score (TOPIK / IELTS)', required: false, status: 'Pending' },
    ];

    db.prepare(`
      INSERT INTO student_applications (
        id, full_name, passport_number, date_of_birth, nationality, contact_email, contact_phone,
        applied_university_id, project_id, department, major, degree_level, intake_term,
        program_id, program_name, visa_stage, visa_type, assigned_consultant_id, submission_date, admission_result,
        tuition_fee_paid, checklist_json, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Document_Gathering', ?, ?, NULL, 'Pending', 0, ?, ?, ?, ?)
    `).run(
      id,
      fullName.trim(),
      passportNumber.trim(),
      dateOfBirth || '2004-01-01',
      nationality || 'International',
      contactEmail?.trim() || `${fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      contactPhone?.trim() || '+82-10-0000-0000',
      appliedUniversityId,
      projectId,
      department?.trim() || 'General Studies',
      major?.trim() || 'International Studies',
      degreeLevel || 'Bachelor (D-2-2)',
      intakeTerm || 'Spring 2027',
      programId || null,
      programName || null,
      visaType || (degreeLevel?.includes('D-4') ? 'D-4' : 'D-2'),
      consultantId,
      JSON.stringify(defaultChecklist),
      notes?.trim() || '',
      now,
      now
    );

    // Create intake-specific student application tracking row
    try {
      const projRow = db.prepare('SELECT intake_id, university_id, intake_term, name FROM intake_projects WHERE id = ?').get(projectId) as any;
      const intakeRow = projRow
        ? (db.prepare('SELECT required_documents FROM admission_intakes WHERE id = ? OR (university_id = ? AND term = ?) LIMIT 1').get(projRow.intake_id || '', projRow.university_id, projRow.intake_term) as any)
        : null;
      const reqDocs = intakeRow ? JSON.parse(intakeRow.required_documents || '[]') : [];
      const intakeDocs = buildIntakeDocumentsForStudent(reqDocs, defaultChecklist);
      const todayStr = now.slice(0, 10);

      db.prepare(`
        INSERT OR IGNORE INTO intake_student_applications (
          id, project_id, student_id, assigned_consultant_id, program_id, program_name,
          workflow_stage, stage_status, workflow_dates_json, stage_history_json,
          documents_json, stage_notes, added_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'Student Registered', 'In Progress', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `ISA-${projectId}-${id}`,
        projectId,
        id,
        consultantId,
        programId || null,
        programName || null,
        JSON.stringify({ registeredDate: todayStr }),
        JSON.stringify([
          {
            id: 'STG-' + Date.now().toString(36),
            stage: 'Student Registered',
            status: 'In Progress',
            date: todayStr,
            actorName: req.user!.name,
            notes: notes?.trim() || 'New candidate registered directly into intake campaign.',
            timestamp: now,
          },
        ]),
        JSON.stringify(intakeDocs),
        notes?.trim() || '',
        req.user!.id,
        now,
        now
      );
    } catch (err) {
      console.warn('[Intake App Sync] Could not initialize intake_student_applications row:', err);
    }

    logAudit(req.user!.id, req.user!.name, req.user!.role, 'CREATE_STUDENT', 'student', id, `Registered new candidate ${fullName} (${passportNumber}) for intake ${projectId}`);

    // Notify assigned consultant
    if (consultantId !== req.user?.id) {
      const notifId = 'NTF-' + Date.now().toString(36);
      const notif = {
        id: notifId,
        recipient_id: consultantId,
        sender_id: req.user!.id,
        title: 'New Student Dossier Assigned',
        message: `Candidate ${fullName} has been assigned to your roster for ${intakeTerm}.`,
        type: 'visa_update',
        target_entity: 'student',
        target_entity_id: id,
        read_status: 0,
        created_at: now,
      };
      db.prepare('INSERT INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        notif.id, notif.recipient_id, notif.sender_id, notif.title, notif.message, notif.type, notif.target_entity, notif.target_entity_id, 0, now
      );
      broadcastNotification(consultantId, notif);
    }

    res.json({ ok: true, id });
  });

  app.put('/api/students/:id', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const isConsultant = req.user?.role === 'Consultant';

    // Verify consultant access
    if (isConsultant) {
      const student = db.prepare('SELECT assigned_consultant_id FROM student_applications WHERE id = ?').get(id) as any;
      if (!student || student.assigned_consultant_id !== req.user!.id) {
        return res.status(403).json({ error: 'You are only authorized to update students assigned to you.' });
      }
    }

    const {
      fullName,
      passportNumber,
      contactEmail,
      contactPhone,
      department,
      major,
      degreeLevel,
      intakeTerm,
      visaStage,
      admissionResult,
      certificateOfAdmissionNo,
      tuitionFeePaid,
      courierName,
      courierTrackingNumber,
      courierDispatchDate,
      documentChecklist,
      notes,
    } = req.body;

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE student_applications SET
        full_name = COALESCE(?, full_name),
        passport_number = COALESCE(?, passport_number),
        contact_email = COALESCE(?, contact_email),
        contact_phone = COALESCE(?, contact_phone),
        department = COALESCE(?, department),
        major = COALESCE(?, major),
        degree_level = COALESCE(?, degree_level),
        intake_term = COALESCE(?, intake_term),
        visa_stage = COALESCE(?, visa_stage),
        admission_result = COALESCE(?, admission_result),
        certificate_of_admission_no = COALESCE(?, certificate_of_admission_no),
        tuition_fee_paid = COALESCE(?, tuition_fee_paid),
        courier_name = COALESCE(?, courier_name),
        courier_tracking_number = COALESCE(?, courier_tracking_number),
        courier_dispatch_date = COALESCE(?, courier_dispatch_date),
        checklist_json = COALESCE(?, checklist_json),
        notes = COALESCE(?, notes),
        updated_at = ?
      WHERE id = ?
    `).run(
      fullName,
      passportNumber,
      contactEmail,
      contactPhone,
      department,
      major,
      degreeLevel,
      intakeTerm,
      visaStage,
      admissionResult,
      certificateOfAdmissionNo,
      tuitionFeePaid !== undefined ? (tuitionFeePaid ? 1 : 0) : null,
      courierName,
      courierTrackingNumber,
      courierDispatchDate,
      documentChecklist ? JSON.stringify(documentChecklist) : null,
      notes,
      now,
      id
    );

    logAudit(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_STUDENT', 'student', id, `Updated student dossier for ${id}`);
    res.json({ ok: true });
  });

  app.put('/api/students/:id/stage', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { visaStage, notes } = req.body;
    if (!visaStage) return res.status(400).json({ error: 'visaStage is required' });

    const now = new Date().toISOString();
    db.prepare('UPDATE student_applications SET visa_stage = ?, notes = COALESCE(?, notes), updated_at = ? WHERE id = ?')
      .run(visaStage, notes, now, id);

    logAudit(req.user!.id, req.user!.name, req.user!.role, 'ADVANCE_VISA_STAGE', 'student', id, `Moved to stage "${visaStage}"`);

    // Notify Admission Manager
    const student = db.prepare('SELECT full_name, assigned_consultant_id FROM student_applications WHERE id = ?').get(id) as any;
    const notif = {
      id: 'NTF-' + Date.now().toString(36),
      recipient_id: 'USR-ADMIN',
      sender_id: req.user!.id,
      title: `Visa Stage Updated: ${student?.full_name}`,
      message: `${req.user!.name} updated ${student?.full_name} to "${visaStage}".`,
      type: 'visa_update',
      target_entity: 'student',
      target_entity_id: id,
      read_status: 0,
      created_at: now,
    };
    db.prepare('INSERT INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      notif.id, notif.recipient_id, notif.sender_id, notif.title, notif.message, notif.type, notif.target_entity, notif.target_entity_id, 0, now
    );
    broadcastNotification('USR-ADMIN', notif);

    res.json({ ok: true });
  });

  // ==========================================
  // ENHANCED TASKS API (PRESERVED & EXPANDED)
  // ==========================================
  app.get('/api/tasks', (req: AuthenticatedRequest, res: Response) => {
    const isConsultant = req.user?.role === 'Consultant';
    let query = `
      SELECT 
        t.*,
        p.name as project_name,
        s.full_name as student_name,
        u.name_en as university_name,
        a.name as assigned_to_name,
        a.avatar as assignee_avatar,
        a.title as assignee_title,
        COALESCE(t.team, a.team, 'Admission Team') as computed_team,
        b.name as assigned_by_name
      FROM tasks t
      LEFT JOIN intake_projects p ON t.project_id = p.id
      LEFT JOIN student_applications s ON t.student_id = s.id
      LEFT JOIN universities u ON t.university_id = u.id
      LEFT JOIN users a ON t.assigned_to_id = a.id
      LEFT JOIN users b ON t.assigned_by_id = b.id
    `;

    const params: any[] = [];
    if (isConsultant) {
      // Consultant sees tasks assigned to them, tasks belonging to their team, or unassigned tasks
      query += ` WHERE t.assigned_to_id = ? OR t.team = (SELECT team FROM users WHERE id = ?) OR t.assigned_to_id IS NULL`;
      params.push(req.user!.id, req.user!.id);
    }
    query += ' ORDER BY t.task_date DESC, t.deadline ASC';

    const rows = db.prepare(query).all(...params) as any[];
    const mapped = rows.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      category: t.category,
      priority: t.priority,
      taskDate: t.task_date,
      deadline: t.deadline,
      scheduledTime: t.scheduled_time,
      status: t.status,
      createdAt: t.created_at,
      completedAt: t.completed_at,
      notes: t.notes || '',
      lastUpdated: t.last_updated,
      syncState: t.sync_state,
      sheetRowNumber: t.sheet_row_number,
      projectId: t.project_id,
      projectName: t.project_name,
      studentId: t.student_id,
      studentName: t.student_name,
      universityId: t.university_id,
      universityName: t.university_name,
      assignedToId: t.assigned_to_id,
      assignedToName: t.assigned_to_name,
      assigneeAvatar: t.assignee_avatar,
      assigneeTitle: t.assignee_title,
      team: t.computed_team || 'Admission Team',
      assignedById: t.assigned_by_id,
      assignedByName: t.assigned_by_name,
      subtasks: JSON.parse(t.subtasks_json || '[]'),
    }));

    res.json(mapped);
  });

  app.post('/api/tasks', (req: AuthenticatedRequest, res: Response) => {
    const {
      id: existingId,
      title,
      description,
      category,
      priority,
      taskDate,
      deadline,
      scheduledTime,
      notes,
      projectId,
      studentId,
      universityId,
      assignedToId,
      assignedToIds,
      assignedTeam,
      team,
      subtasks,
    } = req.body;

    if (!title || !taskDate) {
      return res.status(400).json({ error: 'Title and scheduled date are required.' });
    }

    const now = new Date().toISOString();
    const count = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };
    let taskCounter = 1000 + count.count;

    // Handle team or multi-employee assignment
    let targetAssignees: string[] = [];
    let effectiveTeam = team || assignedTeam;

    if (assignedTeam && (!assignedToIds || assignedToIds.length === 0) && !assignedToId) {
      // Entire team assignment
      const teamUsers = db.prepare('SELECT id FROM users WHERE team = ?').all(assignedTeam) as { id: string }[];
      targetAssignees = teamUsers.map((u) => u.id);
      effectiveTeam = assignedTeam;
    } else if (Array.isArray(assignedToIds) && assignedToIds.length > 0) {
      targetAssignees = assignedToIds;
    } else {
      targetAssignees = [assignedToId || req.user?.id || 'USR-ADMIN'];
    }

    const createdIds: string[] = [];

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO tasks (
        id, title, description, category, priority, task_date, deadline,
        scheduled_time, status, created_at, notes, last_updated, sync_state,
        sheet_row_number, project_id, student_id, university_id, assigned_to_id,
        assigned_by_id, subtasks_json, team
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, 'synced', NULL, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < targetAssignees.length; i++) {
      taskCounter++;
      const currentId = (i === 0 && existingId) ? existingId : `TSK-${taskCounter}`;
      const currentAssignee = targetAssignees[i];

      // Get user team if not specified
      const userRecord = db.prepare('SELECT team FROM users WHERE id = ?').get(currentAssignee) as { team: string } | undefined;
      const memberTeam = effectiveTeam || userRecord?.team || 'Admission Team';

      insertStmt.run(
        currentId,
        title.trim(),
        description?.trim() || '',
        category || 'Work',
        priority || 'Medium',
        taskDate,
        deadline || taskDate,
        scheduledTime || null,
        now,
        notes?.trim() || '',
        now,
        projectId || null,
        studentId || null,
        universityId || null,
        currentAssignee,
        req.user!.id,
        JSON.stringify(subtasks || []),
        memberTeam
      );

      createdIds.push(currentId);

      // Notification
      if (currentAssignee && currentAssignee !== req.user?.id) {
        const notif = {
          id: 'NTF-' + Date.now().toString(36) + '-' + i,
          recipient_id: currentAssignee,
          sender_id: req.user!.id,
          title: `Task Assigned: ${title}`,
          message: `${req.user!.name} assigned you: "${title}". Due: ${deadline || taskDate}. Priority: ${priority || 'Medium'}.`,
          type: 'task_assigned',
          target_entity: 'task',
          target_entity_id: currentId,
          read_status: 0,
          created_at: now,
        };
        db.prepare('INSERT INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          notif.id, notif.recipient_id, notif.sender_id, notif.title, notif.message, notif.type, notif.target_entity, notif.target_entity_id, 0, now
        );
        broadcastNotification(currentAssignee, notif);
      }
    }

    logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CREATE_TASK',
      'task',
      createdIds[0],
      `Created task "${title}" assigned to ${targetAssignees.length} member(s) [${effectiveTeam || 'General'}]`
    );

    res.json({ ok: true, id: createdIds[0], createdIds });
  });

  app.put('/api/tasks/:id/reassign', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { assignedToId, team, deadline, priority, status } = req.body;
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;

    if (!task) return res.status(404).json({ error: 'Task not found.' });

    const now = new Date().toISOString();
    let newTeam = team;
    if (assignedToId && !newTeam) {
      const u = db.prepare('SELECT team FROM users WHERE id = ?').get(assignedToId) as { team: string } | undefined;
      newTeam = u?.team;
    }

    db.prepare(`
      UPDATE tasks SET
        assigned_to_id = COALESCE(?, assigned_to_id),
        team = COALESCE(?, team),
        deadline = COALESCE(?, deadline),
        priority = COALESCE(?, priority),
        status = COALESCE(?, status),
        last_updated = ?
      WHERE id = ?
    `).run(
      assignedToId || null,
      newTeam || null,
      deadline || null,
      priority || null,
      status || null,
      now,
      id
    );

    logAudit(req.user!.id, req.user!.name, req.user!.role, 'REASSIGN_TASK', 'task', id, `Reassigned task ${id} to ${assignedToId || 'unchanged'} (Team: ${newTeam || 'unchanged'})`);

    // Notify new assignee
    if (assignedToId && assignedToId !== req.user?.id) {
      const notif = {
        id: 'NTF-' + Date.now().toString(36),
        recipient_id: assignedToId,
        sender_id: req.user!.id,
        title: `Task Reassigned to You: ${task.title}`,
        message: `${req.user!.name} reassigned task "${task.title}" to you. Due: ${deadline || task.deadline}.`,
        type: 'task_assigned',
        target_entity: 'task',
        target_entity_id: id,
        read_status: 0,
        created_at: now,
      };
      db.prepare('INSERT INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        notif.id, notif.recipient_id, notif.sender_id, notif.title, notif.message, notif.type, notif.target_entity, notif.target_entity_id, 0, now
      );
      broadcastNotification(assignedToId, notif);
    }

    res.json({ ok: true });
  });

  app.put('/api/tasks/:id', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { title, description, category, priority, taskDate, deadline, scheduledTime, notes, subtasks, status, assignedToId, team } = req.body;
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;

    if (!task) return res.status(404).json({ error: 'Task not found.' });

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        priority = COALESCE(?, priority),
        task_date = COALESCE(?, task_date),
        deadline = COALESCE(?, deadline),
        scheduled_time = COALESCE(?, scheduled_time),
        notes = COALESCE(?, notes),
        subtasks_json = COALESCE(?, subtasks_json),
        status = COALESCE(?, status),
        assigned_to_id = COALESCE(?, assigned_to_id),
        team = COALESCE(?, team),
        last_updated = ?
      WHERE id = ?
    `).run(
      title ? title.trim() : null,
      description !== undefined ? description?.trim() : null,
      category || null,
      priority || null,
      taskDate || null,
      deadline || null,
      scheduledTime !== undefined ? scheduledTime : null,
      notes !== undefined ? notes?.trim() : null,
      subtasks ? JSON.stringify(subtasks) : null,
      status || null,
      assignedToId || null,
      team || null,
      now,
      id
    );

    logAudit(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_TASK', 'task', id, `Updated task ${id}`);
    res.json({ ok: true });
  });

  app.post('/api/tasks/:id/toggle', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { notes } = req.body;
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;

    if (!task) return res.status(404).json({ error: 'Task not found' });

    const isCompleting = task.status !== 'Completed';
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE tasks SET
        status = ?,
        completed_at = ?,
        notes = COALESCE(?, notes),
        last_updated = ?
      WHERE id = ?
    `).run(
      isCompleting ? 'Completed' : 'Pending',
      isCompleting ? now : null,
      notes,
      now,
      id
    );

    logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      isCompleting ? 'COMPLETE_TASK' : 'RESTORE_TASK',
      'task',
      id,
      `${isCompleting ? 'Completed' : 'Reopened'} task "${task.title}"`
    );

    // If completed by a consultant, alert Admission Manager
    if (isCompleting && req.user?.role === 'Consultant') {
      const notif = {
        id: 'NTF-' + Date.now().toString(36),
        recipient_id: 'USR-ADMIN',
        sender_id: req.user.id,
        title: `Task Completed: ${task.title}`,
        message: `${req.user.name} marked "${task.title}" (${id}) as Completed.`,
        type: 'task_completed',
        target_entity: 'task',
        target_entity_id: id,
        read_status: 0,
        created_at: now,
      };
      db.prepare('INSERT INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        notif.id, notif.recipient_id, notif.sender_id, notif.title, notif.message, notif.type, notif.target_entity, notif.target_entity_id, 0, now
      );
      broadcastNotification('USR-ADMIN', notif);
    }

    res.json({ ok: true, status: isCompleting ? 'Completed' : 'Pending' });
  });

  app.delete('/api/tasks/:id', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    logAudit(req.user!.id, req.user!.name, req.user!.role, 'DELETE_TASK', 'task', id, `Deleted task ${id}`);
    res.json({ ok: true });
  });

  // ==========================================
  // NOTIFICATIONS API
  // ==========================================
  app.get('/api/notifications', (req: AuthenticatedRequest, res: Response) => {
    const userId = (req.query.userId as string) || req.user?.id || 'USR-ADMIN';
    const rows = db.prepare(`
      SELECT n.*, u.name as sender_name
      FROM notifications n
      JOIN users u ON n.sender_id = u.id
      WHERE n.recipient_id = ?
      ORDER BY n.created_at DESC
      LIMIT 100
    `).all(userId) as any[];

    const mapped = rows.map((r) => ({
      id: r.id,
      recipientId: r.recipient_id,
      senderId: r.sender_id,
      senderName: r.sender_name,
      title: r.title,
      message: r.message,
      type: r.type,
      targetEntity: r.target_entity,
      targetEntityId: r.target_entity_id,
      read: Boolean(r.read_status),
      createdAt: r.created_at,
    }));

    res.json(mapped);
  });

  app.post('/api/notifications/:id/read', (req: Request, res: Response) => {
    const { id } = req.params;
    db.prepare('UPDATE notifications SET read_status = 1 WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  app.post('/api/notifications/read-all', (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id || 'USR-ADMIN';
    db.prepare('UPDATE notifications SET read_status = 1 WHERE recipient_id = ?').run(userId);
    res.json({ ok: true });
  });

  // ==========================================
  // AUDIT LOGS & TIMELINE API
  // ==========================================
  app.get('/api/audit-logs', (_req: Request, res: Response) => {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 60').all();
    res.json(logs);
  });

  // ==========================================
  // EXECUTIVE DASHBOARD ANALYTICS API
  // ==========================================
  app.get('/api/analytics', (req: AuthenticatedRequest, res: Response) => {
    const isConsultant = req.user?.role === 'Consultant';
    const userId = req.user?.id || 'USR-ADMIN';

    // 1. Projects KPI
    const totalProjects = db.prepare("SELECT COUNT(*) as count FROM intake_projects WHERE status = 'Active'").get() as any;

    // 2. Student Dossier counts
    const totalStudents = isConsultant
      ? (db.prepare('SELECT COUNT(*) as count FROM student_applications WHERE assigned_consultant_id = ?').get(userId) as any)
      : (db.prepare('SELECT COUNT(*) as count FROM student_applications').get() as any);

    // 3. Korean Visa Pipeline distribution
    const stages = (isConsultant
      ? db.prepare('SELECT visa_stage, COUNT(*) as count FROM student_applications WHERE assigned_consultant_id = ? GROUP BY visa_stage').all(userId)
      : db.prepare('SELECT visa_stage, COUNT(*) as count FROM student_applications GROUP BY visa_stage').all()) as any[];
    const stageMap: Record<string, number> = {};
    for (const s of stages) {
      stageMap[s.visa_stage] = s.count;
    }

    // 4. Tasks metrics
    const taskStats = (isConsultant
      ? db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending FROM tasks WHERE assigned_to_id = ? OR assigned_to_id IS NULL").get(userId)
      : db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending FROM tasks").get()) as any;

    // 5. Consultant Workload (Admin only or self)
    const consultantWorkload = db.prepare(`
      SELECT 
        u.id, u.name, u.avatar, u.title,
        COALESCE(u.team, 'Admission Team') as team,
        (SELECT COUNT(*) FROM student_applications WHERE assigned_consultant_id = u.id) as dossiers,
        (SELECT COUNT(*) FROM tasks WHERE assigned_to_id = u.id AND status = 'Pending') as pending_tasks,
        (SELECT COUNT(*) FROM tasks WHERE assigned_to_id = u.id AND status = 'Completed') as completed_tasks
      FROM users u
      WHERE u.role = 'Consultant'
      ORDER BY (pending_tasks + dossiers) DESC, u.name ASC
    `).all();

    // 6. Urgent Upcoming Deadlines
    const deadlines = db.prepare(`
      SELECT 
        p.id, p.name, p.deadline, u.name_en as university_name,
        (SELECT COUNT(*) FROM student_applications WHERE project_id = p.id) as current_students,
        p.target_quota
      FROM intake_projects p
      JOIN universities u ON p.university_id = u.id
      WHERE p.status = 'Active'
      ORDER BY p.deadline ASC
      LIMIT 5
    `).all();

    res.json({
      totalActiveProjects: totalProjects?.count || 0,
      totalStudents: totalStudents?.count || 0,
      visaPipeline: {
        documentGathering: stageMap['Document_Gathering'] || 0,
        apostilleVerification: stageMap['Apostille_Verification'] || 0,
        universitySubmitted: stageMap['University_Submitted'] || 0,
        admissionGranted: stageMap['Admission_Granted'] || 0,
        tuitionPaid: stageMap['Tuition_Paid'] || 0,
        coaReceived: stageMap['CoA_Received'] || 0,
        embassyVisaFiling: stageMap['Embassy_Visa_Filing'] || 0,
        visaIssued: stageMap['Visa_Issued'] || 0,
      },
      taskStats: {
        total: taskStats?.total || 0,
        completed: taskStats?.completed || 0,
        pending: taskStats?.pending || 0,
      },
      consultantWorkload,
      upcomingDeadlines: deadlines,
    });
  });

  // ==========================================
  // PRESERVED GOOGLE SHEETS & APP STATE SYNC
  // ==========================================
  app.get('/api/state', (_req: Request, res: Response) => {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY task_date DESC').all() as any[];
    const mappedTasks = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      category: t.category,
      priority: t.priority,
      taskDate: t.task_date,
      deadline: t.deadline,
      scheduledTime: t.scheduled_time,
      status: t.status,
      createdAt: t.created_at,
      completedAt: t.completed_at,
      notes: t.notes || '',
      lastUpdated: t.last_updated,
      syncState: t.sync_state,
      sheetRowNumber: t.sheet_row_number,
    }));

    const config = db.prepare("SELECT * FROM google_sheets_config WHERE id = 'config_main'").get() as any;

    res.json({
      tasks: mappedTasks,
      spreadsheets: [
        {
          spreadsheetId: config?.selected_spreadsheet_id || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          title: config?.selected_spreadsheet_title || 'Personal Daily Task Master 2026',
          url: `https://docs.google.com/spreadsheets/d/${config?.selected_spreadsheet_id || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'}/edit`,
          worksheets: ['Daily_Tasks_2026', 'Korean_Intakes_2027', 'Visa_Dispatches'],
          updatedAt: config?.last_synced_at || new Date().toISOString(),
          isLiveApi: false,
        },
      ],
      connection: {
        connected: true,
        accountEmail: config?.account_email || 'samiul.wecare@gmail.com',
        accountName: config?.account_name || 'Samiul (Personal Google Workspace)',
        authMode: config?.auth_mode || 'workspace_cloud',
        oauthClientId: '',
        oauthAccessToken: '',
        appsScriptUrl: '',
        selectedSpreadsheetId: config?.selected_spreadsheet_id || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        selectedSpreadsheetTitle: config?.selected_spreadsheet_title || 'Personal Daily Task Master 2026',
        selectedWorksheet: config?.selected_worksheet || 'Daily_Tasks_2026',
        autoSync: Boolean(config?.auto_sync),
        syncStatus: config?.sync_status || 'Synced',
        lastSyncedAt: config?.last_synced_at || new Date().toISOString(),
        headersInitialized: Boolean(config?.headers_initialized),
        errorMessage: null,
      },
      syncLogs: db.prepare("SELECT * FROM audit_logs WHERE action LIKE '%SYNC%' ORDER BY timestamp DESC LIMIT 30").all(),
    });
  });

  app.post('/api/sync', (req: Request, res: Response) => {
    const { tasks, connection } = req.body;
    const now = new Date().toISOString();

    if (Array.isArray(tasks)) {
      const updateTask = db.prepare(`
        INSERT INTO tasks (
          id, title, description, category, priority, task_date, deadline,
          scheduled_time, status, created_at, completed_at, notes, last_updated,
          sync_state, sheet_row_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          category = excluded.category,
          priority = excluded.priority,
          task_date = excluded.task_date,
          deadline = excluded.deadline,
          status = excluded.status,
          completed_at = excluded.completed_at,
          notes = excluded.notes,
          last_updated = excluded.last_updated
      `);

      const tx = db.transaction((list: any[]) => {
        for (let i = 0; i < list.length; i++) {
          const t = list[i];
          updateTask.run(
            t.id,
            t.title,
            t.description || '',
            t.category || 'Work',
            t.priority || 'Medium',
            t.taskDate,
            t.deadline || t.taskDate,
            t.scheduledTime || null,
            t.status || 'Pending',
            t.createdAt || now,
            t.completedAt || null,
            t.notes || '',
            now,
            i + 2
          );
        }
      });
      tx(tasks);
    }

    if (connection) {
      if (connection.oauthAccessToken) {
        setRuntimeOAuthAccessToken(connection.oauthAccessToken);
      }
      db.prepare(`
        UPDATE google_sheets_config SET
          selected_spreadsheet_id = COALESCE(?, selected_spreadsheet_id),
          selected_spreadsheet_title = COALESCE(?, selected_spreadsheet_title),
          selected_worksheet = COALESCE(?, selected_worksheet),
          sync_status = COALESCE(?, sync_status),
          auth_mode = COALESCE(?, auth_mode),
          last_synced_at = ?
        WHERE id = 'config_main'
      `).run(
        connection.selectedSpreadsheetId,
        connection.selectedSpreadsheetTitle,
        connection.selectedWorksheet,
        connection.syncStatus,
        connection.authMode || null,
        now
      );
    }

    res.json({ ok: true, lastSyncedAt: now });
  });

  // ==========================================
  // DOCUMENT HANDOVER & ACKNOWLEDGEMENT API
  // ==========================================
  app.get('/api/handovers/context', (_req: AuthenticatedRequest, res: Response) => {
    const students = db
      .prepare(
        `SELECT s.id, s.full_name, s.passport_number, s.intake_term, s.degree_level,
                s.assigned_consultant_id, u.name_en as university_name
         FROM student_applications s
         LEFT JOIN universities u ON s.applied_university_id = u.id
         ORDER BY s.full_name ASC`
      )
      .all() as any[];

    const admissionTeam = db
      .prepare(
        `SELECT id, name, email, role, title, avatar, COALESCE(team, 'Admission Team') as team
         FROM users
         WHERE COALESCE(team, 'Admission Team') = 'Admission Team'
         ORDER BY role DESC, name ASC`
      )
      .all();

    const counselingTeam = db
      .prepare(
        `SELECT id, name, email, role, title, avatar, COALESCE(team, 'Admission Team') as team
         FROM users
         WHERE team = 'Counseling Team'
         ORDER BY name ASC`
      )
      .all();

    res.json({
      students: students.map((s) => ({
        id: s.id,
        fullName: s.full_name,
        passportNumber: s.passport_number,
        intakeTerm: s.intake_term,
        degreeLevel: s.degree_level,
        assignedConsultantId: s.assigned_consultant_id,
        universityName: s.university_name || '',
      })),
      admissionTeam,
      counselingTeam,
    });
  });

  app.get('/api/handovers/stats', (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = getHandoverStats(db, req.user!);
      res.json(stats);
    } catch (err: any) {
      res.status(err?.statusCode || 500).json({ error: err?.message || 'Failed to compute handover stats' });
    }
  });

  app.get('/api/handovers/sync-outbox', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const statusFilter = (req.query.status as string) || 'all';
    let query = `
      SELECT q.*, h.student_id, h.counselor_name, h.receiving_employee_name, h.status as handover_status
      FROM sheets_sync_queue q
      LEFT JOIN document_handovers h ON q.handover_id = h.id
    `;
    const params: any[] = [];
    if (statusFilter !== 'all') {
      query += ' WHERE q.status = ?';
      params.push(statusFilter);
    }
    query += ' ORDER BY q.id DESC LIMIT 150';

    const jobs = db.prepare(query).all(...params) as any[];
    const tabRows = db
      .prepare('SELECT * FROM google_sheet_tab_rows ORDER BY worksheet_title ASC, row_number ASC LIMIT 200')
      .all() as any[];

    res.json({
      jobs: jobs.map((j) => ({
        id: j.id,
        handoverId: j.handover_id,
        handoverVersion: j.handover_version,
        targetType: j.target_type,
        worksheetTitle: j.worksheet_title,
        employeeId: j.employee_id,
        status: j.status,
        retryCount: j.retry_count,
        maxRetries: j.max_retries,
        nextRetryAt: j.next_retry_at,
        lockedBy: j.locked_by,
        lockedAt: j.locked_at,
        errorMessage: j.error_message,
        createdAt: j.created_at,
        lastAttemptAt: j.last_attempt_at,
        syncedAt: j.synced_at,
        counselorName: j.counselor_name,
        receiverName: j.receiving_employee_name,
        handoverStatus: j.handover_status,
      })),
      syncedTabRows: tabRows.map((r) => ({
        spreadsheetId: r.spreadsheet_id,
        worksheetTitle: r.worksheet_title,
        handoverId: r.handover_id,
        handoverVersion: r.handover_version,
        rowNumber: r.row_number,
        rowValues: JSON.parse(r.row_payload_json || '[]'),
        syncedAt: r.synced_at,
      })),
    });
  });

  app.post('/api/handovers/sync-outbox/:jobId/retry', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const jobId = parseInt(req.params.jobId, 10);
    if (isNaN(jobId)) {
      return res.status(400).json({ error: 'Invalid outbox job ID' });
    }

    const job = db.prepare('SELECT * FROM sheets_sync_queue WHERE id = ?').get(jobId) as any;
    if (!job) {
      return res.status(404).json({ error: 'Sync outbox job not found' });
    }
    if (job.status === 'synced' || job.status === 'superseded') {
      return res.status(400).json({ error: `Job is already in terminal state "${job.status}".` });
    }

    const nowIso = new Date().toISOString();
    db.prepare(
      `UPDATE sheets_sync_queue
       SET status = 'pending',
           retry_count = 0,
           locked_by = NULL,
           locked_at = NULL,
           next_retry_at = ?,
           error_message = NULL
       WHERE id = ?`
    ).run(nowIso, jobId);

    const col =
      job.target_type === 'counselor_tab'
        ? 'counselor_sheet_sync_status'
        : job.target_type === 'receiver_tab'
        ? 'receiver_sheet_sync_status'
        : 'master_sheet_sync_status';
    db.prepare(`UPDATE document_handovers SET ${col} = 'Pending' WHERE id = ?`).run(job.handover_id);

    logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'MANUAL_RETRY_SHEETS_JOB',
      'handover',
      job.handover_id,
      `Triggered manual outbox retry for job #${jobId} (${job.worksheet_title})`
    );

    const summary = await processSheetsOutbox(db);
    res.json({ ok: true, summary });
  });

  app.post('/api/handovers/sync-outbox/retry-failed', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const nowIso = new Date().toISOString();
    const info = db
      .prepare(
        `UPDATE sheets_sync_queue
         SET status = 'pending',
             retry_count = 0,
             locked_by = NULL,
             locked_at = NULL,
             next_retry_at = ?,
             error_message = NULL
         WHERE status = 'failed'`
      )
      .run(nowIso);

    db.prepare(
      `UPDATE document_handovers SET
        counselor_sheet_sync_status = CASE WHEN counselor_sheet_sync_status = 'Failed' THEN 'Pending' ELSE counselor_sheet_sync_status END,
        receiver_sheet_sync_status = CASE WHEN receiver_sheet_sync_status = 'Failed' THEN 'Pending' ELSE receiver_sheet_sync_status END,
        master_sheet_sync_status = CASE WHEN master_sheet_sync_status = 'Failed' THEN 'Pending' ELSE master_sheet_sync_status END`
    ).run();

    logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'BATCH_RETRY_SHEETS_JOBS',
      'system',
      'sheets_sync_queue',
      `Re-queued ${info.changes} failed Google Sheets sync job(s)`
    );

    const summary = await processSheetsOutbox(db);
    res.json({ ok: true, requeued: info.changes, summary });
  });

  app.get('/api/handovers', (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = listHandovers(db, req.user!, {
        viewMode: req.query.viewMode as any,
        search: req.query.search as string | undefined,
        studentId: req.query.studentId as string | undefined,
        counselorId: req.query.counselorId as string | undefined,
        receiverId: req.query.receiverId as string | undefined,
        status: req.query.status as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
      });
      res.json(result);
    } catch (err: any) {
      res.status(err?.statusCode || 500).json({ error: err?.message || 'Failed to fetch handovers' });
    }
  });

  app.get('/api/handovers/:id', (req: AuthenticatedRequest, res: Response) => {
    const handover = getHandoverById(db, req.params.id);
    if (!handover) {
      return res.status(404).json({ error: 'Document handover not found.' });
    }

    // Access check: Involved counselor, assigned receiver, or Admission_Manager
    const isAdmin = req.user!.role === 'Admission_Manager';
    const isParticipant =
      handover.counselorId === req.user!.id || handover.receivingEmployeeId === req.user!.id;

    if (!isAdmin && !isParticipant) {
      return res.status(403).json({ error: 'You are not authorized to view this document handover.' });
    }

    const outboxJobs = db
      .prepare('SELECT * FROM sheets_sync_queue WHERE handover_id = ? ORDER BY id DESC LIMIT 30')
      .all(req.params.id);

    res.json({ ...handover, outboxJobs });
  });

  app.post('/api/handovers', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { handover, notificationsToBroadcast } = createDocumentHandover(db, req.user!, req.body);

      for (const n of notificationsToBroadcast) {
        broadcastNotification(n.recipient_id, {
          ...n,
          senderName: req.user!.name,
          read: false,
          targetEntity: n.target_entity,
          targetEntityId: n.target_entity_id,
          createdAt: n.created_at,
        });
      }

      // Immediately process outbox queue asynchronously (or await fast commit)
      await processSheetsOutbox(db).catch((err) => {
        console.warn('[Sheets Outbox] Immediate flush warning:', err);
      });

      const refreshed = getHandoverById(db, handover.id);
      res.status(201).json(refreshed || handover);
    } catch (err: any) {
      res.status(err?.statusCode || 500).json({ error: err?.message || 'Failed to create document handover' });
    }
  });

  app.put('/api/handovers/:id/acknowledge', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { handover, notificationsToBroadcast } = acknowledgeDocumentHandover(
        db,
        req.params.id,
        req.user!,
        req.body
      );

      for (const n of notificationsToBroadcast) {
        broadcastNotification(n.recipient_id, {
          ...n,
          senderName: req.user!.name,
          read: false,
          targetEntity: n.target_entity,
          targetEntityId: n.target_entity_id,
          createdAt: n.created_at,
        });
      }

      await processSheetsOutbox(db).catch((err) => {
        console.warn('[Sheets Outbox] Immediate flush warning:', err);
      });

      const refreshed = getHandoverById(db, handover.id);
      res.json(refreshed || handover);
    } catch (err: any) {
      res.status(err?.statusCode || 500).json({ error: err?.message || 'Failed to verify handover documents' });
    }
  });

  app.put('/api/handovers/:id/follow-up', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { handover, notificationsToBroadcast } = submitHandoverFollowUp(
        db,
        req.params.id,
        req.user!,
        req.body
      );

      for (const n of notificationsToBroadcast) {
        broadcastNotification(n.recipient_id, {
          ...n,
          senderName: req.user!.name,
          read: false,
          targetEntity: n.target_entity,
          targetEntityId: n.target_entity_id,
          createdAt: n.created_at,
        });
      }

      await processSheetsOutbox(db).catch((err) => {
        console.warn('[Sheets Outbox] Immediate flush warning:', err);
      });

      const refreshed = getHandoverById(db, handover.id);
      res.json(refreshed || handover);
    } catch (err: any) {
      res.status(err?.statusCode || 500).json({ error: err?.message || 'Failed to submit follow-up delivery' });
    }
  });

  // ==========================================
  // ADMISSION -> COUNSELOR DOCUMENT REQUESTS API
  // ==========================================
  app.get('/api/handover-requests', (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = listDocumentRequests(db, req.user!, {
        scope: req.query.scope as any,
        search: req.query.search as string | undefined,
        studentId: req.query.studentId as string | undefined,
        counselorId: req.query.counselorId as string | undefined,
        requesterId: req.query.requesterId as string | undefined,
        status: req.query.status as string | undefined,
        priority: req.query.priority as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
      });
      res.json(result);
    } catch (err: any) {
      res.status(err?.statusCode || 500).json({ error: err?.message || 'Failed to load document requests' });
    }
  });

  app.get('/api/handover-requests/:id', (req: AuthenticatedRequest, res: Response) => {
    const docReq = getDocumentRequestById(db, req.params.id);
    if (!docReq) {
      return res.status(404).json({ error: 'Document request not found.' });
    }

    const isAdmin = req.user!.role === 'Admission_Manager';
    const isParticipant =
      docReq.requestedById === req.user!.id || docReq.assignedCounselorId === req.user!.id;

    if (!isAdmin && !isParticipant) {
      return res.status(403).json({ error: 'You are not authorized to view this document request.' });
    }

    res.json(docReq);
  });

  app.post('/api/handover-requests', (req: AuthenticatedRequest, res: Response) => {
    try {
      const { request, notificationsToBroadcast } = createDocumentRequest(db, req.user!, req.body);

      for (const n of notificationsToBroadcast) {
        broadcastNotification(n.recipient_id, {
          ...n,
          senderName: req.user!.name,
          read: false,
          targetEntity: n.target_entity,
          targetEntityId: n.target_entity_id,
          createdAt: n.created_at,
        });
      }

      res.status(201).json(request);
    } catch (err: any) {
      res.status(err?.statusCode || 500).json({ error: err?.message || 'Failed to create document request' });
    }
  });

  app.put('/api/handover-requests/:id/cancel', (req: AuthenticatedRequest, res: Response) => {
    try {
      const { request, notificationsToBroadcast } = cancelDocumentRequest(
        db,
        req.params.id,
        req.user!,
        req.body?.reason
      );

      for (const n of notificationsToBroadcast) {
        broadcastNotification(n.recipient_id, {
          ...n,
          senderName: req.user!.name,
          read: false,
          targetEntity: n.target_entity,
          targetEntityId: n.target_entity_id,
          createdAt: n.created_at,
        });
      }

      res.json(request);
    } catch (err: any) {
      res.status(err?.statusCode || 500).json({ error: err?.message || 'Failed to cancel document request' });
    }
  });

  // Periodic background sweep for due Google Sheets sync retries (every 10 seconds)
  setInterval(() => {
    processSheetsOutbox(db).catch((err) => {
      console.warn('[Sheets Outbox] Background sweep error:', err);
    });
  }, 10000);

  // Database Backup endpoint
  app.post('/api/backup', requireAdmin, (_req: Request, res: Response) => {
    const backupPath = createBackupSnapshot();
    res.json({ ok: true, backupFile: path.basename(backupPath) });
  });

  // ==========================================
  // VITE DEV SERVER / STATIC ASSETS
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  Korean Student Visa Consultancy PMS running on http://localhost:${PORT}/\n`);
  });
}

startServer();
